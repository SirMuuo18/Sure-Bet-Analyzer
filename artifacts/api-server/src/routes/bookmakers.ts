import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bookmakersTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { validateBody, requireIntParam } from "../middlewares/validate";
import { adminWriteLimit } from "../middlewares/limits";
import { createBookmakerBodySchema } from "../lib/validation-schemas";

const router: IRouter = Router();

router.get("/bookmakers", async (_req, res) => {
  const bookmakers = await db
    .select()
    .from(bookmakersTable)
    .orderBy(bookmakersTable.name);
  res.json(bookmakers);
});

router.get("/bookmakers/:id", requireIntParam("id"), async (req, res) => {
  const id = Number(req.params.id);
  const [bookmaker] = await db
    .select()
    .from(bookmakersTable)
    .where(eq(bookmakersTable.id, id));
  if (!bookmaker) {
    res.status(404).json({ error: "Bookmaker not found" });
    return;
  }
  res.json(bookmaker);
});

router.post("/bookmakers", adminWriteLimit, requireAdmin, validateBody(createBookmakerBodySchema), async (req, res) => {
  const { name, url, isActive } = req.body as {
    name: string;
    url?: string;
    isActive?: boolean;
  };
  try {
    const [created] = await db
      .insert(bookmakersTable)
      .values({ name, url: url ?? null, isActive: isActive ?? true })
      .returning();
    res.status(201).json(created);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) {
      res.status(409).json({ error: "Bookmaker already exists" });
      return;
    }
    throw err;
  }
});

router.delete("/bookmakers/:id", adminWriteLimit, requireAdmin, requireIntParam("id"), async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await db
    .delete(bookmakersTable)
    .where(eq(bookmakersTable.id, id))
    .returning();
  if (!deleted.length) {
    res.status(404).json({ error: "Bookmaker not found" });
    return;
  }
  res.status(204).send();
});

export default router;
