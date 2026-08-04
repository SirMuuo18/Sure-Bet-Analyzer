import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  sportsTable,
  bookmakersTable,
  eventsTable,
  oddsTable,
} from "@workspace/db";

const router: IRouter = Router();

interface OddsApiOutcome {
  name: string;
  price: number;
}

interface OddsApiMarket {
  key: string;
  outcomes: OddsApiOutcome[];
}

interface OddsApiBookmaker {
  key: string;
  title: string;
  markets: OddsApiMarket[];
}

interface OddsApiGame {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

async function fetchOddsForSport(sportKey: string, apiKey: string): Promise<OddsApiGame[]> {
  const url =
    `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/` +
    `?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal&daysFrom=3`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`The-Odds-API error ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<OddsApiGame[]>;
}

router.post("/fetch-real-odds", async (req, res) => {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    res.status(400).json({ error: "ODDS_API_KEY not configured" });
    return;
  }

  // Ensure Football sport exists
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

  // Fetch from both sport keys
  const sportKeys = ["soccer_epl", "soccer_africa_nations"];
  let allGames: OddsApiGame[] = [];

  for (const sportKey of sportKeys) {
    try {
      const games = await fetchOddsForSport(sportKey, apiKey);
      allGames = allGames.concat(games);
    } catch (err) {
      // If one sport fails (e.g. no upcoming games), continue with the other
      console.error(`Failed to fetch ${sportKey}:`, err);
    }
  }

  let eventsProcessed = 0;
  let oddsStored = 0;

  for (const game of allGames) {
    // Upsert event
    let [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.homeTeam, game.home_team))
      // Further narrow by awayTeam check below since drizzle needs a single where
      .then((rows) => rows.filter((r) => r.awayTeam === game.away_team));

    if (!event) {
      [event] = await db
        .insert(eventsTable)
        .values({
          sportId: sport.id,
          homeTeam: game.home_team,
          awayTeam: game.away_team,
          startsAt: new Date(game.commence_time),
          status: "pending",
        })
        .returning();
    }

    eventsProcessed++;

    for (const bkData of game.bookmakers) {
      // Upsert bookmaker by title
      let [bookmaker] = await db
        .select()
        .from(bookmakersTable)
        .where(eq(bookmakersTable.name, bkData.title));

      if (!bookmaker) {
        [bookmaker] = await db
          .insert(bookmakersTable)
          .values({ name: bkData.title, url: null })
          .returning();
      }

      const h2hMarket = bkData.markets.find((m) => m.key === "h2h");
      if (!h2hMarket) continue;

      for (const outcome of h2hMarket.outcomes) {
        let outcomeKey: "home" | "draw" | "away";
        if (outcome.name === game.home_team) {
          outcomeKey = "home";
        } else if (outcome.name === game.away_team) {
          outcomeKey = "away";
        } else {
          outcomeKey = "draw";
        }

        await db
          .insert(oddsTable)
          .values({
            eventId: event.id,
            bookmakerId: bookmaker.id,
            outcome: outcomeKey,
            decimalOdds: String(outcome.price),
          })
          .onConflictDoUpdate({
            target: [oddsTable.eventId, oddsTable.bookmakerId, oddsTable.outcome],
            set: { decimalOdds: String(outcome.price) },
          });

        oddsStored++;
      }
    }
  }

  res.json({ eventsProcessed, oddsStored });
});

export default router;
