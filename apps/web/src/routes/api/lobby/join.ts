import { createFileRoute } from "@tanstack/react-router"
import { Schema, Effect } from "effect"
import { JoinLobbyInput } from "@quiz/domain"
import { LobbyService } from "../../../services/LobbyService"
import { apiHandler } from "../../../server/effectFn"

export const Route = createFileRoute("/api/lobby/join")({
  server: {
    handlers: {
      POST: apiHandler(async (req) => {
        const body = await req.json()
        return Effect.gen(function* () {
          const input = yield* Schema.decodeUnknownEffect(JoinLobbyInput)(body)
          const lobby = yield* LobbyService
          return yield* lobby.join(input.lobbyCode, input.username)
        })
      })
    }
  }
})
