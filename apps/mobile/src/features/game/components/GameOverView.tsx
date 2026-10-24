import React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import type { GameOverEvent } from "@quiz/domain"

type GameOverViewProps = {
  readonly result: GameOverEvent
  readonly currentPlayer: string
  readonly onLeave: () => void
}

export function GameOverView({ result, currentPlayer, onLeave }: GameOverViewProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.trophy}>🏆</Text>
      <Text style={styles.gameOverTitle}>Game Over!</Text>
      <Text style={styles.gameOverSubtitle}>Final Leaderboard</Text>

      {Object.entries(result.finalScoreboard)
        .sort((a, b) => b[1] - a[1])
        .map(([pName, score], idx) => (
          <View
            key={pName}
            style={[
              styles.scoreRow,
              idx === 0 && styles.firstPlaceRow,
              pName === currentPlayer && styles.scoreRowCurrentPlayer
            ]}
          >
            <Text style={styles.scoreRank}>
              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
            </Text>
            <Text style={styles.scoreName}>
              {pName} {pName === currentPlayer && "(You)"}
            </Text>
            <Text style={styles.scorePoints}>{score} pts</Text>
          </View>
        ))}

      <TouchableOpacity style={styles.leaveButton} onPress={onLeave} activeOpacity={0.8}>
        <Text style={styles.leaveButtonText}>Back to Lobby</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#18181b",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#27272a"
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
