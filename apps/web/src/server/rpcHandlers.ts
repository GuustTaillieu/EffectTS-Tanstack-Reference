import { Effect } from "effect"
import { QuizRpcs } from "@quiz/domain"
import { LobbyService } from "../services/LobbyService"
import { GameService } from "../services/GameService"

/**
 * Server-side implementation of the Quiz RPC handlers.
 * TypeScript statically verifies that each handler:
 * 1. Accepts the decoded payload schema
 * 2. Returns the expected success schema
 * 3. Only returns errors that match the declared error schema
 */
export const QuizRpcsLive = QuizRpcs.toLayer({
  JoinLobby: ({ lobbyCode, username }) =>
    Effect.gen(function* () {
      const lobby = yield* LobbyService
      return yield* lobby.join(lobbyCode, username)
    }),

  SubmitGuess: ({ lobbyCode, player, guess }) =>
    Effect.gen(function* () {
      const game = yield* GameService
      return yield* game.submitGuess(lobbyCode, player, guess)
    })
})
