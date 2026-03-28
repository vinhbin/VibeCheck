import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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

  const { count } = await supabase
    .from('vibe_cards')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)

  if (count >= event.max_cards) return setError('This room is full.')

  navigate(`/create/${event.id}`)
}

export default function Home() {
  const { code: urlCode } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  // TODO: create event form + join event form
  // Auto-submit if /join/:code
  return null
}
