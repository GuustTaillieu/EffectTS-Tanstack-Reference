import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useLobbyEvents } from "../features/game/hooks/useLobbyEvents"
import { useSubmitGuessMutation } from "../features/game/hooks/useSubmitGuessMutation"
import { WaitingView } from "../features/game/components/WaitingView"
import { ActiveRoundView } from "../features/game/components/ActiveRoundView"
import { RoundResultView } from "../features/game/components/RoundResultView"
import { GameOverView } from "../features/game/components/GameOverView"

export default function GameScreen() {
  const { code, player } = useLocalSearchParams<{ code: string; player: string }>()
  const router = useRouter()
  const [guessInput, setGuessInput] = useState("")

  const {
    submitGuess,
    isPending,
    hasSubmitted,
    submissionFeedback,
    resetGuessState
  } = useSubmitGuessMutation({
    lobbyCode: code ?? "",
    player: player ?? ""
  })

  const { gameState } = useLobbyEvents(code, {
    onRoundStarted: () => {
      setGuessInput("")
      resetGuessState()
    }
  })

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
          {gameState.status === "WAITING_FOR_START" && (
            <WaitingView players={gameState.players} currentPlayer={player ?? ""} />
          )}

          {gameState.status === "ROUND_ACTIVE" && (
            <ActiveRoundView
              round={gameState.round}
              guessInput={guessInput}
              onChangeGuessInput={setGuessInput}
              onSubmitGuess={() => submitGuess(guessInput)}
              isPending={isPending}
              hasSubmitted={hasSubmitted}
              submissionFeedback={submissionFeedback}
            />
          )}

          {gameState.status === "ROUND_ENDED" && (
            <RoundResultView result={gameState.result} currentPlayer={player ?? ""} />
          )}

          {gameState.status === "GAME_OVER" && (
            <GameOverView
              result={gameState.result}
              currentPlayer={player ?? ""}
              onLeave={() => router.replace("/")}
            />
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
  }
})
