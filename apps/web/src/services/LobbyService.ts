import { Context, Crypto, Data, Effect, Layer, Queue, Ref, Schema, Stream } from "effect"
import { QuizNotFoundError, QuizService } from "./QuizService"
import {
  Lobby,
  LobbyEvent,
  LobbyStateEvent,
  LobbyNotFoundError,
  LobbyFullError,
  LobbyUnauthorizedError,
  UsernameTakenError
} from "@quiz/domain"

export { LobbyNotFoundError, LobbyFullError, LobbyUnauthorizedError, UsernameTakenError }

export const CreateLobbyDto = Schema.Struct({
  host: Schema.String,
  quizId: Schema.String,
})
export type CreateLobbyDto = typeof CreateLobbyDto.Type

// --- Domain Errors ---
export class LobbyCreationError extends Data.TaggedError("LobbyCreationError")<{
  readonly cause: unknown
}> { }

// --- Domain Service: QuizService ---
export class LobbyService extends Context.Service<
  LobbyService,
  {
    readonly create: (dto: CreateLobbyDto) => Effect.Effect<Lobby, LobbyCreationError | LobbyUnauthorizedError | QuizNotFoundError>
    readonly get: (quizId: Lobby['code']) => Effect.Effect<Lobby, LobbyNotFoundError>
    readonly join: (
      code: string,
      username: string
    ) => Effect.Effect<Lobby, LobbyNotFoundError | LobbyFullError | UsernameTakenError>
    readonly subscribe: (
      code: string
    ) => Effect.Effect<Stream.Stream<LobbyEvent>>
    readonly broadcast: (lobbyCode: Lobby['code'], event: LobbyEvent) => Effect.Effect<void>
  }
>()("LobbyService") { }

// Live Layer with in-memory state
export const LobbyServiceLive = Layer.effect(
  LobbyService,
  Effect.gen(function* () {
    const lobbiesRef = yield* Ref.make<Map<string, Lobby>>(new Map())
    const subscribersRef = yield* Ref.make<Map<string, Set<Queue.Queue<LobbyEvent>>>>(new Map())

    const crypto = yield* Crypto.Crypto
    const quizzes = yield* QuizService

    return {
      create: ({ host, quizId }: CreateLobbyDto) =>
        Effect.gen(function* () {
          const quiz = yield* quizzes.get(quizId)

          if (quiz.owner !== host) {
            return yield* Effect.fail(new LobbyUnauthorizedError({ lobbyCode: quizId, username: host }))
          }

          const id = yield* crypto.randomUUIDv4().pipe(Effect.mapError(e => new LobbyCreationError({ cause: e })))
          const code = id.slice(0, 6).toUpperCase()

          const lobby = new Lobby({
            code,
            quizId,
            players: [],
            maxPlayers: 8
          })

          yield* Ref.update(lobbiesRef, (map) => {
            const next = new Map(map)
            next.set(code, lobby)
            return next
          })

          return lobby
        }),

      get: (code: Lobby['code']) =>
        Effect.gen(function* () {
          const lobbies = yield* Ref.get(lobbiesRef)
          const lobby = lobbies.get(code)

          if (!lobby) {
            return yield* Effect.fail(new LobbyNotFoundError({ lobbyCode: code }))
          }

          return lobby
        }),

      join: (code: string, username: string) =>
        Effect.gen(function* () {
          const lobbies = yield* Ref.get(lobbiesRef)
          const lobby = lobbies.get(code)

          if (!lobby) {
            return yield* Effect.fail(new LobbyNotFoundError({ lobbyCode: code }))
          }

          if (lobby.players.length >= lobby.maxPlayers) {
            return yield* Effect.fail(
              new LobbyFullError({ lobbyCode: code, maxPlayers: lobby.maxPlayers })
            )
          }

          if (lobby.players.includes(username)) {
            return yield* Effect.fail(
              new UsernameTakenError({ lobbyCode: code, username })
            )
          }

          const updated: Lobby = {
            ...lobby,
            players: [...lobby.players, username]
          }

          yield* Ref.update(lobbiesRef, (map) => {
            const next = new Map(map)
            next.set(code, updated)
            return next
          })

          // Broadcast to real-time subscribers
          const subscribers = yield* Ref.get(subscribersRef)
          const set = subscribers.get(code)
          if (set) {
            const event: LobbyEvent = {
              _tag: "PLAYER_JOINED",
              lobbyCode: code,
              player: username,
              players: updated.players
            }
            for (const q of set) {
              yield* Queue.offer(q, event)
            }
          }

          return updated
        }),

      subscribe: (code: string) =>
        Effect.gen(function* () {
          const queue = yield* Queue.unbounded<LobbyEvent>()

          // Register queue for this room
          yield* Ref.update(subscribersRef, (map) => {
            const next = new Map(map)
            const current = next.get(code) ?? new Set()
            current.add(queue)
            next.set(code, current)
            return next
          })

          // Send immediate initial state
          const lobbies = yield* Ref.get(lobbiesRef)
          const currentLobby = lobbies.get(code)
          if (currentLobby) {
            yield* Queue.offer(queue, new LobbyStateEvent({ lobby: currentLobby }))
          }

          // Return stream with automatic cleanup on disconnect
          return Stream.fromQueue(queue).pipe(
            Stream.ensuring(
              Ref.update(subscribersRef, (map) => {
                const next = new Map(map)
                const current = next.get(code)
                if (current) {
                  current.delete(queue)
                  if (current.size === 0) {
                    next.delete(code)
                  }
                }
                return next
              })
            )
          )
        }),

      broadcast: (lobbyCode: Lobby['code'], event: LobbyEvent) =>
        Effect.gen(function* () {
          const subscribers = yield* Ref.get(subscribersRef)
          const set = subscribers.get(lobbyCode)
          if (set) {
            for (const q of set) {
              yield* Queue.offer(q, event)
            }
          }
        }),
    }
  })
)
