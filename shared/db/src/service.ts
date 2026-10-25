import { Context, Effect, Layer, Schema } from "effect"
import { db, AppDatabase } from "./connection"
import { account, user, gameSessions, playerScores } from "./schema/index"
import { eq, and } from "drizzle-orm"

export class DbError extends Schema.TaggedError<DbError>()("DbError", {
  message: Schema.String,
}) {}

export interface UserRecord {
  id: string
  name: string
  email: string
  image: string | null
}

export interface AccountRecord {
  id: string
  userId: string
  providerId: string
  accountId: string
  accessToken: string | null
  refreshToken: string | null
  accessTokenExpiresAt: Date | null
  scope: string | null
}

/**
 * Dialect-agnostic Database Service interface.
 * Decouples business logic from specific database drivers (SQLite vs PostgreSQL vs Turso).
 */
export class DatabaseService extends Context.Service<
  DatabaseService,
  {
    readonly db: AppDatabase
    readonly users: {
      readonly findById: (id: string) => Effect.Effect<UserRecord | null, DbError>
      readonly getSpotifyAccount: (userId: string) => Effect.Effect<AccountRecord | null, DbError>
    }
    readonly gameSessions: {
      readonly create: (data: {
        id: string
        lobbyCode: string
        hostUserId?: string
        quizId?: string
      }) => Effect.Effect<void, DbError>
      readonly complete: (
        lobbyCode: string,
        leaderboardJson: string
      ) => Effect.Effect<void, DbError>
    }
  }
>()("DatabaseService") {}

export const makeDatabaseService = Effect.sync(() => ({
  db,
  users: {
    findById: (id: string) =>
      Effect.try({
        try: () => {
          const res = db.select().from(user).where(eq(user.id, id)).get()
          if (!res) return null
          return {
            id: res.id,
            name: res.name,
            email: res.email,
            image: res.image,
          }
        },
        catch: (err) => new DbError({ message: String(err) }),
      }),

    getSpotifyAccount: (userId: string) =>
      Effect.try({
        try: () => {
          const res = db
            .select()
            .from(account)
            .where(and(eq(account.userId, userId), eq(account.providerId, "spotify")))
            .get()
          if (!res) return null
          return {
            id: res.id,
            userId: res.userId,
            providerId: res.providerId,
            accountId: res.accountId,
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            accessTokenExpiresAt: res.accessTokenExpiresAt,
            scope: res.scope,
          }
        },
        catch: (err) => new DbError({ message: String(err) }),
      }),
  },
  gameSessions: {
    create: (data: { id: string; lobbyCode: string; hostUserId?: string; quizId?: string }) =>
      Effect.try({
        try: () => {
          db.insert(gameSessions)
            .values({
              id: data.id,
              lobbyCode: data.lobbyCode,
              hostUserId: data.hostUserId,
              quizId: data.quizId,
              status: "lobby",
              startedAt: new Date(),
            })
            .run()
        },
        catch: (err) => new DbError({ message: String(err) }),
      }),

    complete: (lobbyCode: string, leaderboardJson: string) =>
      Effect.try({
        try: () => {
          db.update(gameSessions)
            .set({
              status: "completed",
              endedAt: new Date(),
              leaderboardJson,
            })
            .where(eq(gameSessions.lobbyCode, lobbyCode))
            .run()
        },
        catch: (err) => new DbError({ message: String(err) }),
      }),
  },
}))

export const DatabaseServiceLive = Layer.effect(DatabaseService, makeDatabaseService)
