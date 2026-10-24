import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native"
import { useRouter } from "expo-router"
import { Effect } from "effect"
import { useEffectMutation } from "@quiz/client-sdk"
import type { JoinLobbyInput } from "@quiz/domain"
import { quizClient } from "../lib/api"

export default function JoinScreen() {
  const router = useRouter()
  const [lobbyCode, setLobbyCode] = useState("")
  const [username, setUsername] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Pure, typed Effect pipeline integrated into TanStack Query mutation
  const joinMutation = useEffectMutation(
    (input: JoinLobbyInput) =>
      quizClient.joinLobby(input).pipe(
        Effect.tap((lobby) => Effect.log(`Joined lobby: ${lobby.code}`)),
        Effect.catchTags({
          UsernameTakenError: (err) =>
            Effect.fail(
              new Error(`The nickname "${err.username}" is already taken in lobby "${err.lobbyCode}"!`)
            ),
          LobbyNotFoundError: (err) =>
            Effect.fail(new Error(`Lobby "${err.lobbyCode}" not found on the host screen!`)),
          LobbyFullError: (err) =>
            Effect.fail(new Error(`Lobby "${err.lobbyCode}" is full!`)),
          RpcClientError: (err) =>
            Effect.fail(
              new Error(`Cannot connect to server at ${quizClient.baseUrl}: ${err.message}`)
            )
        })
      ),
    {
      onSuccess: (lobby) => {
        router.push({
          pathname: "/game",
          params: {
            code: lobby.code,
            player: username
          }
        })
      },
      onError: (err: Error) => {
        setErrorMessage(err.message)
      }
    }
  )

  const handleJoin = () => {
    if (!lobbyCode.trim() || !username.trim()) {
      setErrorMessage("Please enter both Lobby Code and your Player Name")
      return
    }
    setErrorMessage(null)
    joinMutation.mutate({
      lobbyCode: lobbyCode.trim().toUpperCase(),
      username: username.trim()
    })
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.badge}>📱 EFFECT 4.0 + TANSTACK</Text>
          <Text style={styles.title}>Music Quiz Controller</Text>
          <Text style={styles.subtitle}>
            Join a game session hosted on the big screen!
          </Text>
        </View>

        <View style={styles.card}>
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          <Text style={styles.label}>LOBBY CODE</Text>
          <TextInput
            style={styles.inputCode}
            placeholder="e.g. ABCD"
            placeholderTextColor="#71717a"
            value={lobbyCode}
            onChangeText={(text) => {
              setLobbyCode(text.toUpperCase())
              setErrorMessage(null)
            }}
            autoCapitalize="characters"
            maxLength={6}
          />

          <Text style={styles.label}>YOUR NICKNAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. BeatsMaster"
            placeholderTextColor="#71717a"
            value={username}
            onChangeText={(text) => {
              setUsername(text)
              setErrorMessage(null)
            }}
            maxLength={20}
          />

          <TouchableOpacity
            style={[styles.button, joinMutation.isPending && styles.buttonDisabled]}
            onPress={handleJoin}
            disabled={joinMutation.isPending}
            activeOpacity={0.8}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator color="#09090b" />
            ) : (
              <Text style={styles.buttonText}>Join Game 🚀</Text>
            )}
          </TouchableOpacity>

          <View style={styles.serverInfo}>
            <Text style={styles.serverInfoLabel}>Connected Host</Text>
            <Text style={styles.serverInfoValue}>{quizClient.baseUrl}</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b"
  },
  scrollContent: {
    padding: 24,
    justifyContent: "center",
    minHeight: "100%"
  },
  header: {
    alignItems: "center",
    marginBottom: 32
  },
  badge: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8
  },
  title: {
    color: "#fafafa",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center"
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6
  },
  card: {
    backgroundColor: "#18181b",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#27272a"
  },
  label: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 12,
    padding: 16,
    color: "#fafafa",
    fontSize: 16,
    marginBottom: 8
  },
  inputCode: {
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#22c55e",
    borderRadius: 12,
    padding: 16,
    color: "#22c55e",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 8
  },
  button: {
    backgroundColor: "#22c55e",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: "#09090b",
    fontSize: 16,
    fontWeight: "700"
  },
  errorBox: {
    backgroundColor: "#450a0a",
    borderColor: "#ef4444",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
    fontWeight: "600"
  },
  serverInfo: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    alignItems: "center"
  },
  serverInfoLabel: {
    color: "#71717a",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2
  },
  serverInfoValue: {
    color: "#38bdf8",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace"
  }
})
