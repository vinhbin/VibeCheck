import { safeGet } from '../lib/storage'

// Map energy (1–10) to a suit + accent colour
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
    <div className="relative rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex flex-col">

      {/* Corner — top left */}
      <Corner rank={rank} symbol={symbol} color={color} />

      {/* Corner — bottom right (rotated) */}
      <Corner rank={rank} symbol={symbol} color={color} flipped />

      {/* Card body */}
      <div className="flex flex-col items-center text-center px-6 pt-10 pb-4 gap-2 flex-1">

        {/* Emoji */}
        <span className="text-5xl leading-none">{card.emoji}</span>

        {/* Name */}
        <p
          className="text-2xl uppercase leading-none tracking-wide text-white"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {card.name}
          {isMyCard && (
            <span className="ml-2 text-xs font-sans normal-case tracking-normal text-white/30">you</span>
          )}
        </p>

        {/* Project */}
        <p
          className="text-xs uppercase tracking-widest font-semibold"
          style={{ color, fontFamily: "'DM Sans', sans-serif" }}
        >
          {card.project}
        </p>

        {/* Divider + details */}
        {!compact && (
          <>
            <div className="w-10 border-t border-white/10 my-1" />
            <p className="text-white/50 text-xs leading-relaxed">
              <span className="text-white/70 font-semibold">Needs</span>{' '}
              {card.need}
            </p>
            <p className="text-white/50 text-xs leading-relaxed">
              <span className="text-white/70 font-semibold">Offers</span>{' '}
              {card.offer}
            </p>
          </>
        )}
      </div>

      {/* Action */}
      <div className="px-4 pb-5 mt-auto">
        {isMyCard ? (
          <p className="w-full text-center text-xs font-semibold uppercase tracking-widest text-white/20 py-2">
            That&apos;s you
          </p>
        ) : (
          <button
            onClick={() => onShoot?.(card)}
            className="w-full rounded-xl py-2.5 text-sm font-bold bg-yellow-400 text-black hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Shoot Your Shot 🎯
          </button>
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
