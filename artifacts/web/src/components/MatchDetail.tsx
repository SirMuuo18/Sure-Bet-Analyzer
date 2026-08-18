import type { Game } from "../hooks/useGames"
import { classifySignal, keySignals, outcomeLabel } from "../lib/signal"
import SignalBadge from "./SignalBadge"
import { BackIcon } from "./icons"

function formatFull(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

const OUTCOME_ORDER: Array<"home" | "draw" | "away"> = ["home", "draw", "away"]

export default function MatchDetail({
  game,
  bookmakersById,
  onBack,
}: {
  game: Game
  bookmakersById: Record<number, string>
  onBack: () => void
}) {
  const signal = classifySignal(game)
  const signals = keySignals(game)
  const outcomesByKey = new Map(game.outcomes.map((o) => [o.outcome, o]))
  const orderedOutcomes = OUTCOME_ORDER.map((k) => outcomesByKey.get(k)).filter((o): o is NonNullable<typeof o> => !!o)

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors mb-5"
      >
        <BackIcon className="w-4 h-4" />
        Back to Games
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-3 text-xs mb-4">
          <span className="font-semibold text-ink-muted uppercase tracking-wide">{game.sportName}</span>
          <span className="text-ink-faint">·</span>
          <span className="font-medium text-ink-faint nums">{formatFull(game.startsAt)}</span>
        </div>
        <div className="flex items-center justify-center gap-6 py-6">
          <div className="text-xl font-bold text-ink text-right flex-1">{game.homeTeam}</div>
          <div className="text-xs font-bold text-ink-faint tracking-widest shrink-0">VS</div>
          <div className="text-xl font-bold text-ink flex-1">{game.awayTeam}</div>
        </div>
      </div>

      {orderedOutcomes.length > 0 ? (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest">Model Prediction</h2>
            <SignalBadge signal={signal} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {orderedOutcomes.map((o) => {
              const isMostLikely = orderedOutcomes.every((other) => other.formAdjustedProb <= o.formAdjustedProb)
              const isRecommended = game.recommendation?.outcome === o.outcome
              const isHighlighted = game.recommendation ? isRecommended : isMostLikely
              return (
                <div
                  key={o.outcome}
                  className={`rounded-xl border p-4 flex flex-col gap-2 ${
                    isHighlighted ? "border-accent/40 bg-accent-dim/30" : "border-line bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
                      {outcomeLabel(o.outcome, game)}
                    </div>
                    {isRecommended && (
                      <div className="text-[10px] font-bold text-accent-strong uppercase tracking-wide">Pick</div>
                    )}
                    {!game.recommendation && isMostLikely && (
                      <div className="text-[10px] font-bold text-accent-strong uppercase tracking-wide">Most Likely</div>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-ink nums">
                    {(o.formAdjustedProb * 100).toFixed(1)}%
                  </div>
                  {Math.abs(o.formAdjustedProb - o.trueProb) > 0.001 && (
                    <div className="text-xs text-ink-faint nums">market {(o.trueProb * 100).toFixed(1)}%</div>
                  )}
                </div>
              )
            })}
          </div>
          {game.recommendation && !orderedOutcomes.every((other) => other.formAdjustedProb <= (outcomesByKey.get(game.recommendation!.outcome)?.formAdjustedProb ?? 0)) && (
            <p className="mt-3 text-xs text-ink-faint leading-relaxed">
              The pick isn't the most likely outcome — it's where the market price looks generous relative to the
              model's estimated chance, not necessarily what's most likely to happen.
            </p>
          )}
        </section>
      ) : (
        <div className="mb-6 text-center py-10 border border-dashed border-line rounded-xl text-ink-muted text-sm">
          Not enough odds data yet to generate a model prediction for this game.
        </div>
      )}

      {game.form && (
        <section className="mb-6">
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">
            Form ({game.form.dataPoints} result{game.form.dataPoints !== 1 ? "s" : ""} available)
          </h2>
          <div className="bg-surface rounded-xl border border-line p-5 flex flex-col gap-3">
            {game.form.homeTeamWinRate !== null && (
              <WinRateRow label={`${game.homeTeam} (home)`} rate={game.form.homeTeamWinRate} />
            )}
            {game.form.awayTeamWinRate !== null && (
              <WinRateRow label={`${game.awayTeam} (away)`} rate={game.form.awayTeamWinRate} />
            )}
            {game.form.h2hHomeWins + game.form.h2hAwayWins + game.form.h2hDraws > 0 && (
              <div className="pt-2 mt-1 border-t border-line text-xs text-ink-muted">
                Last {game.form.h2hHomeWins + game.form.h2hAwayWins + game.form.h2hDraws} head-to-head:{" "}
                <span className="text-positive font-semibold">{game.form.h2hHomeWins}W</span>{" "}
                <span className="text-ink font-semibold">{game.form.h2hDraws}D</span>{" "}
                <span className="text-risk font-semibold">{game.form.h2hAwayWins}L</span>{" "}
                <span className="text-ink-faint">(from {game.homeTeam}'s perspective)</span>
              </div>
            )}
          </div>
        </section>
      )}

      {orderedOutcomes.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">Odds &amp; Value</h2>
          <div className="rounded-xl border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-2 text-left">
                  <th className="py-2.5 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Market</th>
                  <th className="py-2.5 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Market Odds</th>
                  <th className="py-2.5 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Model Fair Odds</th>
                  <th className="py-2.5 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Value</th>
                </tr>
              </thead>
              <tbody>
                {orderedOutcomes.map((o) => (
                  <tr key={o.outcome} className="border-t border-line">
                    <td className="py-3 px-4 text-ink font-medium">{outcomeLabel(o.outcome, game)}</td>
                    <td className="py-3 px-4 nums text-ink">
                      {o.bestOdds.toFixed(2)}
                      <span className="text-ink-faint text-xs ml-1.5">
                        via {bookmakersById[o.bestBookmakerId] ?? `#${o.bestBookmakerId}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 nums text-ink">{(1 / o.formAdjustedProb).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold nums ${o.ev > 0 ? "text-positive" : "text-ink-faint"}`}>
                        {o.ev > 0 ? "+" : ""}
                        {o.ev.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">Key Signals</h2>
        <ul className="bg-surface rounded-xl border border-line p-5 flex flex-col gap-2.5">
          {signals.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-ink-muted leading-relaxed">
              <span className="text-accent shrink-0 mt-0.5">✓</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">Recommendation</h2>
        {game.recommendation ? (
          <div className="bg-positive-dim/50 border border-positive/25 rounded-xl p-5 flex flex-wrap items-center gap-3">
            <span className="text-ink font-semibold">{outcomeLabel(game.recommendation.outcome, game)}</span>
            <span className="text-ink nums font-mono">{game.recommendation.odds.toFixed(2)}</span>
            <span className="text-ink-muted text-sm">
              via {bookmakersById[game.recommendation.bookmakerId] ?? `#${game.recommendation.bookmakerId}`}
            </span>
            <span className="text-positive font-semibold nums">+{game.recommendation.ev.toFixed(1)}% EV</span>
            <span className="ml-auto text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {game.recommendation.confidence} confidence
            </span>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-xl p-5 text-ink-muted text-sm">
            No positive-EV edge found for this game — the market price looks efficient.
          </div>
        )}
      </section>
    </div>
  )
}

function WinRateRow({ label, rate }: { label: string; rate: number }) {
  const pct = Math.round(rate * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ink-muted w-40 shrink-0">{label}</span>
      <div className="flex-1 bg-surface-2 rounded-full h-2 overflow-hidden">
        <div className="h-2 bg-positive rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-ink w-10 text-right nums font-medium">{pct}%</span>
    </div>
  )
}
