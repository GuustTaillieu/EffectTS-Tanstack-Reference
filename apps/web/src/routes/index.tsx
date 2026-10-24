import { createFileRoute } from "@tanstack/react-router"
import { SubmitEventHandler, useEffect, useState } from "react"
import { Effect } from "effect"
import {
  getFeaturedQuiz,
  createLobby,
  joinLobby,
  startGame
} from "../server/functions"
import { Lobby, LobbyEvent } from "@quiz/domain"
import { effectQueryOptions, quizKeys } from "@quiz/client-sdk"

export const featuredQuizQuery = effectQueryOptions({
  queryKey: quizKeys.featured(),
  effect: () => getFeaturedQuiz(),
  staleTime: 1000 * 60 * 5 // 5 minutes cache
})
export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) => {
    return await queryClient.ensureQueryData(featuredQuizQuery)
  },
  component: Home
})

function Home() {
  const quiz = Route.useLoaderData()
  const [createdLobby, setCreatedLobby] = useState<Lobby | null>(null)
  const [joinedLobby, setJoinedLobby] = useState<Lobby | null>(null)
  const [joinCode, setJoinCode] = useState("")
  const [username, setUsername] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  // Real-time SSE Stream state
  const activeCode = createdLobby?.code ?? joinedLobby?.code ?? null
  const [livePlayers, setLivePlayers] = useState<ReadonlyArray<string>>([])
  const [eventsFeed, setEventsFeed] = useState<string[]>([])
  const [isSseConnected, setIsSseConnected] = useState(false)

  useEffect(() => {
    if (!activeCode) return

    const sse = new EventSource(`/api/lobby/${activeCode}/events`)

    sse.onopen = () => {
      setIsSseConnected(true)
    }

    sse.onmessage = (event) => {
      try {
        const payload: LobbyEvent = JSON.parse(event.data)
        if (payload._tag === "LOBBY_STATE") {
          setLivePlayers(payload.lobby.players)
          setEventsFeed((prev) => [
            ...prev,
            `📥 [LOBBY_STATE] Initialized room with ${payload.lobby.players.length} player(s)`
          ])
        } else if (payload._tag === "PLAYER_JOINED") {
          setLivePlayers(payload.players)
          setEventsFeed((prev) => [
            ...prev,
            `🎉 [PLAYER_JOINED] ${payload.player} entered the lobby! (Total: ${payload.players.length})`
          ])
        } else if (payload._tag === "ROUND_STARTED") {
          setEventsFeed((prev) => [
            ...prev,
            `🎵 [ROUND_STARTED] Listen up! Round duration: ${payload.question.roundDurationMs}ms`
          ])
        } else if (payload._tag === "ROUND_ENDED") {
          setEventsFeed((prev) => [
            ...prev,
            `🏁 [ROUND_ENDED] Winner: ${payload.winner ?? "No one (Timeout)"}!`
          ])
        } else if (payload._tag === "GAME_OVER") {
          setEventsFeed((prev) => [
            ...prev,
            `🏆 [GAME_OVER] Quiz Finished! Final Scoreboard calculated.`
          ])
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err)
      }
    }

    sse.onerror = () => {
      setIsSseConnected(false)
    }

    return () => {
      sse.close()
      setIsSseConnected(false)
    }
  }, [activeCode])

  const handleCreateLobby = async () => {
    setIsPending(true)
    try {
      const lobby = await Effect.runPromise(createLobby("featured-owner"))
      setCreatedLobby(lobby)
      setLivePlayers(lobby.players)
      setJoinCode(lobby.code) // auto-fill code for convenience
    } finally {
      setIsPending(false)
    }
  }

  const handleStartGame = async () => {
    if (!createdLobby) return
    setIsPending(true)
    try {
      const program = startGame(createdLobby.code).pipe(
        Effect.tap(() => {
          setEventsFeed((prev) => [...prev, "🎮 Game loop started on server fiber!"])
          return Effect.void
        }),
        Effect.catchTag("LobbyNotFoundError", () => {
          setErrorMessage("Lobby not found")
          return Effect.void
        }),
        Effect.catchTag("GameAlreadyStartedError", () => {
          setErrorMessage("Game already started")
          return Effect.void
        }),
        Effect.catchTag("QuizNotFoundError", () => {
          setErrorMessage("Quiz not found")
          return Effect.void
        })
      )
      await Effect.runPromise(program)
    } finally {
      setIsPending(false)
    }
  }

  const handleJoinLobby: SubmitEventHandler = async (e) => {
    e.preventDefault()
    setIsPending(true)
    try {
      const joinProgram = joinLobby({ lobbyCode: joinCode, username }).pipe(
        Effect.tap((lobby) => {
          setJoinedLobby(lobby)
          setLivePlayers(lobby.players)
          setErrorMessage(null)
          return Effect.void
        }),
        Effect.catchTag("UsernameTakenError", (err) => {
          setErrorMessage(`Username "${err.username}" is already taken!`)
          return Effect.void
        }),
        Effect.catchTag("LobbyFullError", (err) => {
          setErrorMessage(`Lobby ${err.lobbyCode} is full (max ${err.maxPlayers})!`)
          return Effect.void
        }),
        Effect.catchTag("LobbyNotFoundError", (err) => {
          setErrorMessage(`Lobby ${err.lobbyCode} not found!`)
          return Effect.void
        })
      )

      await Effect.runPromise(joinProgram)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <main style={{ maxWidth: 700, margin: "60px auto", padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: 8, color: "#38bdf8" }}>
          🎵 Spotify Multiplayer Quiz
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "1.1rem" }}>
          Full-Stack TanStack Start powered entirely by <strong>Effect 4.0</strong>.
        </p>
      </header>

      {/* Featured Quiz Card */}
      <div
        style={{
          backgroundColor: "#1e293b",
          padding: 24,
          borderRadius: 12,
          border: "1px solid #334155",
          marginBottom: 32
        }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: "1.4rem" }}>{quiz.title}</h2>
        <div style={{ display: "flex", gap: 24, color: "#cbd5e1" }}>
          <div><strong>Songs:</strong> {quiz?.questionsWithAnswers?.length ?? 0}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        {/* Section 1: Host a Lobby */}
        <div style={{ backgroundColor: "#1e293b", padding: 20, borderRadius: 12, border: "1px solid #334155" }}>
          <h3 style={{ marginTop: 0 }}>1. Host a Lobby</h3>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            Creates a room with max 2 players so you can test errors.
          </p>
          <button
            onClick={handleCreateLobby}
            disabled={isPending}
            style={{
              backgroundColor: "#10b981",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              fontWeight: "bold",
              cursor: isPending ? "not-allowed" : "pointer",
              width: "100%"
            }}
          >
            {isPending ? "Creating..." : "Create Lobby as Host"}
          </button>

          {createdLobby && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ padding: 12, backgroundColor: "#064e3b", borderRadius: 8, fontSize: "0.9rem" }}>
                Room Code: <strong>{createdLobby.code}</strong> (Players: {livePlayers.join(", ")})
              </div>
              <button
                onClick={handleStartGame}
                disabled={isPending}
                style={{
                  backgroundColor: "#8b5cf6",
                  color: "#fff",
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  fontWeight: "bold",
                  cursor: isPending ? "not-allowed" : "pointer"
                }}
              >
                {isPending ? "Starting..." : "🚀 Start Game"}
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Join a Lobby */}
        <div style={{ backgroundColor: "#1e293b", padding: 20, borderRadius: 12, border: "1px solid #334155" }}>
          <h3 style={{ marginTop: 0 }}>2. Join a Lobby</h3>
          <form onSubmit={handleJoinLobby} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="text"
              placeholder="Room Code (e.g. QUIZ001)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              required
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #475569",
                backgroundColor: "#0f172a",
                color: "#fff"
              }}
            />
            <input
              type="text"
              placeholder="Your Nickname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #475569",
                backgroundColor: "#0f172a",
                color: "#fff"
              }}
            />
            <button
              type="submit"
              disabled={isPending}
              style={{
                backgroundColor: "#3b82f6",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                fontWeight: "bold",
                cursor: isPending ? "not-allowed" : "pointer"
              }}
            >
              {isPending ? "Joining..." : "Join Game"}
            </button>
          </form>

          {errorMessage && (
            <div style={{ marginTop: 12, padding: 10, backgroundColor: "#7f1d1d", borderRadius: 6, color: "#fca5a5", fontSize: "0.85rem" }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {joinedLobby && (
            <div style={{ marginTop: 12, padding: 10, backgroundColor: "#064e3b", borderRadius: 6, color: "#a7f3d0", fontSize: "0.85rem" }}>
              ✅ Joined {joinedLobby.code}! Current players: {joinedLobby.players.join(", ")}
            </div>
          )}
        </div>
      </div>

      {/* Real-time SSE Sync Monitor */}
      {activeCode && (
        <div
          style={{
            backgroundColor: "#0f172a",
            padding: 24,
            borderRadius: 12,
            border: "1px solid #334155",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
            marginBottom: 32
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 8 }}>
              <span>⚡ Live Room:</span>
              <span style={{ color: "#38bdf8", fontFamily: "monospace" }}>{activeCode}</span>
            </h3>
            <span
              style={{
                fontSize: "0.85rem",
                padding: "4px 10px",
                borderRadius: 9999,
                backgroundColor: isSseConnected ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: isSseConnected ? "#34d399" : "#f87171",
                border: `1px solid ${isSseConnected ? "#059669" : "#b91c1c"}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: isSseConnected ? "#34d399" : "#f87171" }} />
              {isSseConnected ? "SSE Stream Connected (Effect Stream)" : "Connecting Stream..."}
            </span>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
              Live Connected Players ({livePlayers.length})
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {livePlayers.map((player) => (
                <div
                  key={player}
                  style={{
                    backgroundColor: "#1e293b",
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid #334155",
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#f8fafc"
                  }}
                >
                  <span style={{ color: "#38bdf8" }}>👤</span>
                  <span>{player}</span>
                  {createdLobby && quiz.owner === player && (
                    <span style={{ fontSize: "0.75rem", backgroundColor: "#f59e0b", color: "#000", padding: "1px 6px", borderRadius: 4, fontWeight: "bold" }}>
                      HOST
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
              Real-Time Event Stream Log
            </div>
            <div
              style={{
                backgroundColor: "#020617",
                border: "1px solid #1e293b",
                borderRadius: 8,
                padding: 12,
                fontFamily: "monospace",
                fontSize: "0.85rem",
                color: "#a5f3fc",
                maxHeight: 140,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 4
              }}
            >
              {eventsFeed.length === 0 ? (
                <span style={{ color: "#475569" }}>Waiting for stream events...</span>
              ) : (
                eventsFeed.map((msg, i) => <div key={i}>{msg}</div>)
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
