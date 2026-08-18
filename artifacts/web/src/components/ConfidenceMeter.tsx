export default function ConfidenceMeter({
  pct,
  label = "Confidence",
}: {
  pct: number
  label?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink-muted uppercase tracking-wide">{label}</span>
        <span className="font-semibold text-ink nums">{clamped}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
