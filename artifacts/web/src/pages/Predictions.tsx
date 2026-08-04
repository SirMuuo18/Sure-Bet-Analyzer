import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  getPredictions,
  getBookmakers,
  fetchResults,
  type Prediction,
  type OutcomePrediction,
  type TeamForm,
} from "../api"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

function EVBadge({ ev }: { ev: number }) {
  const positive = ev > 0
  const sign = positive ? "+" : ""
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
        positive
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/20 text-red-400"
      }`}
    >
      {sign}{ev.toFixed(1)}%
    </span>
  )
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const styles = {
    high: "bg-green-600/30 text-green-300 border border-green-600/40",
    medium: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    low: "bg-gray-700 text-gray-300 border border-gray-600",
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${styles[confidence]}`}>
      {confidence}
    </span>
  )
}

const OUTCOME_LABELS: Record<string, string> = {
  home: "Home",
  draw: "Draw",
  away: "Away",
}

function WinRateBar({ label, rate }: { label: string; rate: number | null }) {
  if (rate === null) return null
  const pct = Math.round(rate * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-32 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 bg-green-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-300 w-10 text-right">{pct}%</span>
    </div>
  )
}

function TeamFormSection({ form, homeTeam, awayTeam }: { form: TeamForm; homeTeam: string; awayTeam: string }) {
  const { h2hHomeWins, h2hAwayWins, h2hDraws } = form
  const h2hTotal = h2hHomeWins + h2hAwayWins + h2hDraws

  return (
    <div className="mx-4 mb-4 bg-gray-800/50 rounded-lg p-4 border border-gray-700/40">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        Team Form ({form.dataPoints} result{form.dataPoints !== 1 ? "s" : ""} available)
      </div>
      <div className="flex flex-col gap-2">
        <WinRateBar
          label={`${homeTeam} (home)`}
          rate={form.homeTeamWinRate}
        />
        <WinRateBar
          label={`${awayTeam} (away)`}
          rate={form.awayTeamWinRate}
        />
      </div>
      {h2hTotal > 0 && (
        <div className="mt-3 text-xs text-gray-400">
          Last {h2hTotal} H2H:{" "}
          <span className="text-green-400 font-semibold">{h2hHomeWins}W</span>{" "}
          <span className="text-gray-300 font-semibold">{h2hDraws}D</span>{" "}
          <span className="text-red-400 font-semibold">{h2hAwayWins}L</span>{" "}
          <span className="text-gray-600">(from {homeTeam} perspective)</span>
        </div>
      )}
    </div>
  )
}

function OutcomeColumn({
  outcome,
  bookmakersMap,
}: {
  outcome: OutcomePrediction
  bookmakersMap: Record<number, string>
}) {
  const bookmakerName = bookmakersMap[outcome.bestBookmakerId] ?? `#${outcome.bestBookmakerId}`
  const displayProb = outcome.formAdjustedProb ?? outcome.trueProb
  return (
    <div className="flex-1 min-w-0 bg-gray-800/60 rounded-lg p-4 flex flex-col gap-2">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {OUTCOME_LABELS[outcome.outcome]}
      </div>
      <div className="text-xl font-bold text-white">
        {(displayProb * 100).toFixed(1)}%
      </div>
      {outcome.formAdjustedProb !== outcome.trueProb && (
        <div className="text-xs text-gray-500">
          market: {(outcome.trueProb * 100).toFixed(1)}%
        </div>
      )}
      <div className="text-sm text-gray-300">
        <span className="font-mono font-medium">{outcome.bestOdds.toFixed(2)}</span>
        <span className="text-gray-500 text-xs ml-1">odds</span>
      </div>
      <EVBadge ev={outcome.ev} />
      <div className="text-xs text-gray-500 truncate">{bookmakerName}</div>
    </div>
  )
}

function PredictionCard({
  prediction,
  bookmakersMap,
}: {
  prediction: Prediction
  bookmakersMap: Record<number, string>
}) {
  const rec = prediction.recommendation
  const recBookmaker = rec ? (bookmakersMap[rec.bookmakerId] ?? `#${rec.bookmakerId}`) : null

  const recBg = rec
    ? rec.ev > 3
      ? "bg-green-700/30 border border-green-600/40"
      : "bg-green-900/20 border border-green-800/40"
    : "bg-gray-800/40 border border-gray-700/40"

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Event header */}
      <div className="px-5 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-white">
              {prediction.homeTeam} vs {prediction.awayTeam}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{formatDate(prediction.startsAt)}</div>
          </div>
          <div className="flex items-center gap-3">
            {prediction.form && (
              <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                form-adjusted
              </span>
            )}
            <div className="text-xs text-gray-600 shrink-0">
              {prediction.bookmakerCount} bookmaker{prediction.bookmakerCount !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Outcome columns */}
      <div className="p-4 flex gap-3">
        {prediction.outcomes.map((o) => (
          <OutcomeColumn key={o.outcome} outcome={o} bookmakersMap={bookmakersMap} />
        ))}
      </div>

      {/* Team Form */}
      {prediction.form && (
        <TeamFormSection
          form={prediction.form}
          homeTeam={prediction.homeTeam}
          awayTeam={prediction.awayTeam}
        />
      )}

      {/* Recommendation */}
      <div className={`mx-4 mb-4 rounded-lg p-4 ${recBg}`}>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          Recommended Bet
        </div>
        {rec ? (
          <div className="flex items-center flex-wrap gap-3">
            <span className="text-white font-semibold text-sm">
              {OUTCOME_LABELS[rec.outcome]}
            </span>
            <span className="text-green-400 font-mono font-medium text-sm">
              {rec.odds.toFixed(2)}
            </span>
            <span className="text-gray-400 text-xs">via {recBookmaker}</span>
            <EVBadge ev={rec.ev} />
            <ConfidenceBadge confidence={rec.confidence} />
          </div>
        ) : (
          <div className="text-gray-500 text-sm">No value edge found for this event</div>
        )}
      </div>
    </div>
  )
}

export default function Predictions() {
  const qc = useQueryClient()
  const [msg, setMsg] = useState<{ text: string; type: "success" | "warn" | "error" } | null>(null)

  function showMsg(text: string, type: "success" | "warn" | "error") {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 6000)
  }

  const { data: predictions = [], isLoading } = useQuery({
    queryKey: ["predictions"],
    queryFn: getPredictions,
    refetchInterval: 60_000,
  })

  const { data: bookmakers = [] } = useQuery({
    queryKey: ["bookmakers"],
    queryFn: getBookmakers,
  })

  const fetchResultsMutation = useMutation({
    mutationFn: fetchResults,
    onSuccess: (data) => {
      if ("error" in data) {
        showMsg("Configure ODDS_API_KEY in Vercel to fetch match history", "warn")
      } else {
        qc.invalidateQueries({ queryKey: ["predictions"] })
        showMsg(`${data.resultsStored} historical result${data.resultsStored !== 1 ? "s" : ""} loaded`, "success")
      }
    },
    onError: () => showMsg("Failed to fetch historical results.", "error"),
  })

  const bookmakersMap: Record<number, string> = {}
  for (const bk of bookmakers) {
    bookmakersMap[bk.id] = bk.name
  }

  const msgColors = {
    success: "bg-green-500/20 text-green-300 border-green-500/30",
    warn: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    error: "bg-red-500/20 text-red-300 border-red-500/30",
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Predictions</h2>
          <p className="text-gray-500 text-sm mt-1">
            Value bets based on market consensus analysis
          </p>
        </div>
        <button
          onClick={() => fetchResultsMutation.mutate()}
          disabled={fetchResultsMutation.isPending}
          className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm"
        >
          {fetchResultsMutation.isPending ? "Fetching…" : "Fetch History"}
        </button>
      </div>

      {msg && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-sm font-medium border ${msgColors[msg.type]}`}>
          {msg.text}
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-500 py-12 text-center">Loading…</div>
      ) : predictions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-xl">
          <div className="text-gray-500 text-lg mb-2">No predictions available</div>
          <div className="text-gray-600 text-sm">
            No events with odds yet. Click{" "}
            <strong className="text-gray-400">Fetch Real Odds</strong> on the Opportunities page.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {predictions.map((p) => (
            <PredictionCard key={p.eventId} prediction={p} bookmakersMap={bookmakersMap} />
          ))}
        </div>
      )}
    </div>
  )
}
