import { useEffect, useState } from "react"
import type {
  LobbyEvent,
  RoundStartedEvent,
  RoundEndedEvent,
  GameOverEvent
} from "@quiz/domain"
import { quizClient } from "../../../lib/api"
import { subscribeToLobbyEvents } from "../../../lib/sse"

export type GameScreenState =
  | { readonly status: "WAITING_FOR_START"; readonly players?: readonly string[] }
  | { readonly status: "ROUND_ACTIVE"; readonly round: RoundStartedEvent }
  | { readonly status: "ROUND_ENDED"; readonly result: RoundEndedEvent }
  | { readonly status: "GAME_OVER"; readonly result: GameOverEvent }

type UseLobbyEventsOptions = {
  readonly onRoundStarted?: (event: RoundStartedEvent) => void
}

/**
 * Custom hook managing the real-time SSE event subscription for a game room.
 * Dispatches state transitions with schema validation.
 */
export function useLobbyEvents(lobbyCode: string | undefined, options?: UseLobbyEventsOptions) {
  const [gameState, setGameState] = useState<GameScreenState>({
    status: "WAITING_FOR_START"
  })

  useEffect(() => {
    if (!lobbyCode) return

    const eventsUrl = quizClient.getEventsUrl(lobbyCode)
    const unsubscribe = subscribeToLobbyEvents(
      eventsUrl,
      (event: LobbyEvent) => {
        if (event._tag === "ROUND_STARTED") {
          options?.onRoundStarted?.(event)
          setGameState({
            status: "ROUND_ACTIVE",
            round: event
          })
        } else if (event._tag === "ROUND_ENDED") {
          setGameState({
            status: "ROUND_ENDED",
            result: event
          })
        } else if (event._tag === "GAME_OVER") {
          setGameState({
            status: "GAME_OVER",
            result: event
          })
        } else if (event._tag === "PLAYER_JOINED") {
          setGameState((prev) =>
            prev.status === "WAITING_FOR_START"
              ? { ...prev, players: event.players }
              : prev
          )
        }
      },
      (err) => {
        console.warn("SSE connection notice:", err)
      }
    )

    return () => {
      unsubscribe()
    }
  }, [lobbyCode])

  return { gameState }
}
