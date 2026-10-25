import { Layer, ManagedRuntime } from "effect";
import { QuizServiceLive } from "../services/QuizService";
import { GameServiceLive } from "../services/GameService";
import { SpotifyServiceLive } from "../services/SpotifyService";
import { SpotifyHttpClientLive } from "../services/SpotifyHttpService";
import { LobbyServiceLive } from "../services/LobbyService";
import { CryptoServiceLive } from "../services/CryptoService";

import { DatabaseServiceLive } from "@quiz/db";
import { AuthServiceLive } from "./authService";

const CryptoLive = CryptoServiceLive
const SpotifyHttpLive = SpotifyHttpClientLive
const DatabaseLive = DatabaseServiceLive
const AuthLive = AuthServiceLive

const QuizLive = QuizServiceLive.pipe(
  Layer.provide(CryptoLive)
)

const LobbyLive = LobbyServiceLive.pipe(
  Layer.provide(Layer.mergeAll(CryptoLive, QuizLive))
)

const SpotifyLive = SpotifyServiceLive.pipe(
  Layer.provide(SpotifyHttpLive)
)

const GameLive = GameServiceLive.pipe(
  Layer.provide(Layer.mergeAll(LobbyLive, QuizLive))
)

export const AppLive = Layer.mergeAll(
  CryptoLive,
  SpotifyHttpLive,
  DatabaseLive,
  AuthLive,
  QuizLive,
  LobbyLive,
  SpotifyLive,
  GameLive
)

const globalRuntimeState = globalThis as typeof globalThis & {
  __QUIZ_EFFECT_RUNTIME__?: ManagedRuntime.ManagedRuntime<
    Layer.Success<typeof AppLive>,
    never
  >
}

export const EffectRuntime = globalRuntimeState.__QUIZ_EFFECT_RUNTIME__ ??= ManagedRuntime.make(AppLive)

