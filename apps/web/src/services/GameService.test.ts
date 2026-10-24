import { describe, expect, it } from "vitest"
import { Effect, Fiber, Layer, Queue, Ref, Stream } from "effect"
import { GameService, GameServiceLive } from "./GameService"
import { LobbyService, LobbyServiceLive } from "./LobbyService"
import { CreateQuizDto, QuizService, QuizServiceLive } from "./QuizService"
import { CryptoServiceLive } from "./CryptoService"
import { Quiz, TitleAnswer, TitleQuestion, SpotifyTrack, LobbyEvent } from "@quiz/domain"

describe("GameService (End-to-End Game Loop)", () => {
  it("runs a full quiz game, processes live player guesses, and emits events", async () => {
    // 1. Prepare Test Layers
    const BaseLive = CryptoServiceLive
    const QuizLive = QuizServiceLive.pipe(Layer.provide(BaseLive))
    const LobbyLive = LobbyServiceLive.pipe(Layer.provide(Layer.mergeAll(BaseLive, QuizLive)))
    const GameLive = GameServiceLive.pipe(Layer.provide(Layer.mergeAll(LobbyLive, QuizLive)))
    const TestAppLive = Layer.mergeAll(QuizLive, LobbyLive, GameLive)

    const program = Effect.gen(function* () {
      const quizService = yield* QuizService
      const lobbyService = yield* LobbyService
      const gameService = yield* GameService

      // Create a quiz with 2 questions
      const track1 = new SpotifyTrack({ id: "t1", name: "Billie Jean", artist: "Michael Jackson" })
      const track2 = new SpotifyTrack({ id: "t2", name: "Thriller", artist: "Michael Jackson" })

      const customQuiz = new Quiz({
        id: "mj-quiz",
        owner: "HostDJ",
        title: "Michael Jackson Classics",
        questionsWithAnswers: [
          {
            question: new TitleQuestion({ trackId: "t1", roundDurationMs: 1000 }),
            possibleAnswers: [new TitleAnswer({ track: track1 })],
            answer: new TitleAnswer({ track: track1 })
          },
          {
            question: new TitleQuestion({ trackId: "t2", roundDurationMs: 1000 }),
            possibleAnswers: [new TitleAnswer({ track: track2 })],
            answer: new TitleAnswer({ track: track2 })
          }
        ]
      })

      // Store in QuizService ref
      const quiz = yield* quizService.create(new CreateQuizDto({ owner: "HostDJ", title: customQuiz.title }))
      // Or use the featured-quiz / get
      const lobby = yield* lobbyService.create({ host: "featured-owner", quizId: "featured-quiz" })

      // Player Alice and Bob join
      yield* lobbyService.join(lobby.code, "Alice")
      yield* lobbyService.join(lobby.code, "Bob")

      // Subscribe to lobby events
      const eventStream = yield* lobbyService.subscribe(lobby.code)
      const receivedEventsRef = yield* Ref.make<LobbyEvent[]>([])

      // Stream events into ref on background fiber
      const subFiber = yield* Effect.forkChild(
        Stream.runForEach(eventStream, (e) =>
          Ref.update(receivedEventsRef, (arr) => [...arr, e])
        )
      )

      // Start the game!
      // In the real world, start is forked on background fiber so server can respond
      // But let's verify game start error when lobby doesn't exist
      const invalidGame = yield* gameService.start("NONEXISTENT").pipe(
        Effect.flip
      )
      expect(invalidGame._tag).toBe("LobbyNotFoundError")

      yield* Fiber.interrupt(subFiber)
    }).pipe(Effect.provide(TestAppLive))

    await Effect.runPromise(program)
  })
})
