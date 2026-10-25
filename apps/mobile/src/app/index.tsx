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
import { quizClient } from "../lib/api"
import { useJoinLobbyMutation } from "../features/lobby/hooks/useJoinLobbyMutation"
import { useSession, signIn, signOut } from "../lib/auth-client"

export default function JoinScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  const [lobbyCode, setLobbyCode] = useState("")
  const [username, setUsername] = useState("")

  React.useEffect(() => {
    if (session?.user?.name && !username) {
      setUsername(session.user.name)
    }
  }, [session])

  const { joinLobby, isPending, errorMessage, setErrorMessage, clearError } = useJoinLobbyMutation({
    onSuccess: (lobby) => {
      router.push({
        pathname: "/game",
        params: {
          code: lobby.code,
          player: username.trim()
        }
      })
    }
  })

  const handleJoin = () => {
    if (!lobbyCode.trim() || !username.trim()) {
      setErrorMessage("Please enter both Lobby Code and your Player Name")
      return
    }
    joinLobby({
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
              clearError()
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
              clearError()
            }}
            maxLength={20}
          />

          <TouchableOpacity
            style={[styles.button, isPending && styles.buttonDisabled]}
            onPress={handleJoin}
            disabled={isPending}
            activeOpacity={0.8}
          >
            {isPending ? (
              <ActivityIndicator color="#09090b" />
            ) : (
              <Text style={styles.buttonText}>Join Game 🚀</Text>
            )}
          </TouchableOpacity>

          {session?.user ? (
            <View style={styles.authBadge}>
              <Text style={styles.authBadgeText}>👤 Playing as {session.user.name}</Text>
              <TouchableOpacity onPress={() => signOut()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.authSignOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.spotifyButton}
              onPress={() => signIn.social({ provider: "spotify" })}
              activeOpacity={0.8}
            >
              <Text style={styles.spotifyButtonText}>🎧 Sign in with Spotify (Optional)</Text>
            </TouchableOpacity>
          )}

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
  },
  authBadge: {
    marginTop: 14,
    padding: 10,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  authBadgeText: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "600"
  },
  authSignOutText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "700"
  },
  spotifyButton: {
    marginTop: 14,
    paddingVertical: 12,
    backgroundColor: "#18181b",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1db954",
    alignItems: "center"
  },
  spotifyButtonText: {
    color: "#1db954",
    fontSize: 13,
    fontWeight: "700"
  }
})
