import { Schema } from "effect";
import { SpotifyTrack } from "./spotify";

// --- Questions ---
class QuestionBase extends Schema.Class<QuestionBase>("QuestionBase")({
  trackId: Schema.String,
  roundDurationMs: Schema.Number,
}) { }
export class TitleQuestion extends QuestionBase.extend<TitleQuestion>("TitleQuestion")({}) { }
export class ArtistQuestion extends QuestionBase.extend<ArtistQuestion>("ArtistQuestion")({}) { }
export class LyricsQuestion extends QuestionBase.extend<LyricsQuestion>("LyricsQuestion")({
  trackId: Schema.String,
  beforeLyrics: Schema.String,
  amountOfWords: Schema.Number,
  afterLyrics: Schema.NullOr(Schema.String)
}) { }

export const Question = Schema.Union([
  TitleQuestion,
  ArtistQuestion,
  LyricsQuestion,
])
export type Question = typeof Question.Type

// --- Answers ---
export class TitleAnswer extends Schema.TaggedClass<TitleAnswer>("TitleAnswer")("TitleAnswer", {
  track: SpotifyTrack
}) { }
export class ArtistAnswer extends Schema.TaggedClass<ArtistAnswer>("ArtistAnswer")("ArtistAnswer", {
  track: SpotifyTrack
}) { }
export class LyricsAnswer extends Schema.TaggedClass<LyricsAnswer>("LyricsAnswer")("LyricsAnswer", {
  track: SpotifyTrack,
  lyrics: Schema.String
}) { }

export const Answer = Schema.Union([
  TitleAnswer,
  ArtistAnswer,
  LyricsAnswer
])
export const Answers = Schema.Array(Answer)
export type Answer = typeof Answer.Type
export type Answers = typeof Answers.Type

export const QuestionWithAnswers = Schema.Struct({
  question: Question,
  possibleAnswers: Schema.Array(Answer),
  answer: Answer
})
export type QuestionWithAnswers = typeof QuestionWithAnswers.Type

export class Quiz extends Schema.TaggedClass<Quiz>("Quiz")(
  "Quiz",
  {
    id: Schema.String,
    owner: Schema.String,
    title: Schema.String,
    questionsWithAnswers: Schema.Array(QuestionWithAnswers)
  }) { }
