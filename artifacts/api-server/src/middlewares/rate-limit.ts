import type { NextFunction, Request, Response } from "express";

/**
 * Minimal in-memory fixed-window rate limiter. No new dependency, no external
 * store — proportionate to this app's actual traffic. Honest limitation: on
 * serverless (Vercel), each cold-started instance has its own counters, so
 * this blunts casual abuse/brute-forcing rather than guaranteeing a hard cap
 * under distributed load. A shared store (e.g. Redis/Upstash) would be needed
 * for a hard guarantee, which isn't justified by this app's current traffic.
 */
export function rateLimit({
  windowMs,
  max,
  keyFn,
}: {
  windowMs: number;
  max: number;
  keyFn?: (req: Request) => string;
}) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyFn ? keyFn(req) : (req.ip ?? "unknown");
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({ error: "Too many requests — please slow down" });
      return;
    }

    entry.count++;
    next();
  };
}
