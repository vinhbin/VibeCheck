# VibeCheck — Agent Brief v2

## Project Overview

**VibeCheck** is a real-time, event-scoped networking web app for college students and startup founders. Users drop a "Vibe Card" — a short summary of what they're building, what they need, and what they offer — and get matched with complementary people in the same room. An AI-generated icebreaker kicks off every connection.

**Hackathon track:** STARTUP
**Vibe:** Fun but functional, chaotic creative
**Time budget:** 9 hours
**Target users:** College students, early-stage founders, hackathon attendees

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + **Vite**, React Router v6, Tailwind CSS, Framer Motion |
| Backend / DB | Supabase (Postgres + pgvector + Realtime websockets) |
| AI — icebreaker | Google Gemini API (`gemini-2.0-flash`) via Express proxy — **streamed** |
| AI — embeddings | Google Gemini API (`gemini-embedding-exp-03-07`) via Express proxy |
| QR codes | `qrcode.react` — client-side, no external image service |
| Hosting | Vercel (frontend) + Railway (Express proxy) |

> **Single repo:** Frontend and Express proxy live together in `vibecheck/`. Two terminal windows in dev, two deploy targets in prod.

> **Why Vite?** CRA is no longer maintained. Vite starts in <500ms, native ESM HMR, smaller bundles.

> **Why Gemini Flash?** ~1s responses, generous free tier (~1500 req/day), streaming + embedding support built-in.

---

## Repo Structure

```
vibecheck/
├── public/
├── src/                              ← React frontend (Vite)
│   ├── api/
│   │   ├── gemini.js                 # Streaming icebreaker proxy client + fallback
│   │   └── embed.js                  # Embedding proxy client + retry logic
│   ├── components/
│   │   ├── VibeCard.jsx              # Card display + Shoot Your Shot button
│   │   ├── VibeCardForm.jsx          # Card creator/editor form with validation
│   │   ├── MatchFeed.jsx             # Live feed — skeleton → cards
│   │   ├── SuggestedFeed.jsx         # "Suggested for you" rail (embedding-ranked)
│   │   ├── MatchModal.jsx            # Match popup — streamed icebreaker word-by-word
│   │   ├── ShootYourShot.jsx         # Personality picker + connection trigger
│   │   ├── RoomQR.jsx                # QR code + copy-link share panel
│   │   ├── EnergyFilter.jsx          # Energy range filter (v2 toggle)
│   │   ├── CardSkeleton.jsx          # Pulse placeholder while feed loads
│   │   └── ErrorBoundary.jsx         # Top-level crash boundary
│   ├── pages/
│   │   ├── Home.jsx                  # Landing — create or join event
│   │   ├── CreateCard.jsx            # Vibe Card creation + edit flow
│   │   ├── Room.jsx                  # Live event room
│   │   └── Matches.jsx               # Post-event match list + export
│   ├── hooks/
│   │   ├── useRoom.js                # Supabase Realtime card feed (reconnect + cleanup)
│   │   └── useMatches.js             # Incoming match notifications via Realtime
│   ├── lib/
│   │   ├── supabase.js               # Supabase client init
│   │   └── storage.js                # Safe localStorage wrapper (private browsing safe)
│   └── App.jsx                       # Router + ErrorBoundary wrapper
├── server.js                         ← Express proxy — same repo, separate process
├── supabase/
│   └── functions.sql                 # match_cards vector search Postgres function
├── .env                              # Frontend env vars (VITE_ prefix)
├── server.env                        # Proxy secrets — NEVER commit, in .gitignore
├── vite.config.js
└── package.json
```

**Dev:**
```bash
npm run dev      # Terminal 1 — Vite :5173
npm run proxy    # Terminal 2 — Express :3001
```

---

## Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | Home.jsx | Create or join an event |
| `/join/:code` | Home.jsx | Deep-link join — auto-uppercases + submits the code |
| `/create/:eventId` | CreateCard.jsx | Create Vibe Card for the event |
| `/room/:eventId` | Room.jsx | Live room feed |
| `/room/:eventId/edit` | CreateCard.jsx | Edit your existing Vibe Card |
| `/matches/:eventId` | Matches.jsx | Post-event match list + export |

> `/join/:code` powers QR codes and slide links — `vibecheck.app/join/HACK24` drops everyone straight into the room.

---

## Database Schema (Supabase)

```sql
-- Enable vector extension for semantic matching
CREATE EXTENSION IF NOT EXISTS vector;

-- Enum prevents invalid status values at the DB layer
CREATE TYPE match_status AS ENUM ('pending', 'accepted', 'declined');

CREATE TABLE events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  code        TEXT        UNIQUE NOT NULL,  -- 6-char uppercase, generated server-side
  max_cards   INT         DEFAULT 200,
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vibe_cards (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID        REFERENCES events(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  emoji           TEXT        NOT NULL,
  pin             CHAR(4)     NOT NULL,    -- 4-digit reclaim PIN shown once at card creation
  project         TEXT        NOT NULL,
  need            TEXT        NOT NULL CHECK (char_length(need) >= 10),
  offer           TEXT        NOT NULL CHECK (char_length(offer) >= 10),
  energy          INT         DEFAULT 5 CHECK (energy BETWEEN 1 AND 10),
  need_embedding  vector(768),    -- populated async after card creation
  offer_embedding vector(768),    -- populated async after card creation
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Fast per-event lookup — every room load hits this
CREATE INDEX idx_vibe_cards_event_id ON vibe_cards(event_id);
-- HNSW index — no warmup needed, works well at hackathon scale (20–200 rows)
CREATE INDEX idx_offer_embedding ON vibe_cards USING hnsw (offer_embedding vector_cosine_ops);

CREATE TABLE matches (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- card_a / card_b are always stored with LEAST/GREATEST ordering (card_a < card_b by UUID)
  -- so (A→B) and (B→A) both resolve to the same row. initiator_card tracks who shot first.
  card_a      UUID        REFERENCES vibe_cards(id) ON DELETE CASCADE,
  card_b      UUID        REFERENCES vibe_cards(id) ON DELETE CASCADE,
  initiator_card UUID,   -- which card pressed Shoot Your Shot
  -- Snapshot both cards at match time — survives card edits
  card_a_snapshot JSONB,
  card_b_snapshot JSONB,
  icebreaker  TEXT,
  status      match_status DEFAULT 'pending',  -- pending → accepted/declined by target
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  -- Bidirectional uniqueness: (A,B) and (B,A) are the same match
  CONSTRAINT unique_match  UNIQUE (LEAST(card_a::text, card_b::text), GREATEST(card_a::text, card_b::text)),
  CONSTRAINT no_self_match CHECK  (card_a <> card_b)
);

-- Tracks cards whose embedding generation failed — for background retry
CREATE TABLE failed_embeds (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID        REFERENCES vibe_cards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Postgres vector search function

```sql
-- supabase/functions.sql — run in Supabase SQL editor

-- Atomically enforce max_cards per event.
-- Advisory count check in joinEvent() is racey; this is the real guard.
-- Handle error code 'P0001' / message 'room_full' in CreateCard.jsx handleSubmit.
CREATE OR REPLACE FUNCTION check_room_capacity() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM vibe_cards WHERE event_id = NEW.event_id)
     >= (SELECT max_cards FROM events WHERE id = NEW.event_id) THEN
    RAISE EXCEPTION 'room_full';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_room_capacity
  BEFORE INSERT ON vibe_cards
  FOR EACH ROW EXECUTE FUNCTION check_room_capacity();

CREATE OR REPLACE FUNCTION match_cards(
  query_embedding vector(768),
  p_event_id      uuid,
  exclude_card_id uuid,
  match_count     int DEFAULT 3
)
RETURNS TABLE (id uuid, similarity float)
LANGUAGE sql AS $$
  SELECT
    id,
    1 - (offer_embedding <=> query_embedding) AS similarity
  FROM vibe_cards
  WHERE
    event_id        = p_event_id
    AND id          <> exclude_card_id
    AND offer_embedding IS NOT NULL
  ORDER BY offer_embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### Row Level Security (RLS)

Always enable — without RLS the anon key grants full table access to anyone.

```sql
ALTER TABLE events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_cards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_embeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_read"    ON events      FOR SELECT USING (true);
CREATE POLICY "events_insert"  ON events      FOR INSERT WITH CHECK (true);

CREATE POLICY "cards_read"     ON vibe_cards  FOR SELECT USING (true);
CREATE POLICY "cards_insert"   ON vibe_cards  FOR INSERT WITH CHECK (true);
-- ⚠️  HACKATHON SCOPE: cards_update and cards_delete use USING (true) — any anon-key
-- caller can update or delete any card via curl/devtools. The UI restricts these
-- actions to the user's own card, but there is NO DB-level ownership enforcement.
-- For production: gate on a per-card secret token or switch to Supabase Auth.
CREATE POLICY "cards_update"   ON vibe_cards  FOR UPDATE USING (true);
CREATE POLICY "cards_delete"   ON vibe_cards  FOR DELETE USING (true);

CREATE POLICY "matches_read"   ON matches     FOR SELECT USING (true);
CREATE POLICY "matches_insert" ON matches     FOR INSERT WITH CHECK (true);
CREATE POLICY "matches_update" ON matches     FOR UPDATE USING (true);

CREATE POLICY "embeds_insert"  ON failed_embeds FOR INSERT WITH CHECK (true);
CREATE POLICY "embeds_delete"  ON failed_embeds FOR DELETE USING (true); -- cleanup after retry
```

After running all SQL, enable **Realtime** on `vibe_cards` and `matches` under Database → Replication.

---

## Data Model

```
events
  id · name · code (unique, 6-char uppercase)
  max_cards · expires_at · created_at
      |
      | 1 ──── N  ON DELETE CASCADE
      |
vibe_cards
  id · event_id (FK) · name · emoji
  project · need (min 10 chars) · offer (min 10 chars)
  energy (int CHECK 1–10)
  need_embedding  (vector 768, async)
  offer_embedding (vector 768, async)
  created_at
      |
      | card_a (initiator) ──── N
      | card_b (target)    ──── N
      |
matches
  id · card_a (FK, LEAST UUID) · card_b (FK, GREATEST UUID)
  initiator_card (FK) · status (match_status, default 'pending')
  card_a_snapshot (jsonb) · card_b_snapshot (jsonb)
  icebreaker · created_at
  UNIQUE (LEAST(card_a,card_b), GREATEST(card_a,card_b))
  CHECK  (card_a <> card_b)

failed_embeds
  id · card_id (FK) · created_at
```

---

## User Flow

```
/ or /join/:code  (QR scan, slide link, or manual entry)
    │
    ├── Create event ──────┐
    │                      │
    └── Join with code ────┤  (auto-uppercased, expiry checked)
         (room full? error)│
                           │
                    /create/:eventId
                    Fill out Vibe Card (validated)
                    → INSERT card → navigate to room immediately
                    → embedCard() fires async in background
                    → safeStore('my_card_id', card.id)
                    → safeStore('my_event_id', eventId)
                           │
                    /room/:eventId
                    Skeleton shown → cards load → Realtime live
                    Connected indicator (green dot)
                    RoomQR in header (copy link + QR code)
                    Suggested rail appears ~1s later (embeddings ready)
                           │
              ┌────────────┴──────────────┐
              │                           │
        Browse cards              Shoot Your Shot
        Energy filter (v2)        (button disabled on own card + no self-match)
        Suggested for you         Pick personality
                                  → proxy streams icebreaker word-by-word
                                  → only saved to DB on [DONE]
                                           │
                                  Match upserted (UNIQUE safe)
                                  card_a_snapshot + card_b_snapshot stored
                                           │
                                  card_b sees toast (useMatches Realtime)
                                  MatchModal opens with streamed text
                                           │
                                  /matches/:eventId
                                  Export per contact: vCard (.vcf)
                                  Export all: CSV (injection-safe)
```

---

## System Architecture

```
┌────────────────────────────────────────────┐
│  React + Vite  (mobile-first, dvh units)   │
│  Home · CreateCard · Room · Matches        │
│  ErrorBoundary wraps entire tree           │
└───────────────┬─────────────┬──────────────┘
                │             │
                ▼             ▼
┌───────────────────────┐  ┌──────────────────────────────┐
│  Supabase              │  │  Express proxy  (server.js)  │
│  Postgres + RLS        │  │  CORS: explicit origin only  │
│  pgvector extension    │  │  Rate limit: 10 req/min      │
│  Realtime websockets   │  │  Timeout: 10s AbortController│
│                        │  │  Body limit: 16kb            │
│                        │  │  Streaming: SSE              │
│  events                │  │  Personalities: 5 modes      │
│  vibe_cards (indexed)  │  └──────────────┬───────────────┘
│  matches               │                 │
│  failed_embeds         │        ┌────────┴──────────┐
│  RLS on all tables     │        ▼                   ▼
└───────────────────────┘  ┌──────────┐      ┌──────────────┐
         │                 │  Gemini  │      │  Gemini      │
         ▼                 │  Flash   │      │  Embedding   │
  useRoom.js               │  stream  │      │  exp-03-07   │
  useMatches.js            └──────────┘      └──────────────┘
  (both cleanup on unmount
   + full re-fetch on reconnect)
```

---

## Key Implementation Notes

### Safe localStorage wrapper

```js
// src/lib/storage.js — safe in private browsing, never throws
export const safeStore = (key, value) => {
  try { localStorage.setItem(key, value); } catch {}
};
export const safeGet = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
```

### Room code generation — with retry

```js
// Always exactly 6-char uppercase alphanumeric
// Math.random().toString(36) can produce fewer than 8 chars after the decimal
// for values like 0.1 — pad with zeros before slicing to guarantee length.
function generateRoomCode() {
  return Math.random().toString(36).padEnd(9, '0').slice(2, 8).toUpperCase();
}

export async function createEvent(name) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from('events')
      .insert({ name, code })
      .select()
      .single();
    if (!error) return data;
    if (error.code !== '23505') throw error; // only retry on UNIQUE collision
  }
  throw new Error('Failed to generate unique room code after 3 attempts');
}
```

### Join flow — validation

```js
// Home.jsx — normalize input, check expiry, check capacity
async function joinEvent(rawCode) {
  const code = rawCode.trim().toUpperCase(); // normalize casing

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('code', code)
    .single();

  if (!event) return setError('Room not found.');
  if (new Date(event.expires_at) < new Date()) return setError('This event has ended.');

  const { count } = await supabase
    .from('vibe_cards')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id);

  if (count >= event.max_cards) return setError('This room is full.');

  // NOTE: count check is advisory only — two users can pass simultaneously.
  // The real guard is the enforce_room_capacity DB trigger (see supabase/functions.sql).
  // Handle error.code 'P0001' / message 'room_full' in CreateCard.jsx handleSubmit.

  navigate(`/create/${event.id}`);
}
```

### Card creation — double-submit safe

```js
// CreateCard.jsx
const [submitting, setSubmitting] = useState(false);

async function handleSubmit(formData) {
  if (submitting) return;
  setSubmitting(true);
  try {
    const { data: card } = await supabase
      .from('vibe_cards')
      .insert({ event_id: eventId, ...formData })
      .select()
      .single();

    safeStore('my_card_id', card.id);
    safeStore('my_event_id', eventId);

    navigate(`/room/${eventId}`);

    // Fire async — user is already in the room, embeddings appear ~1s later
    embedCard(card);
  } catch (err) {
    setSubmitting(false);
    setError('Failed to create card. Try again.');
  }
}
```

### Embedding flow — async, retry on fail

```js
// src/api/embed.js
export async function embedCard(card, { isRetry = false } = {}) {
  try {
    // Stagger to avoid rate-limit spikes when many cards are created at once
    await new Promise(r => setTimeout(r, Math.random() * 2000));

    const [needVec, offerVec] = await Promise.all([
      fetchEmbedding(card.need),
      fetchEmbedding(card.offer),
    ]);

    await supabase
      .from('vibe_cards')
      .update({ need_embedding: needVec, offer_embedding: offerVec })
      .eq('id', card.id);

    // If this was a retry triggered from failed_embeds, remove the failure row
    if (isRetry) {
      await supabase.from('failed_embeds').delete().eq('card_id', card.id);
    }
  } catch {
    if (!isRetry) {
      // Log to failed_embeds — one retry attempt only
      await supabase.from('failed_embeds').insert({ card_id: card.id });
      // Retry once after 5s
      setTimeout(() => embedCard(card, { isRetry: true }), 5000);
    }
    // If retry also fails, row stays in failed_embeds for manual inspection
  }
}

async function fetchEmbedding(text) {
  const res = await fetch(`${import.meta.env.VITE_PROXY_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error('Embed failed');
  const { embedding } = await res.json();
  return embedding;
}
```

### Suggested matches

```js
// src/hooks/useSuggested.js
// cardCount is passed from useRoom so suggestions refresh when new cards join.
export function useSuggested(myCard, eventId, cardCount) {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!myCard?.need_embedding) return; // wait until embeddings are ready

    supabase
      .rpc('match_cards', {
        query_embedding: myCard.need_embedding,
        p_event_id: eventId,
        exclude_card_id: myCard.id,
        match_count: 3,
      })
      .then(({ data }) => {
        if (data?.length) setSuggestions(data.map(d => d.id));
      });
  // Re-run when a new card joins (cardCount changes) or embeddings first become ready
  }, [myCard?.need_embedding, eventId, cardCount]);

  return suggestions; // array of card IDs to highlight at top of feed
}
```

```jsx
// SuggestedFeed.jsx
export function SuggestedFeed({ suggestionIds, allCards }) {
  const suggested = allCards.filter(c => suggestionIds.includes(c.id));
  if (suggested.length === 0) return null; // hide entirely on cold start

  return (
    <div className="mb-6">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-2">⚡ Suggested for you</p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {suggested.map(card => <VibeCard key={card.id} card={card} compact />)}
      </div>
    </div>
  );
}
```

### AI personalities

```js
// server.js
const PERSONALITIES = {
  hype: 'You are an overly enthusiastic hype person. Use energy and exclamation points. Make them feel like the most exciting collab of the century.',
  roast: 'You are a playful roast master. Lightly tease both people about their projects in a way that makes them laugh and want to connect.',
  philosopher: 'You are a late-night philosopher. Find the deeper meaning behind both projects and connect them with one profound, slightly absurd insight.',
  investor: 'You are a 1990s infomercial host pitching why these two MUST meet RIGHT NOW. Over the top, specific to their actual projects.',
  default: 'You are a witty icebreaker generator for hackathon networking events. Be specific, human, and a little playful. Never be corporate.',
};

const OUTPUT_RULE = ' Write exactly 2 short sentences. Reference both people\'s actual projects. Max 150 tokens.';

function getSystemInstruction(personality = 'default') {
  return (PERSONALITIES[personality] ?? PERSONALITIES.default) + OUTPUT_RULE;
}
```

### Streaming icebreaker — proxy

```js
// server.js — /icebreaker endpoint
app.post('/icebreaker', async (req, res) => {
  const { cardA, cardB, personality } = req.body;
  if (!cardA?.name || !cardB?.name) {
    return res.status(400).json({ error: 'Both cards required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
    res.write('data: [TIMEOUT]\n\n');
    res.end();
  }, 10_000);

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      config: {
        systemInstruction: getSystemInstruction(personality),
        maxOutputTokens: 150,
        temperature: 0.9,
      },
      contents: buildPrompt(cardA, cardB),
    });

    for await (const chunk of stream) {
      if (controller.signal.aborted) break;
      const text = chunk.text();
      if (text) res.write(`data: ${JSON.stringify(text)}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch {
    res.write('data: [ERROR]\n\n');
  } finally {
    clearTimeout(timer);
    res.end();
  }
});

// Truncate fields before interpolating — prevents prompt injection via crafted card text.
// Strip control characters only (0x00–0x1F, 0x7F); preserve emoji and other Unicode so
// names like "🚀 RocketApp" survive into the prompt intact.
const trunc = (s = '', n = 200) => String(s).slice(0, n).replace(/[\x00-\x1F\x7F]/g, '');

function buildPrompt(cardA, cardB) {
  return (
    `Person A: ${trunc(cardA.name, 50)}, building "${trunc(cardA.project)}", needs "${trunc(cardA.need)}", offers "${trunc(cardA.offer)}".\n` +
    `Person B: ${trunc(cardB.name, 50)}, building "${trunc(cardB.project)}", needs "${trunc(cardB.need)}", offers "${trunc(cardB.offer)}".\n` +
    `Write a 2-sentence icebreaker for them.`
  );
}
```

### Streaming icebreaker — client

```js
// src/api/gemini.js
export async function streamIcebreaker(cardA, cardB, personality, onChunk, signal) {
  let fullText = '';
  try {
    const res = await fetch(`${import.meta.env.VITE_PROXY_URL}/icebreaker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardA, cardB, personality }),
      signal,
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    // Buffer incomplete lines across TCP chunk boundaries
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE events are terminated by \n\n — only process complete events
      const events = buffer.split('\n\n');
      buffer = events.pop(); // last element may be incomplete — keep buffering
      for (const event of events) {
        for (const line of event.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (['[DONE]', '[TIMEOUT]', '[ERROR]'].includes(payload)) return fullText || fallback(cardA, cardB);
          try {
            const chunk = JSON.parse(payload);
            fullText += chunk;
            onChunk(fullText); // update UI incrementally
          } catch { /* ignore malformed chunk */ }
        }
      }
    }
    return fullText || fallback(cardA, cardB);
  } catch {
    return fallback(cardA, cardB);
  }
}

const fallback = (a, b) => `${a.name} and ${b.name} — you two clearly need to talk. Go!`;
```

### ShootYourShot — personality picker + abort on switch

```jsx
// ShootYourShot.jsx
const MODES = [
  { key: 'default',     label: '✨ Default' },
  { key: 'hype',        label: '🔥 Hype' },
  { key: 'roast',       label: '😤 Roast' },
  { key: 'philosopher', label: '🧠 Philosopher' },
  { key: 'investor',    label: '📈 Investor' },
];

export function ShootYourShot({ myCard, targetCard }) {
  const [personality, setPersonality] = useState('default');
  const [firing, setFiring] = useState(false);
  const [icebreaker, setIcebreaker] = useState('');
  const abortRef = useRef(null);

  const shoot = async () => {
    if (firing) return;
    setFiring(true);
    setIcebreaker('');

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const text = await streamIcebreaker(
        myCard, targetCard, personality,
        (partial) => setIcebreaker(partial),  // word-by-word UI update
        abortRef.current.signal,
      );

      // Normalize ordering so (A→B) and (B→A) always resolve to the same row.
      // LEAST/GREATEST by UUID string ensures bidirectional uniqueness.
      const [lo, hi] = [myCard.id, targetCard.id].sort();
      const isLo = myCard.id === lo;

      // Only save to DB after stream completes (text is full icebreaker).
      // ignoreDuplicates: false so re-shooting updates the icebreaker text.
      // status resets to 'pending' on re-shoot so target gets a fresh prompt.
      await supabase.from('matches').upsert(
        {
          card_a: lo,
          card_b: hi,
          initiator_card: myCard.id,
          icebreaker: text,
          status: 'pending',
          card_a_snapshot: isLo ? myCard : targetCard,
          card_b_snapshot: isLo ? targetCard : myCard,
        },
        { onConflict: 'card_a,card_b', ignoreDuplicates: false }
      );
    } finally {
      // Always release firing state — even if upsert throws
      setFiring(false);
    }
  };

  const switchPersonality = (key) => {
    if (firing) {
      abortRef.current?.abort(); // cancel in-flight stream
      setFiring(false);
      setIcebreaker('');
    }
    setPersonality(key);
  };

  return (/* personality picker UI + shoot button + streaming icebreaker display */);
}
```

### MatchModal — recipient's view (streamed replay)

card_b receives the full icebreaker text from the DB row (stream is already done). Re-animate it word-by-word on mount so both sides feel the same reveal.

```jsx
// MatchModal.jsx
export function MatchModal({ match, onClose }) {
  const [displayed, setDisplayed] = useState('');
  const [responded, setResponded] = useState(false);

  // Replay the icebreaker word-by-word from the stored text
  useEffect(() => {
    if (!match?.icebreaker) return;
    const words = match.icebreaker.split(' ');
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(words.slice(0, i).join(' '));
      if (i >= words.length) clearInterval(timer);
    }, 60); // ~60ms per word feels natural
    return () => clearInterval(timer);
  }, [match?.icebreaker]);

  const respond = async (status) => {
    setResponded(true);
    await supabase.from('matches').update({ status }).eq('id', match.id);
    onClose();
  };

  if (!match) return null;

  // Determine which snapshot is "theirs" and whether I'm the initiator.
  // myCardId may be null in private browsing — fall back to initiator_card logic for both.
  const myCardId = safeGet('my_card_id');
  const isInitiator = myCardId
    ? match.initiator_card === myCardId
    : match.initiator_card === match.card_a; // best guess when identity is unknown
  const theirCard = myCardId
    ? (match.card_a === myCardId ? match.card_b_snapshot : match.card_a_snapshot)
    : (isInitiator ? match.card_b_snapshot : match.card_a_snapshot);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
         onClick={onClose}>
      <div className="bg-zinc-900 border border-yellow-400/40 rounded-2xl p-6 max-w-sm w-full"
           onClick={e => e.stopPropagation()}>
        <p className="text-xs text-white/40 uppercase tracking-widest mb-1">New match</p>
        <h2 className="font-black text-2xl text-yellow-400 mb-1">
          {theirCard?.emoji} {theirCard?.name}
        </h2>
        <p className="text-white/60 text-sm mb-4">{theirCard?.project}</p>

        <div className="bg-white/5 rounded-xl p-4 mb-6 min-h-[64px]">
          <p className="text-white leading-relaxed">
            {displayed || <span className="text-white/30">Generating icebreaker…</span>}
          </p>
        </div>

        {/* Accept/decline — only shown to the target (non-initiator) */}
        {!isInitiator && !responded && (
          <div className="flex gap-3">
            <button
              onClick={() => respond('declined')}
              aria-label="Decline match"
              className="flex-1 border border-white/20 text-white/60 font-bold py-3 rounded-xl hover:border-white/40 transition"
            >
              Pass
            </button>
            <button
              onClick={() => respond('accepted')}
              aria-label="Accept match"
              className="flex-1 bg-yellow-400 text-black font-bold py-3 rounded-xl"
            >
              Let's go 🎯
            </button>
          </div>
        )}
        {/* Initiator just dismisses */}
        {isInitiator && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl"
          >
            Sent! 🎯
          </button>
        )}
      </div>
    </div>
  );
}
```

Usage in `Room.jsx`:
```jsx
const [activeMatch, setActiveMatch] = useState(null);

useMatches(myCardId, (match) => {
  setActiveMatch(match);
  // also show toast: `${match.card_a_snapshot?.name ?? 'Someone'} wants to connect!`
});

{activeMatch && <MatchModal match={activeMatch} onClose={() => setActiveMatch(null)} />}
```

### Realtime hook — reconnect + cleanup

```js
// src/hooks/useRoom.js
export function useRoom(eventId) {
  const [cards, setCards]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [connected, setConnected] = useState(false);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from('vibe_cards')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at');
    setCards(data ?? []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel(`room-${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vibe_cards', filter: `event_id=eq.${eventId}` },
        ({ new: card }) => setCards(prev => [...prev, card]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vibe_cards', filter: `event_id=eq.${eventId}` },
        ({ new: card }) => setCards(prev => prev.map(c => c.id === card.id ? card : c)))
      .subscribe(status => {
        const isConnected = status === 'SUBSCRIBED';
        setConnected(isConnected);
        // Re-fetch on reconnect to recover any missed events during disconnect
        if (isConnected) fetchAll();
      });

    return () => supabase.removeChannel(channel); // prevent subscription leak
  }, [eventId, fetchAll]);

  return { cards, loading, connected };
}
```

### Incoming match notifications

```js
// src/hooks/useMatches.js
export function useMatches(myCardId, onIncoming) {
  // Stable ref so the effect doesn't re-subscribe every render when
  // the caller passes an inline function (new reference each render).
  const onIncomingRef = useRef(onIncoming);
  useEffect(() => { onIncomingRef.current = onIncoming; });

  useEffect(() => {
    if (!myCardId) return;

    // Deduplicate across browser tabs using BroadcastChannel
    const bc = new BroadcastChannel('vibecheck_matches');
    const seen = new Set();

    // Ordering is now canonical (LEAST/GREATEST UUID), so the user can be card_a or card_b.
    // We use initiator_card to skip toasting the person who shot first.
    const handleMatch = ({ new: match }) => {
      if (match.initiator_card === myCardId) return; // I shot this, no toast for me
      if (seen.has(match.id)) return;
      seen.add(match.id);
      bc.postMessage({ type: 'match_seen', id: match.id });
      onIncomingRef.current(match);
    };

    // Subscribe to both sides — user could be the lower or higher UUID
    const channel = supabase
      .channel(`matches-${myCardId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches', filter: `card_a=eq.${myCardId}` }, handleMatch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches', filter: `card_b=eq.${myCardId}` }, handleMatch)
      .subscribe();

    bc.onmessage = (e) => { if (e.data.type === 'match_seen') seen.add(e.data.id); };

    return () => {
      supabase.removeChannel(channel);
      bc.close();
    };
  }, [myCardId]); // onIncoming intentionally excluded — accessed via ref
}
```

### Self-match — double-guarded

```jsx
// VibeCard.jsx — UI layer
const myCardId = safeGet('my_card_id');
const isMyCard = card.id === myCardId;

<button
  disabled={isMyCard || firing}
  className={isMyCard ? 'opacity-40 cursor-not-allowed' : ''}
>
  {isMyCard ? "That's you!" : 'Shoot Your Shot 🎯'}
</button>
```

DB layer enforces `CHECK (card_a <> card_b)` — insert fails even if UI check is bypassed.

### QR code share panel

```jsx
// RoomQR.jsx — qrcode.react, no external service
import { QRCodeSVG } from 'qrcode.react';

export function RoomQR({ code }) {
  const joinUrl = `${window.location.origin}/join/${code}`;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5">
      <QRCodeSVG value={joinUrl} size={128} bgColor="transparent" fgColor="#FACC15" />
      <p className="text-yellow-400 font-black tracking-widest text-xl">{code}</p>
      <button onClick={copy} className="text-sm text-white/60 hover:text-white transition">
        {copied ? '✓ Copied!' : 'Copy join link'}
      </button>
    </div>
  );
}
```

### Loading skeleton

```jsx
// CardSkeleton.jsx
export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white/10" />
        <div className="h-4 bg-white/10 rounded w-1/3" />
      </div>
      <div className="h-3 bg-white/10 rounded w-2/3" />
      <div className="h-3 bg-white/10 rounded w-1/2" />
      <div className="h-3 bg-white/10 rounded w-3/4" />
    </div>
  );
}

// MatchFeed.jsx usage
{loading
  ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
  : cards.map(card => <VibeCard key={card.id} card={card} />)
}
```

### Error boundary

```jsx
// ErrorBoundary.jsx
export class ErrorBoundary extends React.Component {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }

  render() {
    if (this.state.crashed) {
      return (
        <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center text-white p-8">
          <p className="text-5xl mb-4">💥</p>
          <h1 className="font-black text-2xl mb-2">Something exploded.</h1>
          <p className="text-white/60 mb-6">The vibe got too strong. Try refreshing.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-yellow-400 text-black font-bold px-6 py-2 rounded-xl"
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### Contact export — vCard + CSV injection-safe

```js
// Matches.jsx

// vCard — opens Contacts on iOS/Android with one tap
function exportVCard(card) {
  // Escape backslashes, commas, and semicolons per RFC 6350.
  // Strip newlines/CR to prevent field injection (e.g. a name with \nTEL:...).
  const vcf_escape = (s = '') =>
    String(s).replace(/[\r\n]+/g, ' ').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;');

  const vcf = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `FN:${vcf_escape(card.name)}`,
    `NOTE:Building: ${vcf_escape(card.project)}\\nNeeds: ${vcf_escape(card.need)}\\nOffers: ${vcf_escape(card.offer)}`,
    'END:VCARD',
  ].join('\r\n');
  // Sanitize filename — strip characters invalid in filenames
  const safeName = String(card.name).replace(/[^\w\s-]/g, '').trim() || 'contact';
  triggerDownload(`${safeName}.vcf`, vcf, 'text/vcard');
}

// CSV — injection-safe bulk export
function exportCSV(matches) {
  const myCardId = safeGet('my_card_id');
  const sanitize = (val = '') => {
    const s = String(val).replace(/"/g, '""');
    // Prefix formula characters to prevent CSV injection in Excel/Sheets
    return /^[=+\-@]/.test(s) ? `'${s}` : s;
  };
  const header = 'Name,Project,Need,Offer,Icebreaker,Status';
  const rows = matches.map((match) => {
    // Pick the snapshot that is NOT ours — card_a/card_b ordering is canonical UUID sort,
    // not initiator/target, so we must check which side our card is on.
    const theirSnapshot = myCardId && match.card_a === myCardId
      ? match.card_b_snapshot
      : match.card_a_snapshot;
    const c = theirSnapshot ?? match.card_b_snapshot; // fallback if myCardId unknown
    return `"${sanitize(c?.name)}","${sanitize(c?.project)}","${sanitize(c?.need)}","${sanitize(c?.offer)}","${sanitize(match.icebreaker)}","${sanitize(match.status)}"`;
  });
  triggerDownload('vibecheck-matches.csv', [header, ...rows].join('\n'), 'text/csv');
}

function triggerDownload(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  // Revoke after a tick — revoking synchronously cancels the download before it starts
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
```

> Export uses `card_b_snapshot` (stored at match time) — survives card edits, always shows the data that was current when the match was made.

### Delete card (leave room)

```jsx
// Room.jsx — shown only on the user's own card via isMyCard check
async function handleDeleteCard() {
  const myCardId = safeGet('my_card_id');
  if (!myCardId) return;
  if (!window.confirm('Remove your card from this room?')) return;
  await supabase.from('vibe_cards').delete().eq('id', myCardId);
  // Clear local identity so they can re-join as a new person
  // Use try/catch — localStorage throws in private browsing
  try { localStorage.removeItem('my_card_id'); } catch {}
  navigate('/');
}
```

The `ON DELETE CASCADE` on `matches` removes associated match rows automatically.
Realtime DELETE listener in `useRoom` removes the card from all peers' feeds instantly.

Add to `useRoom`:
```js
.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'vibe_cards', filter: `event_id=eq.${eventId}` },
  ({ old: card }) => setCards(prev => prev.filter(c => c.id !== card.id)))
```

### Card reclaim — different device

PIN-based reclaim: a random 4-digit PIN is generated client-side at card creation and stored with the card. It's shown **once** in a modal immediately after submit — the user should screenshot or note it. On a different device, entering the room code + PIN re-links the session.

This is sufficient for a hackathon demo: name badges are visible to everyone in the room, making name-only reclaim trivially exploitable. A PIN is private to the user and never displayed on the card or feed.

```js
// CreateCard.jsx — generate PIN before insert
function generatePin() {
  // Pad to guarantee exactly 4 digits (e.g. Math.random() could give 0.001 → '1')
  return String(Math.floor(Math.random() * 9000) + 1000);
}

async function handleSubmit(formData) {
  if (submitting) return;
  setSubmitting(true);
  try {
    const pin = generatePin();

    const { data: card } = await supabase
      .from('vibe_cards')
      .insert({ event_id: eventId, pin, ...formData })
      .select()
      .single();

    safeStore('my_card_id', card.id);
    safeStore('my_event_id', eventId);

    // Show PIN once before navigating — user must acknowledge
    setPinToShow(pin); // triggers modal: "Your reclaim PIN: 4827 — screenshot this!"
    // Navigation happens after user dismisses the modal (onClose calls navigate)

    embedCard(card);
  } catch (err) {
    setSubmitting(false);
    setError('Failed to create card. Try again.');
  }
}
```

```jsx
{/* PinModal — shown once after card creation, before entering the room */}
{pinToShow && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
    <div className="bg-zinc-900 border border-yellow-400/40 rounded-2xl p-6 max-w-xs w-full text-center">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Your reclaim PIN</p>
      <p className="font-black text-6xl text-yellow-400 tracking-widest mb-3">{pinToShow}</p>
      <p className="text-white/60 text-sm mb-6">
        Screenshot this. If you switch devices, you'll need it to reclaim your card.
      </p>
      <button
        onClick={() => { setPinToShow(null); navigate(`/room/${eventId}`); }}
        className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl"
      >
        Got it — let's go 🎯
      </button>
    </div>
  </div>
)}
```

```js
// Home.jsx — reclaim flow: room code + PIN only, no name required
async function reclaimCard(eventId, pin) {
  const { data } = await supabase
    .from('vibe_cards')
    .select('id')
    .eq('event_id', eventId)
    .eq('pin', pin.trim())   // exact match — 4 digits, 1-in-9000 brute-force odds per attempt
    .single();

  if (data) {
    safeStore('my_card_id', data.id);
    safeStore('my_event_id', eventId);
    navigate(`/room/${eventId}`);
  } else {
    setError('PIN not found. Create a new card instead.');
    navigate(`/create/${eventId}`);
  }
}
// Show the reclaim prompt only when joining a room and safeGet('my_card_id') is null.
// UI: two inputs — room code (already filled from QR) + 4-digit PIN.
```

> **Why not name-based?** Name badges are visible to everyone in the room. A name-only reclaim lets any attendee claim your card and read your match history in seconds. A 4-digit PIN is private, unknown to anyone watching, and has 9,000 possible values — sufficient to deter casual abuse at hackathon scale without requiring auth infrastructure.

### Card editing

```js
// CreateCard.jsx — detects edit mode by checking localStorage + route
const isEditing = location.pathname.includes('/edit');
const myCardId = safeGet('my_card_id');

// Pre-fill form
useEffect(() => {
  if (!isEditing || !myCardId) return;
  supabase.from('vibe_cards').select('*').eq('id', myCardId).single()
    .then(({ data }) => setFormData(data));
}, [isEditing, myCardId]);

// Submit — UPDATE instead of INSERT
const handleSubmit = async (formData) => {
  if (isEditing) {
    await supabase.from('vibe_cards').update(formData).eq('id', myCardId);
    embedCard({ id: myCardId, ...formData }); // re-embed updated text
  } else {
    // normal INSERT flow
  }
  navigate(`/room/${eventId}`);
};
```

Realtime UPDATE listener in `useRoom` propagates the change to all viewers automatically.

### Mobile viewport

```jsx
// All full-height pages — use dvh so iOS Safari keyboard doesn't crush the layout
<div className="min-h-[100dvh] flex flex-col pb-safe">
  {/* content */}
</div>
```

Add to `tailwind.config.js`:
```js
theme: {
  extend: {
    spacing: { safe: 'env(safe-area-inset-bottom)' }
  }
}
```

### Energy scale + filter

```
1–3   → 💭 Idea Person
4–7   → ⚖️ Hybrid
8–10  → 🔨 Executor
```

```jsx
// EnergyFilter.jsx — ship as toggle in Room.jsx header
const FILTERS = [
  { key: 'all',      label: 'All',  range: null },
  { key: 'thinker',  label: '💭 Thinker',   range: [1, 3],  ariaLabel: 'Filter: Idea People (energy 1–3)' },
  { key: 'hybrid',   label: '⚖️ Hybrid',    range: [4, 7],  ariaLabel: 'Filter: Hybrid (energy 4–7)' },
  { key: 'executor', label: '🔨 Executor',   range: [8, 10], ariaLabel: 'Filter: Executors (energy 8–10)' },
];

export function EnergyFilter({ activeKey, onChange }) {
  return (
    <div className="flex gap-2" role="group" aria-label="Filter by energy level">
      {FILTERS.map(({ key, label, range, ariaLabel }) => (
        <button
          key={key}
          onClick={() => onChange(key, range)}
          aria-label={ariaLabel ?? 'Show all energy levels'}
          aria-pressed={activeKey === key}
          className={`px-3 py-1 rounded-full border text-sm transition
            ${activeKey === key
              ? 'border-yellow-400 text-yellow-400'
              : 'border-white/20 text-white/60'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Room.jsx — key-based state for stable comparison with EnergyFilter's activeKey prop
const [energyFilter, setEnergyFilter] = useState({ key: 'all', range: null });
const visible = energyFilter.range
  ? cards.filter(c => c.energy >= energyFilter.range[0] && c.energy <= energyFilter.range[1])
  : cards;
// <EnergyFilter activeKey={energyFilter.key} onChange={(key, range) => setEnergyFilter({ key, range })} />
```

---

## Edge Cases & Fixes Reference

| # | Bug | Fix |
|---|---|---|
| 1 | Embed fails silently | Retry once, log to `failed_embeds` |
| 2 | Rate limit on bulk card creation | Stagger embed calls 0–2s random delay |
| 3 | Vague need/offer text → bad suggestions | `CHECK (char_length >= 10)` in DB + form validation |
| 4 | Cold start — no suggestions yet | `SuggestedFeed` returns null if 0 results |
| 5 | Double-tap Shoot Your Shot | `firing` state disables button immediately |
| 6 | Stream interrupted → partial text saved | Only save to DB on `[DONE]` SSE event |
| 7 | Null icebreaker in Matches page | Fallback string on render |
| 8 | Personality switched mid-stream | `AbortController` cancels in-flight stream |
| 9 | Lowercase room code | `.trim().toUpperCase()` on join input |
| 10 | Expired event join attempt | Check `expires_at` before navigating |
| 11 | Room at capacity | Count check before allowing card creation |
| 12 | Form double-submit | `submitting` state, disable on first click |
| 13 | Different device — no localStorage | PIN-based card reclaim — 4-digit PIN shown once at card creation, matched on `event_id + pin` |
| 14 | Card edited after match | Snapshots in `card_a_snapshot` / `card_b_snapshot` JSONB |
| 15 | Private browsing localStorage blocked | `safeGet` / `safeStore` with try/catch |
| 16 | Missed events during disconnect | Full re-fetch on Realtime reconnect |
| 17 | Duplicate toasts across browser tabs | `BroadcastChannel` deduplication |
| 18 | CSV injection attack | Prefix `=+\-@` chars with `'` in export |
| 19 | XSS in card fields | React default — never use `dangerouslySetInnerHTML` |
| 20 | Spoofed `card_a` in localStorage | DB `CHECK (card_a <> card_b)` + production: Supabase Auth |
| 21 | A→B and B→A create duplicate match rows | Canonical LEAST/GREATEST UUID ordering on insert + bidirectional UNIQUE constraint |
| 22 | Re-shoot doesn't update icebreaker | `ignoreDuplicates: false` in upsert — overwrites `icebreaker` field |
| 23 | card_b sees icebreaker all at once (no streaming) | Word-by-word replay animation in MatchModal (60ms/word) |
| 24 | Prompt injection via card fields | `trunc()` all fields to 200 chars before `buildPrompt`, allowlist personality |
| 25 | Large payload floods proxy memory | `express.json({ limit: '16kb' })` |
| 26 | IVFFlat index fails on small tables | HNSW index — no warmup needed, works at any row count |
| 27 | `Math.random().toString(36)` produces <6 chars | `.padEnd(9, '0')` before `.slice(2, 8)` guarantees exactly 6 chars |
| 28 | Two users join simultaneously, both pass capacity check | DB trigger `enforce_room_capacity` rejects inserts beyond `max_cards` atomically |
| 29 | SSE line split across TCP packets | Buffer on `\n\n` event boundaries with running `buffer` string; don't split raw chunks |
| 30 | `onIncoming` new reference each render re-subscribes Realtime | Store in `useRef`, only use `myCardId` in effect dependency array |
| 31 | `setFiring(false)` never called when upsert throws | Wrapped in `try/finally` — always releases firing state |
| 32 | CSV always exports `card_b_snapshot` regardless of which side user is | Check `card_a === myCardId` to pick the correct "their" snapshot |
| 33 | Blob URL revoked before download starts | `setTimeout(() => revokeObjectURL(...), 100)` after `a.click()` |
| 34 | vCard field injection via newlines or colons in name | `vcf_escape()` strips `\r\n` and escapes `\`, `,`, `;` per RFC 6350 |
| 35 | `EnergyFilter` active state breaks with `JSON.stringify` comparison | Key-based state (`key: 'all' \| 'thinker' \| 'hybrid' \| 'executor'`) |
| 36 | No way to leave room or delete card | Delete own card from Room.jsx; `ON DELETE CASCADE` cleans matches; Realtime DELETE removes from peers |
| 37 | Suggestions never refresh when new cards join | Pass `cards.length` as `cardCount` to `useSuggested`; re-runs effect on change |
| 38 | Target gets no say in a match (opt-out) | `match_status` column added; MatchModal shows Accept/Pass for non-initiator |
| 39 | Re-shoot silently overwrites icebreaker with no warning | Upsert sets `status: 'pending'` so target gets a fresh toast; initiator sees "Sent!" confirm |
| 40 | `myCardId` null in MatchModal (private browsing) — wrong snapshot shown | Null-safe fallback: derive from `initiator_card` when `myCardId` is unavailable |
| 41 | `status` enum defined but column never added to `matches` table | `status match_status DEFAULT 'pending'` column added to schema |
| 42 | No cross-device match history | `reclaimCard()` on join — PIN + event_id lookup re-links device to existing card; PIN shown once at creation |
| 43 | `embedCard` logs failure but never retries | Retry once after 5s; on success delete the `failed_embeds` row; second failure stays for inspection |
| 44 | `EnergyFilter` emoji-only labels — not screen-reader accessible | `aria-label`, `aria-pressed`, and `role="group"` added; labels include text |
| 45 | Color-only connected indicator — inaccessible to colorblind users | Connected dot always accompanied by "Live" / "Reconnecting…" text label |

---

## Design System

| Token | Value |
|---|---|
| Primary accent | `yellow-400` (#FACC15) |
| Background | `black` |
| Card border (default) | `white/10` |
| Card border (me) | `yellow-400` |
| Building label | `yellow-400` |
| Needs label | `green-400` |
| Offers label | `blue-400` |
| Font weight (headings) | `font-black` |
| Border radius | `rounded-2xl` |
| Skeleton | `animate-pulse bg-white/5` |
| Connected dot | `bg-green-400 animate-pulse` |
| Disconnected dot | `bg-red-400` + "Reconnecting…" banner |

---

## Environment Variables

```bash
# .env  (frontend — Vite reads VITE_ prefix via import.meta.env)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PROXY_URL=http://localhost:3001

# server.env  (proxy — add to .gitignore, NEVER expose to client)
GEMINI_API_KEY=your_gemini_api_key   # aistudio.google.com → Get API key
ALLOWED_ORIGIN=http://localhost:5173  # swap to Vercel URL in prod
PORT=3001
```

---

## Setup Commands

```bash
# 1. Scaffold with Vite
npm create vite@latest vibecheck -- --template react
cd vibecheck

# 2. Frontend deps
npm install @supabase/supabase-js react-router-dom framer-motion qrcode.react

# 3. Tailwind
npm install -D tailwindcss @tailwindcss/vite

# 4. Proxy deps (Node 18+ has native fetch — no node-fetch needed)
npm install express cors express-rate-limit @google/genai dotenv

# 5. Add scripts to package.json
#   "dev":   "vite"
#   "proxy": "node server.js"
#   "start": "node server.js"   ← Railway uses this

# 6. Create .env and server.env, add server.env to .gitignore

# 7. Run SQL schema in Supabase dashboard (schema + RLS + functions.sql)

# 8. Enable Realtime on vibe_cards + matches
#    Supabase dashboard → Database → Replication → toggle both tables

# 9. Dev
npm run dev      # Terminal 1 — Vite :5173
npm run proxy    # Terminal 2 — Express :3001
```

---

## Deployment

### Frontend → Vercel
```bash
vercel deploy
# Env vars in Vercel dashboard:
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_PROXY_URL (← Railway URL)
```

### Proxy → Railway
Connect repo to Railway. It detects Node and runs `npm start` (`node server.js`).
Railway auto-restarts on crash — no pm2 needed.

```
# Env vars in Railway dashboard:
GEMINI_API_KEY=...
ALLOWED_ORIGIN=https://your-app.vercel.app
PORT  ← Railway sets this automatically
```

After both are live: update `VITE_PROXY_URL` on Vercel → redeploy frontend.

---

## Dependencies

> Repo owner installs everything before members clone. Members just run `npm install`.

```bash
# Frontend runtime
npm install @supabase/supabase-js react-router-dom framer-motion qrcode.react

# Frontend dev
npm install -D tailwindcss @tailwindcss/vite

# Proxy / server
npm install express cors express-rate-limit @google/genai dotenv
```

| Package | Where | Purpose |
|---|---|---|
| `@supabase/supabase-js` | Frontend | DB queries + Realtime websockets |
| `react-router-dom` | Frontend | Client-side routing (v6) |
| `framer-motion` | Frontend | Card + modal animations |
| `qrcode.react` | Frontend | QR SVG — no external image service |
| `tailwindcss` | Frontend dev | Utility-first CSS |
| `@tailwindcss/vite` | Frontend dev | Vite plugin — no PostCSS config needed |
| `express` | Server | HTTP proxy |
| `cors` | Server | Restrict to `ALLOWED_ORIGIN` only |
| `express-rate-limit` | Server | 10 req/min per IP |
| `@google/genai` | Server | Gemini SDK — **not** `@google/generative-ai` (deprecated) |
| `dotenv` | Server | Load `server.env` secrets |

> Node 18+ has native `fetch` — no `node-fetch` needed.

---

## Skeleton Repo Setup (repo owner — do this before sharing)

```
1. npm create vite + install all deps above
2. Run schema SQL in Supabase dashboard
3. Run functions.sql (capacity trigger + match_cards RPC)
4. Enable Realtime on vibe_cards + matches (Database → Replication)
5. Create .env and server.env with real keys
6. Add server.env to .gitignore
7. Stub all files with empty exports so imports don't break
8. Commit + push — members clone and start immediately
```

**Files to stub before sharing:**
```
src/lib/supabase.js         src/lib/storage.js
src/api/gemini.js           src/api/embed.js
src/hooks/useRoom.js        src/hooks/useMatches.js     src/hooks/useSuggested.js
src/components/VibeCard.jsx           src/components/VibeCardForm.jsx
src/components/MatchFeed.jsx          src/components/SuggestedFeed.jsx
src/components/MatchModal.jsx         src/components/ShootYourShot.jsx
src/components/RoomQR.jsx             src/components/EnergyFilter.jsx
src/components/CardSkeleton.jsx       src/components/ErrorBoundary.jsx
src/pages/Home.jsx   src/pages/CreateCard.jsx
src/pages/Room.jsx   src/pages/Matches.jsx
src/App.jsx          server.js
```

---

## 4-Person Task Split

> Assumes skeleton repo is cloned and `npm install` is done.
> **Critical path:** P1 DB must be live → P2 hooks working → P4 can wire Room.jsx.

---

### P1 — Infra & Proxy

**Files:** `server.js`

- Express setup: CORS restricted to `ALLOWED_ORIGIN`, rate limit 10 req/min, body limit 16kb
- `/icebreaker` SSE endpoint: 10s AbortController, 5 personalities, `buildPrompt()` with `trunc()` for prompt injection prevention, stream word-by-word, send `[DONE]`/`[TIMEOUT]`/`[ERROR]`
- `/embed` endpoint: call Gemini embedding API, return `{ embedding }` JSON
- Room code generation: `generateRoomCode()` with `.padEnd(9,'0').slice(2,8).toUpperCase()`, retry 3x on UNIQUE collision
- `joinEvent()`: normalize code with `.trim().toUpperCase()`, check `expires_at`, advisory capacity count
- Verify: Realtime events fire in browser console, `match_cards` RPC returns ranked results, capacity trigger rejects over-limit insert with `P0001`

---

### P2 — Data Layer & Hooks

**Files:** `src/lib/supabase.js`, `src/lib/storage.js`, `src/api/gemini.js`, `src/api/embed.js`, `src/hooks/useRoom.js`, `src/hooks/useMatches.js`, `src/hooks/useSuggested.js`

- `supabase.js`: init client from `import.meta.env.VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- `storage.js`: `safeGet`/`safeStore` with try/catch — never call `localStorage` directly
- `gemini.js` — `streamIcebreaker(cardA, cardB, personality, onChunk, signal)`: fetch SSE from proxy, buffer on `\n\n` boundaries, handle `[DONE]/[TIMEOUT]/[ERROR]`, return fallback string on any failure — **never throws**
- `embed.js` — `embedCard(card)`: stagger 0–2s random delay, `Promise.all` for need + offer embeddings, UPDATE card row, retry once after 5s on failure, log to `failed_embeds`, cleanup row on successful retry
- `useRoom.js`: `fetchAll()` on mount + on reconnect, INSERT/UPDATE/DELETE Realtime listeners filtered by `event_id`, `connected` state, `removeChannel` on unmount
- `useMatches.js`: subscribe both `card_a=eq.${myCardId}` and `card_b=eq.${myCardId}`, skip toast when `initiator_card === myCardId`, BroadcastChannel dedup across tabs, store `onIncoming` in `useRef` — only `myCardId` in dep array
- `useSuggested.js`: call `match_cards` RPC with `myCard.need_embedding`, re-run when `myCard.need_embedding` or `cardCount` changes, return array of card IDs

---

### P3 — Home Flow & Card Creation

**Files:** `src/App.jsx`, `src/pages/Home.jsx`, `src/pages/CreateCard.jsx`, `src/components/VibeCardForm.jsx`, `src/components/ErrorBoundary.jsx`, `src/components/CardSkeleton.jsx`

- `App.jsx`: all 6 routes wired, `ErrorBoundary` wraps entire tree, Tailwind + `dvh` config
- `ErrorBoundary.jsx`: class component, `getDerivedStateFromError`, refresh button
- `CardSkeleton.jsx`: `animate-pulse` placeholder, matches `VibeCard` height
- `Home.jsx`:
  - Create event form → insert → navigate to `/create/:eventId`
  - Join form: `.trim().toUpperCase()`, check expiry + capacity, navigate to `/create/:eventId`
  - `/join/:code` deep-link: auto-fill code from URL params, auto-submit
  - Reclaim flow: shown when `safeGet('my_card_id')` is null on join — two inputs (room code + 4-digit PIN), `reclaimCard(eventId, pin)` lookup, re-links session
- `CreateCard.jsx`:
  - Create mode: `generatePin()` before insert, `submitting` guard (double-submit safe), show PIN modal once before navigating, call `embedCard(card)` after navigate, `safeStore` card + event IDs
  - Edit mode: detect from route (`/edit`), pre-fill from DB, UPDATE instead of INSERT, re-embed on save
  - Handle `P0001` / `'room_full'` error from capacity trigger
- `VibeCardForm.jsx`: name, emoji picker, project, need (min 10 chars), offer (min 10 chars), energy slider 1–10, `inputMode="text"` for mobile keyboard

---

### P4 — Room Experience & Matching

**Files:** `src/pages/Room.jsx`, `src/pages/Matches.jsx`, `src/components/VibeCard.jsx`, `src/components/MatchFeed.jsx`, `src/components/ShootYourShot.jsx`, `src/components/MatchModal.jsx`, `src/components/SuggestedFeed.jsx`, `src/components/RoomQR.jsx`, `src/components/EnergyFilter.jsx`

- `VibeCard.jsx`: display name/emoji/project/need/offer/energy, `isMyCard` check disables Shoot button + shows "That's you!", DB `CHECK (card_a <> card_b)` as second guard
- `RoomQR.jsx`: `QRCodeSVG` with `value={origin}/join/${code}`, copy-to-clipboard button, 2s "Copied!" feedback
- `EnergyFilter.jsx`: 4 toggles (All / Thinker 1–3 / Hybrid 4–7 / Executor 8–10), `aria-pressed`, `role="group"`, text labels on all buttons
- `ShootYourShot.jsx`: 5 personality mode buttons, `firing` state disables button, `AbortController` ref — abort on personality switch or re-shoot, call `streamIcebreaker` with `onChunk` for live preview, sort `[myCard.id, targetCard.id]` (LEAST/GREATEST), upsert with `onConflict: 'unique_match'` + `ignoreDuplicates: false`, save only on `[DONE]`, reset `status: 'pending'` on re-shoot, `try/finally` always releases `firing`
- `MatchModal.jsx`: word-by-word replay at 60ms/word from stored icebreaker text, `clearInterval` on unmount, Accept/Pass buttons for non-initiator, "Sent!" dismiss for initiator, null-safe snapshot: use `myCardId` to pick correct snapshot, fallback to `initiator_card` logic when `myCardId` is null (private browsing)
- `SuggestedFeed.jsx`: horizontal scroll rail, returns `null` when 0 suggestions (cold start safe)
- `MatchFeed.jsx`: skeleton → cards, passes `cards` to `VibeCard` list
- `Room.jsx`: wire `useRoom` (feed + connected state), `useMatches` (incoming toast + `setActiveMatch`), connected indicator with "Live" / "Reconnecting…" text + color dot, `EnergyFilter` toggle wired to `visible` filtered array, `SuggestedFeed` rail with `useSuggested`, render `MatchModal` when `activeMatch` is set, delete-own-card button (clears localStorage + navigates home)
- `Matches.jsx`: fetch matches where `card_a` or `card_b` = `myCardId`, vCard export per contact (RFC 6350 escape: strip `\r\n`, escape `\`,`,`,`;`), CSV bulk export (prefix `=+\-@` chars with `'`), pick correct snapshot using `myCardId` check, null icebreaker fallback, `triggerDownload` with `setTimeout(revokeObjectURL, 100)`

---

## Competitive Positioning (pitch)

**Existing tools:** Brella, Swapcard, Hopin, Bizzabo
**Their problem:** Built for corporate event *organizers*. Resume profiles, expensive B2B SaaS, weeks of setup.

**VibeCheck's wedge:**
- Built for the people *in the room*, not the organizer
- Vibe Card = what you're building *right now*, not your job title
- Zero friction — room code, 60 seconds, live
- Streaming AI icebreaker with 5 personality modes
- Semantic "Suggested for you" matching via embeddings
- Licensable to universities, hackathon orgs, accelerators

**One-line pitch:**
> *"LinkedIn is your resume. VibeCheck is your vibe."*

---

## Agent Instructions

1. **Check schema first** — never invent column names. Canonical source is the SQL above.
2. **Never expose `GEMINI_API_KEY`** — all Gemini calls (icebreaker + embed) route through `server.js`. Zero exceptions.
3. **Persist card + event IDs** — use `safeStore('my_card_id', card.id)` and `safeStore('my_event_id', eventId)` immediately after insert.
4. **No polling** — `useRoom` + `useMatches` + Supabase Realtime only. Always call `supabase.removeChannel()` on unmount.
5. **Match direction** — `card_a` is the **lower UUID** (LEAST sort), `card_b` is the **higher UUID** (GREATEST sort). `initiator_card` is the separate column tracking who shot first. Never assume `card_a` = initiator. Always sort `[myCard.id, targetCard.id]` before inserting, then set `initiator_card: myCard.id`. Upsert with `onConflict: 'card_a,card_b'`.
6. **Snapshots** — always populate `card_a_snapshot` and `card_b_snapshot` at match creation time.
7. **Streaming is non-negotiable** — use `generateContentStream()` server-side, SSE to client, `onChunk` to update UI. Only write to DB on `[DONE]`.
8. **Abort on personality switch** — `AbortController` cancels the in-flight stream before starting a new one.
9. **Timeout** — 10s `AbortController` on proxy. Send `[TIMEOUT]` SSE event, then close.
10. **Embeddings are async** — user navigates to room immediately. `embedCard()` fires after navigate. Handle null `need_embedding` gracefully everywhere.
11. **Gemini SDK** — `@google/genai`, `import { GoogleGenAI } from '@google/genai'`. Do NOT use deprecated `@google/generative-ai`.
12. **Gemini embedding model** — `gemini-embedding-exp-03-07`, 768 dimensions.
13. **Card reclaim is PIN-based** — generate a 4-digit PIN (`Math.floor(Math.random() * 9000) + 1000`) client-side, include it in the `INSERT`, show it once in a modal before navigating to the room. `reclaimCard(eventId, pin)` matches on `event_id + pin` — never name. Never show the PIN on the card or in the feed.
14. **Mobile-first** — `min-h-[100dvh]`, `pb-safe`, max-width `md`. Test iOS Safari keyboard behavior.
15. **`streamIcebreaker` never throws** — catch everything, return fallback string.
16. **Room codes** — 6-char uppercase alphanumeric. Normalize input with `.trim().toUpperCase()`. Retry on UNIQUE collision.
17. **QR codes** — `qrcode.react`, generates `${origin}/join/${code}`. No external image services.
18. **Self-match double-guarded** — UI `disabled` + DB `CHECK (card_a <> card_b)`.
19. **RLS always on** — skip this and the anon key exposes everything.
20. **Never use `dangerouslySetInnerHTML`** — React's default escaping handles XSS as long as you don't bypass it.
21. **Vite env vars** — `import.meta.env.VITE_*`. Never `process.env.REACT_APP_*`.
22. **CSV export** — prefix `=+\-@` chars with `'` to prevent formula injection in Excel/Sheets.
23. **localStorage** — always use `safeGet`/`safeStore` wrappers. Never call `localStorage` directly.
24. **Re-fetch on reconnect** — when Supabase channel status returns to `SUBSCRIBED`, call `fetchAll()` to recover missed events.
25. **BroadcastChannel** — use to deduplicate match notifications across browser tabs. Close the channel on unmount.
26. **Express body limit** — `app.use(express.json({ limit: '16kb' }))`. Prevents oversized payloads from inflating the Gemini prompt or causing memory pressure.
27. **Prompt injection** — truncate all card fields to 200 chars via `trunc()` before interpolating into `buildPrompt`. Allowlist `personality` values server-side.
28. **Bidirectional match ordering** — always sort `[myCard.id, targetCard.id]` before inserting. `card_a` is always the lower UUID. Use `initiator_card` to track who shot. `useMatches` listens on both `card_a` and `card_b` and skips toasts where `initiator_card === myCardId`.
29. **`useMatches` `onIncoming` stability** — store the callback in a `useRef` and update the ref in a layout effect. Only include `myCardId` in the effect dependency array to prevent channel re-subscription on every render.
30. **SSE buffering** — accumulate chunks in a `buffer` string, split on `\n\n` event boundaries, leave trailing incomplete data in the buffer. Never split raw `Uint8Array` chunks directly on `\n`.
31. **`triggerDownload` blob URL** — call `URL.revokeObjectURL` inside a `setTimeout(..., 100)` after `a.click()`, never synchronously before the download starts.
32. **vCard escaping** — always run `vcf_escape()` on all fields before interpolating into vCard lines. Strip newlines, escape `\`, `,`, `;` per RFC 6350.
33. **CSV snapshot selection** — use `myCardId` to determine which snapshot is "theirs" (not `card_b_snapshot` always). If `myCardId` is `card_a`, their snapshot is `card_b_snapshot`, and vice versa.
34. **`match_status` column** — always write `status: 'pending'` on match upsert. MatchModal updates to `'accepted'` or `'declined'` based on target's choice. Only show accepted matches on `/matches` page.
35. **Delete card** — use `supabase.from('vibe_cards').delete().eq('id', myCardId)`. Cascade handles matches. Add DELETE listener in `useRoom` to remove card from all peers' feeds. Clear `my_card_id` from localStorage after delete.
36. **Room code length** — use `.padEnd(9, '0').slice(2, 8)` on `Math.random().toString(36)` to guarantee exactly 6 chars.
37. **Room capacity race** — the DB trigger `enforce_room_capacity` is the authoritative guard; handle `P0001` / `'room_full'` error in `CreateCard.jsx handleSubmit`.
38. **Accessibility** — all interactive components must have `aria-label`. Energy filter buttons use `aria-pressed` and `role="group"`. Connected status indicator always shows a text label alongside the color dot.
39. **Re-shoot updates icebreaker** — upsert with `ignoreDuplicates: false` so switching personality and re-shooting overwrites the saved icebreaker.
40. **MatchModal word-by-word replay** — card_b receives the full text from DB. Animate it word-by-word (60ms/word) on mount so both sides feel the same streaming reveal.
41. **HNSW index** — use `USING hnsw` not `ivfflat`. HNSW requires no warmup centroids — works correctly at 10 rows or 10,000.
