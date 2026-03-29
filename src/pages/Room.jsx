import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QrCode, Users, Sparkles } from 'lucide-react'
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
import { Button } from '../components/ui/button'

export default function Room() {
  const { eventId } = useParams()
  const navigate    = useNavigate()
  const myCardId    = safeGet('my_card_id')

  const { cards, loading, connected } = useRoom(eventId)

  const [matchQueue,  setMatchQueue]  = useState([])
  const [targetCard,  setTargetCard]  = useState(null)
  const [toastMsg,    setToastMsg]    = useState(null)
  const [showQR,      setShowQR]      = useState(false)
  const [minEnergy,   setMinEnergy]   = useState(1)

  const activeMatch = matchQueue[0] ?? null

  const myCard = cards.find(c => c.id === myCardId) ?? null

  // Incoming match notifications
  useMatches(myCardId, (match) => {
    setMatchQueue(prev => [...prev, match])
    const senderName = match.card_a_snapshot?.name ?? match.card_b_snapshot?.name ?? 'Someone'
    showToast(`${senderName} wants to connect!`)
  })

  // AI-suggested cards (pgvector)
  const suggestionIds = useSuggested(myCard, eventId, cards.length)

  // Filtered card list
  const visibleCards = cards.filter(c => c.id === myCardId || c.energy >= minEnergy)

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
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
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-yellow-400 animate-pulse'}`} />
                <span className="text-sm text-muted-foreground">{connected ? 'Live' : 'Connecting...'}</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <h2 className="font-bold">
                {eventName ? `${eventName}` : `Room`}
                <span className="text-muted-foreground text-sm ml-2">
                  {cards.length} {cards.length === 1 ? 'person' : 'people'}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQR(v => !v)}
                className="rounded-xl border-white/10"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-white/10 hover:border-primary hover:text-primary"
                onClick={() => navigate(`/matches/${eventId}`)}
              >
                <Users className="w-4 h-4 mr-2" />
                Matches
              </Button>
            </div>
          </div>

          {/* My Card Bar */}
          {myCard && (
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{myCard.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{myCard.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{myCard.project}</p>
                </div>
                <div className="text-sm font-semibold text-primary">{myCard.energy}/10</div>
                <button
                  onClick={() => navigate(`/room/${eventId}/edit`)}
                  className="text-xs text-muted-foreground hover:text-white transition font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={handleDeleteCard}
                  className="text-xs text-red-400 hover:text-red-300 transition font-medium"
                >
                  Leave
                </button>
              </div>
            </div>
          )}

          {/* QR panel */}
          {showQR && eventCode && (
            <div className="mt-3">
              <RoomQR code={eventCode} />
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="container mx-auto max-w-6xl space-y-6">
          {/* Energy Filter */}
          {!loading && cards.length > 1 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <EnergyFilter value={minEnergy} onChange={setMinEnergy} />
            </div>
          )}

          {/* Suggested rail */}
          {suggestionIds.length > 0 && (
            <SuggestedFeed
              suggestionIds={suggestionIds}
              allCards={cards}
              onShoot={setTargetCard}
            />
          )}

          {/* Section label */}
          {!loading && cards.length > 0 && (
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {visibleCards.length === 0 ? 'No one matches your energy filter' : 'In the Room'}
            </h3>
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
              <p className="font-bold text-muted-foreground">No cards yet</p>
              <p className="text-muted-foreground text-sm">Be the first — share the QR above</p>
            </div>
          )}
        </div>
      </main>

      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-secondary border border-white/20 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl z-40 animate-bounce whitespace-nowrap">
          {toastMsg}
        </div>
      )}

      {/* Shoot Your Shot modal */}
      {targetCard && myCard && (
        <ShootYourShot
          myCard={myCard}
          targetCard={targetCard}
          onClose={() => setTargetCard(null)}
        />
      )}

      {/* Incoming match modal */}
      {activeMatch && (
        <MatchModal
          match={activeMatch}
          onClose={() => setMatchQueue(prev => prev.slice(1))}
        />
      )}
    </div>
  )
}
