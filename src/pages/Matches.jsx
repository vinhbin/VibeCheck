import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { safeGet } from '../lib/storage'

function triggerDownload(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

function exportVCard(card) {
  const vcf_escape = (s = '') =>
    String(s).replace(/[\r\n]+/g, ' ').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;')

  const vcf = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `FN:${vcf_escape(card.name)}`,
    `NOTE:Building: ${vcf_escape(card.project)}\\nNeeds: ${vcf_escape(card.need)}\\nOffers: ${vcf_escape(card.offer)}`,
    'END:VCARD',
  ].join('\r\n')

  const safeName = String(card.name).replace(/[^\w\s-]/g, '').trim() || 'contact'
  triggerDownload(`${safeName}.vcf`, vcf, 'text/vcard')
}

// Fix #1: accept myCardId as param instead of re-reading from localStorage
function exportCSV(matches, myCardId) {
  const sanitize = (val = '') => {
    const s = String(val).replace(/"/g, '""')
    return /^[=+\-@]/.test(s) ? `'${s}` : s
  }
  const header = 'Name,Project,Need,Offer,Icebreaker,Status'
  const rows = matches.map((match) => {
    const theirSnapshot = myCardId && match.card_a === myCardId
      ? match.card_b_snapshot
      : match.card_a_snapshot
    const c = theirSnapshot ?? match.card_b_snapshot
    return `"${sanitize(c?.name)}","${sanitize(c?.project)}","${sanitize(c?.need)}","${sanitize(c?.offer)}","${sanitize(match.icebreaker)}","${sanitize(match.status)}"`
  })
  triggerDownload('vibecheck-matches.csv', [header, ...rows].join('\n'), 'text/csv')
}

// Fix #3: resolve theirCard correctly even when myCardId is null
function resolveTheirCard(match, myCardId) {
  if (!myCardId) return match.card_b_snapshot ?? match.card_a_snapshot
  return match.card_a === myCardId ? match.card_b_snapshot : match.card_a_snapshot
}

function MatchCard({ match, myCardId }) {
  const theirCard = resolveTheirCard(match, myCardId)

  const statusColors = {
    accepted: 'text-green-400 bg-green-400/10 border-green-400/20',
    declined: 'text-red-400 bg-red-400/10 border-red-400/20',
    pending:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{theirCard?.emoji}</span>
          <div>
            <p className="font-bold text-white">{theirCard?.name}</p>
            <p className="text-white/50 text-xs">{theirCard?.project}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${statusColors[match.status] ?? statusColors.pending}`}>
          {match.status}
        </span>
      </div>

      {/* Need / Offer */}
      <div className="space-y-1">
        <p className="text-white/50 text-xs">Needs: {theirCard?.need}</p>
        <p className="text-white/50 text-xs">Offers: {theirCard?.offer}</p>
      </div>

      {/* Icebreaker */}
      {match.icebreaker && (
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-white/70 text-sm italic">"{match.icebreaker}"</p>
        </div>
      )}

      {/* Fix #2: guard exportVCard when snapshot is missing */}
      {theirCard ? (
        <button
          onClick={() => exportVCard(theirCard)}
          className="w-full border border-white/20 text-white/60 text-sm font-semibold py-2 rounded-xl hover:border-white/40 hover:text-white/80 transition"
        >
          Save contact (.vcf)
        </button>
      ) : (
        <p className="text-white/20 text-xs text-center">Contact info unavailable</p>
      )}
    </div>
  )
}

function MatchesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10" />
            <div className="space-y-1">
              <div className="w-24 h-3 rounded bg-white/10" />
              <div className="w-16 h-2 rounded bg-white/10" />
            </div>
          </div>
          <div className="w-full h-2 rounded bg-white/10" />
          <div className="w-3/4 h-2 rounded bg-white/10" />
        </div>
      ))}
    </div>
  )
}

export default function Matches() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const myCardId = safeGet('my_card_id')

  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // Fix #6: wrap fetch in useCallback so it can be reused by retry + realtime
  const fetchMatches = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Fix #5: scope query to eventId via the card snapshots' event context
    // matches table doesn't have event_id directly — filter via vibe_cards join
    const { data, error: err } = await supabase
      .from('matches')
      .select('*, card_a_ref:vibe_cards!card_a(event_id), card_b_ref:vibe_cards!card_b(event_id)')
      .or(`card_a.eq.${myCardId},card_b.eq.${myCardId}`)
      .eq('card_a_ref.event_id', eventId)
      .order('created_at', { ascending: false })

    if (err) {
      setError('Failed to load matches.')
    } else {
      setMatches(data ?? [])
    }
    setLoading(false)
  }, [myCardId, eventId])

  useEffect(() => {
    // Fix #4: don't silently show "No matches" when there's no card
    if (!myCardId) {
      setLoading(false)
      return
    }

    fetchMatches()

    // Fix #6: subscribe to UPDATE events so status changes reflect live
    const channel = supabase
      .channel(`matches-page-${myCardId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `card_a=eq.${myCardId}` },
        ({ new: updated }) => setMatches(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `card_b=eq.${myCardId}` },
        ({ new: updated }) => setMatches(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [myCardId, fetchMatches])

  // Fix #4: dedicated no-card state
  if (!myCardId) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-4xl">🪪</p>
          <p className="text-white font-bold">No card found</p>
          <p className="text-white/40 text-sm">You need to create a vibe card first.</p>
          <button
            onClick={() => navigate(`/create/${eventId}`)}
            className="mt-4 bg-yellow-400 text-black font-bold px-6 py-2.5 rounded-xl text-sm"
          >
            Create card
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-black text-2xl text-yellow-400">Your Matches</h1>
          {!loading && matches.length > 0 && (
            <p className="text-white/40 text-sm">{matches.length} connection{matches.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button
          onClick={() => navigate(`/room/${eventId}`)}
          className="text-sm text-white/40 hover:text-white/60 transition"
        >
          ← Room
        </button>
      </div>

      {/* CSV export */}
      {!loading && matches.length > 0 && (
        <button
          onClick={() => exportCSV(matches, myCardId)}
          className="w-full mb-6 border border-yellow-400/30 text-yellow-400 text-sm font-bold py-2.5 rounded-xl hover:bg-yellow-400/10 transition"
        >
          Export all as CSV
        </button>
      )}

      {/* States */}
      {loading && <MatchesSkeleton />}

      {/* Fix #7: error state with retry button */}
      {error && (
        <div className="text-center py-16 space-y-3">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchMatches}
            className="text-sm text-white/40 hover:text-white/60 underline transition"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">🎯</p>
          <p className="text-white font-bold">No matches yet</p>
          <p className="text-white/40 text-sm">Head back to the room and shoot your shot.</p>
          <button
            onClick={() => navigate(`/room/${eventId}`)}
            className="mt-4 bg-yellow-400 text-black font-bold px-6 py-2.5 rounded-xl text-sm"
          >
            Back to room
          </button>
        </div>
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="space-y-3">
          {matches.map(match => (
            <MatchCard key={match.id} match={match} myCardId={myCardId} />
          ))}
        </div>
      )}
    </div>
  )
}