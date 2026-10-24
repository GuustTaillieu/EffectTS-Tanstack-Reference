import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { QuizService } from "../services/QuizService"
import { LobbyService } from "../services/LobbyService"
import { EffectRuntime } from "./effectRuntime"

describe("Module 6: Effect Service Layer for TanStack Start", () => {
  it("should fetch featured quiz via Effect serverRuntime", async () => {
    const program = Effect.gen(function* () {
      const quizService = yield* QuizService
      return yield* quizService.getFake()
    })

    const quiz = await EffectRuntime.runPromise(program)
    expect(quiz.id).toBe("featured-quiz")
    expect(quiz.title).toBe("Featured Quiz")
  })

  it("should create sequential lobbies with atomic Ref in Effect runtime", async () => {
    const createLobbyEffect = (host: string) =>
      Effect.gen(function* () {
        const lobbyService = yield* LobbyService
        return yield* lobbyService.create({ host, quizId: "featured-quiz" })
      })

    const l1 = await EffectRuntime.runPromise(createLobbyEffect("featured-owner"))
    const l2 = await EffectRuntime.runPromise(createLobbyEffect("featured-owner"))

    expect(l1.code).toBeDefined()
    expect(l2.code).toBeDefined()
    expect(l1.code).not.toBe(l2.code)
  })
})
