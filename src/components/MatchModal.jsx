import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { safeGet } from '../lib/storage'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'

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
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="bg-background border border-primary/30 rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-center">
            <span className="text-primary">You Got a Match!</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">{theirCard?.emoji}</div>
            <p className="text-xl font-bold mb-2">{theirCard?.name}</p>
            <p className="text-sm text-muted-foreground">{theirCard?.project}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[64px]">
            <p className="text-sm italic">
              {displayed ? `"${displayed}"` : <span className="text-muted-foreground">Loading icebreaker...</span>}
            </p>
          </div>

          {!isInitiator && !responded && (
            <div className="flex gap-3">
              <Button
                onClick={() => respond('declined')}
                variant="outline"
                className="flex-1 rounded-2xl border-white/10"
                aria-label="Decline match"
              >
                Pass
              </Button>
              <Button
                onClick={() => respond('accepted')}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-semibold"
                aria-label="Accept match"
              >
                Let's go
              </Button>
            </div>
          )}
          {isInitiator && (
            <Button
              onClick={onClose}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-semibold"
              aria-label="Close"
            >
              Sent!
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
