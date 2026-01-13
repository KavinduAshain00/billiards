# Lag Reduction Tips for Billiards Multiplayer

## Overview

This document provides tips for reducing lag and improving the multiplayer experience, especially on lower-speed connections.

## Implemented Optimizations

### 1. Entity Interpolation (Client-Side)
- **What it does**: Smoothly interpolates ball positions between server snapshots
- **Benefits**: Removes visual jitter even with 50ms+ network latency
- **How it works**: Uses smoothstep lerp with adaptive factor based on ball velocity
- **Location**: `src/controller/authoritativeplayback.ts` and `src/network/client/snapshotbuffer.ts`

### 2. Delta Compression (Server-Side)
- **What it does**: Only sends balls that have moved since the last snapshot
- **Benefits**: Reduces bandwidth by 50-80% when balls are stationary
- **How it works**: Compares current positions to previous snapshot, filters unchanged balls
- **Location**: `Server/src/model/table.ts` - `deltaSnapshot()` method

### 3. Adaptive Snapshot Rate
- **What it does**: Reduces snapshot frequency when balls are moving slowly
- **Benefits**: Saves bandwidth without sacrificing visual quality
- **How it works**: 
  - 20Hz (50ms) when balls moving fast (velocity > 0.5)
  - 10Hz (100ms) when balls moving slowly
- **Location**: `Server/src/game/gameroom.ts`

### 4. Client-Side Prediction for Inputs
- **What it does**: Local player sees immediate response to aim/ball placement
- **Benefits**: Zero-latency feel for your own actions
- **How it works**: Changes are applied locally first, then synced with server
- **Location**: `src/controller/aim.ts`, `src/controller/placeball.ts`

### 5. Aim/Ball Sync Events
- **What it does**: Broadcasts aiming and ball placement to opponent in real-time
- **Benefits**: Opponent sees what you're doing without waiting for snapshots
- **Events**: `aimUpdate`, `ballPosUpdate`
- **Location**: `src/network/client/socketiorelay.ts`

## Tips for Low-Bandwidth Connections

### Player Settings
1. **Use wired connection** instead of WiFi when possible
2. **Close other bandwidth-consuming apps** (streaming, downloads)
3. **Position closer to router** if using WiFi

### Technical Tuning (Advanced)

#### Increase Buffer Time
In `src/network/client/snapshotbuffer.ts`:
```typescript
private readonly BUFFER_TIME_MS = 100 // Increase from 50ms for more jitter absorption
```
- **Trade-off**: More stable but slightly higher visual latency

#### Reduce Snapshot Rate
In `Server/src/game/gameroom.ts`:
```typescript
private readonly BASE_SNAPSHOT_INTERVAL_MS = 100   // Reduce from 50ms
private readonly SLOW_SNAPSHOT_INTERVAL_MS = 200   // Reduce from 100ms
```
- **Trade-off**: Lower bandwidth but less smooth ball movement

#### Enable More Aggressive Delta Compression
In `Server/src/model/table.ts`:
```typescript
const POSITION_THRESHOLD = 0.005 // Increase from 0.001
const VELOCITY_THRESHOLD = 0.05  // Increase from 0.01
```
- **Trade-off**: Smaller packets but might miss subtle movements

## Connection Quality Indicators

The client tracks connection health via `SnapshotBuffer.getStats()`:
- `bufferHealth`: 0-1, where 1 = healthy buffer
- `rttJitter`: Higher values = unstable connection
- `renderDelay`: Current interpolation delay in ms

## Troubleshooting

### Balls appear to teleport
- Cause: Packets arriving out of order or buffer emptying
- Fix: Increase `BUFFER_TIME_MS` in snapshot buffer

### Input feels delayed
- Cause: Server round-trip time is high
- Fix: Ensure client-side prediction is working (aim/place ball should feel instant)

### Balls "rubberbanding"
- Cause: Large discrepancy between local prediction and server state
- Fix: This is expected for first 1ms of shot, then server becomes authoritative

### Game disconnects frequently
- Cause: Socket timeout or unstable connection
- Fix: Check `reconnectionDelay` and `reconnectionDelayMax` in socket config

## Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (60 FPS)                          │
│  ┌──────────────┐    ┌────────────────┐    ┌─────────────┐ │
│  │ Input Handler│───▶│ Local Predict  │───▶│ Render Loop │ │
│  └──────────────┘    └────────────────┘    └─────────────┘ │
│         │                   ▲                     ▲        │
│         ▼                   │                     │        │
│  ┌──────────────┐    ┌────────────────┐    ┌─────────────┐ │
│  │ Send to      │    │ Snapshot       │    │ Interpolate │ │
│  │ Server       │    │ Buffer         │◀───│ State       │ │
│  └──────────────┘    └────────────────┘    └─────────────┘ │
└─────────│───────────────────▲───────────────────────────────┘
          │                   │
          ▼                   │ (20Hz delta snapshots)
┌─────────────────────────────────────────────────────────────┐
│                    SERVER                                    │
│  ┌──────────────┐    ┌────────────────┐    ┌─────────────┐ │
│  │ Receive Hit  │───▶│ Physics Sim    │───▶│ Broadcast   │ │
│  │              │    │ (512 steps/s)  │    │ Snapshots   │ │
│  └──────────────┘    └────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Performance Metrics

Typical payload sizes:
- Full snapshot: ~1.5KB (16 balls × ~100 bytes)
- Delta snapshot: ~100-500 bytes (only moving balls)
- Aim update: ~50 bytes
- Ball position update: ~30 bytes

Typical latencies:
- Local prediction: 0ms (instant)
- Aim sync: RTT/2 (one-way)
- Ball movement: 50-100ms buffer + RTT/2
