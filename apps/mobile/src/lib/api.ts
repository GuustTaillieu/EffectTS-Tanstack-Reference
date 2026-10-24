import Constants from "expo-constants"
import { Platform } from "react-native"
import { createQuizClient, type QuizClient } from "@quiz/client-sdk"

/**
 * Automatically detects the computer's LAN IP when running on a physical device or emulator.
 * On your physical Pixel 7 Pro via Expo Go, hostUri is "10.0.0.32:8081" -> resolves to "10.0.0.32".
 */
function resolveHostIp(): string {
  const hostUri = Constants.expoConfig?.hostUri
  if (hostUri) {
    return hostUri.split(":")[0]
  }

  if (Platform.OS === "android") {
    return "10.0.2.2" // Android emulator loopback
  }

  return "localhost"
}

export const SERVER_HOST_IP = resolveHostIp()
export const DEFAULT_SERVER_URL = `http://${SERVER_HOST_IP}:5173`

/**
 * Global singleton client for the mobile app
 */
export const quizClient: QuizClient = createQuizClient(DEFAULT_SERVER_URL)
