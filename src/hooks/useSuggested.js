import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Refreshes suggestion IDs when myCard gains embeddings or cardCount changes.
// Fetches extra candidates and boosts those whose looking_for tags overlap with
// myCard's tags, so intent-matched cards surface above pure embedding rank.
// Returns an empty array on cold start — SuggestedFeed hides itself when empty.
export function useSuggested(myCard, eventId, cardCount, allCards = []) {
  const [suggestions, setSuggestions] = useState([])
  // Ref keeps latest allCards available inside the effect without adding it to deps
  // (adding allCards to deps would re-fire the expensive RPC on every card update)
  const allCardsRef = useRef(allCards)
  useEffect(() => { allCardsRef.current = allCards })

  useEffect(() => {
    if (!myCard?.need_embedding) return // wait until embeddings are populated

    supabase
      .rpc('match_cards', {
        query_embedding: myCard.need_embedding,
        p_event_id: eventId,
        exclude_card_id: myCard.id,
        match_count: 6, // fetch extra candidates so tag-boost re-ranking has room to work
      })
      .then(({ data }) => {
        if (!data?.length) return

        const myTags  = new Set(myCard.looking_for ?? [])
        const myRoles = new Set(myCard.roles ?? [])

        // Three cross-signals:
        // 1. looking_for ↔ looking_for  (both want the same thing)
        // 2. my looking_for ↔ their roles  (I want what they are)
        // 3. my roles ↔ their looking_for  (they want what I am)
        const scored = data.map((d, embeddingRank) => {
          const card = allCardsRef.current.find(c => c.id === d.id)
          const theirTags  = card?.looking_for ?? []
          const theirRoles = card?.roles ?? []
          const tagOverlap =
            theirTags.filter(t => myTags.has(t)).length +
            theirRoles.filter(t => myTags.has(t)).length +
            theirTags.filter(t => myRoles.has(t)).length
          return { id: d.id, tagOverlap, embeddingRank }
        })

        scored.sort((a, b) =>
          b.tagOverlap !== a.tagOverlap
            ? b.tagOverlap - a.tagOverlap
            : a.embeddingRank - b.embeddingRank
        )

        setSuggestions(scored.slice(0, 3).map(s => s.id))
      })
  }, [myCard?.need_embedding, eventId, cardCount])

  return suggestions // array of card IDs
}
