import { createServerFn } from "@tanstack/react-start"
import { Effect } from "effect"
import { QuizService } from "../services/QuizService"
import { LobbyService } from "../services/LobbyService"
import { GameService } from "../services/GameService"
import { serverEffect, clientEffect } from "./effectFn"

// =============================================================================
// Server Functions (Top-level declarations required for TanStack Start compiler)
// =============================================================================

import { Schema } from "effect"
import { JoinLobbyInput, SubmitGuessInput } from "@quiz/domain"

// =============================================================================
// Server Functions (Top-level declarations required for TanStack Start compiler)
// =============================================================================

export const getFeaturedQuizFn = createServerFn({ method: "GET" })
  .handler(serverEffect(() =>
    Effect.flatMap(QuizService, (s) => s.getFake())
  ))

export const createLobbyFn = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(Schema.String))
  .handler(serverEffect((host: string) =>
    Effect.flatMap(LobbyService, (s) => s.create({ host, quizId: "featured-quiz" }))
  ))

export const joinLobbyFn = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(JoinLobbyInput))
  .handler(serverEffect(({ lobbyCode, username }) =>
    Effect.flatMap(LobbyService, (s) => s.join(lobbyCode, username))
  ))

export const startGameFn = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(Schema.String))
  .handler(serverEffect((lobbyCode: string) =>
    Effect.flatMap(GameService, (s) => s.start(lobbyCode))
  ))

export const submitGuessFn = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(SubmitGuessInput))
  .handler(serverEffect(({ lobbyCode, player, guess }) =>
    Effect.flatMap(GameService, (s) => s.submitGuess(lobbyCode, player, guess))
  ))

export const nextRoundFn = createServerFn({ method: "POST" })
  .validator(Schema.decodeUnknownSync(Schema.String))
  .handler(serverEffect((lobbyCode: string) =>
    Effect.flatMap(GameService, (s) => s.nextRound(lobbyCode))
  ))

// =============================================================================
// Typed Client Effects (Callable in UI components with native Effect.catchTag!)
// =============================================================================

export const getFeaturedQuiz = clientEffect(getFeaturedQuizFn)
export const createLobby = clientEffect(createLobbyFn)
export const joinLobby = clientEffect(joinLobbyFn)
export const startGame = clientEffect(startGameFn)
export const submitGuess = clientEffect(submitGuessFn)
export const nextRound = clientEffect(nextRoundFn)
