function Bar({ className = "" }: { className?: string }) {
  return <div className={`bg-surface-2 rounded animate-pulse ${className}`} />
}

export function GameCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-line p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Bar className="h-3 w-24" />
        <Bar className="h-3 w-16" />
      </div>
      <div className="flex flex-col gap-2 items-center py-2">
        <Bar className="h-4 w-32" />
        <Bar className="h-3 w-6" />
        <Bar className="h-4 w-32" />
      </div>
      <Bar className="h-16 w-full rounded-lg" />
      <Bar className="h-2 w-full rounded-full" />
      <Bar className="h-9 w-full rounded-lg" />
    </div>
  )
}

export function GameGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function StatTileSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-line p-5 flex flex-col gap-3">
      <Bar className="h-7 w-14" />
      <Bar className="h-3 w-24" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-line overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-line last:border-0">
          <Bar className="h-4 flex-1" />
          <Bar className="h-4 w-20" />
          <Bar className="h-4 w-16" />
          <Bar className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
