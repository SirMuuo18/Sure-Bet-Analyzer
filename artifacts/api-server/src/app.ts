import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { rateLimit } from "./middlewares/rate-limit";

const app: Express = express();

// Stop leaking "Express" via the default header, and set the handful of
// response headers that are safe to apply blanket to a pure JSON API (no
// CSP here — this is a data API with no HTML/script responses of its own,
// and the frontend's own CSP needs asset-by-asset auditing to avoid
// breaking Vite's build; that's flagged as a follow-up, not done blindly).
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// The frontend is always served from the same origin as this API (see
// scripts/vercel-build.mjs — one Vercel deployment routes /api/* to this
// function and everything else to the SPA), so same-origin browser calls
// never go through CORS at all. This allowlist only governs *other* origins
// trying to call the API directly from a browser. CORS_ORIGINS is a
// comma-separated list; dev origins are never hard-coded into prod logic.
const configuredOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const devOrigins = process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173"];
const allowedOrigins = new Set([...configuredOrigins, ...devOrigins]);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = same-origin request, curl, or server-to-server —
      // the browser only enforces CORS on cross-origin requests anyway.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Floor-level anti-abuse limit across all API routes; tighter limits are
// layered on top of specific admin/ingestion routes further down the chain.
app.use("/api", rateLimit({ windowMs: 60_000, max: 300 }));

app.get("/", (_req, res) => {
  res.json({ name: "Sure-Bet-Analyzer API", version: "0.1.0", docs: "/api/healthz" });
});

app.use("/api", router);

// Global error handler — catches errors thrown in async route handlers
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
