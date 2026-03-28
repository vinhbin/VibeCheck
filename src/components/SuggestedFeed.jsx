import { VibeCard } from './VibeCard'

export function SuggestedFeed({ suggestionIds, allCards, onShoot }) {
  const suggested = allCards.filter(c => suggestionIds.includes(c.id))
  if (suggested.length === 0) return null

  return (
    <div className="mb-6">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-2">⚡ Suggested for you</p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {suggested.map(card => (
          <VibeCard key={card.id} card={card} compact onShoot={onShoot} />
        ))}
      </div>
    </div>
  )
}
