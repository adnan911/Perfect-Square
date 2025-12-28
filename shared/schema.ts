import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  score: integer("score").notNull(),
  metrics: jsonb("metrics").$type<{
    closure: number;
    angles: number;
    sides: number;
    straightness: number;
  }>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScoreSchema = createInsertSchema(scores).omit({ 
  id: true, 
  createdAt: true 
});

export type Score = typeof scores.$inferSelect;
export type InsertScore = z.infer<typeof insertScoreSchema>;
