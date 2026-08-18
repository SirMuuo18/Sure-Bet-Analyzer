import { useEffect, useState } from "react"

function relativeLabel(updatedAt: number, now: number) {
  if (!updatedAt) return null
  const seconds = Math.max(0, Math.round((now - updatedAt) / 1000))
  if (seconds < 10) return "Updated just now"
  if (seconds < 60) return `Updated ${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `Updated ${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `Updated ${hours}h ago`
}

/**
 * Shows when the current data was actually last fetched from the server —
 * derived from React Query's real dataUpdatedAt, never a fabricated "live" claim.
 */
export default function DataFreshness({ updatedAt, isFetching }: { updatedAt: number; isFetching?: boolean }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  const label = relativeLabel(updatedAt, now)
  if (!label) return null

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
      <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? "bg-accent animate-pulse" : "bg-ink-faint"}`} />
      {isFetching ? "Refreshing…" : label}
    </span>
  )
}
