import axios, { type AxiosError } from "axios"
import { getAdminKey } from "./lib/adminAuth"

export const http = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
})

// Admin-only writes check this header server-side; harmless to attach to
// every request since public GETs simply ignore it.
http.interceptors.request.use((config) => {
  const key = getAdminKey()
  if (key) {
    config.headers.Authorization = `Bearer ${key}`
  }
  return config
})

/** Extracts the server's `{ error }` JSON message, falling back to a status-coded default. */
export function apiErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ error?: string }>
  const serverMessage = axiosErr?.response?.data?.error
  if (serverMessage) return serverMessage

  switch (axiosErr?.response?.status) {
    case 401:
      return "You need to sign in as admin to do that."
    case 403:
      return "Your admin credentials don't have permission to do that."
    case 400:
      return "That request looks invalid — check the fields and try again."
    case 429:
      return "Too many requests — please slow down."
    default:
      return axiosErr instanceof Error ? axiosErr.message : "Something went wrong."
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Sport {
  id: number
  name: string
  slug: string
  isActive: boolean
  createdAt: string
}

export interface Bookmaker {
  id: number
  name: string
  url: string | null
  isActive: boolean
}

export type EventStatus = "pending" | "live" | "completed" | "cancelled"

export interface SportEvent {
  id: number
  sportId: number
  homeTeam: string
  awayTeam: string
  startsAt: string
  status: EventStatus
}

export type Outcome = "home" | "draw" | "away"

export interface Odds {
  id: number
  eventId: number
  bookmakerId: number
  outcome: Outcome
  decimalOdds: string
}

export interface StakeDetail {
  bookmakerId: number
  odds: number
  stake: number
  payout: number
}

export interface Stakes {
  home: StakeDetail
  draw?: StakeDetail
  away: StakeDetail
}

export interface Opportunity {
  id: number
  eventId: number
  profitPercentage: string
  stakes: Stakes
  calculatedAt: string
}

export interface CalculateResult {
  found: number
  opportunities: Opportunity[]
}

export interface SeedResult {
  sport: Sport
  bookmakers: Bookmaker[]
  event: SportEvent
  oddsCount: number
}

// ─── Sports ──────────────────────────────────────────────────────────────────

export const getSports = () =>
  http.get<Sport[]>("/sports").then((r) => r.data)

export const createSport = (body: { name: string; slug: string }) =>
  http.post<Sport>("/sports", body).then((r) => r.data)

// ─── Bookmakers ───────────────────────────────────────────────────────────────

export const getBookmakers = () =>
  http.get<Bookmaker[]>("/bookmakers").then((r) => r.data)

export const createBookmaker = (body: { name: string; url?: string }) =>
  http.post<Bookmaker>("/bookmakers", body).then((r) => r.data)

// ─── Events ──────────────────────────────────────────────────────────────────

export const getEvents = (params?: { sportId?: number; status?: EventStatus }) =>
  http.get<SportEvent[]>("/events", { params }).then((r) => r.data)

export const createEvent = (body: {
  sportId: number
  homeTeam: string
  awayTeam: string
  startsAt: string
}) => http.post<SportEvent>("/events", body).then((r) => r.data)

// ─── Odds ─────────────────────────────────────────────────────────────────────

export const getOdds = (eventId: number) =>
  http.get<Odds[]>("/odds", { params: { eventId } }).then((r) => r.data)

export const submitOdds = (body: {
  eventId: number
  bookmakerId: number
  outcome: Outcome
  decimalOdds: number
}) => http.post<Odds>("/odds", body).then((r) => r.data)

// ─── Opportunities ────────────────────────────────────────────────────────────

export const getOpportunities = () =>
  http.get<Opportunity[]>("/opportunities").then((r) => r.data)

export const calculateOpportunities = (bankroll?: number) =>
  http.post<CalculateResult>("/opportunities/calculate", { bankroll }).then((r) => r.data)

// ─── Real Odds ────────────────────────────────────────────────────────────────

export const fetchRealOdds = () =>
  http.post<{ eventsProcessed: number; oddsStored: number } | { error: string }>("/fetch-real-odds").then((r) => r.data)

export const fetchResults = () =>
  http.post<{ resultsStored: number } | { error: string }>("/fetch-results").then((r) => r.data)

// ─── Seed ─────────────────────────────────────────────────────────────────────

export const seedDemoData = () =>
  http.post<SeedResult>("/seed").then((r) => r.data)

// ─── Predictions ──────────────────────────────────────────────────────────────

export interface TeamForm {
  homeTeamWinRate: number | null
  awayTeamWinRate: number | null
  h2hHomeWins: number
  h2hAwayWins: number
  h2hDraws: number
  dataPoints: number
}

export interface OutcomePrediction {
  outcome: "home" | "draw" | "away"
  trueProb: number
  formAdjustedProb: number
  bestOdds: number
  bestBookmakerId: number
  ev: number
  isValue: boolean
  isStrongValue: boolean
}

export interface Recommendation {
  outcome: "home" | "draw" | "away"
  odds: number
  bookmakerId: number
  ev: number
  confidence: "high" | "medium" | "low"
}

export interface Prediction {
  eventId: number
  homeTeam: string
  awayTeam: string
  startsAt: string
  bookmakerCount: number
  outcomes: OutcomePrediction[]
  recommendation: Recommendation | null
  form: TeamForm | null
}

export const getPredictions = () =>
  http.get<Prediction[]>("/predictions").then((r) => r.data)

// ─── Accumulator ──────────────────────────────────────────────────────────────

export interface AccumulatorSelection {
  eventId: number
  homeTeam: string
  awayTeam: string
  outcome: "home" | "draw" | "away"
  bestOdds: number
  bestBookmakerId: number
  trueProb: number
}

export interface AccumulatorResult {
  selections: AccumulatorSelection[]
  combinedOdds: number
  combinedProb: number
  ev: number
  kellyFraction: number
  recommendedStake: number
  potentialReturn: number
  potentialProfit: number
  isValueBet: boolean
}

export const buildAccumulator = (body: {
  selections: Array<{ eventId: number; outcome: string }>
  bankroll: number
}) =>
  http.post<AccumulatorResult>("/accumulator", body).then((r) => r.data)

export const smartPickAcca = (bankroll: number) =>
  http
    .get<AccumulatorResult | { message: string }>("/accumulator/smart-picks", { params: { bankroll } })
    .then((r) => r.data)
