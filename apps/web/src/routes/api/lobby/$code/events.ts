import { createFileRoute } from "@tanstack/react-router"
import { Effect, Stream } from "effect"
import { EffectRuntime } from "../../../../server/effectRuntime"
import { LobbyService } from "../../../../services/LobbyService"

export const Route = createFileRoute("/api/lobby/$code/events")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { code } = params as { code: string }

        return await EffectRuntime.runPromise(
          Effect.gen(function* () {
            const lobby = yield* LobbyService
            const stream = yield* lobby.subscribe(code)

            const sseStream = stream.pipe(
              Stream.map((event) => `data: ${JSON.stringify(event)}\n\n`),
              Stream.encodeText
            )

            return new Response(Stream.toReadableStream(sseStream), {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
              }
            })
          })
        )
      }
    }
  }
})
