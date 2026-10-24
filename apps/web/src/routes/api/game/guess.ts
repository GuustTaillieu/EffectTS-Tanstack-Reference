import { createFileRoute } from "@tanstack/react-router"
import { Schema, Effect } from "effect"
import { SubmitGuessInput } from "@quiz/domain"
import { GameService } from "../../../services/GameService"
import { apiHandler } from "../../../server/effectFn"

export const Route = createFileRoute("/api/game/guess")({
  server: {
    handlers: {
      POST: apiHandler(async (req) => {
        const body = await req.json()
        return Effect.gen(function* () {
          const input = yield* Schema.decodeUnknownEffect(SubmitGuessInput)(body)
          const game = yield* GameService
          return yield* game.submitGuess(input.lobbyCode, input.player, input.guess)
        })
      })
    }
  }
})
