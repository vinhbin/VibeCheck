import { Sparkles } from 'lucide-react'
import { safeGet } from '../lib/storage'
import { Button } from './ui/button'

// Map energy (1-10) to a suit + accent colour
function getSuit(energy = 5) {
  if (energy <= 2) return { symbol: '♣', color: '#93c5fd' }   // blue-300
  if (energy <= 4) return { symbol: '♦', color: '#fcd34d' }   // yellow-300
  if (energy <= 7) return { symbol: '♥', color: '#f87171' }   // red-400
  return             { symbol: '♠', color: '#ffffff' }         // white
}

function getRank(energy = 5) {
  if (energy === 1)  return 'A'
  if (energy === 10) return '10'
  return String(energy)
}

export function VibeCard({ card, compact = false, onShoot }) {
  const myCardId = safeGet('my_card_id')
  const isMyCard = card.id === myCardId
  const { symbol, color } = getSuit(card.energy)
  const rank = getRank(card.energy)

  return (
    <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col hover:bg-white/10 hover:border-primary/50 transition-all">
      {/* Corner — top left */}
      <Corner rank={rank} symbol={symbol} color={color} />

      {/* Corner — bottom right (rotated) */}
      <Corner rank={rank} symbol={symbol} color={color} flipped />

      {/* Card body */}
      <div className="flex flex-col items-center text-center px-6 pt-10 pb-4 gap-2 flex-1">
        <span className="text-5xl leading-none">{card.emoji}</span>

        <p
          className="text-2xl uppercase leading-none tracking-wide text-white"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {card.name}
          {isMyCard && (
            <span className="ml-2 text-xs font-sans normal-case tracking-normal text-muted-foreground">you</span>
          )}
        </p>

        <p
          className="text-xs uppercase tracking-widest font-semibold"
          style={{ color, fontFamily: "'DM Sans', sans-serif" }}
        >
          {card.project}
        </p>

        {!compact && (
          <>
            <div className="w-10 border-t border-white/10 my-1" />
            <p className="text-muted-foreground text-xs leading-relaxed">
              <span className="text-foreground/70 font-semibold">Needs</span>{' '}
              {card.need}
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              <span className="text-foreground/70 font-semibold">Offers</span>{' '}
              {card.offer}
            </p>
          </>
        )}

        {/* Energy bar */}
        <div className="w-full pt-2">
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${card.energy * 10}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="px-4 pb-5 mt-auto">
        {isMyCard ? (
          <p className="w-full text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground py-2">
            That&apos;s you
          </p>
        ) : (
          <Button
            onClick={() => onShoot?.(card)}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Shoot Your Shot
          </Button>
        )}
      </div>
    </div>
  )
}

function Corner({ rank, symbol, color, flipped = false }) {
  return (
    <div
      className="absolute flex flex-col items-center leading-none select-none"
      style={{
        ...(flipped
          ? { bottom: 56, right: 12, transform: 'rotate(180deg)' }
          : { top: 10, left: 12 }),
        color,
        fontFamily: 'Georgia, serif',
      }}
    >
      <span className="text-lg font-bold">{rank}</span>
      <span className="text-base">{symbol}</span>
    </div>
  )
}
