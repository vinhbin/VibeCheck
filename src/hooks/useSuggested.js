import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Refreshes suggestion IDs when myCard gains embeddings or cardCount changes.
// Returns an empty array on cold start — SuggestedFeed hides itself when empty.
export function useSuggested(myCard, eventId, cardCount) {
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (!myCard?.need_embedding) return // wait until embeddings are populated

    supabase
      .rpc('match_cards', {
        query_embedding: myCard.need_embedding,
        p_event_id: eventId,
        exclude_card_id: myCard.id,
        match_count: 3,
      })
      .then(({ data }) => {
        if (data?.length) setSuggestions(data.map(d => d.id))
      })
  }, [myCard?.need_embedding, eventId, cardCount])

  return suggestions // array of card IDs
}
