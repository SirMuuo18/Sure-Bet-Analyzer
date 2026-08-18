import { useState } from "react"
import { useGames, type Game } from "../hooks/useGames"
import { classifySignal, outcomeLabel } from "../lib/signal"
import StatTile from "../components/StatTile"
import GameCard from "../components/GameCard"
import MatchDetail from "../components/MatchDetail"
import EmptyState from "../components/EmptyState"
import ErrorState from "../components/ErrorState"
import { GameGridSkeleton, StatTileSkeleton } from "../components/Skeletons"
import DataFreshness from "../components/DataFreshness"

export default function Home({ onViewAllGames }: { onViewAllGames: () => void }) {
  const { games, bookmakersById, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useGames()
  const [selected, setSelected] = useState<Game | null>(null)

  if (selected) {
    return <MatchDetail game={selected} bookmakersById={bookmakersById} onBack={() => setSelected(null)} />
  }

  const strong = games.filter((g) => classifySignal(g).tier === "strong")
  const risk = games.filter((g) => classifySignal(g).tier === "risk")
  const valueOps = games.filter((g) => g.recommendation && g.recommendation.ev > 0)
  const edge = [...valueOps].sort((a, b) => (b.recommendation!.ev) - (a.recommendation!.ev)).slice(0, 5)

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Today's Game Intelligence</h1>
          <p className="text-ink-muted text-sm mt-1">
            A probabilistic read on today's fixtures — not a promise of outcomes.
          </p>
        </div>
        <DataFreshness updatedAt={dataUpdatedAt} isFetching={isFetching} />
      </div>

      {isError ? (
        <ErrorState title="Couldn't load today's game intelligence" onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {isLoading ? (
              <>
                <StatTileSkeleton />
                <StatTileSkeleton />
                <StatTileSkeleton />
                <StatTileSkeleton />
              </>
            ) : (
              <>
                <StatTile value={games.length} label="Games Analysed" />
                <StatTile value={strong.length} label="Strong Signals" tone="positive" />
                <StatTile value={valueOps.length} label="Value Opportunities" tone="positive" />
                <StatTile value={risk.length} label="High-Risk Games" tone="risk" />
              </>
            )}
          </div>

          <section className="mb-10">
            <h2 className="text-lg font-bold text-ink tracking-tight mb-1">Today's Edge</h2>
            <p className="text-ink-muted text-sm mb-4">The strongest model signals available right now, ranked by expected value.</p>

            {isLoading ? (
              <GameGridSkeleton count={3} />
            ) : edge.length === 0 ? (
              <EmptyState
                title="No strong signals yet"
                description="No positive-EV predictions are available right now. Fetch fresh odds from the Arbitrage page to get started."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {edge.map((g, i) => {
                  const rec = g.recommendation!
                  return (
                    <button
                      key={g.eventId}
                      onClick={() => setSelected(g)}
                      className="w-full text-left bg-surface hover:border-line-strong border border-line rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="text-2xl font-bold text-ink-faint nums shrink-0 w-8">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">
                            {g.homeTeam} vs {g.awayTeam}
                          </div>
                          <div className="text-sm text-ink-muted mt-0.5">{outcomeLabel(rec.outcome, g)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end shrink-0 pl-11 sm:pl-0">
                        <div className="text-sm font-semibold text-ink nums">
                          {Math.round((g.outcomes.find((o) => o.outcome === rec.outcome)?.formAdjustedProb ?? 0) * 100)}% probability
                        </div>
                        <div className="text-xs text-positive font-semibold nums sm:mt-0.5">+{rec.ev.toFixed(1)}% EV</div>
                      </div>
                      <span className="text-accent-strong text-sm font-semibold shrink-0 hidden sm:inline">View →</span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-end justify-between gap-4 mb-1">
              <h2 className="text-lg font-bold text-ink tracking-tight">All Games</h2>
              {!isLoading && games.length > 6 && (
                <button
                  onClick={onViewAllGames}
                  className="text-xs font-semibold text-accent-strong hover:text-accent shrink-0"
                >
                  View all {games.length} →
                </button>
              )}
            </div>
            <p className="text-ink-muted text-sm mb-4">Every fixture the model currently has enough data to assess.</p>
            {isLoading ? (
              <GameGridSkeleton />
            ) : games.length === 0 ? (
              <EmptyState
                title="No games available"
                description="No events with odds yet. Head to Arbitrage and fetch real odds, or load demo data to explore the app."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.slice(0, 6).map((g) => (
                  <GameCard key={g.eventId} game={g} onView={setSelected} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
