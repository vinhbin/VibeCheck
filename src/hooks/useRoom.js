import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useRoom(eventId) {
  const [cards, setCards]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [connected, setConnected] = useState(false)

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from('vibe_cards')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at')
    setCards(data ?? [])
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel(`room-${eventId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vibe_cards', filter: `event_id=eq.${eventId}` },
        ({ new: card }) => setCards(prev => [...prev, card]))
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vibe_cards', filter: `event_id=eq.${eventId}` },
        ({ new: card }) => setCards(prev => prev.map(c => c.id === card.id ? card : c)))
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'vibe_cards', filter: `event_id=eq.${eventId}` },
        ({ old: card }) => setCards(prev => prev.filter(c => c.id !== card.id)))
      .subscribe(status => {
        const isConnected = status === 'SUBSCRIBED'
        setConnected(isConnected)
        // Re-fetch on reconnect to recover any missed events
        if (isConnected) fetchAll()
      })

    return () => supabase.removeChannel(channel)
  }, [eventId, fetchAll])

  return { cards, loading, connected }
}
