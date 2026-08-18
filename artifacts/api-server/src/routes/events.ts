import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, eventsTable, sportsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { validateBody, requireIntParam } from "../middlewares/validate";
import { adminWriteLimit } from "../middlewares/limits";
import { createEventBodySchema, updateEventStatusBodySchema } from "../lib/validation-schemas";

const router: IRouter = Router();

router.get("/events", async (req, res) => {
  const { sportId, status } = req.query as {
    sportId?: string;
    status?: string;
  };

  const validStatuses = ["pending", "live", "completed", "cancelled"];
  if (status !== undefined && !validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status — must be one of ${validStatuses.join(", ")}` });
    return;
  }
  if (sportId !== undefined && (!Number.isInteger(Number(sportId)) || Number(sportId) <= 0)) {
    res.status(400).json({ error: "Invalid sportId — must be a positive integer" });
    return;
  }

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

router.get("/events/:id", requireIntParam("id"), async (req, res) => {
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

router.post("/events", adminWriteLimit, requireAdmin, validateBody(createEventBodySchema), async (req, res) => {
  const { sportId, homeTeam, awayTeam, startsAt, status } = req.body as {
    sportId: number;
    homeTeam: string;
    awayTeam: string;
    startsAt: string | Date;
    status?: "pending" | "live" | "completed" | "cancelled";
  };

  const [sport] = await db.select().from(sportsTable).where(eq(sportsTable.id, sportId));
  if (!sport) {
    res.status(400).json({ error: `Sport ${sportId} does not exist` });
    return;
  }

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

router.patch(
  "/events/:id",
  adminWriteLimit,
  requireAdmin,
  requireIntParam("id"),
  validateBody(updateEventStatusBodySchema),
  async (req, res) => {
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
  },
);

export default router;
