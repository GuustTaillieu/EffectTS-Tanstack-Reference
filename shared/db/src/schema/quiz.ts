import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { user } from "./auth"

export const quizzes = sqliteTable("quizzes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
})

export const gameSessions = sqliteTable("game_sessions", {
  id: text("id").primaryKey(),
  lobbyCode: text("lobby_code").notNull(),
  hostUserId: text("host_user_id").references(() => user.id, { onDelete: "set null" }),
  quizId: text("quiz_id").references(() => quizzes.id, { onDelete: "set null" }),
  status: text("status", { enum: ["lobby", "active", "completed"] }).notNull().default("lobby"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  endedAt: integer("ended_at", { mode: "timestamp" }),
  leaderboardJson: text("leaderboard_json") // Stores final scores & podium
})

export const playerScores = sqliteTable("player_scores", {
  id: text("id").primaryKey(),
  gameSessionId: text("game_session_id")
    .notNull()
    .references(() => gameSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  playerName: text("player_name").notNull(),
  score: integer("score").notNull().default(0),
  correctGuesses: integer("correct_guesses").notNull().default(0)
})
