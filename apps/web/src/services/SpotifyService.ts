import { Context, Effect, Layer, Ref, Schedule, Schema } from "effect"
import {
  SpotifyAuthError,
  SpotifyGetTrackApiResponse,
  SpotifyNetworkError,
  SpotifyRateLimitError,
  SpotifySearchApiResponse,
  SpotifyTrack
} from "@quiz/domain"
import { SpotifyHttpClientTag } from "./SpotifyHttpService"


// --- Domain Service: SpotifyService ---
export class SpotifyService extends Context.Service<
  SpotifyService,
  {
    readonly getTrack: (
      trackId: string
    ) => Effect.Effect<
      SpotifyTrack,
      SpotifyAuthError | SpotifyNetworkError | SpotifyRateLimitError
    >

    readonly searchTracks: (
      query: string
    ) => Effect.Effect<
      ReadonlyArray<SpotifyTrack>,
      SpotifyAuthError | SpotifyNetworkError | SpotifyRateLimitError
    >
  }
>()("SpotifyService") { }


export const makeSpotifyService = Effect.gen(function* () {
  const http = yield* SpotifyHttpClientTag
  const tokenRef = yield* Ref.make<string | null>("mock_spotify_token_123")

  return {
    getTrack: (trackId: string) =>
      Effect.gen(function* () {
        const token = yield* Ref.get(tokenRef)
        if (!token) {
          return yield* Effect.fail(
            new SpotifyAuthError({ reason: "No access token available" })
          )
        }

        const fetchJson = http.getJson(
          `https://api.spotify.com/v1/tracks/${trackId}`,
          token
        )

        const rawJson = yield* Effect.retry(fetchJson, {
          schedule: Schedule.recurs(2),
          while: (err) => err._tag === "SpotifyRateLimitError"
        })

        const parsed = yield* Schema.decodeUnknownEffect(SpotifyGetTrackApiResponse)(rawJson)
          .pipe(
            Effect.mapError(_ => new SpotifyNetworkError({ message: "Invalid Spotify response format" }))
          )

        return new SpotifyTrack({
          id: parsed.id,
          name: parsed.name,
          artist: parsed.artists.join(", ") || "Unknown",
        })
      }),

    searchTracks: (query: string) =>
      Effect.gen(function* () {
        const token = yield* Ref.get(tokenRef)
        if (!token) {
          return yield* Effect.fail(
            new SpotifyAuthError({ reason: "No access token available" })
          )
        }

        const fetchJson = http.getJson(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track`,
          token
        )

        const rawJson = yield* Effect.retry(fetchJson, {
          schedule: Schedule.recurs(2),
          while: (err) => err._tag === "SpotifyRateLimitError"
        })

        const parsed = yield* Schema.decodeUnknownEffect(SpotifySearchApiResponse)(rawJson)
          .pipe(
            Effect.mapError(_ => new SpotifyNetworkError({ message: "Invalid Spotify response format" }))
          )

        return parsed.tracks.items.map(
          (item) =>
            new SpotifyTrack({
              id: item.id,
              name: item.name,
              artist: item.artists[0]?.name ?? "Unknown",
            })
        )
      })
  }
})

export const SpotifyServiceLive = Layer.effect(SpotifyService, makeSpotifyService)
