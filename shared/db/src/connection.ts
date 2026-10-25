import Database from "better-sqlite3"
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema/index"
import path from "node:path"
import fs from "node:fs"
import { fileURLToPath } from "node:url"

export type AppDatabase = BetterSQLite3Database<typeof schema>

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Loads the SQL migration file.
 */
function loadInitSql(): string {
  const possiblePaths = [
    path.resolve(__dirname, "../migrations/0000_init.sql"),
    path.resolve(process.cwd(), "shared/db/migrations/0000_init.sql"),
    path.resolve(process.cwd(), "../../shared/db/migrations/0000_init.sql")
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, "utf-8")
    }
  }

  // Fallback if file not found in build bundle
  return `
    CREATE TABLE IF NOT EXISTS user (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, email_verified INTEGER NOT NULL DEFAULT 0, image TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, is_anonymous INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS session (id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, token TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, ip_address TEXT, user_agent TEXT, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS account (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, provider_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, access_token TEXT, refresh_token TEXT, id_token TEXT, access_token_expires_at INTEGER, refresh_token_expires_at INTEGER, scope TEXT, password TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS verification (id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER, updated_at INTEGER);
    CREATE TABLE IF NOT EXISTS quizzes (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS game_sessions (id TEXT PRIMARY KEY, lobby_code TEXT NOT NULL, host_user_id TEXT REFERENCES user(id) ON DELETE SET NULL, quiz_id TEXT REFERENCES quizzes(id) ON DELETE SET NULL, status TEXT NOT NULL DEFAULT 'lobby', started_at INTEGER, ended_at INTEGER, leaderboard_json TEXT);
    CREATE TABLE IF NOT EXISTS player_scores (id TEXT PRIMARY KEY, game_session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE, user_id TEXT REFERENCES user(id) ON DELETE SET NULL, player_name TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, correct_guesses INTEGER NOT NULL DEFAULT 0);
  `
}

/**
 * Creates or retrieves the database connection.
 * If in test mode (NODE_ENV=test or VITEST=true), uses an in-memory database.
 */
export function createDatabase(dbPath?: string): { sqlite: Database.Database; db: AppDatabase } {
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"
  
  let targetPath = ":memory:"
  if (!isTest) {
    if (dbPath) {
      targetPath = dbPath
    } else if (process.env.DATABASE_URL) {
      targetPath = process.env.DATABASE_URL
    } else {
      const dataDir = path.resolve(process.cwd(), "data")
      if (!fs.existsSync(dataDir)) {
        try {
          fs.mkdirSync(dataDir, { recursive: true })
        } catch {
          // Ignore
        }
      }
      targetPath = path.resolve(process.cwd(), "quiz.db")
    }
  }

  const sqlite = new Database(targetPath)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")

  // Execute external migration SQL
  const initSql = loadInitSql()
  sqlite.exec(initSql)

  const db = drizzle(sqlite, { schema })
  return { sqlite, db }
}

// Global singleton instance preserved across Vite HMR
const globalForDb = globalThis as unknown as {
  __QUIZ_DB_INSTANCE__?: { sqlite: Database.Database; db: AppDatabase }
}

export const dbInstance = globalForDb.__QUIZ_DB_INSTANCE__ ??= createDatabase()
export const db = dbInstance.db
export const sqlite = dbInstance.sqlite
