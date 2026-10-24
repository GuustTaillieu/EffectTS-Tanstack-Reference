import { describe, it, expect } from "vitest"
import { Effect, Layer } from "effect"
import { RpcServer, RpcSerialization } from "effect/rpc"
import { HttpEffect } from "effect/http"
import { QuizRpcs } from "@quiz/domain"
import { QuizRpcsLive } from "./rpcHandlers"
import { AppLive, EffectRuntime } from "./effectRuntime"
import { createQuizClient } from "@quiz/client-sdk"
import { LobbyService } from "../services/LobbyService"

describe("End-to-End Effect 4 RPC System", () => {
  // Build the live HTTP server handler sharing EffectRuntime memoMap
  const serverLayer = Layer.mergeAll(
    QuizRpcsLive.pipe(Layer.provide(AppLive)),
    AppLive,
    RpcSerialization.layerJson
  )

  const { handler } = HttpEffect.toWebHandlerLayer(
    RpcServer.toHttpEffect(QuizRpcs).pipe(Effect.flatten),
    serverLayer,
    { memoMap: EffectRuntime.memoMap }
  )

  const originalFetch = globalThis.fetch

  it("successfully joins an existing lobby over RPC with full type safety", async () => {
    // 1. Create a lobby on the host side via EffectRuntime
    const createEffect = Effect.gen(function* () {
      const lobbyService = yield* LobbyService
      return yield* lobbyService.create({ host: "featured-owner", quizId: "featured-quiz" })
    })

    const lobby = await EffectRuntime.runPromise(createEffect)
    expect(lobby.code).toBeDefined()

    // 2. Mock fetch to route to our web handler
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init)
      return handler(req)
    }

    try {
      const client = createQuizClient("http://localhost:5173")

      // 3. Mobile joins lobby over RPC
      const joined = await Effect.runPromise(
        client.joinLobby({
          lobbyCode: lobby.code,
          username: "MobilePlayer"
        })
      )

      expect(joined.code).toBe(lobby.code)
      expect(joined.players).toContain("MobilePlayer")
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it("properly returns and decodes typed domain errors over the wire", async () => {
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init)
      return handler(req)
    }

    try {
      const client = createQuizClient("http://localhost:5173")

      // 1. Nonexistent lobby -> LobbyNotFoundError
      const failureResult = await Effect.runPromise(
        client.joinLobby({
          lobbyCode: "NONEXISTENT",
          username: "PlayerX"
        }).pipe(
          Effect.map(() => "UNEXPECTED_SUCCESS"),
          Effect.catchTag("LobbyNotFoundError", (err) =>
            Effect.succeed(`CAUGHT_NOT_FOUND: ${err.lobbyCode}`)
          )
        )
      )

      expect(failureResult).toBe("CAUGHT_NOT_FOUND: NONEXISTENT")

      // 2. Nonexistent game guess -> GameNotFoundError
      const guessResult = await Effect.runPromise(
        client.submitGuess({
          lobbyCode: "NONEXISTENT",
          player: "PlayerX",
          guess: "Song"
        }).pipe(
          Effect.map(() => "UNEXPECTED_SUCCESS"),
          Effect.catchTag("GameNotFoundError", (err) =>
            Effect.succeed(`CAUGHT_GAME_NOT_FOUND: ${err.lobbyCode}`)
          )
        )
      )

      expect(guessResult).toBe("CAUGHT_GAME_NOT_FOUND: NONEXISTENT")
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
