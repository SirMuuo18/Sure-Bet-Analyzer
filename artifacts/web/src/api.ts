import axios from "axios"

export const http = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
})

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

export interface Stakes {
  home: number
  draw?: number
  away: number
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

export const calculateOpportunities = () =>
  http.post<CalculateResult>("/opportunities/calculate").then((r) => r.data)
