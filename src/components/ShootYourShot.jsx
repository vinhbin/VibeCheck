import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { streamIcebreaker } from '../api/gemini'

const MODES = [
  { key: 'default',     label: '✨ Default' },
  { key: 'hype',        label: '🔥 Hype' },
  { key: 'roast',       label: '😤 Roast' },
  { key: 'philosopher', label: '🧠 Philosopher' },
  { key: 'investor',    label: '📈 Investor' },
]

export function ShootYourShot({ myCard, targetCard, onClose }) {
  const [personality, setPersonality] = useState('default')
  const [firing, setFiring]           = useState(false)
  const [icebreaker, setIcebreaker]   = useState('')
  const [done, setDone]               = useState(false)
  const abortRef = useRef(null)

  const shoot = async () => {
    if (firing) return
    setFiring(true)
    setDone(false)
    setIcebreaker('')

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const text = await streamIcebreaker(
        myCard, targetCard, personality,
        (partial) => setIcebreaker(partial),
        abortRef.current.signal,
      )

      const [lo, hi] = [myCard.id, targetCard.id].sort()
      const isLo = myCard.id === lo

      await supabase.from('matches').upsert(
        {
          card_a: lo,
          card_b: hi,
          initiator_card: myCard.id,
          icebreaker: text,
          status: 'pending',
          card_a_snapshot: isLo ? myCard : targetCard,
          card_b_snapshot: isLo ? targetCard : myCard,
        },
        { onConflict: 'card_a,card_b', ignoreDuplicates: false }
      )
      setDone(true)
    } finally {
      setFiring(false)
    }
  }

  const switchPersonality = (key) => {
    if (firing) {
      abortRef.current?.abort()
      setFiring(false)
      setIcebreaker('')
      setDone(false)
    }
    setPersonality(key)
  }

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Target card header */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Shoot your shot at</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{targetCard.emoji}</span>
            <div>
              <p className="font-black text-white text-lg leading-tight">{targetCard.name}</p>
              <p className="text-white/50 text-xs">{targetCard.project}</p>
            </div>
          </div>
        </div>

        {/* Personality picker */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Vibe</p>
          <div className="flex flex-wrap gap-2">
            {MODES.map(m => (
              <button
                key={m.key}
                id={`personality-${m.key}`}
                onClick={() => switchPersonality(m.key)}
                className={[
                  'px-3 py-1 rounded-full text-xs font-bold transition',
                  personality === m.key
                    ? 'bg-yellow-400 text-black'
                    : 'bg-white/10 text-white/60 hover:bg-white/20',
                ].join(' ')}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Icebreaker preview */}
        {(firing || icebreaker) && (
          <div className="bg-white/5 rounded-xl p-4 min-h-[64px]">
            <p className="text-white leading-relaxed text-sm">
              {icebreaker || <span className="text-white/30">Generating icebreaker…</span>}
              {firing && <span className="inline-block w-1 h-4 bg-yellow-400 ml-1 animate-pulse align-middle" />}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            id="shoot-cancel"
            onClick={onClose}
            className="flex-1 border border-white/20 text-white/60 font-bold py-3 rounded-xl hover:border-white/40 transition text-sm"
          >
            Cancel
          </button>
          <button
            id="shoot-fire"
            onClick={done ? onClose : shoot}
            disabled={firing}
            className={[
              'flex-1 font-bold py-3 rounded-xl text-sm transition',
              firing
                ? 'bg-yellow-400/50 text-black cursor-not-allowed'
                : 'bg-yellow-400 text-black hover:bg-yellow-300',
            ].join(' ')}
          >
            {done ? 'Sent! 🎯' : firing ? 'Generating…' : 'Shoot 🎯'}
          </button>
        </div>
      </div>
    </div>
  )
}
