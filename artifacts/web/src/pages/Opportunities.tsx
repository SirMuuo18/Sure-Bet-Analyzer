import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getOpportunities,
  calculateOpportunities,
  getEvents,
  getBookmakers,
  seedDemoData,
  fetchRealOdds,
  type Opportunity,
  type SportEvent,
  type Bookmaker,
} from "../api"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

function ProfitBadge({ pct }: { pct: string }) {
  const val = parseFloat(pct)
  return (
    <span className="inline-block px-2 py-0.5 rounded text-sm font-semibold bg-green-500/20 text-green-400">
      +{val.toFixed(2)}%
    </span>
  )
}

function OpportunityRow({
  opp,
  events,
  bookmakers,
}: {
  opp: Opportunity
  events: SportEvent[]
  bookmakers: Bookmaker[]
}) {
  const event = events.find((e) => e.id === opp.eventId)
  const bkName = (id: number) => bookmakers.find((b) => b.id === id)?.name ?? `#${id}`

  const stakeRow = (label: string, detail: { bookmakerId: number; odds: number; stake: number; payout: number }) => (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-500 w-10 shrink-0">{label}</span>
      <span className="text-white font-mono w-20">KES {detail.stake.toFixed(2)}</span>
      <span className="text-gray-400 text-xs">
        @ {detail.odds.toFixed(2)} — <span className="text-gray-300">{bkName(detail.bookmakerId)}</span>
      </span>
      <span className="text-gray-600 text-xs ml-auto">payout KES {detail.payout.toFixed(2)}</span>
    </div>
  )

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
      <td className="py-4 px-4 text-sm">
        {event ? (
          <div>
            <div className="font-medium text-white">
              {event.homeTeam} vs {event.awayTeam}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{formatDate(event.startsAt)}</div>
          </div>
        ) : (
          <span className="text-gray-500">Event #{opp.eventId}</span>
        )}
      </td>
      <td className="py-4 px-4">
        <ProfitBadge pct={opp.profitPercentage} />
      </td>
      <td className="py-4 px-4">
        <div className="space-y-1.5">
          {stakeRow("Home", opp.stakes.home)}
          {opp.stakes.draw && stakeRow("Draw", opp.stakes.draw)}
          {stakeRow("Away", opp.stakes.away)}
        </div>
      </td>
      <td className="py-4 px-4 text-xs text-gray-500">
        {formatDate(opp.calculatedAt)}
      </td>
    </tr>
  )
}

export default function Opportunities() {
  const qc = useQueryClient()
  const [msg, setMsg] = useState<{ text: string; type: "success" | "warn" | "error" } | null>(null)
  const [bankroll, setBankroll] = useState<number>(1000)

  const showMsg = (text: string, type: "success" | "warn" | "error") => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 6000)
  }

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

  const scanMutation = useMutation({
    mutationFn: () => calculateOpportunities(bankroll),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["opportunities"] })
      if (data.found > 0) {
        showMsg(`Found ${data.found} arbitrage opportunit${data.found === 1 ? "y" : "ies"}!`, "success")
      } else {
        showMsg("No arbitrage opportunities found at current odds.", "warn")
      }
    },
    onError: () => showMsg("Scan failed. Check API connection.", "error"),
  })

  const seedMutation = useMutation({
    mutationFn: seedDemoData,
    onSuccess: () => {
      qc.invalidateQueries()
      showMsg("Demo data loaded! Click Scan to find opportunities.", "success")
    },
    onError: () => showMsg("Failed to load demo data.", "error"),
  })

  const realOddsMutation = useMutation({
    mutationFn: fetchRealOdds,
    onSuccess: (data) => {
      if ("error" in data) {
        showMsg("Configure ODDS_API_KEY in Vercel to fetch real odds", "warn")
      } else {
        qc.invalidateQueries()
        showMsg(`Fetched real odds: ${data.eventsProcessed} events processed, ${data.oddsStored} odds stored.`, "success")
      }
    },
    onError: () => showMsg("Failed to fetch real odds.", "error"),
  })

  const msgColors = {
    success: "bg-green-500/20 text-green-300 border-green-500/30",
    warn: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    error: "bg-red-500/20 text-red-300 border-red-500/30",
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Opportunities</h2>
          <p className="text-gray-500 text-sm mt-1">
            Arbitrage opportunities across bookmakers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-medium">Bankroll (KES)</label>
            <input
              type="number"
              min={100}
              step={100}
              value={bankroll}
              onChange={(e) => setBankroll(Number(e.target.value))}
              placeholder="KES 1,000"
              className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div className="flex gap-3 self-end">
            <button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm"
            >
              {seedMutation.isPending ? "Loading…" : "Load Demo Data"}
            </button>
            <button
              onClick={() => realOddsMutation.mutate()}
              disabled={realOddsMutation.isPending}
              className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm"
            >
              {realOddsMutation.isPending ? "Fetching…" : "Fetch Real Odds"}
            </button>
            <button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {scanMutation.isPending ? "Scanning…" : "Scan for Opportunities"}
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-sm font-medium border ${msgColors[msg.type]}`}>
          {msg.text}
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-500 py-12 text-center">Loading…</div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-xl">
          <div className="text-gray-500 text-lg mb-2">No opportunities yet</div>
          <div className="text-gray-600 text-sm mb-6">
            Click <strong className="text-gray-400">Load Demo Data</strong> to add sample odds,
            then <strong className="text-gray-400">Scan</strong> to find arbitrage.
          </div>
          <div className="text-gray-700 text-xs">
            Or go to Setup → Events → Odds to enter your own data.
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800/60 text-left">
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Event</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Profit</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Stakes (per KES 1,000)</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Calculated</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp) => (
                <OpportunityRow
                  key={opp.id}
                  opp={opp}
                  events={events}
                  bookmakers={bookmakers}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
