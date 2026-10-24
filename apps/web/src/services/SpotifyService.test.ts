import { describe, expect, it } from "vitest"
import { Effect, Layer, Ref } from "effect"
import {
  SpotifyService,
  SpotifyServiceLive
} from "./SpotifyService"
import { SpotifyHttpClientTag } from "./SpotifyHttpService"
import {
  SpotifyAuthError,
  SpotifyNetworkError,
  SpotifyRateLimitError,
  SpotifyTrack
} from "@quiz/domain"

describe("SpotifyService", () => {
  it("decodes raw Spotify search results into domain SpotifyTrack models", async () => {
    const mockClient = Layer.succeed(SpotifyHttpClientTag, {
      getJson: () =>
        Effect.succeed({
          tracks: {
            items: [
              {
                id: "track_1",
                name: "Livin' on a Prayer",
                artists: [{ name: "Bon Jovi" }],
                preview_url: "https://p.scdn.co/mp3-preview/bonjovi"
              },
              {
                id: "track_2",
                name: "Sweet Child O' Mine",
                artists: [{ name: "Guns N' Roses" }],
                preview_url: null
              }
            ]
          }
        })
    })

    const testLayer = SpotifyServiceLive.pipe(Layer.provide(mockClient))

    const program = Effect.gen(function* () {
      const spotify = yield* SpotifyService
      return yield* spotify.searchTracks("rock")
    }).pipe(Effect.provide(testLayer))

    const tracks = await Effect.runPromise(program)

    expect(tracks).toHaveLength(2)
    expect(tracks[0]).toBeInstanceOf(SpotifyTrack)
    expect(tracks[0]!.name).toBe("Livin' on a Prayer")
    expect(tracks[0]!.artist).toBe("Bon Jovi")
  })

  it("retries automatically when hitting SpotifyRateLimitError (429)", async () => {
    // Simulate failing once with RateLimit, then succeeding on retry
    const program = Effect.gen(function* () {
      const attemptsRef = yield* Ref.make(0)

      const mockClient = Layer.succeed(SpotifyHttpClientTag, {
        getJson: () =>
          Effect.gen(function* () {
            const count = yield* Ref.getAndUpdate(attemptsRef, (n) => n + 1)
            if (count === 0) {
              return yield* Effect.fail(
                new SpotifyRateLimitError({ retryAfterSeconds: 1 })
              )
            }
            return {
              tracks: {
                items: [
                  {
                    id: "track_recovered",
                    name: "Don't Stop Believin'",
                    artists: [{ name: "Journey" }],
                    preview_url: "https://preview.url"
                  }
                ]
              }
            }
          })
      })

      const testLayer = SpotifyServiceLive.pipe(Layer.provide(mockClient))

      const spotify = yield* SpotifyService
      const tracks = yield* spotify.searchTracks("journey")
      const finalAttempts = yield* Ref.get(attemptsRef)

      return { tracks, finalAttempts }
    })

    // To run this test, we need mockClient providing SpotifyHttpClientTag
    const attemptsRef = await Effect.runPromise(Ref.make(0))

    const mockClient = Layer.succeed(SpotifyHttpClientTag, {
      getJson: () =>
        Effect.gen(function* () {
          const count = yield* Ref.getAndUpdate(attemptsRef, (n) => n + 1)
          if (count === 0) {
            return yield* Effect.fail(
              new SpotifyRateLimitError({ retryAfterSeconds: 1 })
            )
          }
          return {
            tracks: {
              items: [
                {
                  id: "track_recovered",
                  name: "Don't Stop Believin'",
                  artists: [{ name: "Journey" }],
                  preview_url: "https://preview.url"
                }
              ]
            }
          }
        })
    })

    const testLayer = SpotifyServiceLive.pipe(Layer.provide(mockClient))

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const spotify = yield* SpotifyService
        return yield* spotify.searchTracks("journey")
      }).pipe(Effect.provide(testLayer))
    )

    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe("Don't Stop Believin'")
    // Verify that it actually retried (attempted 2 times total)
    const attempts = await Effect.runPromise(Ref.get(attemptsRef))
    expect(attempts).toBe(2)
  })

  it("does not retry auth errors (fails immediately on 401)", async () => {
    const attemptsRef = await Effect.runPromise(Ref.make(0))

    const mockClient = Layer.succeed(SpotifyHttpClientTag, {
      getJson: () =>
        Effect.gen(function* () {
          yield* Ref.update(attemptsRef, (n) => n + 1)
          return yield* Effect.fail(
            new SpotifyAuthError({ reason: "Expired or invalid token" })
          )
        })
    })

    const testLayer = SpotifyServiceLive.pipe(Layer.provide(mockClient))

    const program = Effect.gen(function* () {
      const spotify = yield* SpotifyService
      return yield* spotify.searchTracks("test")
    }).pipe(
      Effect.provide(testLayer),
      Effect.catchTag("SpotifyAuthError", (err) => Effect.succeed(`Caught: ${err.reason}`))
    )

    const result = await Effect.runPromise(program)
    expect(result).toBe("Caught: Expired or invalid token")

    const attempts = await Effect.runPromise(Ref.get(attemptsRef))
    expect(attempts).toBe(1) // Should NOT retry auth errors!
  })
})
