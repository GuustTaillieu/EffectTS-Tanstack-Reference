import { Context, Effect, Layer } from "effect";
import {
  SpotifyAuthError,
  SpotifyNetworkError,
  SpotifyRateLimitError,
} from "@quiz/domain"

// --- Spotify Web API Raw Client Interface ---
export class SpotifyHttpClientTag extends Context.Service<
  SpotifyHttpClientTag,
  {
    readonly getJson: (
      url: string,
      token: string
    ) => Effect.Effect<unknown, SpotifyAuthError | SpotifyNetworkError | SpotifyRateLimitError>

  }
>()("SpotifyHttpClientTag") { }

const makeSpotifyHttpClient = Effect.gen(function* () {
  return {
    getJson: (url: string, token: string) =>
      Effect.gen(function* () {
        const response = yield* Effect.tryPromise(() =>
          fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        ).pipe(
          Effect.mapError((err) => new SpotifyNetworkError({ message: err.message }))
        )

        if (response.status === 401) {
          return yield* Effect.fail(
            new SpotifyAuthError({ reason: "Unauthorized: Invalid or expired token" })
          )
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After")
          const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 1
          return yield* Effect.fail(
            new SpotifyRateLimitError({ retryAfterSeconds })
          )
        }

        if (!response.ok) {
          return yield* Effect.fail(
            new SpotifyNetworkError({ message: `HTTP error: ${response.status}` })
          )
        }

        const json = yield* Effect.tryPromise(() => response.json()).pipe(
          Effect.mapError((err) => new SpotifyNetworkError({ message: err.message }))
        )

        return json
      })
  }
})

export const SpotifyHttpClientLive = Layer.effect(SpotifyHttpClientTag, makeSpotifyHttpClient)
