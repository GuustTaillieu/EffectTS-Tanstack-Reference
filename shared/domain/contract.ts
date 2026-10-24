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
 * Automatically validates payloads, returns typed success values,
 * and compiler-enforces the exact error channels.
 */
export const QuizRpcs = RpcGroup.make(
  Rpc.make("JoinLobby", {
    payload: JoinLobbyInput,
    success: Lobby,
    error: Schema.Union([LobbyNotFoundError, LobbyFullError, UsernameTakenError])
  }),
  Rpc.make("SubmitGuess", {
    payload: SubmitGuessInput,
    success: Schema.Void,
    error: GameNotFoundError
  })
)

export type QuizRpcs = typeof QuizRpcs
