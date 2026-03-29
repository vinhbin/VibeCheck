import { Sparkles } from 'lucide-react'
import { VibeCard } from './VibeCard'

export function SuggestedFeed({ suggestionIds, allCards, onShoot }) {
  const suggested = allCards.filter(c => suggestionIds.includes(c.id))
  if (suggested.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        Suggested for you
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
        {suggested.map(card => (
          <div key={card.id} className="flex-shrink-0 w-64">
            <VibeCard card={card} compact onShoot={onShoot} />
          </div>
        ))}
      </div>
    </div>
  )
}
