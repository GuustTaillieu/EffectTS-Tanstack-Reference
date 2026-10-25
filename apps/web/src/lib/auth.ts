import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { expo } from "@better-auth/expo"
import { db, user, session, account, verification } from "@quiz/db"

// Better Auth server instance
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://127.0.0.1:5173",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  socialProviders: {
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID || "spotify_client_id_placeholder",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "spotify_client_secret_placeholder",
      scope: [
        "user-read-email",
        "user-read-private",
        "user-modify-playback-state",
        "user-read-playback-state",
        "streaming",
      ],
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    expo(),
    tanstackStartCookies(),
  ],
  trustedOrigins: [
    "mobile://",
    "quizapp://",
    "exp://",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ],
})

export type Auth = typeof auth
