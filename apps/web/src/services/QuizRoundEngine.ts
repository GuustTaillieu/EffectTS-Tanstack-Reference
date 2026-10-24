import { Context, Deferred, Effect, Ref, Schema } from "effect"
import { Answers } from "@quiz/domain"
import { Input } from "effect/Duration"

// --- Domain Models ---
export class TimeoutOutcome extends Schema.TaggedClass<TimeoutOutcome>("TimeoutOutcome")("TIMEOUT", {}) { }
export class CorrectGuessOutcome extends Schema.TaggedClass<CorrectGuessOutcome>("CorrectGuessOutcome")(
  "CORRECT_GUESS",
  {
    winner: Schema.String,
    pointsAwarded: Schema.Number
  }) { }

export const RoundOutcome = Schema.Union([TimeoutOutcome, CorrectGuessOutcome])
export type RoundOutcome = typeof RoundOutcome.Type

export interface IQuizRoundManager {
  /**
   * Runs the 15-second round clock, waiting for either:
   * 1. A player to guess correctly (via submitGuess) -> returns CORRECT_GUESS outcome
   * 2. The timeout duration to expire -> returns TIMEOUT outcome
   */
  readonly runRound: (
    answers: Answers,
    answerTime: Input
  ) => Effect.Effect<RoundOutcome>

  /**
   * Called whenever a player submits a guess from the client.
   * If the guess matches the title (case-insensitive), resolves the round winner.
   */
  readonly submitGuess: (
    player: string,
    guess: string
  ) => Effect.Effect<{ isCorrect: boolean }>

  /**
   * Waits for the next round to be started. This is used to synchronize the game loop.
   */
  readonly waitForNextRound: () => Effect.Effect<void>

  /**
   * Starts the next round, allowing the game loop to continue.
  * */
  readonly startNextRound: () => Effect.Effect<void>
}

export class QuizRoundManager extends Context.Service<QuizRoundManager, IQuizRoundManager>()("QuizRoundManager") { }

export const makeQuizRoundEngine = Effect.gen(function* () {
  const winnerDeferred = yield* Deferred.make<{ player: string; points: number }>()
  const correctAnswersRef = yield* Ref.make<Answers | null>(null)
  const nextRoundDeferred = yield* Deferred.make<void>()

  return {
    runRound: (answers: Answers, answerTime: Input) =>
      Effect.gen(function* () {
        yield* Ref.set(correctAnswersRef, answers)

        const timerEffect = Effect.sleep(answerTime).pipe(Effect.as(new TimeoutOutcome()))

        const winnerEffect = Deferred.await(winnerDeferred).pipe(
          Effect.map(w =>
            new CorrectGuessOutcome({
              winner: w.player,
              pointsAwarded: w.points
            })
          )
        )

        return yield* Effect.race(timerEffect, winnerEffect)
      }),

    submitGuess: (player: string, guess: string) =>
      Effect.gen(function* () {
        const answers = yield* Ref.get(correctAnswersRef)
        const isMatch = answers?.some(answer => answer.track.name.toLowerCase() === guess.toLowerCase()) ?? false

        if (isMatch) {
          yield* Deferred.succeed(winnerDeferred, { player, points: 100 })
          return { isCorrect: true }
        }

        return { isCorrect: false }
      }),

    waitForNextRound: () => Deferred.await(nextRoundDeferred),

    startNextRound: () => Deferred.succeed(nextRoundDeferred, undefined)
  } satisfies IQuizRoundManager
})
