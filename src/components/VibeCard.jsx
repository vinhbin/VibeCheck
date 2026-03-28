import { safeGet } from '../lib/storage'

export function VibeCard({ card, compact = false, onShoot }) {
  const myCardId = safeGet('my_card_id')
  const isMyCard = card.id === myCardId

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{card.emoji}</span>
        <span className="font-bold text-white">{card.name}</span>
        {isMyCard && <span className="text-xs text-white/40 ml-auto">you</span>}
      </div>
      <p className="text-white/80 text-sm font-medium">{card.project}</p>
      {!compact && (
        <>
          <p className="text-white/50 text-xs">Needs: {card.need}</p>
          <p className="text-white/50 text-xs">Offers: {card.offer}</p>
        </>
      )}
      <button
        disabled={isMyCard}
        onClick={() => onShoot?.(card)}
        className={isMyCard
          ? 'w-full mt-2 py-2 rounded-xl text-sm font-bold opacity-40 cursor-not-allowed bg-white/10 text-white'
          : 'w-full mt-2 py-2 rounded-xl text-sm font-bold bg-yellow-400 text-black'
        }
      >
        {isMyCard ? "That's you!" : 'Shoot Your Shot 🎯'}
      </button>
    </div>
  )
}
