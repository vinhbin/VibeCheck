import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Returns which optional card fields are enabled for this event.
// Re-fetches on Realtime UPDATE to the events row so organizer changes
// propagate to active sessions without a page refresh.
export function useEventExtras(eventId) {
  const [extras, setExtras] = useState({
    looking_for: true,
    favorite_song: false,
    custom_prompt: null,
  })

  useEffect(() => {
    if (!eventId) return

    supabase
      .from('events')
      .select('extras')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        if (data?.extras) setExtras(data.extras)
      })

    const channel = supabase
      .channel(`event-extras-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        ({ new: event }) => {
          if (event?.extras) setExtras(event.extras)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [eventId])

  return extras // { looking_for: bool, favorite_song: bool, custom_prompt: string|null }
}
