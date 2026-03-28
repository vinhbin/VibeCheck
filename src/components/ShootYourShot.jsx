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

export function ShootYourShot({ myCard, targetCard }) {
  const [personality, setPersonality] = useState('default')
  const [firing, setFiring]           = useState(false)
  const [icebreaker, setIcebreaker]   = useState('')
  const abortRef = useRef(null)

  const shoot = async () => {
    if (firing) return
    setFiring(true)
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
    } finally {
      setFiring(false)
    }
  }

  const switchPersonality = (key) => {
    if (firing) {
      abortRef.current?.abort()
      setFiring(false)
      setIcebreaker('')
    }
    setPersonality(key)
  }

  // TODO: personality picker UI + shoot button + streaming icebreaker display
  return null
}
