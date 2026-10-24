import { Effect } from "effect"
import {
  queryOptions,
  useMutation,
  type UseMutationOptions,
  type QueryClient
} from "@tanstack/react-query"
import type { QuizApiContract, NetworkError } from "@quiz/domain"
import { NetworkError as NetworkErrorClass } from "@quiz/domain"

export { NetworkError }

export type ApiErrors<K extends keyof QuizApiContract> =
  QuizApiContract[K]["errors"] | NetworkError

export type QuizClient = {
  readonly [K in keyof QuizApiContract]: (
    input: QuizApiContract[K]["input"]
  ) => Effect.Effect<QuizApiContract[K]["success"], ApiErrors<K>>
} & {
  readonly baseUrl: string
  readonly getEventsUrl: (lobbyCode: string) => string
}

const procedurePaths: { readonly [K in keyof QuizApiContract]: QuizApiContract[K]["path"] } = {
  joinLobby: "/api/lobby/join",
  submitGuess: "/api/game/guess"
}

/**
 * Creates TanStack Query options directly from an Effect.
 * Works seamlessly on BOTH Web and React Native!
 */
export function effectQueryOptions<A, E>(options: {
  queryKey: readonly unknown[]
  effect: () => Effect.Effect<A, E>
  staleTime?: number
  gcTime?: number
}) {
  return queryOptions({
    queryKey: options.queryKey,
    queryFn: () => Effect.runPromise(options.effect()),
    staleTime: options.staleTime ?? 1000 * 60 * 5,
    gcTime: options.gcTime
  })
}

/**
 * Custom mutation hook wrapping an Effect program for React and React Native.
 * Preserves the exact typed error channel E!
 */
export function useEffectMutation<Input, A, E>(
  effectFn: (input: Input) => Effect.Effect<A, E>,
  options?: Omit<UseMutationOptions<A, E, Input>, "mutationFn">,
  queryClient?: QueryClient
) {
  return useMutation(
    {
      mutationFn: (input: Input) => Effect.runPromise(effectFn(input)),
      ...options
    },
    queryClient
  )
}

/**
 * Generic Effect RPC caller.
 * Connects to the HTTP endpoint, parses JSON, and directly forwards typed failure objects
 * into Effect's typed error channel with ZERO manual string matching!
 */
function callProcedure<K extends keyof QuizApiContract>(
  baseUrl: string,
  procedure: K,
  input: QuizApiContract[K]["input"]
): Effect.Effect<QuizApiContract[K]["success"], ApiErrors<K>> {
  const path = procedurePaths[procedure]

  return Effect.gen(function* () {
    const res = yield* Effect.tryPromise({
      try: () =>
        fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input)
        }),
      catch: (err) =>
        new NetworkErrorClass({
          message:
            err instanceof Error
              ? err.message
              : `Connection to ${baseUrl} failed`
        })
    })

    const raw = yield* Effect.tryPromise({
      try: () =>
        res.json() as Promise<
          | { readonly _tag: "Success"; readonly value: QuizApiContract[K]["success"] }
          | { readonly _tag: "Failure"; readonly error: ApiErrors<K> }
        >,
      catch: (err) =>
        new NetworkErrorClass({
          message: `Server returned invalid JSON: ${err}`
        })
    })

    if (raw._tag === "Failure") {
      // The server failed with a typed domain error (e.g. UsernameTakenError, LobbyNotFoundError).
      // Since it already has its _tag and properties intact, we directly fail into Effect's error channel!
      return yield* Effect.fail(raw.error)
    }

    return raw.value
  })
}

/**
 * Creates a strongly typed QuizClient communicating with TanStack Start API routes.
 * The client methods and their error channels are derived dynamically from QuizApiContract!
 */
export function createQuizClient(baseUrl: string): QuizClient {
  const cleanBase = baseUrl.replace(/\/$/, "")

  return {
    baseUrl: cleanBase,
    joinLobby: (input) => callProcedure(cleanBase, "joinLobby", input),
    submitGuess: (input) => callProcedure(cleanBase, "submitGuess", input),
    getEventsUrl: (lobbyCode: string) => `${cleanBase}/api/lobby/${lobbyCode}/events`
  }
}
