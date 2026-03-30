
# VibeCheck — Networking Event Updates Plan

## Phase 1: Quick Wins

### 1.1 Contact Info on Cards
- Add **Instagram handle** field (optional) to vibe card form
- User inputs just their username (e.g. `vinhle`) — no @ or link needed
- Display on card as clickable link → `instagram.com/{handle}`
- Add to match export (vCard/CSV) so connections can follow up
- Keep LinkedIn field as-is

### 1.2 Event Description / Agenda
- Add optional **description** textarea when creating a room
- Displayed on the room join screen so attendees know what the event is about
- Organizers can include agenda, theme, or any context
- DB: add `description TEXT` column to `events` table

### 1.3 "Looking For" Tags
- Predefined tag chips on the vibe card form: `co-founder`, `mentor`, `hiring`, `job seeking`, `collaborator`, `investor`, `friends`, `learning`
- Users select 1-3 tags when creating their card
- Tags displayed on cards in the room feed
- **Room filter**: filter cards by tag (in addition to existing energy filter)
- DB: add `looking_for TEXT[]` column to `vibe_cards` table

### 1.4 Toggle-able Extras (Organizer-Configured)
- When creating an event, organizers can toggle optional card fields on/off:
  - **Favorite song** — text field, adds personality to cards
  - **Looking for tags** — the tag chips from 1.3
  - **Custom prompt** — organizer-defined extra question (e.g. "What's your hot take?")
- Store as `extras JSONB` on `events` table (e.g. `{ "favorite_song": true, "looking_for": true, "custom_prompt": "What's your hot take?" }`)
- Card form dynamically renders fields based on event extras config
- Default: looking for tags ON, everything else OFF

---

## Phase 2: Match Experience Upgrades

### 2.1 Mutual Match Indicator
- When both sides have accepted the match, show a **"Mutual match!"** badge/animation
- Room feed: highlight mutual matches with a distinct visual (glow, badge, etc.)
- Matches page: mutual matches sorted to top with a special indicator
- Real-time: trigger a celebratory toast/notification when a pending match becomes mutual

### 2.2 Breakout Prompts
- After a match is mutually accepted, show a **conversation starter** card:
  - AI-generated topic based on both cards' overlap (reuse icebreaker infra)
  - "Go find each other!" nudge
  - Optional countdown timer (e.g. "5 min speed chat") — organizer-configurable
- Displayed in the match modal after both accept

### 2.3 Post-Event Summary Email
- Optional **email field** on the vibe card form (not displayed publicly on cards)
- When the event ends (manually by organizer or auto via scheduled end time):
  - Send a recap email to all participants who provided one
  - Includes: list of mutual matches with names, projects, LinkedIn/Instagram handles
  - Include the AI icebreaker text as a memory jogger
- Email service: Resend or SendGrid (low volume, free tier friendly)

---

## Phase 3: Organizer & Discovery Features

### 3.1 Organizer Dashboard
- Accessible to event creator (stored in localStorage or PIN-gated)
- Stats:
  - Total cards dropped
  - Total shots fired
  - Match rate (accepted / total)
  - Most active time window
  - Tag distribution (what people are looking for)
- Simple bar/donut charts — lightweight, no heavy chart lib needed
- Route: `/dashboard/:eventId`

### 3.2 Scheduled Events
- Organizers set **start time** and **end time** when creating a room
- Before start: room visible but card creation locked ("Event starts in 2h")
- After end: room becomes read-only, triggers post-event summary emails
- Auto-archive: expired events hidden from active listings
- DB: add `starts_at TIMESTAMPTZ` and `ends_at TIMESTAMPTZ` to `events` table

### 3.3 Event Discovery
- Public **Explore** page showing upcoming events in your area
- Organizers opt-in to make their event discoverable (default: private/code-only)
- Fields: event name, description, location (city/venue), date/time, tag/category
- Simple location filter (city dropdown or text search — no maps needed initially)
- DB: add `is_public BOOLEAN DEFAULT false`, `location TEXT`, `category TEXT` to `events`
- Route: `/explore`

---

## Phase 4: Repeat Attendee Profiles

### 4.1 Lightweight Accounts
- Optional sign-up with **email + password** or **Google OAuth** (Supabase Auth)
- Profile stores: name, emoji/photo, Instagram, LinkedIn, default "about me"
- When joining a new event, profile auto-fills the card form — user can tweak per-event
- No account required to use the app (anonymous/PIN flow still works)
- Account holders get: profile persistence, event history, cross-event match list

### 4.2 Event History
- Logged-in users see a **"My Events"** page with past events they've attended
- Each event shows: matches made, mutual connections, cards dropped
- Can re-export matches from past events
- Route: `/my-events`

---

---

## Known Issues & Clarifications

### Schema Corrections
- **§1.1**: Plan says "Keep LinkedIn field as-is" but no `linkedin` column exists on `vibe_cards` and no LinkedIn input exists in the form. LinkedIn needs to be added as a new field alongside Instagram.
- **§1.1**: Match export uses card snapshots (JSONB). New fields (LinkedIn, Instagram) must be included in the snapshot shape at match creation time, not just added to the form.

### Timestamp Conflict (§1.2 / §3.2)
- `events` table already has `expires_at TIMESTAMPTZ` (default `NOW() + 24h`). Adding `starts_at` and `ends_at` in Phase 3 creates overlap. Decide:
  - **Option A**: Repurpose `expires_at` → `ends_at`, add `starts_at` only.
  - **Option B**: Keep `expires_at` as a cleanup/TTL timer separate from `ends_at` (event end ≠ row expiry).
  - Whichever is chosen, migration must handle existing rows that only have `expires_at`.

### Match System (§2.1)
- DB already has `initiator_card`, `status` enum (`pending`/`accepted`/`declined`), and snapshot JSONB. Mutual match detection = both sides accepted. This is primarily a **UI task** (badge, sort, toast), not new infra.

### Icebreaker Reuse (§2.2)
- Current icebreaker is generated at "Shoot Your Shot" time via SSE streaming from Gemini, stored on the `matches` row. Breakout prompts after mutual acceptance would need a **second generation pass**, not a reuse of the existing icebreaker. Plan should account for the extra API call.

### Email Privacy (§2.3)
- Card snapshots in matches are full JSONB dumps of card data. If `email` is added to `vibe_cards`, it will leak into snapshots unless explicitly excluded at match creation time. Snapshot logic must be updated to omit email.

### Extras Timing (§1.4)
- Plan doesn't address: what happens when an organizer changes extras config **after** cards have been submitted? Cards with now-disabled fields should still display their data, but the form should stop showing the field for new cards.

### Dashboard Auth (§3.1)
- Plan says "stored in localStorage or PIN-gated" — PINs are per-card, not per-event. Since the event creator is the person who clicks "Create room", track creator identity via localStorage card ID instead. Consider storing `creator_card_id` on the `events` table.

### Discovery & Capacity (§3.3)
- Current `max_cards` default is 200. If events become publicly discoverable, this cap could be hit quickly. Plan should address whether organizers can configure capacity or if the limit should auto-scale.

### Account Migration (§4.1)
- Current identity is PIN + localStorage. Adding Supabase Auth requires a **linking strategy**: how do existing anonymous cards get associated with a new account? Plan hand-waves with "anonymous flow still works" but doesn't address the migration path for returning users who want to claim past cards.

### Column Type Note (§1.3)
- `TEXT[]` for `looking_for` works but the codebase already uses JSONB elsewhere (match snapshots). Consider JSONB for consistency and easier client-side querying. Either works — just be intentional.

### Missing Columns for Organizer Extras (§1.4) ✅ RESOLVED
- ~~`favorite_song` and `custom_prompt_response` columns were never added to `vibe_cards` in the Phase 1 migration.~~
- Fixed in `supabase/migrations/002_phase1_addons.sql`. Submit payload in `VibeCardForm.jsx` now includes both fields.
- **Note:** `favorite_song` and `custom_prompt_response` are **display and personality only** — no effect on matching, embeddings, or ranking.

### Roles Field — Missing Complement to `looking_for` (§1.3) ✅ RESOLVED
- ~~`looking_for` captures demand but there was no supply signal.~~
- Fixed in `supabase/migrations/002_phase1_addons.sql` (`roles JSONB DEFAULT '[]'`).
- `embed.js` now appends `" I am: ..."` to offer text → `offer_embedding` encodes what you bring
- `useSuggested` scores three cross-signals: `looking_for ↔ looking_for`, `my looking_for ↔ their roles`, `my roles ↔ their looking_for`
- `VibeCardForm.jsx` shows "I am..." chips (green, same tag list, max 3, always visible)
- `VibeCard.jsx` displays roles chips in green, distinct from looking_for (blue/primary)

### How Matching Uses the Fields (Reference)
- **`need` + `looking_for` tags** → combined into `need_embedding` (your search query vector)
- **`offer` + `roles` tags** *(roles pending)* → combined into `offer_embedding` (what gets indexed and searched against)
- The `match_cards` RPC compares your `need_embedding` against all other cards' `offer_embedding` via cosine similarity (HNSW index)
- `favorite_song`, `custom_prompt_response` → display only, no embedding, no ranking effect

---

## 4-Person Task Split

> All phases. Each person owns their domain end-to-end.
> **Critical path:** P1 migrations → P2 hooks → P3/P4 wire UI (per phase).

### File Ownership Rules

Each file has **one owner**. If another person needs a change in a file they don't own, they open a ticket for the owner — no cross-editing.

| Owner | Files |
|---|---|
| P1 | `supabase/functions.sql`, `server.js`, migration scripts |
| P2 | `src/hooks/*`, `src/api/*`, `src/lib/*` |
| P3 | `src/pages/Home.jsx`, `src/pages/CreateCard.jsx`, `src/components/VibeCardForm.jsx`, `src/App.jsx`, new pages: `Dashboard.jsx`, `Explore.jsx`, `Auth.jsx`, `MyEvents.jsx` |
| P4 | `src/pages/Room.jsx`, `src/pages/Matches.jsx`, `src/components/VibeCard.jsx`, `src/components/MatchModal.jsx`, `src/components/ShootYourShot.jsx`, `src/components/EnergyFilter.jsx`, `src/components/RoomQR.jsx`, `src/components/MatchFeed.jsx`, `src/components/SuggestedFeed.jsx` |

---

### P1 — Database & Backend

**Files:** `supabase/functions.sql`, `server.js`, migration scripts

**Phase 1:** ✅ COMPLETED
- ~~Migration: add `linkedin TEXT`, `instagram TEXT` to `vibe_cards`~~
- ~~Migration: add `description TEXT`, `extras JSONB DEFAULT '{"looking_for": true}'` to `events`~~ *(default matches §1.4: looking_for ON by default)*
- ~~Migration: add `looking_for JSONB DEFAULT '[]'` to `vibe_cards`~~
- ~~Added `events_update` RLS policy (needed for P3/organizer updates)~~
- Migration script: `supabase/migrations/001_phase1_fields.sql`

**Phase 2:**
- Migration: add `email TEXT` to `vibe_cards` (private, never in snapshots)
- New proxy endpoint: `POST /breakout` — SSE streaming, same Gemini infra as `/icebreaker` but with a conversation-starter system prompt. Accepts `card_a_snapshot` + `card_b_snapshot` from the match row (not raw card IDs — avoids a DB round-trip)
- Email integration: set up Resend/SendGrid, new `POST /summary-email` endpoint. Called by P3's "End Event" button. Queries all matches with `status = 'accepted'` for the event, builds recap per participant, sends to those with `email` set on their `vibe_cards` row

**Phase 3:**
- Migration: add `starts_at TIMESTAMPTZ`, `ends_at TIMESTAMPTZ`, `creator_card_id UUID`, `is_public BOOLEAN DEFAULT false`, `location TEXT`, `category TEXT` to `events`
- Keep `expires_at` as TTL for row cleanup (auto-delete stale data). `ends_at` is the event schedule boundary (read-only mode, trigger emails). They serve different purposes — document this in the migration comment
- New RPC function: `get_event_stats(p_event_id UUID)` — returns card count, match count, accepted count, tag distribution, most active hour
- New RPC function: `get_public_events(p_location TEXT, p_category TEXT)` — returns upcoming public events filtered by location/category

**Phase 4:**
- Enable Supabase Auth (email + Google OAuth)
- Migration: add `user_id UUID REFERENCES auth.users(id)` to `vibe_cards`
- RLS policies: users can read all cards in their event, but only update their own (via `user_id` match). Anonymous users (no `user_id`) must still work — RLS must allow inserts/reads where `user_id IS NULL`
- New proxy endpoint: `POST /claim-cards` — after sign-up, user provides PINs to claim anonymous cards, sets `user_id` on matching rows

---

### P2 — Data Layer & Hooks

**Files:** `src/hooks/`, `src/api/`, `src/lib/`

**Phase 1:** ✅ COMPLETED
- ✅ Update `useRoom.js` — include `linkedin`, `instagram`, `looking_for` in card fetches (these columns come from P1's migration)
- ✅ New hook: `useEventExtras(eventId)` — fetches event `extras` JSONB, returns which optional fields are enabled, re-fetches on Realtime UPDATE to `events`. Consumed by P3's `VibeCardForm.jsx` and P4's `VibeCard.jsx`
- ✅ Update `useSuggested.js` — factor `looking_for` overlap into suggestion ranking (boost cards with matching tags)
- ✅ Update `embed.js` — include `looking_for` tags in the text sent for embedding so semantic matching accounts for intent

**Phase 2:**
- Simplify mutual match detection: a match with `status = 'accepted'` already means mutual (initiator shot → target accepted). No complex bidirectional check needed — just filter `status === 'accepted'`
- Update `useMatches.js` — detect when a match transitions from `pending` to `accepted` via Realtime UPDATE, fire `onMutual` callback for P4's toast/animation. Expose a `mutualMatches` array (filtered from all matches) for P4 to sort/display
- New API client: `streamBreakout(cardASnapshot, cardBSnapshot, onChunk, signal)` — SSE client for the `/breakout` endpoint, same pattern as `streamIcebreaker`. Takes snapshots not card IDs (matches P1's endpoint contract)

**Phase 3:**
- New hook: `useEventSchedule(eventId)` — returns `{ isBeforeStart, isAfterEnd, startsIn, endsIn }` computed from `starts_at`/`ends_at`, re-computes on 1s interval. Consumed by P4's `Room.jsx` and P3's `CreateCard.jsx`
- New hook: `useDashboardStats(eventId)` — calls `get_event_stats` RPC (from P1), returns formatted stats object. Consumed by P3's `Dashboard.jsx`
- New hook: `usePublicEvents(filters)` — calls `get_public_events` RPC with location/category filters, paginated. Consumed by P3's `Explore.jsx`

**Phase 4:**
- New `src/lib/auth.js` — Supabase Auth wrapper: `signUp`, `signIn`, `signInWithGoogle`, `signOut`, `getUser`, `onAuthStateChange`
- New hook: `useAuth()` — context provider wrapping auth state, exposes `user`, `loading`, `signIn`, `signOut`
- New hook: `useMyEvents(userId)` — fetches all events where user has a card (`vibe_cards.user_id = userId`), includes match counts per event
- Update `storage.js` — when user is authenticated, prefer `user_id` lookup over localStorage `my_card_id`

---

### P3 — Home Flow, Card Creation & Organizer Tools

**Files:** `src/pages/Home.jsx`, `src/pages/CreateCard.jsx`, `src/components/VibeCardForm.jsx`, `src/App.jsx`, new pages

**Phase 1:** ✅ COMPLETED
- ✅ Update `VibeCardForm.jsx`:
  - ✅ Add optional `instagram` text input (validate: strip `@` prefix if entered, alphanumeric + `.` + `_` only)
  - ✅ Add optional `linkedin` text input (accept username or full URL, normalize to username)
  - ✅ Add `looking_for` tag chips — multi-select, max 3, from predefined list: `co-founder`, `mentor`, `hiring`, `job seeking`, `collaborator`, `investor`, `friends`, `learning`
  - ✅ Conditionally render fields based on `useEventExtras` (from P2) — only show `looking_for` / `favorite_song` / custom prompt if event config enables them
  - **Blocked by:** P1 migration (columns must exist), P2 `useEventExtras` hook
- ✅ Update `Home.jsx` — create event flow:
  - ✅ Add optional `description` textarea (max 500 chars)
  - ✅ Add extras toggle panel: checkboxes for `favorite_song`, `looking_for` (default ON), `custom_prompt` (with text input for the prompt question)
  - ✅ Pass `description` + `extras` JSONB to event INSERT
- ✅ Update `CreateCard.jsx` — display event description on card creation screen so attendees see context before filling out their card

**Phase 2:**
- Add optional `email` input to `VibeCardForm.jsx` — small helper text: "Private — only used for post-event recap"
- No other P3 work in Phase 2 (match UI is P4's domain)

**Phase 3:**
- New page: `src/pages/Dashboard.jsx` — route `/dashboard/:eventId`
  - Gate access: check `localStorage('my_card_id')` matches `events.creator_card_id` (set by the flow below)
  - Display stats from `useDashboardStats` (P2 hook): card count, match rate, tag distribution bar chart, activity timeline
  - Lightweight charts — CSS-only bar charts or a tiny lib like `chart.css`
  - "End Event" button: sets `ends_at = NOW()` on the event row, then calls P1's `POST /summary-email` endpoint with the `eventId`
- Update `Home.jsx` — create event flow:
  - After event INSERT, store `creator_event_id` in localStorage. After the creator's card is created in `CreateCard.jsx`, UPDATE `events.creator_card_id` to the new card ID. *(Solves chicken-and-egg: event is created before the card exists, so `creator_card_id` is set in a follow-up UPDATE, not at INSERT time)*
  - Add `starts_at` / `ends_at` datetime pickers (optional — default behavior unchanged if omitted)
  - Add `is_public` toggle: "List on Explore page" (default OFF)
  - Add `location` text input + `category` dropdown (shown when `is_public` is ON)
- New page: `src/pages/Explore.jsx` — route `/explore`
  - List upcoming public events with name, description, location, date, category
  - City text filter + category dropdown
  - "Join" button → navigates to `/join/:code`
  - Uses `usePublicEvents` (P2 hook)
- Update `App.jsx` — add routes: `/explore`, `/dashboard/:eventId`

**Phase 4:**
- New page: `src/pages/Auth.jsx` — sign-up / sign-in form (email + Google OAuth button). After sign-up, prompt user to claim past cards via PIN entry → calls P1's `POST /claim-cards`
- New page: `src/pages/MyEvents.jsx` — route `/my-events`
  - List past events with match stats, uses `useMyEvents` (P2 hook)
  - Re-export matches from any past event
- Update `Home.jsx` — show user avatar + "My Events" link when authenticated
- Update `CreateCard.jsx` — auto-fill form from profile when authenticated, set `user_id` on card INSERT
- Update `App.jsx` — wrap with `AuthProvider` (P2), add routes: `/auth`, `/my-events`

---

### P4 — Room Experience, Matching & Real-time UI

**Files:** `src/pages/Room.jsx`, `src/pages/Matches.jsx`, `src/components/VibeCard.jsx`, `src/components/MatchModal.jsx`, `src/components/ShootYourShot.jsx`, `src/components/EnergyFilter.jsx`, `src/components/RoomQR.jsx`, `src/components/MatchFeed.jsx`, `src/components/SuggestedFeed.jsx`

**Phase 1:** ✅ COMPLETED
- ✅ Update `ShootYourShot.jsx` — no structural change needed; snapshots are full card objects, new columns flow through automatically
- ✅ Update `Matches.jsx` — `exportVCard` adds LinkedIn + Instagram `URL:` lines; `exportCSV` adds LinkedIn/Instagram URL columns; fixed MatchCard LinkedIn href for normalized usernames
- ✅ Update `VibeCard.jsx`:
  - ✅ Display `looking_for` tags as colored chips below the card content
  - ✅ Display `instagram` as clickable link → `instagram.com/{handle}` (only if present)
  - ✅ Display `linkedin` as clickable link → `linkedin.com/in/{handle}` (only if present)
  - ✅ Display `favorite_song` and custom prompt response if present (read event extras via `extras` prop from Room)
- ✅ Update `Room.jsx`:
  - ✅ New tag filter chips alongside existing energy filter — filter cards by `looking_for` tag
  - ✅ Display event `description` as a banner in main content area
  - ✅ Pass event `extras` config to `VibeCard` via `MatchFeed`/`SuggestedFeed`
  - ✅ Pass full `cards` array to `useSuggested` for tag-boost re-ranking
- ✅ Update `EnergyFilter.jsx` — renamed export to `RoomFilters`, added tag filter section; `MatchFeed` and `SuggestedFeed` updated to pass `extras` through to `VibeCard`
- **Blocked by:** P1 migration (columns), P2 `useRoom.js` update (data availability)

**Phase 2:**
- Update `MatchModal.jsx`:
  - After both sides accept (match `status === 'accepted'`) → show "Mutual match!" badge with celebratory animation (confetti, glow, etc.)
  - Below the icebreaker, stream breakout prompt via `streamBreakout(match.card_a_snapshot, match.card_b_snapshot, ...)` (P2 API client)
  - "Go find each other!" nudge text
  - Optional countdown timer if organizer configured one in extras
- Update `ShootYourShot.jsx` — when constructing snapshot for upsert, explicitly strip `email` field from card objects before writing to `card_a_snapshot` / `card_b_snapshot`: `const { email, ...snapshot } = cardObj`
- Update `Matches.jsx`:
  - Sort mutual matches (`status === 'accepted'`) to top with a distinct visual indicator (badge, different card color)
  - Add mutual match count stat at top of page
  - Use `mutualMatches` array from P2's updated `useMatches`
- Update `Room.jsx`:
  - Celebratory toast when `onMutual` fires from P2's `useMatches` hook
  - Subtle glow/badge on cards in the feed that are mutual matches

**Phase 3:**
- Update `Room.jsx`:
  - Use `useEventSchedule` (P2 hook) to get `{ isBeforeStart, isAfterEnd }`
  - If `isBeforeStart`: show countdown overlay, disable card creation, show event description
  - If `isAfterEnd`: show read-only banner, disable Shoot Your Shot, show "Event ended" state
  - If user is event creator (check `localStorage('my_card_id') === event.creator_card_id`): show "Dashboard" link button in room header
- No other P4 work in Phase 3 (Dashboard + Explore pages are P3's domain)

**Phase 4:**
- Update `VibeCard.jsx` — show profile photo (from account) instead of emoji when available, fall back to emoji for anonymous users
- Update `Matches.jsx` — cross-event match list for authenticated users (query all events, not just current), uses `useMyEvents` (P2 hook) for event list
- Update `Room.jsx` — "Sign up to save your connections" CTA for anonymous users after their first match

---

### Integration Handoff Contracts

These are the cross-person interfaces that must be agreed on before implementation starts.

| From | To | Contract | Phase |
|---|---|---|---|
| P1 | P2 | New columns on `vibe_cards`: `linkedin`, `instagram`, `looking_for` — P2 must update `useRoom.js` SELECT to include them | 1 |
| P1 | P3 | New columns on `events`: `description`, `extras` — P3 must pass them in INSERT from `Home.jsx` | 1 |
| P2 | P3 | `useEventExtras(eventId)` returns `{ looking_for: bool, favorite_song: bool, custom_prompt: string\|null }` — P3 uses this to conditionally render form fields | 1 |
| P2 | P4 | `useRoom.js` card objects now include `linkedin`, `instagram`, `looking_for` — P4 reads these in `VibeCard.jsx` | 1 |
| P1 | P2 | `POST /breakout` accepts `{ card_a_snapshot, card_b_snapshot }`, returns SSE stream — P2 builds `streamBreakout` client against this | 2 |
| P2 | P4 | `useMatches` exposes `onMutual(match)` callback + `mutualMatches` array — P4 wires toast and sort | 2 |
| P4 | P4 | `ShootYourShot.jsx` snapshot must strip `email`: `const { email, ...snap } = card` before upsert | 2 |
| P1 | P3 | `POST /summary-email` accepts `{ eventId }`, sends emails server-side — P3 calls this from Dashboard "End Event" button | 3 |
| P3 | P3 | `creator_card_id` set via UPDATE after card creation (not at event INSERT) — `CreateCard.jsx` checks `localStorage('creator_event_id')` and updates `events.creator_card_id` | 3 |
| P2 | P4 | `useEventSchedule(eventId)` returns `{ isBeforeStart, isAfterEnd, startsIn, endsIn }` — P4 uses in Room.jsx | 3 |
| P2 | P3 | `useAuth()` context provider, `useMyEvents()` hook — P3 builds Auth + MyEvents pages against these | 4 |
| P1 | P3 | `POST /claim-cards` accepts `{ userId, cards: [{ cardId, pin }] }` — P3 calls from Auth page post-signup flow | 4 |

---

## Priority Order
1. **Phase 1** — low effort, immediately makes the app better for any event
2. **Phase 2** — improves the core match experience, keeps people engaged
3. **Phase 3** — unlocks organizer value and event discovery (growth lever)
4. **Phase 4** — retention play, makes sense once there's recurring usage
