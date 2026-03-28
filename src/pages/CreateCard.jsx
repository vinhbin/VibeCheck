import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { safeStore, safeGet } from '../lib/storage'
import { embedCard } from '../api/embed'
import { VibeCardForm } from '../components/VibeCardForm'

// ---------------------------------------------------------------------------
// PIN gate — shown in edit mode before the form
// ---------------------------------------------------------------------------
function PinGate({ card, onVerified }) {
  const [pin, setPin]     = useState('')
  const [error, setError] = useState(null)

  function verify(e) {
    e.preventDefault()
    if (pin === card.pin) {
      onVerified()
    } else {
      setError('Wrong PIN. Try again.')
      setPin('')
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4 backdrop-blur text-center">
      <p className="text-white font-semibold">Enter your PIN to edit your card</p>
      <form onSubmit={verify} className="space-y-3">
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(null) }}
          placeholder="••••"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center text-white text-lg tracking-widest placeholder-white/20 outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-yellow-400 py-2.5 text-sm font-bold text-black hover:opacity-90"
        >
          Unlock
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CreateCard() {
  const { eventId }  = useParams()
  const location     = useLocation()
  const navigate     = useNavigate()
  const isEditMode   = location.pathname.endsWith('/edit')
  const roomCode     = location.state?.roomCode ?? null

  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState(null)
  const [existingCard, setExistingCard] = useState(null)
  const [loading, setLoading]           = useState(isEditMode)
  const [pinVerified, setPinVerified]   = useState(false)

  // In edit mode, fetch the existing card once
  useEffect(() => {
    if (!isEditMode) return
    const cardId = safeGet('my_card_id')
    if (!cardId) { navigate(`/room/${eventId}`); return }

    supabase
      .from('vibe_cards')
      .select('*')
      .eq('id', cardId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) { navigate(`/room/${eventId}`); return }
        setExistingCard(data)
        setLoading(false)
      })
  }, [isEditMode, eventId, navigate])

  // CREATE
  async function handleCreate(formData) {
    if (submitting) return
    setSubmitting(true)
    try {
      const { data: card, error: err } = await supabase
        .from('vibe_cards')
        .insert({ event_id: eventId, ...formData })
        .select()
        .single()

      if (err) throw err

      safeStore('my_card_id', card.id)
      safeStore('my_event_id', eventId)

      navigate(`/room/${eventId}`)
      embedCard(card) // fire-and-forget
    } catch (err) {
      setSubmitting(false)
      const msg = err?.message ?? ''
      if (msg.includes('room_full') || err?.code === 'P0001') {
        setError('This room is full.')
      } else {
        setError('Failed to create card. Try again.')
      }
    }
  }

  // UPDATE
  async function handleEdit(formData) {
    if (submitting) return
    setSubmitting(true)
    try {
      const { data: card, error: err } = await supabase
        .from('vibe_cards')
        .update(formData)
        .eq('id', existingCard.id)
        .select()
        .single()

      if (err) throw err

      navigate(`/room/${eventId}`)
      embedCard(card)
    } catch {
      setSubmitting(false)
      setError('Failed to save changes. Try again.')
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">
            {isEditMode ? 'Edit your card' : 'Drop your card'}
          </h1>
          <p className="text-sm text-white/40">
            {isEditMode
              ? 'Update your info — your matches will see the new version.'
              : "Tell people what you're building and what you need."}
          </p>
        </div>

        {/* Room code banner — shown to the creator */}
        {roomCode && (
          <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-400/70 font-semibold uppercase tracking-widest">Room code</p>
              <p className="text-2xl font-black tracking-widest text-yellow-400">{roomCode}</p>
            </div>
            <p className="text-xs text-white/40 text-right">Share this so<br/>others can join</p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Body */}
        {isEditMode && loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/40">
            Loading your card…
          </div>
        )}

        {isEditMode && !loading && existingCard && !pinVerified && (
          <PinGate card={existingCard} onVerified={() => setPinVerified(true)} />
        )}

        {(!isEditMode || (existingCard && pinVerified)) && (
          <VibeCardForm
            onSubmit={isEditMode ? handleEdit : handleCreate}
            initial={existingCard ?? {}}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  )
}
