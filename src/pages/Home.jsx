import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { safeStore, safeGet } from '../lib/storage'

// ---------------------------------------------------------------------------
// Helpers (exported so CreateCard can reuse joinEvent)
// ---------------------------------------------------------------------------

function generateRoomCode() {
  return Math.random().toString(36).padEnd(9, '0').slice(2, 8).toUpperCase()
}

export async function createEvent(name) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateRoomCode()
    const { data, error } = await supabase
      .from('events')
      .insert({ name, code })
      .select()
      .single()
    if (!error) return data
    if (error.code !== '23505') throw error
  }
  throw new Error('Failed to generate unique room code after 3 attempts')
}

export async function joinEvent(rawCode, setError, navigate) {
  const code = rawCode.trim().toUpperCase()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('code', code)
    .single()

  if (!event) return setError('Room not found.')
  if (new Date(event.expires_at) < new Date()) return setError('This event has ended.')

  // If user already has a card for this room, send them straight there
  const storedEventId = safeGet('my_event_id')
  const storedCardId  = safeGet('my_card_id')
  if (storedEventId === event.id && storedCardId) {
    return navigate(`/room/${event.id}`)
  }

  const { count } = await supabase
    .from('vibe_cards')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)

  if (count >= event.max_cards) return setError('This room is full.')

  navigate(`/create/${event.id}`)
}

async function reclaimCard(code, pin, setError, navigate) {
  const normalCode = code.trim().toUpperCase()

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('code', normalCode)
    .single()

  if (!event) return setError('Room not found.')

  const { data: card } = await supabase
    .from('vibe_cards')
    .select('id')
    .eq('event_id', event.id)
    .eq('pin', pin)
    .maybeSingle()

  if (!card) return setError('No card found with that PIN.')

  safeStore('my_card_id', card.id)
  safeStore('my_event_id', event.id)
  navigate(`/room/${event.id}`)
}

// ---------------------------------------------------------------------------
// Shared input style
// ---------------------------------------------------------------------------
const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/30 focus:bg-white/10 transition-colors'

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------
export default function Home() {
  const { code: urlCode } = useParams()
  const [searchParams]    = useSearchParams()
  const navigate          = useNavigate()
  const [tab, setTab]     = useState(searchParams.get('tab') || 'join')
  const [error, setError] = useState(null)
  const [busy, setBusy]   = useState(false)

  // Join state
  const [joinCode, setJoinCode] = useState(urlCode ?? '')

  // Create state
  const [eventName, setEventName] = useState('')

  // Reclaim state
  const [reclaimCode, setReclaimCode] = useState('')
  const [reclaimPin,  setReclaimPin]  = useState('')

  // Auto-submit on /join/:code deep-link
  useEffect(() => {
    if (!urlCode) return
    setBusy(true)
    joinEvent(urlCode, setError, navigate).finally(() => setBusy(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function clearError() { setError(null) }

  async function handleJoin(e) {
    e.preventDefault()
    if (!joinCode.trim()) return setError('Enter a room code.')
    clearError()
    setBusy(true)
    await joinEvent(joinCode, setError, navigate)
    setBusy(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!eventName.trim()) return setError('Give your event a name.')
    clearError()
    setBusy(true)
    try {
      const event = await createEvent(eventName.trim())
      navigate(`/create/${event.id}`, { state: { roomCode: event.code } })
    } catch {
      setError('Failed to create room. Try again.')
      setBusy(false)
    }
  }

  async function handleReclaim(e) {
    e.preventDefault()
    if (!reclaimCode.trim() || !reclaimPin.trim()) return setError('Fill in both fields.')
    clearError()
    setBusy(true)
    await reclaimCard(reclaimCode, reclaimPin, setError, navigate)
    setBusy(false)
  }

  const TABS = [
    { id: 'join',    label: 'Join room' },
    { id: 'create',  label: 'Create room' },
    { id: 'reclaim', label: 'Reclaim card' },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center space-y-1">
          <h1 className="text-4xl font-black text-white tracking-tight">VibeCheck ⚡</h1>
          <p className="text-sm text-white/40">Drop your card. Find your people.</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur">

          {/* Tab bar */}
          <div className="flex border-b border-white/10">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); clearError() }}
                className={[
                  'flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition-colors',
                  tab === t.id
                    ? 'text-yellow-400 border-b-2 border-yellow-400 -mb-px'
                    : 'text-white/30 hover:text-white/60',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Forms */}
          <div className="p-5 space-y-4">

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* JOIN */}
            {tab === 'join' && (
              <form onSubmit={handleJoin} className="space-y-3">
                <input
                  className={inputCls + ' uppercase tracking-widest'}
                  placeholder="ROOM CODE"
                  maxLength={6}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-yellow-400 py-2.5 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? 'Joining…' : 'Join Room →'}
                </button>
              </form>
            )}

            {/* CREATE */}
            {tab === 'create' && (
              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  className={inputCls}
                  placeholder="Event name (e.g. HackMTL 2026)"
                  maxLength={80}
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-yellow-400 py-2.5 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? 'Creating…' : 'Create Room →'}
                </button>
              </form>
            )}

            {/* RECLAIM */}
            {tab === 'reclaim' && (
              <form onSubmit={handleReclaim} className="space-y-3">
                <input
                  className={inputCls + ' uppercase tracking-widest'}
                  placeholder="ROOM CODE"
                  maxLength={6}
                  value={reclaimCode}
                  onChange={e => setReclaimCode(e.target.value.toUpperCase())}
                  autoFocus
                />
                <input
                  className={inputCls + ' tracking-widest'}
                  type="password"
                  inputMode="numeric"
                  placeholder="Your 4-digit PIN"
                  maxLength={4}
                  value={reclaimPin}
                  onChange={e => setReclaimPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
                <p className="text-xs text-white/25">
                  Use this if you switched browsers or cleared your session.
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-yellow-400 py-2.5 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? 'Looking up…' : 'Reclaim My Card →'}
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
