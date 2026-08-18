import type { Game } from "../hooks/useGames"
import { classifySignal, keySignals, outcomeLabel } from "../lib/signal"
import SignalBadge from "./SignalBadge"
import ConfidenceMeter from "./ConfidenceMeter"

function formatWhen(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (isToday) return `${time} TODAY`
  if (isTomorrow) return `${time} TOMORROW`
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })} · ${time}`
}

export default function GameCard({ game, onView }: { game: Game; onView: (game: Game) => void }) {
  const signal = classifySignal(game)
  const rec = game.recommendation
  const leadOutcome = rec
    ? game.outcomes.find((o) => o.outcome === rec.outcome)
    : [...game.outcomes].sort((a, b) => b.formAdjustedProb - a.formAdjustedProb)[0]
  const probability = leadOutcome ? Math.round(leadOutcome.formAdjustedProb * 100) : null
  const signals = keySignals(game).slice(0, 3)

  return (
    <div className="group bg-surface rounded-xl border border-line hover:border-line-strong transition-colors p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink-muted uppercase tracking-wide">{game.sportName}</span>
        <span className="font-medium text-ink-faint nums">{formatWhen(game.startsAt)}</span>
      </div>

      <div className="flex flex-col items-center gap-1 py-1 text-center">
        <div className="text-sm font-semibold text-ink">{game.homeTeam}</div>
        <div className="text-[10px] font-bold text-ink-faint tracking-widest">VS</div>
        <div className="text-sm font-semibold text-ink">{game.awayTeam}</div>
      </div>

      {leadOutcome ? (
        <div className="bg-surface-2 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Model View</span>
            <SignalBadge signal={signal} />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-ink">{outcomeLabel(leadOutcome.outcome, game)}</span>
            <span className="text-2xl font-bold text-ink nums">{probability}%</span>
          </div>
          <ConfidenceMeter pct={probability ?? 0} label="Model Probability" />
        </div>
      ) : (
        <div className="bg-surface-2 rounded-lg p-4 text-center text-xs text-ink-faint">
          Not enough odds data yet
        </div>
      )}

      {signals.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {signals.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-ink-muted leading-relaxed">
              <span className="text-accent shrink-0 mt-0.5">✓</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => onView(game)}
        className="mt-auto w-full py-2.5 rounded-lg border border-line text-ink text-sm font-semibold hover:border-accent hover:text-accent-strong transition-colors"
      >
        View Analysis →
      </button>
    </div>
  )
}
