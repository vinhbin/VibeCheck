import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useMatches(myCardId, onIncoming) {
  // Stable ref so the effect doesn't re-subscribe on every render
  const onIncomingRef = useRef(onIncoming)
  useEffect(() => { onIncomingRef.current = onIncoming })

  useEffect(() => {
    if (!myCardId) return

    // Deduplicate across browser tabs
    const bc = new BroadcastChannel('vibecheck_matches')
    const seen = new Set()

    const handleMatch = ({ new: match }) => {
      if (match.initiator_card === myCardId) return // I shot this, no toast for me
      if (seen.has(match.id)) return
      seen.add(match.id)
      bc.postMessage({ type: 'match_seen', id: match.id })
      onIncomingRef.current(match)
    }

    // Subscribe to both sides — user could be card_a or card_b
    const channel = supabase
      .channel(`matches-${myCardId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches', filter: `card_a=eq.${myCardId}` },
        handleMatch)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches', filter: `card_b=eq.${myCardId}` },
        handleMatch)
      .subscribe()

    bc.onmessage = (e) => { if (e.data.type === 'match_seen') seen.add(e.data.id) }

    return () => {
      supabase.removeChannel(channel)
      bc.close()
    }
  }, [myCardId])
}
