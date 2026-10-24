export * from "./game"
export * from "./lobby"
export * from "./quiz"
export * from "./spotify"
export * from "./contract"

import { Schema } from "effect"

export class NetworkError extends Schema.TaggedError<NetworkError>()(
  "NetworkError",
  {
    message: Schema.String
  }
) {}
