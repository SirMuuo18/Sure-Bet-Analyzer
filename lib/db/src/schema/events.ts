import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sportsTable } from "./sports";

export const eventStatusEnum = pgEnum("event_status", [
  "pending",
  "live",
  "completed",
  "cancelled",
]);

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  sportId: integer("sport_id")
    .notNull()
    .references(() => sportsTable.id),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  status: eventStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
