import { useState } from "react"
import { Effect } from "effect"
import { useEffectMutation } from "@quiz/client-sdk"
import { quizClient } from "../../../lib/api"

type UseSubmitGuessOptions = {
  readonly lobbyCode: string
  readonly player: string
  readonly onSuccess?: () => void
  readonly onError?: (error: Error) => void
}

/**
 * Encapsulated mutation hook for submitting a round guess.
 * Provides optimistic UI feedback, input locking, and automatic rollback on error.
 */
export function useSubmitGuessMutation({
  lobbyCode,
  player,
  onSuccess,
  onError
}: UseSubmitGuessOptions) {
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null)

  const mutation = useEffectMutation(
    (guess: string) =>
      quizClient
        .submitGuess({
          lobbyCode,
          player,
          guess
        })
        .pipe(
          Effect.tap(() => Effect.log(`Submitted guess: ${guess}`)),
          Effect.catchTags({
            GameNotFoundError: (err) =>
              Effect.fail(
                new Error(`Game for lobby "${err.lobbyCode}" is not currently running!`)
              ),
            RpcClientError: (err) =>
              Effect.fail(new Error(`Connection error: ${err.message}`))
          })
        ),
    {
      onMutate: () => {
        // Optimistic UX: Lock button and show instant feedback
        setHasSubmitted(true)
        setSubmissionFeedback("Buzzing in... ⚡")
      },
      onSuccess: () => {
        setSubmissionFeedback("Guess submitted! 🎯 Checking with host...")
        onSuccess?.()
      },
      onError: (err: Error) => {
        // Rollback optimistic state if the submission fails
        setHasSubmitted(false)
        setSubmissionFeedback(err.message)
        onError?.(err)
      }
    }
  )

  const resetGuessState = () => {
    setHasSubmitted(false)
    setSubmissionFeedback(null)
  }

  const submitGuess = (guess: string) => {
    if (!guess.trim() || hasSubmitted || mutation.isPending) return
    mutation.mutate(guess.trim())
  }

  return {
    submitGuess,
    isPending: mutation.isPending,
    hasSubmitted,
    submissionFeedback,
    resetGuessState
  }
}
