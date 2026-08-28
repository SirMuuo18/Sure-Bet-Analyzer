import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Hash-then-compare so mismatched lengths don't short-circuit early and leak
 * timing information about the secret's length.
 */
function safeEquals(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Single shared admin credential — this app has no user accounts, just one
 * trusted operator, so a bearer token (set as ADMIN_API_KEY) is the
 * least-destructive fit rather than standing up a full user/session system.
 *
 * - No/malformed Authorization header → 401 (never attempted to authenticate)
 * - Well-formed Bearer token that doesn't match → 403 (attempted, rejected)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) {
    // Fail closed: an unconfigured server should refuse admin actions, not allow them.
    res.status(500).json({ error: "Admin access is not configured on this server" });
    return;
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token || !safeEquals(token, configuredKey)) {
    res.status(403).json({ error: "Invalid admin credentials" });
    return;
  }

  next();
}

/**
 * For trusted server-side ingestion (odds/results fetch from the paid
 * upstream API). Accepts, in order:
 *
 * 1. `Authorization: Bearer <CRON_SECRET>` — Vercel Cron Jobs automatically
 *    send this exact header (from the project's CRON_SECRET env var) when
 *    invoking a scheduled path; Vercel Cron cannot set arbitrary custom
 *    headers, so this is the only way a *real* Vercel cron request can prove
 *    itself.
 * 2. A legacy `x-cron-secret` header matched against CRON_SECRET, kept for
 *    any non-Vercel scheduler (e.g. a GitHub Action) that can set arbitrary
 *    headers.
 * 3. Falls back to requireAdmin's normal 401/403/500 semantics — today's
 *    only caller is an operator triggering a manual refresh from the UI.
 */
export function requireAdminOrCron(req: Request, res: Response, next: NextFunction): void {
  const cronSecret = process.env.CRON_SECRET;

  const authHeader = req.headers.authorization;
  if (cronSecret && authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token && safeEquals(token, cronSecret)) {
      next();
      return;
    }
  }

  const legacyHeader = req.headers["x-cron-secret"];
  if (cronSecret && typeof legacyHeader === "string" && safeEquals(legacyHeader, cronSecret)) {
    next();
    return;
  }

  requireAdmin(req, res, next);
}
