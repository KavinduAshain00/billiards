import { io, Socket } from "socket.io-client"
import { AimEvent } from "../../events/aimevent"
// Use the same msgpack parser as the server for compact binary frames
// Attempt runtime require to avoid hard failures in test environments
// @ts-ignore - runtime require to avoid type complaints if not installed in test environments
let msgpack: any
try {
  msgpack = require("socket.io-msgpack-parser")
} catch (e) {
  console.warn('[SocketClient] msgpack parser not available, falling back to default JSON parser')
  msgpack = undefined
}

/**
 * Socket.IO event types for type safety
 */
export interface ServerToClientEvents {
  joined: (data: JoinedData) => void
  "player-joined": (data: PlayerJoinedData) => void
  "player-left": (data: PlayerLeftData) => void
  "game-ready": (data: GameReadyData) => void
  "game-start": (data: GameStartData) => void
  "game-state": (data: GameStateData) => void
  "cue-update": (data: CueUpdateData) => void
  "shot-validated": (data: ShotValidatedData) => void
  "shot-rejected": (data: ShotRejectedData) => void
  "turn-change": (data: TurnChangeData) => void
  "turn-continues": (data: TurnContinuesData) => void
  "ball-positions": (data: BallPositionsData) => void
  gameOver: (data: GameOverData) => void
  error: (data: ErrorData) => void
}

export interface ClientToServerEvents {
  "join-table": (data: JoinTableData) => void
  "cue-aim": (data: CueAimData) => void
  "shot-request": (data: ShotRequestData) => void
  "shot-complete": (data: ShotCompleteData) => void
  "place-ball": (data: PlaceBallData) => void
  "ready": (data: ReadyData) => void
}

// Data interfaces
export interface JoinTableData {
  tableId: string
  clientId: string
  username: string
  spectator: boolean
}

export interface JoinedData {
  success: boolean
  error?: string
  tableId: string
  clientId: string
  username: string
  spectator: boolean
  playerCount: number
  playerNumber?: number
  isFirstPlayer?: boolean
  role: "player" | "spectator"
  opponentName?: string
  opponentConnected?: boolean
  waitingForOpponent?: boolean
  gameStarted?: boolean
}

export interface PlayerJoinedData {
  clientId: string
  username: string
  spectator: boolean
  playerCount: number
  playerNumber?: number
}

export interface PlayerLeftData {
  clientId: string
  username: string
  playerNumber?: number
  playerCount: number
}

export interface GameReadyData {
  players: Array<{
    playerNumber: number
    name: string
    uuid: string
  }>
  message: string
  firstPlayer: number
}

export interface GameStartData {
  firstPlayer: number
  tableState: any
  timestamp: number
}

export interface GameStateData {
  balls: any[]
  cueball: any
  timestamp: number
  sequence: number
}

export interface CueUpdateData {
  playerId: string
  playerNumber: number
  angle: number
  power: number
  offset: { x: number; y: number; z: number }
  pos: { x: number; y: number; z: number }
  timestamp: number
}

export interface GroupUpdateData {
  groups: { [playerNumber: number]: string | null }
}

export interface ScoreUpdateData {
  scores: { [playerNumber: number]: number }
}

export interface CueAimData {
  tableId: string
  angle: number
  power: number
  offset: { x: number; y: number; z: number }
  pos: { x: number; y: number; z: number }
}

export interface ShotRequestData {
  tableId: string
  tableState: any
  power: number
  angle: number
  offset: { x: number; y: number; z: number }
  timestamp: number
}

export interface ShotValidatedData {
  accepted: boolean
  tableState: any
  playerId: string
  playerNumber: number
  sequence: number
  timestamp: number
}

export interface ShotRejectedData {
  reason: string
  correctState: any
}

export interface PlaceBallData {
  tableId: string
  position: { x: number; y: number; z: number }
}

export interface ReadyData {
  tableId: string
}

export interface TurnChangeData {
  currentPlayer: number
  playerId: string
  reason: string
}

export interface TurnContinuesData {
  currentPlayer: number
  playerId: string
  reason: string
}

export interface ShotCompleteData {
  tableId: string
  potted: boolean
  fouled: boolean
  continuesTurn: boolean
}

export interface BallPositionsData {
  balls: Array<{
    id: number
    pos: { x: number; y: number; z: number }
    vel: { x: number; y: number; z: number }
    state: string
  }>
  timestamp: number
}

export interface GameOverData {
  winner: number
  reason: string
}

export interface ErrorData {
  code: string
  message: string
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "error"

/**
 * Socket.IO client for billiards game with typed events and client prediction
 */
export class SocketEventClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
  private serverURL: string
  private connectionState: ConnectionState = "disconnected"
  private tableId: string = ""
  private clientId: string = ""
  private playerNumber: number = 0
  private isMyTurn: boolean = false
  // Used for client prediction rollback (stored for future use)
  private _pendingShot: ShotRequestData | null = null
  private _gameSequence: number = 0

  // Callbacks
  private onPlayerJoined: ((data: PlayerJoinedData) => void) | null = null
  private onPlayerLeft: ((data: PlayerLeftData) => void) | null = null
  private onGameReady: ((data: GameReadyData) => void) | null = null
  private onGameStart: ((data: GameStartData) => void) | null = null
  private onCueUpdate: ((data: CueUpdateData) => void) | null = null
  private onShotValidated: ((data: ShotValidatedData) => void) | null = null
  private onShotRejected: ((data: ShotRejectedData) => void) | null = null
  private onTurnChange: ((data: TurnChangeData) => void) | null = null
  private onTurnContinues: ((data: TurnContinuesData) => void) | null = null
  private onGroupUpdate: ((data: GroupUpdateData) => void) | null = null
  private onScoreUpdate: ((data: ScoreUpdateData) => void) | null = null
  private onBallPositions: ((data: BallPositionsData) => void) | null = null
  private onGameOver: ((data: GameOverData) => void) | null = null
  private onError: ((data: ErrorData) => void) | null = null
  private onConnectionStateChange: ((state: ConnectionState) => void) | null = null
  private onJoined: ((data: JoinedData) => void) | null = null

  constructor(serverURL: string = "http://localhost:3000") {
    this.serverURL = serverURL
  }

  /**
   * Connect to the game server and join a table
   */
  connect(
    tableId: string,
    clientId: string,
    username: string,
    spectator: boolean = false
  ): Promise<JoinedData> {
    return new Promise((resolve, reject) => {
      console.log('[SocketClient] Connect called:', { tableId, clientId, username, spectator, serverURL: this.serverURL })
      
      // Prevent connection stacking - disconnect existing socket first
      if (this.socket) {
        console.log('[SocketClient] Existing socket found, cleaning up...', {
          id: this.socket.id,
          connected: this.socket.connected,
          disconnected: this.socket.disconnected
        })
        this.socket.removeAllListeners()
        this.socket.disconnect()
        this.socket = null
      }

      this.setConnectionState("connecting")
      this.tableId = tableId
      this.clientId = clientId

      console.log('[SocketClient] Creating new socket connection to:', this.serverURL)
      
      this.socket = io(this.serverURL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        autoConnect: true,
        // Use the binary msgpack parser to match the server for smaller/more efficient frames
        parser: msgpack,
      }) as Socket<ServerToClientEvents, ClientToServerEvents>

      this.socket.on("connect", () => {
        console.log('[SocketClient] ✅ Connected to server!', {
          socketId: this.socket?.id,
          transport: this.socket?.io?.engine?.transport?.name
        })
        this.setConnectionState("connected")

        // Join the table
        console.log('[SocketClient] Emitting join-table event...', { tableId, clientId, username, spectator })
        this.socket?.emit("join-table", {
          tableId,
          clientId,
          username,
          spectator,
        })
      })

      this.socket.on("joined", (data) => {
        console.log('[SocketClient] Received joined response:', data)
        if (data.success) {
          console.log('[SocketClient] ✅ Successfully joined table:', data.tableId, 'as player', data.playerNumber)
          this.playerNumber = data.playerNumber || 0
          this.onJoined?.(data)
          resolve(data)
        } else {
          console.error('[SocketClient] ❌ Failed to join table:', data.error)
          reject(new Error(data.error || "Failed to join table"))
        }
      })

      // Set up event listeners
      this.setupEventListeners()

      this.socket.on("connect_error", (error) => {
        console.error('[SocketClient] ❌ Connection error:', error.message)
        this.setConnectionState("error")
        reject(error)
      })

      this.socket.on("disconnect", (reason) => {
        console.log('[SocketClient] 🔌 Disconnected from server:', reason)
        this.setConnectionState("disconnected")
      })

      // Reconnection events are on the io manager, not the socket
      this.socket.io.on("reconnect_attempt", (attemptNumber) => {
        console.log('[SocketClient] 🔄 Reconnection attempt:', attemptNumber)
      })

      this.socket.io.on("reconnect", (attemptNumber) => {
        console.log('[SocketClient] ✅ Reconnected after', attemptNumber, 'attempts')
      })

      this.socket.io.on("reconnect_failed", () => {
        console.error('[SocketClient] ❌ Reconnection failed after all attempts')
      })
    })
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on("player-joined", (data) => {
      console.log("Player joined:", data)
      this.onPlayerJoined?.(data)
    })

    this.socket.on("player-left", (data) => {
      console.log("Player left:", data)
      this.onPlayerLeft?.(data)
    })

    this.socket.on("game-ready", (data) => {
      console.log("🎮 Game ready!", data)
      this.onGameReady?.(data)
    })

    this.socket.on("game-start", (data) => {
      console.log("🎮 Game starting!", data)
      this.isMyTurn = data.firstPlayer === this.playerNumber
      this.onGameStart?.(data)
    })

    this.socket.on("cue-update", (data) => {
      // Only process if it's from opponent
      if (data.playerId !== this.clientId) {
        this.onCueUpdate?.(data)
      }
    })

    this.socket.on("shot-validated", (data) => {
      console.log("Shot validated:", data)
      this._gameSequence = data.sequence
      this._pendingShot = null
      this.onShotValidated?.(data)
    })

    this.socket.on("shot-rejected", (data) => {
      console.log("Shot rejected:", data)
      // Rollback to correct state
      this._pendingShot = null
      this.onShotRejected?.(data)
    })

    this.socket.on("turn-change", (data) => {
      console.log("Turn change:", data)
      this.isMyTurn = data.playerId === this.clientId
      this.onTurnChange?.(data)
    })

    this.socket.on("turn-continues", (data) => {
      console.log("Turn continues:", data)
      this.isMyTurn = data.playerId === this.clientId
      this.onTurnContinues?.(data)
    })

    this.socket.on("group-update", (data) => {
      console.log("Group update:", data)
      this.onGroupUpdate?.(data)
    })

    this.socket.on("score-update", (data) => {
      console.log("Score update:", data)
      this.onScoreUpdate?.(data)
    })

    this.socket.on("ball-positions", (data) => {
      this.onBallPositions?.(data)
    })

    this.socket.on("gameOver", (data) => {
      console.log("Game over:", data)
      this.onGameOver?.(data)
    })

    this.socket.on("error", (data) => {
      console.error("Game error:", data)
      this.onError?.(data)
    })
  }

  private setConnectionState(state: ConnectionState) {
    this.connectionState = state
    this.onConnectionStateChange?.(state)
  }

  /**
   * Send cue aiming update (for opponent to see)
   */
  sendCueUpdate(aim: AimEvent) {
    if (!this.socket?.connected) return

    this.socket.emit("cue-aim", {
      tableId: this.tableId,
      angle: aim.angle,
      power: aim.power,
      offset: { x: aim.offset.x, y: aim.offset.y, z: aim.offset.z },
      pos: { x: aim.pos.x, y: aim.pos.y, z: aim.pos.z },
    })
  }

  /**
   * Request to make a shot (server will validate)
   */
  requestShot(tableState: any, power: number, angle: number, offset: { x: number; y: number; z: number }) {
    if (!this.socket?.connected) {
      console.warn("Cannot send shot request - not connected")
      return
    }

    const shotRequest: ShotRequestData = {
      tableId: this.tableId,
      tableState,
      power,
      angle,
      offset,
      timestamp: Date.now(),
    }

    this._pendingShot = shotRequest
    this.socket.emit("shot-request", shotRequest)
  }

  /**
   * Send cue ball placement
   */
  sendPlaceBall(position: { x: number; y: number; z: number }) {
    if (!this.socket?.connected) return

    this.socket.emit("place-ball", {
      tableId: this.tableId,
      position,
    })
  }

  /**
   * Report shot completion with outcome
   */
  sendShotComplete(potted: boolean, fouled: boolean, continuesTurn: boolean) {
    if (!this.socket?.connected) {
      console.warn("Cannot send shot-complete - not connected")
      return
    }

    console.log('[SocketClient] Sending shot-complete:', { potted, fouled, continuesTurn })
    this.socket.emit("shot-complete", {
      tableId: this.tableId,
      potted,
      fouled,
      continuesTurn,
    })
  }

  /**
   * Signal ready to start
   */
  sendReady() {
    if (!this.socket?.connected) return

    this.socket.emit("ready", {
      tableId: this.tableId,
    })
  }

  // Event subscription methods
  setOnPlayerJoined(callback: (data: PlayerJoinedData) => void) {
    this.onPlayerJoined = callback
  }

  setOnPlayerLeft(callback: (data: PlayerLeftData) => void) {
    this.onPlayerLeft = callback
  }

  setOnGameReady(callback: (data: GameReadyData) => void) {
    this.onGameReady = callback
  }

  setOnGameStart(callback: (data: GameStartData) => void) {
    this.onGameStart = callback
  }

  setOnCueUpdate(callback: (data: CueUpdateData) => void) {
    this.onCueUpdate = callback
  }

  setOnShotValidated(callback: (data: ShotValidatedData) => void) {
    this.onShotValidated = callback
  }

  setOnShotRejected(callback: (data: ShotRejectedData) => void) {
    this.onShotRejected = callback
  }

  setOnTurnChange(callback: (data: TurnChangeData) => void) {
    this.onTurnChange = callback
  }

  setOnTurnContinues(callback: (data: TurnContinuesData) => void) {
    this.onTurnContinues = callback
  }

  setOnGroupUpdate(callback: (data: GroupUpdateData) => void) {
    this.onGroupUpdate = callback
  }

  setOnScoreUpdate(callback: (data: ScoreUpdateData) => void) {
    this.onScoreUpdate = callback
  }

  setOnBallPositions(callback: (data: BallPositionsData) => void) {
    this.onBallPositions = callback
  }

  setOnGameOver(callback: (data: GameOverData) => void) {
    this.onGameOver = callback
  }

  setOnError(callback: (data: ErrorData) => void) {
    this.onError = callback
  }

  setOnConnectionStateChange(callback: (state: ConnectionState) => void) {
    this.onConnectionStateChange = callback
  }

  setOnJoined(callback: (data: JoinedData) => void) {
    this.onJoined = callback
  }

  // Getters
  getPlayerNumber(): number {
    return this.playerNumber
  }

  getIsMyTurn(): boolean {
    return this.isMyTurn
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  getSocketId(): string | undefined {
    return this.socket?.id
  }

  getPendingShot(): ShotRequestData | null {
    return this._pendingShot
  }

  getGameSequence(): number {
    return this._gameSequence
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      console.log('[SocketClient] Disconnecting...', { socketId: this.socket.id })
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
      this.setConnectionState("disconnected")
      console.log('[SocketClient] Disconnected and cleaned up')
    }
  }
}
