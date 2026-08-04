import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, eventsTable, oddsTable } from "@workspace/db";

const router: IRouter = Router();

type OutcomeKey = "home" | "draw" | "away";

interface OddsRow {
  bookmakerId: number;
  outcome: OutcomeKey;
  decimalOdds: number;
}

interface AccumulatorSelection {
  eventId: number;
  homeTeam: string;
  awayTeam: string;
  outcome: OutcomeKey;
  bestOdds: number;
  bestBookmakerId: number;
  trueProb: number;
}

interface AccumulatorResult {
  selections: AccumulatorSelection[];
  combinedOdds: number;
  combinedProb: number;
  ev: number;
  kellyFraction: number;
  recommendedStake: number;
  potentialReturn: number;
  potentialProfit: number;
  isValueBet: boolean;
}

/** Resolves a single event+outcome into an AccumulatorSelection using de-vig probabilities. */
function resolveSelection(
  event: { id: number; homeTeam: string; awayTeam: string },
  oddsList: OddsRow[],
  outcome: OutcomeKey,
): AccumulatorSelection | null {
  if (!oddsList.length) return null;

  const byOutcome: Record<OutcomeKey, OddsRow[]> = { home: [], draw: [], away: [] };
  for (const row of oddsList) byOutcome[row.outcome].push(row);

  const activeOutcomes = (["home", "draw", "away"] as OutcomeKey[]).filter(
    (o) => byOutcome[o].length > 0,
  );

  if (activeOutcomes.length < 2) return null;
  if (!byOutcome[outcome].length) return null;

  // Average implied probability per outcome, then normalise (de-vig)
  const rawProbs: Record<string, number> = {};
  for (const o of activeOutcomes) {
    const probs = byOutcome[o].map((r) => 1 / r.decimalOdds);
    rawProbs[o] = probs.reduce((a, b) => a + b, 0) / probs.length;
  }
  const rawSum = Object.values(rawProbs).reduce((a, b) => a + b, 0);

  const trueProb = rawProbs[outcome] / rawSum;

  // Best (highest) available odds for this outcome
  let best = byOutcome[outcome][0];
  for (const row of byOutcome[outcome]) {
    if (row.decimalOdds > best.decimalOdds) best = row;
  }

  return {
    eventId: event.id,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    outcome,
    bestOdds: best.decimalOdds,
    bestBookmakerId: best.bookmakerId,
    trueProb: Math.round(trueProb * 10000) / 10000,
  };
}

function buildAccumulatorResult(
  selections: AccumulatorSelection[],
  bankroll: number,
): AccumulatorResult {
  const combinedOdds = selections.reduce((acc, s) => acc * s.bestOdds, 1);
  const combinedProb = selections.reduce((acc, s) => acc * s.trueProb, 1);
  const evDecimal = combinedProb * combinedOdds - 1;
  const ev = evDecimal * 100;
  // Kelly: f = (p*b - q) / b where b = combinedOdds - 1, p = combinedProb, q = 1 - p
  // Simplified: f = (p * combinedOdds - 1) / (combinedOdds - 1)
  const kellyFraction = Math.max(0, Math.min(0.25, evDecimal / (combinedOdds - 1)));
  const recommendedStake = bankroll * kellyFraction;
  const potentialReturn = recommendedStake * combinedOdds;
  const potentialProfit = potentialReturn - recommendedStake;

  return {
    selections,
    combinedOdds: Math.round(combinedOdds * 1000) / 1000,
    combinedProb: Math.round(combinedProb * 10000) / 10000,
    ev: Math.round(ev * 100) / 100,
    kellyFraction: Math.round(kellyFraction * 10000) / 10000,
    recommendedStake: Math.round(recommendedStake * 100) / 100,
    potentialReturn: Math.round(potentialReturn * 100) / 100,
    potentialProfit: Math.round(potentialProfit * 100) / 100,
    isValueBet: ev > 0,
  };
}

// ─── POST /accumulator ───────────────────────────────────────────────────────

router.post("/accumulator", async (req, res) => {
  const { selections: reqSelections, bankroll = 1000 } = req.body as {
    selections: Array<{ eventId: number; outcome: OutcomeKey }>;
    bankroll: number;
  };

  if (!Array.isArray(reqSelections) || reqSelections.length < 2) {
    res.status(400).json({ error: "At least 2 selections are required" });
    return;
  }

  const resolvedSelections: AccumulatorSelection[] = [];

  for (const sel of reqSelections) {
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, sel.eventId));

    if (!event) {
      res.status(404).json({ error: `Event ${sel.eventId} not found` });
      return;
    }

    const rawOdds = await db
      .select()
      .from(oddsTable)
      .where(eq(oddsTable.eventId, sel.eventId));

    if (!rawOdds.length) {
      res.status(400).json({ error: `No odds available for event ${sel.eventId}` });
      return;
    }

    const oddsList: OddsRow[] = rawOdds.map((o) => ({
      bookmakerId: o.bookmakerId,
      outcome: o.outcome as OutcomeKey,
      decimalOdds: parseFloat(o.decimalOdds),
    }));

    const selection = resolveSelection(event, oddsList, sel.outcome);
    if (!selection) {
      res
        .status(400)
        .json({ error: `Cannot compute odds for event ${sel.eventId} / outcome ${sel.outcome}` });
      return;
    }

    resolvedSelections.push(selection);
  }

  res.json(buildAccumulatorResult(resolvedSelections, bankroll));
});

// ─── GET /accumulator/smart-picks ───────────────────────────────────────────

router.get("/accumulator/smart-picks", async (req, res) => {
  const bankroll = Number(req.query.bankroll) || 1000;

  const events = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.status, "pending"));

  interface ValuePick {
    event: { id: number; homeTeam: string; awayTeam: string };
    outcome: OutcomeKey;
    ev: number;
    oddsList: OddsRow[];
  }

  const valuePicks: ValuePick[] = [];

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

    const byOutcome: Record<OutcomeKey, OddsRow[]> = { home: [], draw: [], away: [] };
    for (const row of oddsList) byOutcome[row.outcome].push(row);

    const activeOutcomes = (["home", "draw", "away"] as OutcomeKey[]).filter(
      (o) => byOutcome[o].length > 0,
    );
    if (activeOutcomes.length < 2) continue;

    const rawProbs: Record<string, number> = {};
    for (const o of activeOutcomes) {
      const probs = byOutcome[o].map((r) => 1 / r.decimalOdds);
      rawProbs[o] = probs.reduce((a, b) => a + b, 0) / probs.length;
    }
    const rawSum = Object.values(rawProbs).reduce((a, b) => a + b, 0);

    let bestEv = -Infinity;
    let bestOutcome: OutcomeKey | null = null;

    for (const o of activeOutcomes) {
      const trueProb = rawProbs[o] / rawSum;
      let best = byOutcome[o][0];
      for (const row of byOutcome[o]) {
        if (row.decimalOdds > best.decimalOdds) best = row;
      }
      const ev = (trueProb * best.decimalOdds - 1) * 100;
      if (ev > 0 && ev > bestEv) {
        bestEv = ev;
        bestOutcome = o;
      }
    }

    if (bestOutcome !== null) {
      valuePicks.push({
        event: { id: event.id, homeTeam: event.homeTeam, awayTeam: event.awayTeam },
        outcome: bestOutcome,
        ev: bestEv,
        oddsList,
      });
    }
  }

  // Sort by EV descending, take top 3
  valuePicks.sort((a, b) => b.ev - a.ev);
  const top = valuePicks.slice(0, 3);

  if (top.length < 2) {
    res.json({ message: "Not enough value bets found" });
    return;
  }

  const resolvedSelections: AccumulatorSelection[] = [];
  for (const pick of top) {
    const sel = resolveSelection(pick.event, pick.oddsList, pick.outcome);
    if (sel) resolvedSelections.push(sel);
  }

  if (resolvedSelections.length < 2) {
    res.json({ message: "Not enough value bets found" });
    return;
  }

  res.json(buildAccumulatorResult(resolvedSelections, bankroll));
});

export default router;
