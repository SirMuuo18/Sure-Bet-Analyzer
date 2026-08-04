import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookmakersTable = pgTable("bookmakers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  url: text("url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookmakerSchema = createInsertSchema(bookmakersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBookmaker = z.infer<typeof insertBookmakerSchema>;
export type Bookmaker = typeof bookmakersTable.$inferSelect;
