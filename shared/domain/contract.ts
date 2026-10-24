import { Rpc, RpcGroup } from "effect/rpc"
import { Schema } from "effect"
import {
  Lobby,
  LobbyNotFoundError,
  LobbyFullError,
  UsernameTakenError,
  JoinLobbyInput
} from "./lobby"
import { GameNotFoundError, SubmitGuessInput } from "./game"

/**
 * Single source of truth for full-stack API procedures via Effect RPC.
 * Standardized on idiomatic camelCase procedure names.
 */
export const QuizRpcs = RpcGroup.make(
  Rpc.make("joinLobby", {
    payload: JoinLobbyInput,
    success: Lobby,
    error: Schema.Union([LobbyNotFoundError, LobbyFullError, UsernameTakenError])
  }),
  Rpc.make("submitGuess", {
    payload: SubmitGuessInput,
    success: Schema.Void,
    error: GameNotFoundError
  })
)

export type QuizRpcs = typeof QuizRpcs
