# Spotify Multiplayer Music Quiz

A real-time multiplayer music quiz game where players compete to identify songs, artists, and lyrics.

## Language

**Quiz**:
A curated sequence of playable songs with defined question types and timestamped playback snippets.
_Avoid_: Playlist, tracklist, game set

**Quiz Song**:
A single musical challenge containing Spotify track metadata, question type (Track Name, Artist, or Fill-in-the-gap), and playback offset timestamps.
_Avoid_: Audio question, quiz item

**Lobby**:
A waiting and coordination room created by a Host where players gather before a quiz starts.
_Avoid_: Game room, waiting room, session

**Host**:
An authenticated user (Spotify Premium) who creates quizzes, opens lobbies, and controls game playback.
_Avoid_: Admin, organizer, moderator

**Guest Player**:
An unauthenticated participant who joins a lobby with a unique nickname to compete.
_Avoid_: Participant, user, visitor

**Active Player**:
The single player whose turn it currently is to attempt an answer during the turn-based phase.
_Avoid_: Current guesser, turn holder

**Turn Loop**:
The sequential phase where each song is presented to players one at a time, allowing passes or steals.
_Avoid_: Round robin, question cycle

**Speed Round**:
The free-for-all rapid-fire phase triggered when remaining songs are fewer than the number of active players, preventing scoring unfairness.
_Avoid_: Sudden death, bonus round, lightning round
