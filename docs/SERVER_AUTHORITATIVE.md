# Server-Authoritative Multiplayer Architecture

This document describes the server-authoritative multiplayer implementation for the billiards game.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (60 FPS)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│   │   User Input    │───▶│  Local Physics  │───▶│   Ball Meshes   │        │
│   │   (Aim/Shoot)   │    │   (Prediction)  │    │   (Rendering)   │        │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│          │                       │                      ▲                   │
│          │                       │                      │                   │
│          ▼                       ▼                      │                   │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│   │  Socket.IO Relay│    │ Snapshot Buffer │───▶│  Interpolation  │        │
│   │  (Send/Receive) │    │ (100ms Buffer)  │    │  (Smooth 60fps) │        │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│          │                       ▲                                          │
└──────────┼───────────────────────┼──────────────────────────────────────────┘
           │                       │
           │    Socket.IO + msgpack (Binary Serialization)
           │                       │
           ▼                       │
┌──────────────────────────────────┼──────────────────────────────────────────┐
│                         SERVER (Authoritative)                              │
├──────────────────────────────────┼──────────────────────────────────────────┤
│          │                       │                                          │
│          ▼                       │                                          │
│   ┌─────────────────┐    ┌─────────────────┐                                │
│   │  Game Room      │───▶│ Snapshot Sender │────────────────────────────────┤
│   │  (Per Table)    │    │  (20 Hz)        │                                │
│   └─────────────────┘    └─────────────────┘                                │
│          │                                                                   │
│          ▼                                                                   │
│   ┌─────────────────┐                                                       │
│   │ EXACT Physics   │  ◀── Same constants, algorithms, timestep            │
│   │ Simulation      │       as client (deterministic)                      │
│   └─────────────────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Server-Authoritative Physics
- Server runs the **exact same physics code** as the client
- Same constants, algorithms, and timestep (0.001953125s = 512 steps/sec)
- All collision detection, cushion bounces, and pocket detection run on server
- Client physics is only used for local prediction

### 2. Snapshot Interpolation (100ms Buffer)
- Server broadcasts snapshots at **20 Hz** (every 50ms)
- Client buffers snapshots with a **100ms delay**
- Interpolation between snapshots provides smooth **60 FPS** rendering
- Buffer absorbs network jitter for consistent playback

### 3. Immediate Local Feedback
- When player shoots, local physics runs immediately
- Player sees instant response (no waiting for server)
- After ~100ms, smoothly transitions to server state
- If prediction diverges, correction is interpolated smoothly

### 4. Clock Synchronization
- RTT (Round-Trip Time) measured periodically
- Server timestamps synchronized with client clock
- Allows accurate interpolation timing

## Network Protocol

### Client → Server Events

| Event | Description |
|-------|-------------|
| `join` | Join a game room with roomId, clientId, playerName |
| `hit` | Submit a shot with aim parameters and sequence number |
| `placeBall` | Place cue ball (ball in hand) |
| `requestState` | Request current table state (reconnection) |
| `chat` | Send chat message |

### Server → Client Events

| Event | Description |
|-------|-------------|
| `welcome` | Initial state and server time for clock sync |
| `snapshot` | Ball positions/velocities at 20Hz during motion |
| `shotAccepted` | Server confirms shot, starts simulation |
| `shotRejected` | Server rejects shot (table not ready) |
| `stationary` | All balls stopped, final authoritative state |
| `playerJoined` | Another player joined the room |
| `playerLeft` | Player disconnected |
| `chat` | Chat message from another player |

## File Structure

### Server (`Server/src/`)

```
Server/src/
├── index.ts              # Main Socket.IO server
├── physics/
│   ├── constants.ts      # Physics constants (EXACT match)
│   ├── physics.ts        # Physics calculations (EXACT match)
│   ├── mathaven.ts       # Cushion model (EXACT match)
│   └── utils.ts          # Vector3 and math utilities
├── model/
│   ├── ball.ts           # Ball state and physics
│   ├── table.ts          # Table simulation
│   ├── collision.ts      # Ball-ball collision
│   ├── collisionthrow.ts # Collision throw calculation
│   ├── cushion.ts        # Cushion bounce physics
│   ├── pocket.ts         # Pocket detection
│   ├── knuckle.ts        # Knuckle physics
│   ├── tablegeometry.ts  # Table dimensions
│   └── pocketgeometry.ts # Pocket/knuckle positions
├── game/
│   ├── gameroom.ts       # Room state and simulation loop
│   └── roommanager.ts    # Room lifecycle management
└── types/
    └── protocol.ts       # Shared type definitions
```

### Client (`src/network/client/`)

```
src/network/client/
├── socketiorelay.ts      # Socket.IO connection and events
└── snapshotbuffer.ts     # 100ms buffer and interpolation

src/controller/
└── authoritativeplayback.ts  # Playback mode controller
```

## Usage

### Starting the Server

```bash
cd Server
npm install
npm run build
npm start
```

Server listens on port 3001 by default (configurable via `PORT` env).

### Connecting from Client

Add `?server=http://localhost:3001` to the game URL:

```
http://localhost:8080/?server=http://localhost:3001&tableId=room1&name=Player1
```

### URL Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `server` | Socket.IO server URL | `http://localhost:3001` |
| `tableId` | Room/table ID | `room1` |
| `name` | Player display name | `Alice` |
| `clientId` | Unique client identifier | `alice123` |
| `ruletype` | Game rules | `eightball`, `nineball`, `snooker` |

## Physics Determinism

To ensure identical physics on client and server:

1. **Same constants**: All physics constants copied exactly
2. **Same timestep**: 0.001953125 seconds per step
3. **Math.fround()**: Used for consistent floating-point
4. **Same algorithms**: Collision, cushion, pocket code duplicated
5. **Same geometry**: Table and pocket dimensions match

## Performance Considerations

- **Server CPU**: Physics runs at 512 steps/sec per room
- **Bandwidth**: ~20 snapshots/sec × ~1KB each ≈ 20KB/sec per client
- **Latency**: 100ms buffer + network RTT for total latency
- **Memory**: Each room holds ~60 snapshots in buffer (3 seconds)

## Debugging

Enable debug output with:

```javascript
const stats = browserContainer.getNetworkStats()
console.log(stats)
// {
//   mode: "AuthoritativePlayback",
//   bufferStats: { snapshotsReceived: 100, bufferSize: 5, ... },
//   rtt: 45,
//   hasPendingShot: false
// }
```
