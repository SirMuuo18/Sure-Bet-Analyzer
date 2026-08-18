import { useState } from "react"
import { useGames, type Game } from "../hooks/useGames"
import { classifySignal, outcomeLabel } from "../lib/signal"
import PageHeader from "../components/PageHeader"
import SignalBadge from "../components/SignalBadge"
import EmptyState from "../components/EmptyState"
import ErrorState from "../components/ErrorState"
import { TableSkeleton } from "../components/Skeletons"
import MatchDetail from "../components/MatchDetail"
import DataFreshness from "../components/DataFreshness"

export default function Value() {
  const { games, bookmakersById, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useGames()
  const [selected, setSelected] = useState<Game | null>(null)

  if (selected) {
    return <MatchDetail game={selected} bookmakersById={bookmakersById} onBack={() => setSelected(null)} />
  }

  const valueOps = games
    .filter((g) => g.recommendation && g.recommendation.ev > 0)
    .sort((a, b) => b.recommendation!.ev - a.recommendation!.ev)

  return (
    <div>
      <PageHeader
        title="Value"
        subtitle="Where the model's fair-odds view diverges from the market price — evaluated mathematically, not by hunch"
        actions={<DataFreshness updatedAt={dataUpdatedAt} isFetching={isFetching} />}
      />

      {isError ? (
        <ErrorState title="Couldn't load value opportunities" onRetry={() => refetch()} />
      ) : isLoading ? (
        <TableSkeleton />
      ) : valueOps.length === 0 ? (
        <EmptyState
          title="No value opportunities right now"
          description={`${games.length} game${games.length !== 1 ? "s" : ""} evaluated — none currently show a positive expected-value edge against the market.`}
        />
      ) : (
        <>
          <p className="text-xs text-ink-faint mb-4">
            {valueOps.length} value opportunit{valueOps.length !== 1 ? "ies" : "y"} across {games.length} games evaluated
          </p>

          {/* Desktop table */}
          <div className="hidden lg:block rounded-lg border border-line overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-surface-2 text-left">
                  <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Match</th>
                  <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Market</th>
                  <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Market Odds</th>
                  <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Model Probability</th>
                  <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Model Fair Odds</th>
                  <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Signal</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {valueOps.map((g) => {
                  const rec = g.recommendation!
                  const outcome = g.outcomes.find((o) => o.outcome === rec.outcome)!
                  return (
                    <tr key={g.eventId} className="border-t border-line hover:bg-surface-2/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-ink">{g.homeTeam} vs {g.awayTeam}</td>
                      <td className="py-3 px-4 text-ink-muted">{outcomeLabel(rec.outcome, g)}</td>
                      <td className="py-3 px-4 nums text-ink">
                        {rec.odds.toFixed(2)}
                        <span className="text-ink-faint text-xs ml-1.5">
                          {bookmakersById[rec.bookmakerId] ?? `#${rec.bookmakerId}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 nums text-ink">{(outcome.formAdjustedProb * 100).toFixed(1)}%</td>
                      <td className="py-3 px-4 nums text-ink">{(1 / outcome.formAdjustedProb).toFixed(2)}</td>
                      <td className="py-3 px-4"><SignalBadge signal={classifySignal(g)} /></td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelected(g)}
                          className="text-xs font-semibold text-accent-strong hover:text-accent"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="lg:hidden flex flex-col gap-3">
            {valueOps.map((g) => {
              const rec = g.recommendation!
              const outcome = g.outcomes.find((o) => o.outcome === rec.outcome)!
              return (
                <button
                  key={g.eventId}
                  onClick={() => setSelected(g)}
                  className="text-left bg-surface border border-line rounded-xl p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-ink text-sm">{g.homeTeam} vs {g.awayTeam}</div>
                    <SignalBadge signal={classifySignal(g)} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-ink-faint mb-0.5">Market</div>
                      <div className="text-ink font-medium">{outcomeLabel(rec.outcome, g)}</div>
                    </div>
                    <div>
                      <div className="text-ink-faint mb-0.5">Odds</div>
                      <div className="text-ink font-medium nums">{rec.odds.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-ink-faint mb-0.5">Model</div>
                      <div className="text-ink font-medium nums">{(outcome.formAdjustedProb * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
