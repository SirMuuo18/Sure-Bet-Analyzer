import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getOpportunities,
  calculateOpportunities,
  getEvents,
  getBookmakers,
  getOdds,
  type Opportunity,
  type SportEvent,
  type Bookmaker,
  type Odds,
} from "../api"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

function ProfitBadge({ pct }: { pct: string }) {
  const val = parseFloat(pct)
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-sm font-semibold ${
        val > 0 ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"
      }`}
    >
      {val > 0 ? "+" : ""}
      {val.toFixed(2)}%
    </span>
  )
}

interface StakeRowProps {
  label: string
  amount: number
  events: SportEvent[]
  bookmakers: Bookmaker[]
  opportunity: Opportunity
}

function OpportunityRow({
  opp,
  events,
  bookmakers,
  allOdds,
}: {
  opp: Opportunity
  events: SportEvent[]
  bookmakers: Bookmaker[]
  allOdds: Map<number, Odds[]>
}) {
  const event = events.find((e) => e.id === opp.eventId)
  const odds = allOdds.get(opp.eventId) ?? []

  const getBookmakerName = (bookmakerId: number) =>
    bookmakers.find((b) => b.id === bookmakerId)?.name ?? `#${bookmakerId}`

  const outcomeOdds = (outcome: "home" | "draw" | "away") => {
    const o = odds.find((o) => o.outcome === outcome)
    if (!o) return null
    return { odds: parseFloat(o.decimalOdds), bookmaker: getBookmakerName(o.bookmakerId) }
  }

  const homeInfo = outcomeOdds("home")
  const drawInfo = outcomeOdds("draw")
  const awayInfo = outcomeOdds("away")

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
      <td className="py-3 px-4 text-sm">
        {event ? (
          <div>
            <div className="font-medium text-white">
              {event.homeTeam} vs {event.awayTeam}
            </div>
            <div className="text-xs text-gray-500">{formatDate(event.startsAt)}</div>
          </div>
        ) : (
          <span className="text-gray-500">Event #{opp.eventId}</span>
        )}
      </td>
      <td className="py-3 px-4">
        <ProfitBadge pct={opp.profitPercentage} />
      </td>
      <td className="py-3 px-4 text-sm">
        <div className="space-y-1">
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 w-10">Home</span>
            <span className="text-white font-mono">${opp.stakes.home.toFixed(2)}</span>
            {homeInfo && (
              <span className="text-gray-400 text-xs">
                @ {homeInfo.odds.toFixed(2)} ({homeInfo.bookmaker})
              </span>
            )}
          </div>
          {opp.stakes.draw !== undefined && (
            <div className="flex gap-2 items-center">
              <span className="text-gray-500 w-10">Draw</span>
              <span className="text-white font-mono">${opp.stakes.draw.toFixed(2)}</span>
              {drawInfo && (
                <span className="text-gray-400 text-xs">
                  @ {drawInfo.odds.toFixed(2)} ({drawInfo.bookmaker})
                </span>
              )}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 w-10">Away</span>
            <span className="text-white font-mono">${opp.stakes.away.toFixed(2)}</span>
            {awayInfo && (
              <span className="text-gray-400 text-xs">
                @ {awayInfo.odds.toFixed(2)} ({awayInfo.bookmaker})
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-xs text-gray-500">
        {formatDate(opp.calculatedAt)}
      </td>
    </tr>
  )
}

export default function Opportunities() {
  const qc = useQueryClient()
  const [scanMsg, setScanMsg] = useState<string | null>(null)

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: getOpportunities,
  })

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => getEvents(),
  })

  const { data: bookmakers = [] } = useQuery({
    queryKey: ["bookmakers"],
    queryFn: getBookmakers,
  })

  // Fetch odds for each unique event in opportunities
  const uniqueEventIds = [...new Set(opportunities.map((o) => o.eventId))]
  const oddsQueries = useQuery({
    queryKey: ["odds-multi", uniqueEventIds.sort().join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        uniqueEventIds.map((id) => getOdds(id).then((odds) => ({ id, odds })))
      )
      const map = new Map<number, Odds[]>()
      for (const r of results) map.set(r.id, r.odds)
      return map
    },
    enabled: uniqueEventIds.length > 0,
  })

  const allOdds = oddsQueries.data ?? new Map()

  const scanMutation = useMutation({
    mutationFn: calculateOpportunities,
    onSuccess: (data) => {
      setScanMsg(
        data.found > 0
          ? `Found ${data.found} arbitrage opportunit${data.found === 1 ? "y" : "ies"}!`
          : "No arbitrage opportunities found at current odds."
      )
      qc.invalidateQueries({ queryKey: ["opportunities"] })
      setTimeout(() => setScanMsg(null), 5000)
    },
    onError: () => setScanMsg("Scan failed. Check API connection."),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Opportunities</h2>
          <p className="text-gray-500 text-sm mt-1">
            Arbitrage opportunities across bookmakers
          </p>
        </div>
        <button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          {scanMutation.isPending ? "Scanning…" : "Scan for Opportunities"}
        </button>
      </div>

      {scanMsg && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            scanMsg.startsWith("Found")
              ? "bg-green-500/20 text-green-300 border border-green-500/30"
              : scanMsg.startsWith("No arb")
              ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
              : "bg-red-500/20 text-red-300 border border-red-500/30"
          }`}
        >
          {scanMsg}
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-500 py-12 text-center">Loading…</div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-600 text-lg mb-2">No opportunities yet</div>
          <div className="text-gray-500 text-sm">
            Click "Scan for Opportunities" to analyze current odds.
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/60 text-left">
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Event
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Profit
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Stakes
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Calculated At
                </th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp) => (
                <OpportunityRow
                  key={opp.id}
                  opp={opp}
                  events={events}
                  bookmakers={bookmakers}
                  allOdds={allOdds}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
