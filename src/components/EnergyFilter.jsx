export function EnergyFilter({ value, onChange }) {
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  return (
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
  )
}
