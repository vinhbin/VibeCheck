import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { safeStore } from '../lib/storage'
import { embedCard } from '../api/embed'
import { VibeCardForm } from '../components/VibeCardForm'

export default function CreateCard() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(formData) {
    if (submitting) return
    setSubmitting(true)
    try {
      const { data: card } = await supabase
        .from('vibe_cards')
        .insert({ event_id: eventId, ...formData })
        .select()
        .single()

      safeStore('my_card_id', card.id)
      safeStore('my_event_id', eventId)

      navigate(`/room/${eventId}`)

      // Fire async — user is already in the room
      embedCard(card)
    } catch (err) {
      setSubmitting(false)
      if (err?.message === 'room_full') {
        setError('This room is full.')
      } else {
        setError('Failed to create card. Try again.')
      }
    }
  }

  // TODO: UI shell, edit mode detection (useParams has /edit suffix)
  return <VibeCardForm onSubmit={handleSubmit} submitting={submitting} />
}
