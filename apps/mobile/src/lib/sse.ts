import { Schema } from "effect"
import { LobbyEvent } from "@quiz/domain"

const decodeLobbyEvent = Schema.decodeUnknownSync(LobbyEvent)

export function subscribeToLobbyEvents(
  eventsUrl: string,
  onEvent: (event: LobbyEvent) => void,
  onError?: (err: unknown) => void
): () => void {
  const controller = new AbortController()

  async function connect() {
    try {
      const response = await fetch(eventsUrl, {
        headers: {
          Accept: "text/event-stream"
        },
        signal: controller.signal
      })

      if (!response.ok || !response.body) {
        throw new Error(`SSE stream failed with status ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() ?? ""

        for (const block of lines) {
          const match = block.match(/^data:\s*(.+)$/m)
          if (match) {
            try {
              const rawJson = JSON.parse(match[1])
              const validatedEvent = decodeLobbyEvent(rawJson)
              onEvent(validatedEvent)
            } catch (err) {
              console.warn("Failed to parse or validate SSE event JSON:", err)
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        onError?.(err)
      }
    }
  }

  connect()

  return () => {
    controller.abort()
  }
}
