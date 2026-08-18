import type { Prediction } from "../api"

export type SignalTier = "strong" | "watch" | "risk"

export interface Signal {
  tier: SignalTier
  label: string
  reason: string
}

/**
 * Transparent, non-fabricated classification derived from the same EV/confidence
 * math already computed on the backend (lib/api-server/src/routes/predictions.ts).
 * No independent "certainty" score is invented — this is a presentation layer
 * over real numbers only.
 */
export function classifySignal(prediction: Prediction): Signal {
  const rec = prediction.recommendation
  if (!rec) {
    return {
      tier: "risk",
      label: "High Risk",
      reason: "No positive-EV edge found — market price looks efficient here.",
    }
  }
  if (rec.confidence === "high") {
    return {
      tier: "strong",
      label: "Strong",
      reason: `Model sees ${rec.ev.toFixed(1)}% expected value with high confidence.`,
    }
  }
  return {
    tier: "watch",
    label: "Watch",
    reason: `Modest ${rec.ev.toFixed(1)}% edge — worth monitoring, not a strong signal.`,
  }
}

export const SIGNAL_STYLES: Record<SignalTier, { bg: string; text: string; border: string; dot: string }> = {
  strong: {
    bg: "bg-positive-dim",
    text: "text-positive",
    border: "border-positive/30",
    dot: "bg-positive",
  },
  watch: {
    bg: "bg-watch-dim",
    text: "text-watch",
    border: "border-watch/30",
    dot: "bg-watch",
  },
  risk: {
    bg: "bg-risk-dim",
    text: "text-risk",
    border: "border-risk/30",
    dot: "bg-risk",
  },
}

export function keySignals(prediction: Prediction): string[] {
  const signals: string[] = []
  const rec = prediction.recommendation
  const form = prediction.form

  if (rec) {
    signals.push(
      `${outcomeLabel(rec.outcome, prediction)} priced with ${rec.ev > 0 ? "+" : ""}${rec.ev.toFixed(1)}% expected value vs. market`,
    )
  }
  if (form) {
    if (form.homeTeamWinRate !== null) {
      signals.push(`${prediction.homeTeam} won ${Math.round(form.homeTeamWinRate * 100)}% of recent home games`)
    }
    if (form.awayTeamWinRate !== null) {
      signals.push(`${prediction.awayTeam} won ${Math.round(form.awayTeamWinRate * 100)}% of recent away games`)
    }
    const h2hTotal = form.h2hHomeWins + form.h2hAwayWins + form.h2hDraws
    if (h2hTotal > 0) {
      signals.push(
        `Head-to-head last ${h2hTotal}: ${form.h2hHomeWins}W ${form.h2hDraws}D ${form.h2hAwayWins}L (${prediction.homeTeam} perspective)`,
      )
    }
  } else {
    signals.push("No historical match data yet — prediction based on market odds only")
  }
  signals.push(`Consensus drawn from ${prediction.bookmakerCount} bookmaker${prediction.bookmakerCount !== 1 ? "s" : ""}`)
  return signals
}

export function outcomeLabel(outcome: "home" | "draw" | "away", prediction: { homeTeam: string; awayTeam: string }): string {
  if (outcome === "home") return `${prediction.homeTeam} Win`
  if (outcome === "away") return `${prediction.awayTeam} Win`
  return "Draw"
}
