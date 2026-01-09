# Socket.IO Multiplayer Setup

This document explains how to set up and run the 2-player Socket.IO server for the billiards game.

## Overview

The billiards game server uses **Socket.IO** for real-time multiplayer networking with additional **REST API endpoints** for game session management. This provides:

- Real-time bidirectional communication
- Automatic reconnection
- Room-based game sessions
- Support for 2 players per table
- Spectator mode
- Built-in message compression (msgpack)
- MongoDB persistence for game sessions
- REST API for external integrations

## Architecture

### Server Components

- **Server.js**: Node.js Socket.IO server that manages game rooms and broadcasts events
- **REST API**: Endpoints for creating rooms, retrieving game details, and handling player exits
- **Room Management**: Each table has a unique room that can hold 2 players + spectators
- **Event Broadcasting**: Game events are relayed between connected players
- **MongoDB**: Persists game sessions, player data, and game outcomes

### Client Components

- **SocketIOMessageRelay**: Client-side Socket.IO implementation
- **MessageRelay Interface**: Abstract interface for network communication
- **BrowserContainer**: Updated to use SocketIOMessageRelay

## Installation

### 1. Install Server Dependencies

```bash
cd Server
npm install
```

This will install:
- express
- socket.io
- socket.io-msgpack-parser
- mongoose (MongoDB ODM)
- pino (logging)
- cors
- dotenv

### 2. Set Up MongoDB

You need a MongoDB instance running. Options:

**Local MongoDB:**
```bash
# Install MongoDB (macOS)
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

**MongoDB Atlas (Cloud):**
1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get your connection string
4. Update `.env` file with the connection string

### 3. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```bash
PORT=3000
MONGODB_URI=mongodb://localhost:27017/billiards
FRONTEND_URL=http://localhost:8080
```

### 4. Install Client Dependencies

```bash
cd ..
npm install
```

This will install socket.io-client.

## Running the Server

### Development Mode

```bash
cd Server
node Server.js
```

The server will start on port 3000 by default.

### Production Mode (Custom Port)

```bash
PORT=8080 node Server.js
```

### Using nodemon (Auto-restart on changes)

```bash
cd Server
npx nodemon Server.js
```

## Running the Game

### 1. Start the Server

```bash
cd Server
node Server.js
```

You should see:
```
Billiards server running on port 3000
```

### 2. Start the Client Dev Server

In a separate terminal:

```bash
npm run serve
```

### 3. Open Two Browser Windows

**Player 1 (First Player):**
```
http://localhost:8080/multi.html?websocketserver=http://localhost:3000&name=Player1&tableId=table1&first=true
```

**Player 2 (Second Player):**
```
http://localhost:8080/multi.html?websocketserver=http://localhost:3000&name=Player2&tableId=table1
```

**Spectator:**
```
http://localhost:8080/multi.html?websocketserver=http://localhost:3000&name=Spectator&tableId=table1&spectator=true
```

## URL Parameters

- `websocketserver`: Socket.IO server URL (default: http://localhost:3000)
- `name`: Player's display name
- `tableId`: Unique table/room identifier
- `clientId`: Unique client identifier (auto-generated if not provided)
- `first`: Set to "true" for the first player who will break
- `spectator`: Set to "true" to join as a spectator
- `ruletype`: Game rules (eightball, nineball, snooker, etc.)

## Server API Endpoints

### Health Check

```bash
GET http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "rooms": 2,
  "timestamp": "2026-01-09T..."
}
```

### List Rooms

```bash
GET http://localhost:3000/rooms
```

Response:
```json
{
  "rooms": [
    {
      "tableId": "table1",
      "playerCount": 2,
      "spectatorCount": 1,
      "createdAt": 1704844800000
    }
  ]
}
```

## Server API Endpoints

The server provides REST API endpoints for external game management:

### POST /api/createRoom
Create a new game session with 2 players.

### GET /api/getGameDetails
Retrieve full details of a game session.

### POST /api/userBack
Handle player deliberately leaving the game.

### GET /health
Server health check.

### GET /rooms
List all active game rooms.

**📖 Full API documentation:** See [API.md](./API.md) for detailed endpoint documentation, request/response examples, and error codes.

## Socket.IO Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `join-table` | `{tableId, clientId, username, spectator}` | Join a game table |
| `game-event` | `{tableId, event}` | Broadcast game event to other players |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `joined` | `{success, tableId, clientId, ...}` | Confirmation of joining |
| `game-event` | `event` | Game event from another player |
| `player-joined` | `{clientId, username, playerCount}` | Another player joined |
| `player-left` | `{clientId, username, playerCount}` | Another player left |

## Game Flow

1. **Connection**: Client connects to Socket.IO server
2. **Join Table**: Client emits `join-table` event with table ID
3. **Room Assignment**: Server adds client to room (max 2 players)
4. **Game Start**: First player breaks, events are broadcast
5. **Turn-based Play**: Players take turns, events synchronized
6. **Disconnection**: Server handles cleanup and notifies other players

## Features

### Room Management

- Each table supports exactly 2 active players
- Unlimited spectators per table
- Automatic room cleanup when empty
- Room status tracking

### Connection Handling

- Automatic reconnection with exponential backoff
- Graceful disconnect handling
- Player notification on join/leave

### Message Compression

- Uses MessagePack for efficient serialization
- Reduces bandwidth usage
- Faster message parsing

### Logging

- Structured logging with Pino
- Pretty-printed console output in development
- Configurable log levels

## Troubleshooting

### "Room is full" Error

Only 2 players can join a table. Join as a spectator or use a different tableId.

### Connection Failed

- Ensure the server is running
- Check the `websocketserver` URL parameter
- Verify firewall/network settings
- Check browser console for errors

### Events Not Syncing

- Check that both clients have different `clientId` values
- Verify both clients joined the same `tableId`
- Check server logs for error messages

### Server Logs

Enable debug logging:
```bash
DEBUG=socket.io* node Server.js
```

## Development

### Testing Locally

Use different browser profiles or incognito windows to simulate multiple players.

### Production Deployment

1. Set environment variables:
   ```bash
   PORT=3000
   NODE_ENV=production
   ```

2. Use a process manager (PM2, systemd):
   ```bash
   npm install -g pm2
   pm2 start Server/Server.js --name billiards-server
   ```

3. Configure reverse proxy (nginx, Apache)

4. Enable HTTPS for secure WebSocket connections

## Migration from Nchan

The Socket.IO implementation replaces the previous nchan-based networking:

### Key Differences

| Feature | Nchan | Socket.IO |
|---------|-------|-----------|
| Protocol | WebSocket + HTTP polling | WebSocket + polling |
| Server | Nginx module | Node.js server |
| Rooms | Channel-based | Built-in rooms |
| Reconnection | Manual | Automatic |
| Message Format | JSON | MessagePack |

### Breaking Changes

- Server URL format changed from `wss://host/subscribe/table/` to `http://host`
- No separate publish/subscribe endpoints
- Connection requires explicit `connect()` call with credentials

## License

GPL-3.0
