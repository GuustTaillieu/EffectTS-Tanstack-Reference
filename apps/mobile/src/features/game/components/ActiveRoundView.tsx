import React from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet
} from "react-native"
import {
  type RoundStartedEvent,
  TitleQuestion,
  ArtistQuestion,
  LyricsQuestion
} from "@quiz/domain"

type ActiveRoundViewProps = {
  readonly round: RoundStartedEvent
  readonly guessInput: string
  readonly onChangeGuessInput: (text: string) => void
  readonly onSubmitGuess: () => void
  readonly isPending: boolean
  readonly hasSubmitted: boolean
  readonly submissionFeedback: string | null
}

function getQuestionPrompt(round: RoundStartedEvent): string {
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

export function ActiveRoundView({
  round,
  guessInput,
  onChangeGuessInput,
  onSubmitGuess,
  isPending,
  hasSubmitted,
  submissionFeedback
}: ActiveRoundViewProps) {
  const isSubmitDisabled = hasSubmitted || !guessInput.trim() || isPending

  return (
    <View style={styles.roundContainer}>
      <View style={styles.roundHeader}>
        <Text style={styles.roundBadge}>ACTIVE ROUND</Text>
        <Text style={styles.timerBadge}>⏱️ Audio Playing</Text>
      </View>

      <Text style={styles.questionText}>
        {getQuestionPrompt(round)}
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
          onChangeText={onChangeGuessInput}
          onSubmitEditing={onSubmitGuess}
          returnKeyType="send"
          editable={!hasSubmitted && !isPending}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
          onPress={onSubmitGuess}
          disabled={isSubmitDisabled}
          activeOpacity={0.8}
        >
          {isPending ? (
            <ActivityIndicator color="#09090b" />
          ) : (
            <Text style={styles.submitButtonText}>
              {hasSubmitted ? "Guess Submitted ✅" : "Buzz In! ⚡"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
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
  }
})
