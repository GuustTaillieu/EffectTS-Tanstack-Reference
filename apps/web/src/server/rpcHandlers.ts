import { Effect } from "effect"
import { QuizRpcs } from "@quiz/domain"
import { LobbyService } from "../services/LobbyService"
import { GameService } from "../services/GameService"

/**
 * Server-side implementation of the Quiz RPC handlers.
 * Handlers are compiler-verified against QuizRpcs.
 */
export const QuizRpcsLive = QuizRpcs.toLayer({
  joinLobby: ({ lobbyCode, username }) =>
    Effect.gen(function* () {
      const lobby = yield* LobbyService
      return yield* lobby.join(lobbyCode, username)
    }),

  submitGuess: ({ lobbyCode, player, guess }) =>
    Effect.gen(function* () {
      const game = yield* GameService
      return yield* game.submitGuess(lobbyCode, player, guess)
    })
})
