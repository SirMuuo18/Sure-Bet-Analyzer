import { SIGNAL_STYLES, type Signal } from "../lib/signal"

export default function SignalBadge({ signal }: { signal: Signal }) {
  const s = SIGNAL_STYLES[signal.tier]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border ${s.bg} ${s.text} ${s.border}`}
      title={signal.reason}
      aria-label={`${signal.label} signal — ${signal.reason}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {signal.label}
    </span>
  )
}
