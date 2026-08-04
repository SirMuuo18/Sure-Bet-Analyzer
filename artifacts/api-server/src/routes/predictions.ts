import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, eventsTable, oddsTable, bookmakersTable } from "@workspace/db";

const router: IRouter = Router();

type OutcomeKey = "home" | "draw" | "away";

interface OddsRow {
  bookmakerId: number;
  outcome: OutcomeKey;
  decimalOdds: number;
}

interface OutcomePrediction {
  outcome: OutcomeKey;
  trueProb: number;
  bestOdds: number;
  bestBookmakerId: number;
  ev: number;
  isValue: boolean;
  isStrongValue: boolean;
}

interface Recommendation {
  outcome: OutcomeKey;
  odds: number;
  bookmakerId: number;
  ev: number;
  confidence: "high" | "medium" | "low";
}

interface Prediction {
  eventId: number;
  homeTeam: string;
  awayTeam: string;
  startsAt: string;
  bookmakerCount: number;
  outcomes: OutcomePrediction[];
  recommendation: Recommendation | null;
}

function computePrediction(
  event: { id: number; homeTeam: string; awayTeam: string; startsAt: Date },
  oddsList: OddsRow[],
): Prediction | null {
  if (!oddsList.length) return null;

  // Group by outcome
  const byOutcome: Record<OutcomeKey, OddsRow[]> = { home: [], draw: [], away: [] };
  for (const row of oddsList) {
    byOutcome[row.outcome].push(row);
  }

  const outcomes: OutcomeKey[] = ["home", "draw", "away"];
  const activeOutcomes = outcomes.filter((o) => byOutcome[o].length > 0);

  if (activeOutcomes.length < 2) return null;

  // Compute raw implied probabilities (average across bookmakers per outcome)
  const rawProbs: Record<string, number> = {};
  for (const o of activeOutcomes) {
    const probs = byOutcome[o].map((row) => 1 / row.decimalOdds);
    rawProbs[o] = probs.reduce((a, b) => a + b, 0) / probs.length;
  }

  // Normalize so they sum to 1 (de-vig)
  const rawSum = Object.values(rawProbs).reduce((a, b) => a + b, 0);
  const trueProbs: Record<string, number> = {};
  for (const o of activeOutcomes) {
    trueProbs[o] = rawProbs[o] / rawSum;
  }

  // Find best odds (highest) per outcome and which bookmaker
  const bestOddsMap: Record<string, { odds: number; bookmakerId: number }> = {};
  for (const o of activeOutcomes) {
    let best = byOutcome[o][0];
    for (const row of byOutcome[o]) {
      if (row.decimalOdds > best.decimalOdds) best = row;
    }
    bestOddsMap[o] = { odds: best.decimalOdds, bookmakerId: best.bookmakerId };
  }

  // Compute EV per outcome
  const outcomeResults: OutcomePrediction[] = activeOutcomes.map((o) => {
    const trueProb = trueProbs[o];
    const { odds, bookmakerId } = bestOddsMap[o];
    const ev = (trueProb * odds - 1) * 100;
    return {
      outcome: o,
      trueProb: Math.round(trueProb * 10000) / 10000,
      bestOdds: odds,
      bestBookmakerId: bookmakerId,
      ev: Math.round(ev * 100) / 100,
      isValue: ev > 0,
      isStrongValue: ev > 3,
    };
  });

  // Pick recommendation: highest EV that is positive
  const valueBets = outcomeResults.filter((o) => o.ev > 0);
  let recommendation: Recommendation | null = null;
  if (valueBets.length > 0) {
    const best = valueBets.reduce((a, b) => (a.ev > b.ev ? a : b));
    const confidence: "high" | "medium" | "low" =
      best.ev > 5 ? "high" : best.ev > 2 ? "medium" : "low";
    recommendation = {
      outcome: best.outcome,
      odds: best.bestOdds,
      bookmakerId: best.bestBookmakerId,
      ev: best.ev,
      confidence,
    };
  }

  const uniqueBookmakers = new Set(oddsList.map((o) => o.bookmakerId));

  return {
    eventId: event.id,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    startsAt: event.startsAt.toISOString(),
    bookmakerCount: uniqueBookmakers.size,
    outcomes: outcomeResults,
    recommendation,
  };
}

router.get("/predictions", async (_req, res) => {
  // Fetch all pending events
  const events = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.status, "pending"));

  const predictions: Prediction[] = [];

  for (const event of events) {
    const rawOdds = await db
      .select()
      .from(oddsTable)
      .where(eq(oddsTable.eventId, event.id));

    if (!rawOdds.length) continue;

    const oddsList: OddsRow[] = rawOdds.map((o) => ({
      bookmakerId: o.bookmakerId,
      outcome: o.outcome as OutcomeKey,
      decimalOdds: parseFloat(o.decimalOdds),
    }));

    const prediction = computePrediction(event, oddsList);
    if (prediction) predictions.push(prediction);
  }

  res.json(predictions);
});

export default router;
