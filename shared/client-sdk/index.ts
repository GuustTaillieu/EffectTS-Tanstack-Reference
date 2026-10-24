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

/**
 * Derived typed client from the QuizRpcs RpcGroup definition.
 * Any new procedure added to QuizRpcs is automatically typed here.
 */
export type DerivedRpcClient = RpcClient.FromGroup<typeof QuizRpcs, RpcClientError.RpcClientError>

/**
 * Full QuizClient type combining derived RPC methods with client metadata.
 */
export type QuizClient = DerivedRpcClient & {
  readonly baseUrl: string
  readonly getEventsUrl: (lobbyCode: string) => string
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
 * QueryClient is automatically inferred from React context if omitted.
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
 * Creates a strongly typed QuizClient instance using a dynamic Proxy.
 * All procedures from QuizRpcs are automatically bound without manual boilerplate.
 * Every call is a self-contained, scoped Effect ready for .pipe(Effect.catchTags(...)).
 */
export function createQuizClient(baseUrl: string): QuizClient {
  const cleanBase = baseUrl.replace(/\/$/, "")
  const protocolLayer = makeRpcProtocolLayer(cleanBase)

  const meta = {
    baseUrl: cleanBase,
    getEventsUrl: (lobbyCode: string) => `${cleanBase}/api/lobby/${lobbyCode}/events`
  }

  return new Proxy(meta as any, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver)
      }
      if (typeof prop === "string") {
        return (input: unknown, options?: unknown) =>
          Effect.gen(function* () {
            const client = yield* RpcClient.make(QuizRpcs)
            return yield* (client as any)[prop](input, options)
          }).pipe(
            Effect.provide(protocolLayer),
            Effect.scoped
          )
      }
      return Reflect.get(target, prop, receiver)
    }
  }) as QuizClient
}
