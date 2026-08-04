import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/events", async (req, res) => {
  const { sportId, status } = req.query as {
    sportId?: string;
    status?: string;
  };

  const conditions = [];
  if (sportId) conditions.push(eq(eventsTable.sportId, Number(sportId)));
  if (status)
    conditions.push(
      eq(
        eventsTable.status,
        status as "pending" | "live" | "completed" | "cancelled",
      ),
    );

  const events = await db
    .select()
    .from(eventsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(eventsTable.startsAt);
  res.json(events);
});

router.get("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [event] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, id));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(event);
});

router.post("/events", async (req, res) => {
  const { sportId, homeTeam, awayTeam, startsAt, status } = req.body as {
    sportId: number;
    homeTeam: string;
    awayTeam: string;
    startsAt: string;
    status?: "pending" | "live" | "completed" | "cancelled";
  };
  const [created] = await db
    .insert(eventsTable)
    .values({
      sportId,
      homeTeam,
      awayTeam,
      startsAt: new Date(startsAt),
      status: status ?? "pending",
    })
    .returning();
  res.status(201).json(created);
});

router.patch("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body as {
    status: "pending" | "live" | "completed" | "cancelled";
  };
  const [updated] = await db
    .update(eventsTable)
    .set({ status })
    .where(eq(eventsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(updated);
});

export default router;
