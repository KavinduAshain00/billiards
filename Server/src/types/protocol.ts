/**
 * Shared types for network protocol between client and server
 */

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface BallSnapshot {
  id: number
  pos: Vec3
  vel: Vec3
  rvel: Vec3
  state: "Stationary" | "Rolling" | "Sliding" | "Falling" | "InPocket"
}

export interface OutcomeSnapshot {
  type: "collision" | "cushion" | "pot"
  ballId: number
  ballId2?: number
  speed: number
}

export interface TableSnapshot {
  timestamp: number
  serverTick: number
  balls: BallSnapshot[]
  isStationary: boolean
  outcomes: OutcomeSnapshot[]
}

export interface AimInput {
  angle: number
  power: number
  offset: Vec3
  pos: Vec3
}

// Client -> Server events
export interface ClientEvents {
  // Join a game room
  join: (data: { roomId: string; clientId: string; playerName: string }) => void
  
  // Request to hit the cue ball
  hit: (data: { aim: AimInput; sequence: number }) => void
  
  // Place cue ball (ball in hand)
  placeBall: (data: { pos: Vec3; sequence: number }) => void
  
  // Request current state (for reconnection)
  requestState: () => void
  
  // Chat message
  chat: (data: { message: string }) => void
}

// Server -> Client events
export interface ServerEvents {
  // Welcome with initial state
  welcome: (data: {
    roomId: string
    clientId: string
    initialState: TableSnapshot
    serverTime: number
  }) => void
  
  // Authoritative snapshot (20Hz during motion)
  snapshot: (data: TableSnapshot) => void
  
  // Shot was accepted and simulation started
  shotAccepted: (data: { sequence: number; serverTick: number }) => void
  
  // Shot was rejected
  shotRejected: (data: { sequence: number; reason: string }) => void
  
  // All balls stationary (end of shot)
  stationary: (data: { finalState: TableSnapshot }) => void
  
  // Player joined notification
  playerJoined: (data: { clientId: string; playerName: string }) => void
  
  // Player left notification
  playerLeft: (data: { clientId: string }) => void
  
  // Chat message from another player
  chat: (data: { clientId: string; playerName: string; message: string }) => void
  
  // Error
  error: (data: { message: string }) => void
}

// Room state on server
export interface RoomState {
  roomId: string
  players: Map<string, PlayerState>
  tableState: TableSnapshot
  isSimulating: boolean
  currentTurn: string | null
  serverTick: number
}

export interface PlayerState {
  clientId: string
  playerName: string
  socketId: string
  lastPing: number
}
