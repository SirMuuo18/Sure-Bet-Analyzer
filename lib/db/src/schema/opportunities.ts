import {
  pgTable,
  serial,
  integer,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";

export const opportunitiesTable = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => eventsTable.id),
  profitPercentage: numeric("profit_percentage", {
    precision: 10,
    scale: 4,
  }).notNull(),
  // JSON: { home: { bookmakerId, odds, stake }, draw?: {...}, away: {...} }
  stakes: jsonb("stakes").notNull(),
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
});

export const insertOpportunitySchema = createInsertSchema(
  opportunitiesTable,
).omit({ id: true, calculatedAt: true });
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Opportunity = typeof opportunitiesTable.$inferSelect;
