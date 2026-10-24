import { Schema } from "effect";
import { Answer, Question } from "./quiz";

export const SubmitGuessInput = Schema.Struct({
  lobbyCode: Schema.String,
  player: Schema.String,
  guess: Schema.String
})
export type SubmitGuessInput = typeof SubmitGuessInput.Type

const Scoreboard = Schema.Record(Schema.String, Schema.Number)

export class Game extends Schema.TaggedClass<Game>("Game")(
  "Game",
  {
    lobbyCode: Schema.String,
    currentRound: Schema.Number,
    scoreboard: Scoreboard,
  }) { }

// --- Domain Errors ---
export class GameNotFoundError extends Schema.TaggedError<GameNotFoundError>()(
  "GameNotFoundError",
  {
    lobbyCode: Schema.String
  }
) {}

export class GameAlreadyStartedError extends Schema.TaggedError<GameAlreadyStartedError>()(
  "GameAlreadyStartedError",
  {
    lobbyCode: Schema.String
  }
) {}

export class RoundStartedEvent extends Schema.TaggedClass<RoundStartedEvent>("RoundStartedEvent")(
  "ROUND_STARTED",
  {
    question: Question,
  }) { }

export class RoundEndedEvent extends Schema.TaggedClass<RoundEndedEvent>("RoundEndedEvent")(
  "ROUND_ENDED",
  {
    winner: Schema.NullOr(Schema.String),
    answer: Answer,
    scoreboard: Scoreboard,
  }) { }

export class GameOverEvent extends Schema.TaggedClass<GameOverEvent>("GameOverEvent")(
  "GAME_OVER",
  {
    finalScoreboard: Scoreboard,
  }) { }

export const GameEvent = Schema.Union([
  RoundStartedEvent,
  RoundEndedEvent,
  GameOverEvent,
])
export type GameEvent = typeof GameEvent.Type
