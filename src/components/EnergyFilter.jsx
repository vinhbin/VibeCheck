export function EnergyFilter({ value, onChange }) {
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/40 uppercase tracking-widest shrink-0">Energy</span>
      <div className="flex gap-1">
        {levels.map(lvl => (
          <button
            key={lvl}
            id={`energy-filter-${lvl}`}
            title={`Min energy ${lvl}`}
            onClick={() => onChange(value === lvl ? 1 : lvl)}
            className={[
              'w-5 h-5 rounded text-[10px] font-bold transition',
              lvl <= value
                ? 'bg-yellow-400 text-black'
                : 'bg-white/10 text-white/30 hover:bg-white/20',
            ].join(' ')}
          >
            {lvl}
          </button>
        ))}
      </div>
    </div>
  )
}
