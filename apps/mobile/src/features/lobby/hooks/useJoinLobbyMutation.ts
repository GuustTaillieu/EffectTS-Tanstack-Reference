import { useState } from "react"
import { Effect } from "effect"
import { useEffectMutation } from "@quiz/client-sdk"
import type { JoinLobbyInput, Lobby } from "@quiz/domain"
import { quizClient } from "../../../lib/api"

type UseJoinLobbyOptions = {
  readonly onSuccess?: (lobby: Lobby) => void
  readonly onError?: (error: Error) => void
}

/**
 * Encapsulated mutation hook for joining a lobby.
 * Handles Effect error-channel decoding, domain error messages, and pending states.
 */
export function useJoinLobbyMutation(options?: UseJoinLobbyOptions) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const mutation = useEffectMutation(
    (input: JoinLobbyInput) =>
      quizClient.joinLobby(input).pipe(
        Effect.tap((lobby) => Effect.log(`Joined lobby: ${lobby.code}`)),
        Effect.catchTags({
          UsernameTakenError: (err) =>
            Effect.fail(
              new Error(`The nickname "${err.username}" is already taken in lobby "${err.lobbyCode}"!`)
            ),
          LobbyNotFoundError: (err) =>
            Effect.fail(new Error(`Lobby "${err.lobbyCode}" not found on the host screen!`)),
          LobbyFullError: (err) =>
            Effect.fail(new Error(`Lobby "${err.lobbyCode}" is full!`)),
          RpcClientError: (err) =>
            Effect.fail(
              new Error(`Cannot connect to server at ${quizClient.baseUrl}: ${err.message}`)
            )
        })
      ),
    {
      onSuccess: (lobby) => {
        setErrorMessage(null)
        options?.onSuccess?.(lobby)
      },
      onError: (err: Error) => {
        setErrorMessage(err.message)
        options?.onError?.(err)
      }
    }
  )

  const joinLobby = (input: JoinLobbyInput) => {
    setErrorMessage(null)
    mutation.mutate(input)
  }

  return {
    joinLobby,
    isPending: mutation.isPending,
    errorMessage,
    setErrorMessage,
    clearError: () => setErrorMessage(null),
    mutation
  }
}
