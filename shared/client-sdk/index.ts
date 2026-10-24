import { Effect, Layer } from "effect"
import { RpcClient, RpcClientError, RpcSerialization } from "effect/rpc"
import { FetchHttpClient } from "effect/http"
import { QuizRpcs } from "@quiz/domain"
import {
  queryOptions,
  useMutation,
  type UseMutationOptions,
  type QueryClient
} from "@tanstack/react-query"

export { RpcClientError }

export type DerivedRpcClient = RpcClient.FromGroup<typeof QuizRpcs, RpcClientError.RpcClientError>

export type QuizClient = {
  readonly baseUrl: string
  readonly getEventsUrl: (lobbyCode: string) => string
  readonly joinLobby: DerivedRpcClient["JoinLobby"]
  readonly submitGuess: DerivedRpcClient["SubmitGuess"]
  readonly JoinLobby: DerivedRpcClient["JoinLobby"]
  readonly SubmitGuess: DerivedRpcClient["SubmitGuess"]
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
 * Creates an Effect RPC Layer targeting the /api/rpc endpoint.
 */
export const makeRpcProtocolLayer = (baseUrl: string) => {
  const cleanBase = baseUrl.replace(/\/$/, "")
  return RpcClient.layerProtocolHttp({ url: `${cleanBase}/api/rpc` }).pipe(
    Layer.provide(RpcSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer)
  )
}

/**
 * Creates a raw Effect RPC Client for QuizRpcs.
 */
export const makeQuizClient = (baseUrl: string) =>
  RpcClient.make(QuizRpcs).pipe(
    Effect.provide(makeRpcProtocolLayer(baseUrl))
  )

/**
 * Creates a convenient, strongly typed QuizClient instance.
 * Every method call is a self-contained, scoped Effect ready for .pipe(Effect.catchTags(...)).
 * Types are 100% derived from the QuizRpcs RpcGroup with zero manual type duplication.
 */
export function createQuizClient(baseUrl: string): QuizClient {
  const cleanBase = baseUrl.replace(/\/$/, "")
  const protocolLayer = makeRpcProtocolLayer(cleanBase)

  const call = <A, E>(
    execute: (client: DerivedRpcClient) => Effect.Effect<A, E>
  ): Effect.Effect<A, E> =>
    Effect.gen(function* () {
      const client = yield* RpcClient.make(QuizRpcs)
      return yield* execute(client)
    }).pipe(
      Effect.provide(protocolLayer),
      Effect.scoped
    )

  return {
    baseUrl: cleanBase,
    getEventsUrl: (lobbyCode: string) => `${cleanBase}/api/lobby/${lobbyCode}/events`,
    joinLobby: (input) => call((c) => c.JoinLobby(input)),
    submitGuess: (input) => call((c) => c.SubmitGuess(input)),
    JoinLobby: (input) => call((c) => c.JoinLobby(input)),
    SubmitGuess: (input) => call((c) => c.SubmitGuess(input))
  }
}
