import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { safeGet } from '../lib/storage'

export function MatchModal({ match, onClose }) {
  const [displayed, setDisplayed] = useState('')
  const [responded, setResponded] = useState(false)

  useEffect(() => {
    if (!match?.icebreaker) return
    const words = match.icebreaker.split(' ')
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(words.slice(0, i).join(' '))
      if (i >= words.length) clearInterval(timer)
    }, 60)
    return () => clearInterval(timer)
  }, [match?.icebreaker])

  const respond = async (status) => {
    setResponded(true)
    await supabase.from('matches').update({ status }).eq('id', match.id)
    onClose()
  }

  if (!match) return null

  const myCardId = safeGet('my_card_id')
  const isInitiator = myCardId
    ? match.initiator_card === myCardId
    : match.initiator_card === match.card_a
  const theirCard = myCardId
    ? (match.card_a === myCardId ? match.card_b_snapshot : match.card_a_snapshot)
    : (isInitiator ? match.card_b_snapshot : match.card_a_snapshot)

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-yellow-400/40 rounded-2xl p-6 max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs text-white/40 uppercase tracking-widest mb-1">New match</p>
        <h2 className="font-black text-2xl text-yellow-400 mb-1">
          {theirCard?.emoji} {theirCard?.name}
        </h2>
        <p className="text-white/60 text-sm mb-4">{theirCard?.project}</p>

        <div className="bg-white/5 rounded-xl p-4 mb-6 min-h-[64px]">
          <p className="text-white leading-relaxed">
            {displayed || <span className="text-white/30">Generating icebreaker…</span>}
          </p>
        </div>

        {!isInitiator && !responded && (
          <div className="flex gap-3">
            <button
              onClick={() => respond('declined')}
              aria-label="Decline match"
              className="flex-1 border border-white/20 text-white/60 font-bold py-3 rounded-xl hover:border-white/40 transition"
            >
              Pass
            </button>
            <button
              onClick={() => respond('accepted')}
              aria-label="Accept match"
              className="flex-1 bg-yellow-400 text-black font-bold py-3 rounded-xl"
            >
              Let's go 🎯
            </button>
          </div>
        )}
        {isInitiator && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl"
          >
            Sent! 🎯
          </button>
        )}
      </div>
    </div>
  )
}
