import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getOpportunities,
  calculateOpportunities,
  getEvents,
  getBookmakers,
  seedDemoData,
  fetchRealOdds,
  apiErrorMessage,
  type Opportunity,
  type SportEvent,
  type Bookmaker,
} from "../api"
import { useAdminAuth } from "../hooks/useAdminAuth"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

function ProfitBadge({ pct }: { pct: string }) {
  const val = parseFloat(pct)
  return (
    <span className="inline-block px-2 py-0.5 rounded text-sm font-semibold bg-positive/20 text-positive">
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
      <span className="text-ink-muted w-10 shrink-0">{label}</span>
      <span className="text-ink font-mono w-20">KES {detail.stake.toFixed(2)}</span>
      <span className="text-ink-muted text-xs">
        @ {detail.odds.toFixed(2)} — <span className="text-ink-muted">{bkName(detail.bookmakerId)}</span>
      </span>
      <span className="text-ink-faint text-xs ml-auto">payout KES {detail.payout.toFixed(2)}</span>
    </div>
  )

  return (
    <tr className="border-b border-line hover:bg-surface-2/40 transition-colors">
      <td className="py-4 px-4 text-sm">
        {event ? (
          <div>
            <div className="font-medium text-ink">
              {event.homeTeam} vs {event.awayTeam}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">{formatDate(event.startsAt)}</div>
          </div>
        ) : (
          <span className="text-ink-muted">Event #{opp.eventId}</span>
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
      <td className="py-4 px-4 text-xs text-ink-muted">
        {formatDate(opp.calculatedAt)}
      </td>
    </tr>
  )
}

function OpportunityCard({
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

  const stakeLine = (label: string, detail: { bookmakerId: number; odds: number; stake: number; payout: number }) => (
    <div className="flex items-center justify-between gap-2 text-xs py-1.5 border-t border-line first:border-t-0">
      <span className="text-ink-muted w-10 shrink-0">{label}</span>
      <span className="text-ink font-mono">KES {detail.stake.toFixed(2)}</span>
      <span className="text-ink-faint text-right">
        @ {detail.odds.toFixed(2)} · {bkName(detail.bookmakerId)}
      </span>
    </div>
  )

  return (
    <div className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {event ? (
            <>
              <div className="font-medium text-ink text-sm">
                {event.homeTeam} vs {event.awayTeam}
              </div>
              <div className="text-xs text-ink-muted mt-0.5">{formatDate(event.startsAt)}</div>
            </>
          ) : (
            <span className="text-ink-muted text-sm">Event #{opp.eventId}</span>
          )}
        </div>
        <ProfitBadge pct={opp.profitPercentage} />
      </div>
      <div className="bg-surface-2 rounded-lg px-3 py-1">
        {stakeLine("Home", opp.stakes.home)}
        {opp.stakes.draw && stakeLine("Draw", opp.stakes.draw)}
        {stakeLine("Away", opp.stakes.away)}
      </div>
      <div className="text-xs text-ink-faint">Calculated {formatDate(opp.calculatedAt)}</div>
    </div>
  )
}

export default function Opportunities() {
  const qc = useQueryClient()
  const { isAdmin } = useAdminAuth()
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
    onError: (e) => showMsg(apiErrorMessage(e), "error"),
  })

  const seedMutation = useMutation({
    mutationFn: seedDemoData,
    onSuccess: () => {
      qc.invalidateQueries()
      showMsg("Demo data loaded! Click Scan to find opportunities.", "success")
    },
    onError: (e) => showMsg(apiErrorMessage(e), "error"),
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
    onError: (e) => showMsg(apiErrorMessage(e), "error"),
  })

  const msgColors = {
    success: "bg-positive/20 text-positive border-positive/30",
    warn: "bg-watch/20 text-watch border-watch/30",
    error: "bg-risk/20 text-risk border-risk/30",
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Arbitrage</h2>
          <p className="text-ink-muted text-sm mt-1">
            Mathematically guaranteed profit from price gaps across bookmakers — distinct from probabilistic value bets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-ink-muted font-medium">Bankroll (KES)</label>
            <input
              type="number"
              min={100}
              step={100}
              value={bankroll}
              onChange={(e) => setBankroll(Number(e.target.value))}
              placeholder="KES 1,000"
              className="w-32 px-3 py-2 bg-surface-2 border border-line-strong rounded-lg text-ink text-sm focus:outline-none focus:border-accent"
            />
          </div>
          {isAdmin ? (
            <div className="flex gap-3 self-end">
              <button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="px-4 py-2.5 bg-surface-2 hover:bg-surface-hover disabled:opacity-50 text-ink font-medium rounded-lg transition-colors text-sm"
              >
                {seedMutation.isPending ? "Loading…" : "Load Demo Data"}
              </button>
              <button
                onClick={() => realOddsMutation.mutate()}
                disabled={realOddsMutation.isPending}
                className="px-4 py-2.5 bg-accent hover:bg-accent-strong disabled:opacity-50 text-canvas font-medium rounded-lg transition-colors text-sm"
              >
                {realOddsMutation.isPending ? "Fetching…" : "Fetch Real Odds"}
              </button>
              <button
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
                className="px-5 py-2.5 bg-accent hover:bg-accent-strong disabled:bg-surface-2 disabled:text-ink-faint text-canvas font-semibold rounded-lg transition-colors text-sm"
              >
                {scanMutation.isPending ? "Scanning…" : "Scan for Opportunities"}
              </button>
            </div>
          ) : (
            <div className="self-end text-xs text-ink-faint max-w-[220px] text-right">
              Sign in as admin on Manage Data to load data or scan for opportunities.
            </div>
          )}
        </div>
      </div>

      {msg && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-sm font-medium border ${msgColors[msg.type]}`}>
          {msg.text}
        </div>
      )}

      {isLoading ? (
        <div className="text-ink-muted py-12 text-center">Loading…</div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-line rounded-xl">
          <div className="text-ink-muted text-lg mb-2">No opportunities yet</div>
          <div className="text-ink-faint text-sm mb-6">
            Click <strong className="text-ink-muted">Load Demo Data</strong> to add sample odds,
            then <strong className="text-ink-muted">Scan</strong> to find arbitrage.
          </div>
          <div className="text-ink-faint text-xs">
            Or go to Manage Data → Events / Odds to enter your own data.
          </div>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto rounded-lg border border-line">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-2/60 text-left">
                  <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wider">Event</th>
                  <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wider">Profit</th>
                  <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wider">Stakes (per KES 1,000)</th>
                  <th className="py-3 px-4 text-xs font-semibold text-ink-muted uppercase tracking-wider">Calculated</th>
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
          <div className="md:hidden flex flex-col gap-3">
            {opportunities.map((opp) => (
              <OpportunityCard key={opp.id} opp={opp} events={events} bookmakers={bookmakers} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
