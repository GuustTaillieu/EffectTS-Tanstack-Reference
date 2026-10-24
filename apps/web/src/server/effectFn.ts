import { Cause, Effect, Exit, Option, Result } from "effect"
import { EffectRuntime } from "./effectRuntime"

export type WireError<E> = E extends { readonly _tag: infer Tag }
  ? {
    readonly [K in keyof E as E[K] extends Function
    ? never
    : K extends symbol | "cause" | "stack" | "name" | "message"
    ? never
    : K extends `~${string}`
    ? never
    : K]: E[K]
  }
  : never

export type ServerRpcResult<A, E> =
  | { readonly _tag: "Success"; readonly value: A }
  | { readonly _tag: "Failure"; readonly error: WireError<E> }

/**
 * Server-side: Runs an Effect program using EffectRuntime and returns a serializable RPC result
 */
export async function runServerEffect<A, E extends { readonly _tag: string }>(
  effect: Effect.Effect<A, E, any>
): Promise<ServerRpcResult<A, E>> {
  const exit = await EffectRuntime.runPromiseExit(effect)

  if (Exit.isSuccess(exit)) {
    const plainValue =
      typeof exit.value === "object" && exit.value !== null
        ? JSON.parse(JSON.stringify(exit.value))
        : exit.value
    return { _tag: "Success", value: plainValue }
  }

  const errResult = Cause.findError(exit.cause)
  if (Result.isSuccess(errResult)) {
    const raw = errResult.success as Record<string, unknown>
    return {
      _tag: "Failure",
      error: { ...raw, _tag: String(raw["_tag"]) } as unknown as WireError<E>
    }
  }

  throw new Error("Internal Server Defect")
}

/**
 * Server-side: Convenience wrapper for createServerFn handlers.
 * Usage:
 *   .handler(serverEffect(({ lobbyCode }) => LobbyService.pipe(...)))
 */
export function serverEffect<Input, A, E extends { readonly _tag: string }>(
  fn: (data: Input) => Effect.Effect<A, E, any>
) {
  return async (ctx?: { data?: Input }): Promise<ServerRpcResult<A, E>> => {
    return await runServerEffect(fn(ctx?.data as Input))
  }
}

/**
 * Client-side: Transforms a Server Function promise into a REAL, native Effect<A, E>
 * allowing .pipe(Effect.catchTag(...)) in UI components!
 */
export function asClientEffect<A, E>(
  serverCall: () => Promise<ServerRpcResult<A, E>>
): Effect.Effect<A, WireError<E>> {
  return Effect.gen(function* () {
    const res = yield* Effect.tryPromise(() => serverCall()).pipe(Effect.orDie)
    if (res._tag === "Failure") {
      return yield* Effect.fail(res.error)
    }
    return res.value
  })
}

/**
 * Client-side: Transforms a Server Function into a callable Effect function.
 * Usage:
 *   export const joinLobby = clientEffect(joinLobbyFn)
 */
export type ClientEffectFn<Fn> = Fn extends (opts: { data: infer Input }) => Promise<ServerRpcResult<infer A, infer E>>
  ? [Input] extends [undefined]
  ? () => Effect.Effect<A, WireError<E>>
  : (data: Input) => Effect.Effect<A, WireError<E>>
  : Fn extends (opts?: any) => Promise<ServerRpcResult<infer A, infer E>>
  ? () => Effect.Effect<A, WireError<E>>
  : never

export function clientEffect<Fn extends (...args: any[]) => any>(
  serverFn: Fn
): ClientEffectFn<Fn> {
  return ((data?: any) =>
    asClientEffect(() => (data !== undefined ? serverFn({ data }) : serverFn()))) as any
}
