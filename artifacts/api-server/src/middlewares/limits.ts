import { rateLimit } from "./rate-limit";

/**
 * Shared limiter instances (module-scoped, so state is shared across every
 * route that imports them) layered on top of the global floor in app.ts.
 * Placed *before* requireAdmin on each route so repeated bad-token guesses
 * get throttled too, not just successful writes.
 */

/** Admin-gated mutations (sports/bookmakers/events/odds CRUD, seed, opportunity scans). */
export const adminWriteLimit = rateLimit({ windowMs: 5 * 60_000, max: 60 });

/** Real-odds/results ingestion — hits a paid third-party API, so kept tight. */
export const ingestionLimit = rateLimit({ windowMs: 60 * 60_000, max: 10 });
