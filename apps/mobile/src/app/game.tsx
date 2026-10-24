import React, { useEffect, useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  type LobbyEvent,
  type RoundStartedEvent,
  type RoundEndedEvent,
  type GameOverEvent,
  TitleQuestion,
  ArtistQuestion,
  LyricsQuestion
} from "@quiz/domain"
import { Effect } from "effect"
import { useEffectMutation } from "@quiz/client-sdk"
import { quizClient } from "../lib/api"
import { subscribeToLobbyEvents } from "../lib/sse"
import { queryClient } from "../lib/queryClient"

export default function GameScreen() {
  const { code, player } = useLocalSearchParams<{ code: string; player: string }>()
  const router = useRouter()

  const [gameState, setGameState] = useState<
    | { status: "WAITING_FOR_START"; players?: readonly string[] }
    | { status: "ROUND_ACTIVE"; round: RoundStartedEvent }
    | { status: "ROUND_ENDED"; result: RoundEndedEvent }
    | { status: "GAME_OVER"; result: GameOverEvent }
  >({
    status: "WAITING_FOR_START"
  })

  const [guessInput, setGuessInput] = useState("")
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null)

  const submitGuessMutation = useEffectMutation(
    (guess: string) =>
      quizClient
        .submitGuess({
          lobbyCode: code ?? "",
          player: player ?? "",
          guess
        })
        .pipe(
          Effect.tap(() => Effect.log(`Submitted guess: ${guess}`)),
          Effect.catchTags({
            GameNotFoundError: (err) =>
              Effect.fail(new Error(`Game for lobby ${err.lobbyCode} is not currently running!`)),
            NetworkError: (err) =>
              Effect.fail(new Error(`Connection error: ${err.message}`))
          })
        ),
    {
      onSuccess: () => {
        setHasSubmitted(true)
        setSubmissionFeedback("Guess submitted! 🎯 Checking with host...")
      },
      onError: (err: Error) => {
        setSubmissionFeedback(err.message)
      }
    },
    queryClient
  )

  useEffect(() => {
    if (!code) return

    const eventsUrl = quizClient.getEventsUrl(code)
    const unsubscribe = subscribeToLobbyEvents(
      eventsUrl,
      (event: LobbyEvent) => {
        if (event._tag === "ROUND_STARTED") {
          setGuessInput("")
          setHasSubmitted(false)
          setSubmissionFeedback(null)
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
  }, [code])

  const handleSubmitGuess = () => {
    if (!guessInput.trim() || hasSubmitted || submitGuessMutation.isPending) return
    submitGuessMutation.mutate(guessInput.trim())
  }

  const renderQuestionPrompt = (round: RoundStartedEvent) => {
    const q = round.question
    if (q instanceof TitleQuestion) {
      return "🎵 Listen to the music on screen! What is the track title?"
    }
    if (q instanceof ArtistQuestion) {
      return "🎤 Listen closely! Who is the artist of this track?"
    }
    if (q instanceof LyricsQuestion) {
      return `📝 Missing lyrics: "${q.beforeLyrics}..."`
    }
    return "🎧 Guess the music playing on the main screen!"
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.lobbyCodeLabel}>LOBBY</Text>
            <Text style={styles.lobbyCodeValue}>{code}</Text>
          </View>
          <View style={styles.playerBadge}>
            <Text style={styles.playerBadgeText}>👤 {player}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* State 1: WAITING FOR HOST */}
          {gameState.status === "WAITING_FOR_START" && (
            <View style={styles.centeredCard}>
              <ActivityIndicator size="large" color="#22c55e" style={{ marginBottom: 20 }} />
              <Text style={styles.waitingTitle}>You're In the Game!</Text>
              <Text style={styles.waitingSubtitle}>
                Look up at the main screen. The host will start the quiz shortly!
              </Text>

              {gameState.players && gameState.players.length > 0 && (
                <View style={styles.playersBox}>
                  <Text style={styles.playersTitle}>
                    Connected Players ({gameState.players.length})
                  </Text>
                  <View style={styles.playerChips}>
                    {gameState.players.map((p) => (
                      <View key={p} style={styles.chip}>
                        <Text style={styles.chipText}>
                          {p} {p === player && "(You)"}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* State 2: ROUND ACTIVE */}
          {gameState.status === "ROUND_ACTIVE" && (
            <View style={styles.roundContainer}>
              <View style={styles.roundHeader}>
                <Text style={styles.roundBadge}>ACTIVE ROUND</Text>
                <Text style={styles.timerBadge}>⏱️ Audio Playing</Text>
              </View>

              <Text style={styles.questionText}>
                {renderQuestionPrompt(gameState.round)}
              </Text>

              {submissionFeedback && (
                <View style={styles.feedbackBanner}>
                  <Text style={styles.feedbackText}>{submissionFeedback}</Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.guessInput}
                  placeholder="Type your guess here..."
                  placeholderTextColor="#71717a"
                  value={guessInput}
                  onChangeText={setGuessInput}
                  onSubmitEditing={handleSubmitGuess}
                  returnKeyType="send"
                  editable={!hasSubmitted && !submitGuessMutation.isPending}
                  autoFocus
                />

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (hasSubmitted || !guessInput.trim() || submitGuessMutation.isPending) &&
                      styles.submitButtonDisabled
                  ]}
                  onPress={handleSubmitGuess}
                  disabled={hasSubmitted || !guessInput.trim() || submitGuessMutation.isPending}
                  activeOpacity={0.8}
                >
                  {submitGuessMutation.isPending ? (
                    <ActivityIndicator color="#09090b" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {hasSubmitted ? "Guess Submitted ✅" : "Buzz In! ⚡"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* State 3: ROUND ENDED */}
          {gameState.status === "ROUND_ENDED" && (
            <View style={styles.card}>
              <Text style={styles.roundResultHeader}>Round Finished!</Text>

              <View style={styles.answerBox}>
                <Text style={styles.answerLabel}>CORRECT TRACK</Text>
                <Text style={styles.answerValue}>
                  {gameState.result.answer.track.name}
                </Text>
                <Text style={styles.artistValue}>
                  by {gameState.result.answer.track.artist}
                </Text>
              </View>

              <View style={styles.winnerBox}>
                {gameState.result.winner ? (
                  <Text style={styles.winnerText}>
                    🏆 {gameState.result.winner === player ? "You won this round!" : `${gameState.result.winner} buzzed in first!`}
                  </Text>
                ) : (
                  <Text style={styles.noWinnerText}>
                    ⏱️ Time ran out — no one guessed correctly!
                  </Text>
                )}
              </View>

              <Text style={styles.leaderboardTitle}>Current Standings</Text>
              {Object.entries(gameState.result.scoreboard)
                .sort((a, b) => b[1] - a[1])
                .map(([pName, score], idx) => (
                  <View
                    key={pName}
                    style={[
                      styles.scoreRow,
                      pName === player && styles.scoreRowCurrentPlayer
                    ]}
                  >
                    <Text style={styles.scoreRank}>#{idx + 1}</Text>
                    <Text style={styles.scoreName}>
                      {pName} {pName === player && "(You)"}
                    </Text>
                    <Text style={styles.scorePoints}>{score} pts</Text>
                  </View>
                ))}

              <Text style={styles.nextRoundHint}>Get ready for the next round...</Text>
            </View>
          )}

          {/* State 4: GAME OVER */}
          {gameState.status === "GAME_OVER" && (
            <View style={styles.card}>
              <Text style={styles.trophy}>🏆</Text>
              <Text style={styles.gameOverTitle}>Game Over!</Text>
              <Text style={styles.gameOverSubtitle}>Final Leaderboard</Text>

              {Object.entries(gameState.result.finalScoreboard)
                .sort((a, b) => b[1] - a[1])
                .map(([pName, score], idx) => (
                  <View
                    key={pName}
                    style={[
                      styles.scoreRow,
                      idx === 0 && styles.firstPlaceRow,
                      pName === player && styles.scoreRowCurrentPlayer
                    ]}
                  >
                    <Text style={styles.scoreRank}>
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </Text>
                    <Text style={styles.scoreName}>
                      {pName} {pName === player && "(You)"}
                    </Text>
                    <Text style={styles.scorePoints}>{score} pts</Text>
                  </View>
                ))}

              <TouchableOpacity
                style={styles.leaveButton}
                onPress={() => router.replace("/")}
              >
                <Text style={styles.leaveButtonText}>Back to Lobby</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b"
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#18181b"
  },
  lobbyCodeLabel: {
    color: "#71717a",
    fontSize: 10,
    fontWeight: "700"
  },
  lobbyCodeValue: {
    color: "#22c55e",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2
  },
  playerBadge: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  playerBadgeText: {
    color: "#fafafa",
    fontSize: 13,
    fontWeight: "600"
  },
  content: {
    padding: 20,
    flexGrow: 1,
    justifyContent: "center"
  },
  centeredCard: {
    backgroundColor: "#18181b",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#27272a"
  },
  waitingTitle: {
    color: "#fafafa",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8
  },
  waitingSubtitle: {
    color: "#a1a1aa",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20
  },
  playersBox: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    paddingTop: 16
  },
  playersTitle: {
    color: "#71717a",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 10,
    textAlign: "center"
  },
  playerChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center"
  },
  chip: {
    backgroundColor: "#27272a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  chipText: {
    color: "#e4e4e7",
    fontSize: 13,
    fontWeight: "600"
  },
  roundContainer: {
    flex: 1,
    justifyContent: "center"
  },
  roundHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  roundBadge: {
    backgroundColor: "#22c55e20",
    color: "#22c55e",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "700"
  },
  timerBadge: {
    color: "#e4e4e7",
    fontSize: 14,
    fontWeight: "700"
  },
  questionText: {
    color: "#fafafa",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
    lineHeight: 30
  },
  feedbackBanner: {
    backgroundColor: "#22c55e20",
    borderWidth: 1,
    borderColor: "#22c55e",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: "center"
  },
  feedbackText: {
    color: "#4ade80",
    fontWeight: "700"
  },
  inputContainer: {
    gap: 12
  },
  guessInput: {
    backgroundColor: "#18181b",
    borderWidth: 1.5,
    borderColor: "#3f3f46",
    borderRadius: 14,
    padding: 18,
    color: "#fafafa",
    fontSize: 18,
    fontWeight: "600"
  },
  submitButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center"
  },
  submitButtonDisabled: {
    opacity: 0.5
  },
  submitButtonText: {
    color: "#09090b",
    fontSize: 18,
    fontWeight: "800"
  },
  card: {
    backgroundColor: "#18181b",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#27272a"
  },
  roundResultHeader: {
    color: "#fafafa",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16
  },
  answerBox: {
    backgroundColor: "#22c55e15",
    borderWidth: 1,
    borderColor: "#22c55e",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16
  },
  answerLabel: {
    color: "#4ade80",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4
  },
  answerValue: {
    color: "#fafafa",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center"
  },
  artistValue: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2
  },
  winnerBox: {
    backgroundColor: "#09090b",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20
  },
  winnerText: {
    color: "#facc15",
    fontWeight: "700",
    fontSize: 15
  },
  noWinnerText: {
    color: "#a1a1aa",
    fontSize: 13
  },
  leaderboardTitle: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#09090b",
    marginBottom: 8
  },
  scoreRowCurrentPlayer: {
    borderWidth: 1,
    borderColor: "#22c55e"
  },
  firstPlaceRow: {
    backgroundColor: "#ca8a0420",
    borderWidth: 1,
    borderColor: "#eab308"
  },
  scoreRank: {
    color: "#a1a1aa",
    fontWeight: "700",
    width: 32
  },
  scoreName: {
    color: "#fafafa",
    fontWeight: "600",
    flex: 1
  },
  scorePoints: {
    color: "#22c55e",
    fontWeight: "700"
  },
  nextRoundHint: {
    color: "#71717a",
    fontSize: 12,
    textAlign: "center",
    marginTop: 14
  },
  trophy: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: 8
  },
  gameOverTitle: {
    color: "#fafafa",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center"
  },
  gameOverSubtitle: {
    color: "#a1a1aa",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20
  },
  leaveButton: {
    backgroundColor: "#27272a",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20
  },
  leaveButtonText: {
    color: "#fafafa",
    fontWeight: "700"
  }
})
