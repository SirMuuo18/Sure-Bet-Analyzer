import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, oddsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/odds", async (req, res) => {
  const { eventId, bookmakerId } = req.query as {
    eventId?: string;
    bookmakerId?: string;
  };

  const conditions = [];
  if (eventId) conditions.push(eq(oddsTable.eventId, Number(eventId)));
  if (bookmakerId)
    conditions.push(eq(oddsTable.bookmakerId, Number(bookmakerId)));

  const odds = await db
    .select()
    .from(oddsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(oddsTable.eventId, oddsTable.outcome);
  res.json(odds);
});

router.post("/odds", async (req, res) => {
  const { eventId, bookmakerId, outcome, decimalOdds } = req.body as {
    eventId: number;
    bookmakerId: number;
    outcome: "home" | "draw" | "away";
    decimalOdds: number;
  };

  // Upsert: update if (eventId, bookmakerId, outcome) already exists
  const existing = await db
    .select()
    .from(oddsTable)
    .where(
      and(
        eq(oddsTable.eventId, eventId),
        eq(oddsTable.bookmakerId, bookmakerId),
        eq(oddsTable.outcome, outcome),
      ),
    );

  if (existing.length) {
    const [updated] = await db
      .update(oddsTable)
      .set({ decimalOdds: String(decimalOdds), updatedAt: new Date() })
      .where(eq(oddsTable.id, existing[0].id))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(oddsTable)
      .values({ eventId, bookmakerId, outcome, decimalOdds: String(decimalOdds) })
      .returning();
    res.json(created);
  }
});

router.delete("/odds/:id", async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await db
    .delete(oddsTable)
    .where(eq(oddsTable.id, id))
    .returning();
  if (!deleted.length) {
    res.status(404).json({ error: "Odds not found" });
    return;
  }
  res.status(204).send();
});

export default router;
