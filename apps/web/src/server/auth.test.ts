import { describe, it, expect, beforeEach } from "vitest"
import { Effect } from "effect"
import { EffectRuntime } from "./effectRuntime"
import { AuthService } from "./authService"
import { createLobbyFn } from "./functions"
import { db, user, account, gameSessions, eq, DatabaseService } from "@quiz/db"

describe("AuthService & Database Integration (Effect + Better Auth + Drizzle)", () => {
  const testUserId = "user_test_123"

  beforeEach(() => {
    // Clean up test records
    db.delete(account).where(eq(account.userId, testUserId)).run()
    db.delete(user).where(eq(user.id, testUserId)).run()
    db.delete(gameSessions).where(eq(gameSessions.lobbyCode, "TEST01")).run()
  })

  it("fails with UnauthorizedError when requiring session without valid headers", async () => {
    const program = Effect.gen(function* () {
      const authService = yield* AuthService
      return yield* authService.requireSession(new Headers())
    }).pipe(
      Effect.catchTag("UnauthorizedError", (err) =>
        Effect.succeed({ caught: true, message: err.message })
      )
    )

    const result = await EffectRuntime.runPromise(program)
    expect(result).toEqual({
      caught: true,
      message: "Authentication required to perform this action",
    })
  })

  it("retrieves the Spotify access token for an authenticated user from the database via DatabaseService", async () => {
    // 1. Insert mock Spotify user and account into DB
    const now = new Date()
    const expiresAt = new Date(Date.now() + 1000 * 3600) // 1 hour in the future

    db.insert(user).values({
      id: testUserId,
      name: "Spotify Master",
      email: "master@spotify.test",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    }).run()

    db.insert(account).values({
      id: "acc_test_123",
      accountId: "spotify_account_abc",
      providerId: "spotify",
      userId: testUserId,
      accessToken: "spotify_live_access_token_xyz",
      refreshToken: "spotify_refresh_token_xyz",
      accessTokenExpiresAt: expiresAt,
      scope: "user-read-email streaming",
      createdAt: now,
      updatedAt: now,
    }).run()

    // 2. Fetch the token via Effect AuthService (which uses DatabaseService)
    const program = Effect.gen(function* () {
      const authService = yield* AuthService
      return yield* authService.getSpotifyAccessToken(testUserId)
    })

    const token = await EffectRuntime.runPromise(program)
    expect(token).toBe("spotify_live_access_token_xyz")
  })

  it("fails with SpotifyAuthError if user has no Spotify account linked", async () => {
    const program = Effect.gen(function* () {
      const authService = yield* AuthService
      yield* authService.getSpotifyAccessToken("unknown_user_999")
      return { caught: false, reason: "" }
    }).pipe(
      Effect.catchTag("SpotifyAuthError", (err) =>
        Effect.succeed({ caught: true, reason: err.reason })
      )
    )

    const result = await EffectRuntime.runPromise(program)
    expect(result.caught).toBe(true)
    expect(result.reason).toContain("No connected Spotify account found")
  })

  it("uses decoupled DatabaseService to create and complete game sessions", async () => {
    const now = new Date()
    db.insert(user).values({
      id: testUserId,
      name: "Host User",
      email: "host@test.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    }).run()

    const program = Effect.gen(function* () {
      const dbService = yield* DatabaseService
      yield* dbService.gameSessions.create({
        id: "sess_001",
        lobbyCode: "TEST01",
        hostUserId: testUserId,
        quizId: undefined,
      })

      yield* dbService.gameSessions.complete(
        "TEST01",
        JSON.stringify([{ player: "Alice", score: 100 }])
      )

      return true
    })

    const success = await EffectRuntime.runPromise(program)
    expect(success).toBe(true)
  })
})
