import { createFileRoute } from "@tanstack/react-router"
import { Effect, Stream } from "effect"
import { EffectRuntime } from "../../../../server/effectRuntime"
import { LobbyService } from "../../../../services/LobbyService"

export const Route = createFileRoute("/api/lobby/$code/events")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { code } = params as { code: string }

        // 1. Retrieve the Effect Stream from QuizService
        const eventStream = await EffectRuntime.runPromise(
          Effect.gen(function* () {
            const lobby = yield* LobbyService
            return yield* lobby.subscribe(code)
          })
        )

        // 2. Format as Server-Sent Events (SSE) data chunks
        const sseStream = eventStream.pipe(
          Stream.map((event) => `data: ${JSON.stringify(event)}\n\n`),
          Stream.encodeText
        )

        // 3. Convert Effect Stream to standard Web ReadableStream
        const webStream = Stream.toReadableStream(sseStream)

        return new Response(webStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        })
      }
    }
  }
})
