import { Context, Data, Effect, Fiber, Layer, Ref } from "effect";
import { LobbyNotFoundError, LobbyService } from "./LobbyService";
import { QuizNotFoundError, QuizService } from "./QuizService";
import { IQuizRoundManager, makeQuizRoundEngine } from "./QuizRoundEngine";
import {
  Lobby,
  Game,
  GameOverEvent,
  RoundEndedEvent,
  RoundStartedEvent,
  GameNotFoundError,
  GameAlreadyStartedError
} from "@quiz/domain";

export { GameNotFoundError, GameAlreadyStartedError };

export class GameService extends Context.Service<
  GameService,
  {
    readonly get: (lobbyCode: string) => Effect.Effect<Game, GameNotFoundError>
    readonly start: (lobbyCode: string) => Effect.Effect<void, GameNotFoundError | LobbyNotFoundError | QuizNotFoundError | GameAlreadyStartedError>
    readonly submitGuess: (lobbyCode: string, player: string, guess: string) => Effect.Effect<void, GameNotFoundError>
    readonly nextRound: (lobbyCode: string) => Effect.Effect<void, GameNotFoundError>
  }
>()("GameService") { }

// Persist singleton state across Vite HMR, SSR module evaluation boundaries, and TanStack Start API routes
const globalGameState = globalThis as typeof globalThis & {
  __QUIZ_GAMES_REF__?: Ref.Ref<Map<Lobby['code'], Game>>
  __QUIZ_ACTIVE_ROUNDS_REF__?: Ref.Ref<Map<Lobby['code'], IQuizRoundManager>>
}

const makeGameService = Effect.gen(function* () {
  const gamesRef = globalGameState.__QUIZ_GAMES_REF__ ??= yield* Ref.make<Map<Lobby['code'], Game>>(new Map())
  const activeRoundsRef = globalGameState.__QUIZ_ACTIVE_ROUNDS_REF__ ??= yield* Ref.make<Map<Lobby['code'], IQuizRoundManager>>(new Map())

  const lobbyService = yield* LobbyService
  const quizService = yield* QuizService

  const getGame = (lobbyCode: string) =>
    Effect.gen(function* () {
      const games = yield* Ref.get(gamesRef)
      const game = games.get(lobbyCode)

      if (!game) {
        return yield* Effect.fail(new GameNotFoundError({ lobbyCode }))
      }

      return game
    })

  const getActiveRound = (lobbyCode: string) =>
    Effect.gen(function* () {
      const rounds = yield* Ref.get(activeRoundsRef)
      const round = rounds.get(lobbyCode)

      if (!round) {
        return yield* Effect.fail(new GameNotFoundError({ lobbyCode }))
      }

      return round
    })

  return {
    get: getGame,
    start: (lobbyCode: string) =>
      Effect.gen(function* () {
        const lobby = yield* lobbyService.get(lobbyCode)
        const quiz = yield* quizService.get(lobby.quizId)

        const game = yield* getGame(lobbyCode).pipe(
          Effect.catchTag("GameNotFoundError", () => Effect.succeed(null))
        )
        if (game != null) {
          return yield* Effect.fail(new GameAlreadyStartedError({ lobbyCode }))
        }

        yield* Ref.update(gamesRef, (games) => {
          const newGame = new Game({
            lobbyCode,
            currentRound: 0,
            scoreboard: Object.fromEntries(lobby.players.map(player => [player, 0])),
          })
          return new Map(games).set(lobbyCode, newGame)
        })

        for (const { question, possibleAnswers, answer } of quiz.questionsWithAnswers) {
          const round = yield* makeQuizRoundEngine
          yield* Ref.update(activeRoundsRef, (m) => new Map(m).set(lobbyCode, round))

          const game = yield* getGame(lobbyCode)
          yield* lobbyService.broadcast(lobbyCode, new RoundStartedEvent({ question }))

          const outcome = yield* round.runRound(possibleAnswers, question.roundDurationMs)
          let scoreboard = game.scoreboard
          if (outcome._tag === "CORRECT_GUESS") {
            scoreboard = {
              ...game.scoreboard,
              [outcome.winner]: (game.scoreboard[outcome.winner] ?? 0) + outcome.pointsAwarded
            }
          }

          yield* Ref.update(gamesRef, (games) => {
            const updatedGame = new Game({
              ...game,
              currentRound: game.currentRound + 1,
              scoreboard,
            })

            return new Map(games).set(lobbyCode, updatedGame)
          })

          const winner = outcome._tag === "CORRECT_GUESS" ? outcome.winner : null
          yield* lobbyService.broadcast(lobbyCode, new RoundEndedEvent({ answer, scoreboard, winner }))

          // Allow the host to trigger the next round, OR auto-advance after 10 seconds!
          yield* Effect.race(round.waitForNextRound(), Effect.sleep("10 seconds"))
        }
        yield* Ref.update(activeRoundsRef, (m) => {
          const next = new Map(m)
          next.delete(lobbyCode)
          return next
        })

        const finalGame = yield* getGame(lobbyCode)
        yield* lobbyService.broadcast(lobbyCode, new GameOverEvent({
          finalScoreboard: finalGame.scoreboard
        }))
      }),

    submitGuess: (lobbyCode: string, player: string, guess: string) =>
      Effect.gen(function* () {
        const round = yield* getActiveRound(lobbyCode)
        yield* round.submitGuess(player, guess)
      }),

    nextRound: (lobbyCode: string) =>
      Effect.gen(function* () {
        const round = yield* getActiveRound(lobbyCode)
        yield* round.startNextRound()
      })
  }
})

export const GameServiceLive = Layer.effect(GameService, makeGameService)
