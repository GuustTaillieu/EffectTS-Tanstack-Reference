import { queryOptions, useMutation, type UseMutationOptions } from "@tanstack/react-query"
import { Effect } from "effect"

/**
 * Creates TanStack Query options directly from an Effect.
 * Enables caching, deduping, background refetching, and SSR loader prefetching!
 *
 * @example
 * export const quizQuery = effectQueryOptions({
 *   queryKey: ["quiz", "featured"],
 *   effect: getFeaturedQuiz(),
 *   staleTime: 1000 * 60 * 5 // 5 minutes
 * })
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
    staleTime: options.staleTime ?? 1000 * 60 * 5, // 5 min default
    gcTime: options.gcTime
  })
}

/**
 * Custom hook wrapping useMutation with an Effect factory.
 *
 * @example
 * const joinMutation = useEffectMutation(joinLobby, {
 *   onSuccess: (lobby) => console.log("Joined:", lobby),
 *   onError: (err) => {
 *     if (err._tag === "LobbyFullError") alert("Room is full!")
 *   }
 * })
 */
export function useEffectMutation<Input, A, E>(
  effectFn: (input: Input) => Effect.Effect<A, E>,
  options?: Omit<UseMutationOptions<A, E, Input>, "mutationFn">
) {
  return useMutation({
    mutationFn: (input: Input) => Effect.runPromise(effectFn(input)),
    ...options
  })
}
