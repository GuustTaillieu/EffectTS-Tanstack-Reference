# Effect 4.0 + TanStack Start Curriculum: Music Quiz Mastery

An end-to-end curriculum for learning Effect 4.0 from foundations to full-stack integration in TanStack Start, directly applied to building the real-time multiplayer **Spotify Music Quiz**.

---

## Phase 1: Effect 4.0 Core Primitives (Labs)

Every module in Phase 1 introduces core Effect concepts with interactive exercises based directly on the Music Quiz domain.

### Module 1: The Effect Mental Model & Generators
- **Concept**: What is an `Effect<Success, Error, Requirement>`? Lazy description of computation vs execution.
- **Tools**: `Effect.succeed`, `Effect.fail`, `Effect.sync`, `Effect.tryPromise`, `Effect.gen` with `yield*`, `Effect.runPromise`.
- **Domain Challenge**: Build a safe Spotify track preview fetcher that constructs song metadata, extracts offset timestamps, and runs safely without uncaught promises.

### Module 2: The Two Failure Channels (Errors vs Defects)
- **Concept**: Expected domain failures (short-circuiting typed errors) vs unexpected defects (crashes, panics).
- **Tools**: Tagged errors with `Schema.TaggedError`, `Effect.catchTag`, `Effect.catchTags`, `Effect.catchAll`, `Effect.die`.
- **Domain Challenge**: Model domain failures when joining a lobby: `LobbyNotFoundError`, `LobbyFullError`, and `UsernameTakenError`.

### Module 3: Dependency Injection via Context & Layers
- **Concept**: Managing dependencies without class decorators or ad-hoc singletons.
- **Tools**: `Context.Tag`, `Layer.succeed`, `Layer.effect`, `Layer.merge`, `Effect.provide`.
- **Domain Challenge**: Decouple the `SpotifyService` and `QuizRepository`. Create a mock test layer for local runs and a live production layer.

### Module 4: Type-Safe Schemas & Data Modeling
- **Concept**: Schema validation, transformations, and runtime encoding/decoding.
- **Tools**: `Schema.Class`, `Schema.Struct`, `Schema.Union`, `Schema.decodeUnknown`, `Schema.encode`.
- **Domain Challenge**: Define robust schemas for `Quiz`, `QuizSong`, `QuestionType` (`TRACK_NAME`, `ARTIST_NAME`, `FILL_IN_THE_GAP`), and `LobbyState`.

### Module 5: Concurrency, Fibers, & Timeouts
- **Concept**: Structured concurrency, lightweight fibers, interruption, and racing.
- **Tools**: `Effect.fork`, `Effect.race`, `Effect.timeout`, `Fiber.interrupt`, `Ref` for atomic state.
- **Domain Challenge**: Build the turn-timer engine: race a player's guess against a 15-second countdown with automatic turn passing.

---

## Phase 2: Full-Stack TanStack Start + Effect

Transition from isolated lab drills to full-stack architecture.

### Module 6: Server Functions with Effect Runtimes
- **Concept**: Bridges between TanStack Start's `createServerFn` and Effect runtimes.
- **Pattern**: Creating a shared managed server runtime (`ManagedRuntime`) to execute Effect workflows inside TanStack Start loaders and actions with zero bundle leak to the client.

### Module 7: Real-Time Synchronization via SSE & Effect Stream
- **Concept**: Pushing synchronized game state to all players.
- **Pattern**: Using Effect `Stream` and `Hub` to push SSE game state updates (lobby joins, active turns, speed rounds) paired with server actions for player guesses.

### Module 8: Unified Contract API & React Native SDK
- **Concept**: Eliminating NestJS by serving both Web and Mobile from TanStack Start.
- **Pattern**: Exposing Effect RPC/HttpApi routes from TanStack Start server endpoints and consuming the exact same typed client SDK in React Native.
