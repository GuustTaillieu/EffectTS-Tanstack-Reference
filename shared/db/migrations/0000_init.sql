-- =============================================================================
-- Migration: 0000_init.sql
-- Description: Core schema for Better Auth and Spotify Music Quiz domain
-- Dialect: Standard SQL (Compatible with SQLite, PostgreSQL, and LibSQL/Turso)
-- =============================================================================

-- 1. Better Auth: Users
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  is_anonymous INTEGER DEFAULT 0
);

-- 2. Better Auth: User Sessions
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);

-- 3. Better Auth: Connected Accounts (Spotify OAuth tokens & credentials)
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  password TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 4. Better Auth: Email & Verification Tokens
CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

-- 5. Domain: Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 6. Domain: Game Sessions (Real-time hosted rooms)
CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  lobby_code TEXT NOT NULL,
  host_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  quiz_id TEXT REFERENCES quizzes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'lobby',
  started_at INTEGER,
  ended_at INTEGER,
  leaderboard_json TEXT
);

-- 7. Domain: Player Scores
CREATE TABLE IF NOT EXISTS player_scores (
  id TEXT PRIMARY KEY,
  game_session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  correct_guesses INTEGER NOT NULL DEFAULT 0
);
