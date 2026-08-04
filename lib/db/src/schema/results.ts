import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core"

export const resultsTable = pgTable("results", {
  id: serial("id").primaryKey(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  homeScore: integer("home_score").notNull(),
  awayScore: integer("away_score").notNull(),
  sport: text("sport").notNull().default("football"),
  completedAt: timestamp("completed_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})
