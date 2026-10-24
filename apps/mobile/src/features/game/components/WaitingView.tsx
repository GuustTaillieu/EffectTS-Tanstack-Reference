import React from "react"
import { View, Text, ActivityIndicator, StyleSheet } from "react-native"

type WaitingViewProps = {
  readonly players?: readonly string[]
  readonly currentPlayer: string
}

export function WaitingView({ players, currentPlayer }: WaitingViewProps) {
  return (
    <View style={styles.centeredCard}>
      <ActivityIndicator size="large" color="#22c55e" style={{ marginBottom: 20 }} />
      <Text style={styles.waitingTitle}>You're In the Game!</Text>
      <Text style={styles.waitingSubtitle}>
        Look up at the main screen. The host will start the quiz shortly!
      </Text>

      {players && players.length > 0 && (
        <View style={styles.playersBox}>
          <Text style={styles.playersTitle}>
            Connected Players ({players.length})
          </Text>
          <View style={styles.playerChips}>
            {players.map((p) => (
              <View key={p} style={styles.chip}>
                <Text style={styles.chipText}>
                  {p} {p === currentPlayer && "(You)"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
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
  }
})
