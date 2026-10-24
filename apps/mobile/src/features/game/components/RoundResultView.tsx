import React from "react"
import { View, Text, StyleSheet } from "react-native"
import type { RoundEndedEvent } from "@quiz/domain"

type RoundResultViewProps = {
  readonly result: RoundEndedEvent
  readonly currentPlayer: string
}

export function RoundResultView({ result, currentPlayer }: RoundResultViewProps) {
  const isWinner = result.winner === currentPlayer

  return (
    <View style={styles.card}>
      <Text style={styles.roundResultHeader}>Round Finished!</Text>

      <View style={styles.answerBox}>
        <Text style={styles.answerLabel}>CORRECT TRACK</Text>
        <Text style={styles.answerValue}>{result.answer.track.name}</Text>
        <Text style={styles.artistValue}>by {result.answer.track.artist}</Text>
      </View>

      <View style={styles.winnerBox}>
        {result.winner ? (
          <Text style={styles.winnerText}>
            🏆 {isWinner ? "You won this round!" : `${result.winner} buzzed in first!`}
          </Text>
        ) : (
          <Text style={styles.noWinnerText}>
            ⏱️ Time ran out — no one guessed correctly!
          </Text>
        )}
      </View>

      <Text style={styles.leaderboardTitle}>Current Standings</Text>
      {Object.entries(result.scoreboard)
        .sort((a, b) => b[1] - a[1])
        .map(([pName, score], idx) => (
          <View
            key={pName}
            style={[
              styles.scoreRow,
              pName === currentPlayer && styles.scoreRowCurrentPlayer
            ]}
          >
            <Text style={styles.scoreRank}>#{idx + 1}</Text>
            <Text style={styles.scoreName}>
              {pName} {pName === currentPlayer && "(You)"}
            </Text>
            <Text style={styles.scorePoints}>{score} pts</Text>
          </View>
        ))}

      <Text style={styles.nextRoundHint}>Get ready for the next round...</Text>
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
  }
})
