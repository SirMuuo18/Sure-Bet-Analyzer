import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  sportsTable,
  bookmakersTable,
  eventsTable,
  oddsTable,
  resultsTable,
} from "@workspace/db";
import { requireAdminOrCron } from "../middlewares/auth";
import { ingestionLimit } from "../middlewares/limits";

const router: IRouter = Router();

/**
 * Curated set of major, currently-active football competitions on
 * The-Odds-API. This is deliberately not "every league they support" (~40+
 * keys) — each key queried costs API quota per ingestion run, so a broad
 * default list here times that quota by ~15x instead of ~40x. Override via
 * ODDS_API_SPORT_KEYS (comma-separated sport_keys) if you want a different
 * set, without a code change or redeploy.
 */
const DEFAULT_LEAGUES: Record<string, string> = {
  soccer_epl: "Premier League",
  soccer_efl_champ: "Championship",
  soccer_spain_la_liga: "La Liga",
  soccer_germany_bundesliga: "Bundesliga",
  soccer_italy_serie_a: "Serie A",
  soccer_france_ligue_one: "Ligue 1",
  soccer_netherlands_eredivisie: "Eredivisie",
  soccer_portugal_primeira_liga: "Primeira Liga",
  soccer_uefa_champs_league: "Champions League",
  soccer_uefa_europa_league: "Europa League",
  soccer_africa_nations: "Africa Cup of Nations",
  soccer_brazil_campeonato: "Brasileirão",
  soccer_conmebol_copa_libertadores: "Copa Libertadores",
  soccer_usa_mls: "MLS",
  soccer_spl: "Scottish Premiership",
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Human-readable name for a sport_key not in DEFAULT_LEAGUES (custom override keys). */
function fallbackLeagueName(sportKey: string): string {
  return sportKey
    .replace(/^soccer_/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getSportKeys(): { key: string; name: string }[] {
  const override = process.env.ODDS_API_SPORT_KEYS;
  if (override && override.trim()) {
    return override
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((key) => ({ key, name: DEFAULT_LEAGUES[key] ?? fallbackLeagueName(key) }));
  }
  return Object.entries(DEFAULT_LEAGUES).map(([key, name]) => ({ key, name }));
}

/** Finds or creates the sports row for a given league, keyed by slug. */
async function getOrCreateLeagueSport(name: string) {
  const slug = slugify(name);
  let [sport] = await db.select().from(sportsTable).where(eq(sportsTable.slug, slug));
  if (!sport) {
    [sport] = await db.insert(sportsTable).values({ name, slug }).returning();
  }
  return sport;
}

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
  // No date-range param here: The-Odds-API's /odds endpoint doesn't support
  // one (that's /scores only) — it simply returns everything bookmakers
  // currently have lines posted for, which is however far out that
  // extends (often 1-3+ weeks for major leagues). Running this on a
  // recurring schedule, not the date param, is what keeps every week covered.
  const url =
    `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/` +
    `?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`The-Odds-API error ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<OddsApiGame[]>;
}

async function handleFetchRealOdds(_req: Request, res: Response) {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    res.status(400).json({ error: "ODDS_API_KEY not configured" });
    return;
  }

  const leagues = getSportKeys();
  const sportByKey = new Map<string, Awaited<ReturnType<typeof getOrCreateLeagueSport>>>();
  for (const league of leagues) {
    sportByKey.set(league.key, await getOrCreateLeagueSport(league.name));
  }

  const gamesByLeague: { sportKey: string; games: OddsApiGame[] }[] = [];
  const leagueErrors: Record<string, string> = {};

  for (const league of leagues) {
    try {
      const games = await fetchOddsForSport(league.key, apiKey);
      gamesByLeague.push({ sportKey: league.key, games });
    } catch (err) {
      // If one league fails (e.g. off-season, no upcoming games, bad key),
      // continue with the rest rather than aborting the whole ingestion run.
      leagueErrors[league.key] = err instanceof Error ? err.message : String(err);
    }
  }

  let eventsProcessed = 0;
  let oddsStored = 0;

  for (const { sportKey, games } of gamesByLeague) {
    const sport = sportByKey.get(sportKey)!;

    for (const game of games) {
      let [event] = await db
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.homeTeam, game.home_team))
        .then((rows) => rows.filter((r) => r.awayTeam === game.away_team && r.sportId === sport.id));

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
  }

  res.json({
    eventsProcessed,
    oddsStored,
    leaguesQueried: leagues.map((l) => l.key),
    leagueErrors: Object.keys(leagueErrors).length ? leagueErrors : undefined,
  });
}

router.post("/fetch-real-odds", ingestionLimit, requireAdminOrCron, handleFetchRealOdds);
router.get("/fetch-real-odds", ingestionLimit, requireAdminOrCron, handleFetchRealOdds);

interface OddsApiScore {
  name: string;
  score: string;
}

interface OddsApiCompletedGame {
  id: string;
  sport_key: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: OddsApiScore[] | null;
}

async function fetchScoresForSport(sportKey: string, apiKey: string): Promise<OddsApiCompletedGame[]> {
  // daysFrom is real (and meaningful) for /scores, unlike /odds above — 3 is
  // The-Odds-API's own maximum for this parameter.
  const url =
    `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/` +
    `?apiKey=${apiKey}&daysFrom=3`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`The-Odds-API scores error ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<OddsApiCompletedGame[]>;
}

async function handleFetchResults(_req: Request, res: Response) {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    res.status(400).json({ error: "ODDS_API_KEY not configured" });
    return;
  }

  const leagues = getSportKeys();
  let allGames: OddsApiCompletedGame[] = [];

  for (const league of leagues) {
    try {
      const games = await fetchScoresForSport(league.key, apiKey);
      allGames = allGames.concat(games);
    } catch (err) {
      console.error(`Failed to fetch scores for ${league.key}:`, err);
    }
  }

  let resultsStored = 0;

  for (const game of allGames) {
    if (!game.completed || !game.scores || game.scores.length < 2) continue;

    const homeScoreEntry = game.scores.find((s) => s.name === game.home_team);
    const awayScoreEntry = game.scores.find((s) => s.name === game.away_team);

    if (!homeScoreEntry || !awayScoreEntry) continue;

    const homeScore = parseInt(homeScoreEntry.score, 10);
    const awayScore = parseInt(awayScoreEntry.score, 10);

    if (isNaN(homeScore) || isNaN(awayScore)) continue;

    const completedAt = new Date(game.commence_time);

    try {
      const existing = await db
        .select()
        .from(resultsTable)
        .where(
          and(
            eq(resultsTable.homeTeam, game.home_team),
            eq(resultsTable.awayTeam, game.away_team),
            eq(resultsTable.completedAt, completedAt),
          ),
        );

      if (existing.length === 0) {
        await db.insert(resultsTable).values({
          homeTeam: game.home_team,
          awayTeam: game.away_team,
          homeScore,
          awayScore,
          sport: game.sport_key,
          completedAt,
        });
        resultsStored++;
      }
    } catch (dbErr) {
      console.error("DB error storing result:", dbErr);
      // Table may not exist yet — degrade gracefully
    }
  }

  res.json({ resultsStored });
}

router.post("/fetch-results", ingestionLimit, requireAdminOrCron, handleFetchResults);
router.get("/fetch-results", ingestionLimit, requireAdminOrCron, handleFetchResults);

export default router;
