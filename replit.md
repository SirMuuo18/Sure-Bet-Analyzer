# Sure-Bet-Analyzer

A tool that tracks odds from multiple bookmakers, detects arbitrage (sure-bet) opportunities, and calculates optimal stake distribution to guarantee profit regardless of match outcome.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `PORT` — server port (e.g. 5000)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

| Concern | Path |
|---|---|
| DB schema | `lib/db/src/schema/` |
| OpenAPI spec | `lib/api-spec/openapi.yaml` |
| API routes | `artifacts/api-server/src/routes/` |
| Arbitrage logic | `artifacts/api-server/src/lib/arbitrage.ts` |
| Generated Zod schemas | `lib/api-zod/src/generated/` |
| Generated React Query hooks | `lib/api-client-react/src/generated/` |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/healthz | Health check |
| GET/POST | /api/sports | List / create sports |
| GET/DELETE | /api/sports/:id | Get / delete sport |
| GET/POST | /api/bookmakers | List / create bookmakers |
| GET/DELETE | /api/bookmakers/:id | Get / delete bookmaker |
| GET/POST | /api/events | List / create events |
| GET/PATCH | /api/events/:id | Get / update event status |
| GET/POST | /api/odds | List / upsert odds |
| DELETE | /api/odds/:id | Delete odds entry |
| GET | /api/opportunities | List arbitrage opportunities |
| GET | /api/opportunities/:id | Get single opportunity |
| POST | /api/opportunities/calculate | Run arbitrage scan on all pending events |

## Architecture decisions

- **Numeric odds stored as PG `numeric`** — avoids floating-point rounding errors when summing inverse odds
- **Upsert for odds** — bookmakers update existing odds; duplicate (event, bookmaker, outcome) tuples are overwritten rather than duplicated
- **`/opportunities/calculate` is a trigger** — arbitrage is not computed on every odds write; the caller explicitly triggers a scan so heavy events with many odds updates don't cause repeated recalculations
- **Best-odds selection** — for each outcome the highest decimal odds across all bookmakers are used; this maximises the chance of finding an arbitrage
- **Stake formula** — `stake_i = bankroll / (odds_i × Σ(1/odds_j))` distributes a fixed bankroll so all outcome payouts are equal

## Product

Users enter upcoming sporting events, configure which bookmakers they watch, and submit the latest decimal odds per bookmaker per outcome. Hitting `/api/opportunities/calculate` scans all pending events for arbitrage: it returns every event where the implied probability sum across the best available odds is below 100%, along with exact stake amounts for a £/$/€ 100 bankroll.

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml` — the generated Zod schemas and React Query hooks must stay in sync
- `pnpm --filter @workspace/db run push` requires a live Postgres instance via `DATABASE_URL`
- The `numeric` Drizzle column type is typed as `string` in TypeScript — always `parseFloat()` before arithmetic

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
