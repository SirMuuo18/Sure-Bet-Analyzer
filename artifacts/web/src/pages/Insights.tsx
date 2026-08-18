import { useGames } from "../hooks/useGames"
import { classifySignal } from "../lib/signal"
import PageHeader from "../components/PageHeader"
import StatTile from "../components/StatTile"
import ErrorState from "../components/ErrorState"
import { StatTileSkeleton } from "../components/Skeletons"

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ink-muted w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-surface-2 rounded-full h-2.5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-ink font-semibold nums w-16 text-right">
        {count} <span className="text-ink-faint font-normal">({pct}%)</span>
      </span>
    </div>
  )
}

export default function Insights() {
  const { games, isLoading, isError, refetch } = useGames()

  const strong = games.filter((g) => classifySignal(g).tier === "strong").length
  const watch = games.filter((g) => classifySignal(g).tier === "watch").length
  const risk = games.filter((g) => classifySignal(g).tier === "risk").length
  const withForm = games.filter((g) => g.form !== null).length
  const avgBookmakers =
    games.length > 0 ? (games.reduce((s, g) => s + g.bookmakerCount, 0) / games.length).toFixed(1) : "0"
  const valueOps = games.filter((g) => g.recommendation && g.recommendation.ev > 0)
  const topEdges = [...valueOps].sort((a, b) => b.recommendation!.ev - a.recommendation!.ev).slice(0, 8)
  const maxEv = Math.max(1, ...topEdges.map((g) => g.recommendation!.ev))

  return (
    <div>
      <PageHeader title="Insights" subtitle="What the model is actually seeing right now, in aggregate" />

      {isError ? (
        <ErrorState title="Couldn't load insights" onRetry={() => refetch()} />
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">Model Coverage — Today</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {isLoading ? (
                <>
                  <StatTileSkeleton /><StatTileSkeleton /><StatTileSkeleton /><StatTileSkeleton />
                </>
              ) : (
                <>
                  <StatTile value={games.length} label="Games Evaluated" />
                  <StatTile value={withForm} label="With Historical Form" />
                  <StatTile value={avgBookmakers} label="Avg. Bookmakers / Game" />
                  <StatTile value={valueOps.length} label="Positive-EV Signals" tone="positive" />
                </>
              )}
            </div>
          </section>

          {!isLoading && games.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">Signal Distribution</h2>
              <div className="bg-surface rounded-xl border border-line p-5 flex flex-col gap-3.5">
                <StatusBar label="Strong" count={strong} total={games.length} color="var(--color-positive)" />
                <StatusBar label="Watch" count={watch} total={games.length} color="var(--color-watch)" />
                <StatusBar label="High Risk" count={risk} total={games.length} color="var(--color-risk)" />
              </div>
            </section>
          )}

          {!isLoading && topEdges.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">Top Expected-Value Edges</h2>
              <div className="bg-surface rounded-xl border border-line p-5 flex flex-col gap-3">
                {topEdges.map((g) => (
                  <div key={g.eventId} className="flex items-center gap-3">
                    <span className="text-xs text-ink-muted w-40 shrink-0 truncate">
                      {g.homeTeam} v {g.awayTeam}
                    </span>
                    <div className="flex-1 bg-surface-2 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${(g.recommendation!.ev / maxEv) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-positive font-semibold nums w-14 text-right">
                      +{g.recommendation!.ev.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3">Prediction Accuracy History</h2>
            <div className="text-center py-12 px-6 border border-dashed border-line rounded-xl">
              <div className="text-ink text-base font-semibold mb-1.5">Not tracked yet</div>
              <div className="text-ink-muted text-sm max-w-md mx-auto leading-relaxed">
                Accuracy tracking requires logging each prediction at kickoff and comparing it against the final
                result over time. That history doesn't exist yet — we won't show a number we haven't earned.
                Historical match results are already being collected via <span className="text-ink font-medium">Fetch History</span> on
                the Games page, which is the first step toward this.
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
