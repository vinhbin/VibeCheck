export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white/10" />
        <div className="h-4 bg-white/10 rounded w-1/3" />
      </div>
      <div className="h-3 bg-white/10 rounded w-2/3" />
      <div className="h-3 bg-white/10 rounded w-1/2" />
      <div className="h-3 bg-white/10 rounded w-3/4" />
    </div>
  )
}
