const LOOKING_FOR_TAGS = [
  'co-founder', 'mentor', 'hiring', 'job seeking',
  'collaborator', 'investor', 'friends', 'learning',
]

export function RoomFilters({ value, onChange, tagFilter, onTagChange }) {
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  return (
    <div className="space-y-4">
      {/* Energy filter */}
      <div className="flex items-center justify-between">
        <span className="font-semibold">Filter by Energy</span>
        <div className="flex gap-1">
          {levels.map(lvl => (
            <button
              key={lvl}
              title={`Min energy ${lvl}`}
              onClick={() => onChange(value === lvl ? 1 : lvl)}
              className={[
                'w-6 h-6 rounded-lg text-[10px] font-bold transition-all',
                lvl <= value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/10 text-muted-foreground hover:bg-white/20',
              ].join(' ')}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Looking for tag filter */}
      <div>
        <span className="text-sm font-semibold text-muted-foreground">Filter by Role</span>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {LOOKING_FOR_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => onTagChange(tagFilter === tag ? null : tag)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                tagFilter === tag
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-white/20 text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
