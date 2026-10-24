import type { JoinLobbyInput, Lobby } from "./lobby"
import type { SubmitGuessInput } from "./game"
import type {
  LobbyNotFoundError,
  LobbyFullError,
  UsernameTakenError
} from "./lobby"
import type { GameNotFoundError } from "./game"

/**
 * Single source of truth for full-stack API procedures.
 * Defines input types, return types, and the exact failure error unions.
 */
export interface QuizApiContract {
  joinLobby: {
    readonly path: "/api/lobby/join"
    readonly input: JoinLobbyInput
    readonly success: Lobby
    readonly errors: LobbyNotFoundError | LobbyFullError | UsernameTakenError
  }
  submitGuess: {
    readonly path: "/api/game/guess"
    readonly input: SubmitGuessInput
    readonly success: void
    readonly errors: GameNotFoundError
  }
}
