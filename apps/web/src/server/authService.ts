import { Context, Effect, Layer } from "effect"
import { auth } from "../lib/auth"
import { db, account, eq, and } from "@quiz/db"
import { SpotifyAuthError, UnauthorizedError } from "@quiz/domain"

export interface UserSession {
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image?: string | null
    createdAt: Date
    updatedAt: Date
  }
  session: {
    id: string
    userId: string
    expiresAt: Date
    token: string
    createdAt: Date
    updatedAt: Date
    ipAddress?: string | null
    userAgent?: string | null
  }
}

export class AuthService extends Context.Service<
  AuthService,
  {
    readonly getSession: (
      headers: Headers
    ) => Effect.Effect<UserSession | null, never>

    readonly requireSession: (
      headers: Headers
    ) => Effect.Effect<UserSession, UnauthorizedError>

    readonly getSpotifyAccessToken: (
      userId: string
    ) => Effect.Effect<string, SpotifyAuthError>
  }
>()("AuthService") {}

export const makeAuthService = Effect.sync(() => ({
  getSession: (headers: Headers) =>
    Effect.tryPromise({
      try: async () => {
        const session = await auth.api.getSession({ headers })
        return session as UserSession | null
      },
      catch: () => null,
    }).pipe(
      Effect.orElseSucceed(() => null)
    ),

  requireSession: (headers: Headers) =>
    Effect.gen(function* () {
      const sessionResult = yield* Effect.tryPromise({
        try: async () => {
          const session = await auth.api.getSession({ headers })
          return session as UserSession | null
        },
        catch: (err) => new UnauthorizedError({ message: String(err) }),
      })

      if (!sessionResult || !sessionResult.user) {
        return yield* Effect.fail(
          new UnauthorizedError({ message: "Authentication required to perform this action" })
        )
      }

      return sessionResult
    }),

  getSpotifyAccessToken: (userId: string) =>
    Effect.gen(function* () {
      const spotifyAccount = yield* Effect.try({
        try: () =>
          db
            .select()
            .from(account)
            .where(and(eq(account.userId, userId), eq(account.providerId, "spotify")))
            .get(),
        catch: (err) => new SpotifyAuthError({ reason: `Database lookup failed: ${err}` }),
      })
      if (!spotifyAccount || !spotifyAccount.accessToken) {
        return yield* Effect.fail(
          new SpotifyAuthError({
            reason: `No connected Spotify account found for user "${userId}". Please log in with Spotify.`,
          })
        )
      }

      // Check if access token is expired
      if (
        spotifyAccount.accessTokenExpiresAt &&
        spotifyAccount.accessTokenExpiresAt.getTime() < Date.now()
      ) {
        // If expired and refresh token is available, we could refresh it or inform the user
        return yield* Effect.fail(
          new SpotifyAuthError({
            reason: "Spotify access token expired. Please re-authenticate.",
          })
        )
      }

      return spotifyAccount.accessToken
    }),
}))

export const AuthServiceLive = Layer.effect(AuthService, makeAuthService)
