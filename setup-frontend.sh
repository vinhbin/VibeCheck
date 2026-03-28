#!/usr/bin/env bash
set -e

echo "==> Installing frontend dependencies..."
npm install

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env — fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_PROXY_URL"
else
  echo "==> .env already exists, skipping"
fi

echo ""
echo "    Start: npm run dev   (Vite :5173)"
