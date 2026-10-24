import { Schema } from "effect"

// --- Domain Schemas ---
export class SpotifyTrack extends Schema.TaggedClass<SpotifyTrack>("SpotifyTrack")(
  "SpotifyTrack",
  {
    id: Schema.String,
    name: Schema.String,
    artist: Schema.String,
  }) { }

// Raw response parser from Spotify Web API: GET /v1/search
export const SpotifySearchApiResponse = Schema.Struct({
  tracks: Schema.Struct({
    items: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        artists: Schema.Array(Schema.Struct({ name: Schema.String })),
        preview_url: Schema.NullOr(Schema.String)
      })
    )
  })
})

export const SpotifyGetTrackApiResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  artists: Schema.Array(Schema.Struct({ name: Schema.String })),
})

// --- Tagged Errors ---
export class SpotifyRateLimitError extends Schema.TaggedError<SpotifyRateLimitError>()(
  "SpotifyRateLimitError",
  { retryAfterSeconds: Schema.Number }
) { }

export class SpotifyAuthError extends Schema.TaggedError<SpotifyAuthError>()(
  "SpotifyAuthError",
  { reason: Schema.String }
) { }

export class SpotifyNetworkError extends Schema.TaggedError<SpotifyNetworkError>()(
  "SpotifyNetworkError",
  { message: Schema.String }
) { }

