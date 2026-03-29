export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/10" />
        <div className="space-y-1.5">
          <div className="h-4 bg-white/10 rounded w-24" />
          <div className="h-2 bg-white/10 rounded w-16" />
        </div>
      </div>
      <div className="h-3 bg-white/10 rounded w-2/3" />
      <div className="h-3 bg-white/10 rounded w-1/2" />
      <div className="h-3 bg-white/10 rounded w-3/4" />
    </div>
  )
}
