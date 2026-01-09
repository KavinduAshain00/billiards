# REST API Documentation

This document describes the REST API endpoints available in the Billiards Socket.IO server.

## Base URL

Development: `http://localhost:3000`
Production: Configure via `PORT` environment variable

## Authentication

Currently, no authentication is required for these endpoints. Player validation is done via UUID matching.

## Endpoints

### 1. Create Room

Create a new game room/session for two players.

**Endpoint:** `POST /api/createRoom`

**Request Body:**
```json
{
  "room": {
    "gameSessionUuid": "unique-session-id",
    "name": "Game Room Name",
    "ruletype": "eightball"
  },
  "players": [
    {
      "uuid": "player-1-uuid",
      "name": "Player 1"
    },
    {
      "uuid": "player-2-uuid",
      "name": "Player 2"
    }
  ]
}
```

**Parameters:**
- `room.gameSessionUuid` (required): Unique identifier for the game session
- `room.name` (required): Display name for the room
- `room.ruletype` (optional): Game type - one of: `nineball`, `eightball`, `snooker`, `threecushion`, `fourteenone` (default: `eightball`)
- `players` (required): Array of exactly 2 player objects
- `players[].uuid` (required): Unique identifier for the player
- `players[].name` (required): Display name for the player

**Success Response (200):**
```json
{
  "status": true,
  "message": "success",
  "payload": {
    "gameSessionUuid": "unique-session-id",
    "name": "Game Room Name",
    "gameType": "EIGHTBALL",
    "createDate": "2026-01-09T13:30:00.000Z",
    "link1": "http://localhost:8080/dist/?gameSessionUuid=unique-session-id&uuid=player-1-uuid&ruletype=eightball&websocketserver=true",
    "link2": "http://localhost:8080/dist/?gameSessionUuid=unique-session-id&uuid=player-2-uuid&ruletype=eightball&websocketserver=true"
  }
}
```

**Error Responses:**

400 - Missing required data:
```json
{
  "status": false,
  "errorCode": "MISSING_GAME_SESSION_UUID",
  "message": "Missing required room data"
}
```

400 - Invalid player count:
```json
{
  "status": false,
  "errorCode": "INVALID_GAME_SESSION",
  "message": "Exactly 2 players required"
}
```

400 - Session already exists:
```json
{
  "status": false,
  "errorCode": "GAME_SESSION_EXISTS",
  "message": "Game session already exists"
}
```

500 - Server error:
```json
{
  "status": false,
  "errorCode": "SERVER_ERROR",
  "message": "Internal Server Error"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/createRoom \
  -H "Content-Type: application/json" \
  -d '{
    "room": {
      "gameSessionUuid": "game-123",
      "name": "Friday Night Pool",
      "ruletype": "eightball"
    },
    "players": [
      { "uuid": "alice-uuid", "name": "Alice" },
      { "uuid": "bob-uuid", "name": "Bob" }
    ]
  }'
```

---

### 2. Get Game Details

Retrieve full details of a game session.

**Endpoint:** `GET /api/getGameDetails`

**Query Parameters:**
- `gameSessionUuid` (required): The game session UUID to retrieve

**Success Response (200):**
```json
{
  "status": true,
  "gameDetails": {
    "_id": "mongodb-object-id",
    "gameSessionUuid": "unique-session-id",
    "name": "Game Room Name",
    "gameType": "EIGHTBALL",
    "gameStatus": "ACTIVE",
    "players": [
      {
        "uuid": "player-1-uuid",
        "name": "Player 1",
        "winState": "DEFEATED",
        "_id": "mongodb-player-id"
      },
      {
        "uuid": "player-2-uuid",
        "name": "Player 2",
        "winState": "DEFEATED",
        "_id": "mongodb-player-id"
      }
    ],
    "createdDate": "2026-01-09T13:30:00.000Z",
    "winnerSent": false,
    "createdAt": "2026-01-09T13:30:00.000Z",
    "updatedAt": "2026-01-09T13:30:00.000Z",
    "__v": 0
  },
  "message": "Game details retrieved successfully"
}
```

**Field Descriptions:**
- `gameStatus`: One of `ACTIVE`, `FINISHED`, `DRAW`, `DROPPED`, `CRASHED`
- `gameType`: One of `NINEBALL`, `EIGHTBALL`, `SNOOKER`, `THREECUSHION`, `FOURTEENONE`
- `winState`: One of `WON`, `DEFEATED`, `DRAW`, `DROPPED`, `CRASHED`
- `winnerSent`: Boolean indicating if game result has been processed

**Error Responses:**

400 - Missing UUID:
```json
{
  "status": false,
  "errorCode": "MISSING_GAME_SESSION_UUID",
  "message": "Missing gameSessionUuid"
}
```

404 - Room not found:
```json
{
  "status": false,
  "errorCode": "ROOM_NOT_FOUND",
  "message": "Room not found"
}
```

500 - Server error:
```json
{
  "status": false,
  "message": "Internal Server Error",
  "errorCode": "SERVER_ERROR"
}
```

**Example:**
```bash
curl "http://localhost:3000/api/getGameDetails?gameSessionUuid=game-123"
```

---

### 3. User Back (Leave Game)

Called when a player deliberately leaves/exits the game. This will mark the leaving player as DROPPED and the remaining player as WON.

**Endpoint:** `POST /api/userBack`

**Request Body:**
```json
{
  "gameSessionUuid": "unique-session-id",
  "uuid": "player-uuid"
}
```

**Parameters:**
- `gameSessionUuid` (required): The game session UUID
- `uuid` (required): UUID of the player leaving the game

**Success Response (200):**
```json
{
  "status": true,
  "message": "Game ended successfully"
}
```

**Behavior:**
1. Validates that the UUID belongs to a player in this game
2. Marks the leaving player's `winState` as `DROPPED`
3. Marks the other player's `winState` as `WON`
4. Sets `gameStatus` to `DROPPED` and `winnerSent` to `true`
5. Emits `gameOver` event to all connected clients
6. Cleans up the in-memory game session

**Error Responses:**

400 - Missing parameters:
```json
{
  "status": false,
  "errorCode": "MISSING_GAME_SESSION_UUID",
  "message": "Missing gameSessionUuid or uuid"
}
```

403 - Unauthorized player:
```json
{
  "status": false,
  "errorCode": "UNAUTHORIZED",
  "message": "Unauthorized: UUID not a player in this game session"
}
```

404 - Room not found:
```json
{
  "status": false,
  "errorCode": "ROOM_NOT_FOUND",
  "message": "Room not found"
}
```

200 - Game already ended:
```json
{
  "status": true,
  "message": "Game already ended"
}
```

500 - Server error:
```json
{
  "status": false,
  "message": "Internal Server Error",
  "errorCode": "SERVER_ERROR"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/userBack \
  -H "Content-Type: application/json" \
  -d '{
    "gameSessionUuid": "game-123",
    "uuid": "alice-uuid"
  }'
```

---

### 4. Health Check

Check server health and get basic statistics.

**Endpoint:** `GET /health`

**Success Response (200):**
```json
{
  "status": "ok",
  "rooms": 3,
  "timestamp": "2026-01-09T13:30:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:3000/health
```

---

### 5. Get Rooms

Get list of all active game rooms.

**Endpoint:** `GET /rooms`

**Success Response (200):**
```json
{
  "rooms": [
    {
      "tableId": "game-session-uuid-1",
      "playerCount": 2,
      "spectatorCount": 1,
      "createdAt": 1704844800000
    },
    {
      "tableId": "game-session-uuid-2",
      "playerCount": 1,
      "spectatorCount": 0,
      "createdAt": 1704844900000
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/rooms
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `SUCCESS` | Operation successful |
| `INVALID_GAME_SESSION` | Invalid game session |
| `GAME_SESSION_EXISTS` | Game session already exists |
| `ROOM_NOT_FOUND` | Room not found |
| `MISSING_GAME_SESSION_UUID` | Missing game session UUID |
| `UNAUTHORIZED` | Unauthorized access |
| `INVALID_MOVE` | Invalid move |
| `GAME_ALREADY_FINISHED` | Game already finished |
| `SERVER_ERROR` | Internal server error |
| `DATABASE_ERROR` | Database error |

## Socket.IO Events

In addition to REST endpoints, the server also handles Socket.IO events:

- `join-table` - Join a game table
- `game-event` - Broadcast game events
- `player-joined` - Notification when player joins
- `player-left` - Notification when player leaves
- `gameOver` - Game ended notification

See [Server/README.md](./README.md) for Socket.IO documentation.

## Testing

### Using curl

Create a room:
```bash
curl -X POST http://localhost:3000/api/createRoom \
  -H "Content-Type: application/json" \
  -d '{"room":{"gameSessionUuid":"test-123","name":"Test Room","ruletype":"eightball"},"players":[{"uuid":"alice","name":"Alice"},{"uuid":"bob","name":"Bob"}]}'
```

Get game details:
```bash
curl "http://localhost:3000/api/getGameDetails?gameSessionUuid=test-123"
```

Player leaves:
```bash
curl -X POST http://localhost:3000/api/userBack \
  -H "Content-Type: application/json" \
  -d '{"gameSessionUuid":"test-123","uuid":"alice"}'
```

### Using Postman

Import the requests or use the provided examples above.

## Database Schema

The Room schema stores:
- Game session UUID (unique)
- Room name
- Game type (NINEBALL, EIGHTBALL, etc.)
- Game status (ACTIVE, FINISHED, etc.)
- Players array with UUID, name, and win state
- Timestamps

See [schemas/roomSchema.js](./schemas/roomSchema.js) for full schema definition.

## Environment Variables

Required environment variables:

```bash
PORT=3000
MONGODB_URI=mongodb://localhost:27017/billiards
FRONTEND_URL=http://localhost:8080
```

See [.env.example](./.env.example) for all available options.
