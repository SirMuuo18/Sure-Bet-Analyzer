import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sportsTable = pgTable("sports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSportSchema = createInsertSchema(sportsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSport = z.infer<typeof insertSportSchema>;
export type Sport = typeof sportsTable.$inferSelect;
