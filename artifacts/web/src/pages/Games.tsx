import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useGames, type Game } from "../hooks/useGames"
import { fetchResults, fetchRealOdds, apiErrorMessage } from "../api"
import { useAdminAuth } from "../hooks/useAdminAuth"
import GameCard from "../components/GameCard"
import MatchDetail from "../components/MatchDetail"
import PageHeader from "../components/PageHeader"
import EmptyState from "../components/EmptyState"
import ErrorState from "../components/ErrorState"
import DataFreshness from "../components/DataFreshness"
import { GameGridSkeleton, TableSkeleton } from "../components/Skeletons"
import { classifySignal, outcomeLabel } from "../lib/signal"
import SignalBadge from "../components/SignalBadge"
import { RefreshIcon } from "../components/icons"

type ViewMode = "grid" | "feed"
type TimeFilter = "all" | "today" | "tomorrow" | "date"
type SignalFilter = "all" | "strong" | "watch" | "risk"

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString()
}
function isTomorrow(iso: string) {
  const t = new Date()
  t.setDate(t.getDate() + 1)
  return new Date(iso).toDateString() === t.toDateString()
}
function isOnDate(iso: string, ymd: string) {
  if (!ymd) return true
  const [y, m, d] = ymd.split("-").map(Number)
  const picked = new Date(y, m - 1, d)
  return new Date(iso).toDateString() === picked.toDateString()
}
function todayYmd() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
        active
          ? "bg-accent-dim border-accent/40 text-accent-strong"
          : "bg-surface border-line text-ink-muted hover:text-ink hover:border-line-strong"
      }`}
    >
      {children}
    </button>
  )
}

export default function Games() {
  const qc = useQueryClient()
  const { isAdmin } = useAdminAuth()
  const { games, bookmakersById, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useGames()
  const [view, setView] = useState<ViewMode>("grid")
  const [sport, setSport] = useState<string>("all")
  const [time, setTime] = useState<TimeFilter>("all")
  const [pickedDate, setPickedDate] = useState<string>(todayYmd())
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("all")
  const [selected, setSelected] = useState<Game | null>(null)
  const [msg, setMsg] = useState<{ text: string; type: "success" | "warn" | "error" } | null>(null)

  function showMsg(text: string, type: "success" | "warn" | "error") {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 6000)
  }

  const fetchHistoryMutation = useMutation({
    mutationFn: fetchResults,
    onSuccess: (data) => {
      if ("error" in data) {
        showMsg("Configure ODDS_API_KEY in Vercel to fetch match history", "warn")
      } else {
        qc.invalidateQueries({ queryKey: ["predictions"] })
        showMsg(`${data.resultsStored} historical result${data.resultsStored !== 1 ? "s" : ""} loaded`, "success")
      }
    },
    onError: (e) => showMsg(apiErrorMessage(e), "error"),
  })

  const updateMatchesMutation = useMutation({
    mutationFn: fetchRealOdds,
    onSuccess: (data) => {
      if ("error" in data) {
        showMsg("Configure ODDS_API_KEY in Vercel to update matches", "warn")
      } else {
        qc.invalidateQueries({ queryKey: ["predictions"] })
        qc.invalidateQueries({ queryKey: ["events"] })
        qc.invalidateQueries({ queryKey: ["sports"] })
        showMsg(`Updated — ${data.eventsProcessed} matches, ${data.oddsStored} odds refreshed`, "success")
      }
    },
    onError: (e) => showMsg(apiErrorMessage(e), "error"),
  })

  const sports = useMemo(() => Array.from(new Set(games.map((g) => g.sportName))), [games])

  const filtered = games.filter((g) => {
    if (sport !== "all" && g.sportName !== sport) return false
    if (time === "today" && !isToday(g.startsAt)) return false
    if (time === "tomorrow" && !isTomorrow(g.startsAt)) return false
    if (time === "date" && !isOnDate(g.startsAt, pickedDate)) return false
    if (signalFilter !== "all" && classifySignal(g).tier !== signalFilter) return false
    return true
  })

  if (selected) {
    return <MatchDetail game={selected} bookmakersById={bookmakersById} onBack={() => setSelected(null)} />
  }

  return (
    <div>
      <PageHeader
        title="Games"
        subtitle="Browse today's games, or switch to Feed for a filterable signal scan"
        actions={
          <>
            <DataFreshness updatedAt={dataUpdatedAt} isFetching={isFetching} />
            {isAdmin && (
              <>
                <button
                  onClick={() => updateMatchesMutation.mutate()}
                  disabled={updateMatchesMutation.isPending}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-strong disabled:opacity-50 text-canvas text-xs font-semibold rounded-lg transition-colors"
                >
                  <RefreshIcon className={`w-3.5 h-3.5 ${updateMatchesMutation.isPending ? "animate-spin" : ""}`} />
                  {updateMatchesMutation.isPending ? "Updating…" : "Update Matches"}
                </button>
                <button
                  onClick={() => fetchHistoryMutation.mutate()}
                  disabled={fetchHistoryMutation.isPending}
                  className="px-3.5 py-2 bg-surface hover:bg-surface-2 disabled:opacity-50 border border-line text-ink text-xs font-semibold rounded-lg transition-colors"
                >
                  {fetchHistoryMutation.isPending ? "Fetching…" : "Fetch History"}
                </button>
              </>
            )}
            <div className="flex bg-surface border border-line rounded-lg p-1">
              <button
                onClick={() => setView("grid")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  view === "grid" ? "bg-surface-2 text-ink" : "text-ink-muted"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setView("feed")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  view === "feed" ? "bg-surface-2 text-ink" : "text-ink-muted"
                }`}
              >
                Feed
              </button>
            </div>
          </>
        }
      />

      {msg && (
        <div
          className={`mb-5 px-4 py-3 rounded-lg text-sm font-medium border ${
            msg.type === "success"
              ? "bg-positive-dim text-positive border-positive/30"
              : msg.type === "warn"
                ? "bg-watch-dim text-watch border-watch/30"
                : "bg-risk-dim text-risk border-risk/30"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <FilterChip active={sport === "all"} onClick={() => setSport("all")}>All Sports</FilterChip>
        {sports.map((s) => (
          <FilterChip key={s} active={sport === s} onClick={() => setSport(s)}>{s}</FilterChip>
        ))}
        <span className="w-px bg-line mx-1 my-1" />
        <FilterChip active={time === "all"} onClick={() => setTime("all")}>Any Time</FilterChip>
        <FilterChip active={time === "today"} onClick={() => setTime("today")}>Today</FilterChip>
        <FilterChip active={time === "tomorrow"} onClick={() => setTime("tomorrow")}>Tomorrow</FilterChip>
        <label
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border cursor-pointer ${
            time === "date"
              ? "bg-accent-dim border-accent/40 text-accent-strong"
              : "bg-surface border-line text-ink-muted hover:text-ink hover:border-line-strong"
          }`}
        >
          Pick date
          <input
            type="date"
            value={pickedDate}
            onChange={(e) => {
              setPickedDate(e.target.value)
              setTime("date")
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent text-xs outline-none w-[110px] cursor-pointer [color-scheme:inherit]"
          />
        </label>
        <span className="w-px bg-line mx-1 my-1" />
        <FilterChip active={signalFilter === "all"} onClick={() => setSignalFilter("all")}>All Signals</FilterChip>
        <FilterChip active={signalFilter === "strong"} onClick={() => setSignalFilter("strong")}>Strong</FilterChip>
        <FilterChip active={signalFilter === "watch"} onClick={() => setSignalFilter("watch")}>Watch</FilterChip>
        <FilterChip active={signalFilter === "risk"} onClick={() => setSignalFilter("risk")}>High Risk</FilterChip>
      </div>

      {isError ? (
        <ErrorState title="Couldn't load today's games" onRetry={() => refetch()} />
      ) : isLoading ? (
        view === "grid" ? <GameGridSkeleton /> : <TableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No games available"
          description="There are no games matching your current filters. Try resetting them, or fetch fresh odds from Arbitrage."
          action={
            <button
              onClick={() => {
                setSport("all")
                setTime("all")
                setSignalFilter("all")
              }}
              className="px-4 py-2 bg-surface-2 hover:bg-surface-hover border border-line text-ink text-sm font-medium rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => (
            <GameCard key={g.eventId} game={g} onView={setSelected} />
          ))}
        </div>
      ) : (
        <FeedTable games={filtered} onView={setSelected} />
      )}
    </div>
  )
}

function FeedTable({ games, onView }: { games: Game[]; onView: (g: Game) => void }) {
  return (
    <div className="rounded-lg border border-line overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="bg-surface-2 text-left">
            <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Match</th>
            <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Model View</th>
            <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Probability</th>
            <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wide">Signal</th>
            <th className="py-3 px-4" />
          </tr>
        </thead>
        <tbody>
          {games.map((g) => {
            const rec = g.recommendation
            const lead = rec
              ? g.outcomes.find((o) => o.outcome === rec.outcome)
              : [...g.outcomes].sort((a, b) => b.formAdjustedProb - a.formAdjustedProb)[0]
            return (
              <tr key={g.eventId} className="border-t border-line hover:bg-surface-2/40 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-medium text-ink">{g.homeTeam} vs {g.awayTeam}</div>
                  <div className="text-xs text-ink-faint mt-0.5">{new Date(g.startsAt).toLocaleString()}</div>
                </td>
                <td className="py-3 px-4 text-ink-muted">{lead ? outcomeLabel(lead.outcome, g) : "—"}</td>
                <td className="py-3 px-4 nums text-ink font-medium">
                  {lead ? `${(lead.formAdjustedProb * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="py-3 px-4"><SignalBadge signal={classifySignal(g)} /></td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onView(g)}
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
  )
}
