import { Context, Crypto, Data, Effect, Layer, Ref } from "effect"
import { Quiz } from "@quiz/domain"


export class CreateQuizDto extends Data.TaggedClass("CreateQuizDto")<{
  readonly owner: string
  readonly title: string
}> { }

// --- Domain Errors ---
export class QuizCreationError extends Data.TaggedError("QuizCreationError")<{
  readonly cause: unknown
}> { }
export class QuizNotFoundError extends Data.TaggedError("QuizNotFoundError")<{
  readonly quizId: string
}> { }

// --- Domain Service: QuizService ---
export class QuizService extends Context.Service<
  QuizService,
  {
    readonly create: (dto: CreateQuizDto) => Effect.Effect<Quiz, QuizCreationError>
    readonly get: (quizId: Quiz['id']) => Effect.Effect<Quiz, QuizNotFoundError>
    readonly getFake: () => Effect.Effect<Quiz, never>
  }
>()("QuizService") { }

// Persist singleton state across Vite HMR, SSR module evaluation boundaries, and TanStack Start API routes
const globalQuizState = globalThis as typeof globalThis & {
  __QUIZ_QUIZZES_REF__?: Ref.Ref<Map<string, Quiz>>
}

// Live Layer with in-memory state
export const QuizServiceLive = Layer.effect(
  QuizService,
  Effect.gen(function* () {
    const quizzesRef = globalQuizState.__QUIZ_QUIZZES_REF__ ??= yield* Ref.make<Map<string, Quiz>>(new Map()
      .set("featured-quiz", new Quiz({
        id: "featured-quiz",
        owner: "featured-owner",
        title: "Featured Quiz",
        questionsWithAnswers: []
      }))
    )

    const crypto = yield* Crypto.Crypto

    return {
      create: (dto: CreateQuizDto) =>
        Effect.gen(function* () {
          const id = yield* crypto.randomUUIDv4().pipe(Effect.mapError(e => new QuizCreationError({ cause: e })))

          return new Quiz({
            id,
            owner: dto.owner,
            title: dto.title,
            questionsWithAnswers: [],
          })
        }),

      get: (quizId: Quiz['id']) =>
        Effect.gen(function* () {
          const quizzes = yield* Ref.get(quizzesRef)
          const quiz = quizzes.get(quizId)

          if (!quiz) {
            return yield* Effect.fail(new QuizNotFoundError({ quizId }))
          }

          return quiz
        }),

      getFake: () =>
        Effect.gen(function* () {
          const quizzes = yield* Ref.get(quizzesRef)
          const quiz = quizzes.get("featured-quiz")

          return quiz!
        })
    }
  })
)
