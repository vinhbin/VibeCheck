import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { safeGet } from '../lib/storage'
import { useRoom } from '../hooks/useRoom'
import { useMatches } from '../hooks/useMatches'
import { useSuggested } from '../hooks/useSuggested'
import { MatchFeed } from '../components/MatchFeed'
import { SuggestedFeed } from '../components/SuggestedFeed'
import { MatchModal } from '../components/MatchModal'
import { ShootYourShot } from '../components/ShootYourShot'
import { RoomQR } from '../components/RoomQR'
import { EnergyFilter } from '../components/EnergyFilter'

export default function Room() {
  const { eventId } = useParams()
  const navigate    = useNavigate()
  const myCardId    = safeGet('my_card_id')

  const { cards, loading, connected } = useRoom(eventId)

  const [activeMatch, setActiveMatch] = useState(null)
  const [targetCard,  setTargetCard]  = useState(null)
  const [toast,       setToast]       = useState(null)
  const [showQR,      setShowQR]      = useState(false)
  const [minEnergy,   setMinEnergy]   = useState(1)

  const myCard = cards.find(c => c.id === myCardId) ?? null

  // Incoming match notifications
  useMatches(myCardId, (match) => {
    setActiveMatch(match)
    const senderName = match.card_a_snapshot?.name ?? match.card_b_snapshot?.name ?? 'Someone'
    showToast(`${senderName} wants to connect! 🎯`)
  })

  // AI-suggested cards (pgvector) — refreshes as embeddings come in
  const suggestionIds = useSuggested(myCard, eventId, cards.length)

  // Filtered card list — always show own card at top regardless of energy
  const visibleCards = cards.filter(c => c.id === myCardId || c.energy >= minEnergy)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  async function handleDeleteCard() {
    if (!myCardId) return
    if (!window.confirm('Remove your card from this room?')) return
    await supabase.from('vibe_cards').delete().eq('id', myCardId)
    try { localStorage.removeItem('my_card_id') } catch {}
    navigate('/')
  }

  // Resolve event code + name for QR and header
  const [eventCode, setEventCode] = useState(null)
  const [eventName, setEventName] = useState(null)
  if (!eventCode && myCard) {
    supabase
      .from('events')
      .select('code, name')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        if (data?.code) setEventCode(data.code)
        if (data?.name) setEventName(data.name)
      })
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {/* Logo / title */}
          <div className="flex-1 min-w-0">
            <p className="font-black text-yellow-400 text-lg leading-none tracking-tight">
              VibeCheck{eventName ? ` — ${eventName}` : ''}
            </p>
            <p className="text-white/40 text-xs truncate">
              {cards.length} {cards.length === 1 ? 'person' : 'people'} in the room
            </p>
          </div>

          {/* Connection indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={[
                'w-2 h-2 rounded-full transition-colors',
                connected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse',
              ].join(' ')}
            />
            <span className="text-xs text-white/40">{connected ? 'Live' : 'Connecting…'}</span>
          </div>

          {/* QR toggle */}
          <button
            id="qr-toggle"
            onClick={() => setShowQR(v => !v)}
            className="shrink-0 bg-white/10 hover:bg-white/20 transition rounded-xl px-3 py-1.5 text-xs font-bold"
          >
            {showQR ? 'Hide QR' : '📲 Share'}
          </button>

          {/* Matches link */}
          <button
            id="go-to-matches"
            onClick={() => navigate(`/matches/${eventId}`)}
            className="shrink-0 bg-yellow-400 hover:bg-yellow-300 transition text-black rounded-xl px-3 py-1.5 text-xs font-bold"
          >
            Matches
          </button>
        </div>

        {/* QR panel — slides open */}
        {showQR && eventCode && (
          <div className="max-w-lg mx-auto mt-3">
            <RoomQR code={eventCode} />
          </div>
        )}
      </header>

      {/* ── My card action bar (shown when card is loaded) ── */}
      {myCard && (
        <div className="bg-zinc-900/60 border-b border-white/5 px-4 py-2">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <span className="text-lg">{myCard.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{myCard.name}</p>
              <p className="text-xs text-white/40 truncate">{myCard.project}</p>
            </div>
            <button
              id="edit-card"
              onClick={() => navigate(`/room/${eventId}/edit`)}
              className="text-xs text-white/40 hover:text-white transition font-medium"
            >
              Edit
            </button>
            <button
              id="leave-room"
              onClick={handleDeleteCard}
              className="text-xs text-red-400 hover:text-red-300 transition font-medium"
            >
              Leave
            </button>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-lg mx-auto space-y-5">
          {/* Energy filter */}
          {!loading && cards.length > 1 && (
            <div className="bg-white/5 rounded-2xl px-4 py-3">
              <EnergyFilter value={minEnergy} onChange={setMinEnergy} />
            </div>
          )}

          {/* Suggested rail (appears once embeddings are ready) */}
          {suggestionIds.length > 0 && (
            <SuggestedFeed
              suggestionIds={suggestionIds}
              allCards={cards}
              onShoot={setTargetCard}
            />
          )}

          {/* Section label */}
          {!loading && cards.length > 0 && (
            <p className="text-xs text-white/30 uppercase tracking-widest">
              {visibleCards.length === 0 ? 'No one matches your energy filter' : '🔥 In the room'}
            </p>
          )}

          {/* Card feed */}
          <MatchFeed
            cards={visibleCards}
            loading={loading}
            onShoot={setTargetCard}
          />

          {/* Empty state */}
          {!loading && cards.length === 0 && (
            <div className="text-center py-16 space-y-2">
              <p className="text-4xl">👀</p>
              <p className="font-bold text-white/60">No cards yet</p>
              <p className="text-white/30 text-sm">Be the first — share the QR above</p>
            </div>
          )}
        </div>
      </main>

      {/* ── Toast notification ── */}
      {toast && (
        <div
          id="toast-notification"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-800 border border-white/20 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl z-40 animate-bounce-in whitespace-nowrap"
        >
          {toast}
        </div>
      )}

      {/* ── Shoot Your Shot modal ── */}
      {targetCard && myCard && (
        <ShootYourShot
          myCard={myCard}
          targetCard={targetCard}
          onClose={() => setTargetCard(null)}
        />
      )}

      {/* ── Incoming match modal ── */}
      {activeMatch && (
        <MatchModal
          match={activeMatch}
          onClose={() => setActiveMatch(null)}
        />
      )}
    </div>
  )
}
