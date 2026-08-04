import { Router, type IRouter } from "express";
import { eq, and, gte, desc } from "drizzle-orm";
import { db, opportunitiesTable, oddsTable, eventsTable } from "@workspace/db";
import {
  calculateArbitrage,
  bestOddsPerOutcome,
  type OddsEntry,
} from "../lib/arbitrage";

const router: IRouter = Router();

router.get("/opportunities", async (req, res) => {
  const { eventId, minProfit } = req.query as {
    eventId?: string;
    minProfit?: string;
  };

  const conditions = [];
  if (eventId)
    conditions.push(eq(opportunitiesTable.eventId, Number(eventId)));
  if (minProfit)
    conditions.push(
      gte(opportunitiesTable.profitPercentage, String(minProfit)),
    );

  const opportunities = await db
    .select()
    .from(opportunitiesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(opportunitiesTable.profitPercentage));
  res.json(opportunities);
});

router.get("/opportunities/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [opportunity] = await db
    .select()
    .from(opportunitiesTable)
    .where(eq(opportunitiesTable.id, id));
  if (!opportunity) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }
  res.json(opportunity);
});

router.post("/opportunities/calculate", async (req, res) => {
  const bankroll: number = typeof req.body?.bankroll === "number" ? req.body.bankroll : 1000;

  // Fetch all pending/live events
  const events = await db
    .select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.status, "pending"),
      ),
    );

  const newOpportunities = [];

  for (const event of events) {
    const rawOdds = await db
      .select()
      .from(oddsTable)
      .where(eq(oddsTable.eventId, event.id));

    if (!rawOdds.length) continue;

    const oddsList: OddsEntry[] = rawOdds.map((o) => ({
      bookmakerId: o.bookmakerId,
      outcome: o.outcome as "home" | "draw" | "away",
      odds: parseFloat(o.decimalOdds),
    }));

    const best = bestOddsPerOutcome(oddsList);
    if (!best) continue;

    const result = calculateArbitrage(best, bankroll);
    if (!result) continue;

    // Persist the opportunity (replace any prior calculation for this event)
    const [existing] = await db
      .select()
      .from(opportunitiesTable)
      .where(eq(opportunitiesTable.eventId, event.id));

    let saved;
    if (existing) {
      [saved] = await db
        .update(opportunitiesTable)
        .set({
          profitPercentage: String(result.profitPercentage),
          stakes: result.stakes,
          calculatedAt: new Date(),
        })
        .where(eq(opportunitiesTable.id, existing.id))
        .returning();
    } else {
      [saved] = await db
        .insert(opportunitiesTable)
        .values({
          eventId: event.id,
          profitPercentage: String(result.profitPercentage),
          stakes: result.stakes,
        })
        .returning();
    }

    newOpportunities.push(saved);
  }

  res.json({ found: newOpportunities.length, opportunities: newOpportunities });
});

export default router;
