/**
 * VibeCheck — Express proxy
 * Keeps GEMINI_API_KEY server-side. Exposes /icebreaker (SSE) and /embed.
 *
 * Run:     npm run proxy
 * Dev:     npm run proxy:dev
 */

import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { GoogleGenAI } from '@google/genai'

// ---------------------------------------------------------------------------
// Startup validation — fail fast if required env vars are missing
// ---------------------------------------------------------------------------

const REQUIRED_ENV = ['GEMINI_API_KEY']
const missing = REQUIRED_ENV.filter(k => !process.env[k])
if (missing.length) {
  console.error(`[startup] Missing required env vars: ${missing.join(', ')}`)
  process.exit(1)
}

const app  = express()
const PORT = process.env.PORT ?? 3001
const ai   = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Fix #7: must be set before rate limiter so Railway's reverse proxy forwards
// the real client IP via X-Forwarded-For instead of the internal proxy IP
app.set('trust proxy', 1)

const rawOrigins = (process.env.ALLOWED_ORIGIN ?? 'http://localhost:5174').split(',').map(s => s.trim())
app.use(cors({ origin: rawOrigins }))
app.use(express.json({ limit: '16kb' }))

// Fix #3: per-route rate limiters with realistic hackathon ceilings
// Global 10/min on shared WiFi would exhaust instantly for the whole room
const icebreakerLimiter = rateLimit({ windowMs: 60_000, max: 60,  standardHeaders: true, legacyHeaders: false })
const embedLimiter      = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false })

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// ---------------------------------------------------------------------------
// AI personalities
// ---------------------------------------------------------------------------

const PERSONALITIES = {
  hype:        'You are an overly enthusiastic hype person. Use energy and exclamation points. Make them feel like the most exciting collab of the century.',
  roast:       'You are a playful roast master. Lightly tease both people about their projects in a way that makes them laugh and want to connect.',
  philosopher: 'You are a late-night philosopher. Find the deeper meaning behind both projects and connect them with one profound, slightly absurd insight.',
  investor:    'You are a 1990s infomercial host pitching why these two MUST meet RIGHT NOW. Over the top, specific to their actual projects.',
  default:     'You are a witty icebreaker generator for hackathon networking events. Be specific, human, and a little playful. Never be corporate.',
}

const VALID_PERSONALITIES = new Set(Object.keys(PERSONALITIES))
const OUTPUT_RULE = ' Write exactly 2 short sentences. Reference both people\'s actual projects. Max 150 tokens.'

function getSystemInstruction(personality) {
  // Fix #6: whitelist personality — reject anything not in the known set
  const safe = VALID_PERSONALITIES.has(personality) ? personality : 'default'
  return PERSONALITIES[safe] + OUTPUT_RULE
}

// Fix #4: coerce undefined/null to '' before String() so fields never become
// the literal string "undefined" in the Gemini prompt
const trunc = (s, n = 200) => String(s ?? '').slice(0, n).replace(/[\x00-\x1F\x7F]/g, '')

function buildPrompt(cardA, cardB) {
  return (
    `Person A: ${trunc(cardA.name, 50)}, building "${trunc(cardA.project)}", needs "${trunc(cardA.need)}", offers "${trunc(cardA.offer)}".\n` +
    `Person B: ${trunc(cardB.name, 50)}, building "${trunc(cardB.project)}", needs "${trunc(cardB.need)}", offers "${trunc(cardB.offer)}".\n` +
    `Write a 2-sentence icebreaker for them.`
  )
}

// ---------------------------------------------------------------------------
// POST /icebreaker — SSE streaming
// ---------------------------------------------------------------------------

app.post('/icebreaker', icebreakerLimiter, async (req, res) => {
  const { cardA, cardB, personality } = req.body

  // Fix #4: validate all fields used in the prompt, not just name
  if (!cardA?.name || !cardB?.name || !cardA?.project || !cardB?.project) {
    return res.status(400).json({ error: 'Both cards require name and project' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
    res.write('data: [TIMEOUT]\n\n')
    res.end()
  }, 10_000)

  // If the client navigates away mid-stream, abort immediately instead of
  // streaming until the 10s timeout fires and wasting a Gemini request
  req.on('close', () => {
    controller.abort()
    clearTimeout(timer)
  })

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      config: {
        systemInstruction: getSystemInstruction(personality),
        maxOutputTokens: 150,
        temperature: 0.9,
      },
      contents: buildPrompt(cardA, cardB),
    })

    for await (const chunk of stream) {
      if (controller.signal.aborted) break
      const text = chunk.text
      if (text) res.write(`data: ${JSON.stringify(text)}\n\n`)
    }
    if (!res.writableEnded) res.write('data: [DONE]\n\n')
  } catch (err) {
    console.error('[icebreaker error]', err?.message ?? err)
    if (!res.writableEnded) res.write('data: [ERROR]\n\n')
  } finally {
    clearTimeout(timer)
    if (!res.writableEnded) res.end()
  }
})

// ---------------------------------------------------------------------------
// POST /embed
// ---------------------------------------------------------------------------

app.post('/embed', embedLimiter, async (req, res) => {
  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })

  // Fix #1 & #2: embedContent has no AbortSignal support in the SDK — the old
  // AbortController did nothing. Use a timedOut flag + res.headersSent guards
  // so the timeout and the async result never both try to send a response.
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    if (!res.headersSent) res.status(504).json({ error: 'Embedding timed out' })
  }, 10_000)

  try {
    const result = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: String(text).slice(0, 2000),
    })
    res.json({ embedding: result.embeddings[0].values })
  } catch (err) {
    console.error('[embed error]', err?.message ?? err)
    res.status(500).json({ error: 'Embedding failed' })
  } finally {
    clearTimeout(timer)
  }
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => console.log(`[server] Proxy running on :${PORT}`))