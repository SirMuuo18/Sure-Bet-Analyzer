import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { db, eventsTable, oddsTable, resultsTable } from "@workspace/db";

const router: IRouter = Router();

type OutcomeKey = "home" | "draw" | "away";

interface OddsRow {
  bookmakerId: number;
  outcome: OutcomeKey;
  decimalOdds: number;
}

interface TeamForm {
  homeTeamWinRate: number | null;
  awayTeamWinRate: number | null;
  h2hHomeWins: number;
  h2hAwayWins: number;
  h2hDraws: number;
  dataPoints: number;
}

interface OutcomePrediction {
  outcome: OutcomeKey;
  trueProb: number;
  formAdjustedProb: number;
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
  form: TeamForm | null;
}

type ResultRow = typeof resultsTable.$inferSelect;

async function getTeamForm(homeTeam: string, awayTeam: string): Promise<TeamForm | null> {
  try {
    // Fetch last 10 results involving either team
    const results = await db
      .select()
      .from(resultsTable)
      .where(
        or(
          eq(resultsTable.homeTeam, homeTeam),
          eq(resultsTable.awayTeam, homeTeam),
          eq(resultsTable.homeTeam, awayTeam),
          eq(resultsTable.awayTeam, awayTeam),
        ),
      );

    if (!results.length) return null;

    // Sort by completedAt descending
    results.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

    const dataPoints = results.length;

    // Home team: last 5 games played as home team
    const homeTeamHomeGames = results
      .filter((r) => r.homeTeam === homeTeam)
      .slice(0, 5);

    let homeTeamWinRate: number | null = null;
    if (homeTeamHomeGames.length > 0) {
      const wins = homeTeamHomeGames.filter((r) => r.homeScore > r.awayScore).length;
      homeTeamWinRate = wins / homeTeamHomeGames.length;
    }

    // Away team: last 5 games played as away team
    const awayTeamAwayGames = results
      .filter((r) => r.awayTeam === awayTeam)
      .slice(0, 5);

    let awayTeamWinRate: number | null = null;
    if (awayTeamAwayGames.length > 0) {
      const wins = awayTeamAwayGames.filter((r) => r.awayScore > r.homeScore).length;
      awayTeamWinRate = wins / awayTeamAwayGames.length;
    }

    // H2H: last 3 games between these exact teams (either home/away arrangement)
    const h2hGames: ResultRow[] = results
      .filter(
        (r) =>
          (r.homeTeam === homeTeam && r.awayTeam === awayTeam) ||
          (r.homeTeam === awayTeam && r.awayTeam === homeTeam),
      )
      .slice(0, 3);

    let h2hHomeWins = 0;
    let h2hAwayWins = 0;
    let h2hDraws = 0;

    for (const r of h2hGames) {
      if (r.homeScore === r.awayScore) {
        h2hDraws++;
      } else if (r.homeTeam === homeTeam) {
        // Standard orientation
        if (r.homeScore > r.awayScore) h2hHomeWins++;
        else h2hAwayWins++;
      } else {
        // Reversed orientation: homeTeam was away
        if (r.awayScore > r.homeScore) h2hHomeWins++;
        else h2hAwayWins++;
      }
    }

    return {
      homeTeamWinRate,
      awayTeamWinRate,
      h2hHomeWins,
      h2hAwayWins,
      h2hDraws,
      dataPoints,
    };
  } catch (err) {
    // results table may not exist yet
    console.error("Error fetching team form (results table may not exist):", err);
    return null;
  }
}

function blendWithForm(
  trueProbs: Record<string, number>,
  form: TeamForm | null,
  activeOutcomes: OutcomeKey[],
): Record<string, number> {
  if (!form) return { ...trueProbs };

  const { homeTeamWinRate, awayTeamWinRate } = form;
  if (homeTeamWinRate === null && awayTeamWinRate === null) return { ...trueProbs };

  const MARKET_WEIGHT = 0.8;
  const FORM_WEIGHT = 0.2;

  const adjusted: Record<string, number> = { ...trueProbs };

  // Build form-implied probability vector
  const hasHome = activeOutcomes.includes("home");
  const hasAway = activeOutcomes.includes("away");
  const hasDraw = activeOutcomes.includes("draw");

  if (hasHome && homeTeamWinRate !== null) {
    adjusted["home"] = MARKET_WEIGHT * trueProbs["home"] + FORM_WEIGHT * homeTeamWinRate;
  }

  if (hasAway && awayTeamWinRate !== null) {
    adjusted["away"] = MARKET_WEIGHT * trueProbs["away"] + FORM_WEIGHT * awayTeamWinRate;
  }

  if (hasDraw) {
    // Keep draw probability residual so totals stay near 1
    adjusted["draw"] = trueProbs["draw"];
  }

  // Re-normalize
  const total = activeOutcomes.reduce((s, o) => s + (adjusted[o] ?? 0), 0);
  if (total > 0) {
    for (const o of activeOutcomes) {
      adjusted[o] = (adjusted[o] ?? 0) / total;
    }
  }

  return adjusted;
}

function computePrediction(
  event: { id: number; homeTeam: string; awayTeam: string; startsAt: Date },
  oddsList: OddsRow[],
  form: TeamForm | null,
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

  // Blend with form data
  const formAdjustedProbs = blendWithForm(trueProbs, form, activeOutcomes);

  // Find best odds (highest) per outcome and which bookmaker
  const bestOddsMap: Record<string, { odds: number; bookmakerId: number }> = {};
  for (const o of activeOutcomes) {
    let best = byOutcome[o][0];
    for (const row of byOutcome[o]) {
      if (row.decimalOdds > best.decimalOdds) best = row;
    }
    bestOddsMap[o] = { odds: best.decimalOdds, bookmakerId: best.bookmakerId };
  }

  // Compute EV per outcome using formAdjustedProb
  const outcomeResults: OutcomePrediction[] = activeOutcomes.map((o) => {
    const trueProb = trueProbs[o];
    const formAdjustedProb = formAdjustedProbs[o] ?? trueProb;
    const { odds, bookmakerId } = bestOddsMap[o];
    const ev = (formAdjustedProb * odds - 1) * 100;
    return {
      outcome: o,
      trueProb: Math.round(trueProb * 10000) / 10000,
      formAdjustedProb: Math.round(formAdjustedProb * 10000) / 10000,
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
    form,
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

    const form = await getTeamForm(event.homeTeam, event.awayTeam);
    const prediction = computePrediction(event, oddsList, form);
    if (prediction) predictions.push(prediction);
  }

  res.json(predictions);
});

export default router;
