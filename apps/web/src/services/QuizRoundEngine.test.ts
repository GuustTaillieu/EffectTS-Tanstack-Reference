import { describe, expect, it } from "vitest"
import { Effect, Fiber } from "effect"
import { makeQuizRoundEngine } from "./QuizRoundEngine"
import { TitleAnswer, SpotifyTrack } from "@quiz/domain"

describe("QuizRoundEngine (Effect.race & Deferred)", () => {
  const mockTrack = new SpotifyTrack({
    id: "t1",
    name: "Hotel California",
    artist: "Eagles"
  })
  const mockAnswer = new TitleAnswer({ track: mockTrack })

  it("times out if no correct guess is submitted before timeout", async () => {
    const program = Effect.gen(function* () {
      const engine = yield* makeQuizRoundEngine
      return yield* engine.runRound([mockAnswer], "50 millis")
    })

    const outcome = await Effect.runPromise(program)
    expect(outcome._tag).toBe("TIMEOUT")
  })

  it("completes early with CORRECT_GUESS when a player guesses correctly", async () => {
    const program = Effect.gen(function* () {
      const engine = yield* makeQuizRoundEngine

      // Fork the round in the background with a 1000ms timeout
      const roundFiber = yield* Effect.forkChild(engine.runRound([mockAnswer], "1000 millis"))

      // Simulate player Alice guessing wrong first
      const wrongGuess = yield* engine.submitGuess("Alice", "Stairway to Heaven")
      expect(wrongGuess.isCorrect).toBe(false)

      // Simulate player Bob guessing correctly after 20ms
      yield* Effect.sleep("20 millis")
      const correctGuess = yield* engine.submitGuess("Bob", "hotel california")
      expect(correctGuess.isCorrect).toBe(true)

      // Join the round fiber to get the final outcome
      return yield* Fiber.join(roundFiber)
    })

    const outcome = await Effect.runPromise(program)
    expect(outcome._tag).toBe("CORRECT_GUESS")
    if (outcome._tag === "CORRECT_GUESS") {
      expect(outcome.winner).toBe("Bob")
      expect(outcome.pointsAwarded).toBe(100)
    }
  })
})

