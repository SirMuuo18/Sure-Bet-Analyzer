import { useState } from "react"

// ─── Section 1: Bookmaker Edge Cards ─────────────────────────────────────────

interface EdgeCardProps {
  title: string
  body: string
  example?: string
  workaround?: string
  workaroundLabel?: string
}

function EdgeCard({ title, body, example, workaround, workaroundLabel }: EdgeCardProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-3">
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <p className="text-sm text-ink-muted leading-relaxed">{body}</p>
      {example && (
        <div className="bg-surface-2/60 rounded-lg px-4 py-3 text-xs text-ink-muted leading-relaxed font-mono whitespace-pre-wrap">
          {example}
        </div>
      )}
      {workaround && (
        <div className="bg-accent-dim/60 border border-accent/30 rounded-lg px-4 py-3">
          {workaroundLabel && (
            <span className="text-xs font-semibold text-accent-strong uppercase tracking-wide block mb-1">
              {workaroundLabel}
            </span>
          )}
          <p className="text-xs text-ink-muted leading-relaxed">{workaround}</p>
        </div>
      )}
    </div>
  )
}

// ─── Calculator A: Overround Analyzer ────────────────────────────────────────

function OverroundCalculator() {
  const [homeOdds, setHomeOdds] = useState("")
  const [drawOdds, setDrawOdds] = useState("")
  const [awayOdds, setAwayOdds] = useState("")

  const home = parseFloat(homeOdds)
  const draw = parseFloat(drawOdds)
  const away = parseFloat(awayOdds)

  const validHome = isFinite(home) && home > 1
  const validDraw = drawOdds.trim() === "" || (isFinite(draw) && draw > 1)
  const validAway = isFinite(away) && away > 1

  const canCalculate = validHome && validAway && validDraw

  let result: {
    overround: number
    sumImplied: number
    fairHome: number
    fairDraw: number | null
    fairAway: number
    marginHome: number
    marginDraw: number | null
    marginAway: number
  } | null = null

  if (canCalculate) {
    const impHome = 1 / home
    const impDraw = drawOdds.trim() !== "" ? 1 / draw : 0
    const impAway = 1 / away
    const sumImplied = impHome + impDraw + impAway
    const overround = (sumImplied - 1) * 100

    const fairHome = 1 / (impHome / sumImplied)
    const fairDraw = drawOdds.trim() !== "" ? 1 / (impDraw / sumImplied) : null
    const fairAway = 1 / (impAway / sumImplied)

    const marginHome = ((home - fairHome) / fairHome) * 100
    const marginDraw = fairDraw !== null ? ((draw - fairDraw) / fairDraw) * 100 : null
    const marginAway = ((away - fairAway) / fairAway) * 100

    result = { overround, sumImplied, fairHome, fairDraw, fairAway, marginHome, marginDraw, marginAway }
  }

  function overroundBadge(pct: number) {
    if (pct < 3) return { label: "Excellent (<3%)", cls: "bg-positive-dim text-positive border-positive/30" }
    if (pct <= 6) return { label: "Average (3-6%)", cls: "bg-watch-dim text-watch border-watch/30" }
    return { label: "Poor (>6%)", cls: "bg-risk-dim text-risk border-risk/30" }
  }

  const rows = result
    ? [
        { label: "Home", quoted: home, fair: result.fairHome, margin: result.marginHome },
        ...(result.fairDraw !== null
          ? [{ label: "Draw", quoted: draw, fair: result.fairDraw, margin: result.marginDraw! }]
          : []),
        { label: "Away", quoted: away, fair: result.fairAway, margin: result.marginAway },
      ]
    : []

  return (
    <div className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-base font-bold text-ink mb-0.5">Calculator A — Overround Analyzer</h3>
        <p className="text-xs text-ink-muted">Enter decimal odds to measure the bookmaker's built-in margin.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Home Odds", value: homeOdds, setter: setHomeOdds, placeholder: "e.g. 2.10" },
          { label: "Draw Odds (optional)", value: drawOdds, setter: setDrawOdds, placeholder: "e.g. 3.30" },
          { label: "Away Odds", value: awayOdds, setter: setAwayOdds, placeholder: "e.g. 3.60" },
        ].map(({ label, value, setter, placeholder }) => (
          <div key={label}>
            <label className="text-xs text-ink-muted block mb-1.5">{label}</label>
            <input
              type="number"
              min="1.01"
              step="0.01"
              value={value}
              onChange={(e) => setter(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-surface-2 border border-line-strong rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:border-accent placeholder-ink-faint"
            />
          </div>
        ))}
      </div>

      {result && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-ink-muted">Overround:</span>
            <span className="text-lg font-bold text-ink font-mono">
              {result.overround.toFixed(2)}%
            </span>
            {(() => {
              const badge = overroundBadge(result.overround)
              return (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.cls}`}>
                  {badge.label}
                </span>
              )
            })()}
          </div>

          <div className="text-xs text-ink-muted">
            Implied probabilities sum to{" "}
            <span className="text-ink font-semibold">{(result.sumImplied * 100).toFixed(2)}%</span>
            {" "}(bookmaker takes the {result.overround.toFixed(2)}% excess)
          </div>

          <div className="bg-surface-2/50 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  {["Outcome", "Quoted Odds", "Fair Odds", "Margin"].map((h) => (
                    <th key={h} className="px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wide text-left bg-surface-2 border-b border-line-strong">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 text-xs text-ink-muted">{row.label}</td>
                    <td className="px-3 py-2 text-xs text-ink font-mono">{row.quoted.toFixed(2)}</td>
                    <td className="px-3 py-2 text-xs text-positive font-mono">{row.fair.toFixed(2)}</td>
                    <td className="px-3 py-2 text-xs text-risk font-mono">
                      {row.margin < 0 ? "" : "+"}{row.margin.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-ink-muted italic">
            Tip: Compare the same fixture across Betway, Sportpesa, and Betika — choose the lowest overround.
          </p>
        </div>
      )}

      {!canCalculate && (homeOdds || awayOdds) && (
        <p className="text-xs text-risk">Enter valid decimal odds greater than 1.01 for Home and Away.</p>
      )}
    </div>
  )
}

// ─── Calculator B: Kelly Criterion ───────────────────────────────────────────

function KellyCalculator() {
  const [prob, setProb] = useState("")
  const [odds, setOdds] = useState("")
  const [bankroll, setBankroll] = useState("")

  const p = parseFloat(prob) / 100
  const o = parseFloat(odds)
  const b = parseFloat(bankroll)

  const valid = isFinite(p) && p > 0 && p < 1 && isFinite(o) && o > 1 && isFinite(b) && b > 0

  let result: {
    kellyPct: number
    quarterKellyPct: number
    stake: number
    potentialProfit: number
    potentialPayout: number
    highRisk: boolean
    negative: boolean
  } | null = null

  if (valid) {
    const rawKelly = (p * o - 1) / (o - 1)
    const negative = rawKelly <= 0
    const kellyPct = Math.max(0, rawKelly) * 100
    const quarterKellyPct = kellyPct / 4
    const stake = (b * quarterKellyPct) / 100
    const potentialPayout = stake * o
    const potentialProfit = potentialPayout - stake
    const highRisk = kellyPct > 20

    result = { kellyPct, quarterKellyPct, stake, potentialProfit, potentialPayout, highRisk, negative }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-base font-bold text-ink mb-0.5">Calculator B — Kelly Criterion Staking</h3>
        <p className="text-xs text-ink-muted">Optimal bet sizing based on your estimated edge.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Your Win Probability (%)", value: prob, setter: setProb, placeholder: "e.g. 55", min: "1", max: "99" },
          { label: "Decimal Odds", value: odds, setter: setOdds, placeholder: "e.g. 2.10", min: "1.01" },
          { label: "Bankroll (KES)", value: bankroll, setter: setBankroll, placeholder: "e.g. 10000", min: "100" },
        ].map(({ label, value, setter, placeholder, min, max }) => (
          <div key={label}>
            <label className="text-xs text-ink-muted block mb-1.5">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              step="0.01"
              value={value}
              onChange={(e) => setter(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-surface-2 border border-line-strong rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:border-accent placeholder-ink-faint"
            />
          </div>
        ))}
      </div>

      {result && (
        <div className="flex flex-col gap-3">
          {result.negative && (
            <div className="bg-risk-dim border border-risk/30 rounded-lg px-4 py-3 text-risk text-sm font-semibold">
              No edge — these odds and probability produce negative expected value. Do not bet.
            </div>
          )}
          {!result.negative && result.highRisk && (
            <div className="bg-watch-dim border border-watch/30 rounded-lg px-4 py-3 text-watch text-sm font-semibold">
              HIGH RISK — Kelly suggests {result.kellyPct.toFixed(1)}% stake. Odds may not match your true probability.
            </div>
          )}
          {!result.negative && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-2/60 rounded-lg px-4 py-3">
                <div className="text-xs text-ink-muted mb-1">Full Kelly</div>
                <div className="text-xl font-bold text-ink font-mono">{result.kellyPct.toFixed(2)}%</div>
                <div className="text-xs text-ink-faint mt-0.5">aggressive — not recommended</div>
              </div>
              <div className="bg-positive-dim border border-positive/30 rounded-lg px-4 py-3">
                <div className="text-xs text-ink-muted mb-1">Quarter Kelly (recommended)</div>
                <div className="text-xl font-bold text-positive font-mono">{result.quarterKellyPct.toFixed(2)}%</div>
                <div className="text-xs text-ink-faint mt-0.5">pro standard</div>
              </div>
              <div className="bg-surface-2/60 rounded-lg px-4 py-3">
                <div className="text-xs text-ink-muted mb-1">Recommended Stake (KES)</div>
                <div className="text-xl font-bold text-watch font-mono">
                  {result.stake.toLocaleString("en-KE", { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-surface-2/60 rounded-lg px-4 py-3">
                <div className="text-xs text-ink-muted mb-1">Potential Profit (KES)</div>
                <div className="text-xl font-bold text-positive font-mono">
                  {result.potentialProfit.toLocaleString("en-KE", { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}
          {!result.negative && (
            <div className="text-xs text-ink-muted leading-relaxed bg-surface-2/40 rounded-lg px-4 py-3">
              Full Kelly is aggressive and can cause large drawdowns. Quarter Kelly is what professional bettors use — slower bankroll growth but protects against ruin. Payout if won:{" "}
              <span className="text-ink font-semibold">
                KES {result.potentialPayout.toLocaleString("en-KE", { maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      )}

      {!valid && (prob || odds || bankroll) && (
        <p className="text-xs text-risk">Enter valid values: probability 1-99%, odds &gt;1.01, bankroll &gt;0.</p>
      )}
    </div>
  )
}

// ─── Calculator C: CLV Tracker ────────────────────────────────────────────────

function CLVCalculator() {
  const [betOdds, setBetOdds] = useState("")
  const [closingOdds, setClosingOdds] = useState("")

  const b = parseFloat(betOdds)
  const c = parseFloat(closingOdds)
  const valid = isFinite(b) && b > 1 && isFinite(c) && c > 1

  const clv = valid ? ((b / c) - 1) * 100 : null

  return (
    <div className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-base font-bold text-ink mb-0.5">Calculator C — Closing Line Value (CLV) Tracker</h3>
        <p className="text-xs text-ink-muted">Did you beat the market? Compare your bet odds to the final odds at kickoff.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: "Your Odds When You Bet", value: betOdds, setter: setBetOdds, placeholder: "e.g. 2.20" },
          { label: "Final Closing Odds (at kickoff)", value: closingOdds, setter: setClosingOdds, placeholder: "e.g. 2.05" },
        ].map(({ label, value, setter, placeholder }) => (
          <div key={label}>
            <label className="text-xs text-ink-muted block mb-1.5">{label}</label>
            <input
              type="number"
              min="1.01"
              step="0.01"
              value={value}
              onChange={(e) => setter(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-surface-2 border border-line-strong rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:border-accent placeholder-ink-faint"
            />
          </div>
        ))}
      </div>

      {clv !== null && (
        <div className="flex flex-col gap-3">
          <div
            className={`rounded-lg px-5 py-4 border ${
              clv >= 0
                ? "bg-positive-dim border-positive/30"
                : "bg-watch-dim border-watch/30"
            }`}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-bold font-mono text-ink">
                {clv >= 0 ? "+" : ""}{clv.toFixed(2)}% CLV
              </span>
              {clv >= 0 ? (
                <span className="text-positive text-sm font-semibold">
                  You beat the closing line — this is a professionally good bet.
                </span>
              ) : (
                <span className="text-watch text-sm font-semibold">
                  You got worse odds than the market settled at.
                </span>
              )}
            </div>
          </div>

          <div className="bg-surface-2/40 rounded-lg px-4 py-3 text-xs text-ink-muted leading-relaxed">
            Professional bettors track CLV religiously. If you consistently beat the closing line (positive CLV), you have a long-term edge regardless of short-term win/loss results. The closing price is the sharpest consensus — if you got better, you acted on real information.
          </div>
        </div>
      )}

      {!valid && (betOdds || closingOdds) && (
        <p className="text-xs text-risk">Enter valid decimal odds greater than 1.01 for both fields.</p>
      )}
    </div>
  )
}

// ─── Section 3: Playbook Steps ────────────────────────────────────────────────

type StepColor = "blue" | "green" | "yellow" | "purple" | "orange" | "gray"

interface StepProps {
  number: number
  title: string
  body: string
  color: StepColor
}

// A single neutral treatment for every step — this is an ordered sequence,
// not distinct categories, so the step number already carries identity.
const NEUTRAL_STEP = { bg: "bg-surface", border: "border-line", num: "text-accent-strong" }
const STEP_COLORS: Record<StepColor, { bg: string; border: string; num: string }> = {
  blue: NEUTRAL_STEP,
  green: NEUTRAL_STEP,
  yellow: NEUTRAL_STEP,
  purple: NEUTRAL_STEP,
  orange: NEUTRAL_STEP,
  gray: NEUTRAL_STEP,
}

function PlaybookStep({ number, title, body, color }: StepProps) {
  const c = STEP_COLORS[color]
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} flex gap-4 px-5 py-4`}>
      <div className={`text-3xl font-black font-mono shrink-0 leading-tight mt-0.5 ${c.num}`}>{number}</div>
      <div>
        <h4 className="text-sm font-bold text-ink mb-1">{title}</h4>
        <p className="text-sm text-ink-muted leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StrategyHub() {
  return (
    <div className="space-y-12">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-ink">Strategy Hub</h2>
        <p className="text-ink-muted text-sm mt-1">
          How bookmakers build their edge — and every mathematical tool to counter it.
        </p>
      </div>

      {/* Section 1: Bookmaker Edge */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 rounded-full bg-risk shrink-0" />
          <h2 className="text-lg font-bold text-ink">How Bookmakers Keep Their Edge</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EdgeCard
            title="The Overround (The Hidden Tax)"
            body="On every event, bookmakers set odds so the implied probabilities add up to MORE than 100%. The excess — typically 5–12% — is their guaranteed profit margin regardless of who wins."
            example={
              "Arsenal vs Chelsea — Betway: Home 2.10, Draw 3.30, Away 3.60\n" +
              "Implied: 47.6% + 30.3% + 27.8% = 105.7%\n" +
              "The 5.7% is the bookmaker's cut."
            }
          />
          <EdgeCard
            title="Limits & Account Banning"
            body="Bookmakers track every account. Win consistently and they will slash your maximum bet to near zero or ban your account entirely. They want recreational bettors who lose, not winners who take their money."
            workaroundLabel="Counter"
            workaround="Spread bets across multiple bookmakers. Keep individual bets looking recreational. Use arbitrage — bookmakers struggle to identify arb bettors easily."
          />
          <EdgeCard
            title="Steam Moves & Odds Manipulation"
            body="When sharp money hits a market, bookmakers adjust odds instantly. If you're slow, you'll end up betting at worse prices than the sharps got."
            workaroundLabel="Counter"
            workaround="Either bet early (before market moves) or very late (5–10 min before kickoff when odds stabilise). Use Closing Line Value to benchmark your entries."
          />
          <EdgeCard
            title="The Favourite–Longshot Bias"
            body="Bookmakers overprice favourites slightly and underprice longshots. Bettors love underdogs, so books shade those odds. This means statistically, favourites are often slightly underpriced (value) and big underdogs overpriced."
            workaroundLabel="Counter"
            workaround="Our value bet calculator automatically accounts for this by comparing against market consensus, not just one bookmaker."
          />
        </div>
      </section>

      {/* Section 2: Calculators */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 rounded-full bg-positive shrink-0" />
          <h2 className="text-lg font-bold text-ink">Interactive Strategy Calculators</h2>
        </div>
        <p className="text-sm text-ink-muted mb-5">
          All calculations run client-side — no data is sent to any server.
        </p>
        <div className="flex flex-col gap-5">
          <OverroundCalculator />
          <KellyCalculator />
          <CLVCalculator />
        </div>
      </section>

      {/* Section 3: Playbook */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 rounded-full bg-watch shrink-0" />
          <h2 className="text-lg font-bold text-ink">The Winning Playbook</h2>
        </div>
        <p className="text-sm text-ink-muted mb-5">
          A step-by-step workflow for consistent, mathematically sound betting.
        </p>
        <div className="flex flex-col gap-3">
          <PlaybookStep
            number={1}
            title="Step 1 — Always Line Shop"
            body="Never accept one bookmaker's odds. Use the Opportunities tab to see the best odds per outcome across Betway, Sportpesa, Betika, 1xBet. Even 0.10 difference in odds is worth taking."
            color="blue"
          />
          <PlaybookStep
            number={2}
            title="Step 2 — Hit Arbitrage First"
            body="If the scanner finds an arbitrage opportunity (implied prob < 100%), take it immediately. Guaranteed profit. No prediction needed."
            color="green"
          />
          <PlaybookStep
            number={3}
            title="Step 3 — Stack Value Bets"
            body="After arbitrage, use Predictions tab to find +EV bets. A bet with +5% EV means that for every KES 100 you risk, you expect to return KES 105 on average. You won't win every bet, but you win consistently over 100+ bets."
            color="yellow"
          />
          <PlaybookStep
            number={4}
            title="Step 4 — Build Smart Accas"
            body="Combine 3–4 value bets per day in the Accumulator tab. Use Auto-Build to get the optimal selection. Only include legs where you have a genuine edge."
            color="purple"
          />
          <PlaybookStep
            number={5}
            title="Step 5 — Size with Kelly"
            body="Never bet a flat amount. Use Calculator B on this page. Kelly Criterion ensures you bet MORE when you have bigger edge and LESS when uncertain — the mathematically optimal money management system."
            color="orange"
          />
          <PlaybookStep
            number={6}
            title="Step 6 — Track CLV"
            body="After each bet, record the closing odds. If your CLV average is > 0%, you have real edge. If < 0%, you're guessing."
            color="gray"
          />
        </div>
      </section>
    </div>
  )
}
