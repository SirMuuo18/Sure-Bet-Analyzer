import {
  pgTable,
  serial,
  integer,
  numeric,
  timestamp,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";
import { bookmakersTable } from "./bookmakers";

export const outcomeEnum = pgEnum("outcome", ["home", "draw", "away"]);

export const oddsTable = pgTable(
  "odds",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => eventsTable.id),
    bookmakerId: integer("bookmaker_id")
      .notNull()
      .references(() => bookmakersTable.id),
    outcome: outcomeEnum("outcome").notNull(),
    decimalOdds: numeric("decimal_odds", { precision: 10, scale: 4 }).notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.eventId, t.bookmakerId, t.outcome)],
);

export const insertOddsSchema = createInsertSchema(oddsTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertOdds = z.infer<typeof insertOddsSchema>;
export type Odds = typeof oddsTable.$inferSelect;
