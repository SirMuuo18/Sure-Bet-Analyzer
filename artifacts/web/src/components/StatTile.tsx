type Tone = "default" | "positive" | "watch" | "risk"

const TONE_TEXT: Record<Tone, string> = {
  default: "text-ink",
  positive: "text-positive",
  watch: "text-watch",
  risk: "text-risk",
}

export default function StatTile({
  value,
  label,
  tone = "default",
}: {
  value: string | number
  label: string
  tone?: Tone
}) {
  return (
    <div className="bg-surface rounded-xl border border-line p-5 flex flex-col gap-1.5">
      <div className={`text-3xl font-bold nums tracking-tight ${TONE_TEXT[tone]}`}>{value}</div>
      <div className="text-xs font-medium text-ink-muted uppercase tracking-wide">{label}</div>
    </div>
  )
}
