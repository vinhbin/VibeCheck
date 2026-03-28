import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { safeGet } from '../lib/storage'
import { useRoom } from '../hooks/useRoom'
import { useMatches } from '../hooks/useMatches'
import { MatchFeed } from '../components/MatchFeed'
import { SuggestedFeed } from '../components/SuggestedFeed'
import { MatchModal } from '../components/MatchModal'
import { RoomQR } from '../components/RoomQR'

export default function Room() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const myCardId = safeGet('my_card_id')

  const { cards, loading, connected } = useRoom(eventId)
  const [activeMatch, setActiveMatch] = useState(null)
  const [targetCard, setTargetCard] = useState(null)

  useMatches(myCardId, (match) => {
    setActiveMatch(match)
    // TODO: toast — `${match.card_a_snapshot?.name ?? 'Someone'} wants to connect!`
  })

  const myCard = cards.find(c => c.id === myCardId) ?? null

  async function handleDeleteCard() {
    if (!myCardId) return
    if (!window.confirm('Remove your card from this room?')) return
    await supabase.from('vibe_cards').delete().eq('id', myCardId)
    try { localStorage.removeItem('my_card_id') } catch {}
    navigate('/')
  }

  // TODO: UI shell — connected indicator, RoomQR in header, EnergyFilter, SuggestedFeed rail
  return (
    <>
      <MatchFeed cards={cards} loading={loading} onShoot={setTargetCard} />
      {activeMatch && (
        <MatchModal match={activeMatch} onClose={() => setActiveMatch(null)} />
      )}
    </>
  )
}
