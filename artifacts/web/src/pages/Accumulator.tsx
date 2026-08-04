import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  getPredictions,
  getBookmakers,
  buildAccumulator,
  type Prediction,
  type AccumulatorResult,
} from "../api"

// ─── Types ────────────────────────────────────────────────────────────────────

type Outcome = "home" | "draw" | "away"

interface SelectedPick {
  eventId: number
  homeTeam: string
  awayTeam: string
  outcome: Outcome
  bestOdds: number
  bestBookmakerId: number
  trueProb: number
  ev: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OUTCOME_LABELS: Record<Outcome, string> = {
  home: "Home Win",
  draw: "Draw",
  away: "Away Win",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function outcomeColor(outcome: Outcome) {
  if (outcome === "home") return "text-blue-400"
  if (outcome === "draw") return "text-yellow-400"
  return "text-purple-400"
}

// Live math computed in the browser (mirrors backend Kelly formula)
function computeLiveStats(picks: SelectedPick[], bankroll: number) {
  if (picks.length === 0) return null
  const combinedOdds = picks.reduce((acc, p) => acc * p.bestOdds, 1)
  const combinedProb = picks.reduce((acc, p) => acc * p.trueProb, 1)
  const evDecimal = combinedProb * combinedOdds - 1
  const ev = evDecimal * 100
  const kellyFraction = Math.max(0, Math.min(0.25, evDecimal / (combinedOdds - 1)))
  const recommendedStake = bankroll * kellyFraction
  const potentialReturn = recommendedStake * combinedOdds
  const potentialProfit = potentialReturn - recommendedStake
  return {
    combinedOdds,
    combinedProb,
    ev,
    kellyFraction,
    recommendedStake,
    potentialReturn,
    potentialProfit,
    isValueBet: ev > 0,
  }
}

// ─── PickCard (Available Picks list) ─────────────────────────────────────────

function PickCard({
  prediction,
  bookmakersMap,
  selectedOutcome,
  onAdd,
  onRemove,
}: {
  prediction: Prediction
  bookmakersMap: Record<number, string>
  selectedOutcome: Outcome | null
  onAdd: (pick: SelectedPick) => void
  onRemove: (eventId: number) => void
}) {
  const rec = prediction.recommendation
  if (!rec || rec.ev <= 0) return null

  const outcome = rec.outcome as Outcome
  const trueProbOutcome = prediction.outcomes.find((o) => o.outcome === outcome)
  const trueProb = trueProbOutcome?.trueProb ?? 0
  const isSelected = selectedOutcome !== null

  return (
    <div
      className={`rounded-xl border transition-all ${
        isSelected
          ? "bg-green-900/20 border-green-600/50"
          : "bg-gray-900 border-gray-800 hover:border-gray-700"
      }`}
    >
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {prediction.homeTeam} vs {prediction.awayTeam}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{formatDate(prediction.startsAt)}</div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs font-semibold ${outcomeColor(outcome)}`}>
              {OUTCOME_LABELS[outcome]}
            </span>
            <span className="text-gray-400 text-xs font-mono font-medium">
              {rec.odds.toFixed(2)}
            </span>
            <span className="text-xs text-gray-500">
              {(trueProb * 100).toFixed(1)}% prob
            </span>
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400"
            >
              +{rec.ev.toFixed(1)}% EV
            </span>
            <span className="text-xs text-gray-600 truncate">
              {bookmakersMap[rec.bookmakerId] ?? `#${rec.bookmakerId}`}
            </span>
          </div>
        </div>
        <div className="shrink-0 mt-1">
          {isSelected ? (
            <button
              onClick={() => onRemove(prediction.eventId)}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-900/40 text-red-400 border border-red-800/50 hover:bg-red-900/60 transition-colors font-medium"
            >
              Remove
            </button>
          ) : (
            <button
              onClick={() =>
                onAdd({
                  eventId: prediction.eventId,
                  homeTeam: prediction.homeTeam,
                  awayTeam: prediction.awayTeam,
                  outcome,
                  bestOdds: rec.odds,
                  bestBookmakerId: rec.bookmakerId,
                  trueProb,
                  ev: rec.ev,
                })
              }
              className="text-xs px-3 py-1.5 rounded-lg bg-green-700/30 text-green-300 border border-green-700/40 hover:bg-green-700/50 transition-colors font-medium"
            >
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── BetSlip ──────────────────────────────────────────────────────────────────

function BetSlip({
  picks,
  onRemove,
  bookmakersMap,
}: {
  picks: SelectedPick[]
  onRemove: (eventId: number) => void
  bookmakersMap: Record<number, string>
}) {
  const [bankroll, setBankroll] = useState(1000)
  const [result, setResult] = useState<AccumulatorResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const liveStats = useMemo(() => computeLiveStats(picks, bankroll), [picks, bankroll])

  async function handleBuild() {
    if (picks.length < 2) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await buildAccumulator({
        selections: picks.map((p) => ({ eventId: p.eventId, outcome: p.outcome })),
        bankroll,
      })
      setResult(res)
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to build accumulator"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const display = result ?? liveStats

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <h3 className="text-base font-bold text-white">Bet Slip</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {picks.length === 0
            ? "Add picks from the left panel"
            : `${picks.length} selection${picks.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Selected picks */}
      {picks.length === 0 ? (
        <div className="px-5 py-8 text-center text-gray-600 text-sm">
          No picks selected yet
        </div>
      ) : (
        <div className="px-4 py-3 space-y-2 border-b border-gray-800">
          {picks.map((p) => (
            <div
              key={p.eventId}
              className="flex items-center justify-between gap-2 py-1.5"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">
                  {p.homeTeam} vs {p.awayTeam}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-xs font-semibold ${outcomeColor(p.outcome)}`}>
                    {OUTCOME_LABELS[p.outcome]}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">{p.bestOdds.toFixed(2)}</span>
                  <span className="text-xs text-gray-600">
                    {bookmakersMap[p.bestBookmakerId] ?? `#${p.bestBookmakerId}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemove(p.eventId)}
                className="text-gray-600 hover:text-red-400 transition-colors text-sm shrink-0 px-1"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {display && picks.length >= 1 && (
        <div className="px-5 py-4 space-y-3 border-b border-gray-800">
          {/* EV badge */}
          <div className="flex justify-center">
            {display.ev > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 font-semibold text-sm">
                VALUE ACCA ✓ &nbsp; +{display.ev.toFixed(2)}% EV
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold text-sm">
                ⚠ Low Edge — consider removing weak picks
              </span>
            )}
          </div>

          {/* Combined stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/60 rounded-lg px-3 py-2.5">
              <div className="text-xs text-gray-500 mb-1">Combined Odds</div>
              <div className="text-xl font-bold text-white">
                {display.combinedOdds.toFixed(2)}x
              </div>
            </div>
            <div className="bg-gray-800/60 rounded-lg px-3 py-2.5">
              <div className="text-xs text-gray-500 mb-1">Combined Prob</div>
              <div className="text-xl font-bold text-white">
                {(display.combinedProb * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bankroll + stake */}
      {picks.length >= 1 && (
        <div className="px-5 py-4 space-y-3 border-b border-gray-800">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Bankroll (KES)</label>
            <input
              type="number"
              min={100}
              step={100}
              value={bankroll}
              onChange={(e) => {
                setBankroll(Number(e.target.value))
                setResult(null)
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-600"
            />
          </div>

          {display && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Kelly Stake</span>
                <span className="text-sm font-semibold text-white">
                  KES {display.recommendedStake.toFixed(2)}
                  <span className="text-xs text-gray-500 ml-1">
                    ({(display.kellyFraction * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Potential Return</span>
                <span className="text-sm font-medium text-gray-200">
                  KES {display.potentialReturn.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Potential Profit</span>
                <span
                  className={`text-sm font-semibold ${
                    display.potentialProfit >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  KES {display.potentialProfit.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Build button */}
      <div className="px-5 py-4">
        <button
          onClick={handleBuild}
          disabled={picks.length < 2 || loading}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${
            picks.length < 2
              ? "bg-gray-800 text-gray-600 cursor-not-allowed"
              : loading
              ? "bg-green-700/50 text-green-400 cursor-wait"
              : "bg-green-600 hover:bg-green-500 text-white active:scale-[0.98]"
          }`}
        >
          {loading ? "Building…" : "BUILD ACCUMULATOR"}
        </button>
        {picks.length < 2 && picks.length > 0 && (
          <p className="text-center text-xs text-gray-600 mt-2">Add at least 2 picks</p>
        )}
        {error && (
          <p className="text-center text-xs text-red-400 mt-2">{error}</p>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Accumulator() {
  const [selectedPicks, setSelectedPicks] = useState<SelectedPick[]>([])

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

  // Only show predictions that have a positive EV recommendation
  const valuePredictions = predictions.filter(
    (p) => p.recommendation && p.recommendation.ev > 0,
  )

  const selectedEventIds = new Set(selectedPicks.map((p) => p.eventId))

  function addPick(pick: SelectedPick) {
    setSelectedPicks((prev) =>
      prev.some((p) => p.eventId === pick.eventId) ? prev : [...prev, pick],
    )
  }

  function removePick(eventId: number) {
    setSelectedPicks((prev) => prev.filter((p) => p.eventId !== eventId))
  }

  function handleSmartAcca() {
    const allPicks: SelectedPick[] = valuePredictions
      .map((pred) => {
        const rec = pred.recommendation!
        const outcome = rec.outcome as Outcome
        const trueOutcome = pred.outcomes.find((o) => o.outcome === outcome)
        return {
          eventId: pred.eventId,
          homeTeam: pred.homeTeam,
          awayTeam: pred.awayTeam,
          outcome,
          bestOdds: rec.odds,
          bestBookmakerId: rec.bookmakerId,
          trueProb: trueOutcome?.trueProb ?? 0,
          ev: rec.ev,
        }
      })
    setSelectedPicks(allPicks)
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">Accumulator Builder</h2>
          <p className="text-gray-500 text-sm mt-1">
            Combine value bets into a multi-bet — Kelly Criterion stake sizing
          </p>
        </div>
        <button
          onClick={handleSmartAcca}
          disabled={valuePredictions.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border transition-all ${
            valuePredictions.length === 0
              ? "border-gray-700 text-gray-600 cursor-not-allowed"
              : "border-yellow-600/50 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 active:scale-[0.98]"
          }`}
        >
          ⚡ Smart Acca
          {valuePredictions.length > 0 && (
            <span className="bg-yellow-600/30 text-yellow-300 rounded-full px-1.5 py-0.5 text-xs">
              {valuePredictions.length}
            </span>
          )}
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: Available Picks */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Available Picks
            </h3>
            <span className="text-xs text-gray-600">
              {valuePredictions.length} value bet{valuePredictions.length !== 1 ? "s" : ""}
            </span>
          </div>

          {isLoading ? (
            <div className="text-gray-500 py-12 text-center text-sm">Loading predictions…</div>
          ) : valuePredictions.length === 0 ? (
            <div className="text-center py-14 border border-dashed border-gray-800 rounded-xl">
              <div className="text-gray-500 text-base mb-1">No value bets available</div>
              <div className="text-gray-600 text-xs">
                Fetch real odds on the Opportunities page first
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {valuePredictions.map((pred) => (
                <PickCard
                  key={pred.eventId}
                  prediction={pred}
                  bookmakersMap={bookmakersMap}
                  selectedOutcome={
                    selectedEventIds.has(pred.eventId)
                      ? (selectedPicks.find((p) => p.eventId === pred.eventId)?.outcome ?? null)
                      : null
                  }
                  onAdd={addPick}
                  onRemove={removePick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Bet Slip */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Bet Slip
            </h3>
          </div>
          <BetSlip
            picks={selectedPicks}
            onRemove={removePick}
            bookmakersMap={bookmakersMap}
          />
        </div>
      </div>
    </div>
  )
}
