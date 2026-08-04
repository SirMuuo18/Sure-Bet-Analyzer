import { useQuery } from "@tanstack/react-query"
import { getPredictions, getBookmakers, type Prediction, type OutcomePrediction } from "../api"

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

function OutcomeColumn({
  outcome,
  bookmakersMap,
}: {
  outcome: OutcomePrediction
  bookmakersMap: Record<number, string>
}) {
  const bookmakerName = bookmakersMap[outcome.bestBookmakerId] ?? `#${outcome.bestBookmakerId}`
  return (
    <div className="flex-1 min-w-0 bg-gray-800/60 rounded-lg p-4 flex flex-col gap-2">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {OUTCOME_LABELS[outcome.outcome]}
      </div>
      <div className="text-xl font-bold text-white">
        {(outcome.trueProb * 100).toFixed(1)}%
      </div>
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
          <div className="text-xs text-gray-600 shrink-0">
            {prediction.bookmakerCount} bookmaker{prediction.bookmakerCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Outcome columns */}
      <div className="p-4 flex gap-3">
        {prediction.outcomes.map((o) => (
          <OutcomeColumn key={o.outcome} outcome={o} bookmakersMap={bookmakersMap} />
        ))}
      </div>

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
  const { data: predictions = [], isLoading } = useQuery({
    queryKey: ["predictions"],
    queryFn: getPredictions,
    refetchInterval: 60_000,
  })

  const { data: bookmakers = [] } = useQuery({
    queryKey: ["bookmakers"],
    queryFn: getBookmakers,
  })

  const bookmakersMap: Record<number, string> = {}
  for (const bk of bookmakers) {
    bookmakersMap[bk.id] = bk.name
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Predictions</h2>
        <p className="text-gray-500 text-sm mt-1">
          Value bets based on market consensus analysis
        </p>
      </div>

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
