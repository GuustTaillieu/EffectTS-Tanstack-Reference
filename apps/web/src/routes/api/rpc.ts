import { createFileRoute } from "@tanstack/react-router"
import { Effect, Layer } from "effect"
import { RpcServer, RpcSerialization } from "effect/rpc"
import { HttpEffect } from "effect/http"
import { QuizRpcs } from "@quiz/domain"
import { QuizRpcsLive } from "../../server/rpcHandlers"
import { AppLive, EffectRuntime } from "../../server/effectRuntime"

const serverLayer = Layer.mergeAll(
  QuizRpcsLive.pipe(Layer.provide(AppLive)),
  AppLive,
  RpcSerialization.layerJson
)

// Shared memoMap ensures RPC handlers access the same singleton in-memory state as EffectRuntime
const { handler } = HttpEffect.toWebHandlerLayer(
  RpcServer.toHttpEffect(QuizRpcs).pipe(Effect.flatten),
  serverLayer,
  { memoMap: EffectRuntime.memoMap }
)

export const Route = createFileRoute("/api/rpc")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => handler(request)
    }
  }
})
