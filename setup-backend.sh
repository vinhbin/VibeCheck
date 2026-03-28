#!/usr/bin/env bash
set -e

echo "==> Creating Python virtual environment..."
python3 -m venv .venv

echo "==> Installing dependencies into .venv..."
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt

if [ ! -f server.env ]; then
  cp server.env.example server.env
  echo "==> Created server.env — fill in GEMINI_API_KEY and ALLOWED_ORIGIN"
else
  echo "==> server.env already exists, skipping"
fi

echo ""
echo "    Activate: source .venv/bin/activate"
echo "    Start:    uvicorn server:app --port 3001 --reload"
