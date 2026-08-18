import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  sportsTable,
  bookmakersTable,
  eventsTable,
  oddsTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { adminWriteLimit } from "../middlewares/limits";

const router: IRouter = Router();

/**
 * POST /seed — loads demo data that guarantees an arbitrage opportunity.
 *
 * Creates (or reuses existing):
 *   - Sport: Football
 *   - Bookmakers: Betway KE + Sportpesa
 *   - Event: Arsenal vs Chelsea (tomorrow, pending)
 *   - Odds spread across the two bookmakers so best-odds implied sum < 1
 *
 * Betway:   home=2.20, draw=3.60, away=3.80
 * Sportpesa: home=2.15, draw=3.70, away=3.90
 * Best:     home=2.20, draw=3.70, away=3.90
 * Implied:  0.4545 + 0.2703 + 0.2564 = 0.9812  → +1.92% profit
 */
router.post("/seed", adminWriteLimit, requireAdmin, async (_req, res) => {
  // ── Sport ──────────────────────────────────────────────────────────────────
  let [sport] = await db
    .select()
    .from(sportsTable)
    .where(eq(sportsTable.slug, "football"));

  if (!sport) {
    [sport] = await db
      .insert(sportsTable)
      .values({ name: "Football", slug: "football" })
      .returning();
  }

  // ── Bookmakers ─────────────────────────────────────────────────────────────
  const bookmakerSeeds = [
    { name: "Sportpesa", url: "https://sportpesa.co.ke" },
    { name: "Betika", url: "https://betika.com" },
    { name: "Betway KE", url: "https://betway.co.ke" },
    { name: "Odibets", url: "https://odibets.com" },
    { name: "1xBet Kenya", url: "https://1xbet.co.ke" },
    { name: "Mozzartbet Kenya", url: "https://mozzartbet.co.ke" },
  ];

  const bookmakers = [];
  for (const seed of bookmakerSeeds) {
    let [bk] = await db
      .select()
      .from(bookmakersTable)
      .where(eq(bookmakersTable.name, seed.name));

    if (!bk) {
      [bk] = await db
        .insert(bookmakersTable)
        .values({ name: seed.name, url: seed.url })
        .returning();
    }
    bookmakers.push(bk);
  }

  const betway = bookmakers.find((b) => b.name === "Betway KE")!;
  const sportpesa = bookmakers.find((b) => b.name === "Sportpesa")!;

  // ── Event ──────────────────────────────────────────────────────────────────
  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow

  let [event] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.sportId, sport.id));

  if (!event) {
    [event] = await db
      .insert(eventsTable)
      .values({
        sportId: sport.id,
        homeTeam: "Arsenal",
        awayTeam: "Chelsea",
        startsAt,
        status: "pending",
      })
      .returning();
  }

  // ── Odds ───────────────────────────────────────────────────────────────────
  // Betway: home=2.20, draw=3.60, away=3.80
  // Sportpesa: home=2.15, draw=3.70, away=3.90
  // Best-odds combination gives +1.92% arbitrage profit
  const oddsData = [
    { bookmakerId: betway.id, outcome: "home" as const, decimalOdds: "2.20" },
    { bookmakerId: betway.id, outcome: "draw" as const, decimalOdds: "3.60" },
    { bookmakerId: betway.id, outcome: "away" as const, decimalOdds: "3.80" },
    { bookmakerId: sportpesa.id, outcome: "home" as const, decimalOdds: "2.15" },
    { bookmakerId: sportpesa.id, outcome: "draw" as const, decimalOdds: "3.70" },
    { bookmakerId: sportpesa.id, outcome: "away" as const, decimalOdds: "3.90" },
  ];

  for (const o of oddsData) {
    await db
      .insert(oddsTable)
      .values({ eventId: event.id, ...o })
      .onConflictDoUpdate({
        target: [oddsTable.eventId, oddsTable.bookmakerId, oddsTable.outcome],
        set: { decimalOdds: o.decimalOdds },
      });
  }

  res.json({
    sport,
    bookmakers,
    event,
    oddsCount: oddsData.length,
  });
});

export default router;
