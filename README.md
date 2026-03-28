🚀 VibeCheck

Real-time hackathon networking, reimagined.
Drop a vibe. Get matched. Let AI break the ice.

VibeCheck helps builders find the right people fast—whether that’s a teammate, mentor, or future co-founder—by matching complementary needs and generating personalized icebreakers.

✨ Overview

At fast-paced events like hackathons, meaningful connections are rare and time is limited.

VibeCheck solves that by:

Matching people based on what they need and offer
Removing awkward intros with AI-generated openers
Turning networking into a fast, intentional, and even fun experience
🔥 Core Features
1. Join the Room
Create or enter an event using a 6-character code or QR scan
Instantly connect to a live networking pool
2. Drop Your Vibe Card
Share:
What you’re building
What you need
What you offer
Your card becomes your “signal” in the room
3. Smart Matching
Powered by pgvector semantic search
Ranks people based on complementary intent, not just similarity
4. Shoot Your Shot
Pick a vibe:
🔥 Hype
😈 Roast
🧠 Philosopher
💼 Investor
AI generates a personalized icebreaker message
5. Connect or Pass
Review before sending
Accept or decline incoming matches
Export connections (vCard / CSV)
🧠 Tech Stack
Layer	Tech
Frontend	React 18, Vite, React Router v6, Tailwind CSS, Framer Motion
Backend / DB	Supabase (Postgres, pgvector, Realtime)
AI — Icebreakers	Gemini 2.5 Flash (streamed via proxy)
AI — Embeddings	Gemini Embedding 001 (768-dim vectors)
QR Codes	qrcode.react
Hosting	Vercel (frontend), Railway (proxy)
⚡ Quick Start
Prerequisites
Node.js 18+
(Optional) Python 3.11+ for FastAPI proxy
1. Install Dependencies
npm install
2. Environment Setup

Create a .env file:

VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_PROXY_URL=http://localhost:3001

Create server.env:

GEMINI_API_KEY=<your-gemini-key>
ALLOWED_ORIGIN=http://localhost:5173
PORT=3001
3. Run the App

Frontend

npm run dev

Proxy Server

npm run proxy

App runs at:
👉 http://localhost:5173

🗄️ Supabase Setup
Create a project on Supabase
Run supabase/functions.sql in the SQL Editor
Enable Realtime on:
vibe_cards
matches
📁 Project Structure
src/
  pages/
    Home.jsx
    CreateCard.jsx
    Room.jsx
    Matches.jsx
  components/
    VibeCard.jsx
    VibeCardForm.jsx
    ShootYourShot.jsx
    MatchFeed.jsx
    SuggestedFeed.jsx
    EnergyFilter.jsx
    RoomQR.jsx
    CardSkeleton.jsx
    ErrorBoundary.jsx
  api/
    gemini.js
    embed.js
  hooks/
    useRoom.js
    useMatches.js
    useSuggested.js
  lib/
    supabase.js
    storage.js

server.js        # Express proxy
server.py        # FastAPI alternative
supabase/
  functions.sql
🛠️ Scripts
Command	Description
npm run dev	Start frontend
npm run proxy	Start backend proxy
npm run proxy:dev	Proxy with hot reload
npm run build	Production build
npm run preview	Preview build
👥 Team

Built by a team of 4 during a hackathon, with parallel feature development:

feat/home-ui — Event entry + onboarding
feat/card-form — Card creation & editing
feat/room-ui — Live room + matching
feat/matches-ui — Connections + exports
📌 Why It Stands Out
Intent-based matching > random networking
AI removes friction from first contact
Real-time + lightweight = perfect for hackathons
Built with production-grade tools (Supabase, vector search, streaming AI)
📄 License

MIT
