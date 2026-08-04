import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sportsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/sports", async (_req, res) => {
  const sports = await db.select().from(sportsTable).orderBy(sportsTable.name);
  res.json(sports);
});

router.get("/sports/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [sport] = await db
    .select()
    .from(sportsTable)
    .where(eq(sportsTable.id, id));
  if (!sport) {
    res.status(404).json({ error: "Sport not found" });
    return;
  }
  res.json(sport);
});

router.post("/sports", async (req, res) => {
  const { name, slug, isActive } = req.body as {
    name: string;
    slug: string;
    isActive?: boolean;
  };
  try {
    const [created] = await db
      .insert(sportsTable)
      .values({ name, slug, isActive: isActive ?? true })
      .returning();
    res.status(201).json(created);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) {
      res.status(409).json({ error: "Sport already exists" });
      return;
    }
    throw err;
  }
});

router.delete("/sports/:id", async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await db
    .delete(sportsTable)
    .where(eq(sportsTable.id, id))
    .returning();
  if (!deleted.length) {
    res.status(404).json({ error: "Sport not found" });
    return;
  }
  res.status(204).send();
});

export default router;
