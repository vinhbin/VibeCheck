# VibeCheck — Team Setup Guide

## Prerequisites

Make sure you have these installed before starting:

- **Node.js** v18+ — https://nodejs.org
- **Python** 3.11+ — https://python.org
- **Git** — https://git-scm.com

---

## 1. Clone the repo

```bash
git clone <repo-url>
cd vibecheck
```

---

## 2. Get your credentials

You need two things from whoever owns the project:

| What | Where it goes |
|---|---|
| Supabase URL + anon key | `.env` |
| Gemini API key | `server.env` |

---

## 3. Set up the frontend

```bash
./setup-frontend.sh
```

Then open `.env` and fill in the values:

```
VITE_SUPABASE_URL=        ← paste from Supabase dashboard → Project Settings → API
VITE_SUPABASE_ANON_KEY=   ← paste from same page (anon/public key)
VITE_PROXY_URL=http://localhost:3001   ← leave as-is for local dev
```

---

## 4. Set up the backend

```bash
./setup-backend.sh
```

Then open `server.env` and fill in the values:

```
GEMINI_API_KEY=     ← get this from the team lead (or make your own at aistudio.google.com)
ALLOWED_ORIGIN=http://localhost:5173   ← leave as-is for local dev
PORT=3001                              ← leave as-is
```

---

## 5. Run it

Open **two terminals**:

**Terminal 1 — Frontend**
```bash
npm run dev
```

**Terminal 2 — Backend**
```bash
source .venv/bin/activate
uvicorn server:app --port 3001 --reload
```

App is at **http://localhost:5173**

---

## Supabase setup (first time only, team lead does this once)

1. Create a project at https://supabase.com
2. Go to **SQL Editor** and run everything in `supabase/functions.sql`
3. Go to **Database → Replication** and enable Realtime on `vibe_cards` and `matches`

---

## Common issues

**`VITE_SUPABASE_URL` not working**
Make sure you copied the URL from Project Settings → API, not the dashboard URL.

**Backend says `GEMINI_API_KEY` missing**
`server.env` wasn't filled in — the key must be set before starting uvicorn.

**Port 3001 already in use**
Something else is on that port. Kill it: `lsof -ti:3001 | xargs kill`

**`.venv` not found**
Run `./setup-backend.sh` first.
