"""
VibeCheck — Express proxy equivalent in Python (FastAPI + uvicorn)
Mirrors server.js: /icebreaker (SSE stream) and /embed endpoints.

Run:
  source .venv/bin/activate
  uvicorn server:app --port 3001 --reload
"""

import asyncio
import json
import os
import re
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from google import genai
from google.genai import types
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

load_dotenv("server.env")

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "http://localhost:5173")
PORT = int(os.getenv("PORT", "3001"))

client = genai.Client(api_key=GEMINI_API_KEY)

# ---------------------------------------------------------------------------
# App + middleware
# ---------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address, default_limits=["10/minute"])

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

# ---------------------------------------------------------------------------
# AI personalities (mirrors server.js PERSONALITIES)
# ---------------------------------------------------------------------------

PERSONALITIES = {
    "hype": "You are an overly enthusiastic hype person. Use energy and exclamation points. Make them feel like the most exciting collab of the century.",
    "roast": "You are a playful roast master. Lightly tease both people about their projects in a way that makes them laugh and want to connect.",
    "philosopher": "You are a late-night philosopher. Find the deeper meaning behind both projects and connect them with one profound, slightly absurd insight.",
    "investor": "You are a 1990s infomercial host pitching why these two MUST meet RIGHT NOW. Over the top, specific to their actual projects.",
    "default": "You are a witty icebreaker generator for hackathon networking events. Be specific, human, and a little playful. Never be corporate.",
}

OUTPUT_RULE = " Write exactly 2 short sentences. Reference both people's actual projects. Max 150 tokens."


def get_system_instruction(personality: str = "default") -> str:
    return PERSONALITIES.get(personality, PERSONALITIES["default"]) + OUTPUT_RULE


# Truncate + strip control chars (preserve emoji) — prevents prompt injection
def trunc(s: str, n: int = 200) -> str:
    return re.sub(r"[\x00-\x1f\x7f]", "", str(s)[:n])


def build_prompt(card_a: dict, card_b: dict) -> str:
    return (
        f'Person A: {trunc(card_a.get("name",""), 50)}, building "{trunc(card_a.get("project",""))}", '
        f'needs "{trunc(card_a.get("need",""))}", offers "{trunc(card_a.get("offer",""))}".\n'
        f'Person B: {trunc(card_b.get("name",""), 50)}, building "{trunc(card_b.get("project",""))}", '
        f'needs "{trunc(card_b.get("need",""))}", offers "{trunc(card_b.get("offer",""))}".\n'
        "Write a 2-sentence icebreaker for them."
    )


# ---------------------------------------------------------------------------
# /icebreaker — SSE streaming endpoint
# ---------------------------------------------------------------------------

async def icebreaker_stream(card_a: dict, card_b: dict, personality: str) -> AsyncGenerator[str, None]:
    prompt = build_prompt(card_a, card_b)
    system = get_system_instruction(personality)

    try:
        async with asyncio.timeout(10):
            async for chunk in await client.aio.models.generate_content_stream(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    max_output_tokens=150,
                    temperature=0.9,
                ),
            ):
                text = chunk.text
                if text:
                    yield f"data: {json.dumps(text)}\n\n"

        yield "data: [DONE]\n\n"
    except TimeoutError:
        yield "data: [TIMEOUT]\n\n"
    except Exception:
        yield "data: [ERROR]\n\n"


@app.post("/icebreaker")
@limiter.limit("10/minute")
async def icebreaker(request: Request):
    # Enforce 16 kb body limit
    body = await request.body()
    if len(body) > 16_384:
        return JSONResponse({"error": "Payload too large"}, status_code=413)

    data = json.loads(body)
    card_a = data.get("cardA", {})
    card_b = data.get("cardB", {})
    personality = data.get("personality", "default")

    if not card_a.get("name") or not card_b.get("name"):
        return JSONResponse({"error": "Both cards required"}, status_code=400)

    return StreamingResponse(
        icebreaker_stream(card_a, card_b, personality),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


# ---------------------------------------------------------------------------
# /embed — embedding endpoint
# ---------------------------------------------------------------------------

@app.post("/embed")
@limiter.limit("10/minute")
async def embed(request: Request):
    body = await request.body()
    if len(body) > 16_384:
        return JSONResponse({"error": "Payload too large"}, status_code=413)

    data = json.loads(body)
    text = data.get("text", "")
    if not text:
        return JSONResponse({"error": "text required"}, status_code=400)

    try:
        async with asyncio.timeout(10):
            result = await client.aio.models.embed_content(
                model="gemini-embedding-exp-03-07",
                contents=str(text)[:2000],
            )
        return JSONResponse({"embedding": result.embeddings[0].values})
    except TimeoutError:
        return JSONResponse({"error": "Embedding timed out"}, status_code=504)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
