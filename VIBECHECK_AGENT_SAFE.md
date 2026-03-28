# VibeCheck — Agent Brief SAFE (Fallback)

> **When to use this brief:** If the main v2 implementation hits a hard blocker (Gemini API down, pgvector broken, Railway unreachable, streaming not working) — drop to this brief. It uses simpler tech with zero external AI calls and no vector DB. Core networking flow still works.

**Hackathon track:** STARTUP
**Vibe:** Fun but functional
**Time budget:** 4–5 hours from scratch (simpler stack, less surface area)

---

## What's Dropped vs V2

| V2 Feature | Safe Fallback |
|---|---|
| Streaming SSE icebreaker | Static icebreaker — pre-written pool, randomly picked |
| Gemini API (icebreaker + embed) | No AI calls at all |
| pgvector + suggested feed | No embeddings, no "Suggested for you" |
| Express proxy server | No backend — direct Supabase only |
| Railway deploy | No proxy = nothing to deploy server-side |
| `failed_embeds` retry table | Not needed |
| Energy filter | Still included (pure client filter) |
| BroadcastChannel dedup | Still included |

**Everything else stays:** Realtime feed, Vibe Cards, QR codes, Shoot Your Shot, match notifications, vCard + CSV export, mobile-first layout, error boundary, localStorage wrappers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, React Router v6, Tailwind CSS, Framer Motion |
| Backend / DB | Supabase (Postgres + Realtime only — no pgvector needed) |
| Icebreakers | Static pool of 30 pre-written icebreakers, randomly selected |
| QR codes | `qrcode.react` — client-side |
| Hosting | Vercel only — no proxy, no Railway |

---

## Repo Structure

```
vibecheck/
├── src/
│   ├── api/
│   │   └── icebreaker.js         # Static pool picker (no fetch, no API)
│   ├── components/
│   │   ├── VibeCard.jsx
│   │   ├── VibeCardForm.jsx
│   │   ├── MatchFeed.jsx
│   │   ├── MatchModal.jsx
│   │   ├── ShootYourShot.jsx
│   │   ├── RoomQR.jsx
│   │   ├── EnergyFilter.jsx
│   │   ├── CardSkeleton.jsx
│   │   └── ErrorBoundary.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── CreateCard.jsx
│   │   ├── Room.jsx
│   │   └── Matches.jsx
│   ├── hooks/
│   │   ├── useRoom.js
│   │   └── useMatches.js
│   ├── lib/
│   │   ├── supabase.js
│   │   └── storage.js
│   └── App.jsx
├── .env
├── vite.config.js
└── package.json
```

**Dev:**
```bash
npm run dev   # Terminal 1 only — no proxy needed
```

---

## Database Schema (No pgvector)

```sql
-- No vector extension needed

CREATE TYPE match_status AS ENUM ('pending');  -- simplified

CREATE TABLE events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  code        TEXT        UNIQUE NOT NULL,
  max_cards   INT         DEFAULT 200,
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vibe_cards (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        REFERENCES events(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  emoji      TEXT        NOT NULL,
  project    TEXT        NOT NULL,
  need       TEXT        NOT NULL CHECK (char_length(need) >= 10),
  offer      TEXT        NOT NULL CHECK (char_length(offer) >= 10),
  energy     INT         DEFAULT 5 CHECK (energy BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vibe_cards_event_id ON vibe_cards(event_id);

CREATE TABLE matches (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Canonical ordering: card_a is always LEAST UUID, card_b is GREATEST
  card_a      UUID        REFERENCES vibe_cards(id) ON DELETE CASCADE,
  card_b      UUID        REFERENCES vibe_cards(id) ON DELETE CASCADE,
  initiator_card UUID,
  card_a_snapshot JSONB,
  card_b_snapshot JSONB,
  icebreaker  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_match  UNIQUE (LEAST(card_a::text, card_b::text), GREATEST(card_a::text, card_b::text)),
  CONSTRAINT no_self_match CHECK  (card_a <> card_b)
);
```

### RLS

```sql
ALTER TABLE events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_read"    ON events      FOR SELECT USING (true);
CREATE POLICY "events_insert"  ON events      FOR INSERT WITH CHECK (true);

CREATE POLICY "cards_read"     ON vibe_cards  FOR SELECT USING (true);
CREATE POLICY "cards_insert"   ON vibe_cards  FOR INSERT WITH CHECK (true);
CREATE POLICY "cards_update"   ON vibe_cards  FOR UPDATE USING (true);

CREATE POLICY "matches_read"   ON matches     FOR SELECT USING (true);
CREATE POLICY "matches_insert" ON matches     FOR INSERT WITH CHECK (true);
CREATE POLICY "matches_update" ON matches     FOR UPDATE USING (true);
```

Enable **Realtime** on `vibe_cards` and `matches`.

---

## Static Icebreaker Pool

```js
// src/api/icebreaker.js — no API, no fetch, instant

const ICEBREAKERS = [
  (a, b) => `${a.name} needs exactly what ${b.name} is building — that's not a coincidence, that's fate.`,
  (a, b) => `${a.name}, your "${a.need}" gap? ${b.name} literally built that. Go find them NOW.`,
  (a, b) => `${b.name}'s "${b.offer}" is the unlock ${a.name} has been missing. This conversation starts tonight.`,
  (a, b) => `${a.name} is building "${a.project}" and ${b.name} is building "${b.project}" — someone needs to draw a Venn diagram, ASAP.`,
  (a, b) => `Hot take: ${a.name} + ${b.name} = the collab nobody saw coming but everyone will copy.`,
  (a, b) => `${a.name} and ${b.name} are solving different pieces of the same puzzle. Meet. Figure it out.`,
  (a, b) => `"${a.offer}" + "${b.offer}" is a product in itself. Someone write a pitch.`,
  (a, b) => `${a.name}'s biggest need is "${a.need}". ${b.name} offers "${b.offer}". This is embarrassingly obvious.`,
  (a, b) => `If ${a.name} and ${b.name} don't talk tonight, they'll regret it at the next hackathon.`,
  (a, b) => `Prediction: ${a.name} and ${b.name} will be co-founders or mortal enemies. Either way, meet now.`,
  (a, b) => `${b.name} is building "${b.project}" — ${a.name}, that's your missing piece. Go.`,
  (a, b) => `The universe aligned ${a.name}'s need for "${a.need}" with ${b.name}'s offer of "${b.offer}". Don't waste it.`,
  (a, b) => `${a.name} + ${b.name} have complementary superpowers. The only question is who brings the whiteboard.`,
  (a, b) => `${b.name} is exactly who ${a.name} was describing when they wrote "${a.need}". This is not a drill.`,
  (a, b) => `${a.name} is trying to "${a.need.slice(0, 50)}" — ${b.name} has been doing that for months. Start talking.`,
  (a, b) => `Two people in this room get each other's vision. They're ${a.name} and ${b.name}. Time to find out.`,
  (a, b) => `${a.name}'s "${a.project}" + ${b.name}'s "${b.project}" = something investors would actually fund.`,
  (a, b) => `Quick math: ${a.name}'s gap × ${b.name}'s skills = momentum. Go introduce yourselves.`,
  (a, b) => `${b.name} has been building "${b.project}" which is suspiciously close to what ${a.name} needs. Suspicious.`,
  (a, b) => `${a.name} and ${b.name} — your projects are speaking to each other. Time for the humans to catch up.`,
  (a, b) => `${a.name} needs "${a.need.slice(0, 60)}" and ${b.name} offers "${b.offer.slice(0, 60)}". Someone do the math.`,
  (a, b) => `${b.name}'s background in "${b.offer.slice(0, 60)}" is the unfair advantage ${a.name} doesn't have yet.`,
  (a, b) => `${a.name} is building "${a.project}" — ${b.name} could cut 3 months off that timeline.`,
  (a, b) => `${b.name}, ${a.name} wrote "${a.need}" and then you walked in. Coincidence? Definitely not.`,
  (a, b) => `${a.name} and ${b.name} are the only two people in this room who would understand each other's reference.`,
  (a, b) => `${a.name}'s "${a.project}" is the product. ${b.name}'s "${b.offer}" is the distribution. Go.`,
  (a, b) => `${b.name} has been in the trenches on "${b.project}". ${a.name}, that's a year of learning available for free.`,
  (a, b) => `${a.name} is exactly the kind of person ${b.name} was hoping to meet tonight. Don't make them wait.`,
  (a, b) => `${a.name} + ${b.name} is a meeting that makes sense on paper and sparks in person. Test that theory.`,
  (a, b) => `${b.name} knows what ${a.name} needs — not because they're psychic, but because they've built it.`,
];

// Personality modes tweak the pool selection (no AI needed)
const PERSONALITY_POOLS = {
  hype:        [0, 2, 4, 8, 9, 11, 20],
  roast:       [9, 18, 22, 24],
  philosopher: [5, 12, 15, 19, 28],
  investor:    [16, 17, 25, 26],
  default:     null, // all
};

export function pickIcebreaker(cardA, cardB, personality = 'default') {
  const pool = PERSONALITY_POOLS[personality] ?? null;
  const candidates = pool ? pool.map(i => ICEBREAKERS[i]) : ICEBREAKERS;
  const fn = candidates[Math.floor(Math.random() * candidates.length)];
  return fn(cardA, cardB);
}
```

---

## ShootYourShot — simplified (no streaming)

```jsx
// ShootYourShot.jsx — synchronous, no AbortController needed
export function ShootYourShot({ myCard, targetCard }) {
  const [personality, setPersonality] = useState('default');
  const [firing, setFiring] = useState(false);
  const [icebreaker, setIcebreaker] = useState('');

  const shoot = async () => {
    if (firing) return;
    setFiring(true);

    const text = pickIcebreaker(myCard, targetCard, personality);
    setIcebreaker(text);

    // Normalize ordering — bidirectional uniqueness
    const [lo, hi] = [myCard.id, targetCard.id].sort();
    const isLo = myCard.id === lo;

    await supabase.from('matches').upsert(
      {
        card_a: lo,
        card_b: hi,
        initiator_card: myCard.id,
        icebreaker: text,
        card_a_snapshot: isLo ? myCard : targetCard,
        card_b_snapshot: isLo ? targetCard : myCard,
      },
      { onConflict: 'card_a,card_b', ignoreDuplicates: false }
    );

    setFiring(false);
  };

  return (/* personality picker UI + shoot button + icebreaker display */);
}
```

---

## MatchModal — recipient's view

```jsx
// MatchModal.jsx — same word-by-word animation, text comes from DB
export function MatchModal({ match, onClose }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!match?.icebreaker) return;
    const words = match.icebreaker.split(' ');
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(words.slice(0, i).join(' '));
      if (i >= words.length) clearInterval(timer);
    }, 60);
    return () => clearInterval(timer);
  }, [match?.icebreaker]);

  if (!match) return null;

  const myCardId = safeGet('my_card_id');
  const theirCard = match.card_a === myCardId ? match.card_b_snapshot : match.card_a_snapshot;

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
            {displayed || <span className="text-white/30">Getting vibe…</span>}
          </p>
        </div>
        <button onClick={onClose}
          className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl">
          Let's go 🎯
        </button>
      </div>
    </div>
  );
}
```

---

## useMatches — bidirectional listener

```js
// src/hooks/useMatches.js — listens on both card_a and card_b
export function useMatches(myCardId, onIncoming) {
  useEffect(() => {
    if (!myCardId) return;

    const bc = new BroadcastChannel('vibecheck_matches');
    const seen = new Set();

    const handleMatch = ({ new: match }) => {
      if (match.initiator_card === myCardId) return; // I shot this
      if (seen.has(match.id)) return;
      seen.add(match.id);
      bc.postMessage({ type: 'match_seen', id: match.id });
      onIncoming(match);
    };

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
  }, [myCardId, onIncoming]);
}
```

---

## Environment Variables

```bash
# .env  (frontend only — no server.env needed)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# No VITE_PROXY_URL — no proxy exists in safe mode
```

---

## Setup Commands

```bash
# 1. Scaffold
npm create vite@latest vibecheck -- --template react
cd vibecheck

# 2. Frontend deps only — no express, no genai
npm install @supabase/supabase-js react-router-dom framer-motion qrcode.react

# 3. Tailwind
npm install -D tailwindcss @tailwindcss/vite

# 4. Scripts in package.json
#   "dev": "vite"

# 5. Create .env, run SQL schema, enable Realtime on vibe_cards + matches
npm run dev
```

---

## Deployment

```bash
# Frontend only → Vercel
vercel deploy
# Env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
# No Railway needed
```

---

## Edge Cases

All V2 edge cases apply. Additionally:

| # | Issue | Fix |
|---|---|---|
| S1 | No AI = no variety in icebreakers | 30-template pool + personality bucketing covers most perceived variety |
| S2 | Template feels generic on re-shoot | `ignoreDuplicates: false` + re-random pick gives a different line each time |
| S3 | Bidirectional duplicate match | Same LEAST/GREATEST canonical ordering as V2 |

---

## Agent Instructions

All V2 agent instructions apply except:

1. **No proxy** — zero Gemini API calls. `VITE_PROXY_URL` does not exist. Never add it.
2. **No embeddings** — no `need_embedding`, no `offer_embedding`, no pgvector, no `match_cards` RPC, no `SuggestedFeed`, no `useSuggested`.
3. **No `failed_embeds` table** — omit entirely.
4. **Icebreaker is sync** — `pickIcebreaker()` is a pure function. No `async`, no `await`, no `AbortController`.
5. **No streaming** — no SSE, no `onChunk`, no `[DONE]` / `[TIMEOUT]` / `[ERROR]` signals.
6. **Bidirectional match ordering** — same as V2: sort IDs, `card_a` = LEAST, `card_b` = GREATEST, `initiator_card` tracks who shot.
7. **MatchModal word-by-word** — same 60ms/word replay animation, text comes from DB row not a stream.
8. **HNSW index** — not needed (no vector column), skip entirely.
9. **One deploy target** — Vercel only.
10. **If the event goes well, upgrade path is clear:** swap `pickIcebreaker` → `streamIcebreaker`, add proxy, add embeddings. Core data model doesn't change.
