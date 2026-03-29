import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { safeGet } from '../lib/storage'

// Fix #5: anchor must be in the DOM for Firefox to trigger the download
function triggerDownload(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
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

// Fix #4: use resolveTheirCard so null-myCardId is handled correctly
function exportCSV(matches, myCardId) {
  const sanitize = (val = '') => {
    const s = String(val).replace(/"/g, '""')
    return /^[=+\-@]/.test(s) ? `'${s}` : s
  }
  const header = 'Name,Project,Need,Offer,Icebreaker,Status'
  const rows = matches.map((match) => {
    const c = resolveTheirCard(match, myCardId)
    return `"${sanitize(c?.name)}","${sanitize(c?.project)}","${sanitize(c?.need)}","${sanitize(c?.offer)}","${sanitize(match.icebreaker)}","${sanitize(match.status)}"`
  })
  triggerDownload('vibecheck-matches.csv', [header, ...rows].join('\n'), 'text/csv')
}

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{theirCard?.emoji}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-white">{theirCard?.name}</p>
              {theirCard?.linkedin && (
                <a
                  href={theirCard.linkedin.startsWith('http') ? theirCard.linkedin : `https://${theirCard.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0A66C2] hover:text-[#0A66C2]/80 transition shrink-0"
                  title="View LinkedIn profile"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              )}
            </div>
            <p className="text-white/50 text-xs">{theirCard?.project}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${statusColors[match.status] ?? statusColors.pending}`}>
          {match.status}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-white/50 text-xs">Needs: {theirCard?.need}</p>
        <p className="text-white/50 text-xs">Offers: {theirCard?.offer}</p>
      </div>

      {match.icebreaker && (
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-white/70 text-sm italic">"{match.icebreaker}"</p>
        </div>
      )}

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
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

  const [matches, setMatches]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  // Fix #1: track whether myCardId actually belongs to this event
  const [cardMismatch, setCardMismatch] = useState(false)

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Fix #1: validate card belongs to this event and fetch matches in parallel
    // Avoids sequential round-trips while still catching stale localStorage
    const [cardRes, matchRes] = await Promise.all([
      supabase
        .from('vibe_cards')
        .select('event_id')
        .eq('id', myCardId)
        .single(),
      supabase
        .from('matches')
        .select('*')
        .or(`card_a.eq.${myCardId},card_b.eq.${myCardId}`)
        .order('created_at', { ascending: false }),
    ])

    // Card not found or belongs to a different event — stale localStorage
    if (cardRes.error || cardRes.data?.event_id !== eventId) {
      setCardMismatch(true)
      setLoading(false)
      return
    }

    if (matchRes.error) {
      setError('Failed to load matches.')
    } else {
      setMatches(matchRes.data ?? [])
    }
    setLoading(false)
  }, [myCardId, eventId])

  // Fix #3: separate fetch effect from subscription effect — no coupling
  useEffect(() => {
    if (!myCardId) {
      setLoading(false)
      return
    }
    fetchMatches()
  }, [myCardId, eventId, fetchMatches])

  useEffect(() => {
    if (!myCardId) return

    // Fix #2: only merge mutable fields from realtime UPDATE payload
    // Realtime rows don't include joined columns — spreading would drop them
    const handleUpdate = ({ new: updated }) => {
      setMatches(prev => prev.map(m =>
        m.id === updated.id
          ? { ...m, status: updated.status, icebreaker: updated.icebreaker }
          : m
      ))
    }

    // New matches appear in real-time without refresh
    const handleInsert = ({ new: inserted }) => {
      setMatches(prev => {
        if (prev.some(m => m.id === inserted.id)) return prev
        return [inserted, ...prev]
      })
    }

    const channel = supabase
      .channel(`matches-page-${myCardId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `card_a=eq.${myCardId}` },
        handleUpdate
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `card_b=eq.${myCardId}` },
        handleUpdate
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches', filter: `card_a=eq.${myCardId}` },
        handleInsert
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches', filter: `card_b=eq.${myCardId}` },
        handleInsert
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [myCardId])

  // No card in localStorage at all
  if (!myCardId || cardMismatch) {
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
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-black text-2xl sm:text-3xl text-yellow-400">Your Matches</h1>
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
            className="w-full sm:w-auto sm:px-6 mb-6 border border-yellow-400/30 text-yellow-400 text-sm font-bold py-2.5 rounded-xl hover:bg-yellow-400/10 transition"
          >
            Export all as CSV
          </button>
        )}

        {loading && <MatchesSkeleton />}

        {!loading && error && (
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

        {/* Single column on mobile, 2-col on md, 3-col on lg */}
        {!loading && !error && matches.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map(match => (
              <MatchCard key={match.id} match={match} myCardId={myCardId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}