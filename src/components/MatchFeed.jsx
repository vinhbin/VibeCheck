import { VibeCard } from './VibeCard'
import { CardSkeleton } from './CardSkeleton'

export function MatchFeed({ cards, loading, onShoot }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {cards.map(card => (
        <VibeCard key={card.id} card={card} onShoot={onShoot} />
      ))}
    </div>
  )
}
