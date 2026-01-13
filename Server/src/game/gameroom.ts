/**
 * Game Room - Manages a single game instance with authoritative physics
 * 20 snapshots/sec during motion
 * Waiting system: waits 60 seconds for second player
 * Turn-based gameplay with 8-ball and snooker rules
 */

import { Table, TableSnapshot, AimState, Outcome } from "../model/table"
import { Ball } from "../model/ball"
import { Vector3 } from "../physics/utils"
import { R } from "../physics/constants"
import { TableGeometry } from "../model/tablegeometry"
import { ServerRules, GameState, TurnResult, PlayerGroup } from "../rules/serverrules"

export interface RoomPlayer {
  clientId: string
  playerName: string
  socketId: string
  playerIndex: number // 0 or 1
}

export type RoomState = "waiting" | "playing" | "finished"

// Turn change event data
export interface TurnChangeData {
  currentPlayerId: string
  currentPlayerIndex: number
  reason: string
  ballInHand: boolean
  behindHeadString: boolean
  playerGroup?: PlayerGroup
  opponentGroup?: PlayerGroup
}

// Game over event data
export interface GameOverData {
  winnerId: string
  loserId: string
  reason: string
}

// Foul event data
export interface FoulData {
  playerId: string
  reason: string
  ballInHand: boolean
  behindHeadString: boolean
  foulPoints?: number
}

// Re-export Outcome type from table model
export type { Outcome } from "../model/table"

// Pause event data
export interface GamePausedData {
  disconnectedPlayerId: string
  disconnectedPlayerName: string
  secondsToReconnect: number
}

// Resume event data
export interface GameResumedData {
  reconnectedPlayerId: string
  reconnectedPlayerName: string
  // Turn state for restoration
  currentPlayerId: string | null
  ballInHand: boolean
  behindHeadString: boolean
  snapshot: TableSnapshot
}

// Forfeit event data  
export interface ForfeitData {
  forfeitPlayerId: string
  winnerId: string
  reason: string
}

export class GameRoom {
  readonly roomId: string
  readonly ruletype: string
  private table: Table
  private players: Map<string, RoomPlayer> = new Map()
  private playerOrder: string[] = [] // [player0Id, player1Id]
  private isSimulating: boolean = false
  private serverTick: number = 0
  private simulationInterval: NodeJS.Timeout | null = null
  
  // Room state
  private roomState: RoomState = "waiting"
  private waitingTimer: NodeJS.Timeout | null = null
  private waitingStartTime: number = 0
  private readonly WAITING_TIMEOUT_MS = 60000 // 60 seconds
  
  // Pause/reconnection state
  private isPaused: boolean = false
  private disconnectedPlayer: RoomPlayer | null = null
  private reconnectionTimer: NodeJS.Timeout | null = null
  private reconnectionStartTime: number = 0
  private readonly RECONNECTION_TIMEOUT_MS = 60000 // 60 seconds to reconnect
  
  // Game state for rules
  private gameState: GameState | null = null
  
  // Current turn state (updated after each shot)
  private currentBallInHand: boolean = false
  private currentBehindHeadString: boolean = false
  
  // Current shot aim (for rule processing after simulation)
  private currentShotAim: AimState | null = null
  private currentShooterId: string | null = null
  
  // Accumulated outcomes during the entire shot
  private shotOutcomes: Outcome[] = []
  
  // Physics timestep - MUST match client exactly
  private readonly PHYSICS_STEP = 0.001953125 // Same as client container.step
  
  // Snapshot broadcast rate: adaptive 10-20Hz based on movement
  private readonly BASE_SNAPSHOT_INTERVAL_MS = 50    // 20Hz when balls moving fast
  private readonly SLOW_SNAPSHOT_INTERVAL_MS = 100   // 10Hz when balls slowing down
  private currentSnapshotInterval: number = 50
  
  // Delta compression for snapshots
  private lastBroadcastSnapshot: TableSnapshot | null = null
  
  // Accumulated time for physics
  private accumulatedTime: number = 0
  private lastSimTime: number = 0
  
  // Callback for broadcasting snapshots
  onSnapshot: ((snapshot: TableSnapshot) => void) | null = null
  onStationary: ((snapshot: TableSnapshot, turnResult: TurnResult) => void) | null = null
  
  // Callbacks for room state changes
  onWaitingUpdate: ((secondsLeft: number) => void) | null = null
  onGameStart: ((firstPlayerId: string) => void) | null = null
  onWaitingTimeout: (() => void) | null = null
  onPlayerCountChange: ((count: number, players: RoomPlayer[]) => void) | null = null
  
  // Callbacks for game events
  onTurnChange: ((data: TurnChangeData) => void) | null = null
  onGameOver: ((data: GameOverData) => void) | null = null
  onFoul: ((data: FoulData) => void) | null = null
  
  // Callbacks for pause/reconnection
  onGamePaused: ((data: GamePausedData) => void) | null = null
  onGameResumed: ((data: GameResumedData) => void) | null = null
  onForfeit: ((data: ForfeitData) => void) | null = null
  onReconnectionUpdate: ((secondsLeft: number) => void) | null = null

  constructor(roomId: string, ruletype: string = "eightball") {
    this.roomId = roomId
    this.ruletype = ruletype
    this.table = this.createTable(ruletype)
  }

  private createTable(ruletype: string): Table {
    Ball.resetIdCounter()
    const balls = this.createBalls(ruletype)
    return new Table(balls)
  }

  private createBalls(ruletype: string): Ball[] {
    const balls: Ball[] = []
    
    // Cue ball (id 0, ballNumber 0)
    balls.push(new Ball(new Vector3(-TableGeometry.tableX * 0.5, 0, 0), undefined, 0))
    
    // Racked balls - standard triangle formation
    const footSpot = new Vector3(TableGeometry.tableX * 0.35, 0, 0)
    const spacing = 2 * R + 0.001
    const rowOffset = spacing * Math.sqrt(3) / 2
    
    // Generate triangle positions
    const positions: Vector3[] = []
    const rows = [
      [0],                          // Row 0: 1 ball
      [-0.5, 0.5],                  // Row 1: 2 balls
      [-1, 0, 1],                   // Row 2: 3 balls
      [-1.5, -0.5, 0.5, 1.5],       // Row 3: 4 balls
      [-2, -1, 0, 1, 2],            // Row 4: 5 balls
    ]
    
    rows.forEach((row, rowIndex) => {
      row.forEach((offset) => {
        const x = footSpot.x + rowIndex * rowOffset
        const y = footSpot.y + offset * spacing
        positions.push(new Vector3(x, y, 0))
      })
    })
    
    if (ruletype === "eightball") {
      // Create randomized 8-ball rack
      // Ball numbers 1-7 are solids, 8 is 8-ball, 9-15 are stripes
      // 8-ball must be in the center (position index 4)
      const numbers: number[] = []
      for (let i = 1; i <= 15; i++) {
        if (i !== 8) numbers.push(i)
      }
      
      // Fisher-Yates shuffle
      for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
      }
      
      // Assign ball numbers: 8-ball goes at index 4 (center of rack)
      const assigned: number[] = []
      let idx = 0
      for (let i = 0; i < positions.length; i++) {
        if (i === 4) {
          assigned[i] = 8  // 8-ball in center
        } else {
          assigned[i] = numbers[idx++]
        }
      }
      
      // Create balls with their assigned numbers
      for (let i = 0; i < positions.length; i++) {
        const ballNumber = assigned[i]
        balls.push(new Ball(positions[i], undefined, ballNumber))
      }
      
      console.log(`[GameRoom] Created 8-ball rack with ball numbers: ${assigned.join(', ')}`)
    } else {
      // Other rule types: just create balls without special numbering
      positions.forEach(() => {
        balls.push(new Ball(positions.shift()!))
      })
    }
    
    return balls
  }

  addPlayer(clientId: string, playerName: string, socketId: string): void {
    // Assign player index based on order of joining
    const playerIndex = this.playerOrder.length
    
    // Only allow 2 players max
    if (playerIndex >= 2) {
      console.log(`Room ${this.roomId}: Rejecting player ${clientId} - room full`)
      return
    }
    
    this.players.set(clientId, { clientId, playerName, socketId, playerIndex })
    this.playerOrder.push(clientId)
    
    // Notify about player count change
    if (this.onPlayerCountChange) {
      this.onPlayerCountChange(this.players.size, this.getPlayers())
    }
    
    // Check if we should start the game
    if (this.players.size >= 2 && this.roomState === "waiting") {
      this.startGame()
    } else if (this.players.size === 1 && this.roomState === "waiting") {
      // First player joined - start waiting timer
      this.startWaitingTimer()
    }
  }

  removePlayer(clientId: string): void {
    const player = this.players.get(clientId)
    if (!player) return
    
    // If game is in progress, pause for reconnection
    if (this.roomState === "playing" && this.players.size === 2) {
      this.disconnectedPlayer = player
      this.players.delete(clientId)
      this.pauseGame()
    } else {
      this.players.delete(clientId)
    }
    
    // Notify about player count change
    if (this.onPlayerCountChange) {
      this.onPlayerCountChange(this.players.size, this.getPlayers())
    }
  }

  /**
   * Try to reconnect a player who disconnected
   */
  tryReconnect(clientId: string, playerName: string, socketId: string): boolean {
    // Check if this is the disconnected player trying to reconnect
    if (this.disconnectedPlayer && this.disconnectedPlayer.clientId === clientId) {
      const player: RoomPlayer = {
        clientId,
        playerName,
        socketId,
        playerIndex: this.disconnectedPlayer.playerIndex,
      }
      this.players.set(clientId, player)
      this.resumeGame()
      return true
    }
    return false
  }

  /**
   * Pause game when a player disconnects during play
   */
  private pauseGame(): void {
    if (this.isPaused || !this.disconnectedPlayer) return
    
    this.isPaused = true
    console.log(`Room ${this.roomId}: Game paused - waiting for ${this.disconnectedPlayer.playerName} to reconnect`)
    
    // Start reconnection timer
    this.startReconnectionTimer()
    
    // Notify remaining player
    if (this.onGamePaused) {
      this.onGamePaused({
        disconnectedPlayerId: this.disconnectedPlayer.clientId,
        disconnectedPlayerName: this.disconnectedPlayer.playerName,
        secondsToReconnect: Math.ceil(this.RECONNECTION_TIMEOUT_MS / 1000),
      })
    }
  }

  /**
   * Resume game when disconnected player reconnects
   */
  private resumeGame(): void {
    if (!this.isPaused || !this.disconnectedPlayer) return
    
    console.log(`Room ${this.roomId}: Player ${this.disconnectedPlayer.playerName} reconnected - resuming game`)
    
    // Stop reconnection timer
    this.stopReconnectionTimer()
    
    // Notify players with full game state
    if (this.onGameResumed) {
      this.onGameResumed({
        reconnectedPlayerId: this.disconnectedPlayer.clientId,
        reconnectedPlayerName: this.disconnectedPlayer.playerName,
        currentPlayerId: this.getCurrentPlayerId(),
        ballInHand: this.currentBallInHand,
        behindHeadString: this.currentBehindHeadString,
        snapshot: this.table.snapshot(this.serverTick),
      })
    }
    
    this.isPaused = false
    this.disconnectedPlayer = null
  }

  /**
   * Start reconnection countdown timer
   */
  private startReconnectionTimer(): void {
    if (this.reconnectionTimer) return
    
    this.reconnectionStartTime = Date.now()
    
    // Send updates every second
    this.reconnectionTimer = setInterval(() => {
      const elapsed = Date.now() - this.reconnectionStartTime
      const remaining = Math.max(0, this.RECONNECTION_TIMEOUT_MS - elapsed)
      const secondsLeft = Math.ceil(remaining / 1000)
      
      if (this.onReconnectionUpdate) {
        this.onReconnectionUpdate(secondsLeft)
      }
      
      if (remaining <= 0) {
        this.handleReconnectionTimeout()
      }
    }, 1000)
  }

  /**
   * Stop reconnection timer
   */
  private stopReconnectionTimer(): void {
    if (this.reconnectionTimer) {
      clearInterval(this.reconnectionTimer)
      this.reconnectionTimer = null
    }
  }

  /**
   * Handle reconnection timeout - player forfeits
   */
  private handleReconnectionTimeout(): void {
    console.log(`Room ${this.roomId}: Reconnection timeout - player forfeited`)
    this.stopReconnectionTimer()
    
    if (!this.disconnectedPlayer) return
    
    // Remaining player wins by forfeit
    const remainingPlayer = this.getPlayers()[0]
    if (remainingPlayer && this.onForfeit) {
      this.onForfeit({
        forfeitPlayerId: this.disconnectedPlayer.clientId,
        winnerId: remainingPlayer.clientId,
        reason: "Opponent disconnected and did not reconnect in time",
      })
    }
    
    this.roomState = "finished"
    this.isPaused = false
    this.disconnectedPlayer = null
  }

  /**
   * Check if game is paused
   */
  isGamePaused(): boolean {
    return this.isPaused
  }

  /**
   * Get disconnected player info (for reconnection)
   */
  getDisconnectedPlayer(): RoomPlayer | null {
    return this.disconnectedPlayer
  }

  getPlayers(): RoomPlayer[] {
    return Array.from(this.players.values())
  }

  getPlayerCount(): number {
    return this.players.size
  }

  isEmpty(): boolean {
    return this.players.size === 0
  }

  getRoomState(): RoomState {
    return this.roomState
  }

  isGameStarted(): boolean {
    return this.roomState === "playing"
  }

  /**
   * Get the current player's ID (whose turn it is)
   */
  getCurrentPlayerId(): string | null {
    if (!this.gameState) return null
    return ServerRules.getCurrentPlayerId(this.gameState)
  }

  /**
   * Get the current player index (0 or 1)
   */
  getCurrentPlayerIndex(): number {
    if (!this.gameState) return 0
    return this.gameState.currentPlayerIndex
  }

  /**
   * Check if it's a specific player's turn
   */
  isPlayersTurn(playerId: string): boolean {
    if (!this.gameState) return false
    return ServerRules.canPlayerShoot(this.gameState, playerId)
  }

  /**
   * Get current game state
   */
  getGameState(): GameState | null {
    return this.gameState
  }

  /**
   * Start the waiting timer for second player
   */
  private startWaitingTimer(): void {
    if (this.waitingTimer) return // Already running
    
    this.waitingStartTime = Date.now()
    console.log(`Room ${this.roomId}: Waiting for second player (60 seconds)`)
    
    // Send updates every second
    this.waitingTimer = setInterval(() => {
      const elapsed = Date.now() - this.waitingStartTime
      const remaining = Math.max(0, this.WAITING_TIMEOUT_MS - elapsed)
      const secondsLeft = Math.ceil(remaining / 1000)
      
      if (this.onWaitingUpdate) {
        this.onWaitingUpdate(secondsLeft)
      }
      
      if (remaining <= 0) {
        this.handleWaitingTimeout()
      }
    }, 1000)
  }

  /**
   * Stop the waiting timer
   */
  private stopWaitingTimer(): void {
    if (this.waitingTimer) {
      clearInterval(this.waitingTimer)
      this.waitingTimer = null
    }
  }

  /**
   * Handle waiting timeout - no second player joined
   */
  private handleWaitingTimeout(): void {
    console.log(`Room ${this.roomId}: Waiting timeout - no second player joined`)
    this.stopWaitingTimer()
    this.roomState = "finished"
    
    if (this.onWaitingTimeout) {
      this.onWaitingTimeout()
    }
  }

  /**
   * Start the game when both players are ready
   */
  private startGame(): void {
    console.log(`Room ${this.roomId}: Both players joined - starting game`)
    this.stopWaitingTimer()
    this.roomState = "playing"
    
    // Initialize game state with rules engine
    this.gameState = ServerRules.createGameState(this.ruletype, this.playerOrder)
    
    // Break shot starts with ball in hand behind head string
    this.currentBallInHand = true
    this.currentBehindHeadString = true
    
    const firstPlayerId = ServerRules.getCurrentPlayerId(this.gameState)
    console.log(`Room ${this.roomId}: Game started. First player: ${firstPlayerId}`)
    
    if (this.onGameStart) {
      this.onGameStart(firstPlayerId)
    }
  }

  getSnapshot(): TableSnapshot {
    return this.table.snapshot(this.serverTick)
  }

  isTableStationary(): boolean {
    return this.table.allStationary()
  }

  /**
   * Accept a hit command and start authoritative simulation
   * Returns null if hit is rejected, or reason string if rejected
   */
  hit(aim: AimState, shooterId: string): { accepted: boolean; reason?: string } {
    if (this.isSimulating) {
      return { accepted: false, reason: "Simulation in progress" }
    }
    
    if (this.isPaused) {
      return { accepted: false, reason: "Game is paused - waiting for player to reconnect" }
    }
    
    if (!this.gameState) {
      return { accepted: false, reason: "Game not started" }
    }
    
    // CRITICAL: Validate it's this player's turn
    if (!ServerRules.canPlayerShoot(this.gameState, shooterId)) {
      const currentPlayer = ServerRules.getCurrentPlayerId(this.gameState)
      return { accepted: false, reason: `Not your turn. Waiting for ${currentPlayer}` }
    }
    
    // Check if game is over
    if (this.gameState.gameOver) {
      return { accepted: false, reason: "Game is over" }
    }
    
    // Store current shooter for rule processing after simulation
    this.currentShooterId = shooterId
    this.currentShotAim = aim
    
    // Apply hit to table
    this.table.hit(aim)
    
    // Start simulation loop
    this.startSimulation()
    
    return { accepted: true }
  }

  /**
   * Place the cue ball (ball in hand)
   */
  placeBall(pos: { x: number; y: number; z: number }, playerId: string): { accepted: boolean; reason?: string } {
    if (this.isSimulating) {
      return { accepted: false, reason: "Simulation in progress" }
    }
    
    if (this.isPaused) {
      return { accepted: false, reason: "Game is paused - waiting for player to reconnect" }
    }
    
    // Validate it's this player's turn
    if (!this.gameState || !ServerRules.canPlayerShoot(this.gameState, playerId)) {
      return { accepted: false, reason: "Not your turn" }
    }
    
    const position = new Vector3(pos.x, pos.y, pos.z)
    
    // Validate position is on table and doesn't overlap
    if (this.table.overlapsAny(position)) {
      return { accepted: false, reason: "Invalid position - overlaps another ball" }
    }
    
    // TODO: Validate behind head string if required
    
    this.table.cueball.pos.copy(position)
    this.table.cueball.vel.set(0, 0, 0)
    this.table.cueball.rvel.set(0, 0, 0)
    
    return { accepted: true }
  }

  private startSimulation(): void {
    if (this.isSimulating) return
    
    this.isSimulating = true
    this.lastSimTime = Date.now()
    this.accumulatedTime = 0
    
    // Clear accumulated outcomes for this shot
    this.shotOutcomes = []
    
    // Reset delta compression state
    this.lastBroadcastSnapshot = null
    this.currentSnapshotInterval = this.BASE_SNAPSHOT_INTERVAL_MS
    
    // Run simulation at high frequency for accurate physics
    // Broadcast snapshots at adaptive rate (10-20Hz)
    let lastSnapshotTime = Date.now()
    
    this.simulationInterval = setInterval(() => {
      const now = Date.now()
      const dt = (now - this.lastSimTime) / 1000
      this.lastSimTime = now
      
      this.accumulatedTime += dt
      
      // Run physics steps
      while (this.accumulatedTime >= this.PHYSICS_STEP) {
        this.table.advance(this.PHYSICS_STEP)
        this.serverTick++
        this.accumulatedTime -= this.PHYSICS_STEP
      }
      
      // Broadcast snapshot at adaptive rate
      if (now - lastSnapshotTime >= this.currentSnapshotInterval) {
        lastSnapshotTime = now
        
        // Use delta compression for smaller payloads
        const snapshot = this.table.deltaSnapshot(this.serverTick, this.lastBroadcastSnapshot)
        
        // Adaptive rate: reduce frequency when balls are slowing down
        const maxVel = Math.max(...this.table.balls.map(b => b.vel.length()))
        if (maxVel < 0.5) {
          // Balls moving slowly - use lower rate
          this.currentSnapshotInterval = this.SLOW_SNAPSHOT_INTERVAL_MS
        } else {
          // Balls moving fast - use full rate
          this.currentSnapshotInterval = this.BASE_SNAPSHOT_INTERVAL_MS
        }
        
        // Accumulate outcomes from this snapshot
        if (snapshot.outcomes && snapshot.outcomes.length > 0) {
          this.shotOutcomes.push(...snapshot.outcomes)
        }
        
        if (this.onSnapshot) {
          this.onSnapshot(snapshot)
        }
        
        // Store for delta compression
        // Need full snapshot for proper delta calculation
        this.lastBroadcastSnapshot = this.table.snapshot(this.serverTick)
        
        // Check if simulation complete
        if (snapshot.isStationary) {
          this.stopSimulation()
          
          // Process rules and determine turn result
          const turnResult = this.processRules(snapshot)
          
          if (this.onStationary) {
            this.onStationary(this.lastBroadcastSnapshot, turnResult)
          }
        }
      }
    }, 1) // Run as fast as possible for smooth physics
  }

  /**
   * Process game rules after a shot completes
   */
  private processRules(snapshot: TableSnapshot): TurnResult {
    if (!this.gameState || !this.currentShooterId) {
      return {
        fouled: false,
        continuesTurn: false,
        ballInHand: false,
        behindHeadString: false,
        playerWins: false,
        playerLoses: false,
        message: "No game state",
      }
    }
    
    // Use accumulated outcomes from the entire shot
    const outcomes = this.shotOutcomes
    console.log(`Room ${this.roomId}: Processing shot with ${outcomes.length} outcomes`)
    console.log(`Outcomes:`, outcomes.filter(o => o.type === 'pot').map(o => ({ type: o.type, ballId: o.ballId })))
    
    // Process the shot through rules engine
    const turnResult = ServerRules.processShot(
      this.gameState,
      snapshot,
      outcomes,
      this.currentShooterId
    )
    
    console.log(`Room ${this.roomId}: Shot processed - ${turnResult.message}`)
    console.log(`Current player after shot: ${ServerRules.getCurrentPlayerId(this.gameState)}`)
    
    // Emit appropriate events based on result
    if (turnResult.playerWins || turnResult.playerLoses) {
      // Game over
      if (this.onGameOver) {
        const winnerId = this.gameState.winnerId!
        const loserId = this.gameState.playerIds.find(id => id !== winnerId)!
        this.onGameOver({
          winnerId,
          loserId,
          reason: turnResult.message,
        })
      }
      this.roomState = "finished"
    } else if (turnResult.fouled) {
      // Foul occurred
      if (this.onFoul) {
        this.onFoul({
          playerId: this.currentShooterId,
          reason: turnResult.message,
          ballInHand: turnResult.ballInHand,
          behindHeadString: turnResult.behindHeadString,
          foulPoints: turnResult.foulPoints,
        })
      }
    }
    
    // Always emit turn change (even if same player continues)
    if (this.onTurnChange && !this.gameState.gameOver) {
      // Update tracked ball-in-hand state
      this.currentBallInHand = turnResult.ballInHand
      this.currentBehindHeadString = turnResult.behindHeadString
      
      this.onTurnChange({
        currentPlayerId: ServerRules.getCurrentPlayerId(this.gameState),
        currentPlayerIndex: this.gameState.currentPlayerIndex,
        reason: turnResult.message,
        ballInHand: turnResult.ballInHand,
        behindHeadString: turnResult.behindHeadString,
        playerGroup: turnResult.playerGroup,
        opponentGroup: turnResult.opponentGroup,
      })
    }
    
    // Clear current shot data
    this.currentShooterId = null
    this.currentShotAim = null
    this.shotOutcomes = []
    
    return turnResult
  }

  private stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval)
      this.simulationInterval = null
    }
    this.isSimulating = false
  }

  /**
   * Reset the table to initial state
   */
  reset(ruletype: string = "eightball"): void {
    this.stopSimulation()
    this.table = this.createTable(ruletype)
    this.serverTick = 0
    
    // Reset game state
    if (this.playerOrder.length >= 2) {
      this.gameState = ServerRules.createGameState(ruletype, this.playerOrder)
    }
    
    this.currentShooterId = null
    this.currentShotAim = null
  }

  /**
   * Get current table state for reconnection
   */
  getTableState(): TableSnapshot {
    return this.table.snapshot(this.serverTick)
  }
  
  /**
   * Get full state for reconnection (including game state)
   */
  getFullState(): {
    snapshot: TableSnapshot;
    gameState: GameState | null;
    currentPlayerId: string | null;
  } {
    return {
      snapshot: this.table.snapshot(this.serverTick),
      gameState: this.gameState,
      currentPlayerId: this.getCurrentPlayerId(),
    }
  }

  /**
   * Cleanup when room is destroyed
   */
  destroy(): void {
    this.stopSimulation()
    this.stopWaitingTimer()
    this.stopReconnectionTimer()
    this.players.clear()
    this.playerOrder = []
    this.gameState = null
    this.disconnectedPlayer = null
    this.isPaused = false
  }
}
