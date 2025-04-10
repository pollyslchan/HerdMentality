import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  totalRounds: integer("total_rounds").notNull(),
  currentRound: integer("current_round").notNull().default(1),
  isComplete: boolean("is_complete").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  gameCode: text("game_code").notNull().default(""),
});

export const insertGameSchema = createInsertSchema(games).pick({
  totalRounds: true,
  gameCode: true,
}).extend({
  gameCode: z.string().optional(),
});

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  name: text("name").notNull(),
  score: integer("score").notNull().default(0),
  color: text("color").notNull(),
  order: integer("order").notNull(),
});

export const insertPlayerSchema = createInsertSchema(players).pick({
  gameId: true,
  name: true,
  color: true,
  order: true,
});

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  text: true,
});

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export const rounds = pgTable("rounds", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  questionId: integer("question_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  isComplete: boolean("is_complete").notNull().default(false),
});

export const insertRoundSchema = createInsertSchema(rounds).pick({
  gameId: true,
  questionId: true,
  roundNumber: true,
});

export type InsertRound = z.infer<typeof insertRoundSchema>;
export type Round = typeof rounds.$inferSelect;

export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").notNull(),
  playerId: integer("player_id").notNull(),
  text: text("text").notNull(),
  isCommon: boolean("is_common").notNull().default(false),
  isBlackSheep: boolean("is_black_sheep").notNull().default(false),
});

export const insertAnswerSchema = createInsertSchema(answers).pick({
  roundId: true,
  playerId: true,
  text: true,
});

export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type Answer = typeof answers.$inferSelect;

// Enhanced types for the frontend
export interface PlayerWithAnswer extends Player {
  answer?: string;
  hasSubmitted?: boolean;
  isCommon?: boolean;
  isBlackSheep?: boolean;
}

export interface RoundWithDetails extends Round {
  question: Question;
  answers: Answer[];
}

export interface GameWithDetails extends Game {
  players: PlayerWithAnswer[];
  rounds: RoundWithDetails[];
  currentQuestion?: Question;
}
