import { z } from "zod";
import {
  CreateSportBody,
  CreateBookmakerBody,
  CreateEventBody,
  UpdateEventStatusBody,
  UpsertOddsBody,
  ListEventsQueryParams,
  ListOddsQueryParams,
  ListOpportunitiesQueryParams,
} from "@workspace/api-zod";

/**
 * Tightened request-body schemas layered on top of the generated OpenAPI
 * contract (`@workspace/api-zod`) — the generated schemas describe shape,
 * these add the bounds the spec doesn't encode (non-empty names, decimal
 * odds > 1, sane bankroll caps) per the security hardening pass.
 */

export const createSportBodySchema = CreateSportBody.extend({
  name: z.string().trim().min(1, "Name is required").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens only"),
});

export const createBookmakerBodySchema = CreateBookmakerBody.extend({
  name: z.string().trim().min(1, "Name is required").max(200),
  // z.string().url() alone accepts javascript:/data: URIs, which the Manage
  // Data UI renders straight into an <a href> — restrict to http(s) so a
  // malicious bookmaker URL can never become a stored-XSS payload.
  url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .refine((v) => /^https?:\/\//i.test(v), "URL must start with http:// or https://")
    .optional(),
});

export const createEventBodySchema = CreateEventBody.extend({
  sportId: z.number().int().positive(),
  homeTeam: z.string().trim().min(1, "Home team is required").max(200),
  awayTeam: z.string().trim().min(1, "Away team is required").max(200),
});

export const updateEventStatusBodySchema = UpdateEventStatusBody;

export const upsertOddsBodySchema = UpsertOddsBody.extend({
  eventId: z.number().int().positive(),
  bookmakerId: z.number().int().positive(),
  decimalOdds: z
    .number()
    .finite()
    .gt(1, "Decimal odds must be greater than 1")
    .lt(1000, "Decimal odds must be less than 1000"),
});

export const calculateOpportunitiesBodySchema = z.object({
  bankroll: z.number().finite().positive().max(10_000_000).optional(),
});

export const listEventsQuerySchema = ListEventsQueryParams;
export const listOddsQuerySchema = ListOddsQueryParams;
export const listOpportunitiesQuerySchema = ListOpportunitiesQueryParams;

const outcomeSchema = z.enum(["home", "draw", "away"]);

export const accumulatorBodySchema = z.object({
  selections: z
    .array(
      z.object({
        eventId: z.number().int().positive(),
        outcome: outcomeSchema,
      }),
    )
    .min(2, "At least 2 selections are required")
    .max(20, "At most 20 selections are allowed"),
  bankroll: z.number().finite().positive().max(10_000_000).optional().default(1000),
});

export const smartPicksQuerySchema = z.object({
  bankroll: z.coerce.number().finite().positive().max(10_000_000).optional(),
});
