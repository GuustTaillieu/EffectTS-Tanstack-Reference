import { Schema } from "effect"
import { GameEvent } from "./game"

export const JoinLobbyInput = Schema.Struct({
  lobbyCode: Schema.String,
  username: Schema.String
})
export type JoinLobbyInput = typeof JoinLobbyInput.Type

// --- Domain Models ---
export class Lobby extends Schema.TaggedClass<Lobby>("Lobby")(
  "Lobby",
  {
    code: Schema.String,
    quizId: Schema.String,
    players: Schema.Array(Schema.String),
    maxPlayers: Schema.Number,
  }) { }

// --- Domain Errors ---
export class LobbyNotFoundError extends Schema.TaggedError<LobbyNotFoundError>()(
  "LobbyNotFoundError",
  {
    lobbyCode: Schema.String
  }
) {}

export class LobbyFullError extends Schema.TaggedError<LobbyFullError>()(
  "LobbyFullError",
  {
    lobbyCode: Schema.String,
    maxPlayers: Schema.Number
  }
) {}

export class LobbyUnauthorizedError extends Schema.TaggedError<LobbyUnauthorizedError>()(
  "LobbyUnauthorizedError",
  {
    lobbyCode: Schema.String,
    username: Schema.String
  }
) {}

export class UsernameTakenError extends Schema.TaggedError<UsernameTakenError>()(
  "UsernameTakenError",
  {
    lobbyCode: Schema.String,
    username: Schema.String
  }
) {}

// --- Domain Events ---
export class PlayerJoinedEvent extends Schema.TaggedClass<PlayerJoinedEvent>("PlayerJoinedEvent")(
  "PLAYER_JOINED",
  {
    lobbyCode: Schema.String,
    player: Schema.String,
    players: Schema.Array(Schema.String)
  }) { }
export class LobbyStateEvent extends Schema.TaggedClass<LobbyStateEvent>("LobbyStateEvent")(
  "LOBBY_STATE",
  {
    lobby: Lobby
  }) { }

export const LobbyEvent = Schema.Union([
  PlayerJoinedEvent,
  LobbyStateEvent,
  GameEvent
])
export type LobbyEvent = typeof LobbyEvent.Type
