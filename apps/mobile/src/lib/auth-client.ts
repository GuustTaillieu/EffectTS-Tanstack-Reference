import { createAuthClient } from "better-auth/react"
import { expoClient } from "@better-auth/expo/client"
import * as SecureStore from "expo-secure-store"
import { DEFAULT_SERVER_URL } from "./api"

export const authClient = createAuthClient({
  baseURL: DEFAULT_SERVER_URL,
  plugins: [
    expoClient({
      scheme: "mobile",
      storagePrefix: "quizapp",
      storage: SecureStore,
    }),
  ],
})

export const { signIn, signUp, useSession, signOut } = authClient
