/**
 * Socket.IO Message Relay for Server-Authoritative Multiplayer
 *
 * Features:
 * - Socket.IO client connection to game server
 * - RTT measurement for clock synchronization
 * - Automatic reconnection with exponential backoff
 * - Event-based API for game state updates
 */

import { io, Socket } from "socket.io-client";
import { SnapshotBuffer, TableSnapshot } from "./snapshotbuffer";

export interface AimData {
  angle: number;
  power: number;
  offset: { x: number; y: number; z: number };
  pos: { x: number; y: number; z: number };
}

export interface JoinData {
  roomId: string;
  clientId: string;
  playerName: string;
  ruletype?: string;
}

export interface WelcomeData {
  roomId: string;
  clientId: string;
  initialState: TableSnapshot;
  serverTime: number;
  roomState?: "waiting" | "playing" | "finished";
  playerCount?: number;
  players?: Array<{
    clientId: string;
    playerName: string;
    playerIndex?: number;
  }>;
  currentPlayerId?: string;
  isYourTurn?: boolean;
  gameState?: {
    isBreakShot: boolean;
    playerGroups: [string | null, string | null];
    scores: [number, number];
  };
}

export interface ShotAcceptedData {
  sequence: number;
  serverTick: number;
  aim: AimData;
  shooterId?: string; // ID of the player who took the shot
}

export interface ShotRejectedData {
  sequence: number;
  reason: string;
}

export interface StationaryData {
  finalState: TableSnapshot;
  turnResult?: TurnResultData;
}

export interface TurnResultData {
  fouled: boolean;
  continuesTurn: boolean;
  ballInHand: boolean;
  behindHeadString: boolean;
  playerWins: boolean;
  playerLoses: boolean;
  message: string;
  playerGroup?: string | null;
  opponentGroup?: string | null;
  points?: number;
  foulPoints?: number;
}

export interface PlayerEventData {
  clientId: string;
  playerName?: string;
}

export interface ChatEventData {
  clientId: string;
  playerName: string;
  message: string;
}

export interface ErrorData {
  message: string;
  errorCode?: string;
}

export interface WaitingUpdateData {
  secondsLeft: number;
}

export interface GameStartData {
  players: Array<{
    clientId: string;
    playerName: string;
    playerIndex?: number;
  }>;
  currentPlayerId?: string;
  isBreakShot?: boolean;
  ballInHand?: boolean; // Whether current player needs to place ball
  behindHeadString?: boolean; // Whether ball placement is restricted to kitchen
  initialState?: TableSnapshot; // Initial table state with ball numbers
}

export interface WaitingTimeoutData {
  reason: string;
  message: string;
}

export interface PlayerCountUpdateData {
  count: number;
  players: Array<{ clientId: string; playerName: string }>;
}

export interface TurnChangeData {
  currentPlayerId: string;
  currentPlayerIndex: number;
  reason: string;
  ballInHand: boolean;
  behindHeadString: boolean;
  playerGroup?: string | null;
  opponentGroup?: string | null;
}

export interface GameOverData {
  winnerId: string;
  loserId: string;
  reason: string;
}

export interface FoulData {
  playerId: string;
  reason: string;
  ballInHand: boolean;
  behindHeadString: boolean;
  foulPoints?: number;
}

export interface GamePausedData {
  disconnectedPlayerId: string;
  disconnectedPlayerName: string;
  secondsToReconnect: number;
}

export interface GameResumedData {
  reconnectedPlayerId: string;
  reconnectedPlayerName: string;
  // Turn state for restoration
  currentPlayerId: string | null;
  ballInHand: boolean;
  behindHeadString: boolean;
  snapshot: TableSnapshot;
}

export interface ReconnectionUpdateData {
  secondsLeft: number;
}

export interface ForfeitData {
  forfeitPlayerId: string;
  winnerId: string;
  reason: string;
}

export interface BallPlacedData {
  pos: { x: number; y: number; z: number };
  playerId: string;
  snapshot: TableSnapshot;
}

export interface AimUpdateData {
  playerId: string;
  angle: number;
  pos: { x: number; y: number; z: number };
}

export interface BallPosUpdateData {
  playerId: string;
  pos: { x: number; y: number; z: number };
}

export type ConnectionState = "disconnected" | "connecting" | "connected";

export interface SocketIORelayCallbacks {
  onWelcome?: (data: WelcomeData) => void;
  onSnapshot?: (snapshot: TableSnapshot) => void;
  onShotAccepted?: (data: ShotAcceptedData) => void;
  onShotRejected?: (data: ShotRejectedData) => void;
  onStationary?: (data: StationaryData) => void;
  onPlayerJoined?: (data: PlayerEventData) => void;
  onPlayerLeft?: (data: PlayerEventData) => void;
  onChat?: (data: ChatEventData) => void;
  onError?: (data: ErrorData) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  onWaitingUpdate?: (data: WaitingUpdateData) => void;
  onGameStart?: (data: GameStartData) => void;
  onWaitingTimeout?: (data: WaitingTimeoutData) => void;
  onPlayerCountUpdate?: (data: PlayerCountUpdateData) => void;
  onTurnChange?: (data: TurnChangeData) => void;
  onGameOver?: (data: GameOverData) => void;
  onFoul?: (data: FoulData) => void;
  // Pause/reconnection callbacks
  onGamePaused?: (data: GamePausedData) => void;
  onGameResumed?: (data: GameResumedData) => void;
  onReconnectionUpdate?: (data: ReconnectionUpdateData) => void;
  onForfeit?: (data: ForfeitData) => void;
  // Ball placement callback
  onBallPlaced?: (data: BallPlacedData) => void;
  // Aim sync callbacks
  onAimUpdate?: (data: AimUpdateData) => void;
  onBallPosUpdate?: (data: BallPosUpdateData) => void;
}

export class SocketIOMessageRelay {
  private socket: Socket | null = null;
  private callbacks: SocketIORelayCallbacks = {};
  private connectionState: ConnectionState = "disconnected";
  private joinData: JoinData | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  // Snapshot buffer for interpolation
  readonly snapshotBuffer: SnapshotBuffer;

  // Sequence number for shot commands
  private shotSequence: number = 0;

  // RTT measurement
  private pingStartTime: number = 0;
  private lastRtt: number = 50; // Default RTT estimate
  private rttInterval: ReturnType<typeof setInterval> | null = null;

  // Pending shots awaiting confirmation
  private pendingShots: Map<number, { aim: AimData; timestamp: number }> =
    new Map();

  constructor(private readonly serverUrl: string = "http://localhost:3001") {
    this.snapshotBuffer = new SnapshotBuffer();
    console.log(`[SocketIO] Relay created for server: ${serverUrl}`);
  }

  /**
   * Set callbacks for server events
   */
  setCallbacks(callbacks: SocketIORelayCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Connect to the server and join a room
   */
  connect(joinData: JoinData): void {
    console.log(`[SocketIO] Connecting to ${this.serverUrl}...`);
    console.log(`[SocketIO] Join data:`, JSON.stringify(joinData));

    // Store join data for reconnection
    this.joinData = joinData;
    this.reconnectAttempts = 0;

    // Disconnect existing socket if any
    if (this.socket) {
      this.cleanup();
    }

    this.setConnectionState("connecting");

    // Create socket connection with proper options
    // NOTE: Server uses default JSON parser, not msgpack
    this.socket = io(this.serverUrl, {
      // Connection options
      parser: require("socket.io-msgpack-parser"),
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,

      // Transport options - try websocket first, fallback to polling
      transports: ["websocket", "polling"],
      upgrade: true,

      // Timeout settings
      timeout: 20000,

      // Force new connection
      forceNew: true,

      // Auto connect is true by default
      autoConnect: true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) {
      console.error("[SocketIO] Cannot setup handlers: socket is null");
      return;
    }

    const socket = this.socket;

    // Connection lifecycle events
    socket.on("connect", () => {
      console.log(`[SocketIO] Connected! Socket ID: ${socket.id}`);
      this.reconnectAttempts = 0;
      this.setConnectionState("connected");

      // Join the room immediately after connection
      if (this.joinData) {
        console.log(
          `[SocketIO] Sending join request for room: ${this.joinData.roomId}`
        );
        socket.emit("join", {
          roomId: this.joinData.roomId,
          clientId: this.joinData.clientId,
          playerName: this.joinData.playerName,
          ruletype: this.joinData.ruletype || "eightball",
        });
      }

      // Start RTT measurement
      this.startRttMeasurement();
    });

    socket.on("disconnect", (reason: string) => {
      console.log(`[SocketIO] Disconnected. Reason: ${reason}`);
      this.stopRttMeasurement();
      this.setConnectionState("disconnected");

      // Handle different disconnect reasons
      if (reason === "io server disconnect") {
        // Server forcefully disconnected, try reconnecting manually
        console.log(
          "[SocketIO] Server disconnected us, attempting reconnect..."
        );
        setTimeout(() => this.attemptReconnect(), 1000);
      }
      // For other reasons, socket.io will handle reconnection automatically
    });

    socket.on("connect_error", (error: Error) => {
      console.error(`[SocketIO] Connection error:`, error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("[SocketIO] Max reconnection attempts reached");
        this.setConnectionState("disconnected");
        this.callbacks.onError?.({
          message: "Failed to connect to server after multiple attempts",
          errorCode: "CONNECTION_FAILED",
        });
      }
    });

    socket.on("reconnect", (attemptNumber: number) => {
      console.log(`[SocketIO] Reconnected after ${attemptNumber} attempts`);
    });

    socket.on("reconnect_attempt", (attemptNumber: number) => {
      console.log(`[SocketIO] Reconnection attempt ${attemptNumber}`);
    });

    socket.on("reconnect_error", (error: Error) => {
      console.error(`[SocketIO] Reconnection error:`, error.message);
    });

    socket.on("reconnect_failed", () => {
      console.error("[SocketIO] Reconnection failed");
      this.callbacks.onError?.({
        message: "Could not reconnect to server",
        errorCode: "RECONNECT_FAILED",
      });
    });

    // Game events
    socket.on("welcome", (data: WelcomeData) => {
      console.log(`[SocketIO] Welcome received for room: ${data.roomId}`);
      console.log(
        `[SocketIO] Room state: ${data.roomState}, Players: ${data.playerCount}`
      );

      if (data.players) {
        console.log(
          `[SocketIO] Current players:`,
          data.players.map((p) => p.playerName).join(", ")
        );
      }

      // Sync clock with server (accounting for RTT)
      this.snapshotBuffer.syncClock(data.serverTime, this.lastRtt);

      // Add initial state to buffer
      if (data.initialState) {
        this.snapshotBuffer.addSnapshot(data.initialState);
      }

      this.callbacks.onWelcome?.(data);
    });

    socket.on("snapshot", (snapshot: TableSnapshot) => {
      this.snapshotBuffer.addSnapshot(snapshot);
      this.callbacks.onSnapshot?.(snapshot);
    });

    socket.on("shotAccepted", (data: ShotAcceptedData) => {
      console.log(`[SocketIO] Shot ${data.sequence} accepted`);
      this.pendingShots.delete(data.sequence);
      this.callbacks.onShotAccepted?.(data);
    });

    socket.on("shotRejected", (data: ShotRejectedData) => {
      console.warn(`[SocketIO] Shot ${data.sequence} rejected: ${data.reason}`);
      this.pendingShots.delete(data.sequence);
      this.callbacks.onShotRejected?.(data);
    });

    socket.on("stationary", (data: StationaryData) => {
      console.log("[SocketIO] Table stationary - final state received");
      this.snapshotBuffer.addSnapshot(data.finalState);
      this.callbacks.onStationary?.(data);
    });

    socket.on("playerJoined", (data: PlayerEventData) => {
      console.log(
        `[SocketIO] Player joined: ${data.playerName || data.clientId}`
      );
      this.callbacks.onPlayerJoined?.(data);
    });

    socket.on("playerLeft", (data: PlayerEventData) => {
      console.log(`[SocketIO] Player left: ${data.clientId}`);
      this.callbacks.onPlayerLeft?.(data);
    });

    socket.on("chat", (data: ChatEventData) => {
      this.callbacks.onChat?.(data);
    });

    socket.on("error", (data: ErrorData) => {
      console.error(`[SocketIO] Server error:`, data.message);
      this.callbacks.onError?.(data);
    });

    // Waiting system events
    socket.on("waitingUpdate", (data: WaitingUpdateData) => {
      console.log(`[SocketIO] Waiting update: ${data.secondsLeft}s remaining`);
      this.callbacks.onWaitingUpdate?.(data);
    });

    socket.on("gameStart", (data: GameStartData) => {
      console.log(
        `[SocketIO] Game started! Players:`,
        data.players.map((p) => p.playerName).join(", ")
      );
      this.callbacks.onGameStart?.(data);
    });

    socket.on("waitingTimeout", (data: WaitingTimeoutData) => {
      console.log(`[SocketIO] Waiting timeout: ${data.message}`);
      this.callbacks.onWaitingTimeout?.(data);
    });

    socket.on("playerCountUpdate", (data: PlayerCountUpdateData) => {
      console.log(`[SocketIO] Player count: ${data.count}`);
      this.callbacks.onPlayerCountUpdate?.(data);
    });

    // Turn-based game events
    socket.on("turnChange", (data: TurnChangeData) => {
      console.log(
        `[SocketIO] Turn change: ${data.currentPlayerId} (index: ${data.currentPlayerIndex})`
      );
      console.log(`[SocketIO] Reason: ${data.reason}`);
      if (data.ballInHand) {
        console.log(
          `[SocketIO] Ball in hand${data.behindHeadString ? " (behind head string)" : ""}`
        );
      }
      this.callbacks.onTurnChange?.(data);
    });

    socket.on("gameOver", (data: GameOverData) => {
      console.log(`[SocketIO] Game over! Winner: ${data.winnerId}`);
      console.log(`[SocketIO] Reason: ${data.reason}`);
      this.callbacks.onGameOver?.(data);
    });

    socket.on("foul", (data: FoulData) => {
      console.log(`[SocketIO] Foul by ${data.playerId}: ${data.reason}`);
      this.callbacks.onFoul?.(data);
    });

    // Pause/reconnection events
    socket.on("gamePaused", (data: GamePausedData) => {
      console.log(
        `[SocketIO] Game paused - ${data.disconnectedPlayerName} disconnected`
      );
      console.log(
        `[SocketIO] Seconds to reconnect: ${data.secondsToReconnect}`
      );
      this.callbacks.onGamePaused?.(data);
    });

    socket.on("gameResumed", (data: GameResumedData) => {
      console.log(
        `[SocketIO] Game resumed - ${data.reconnectedPlayerName} reconnected`
      );
      this.callbacks.onGameResumed?.(data);
    });

    socket.on("reconnectionUpdate", (data: ReconnectionUpdateData) => {
      this.callbacks.onReconnectionUpdate?.(data);
    });

    socket.on("forfeit", (data: ForfeitData) => {
      console.log(
        `[SocketIO] Forfeit: ${data.forfeitPlayerId} - ${data.reason}`
      );
      console.log(`[SocketIO] Winner: ${data.winnerId}`);
      this.callbacks.onForfeit?.(data);
    });

    // Ball placed response
    socket.on("ballPlaced", (data: BallPlacedData) => {
      console.log(`[SocketIO] Ball placed by ${data.playerId} at`, data.pos);
      this.callbacks.onBallPlaced?.(data);
    });

    // Aim sync events (from other player)
    socket.on("aimUpdate", (data: AimUpdateData) => {
      this.callbacks.onAimUpdate?.(data);
    });

    socket.on("ballPosUpdate", (data: BallPosUpdateData) => {
      this.callbacks.onBallPosUpdate?.(data);
    });

    // RTT measurement response
    socket.on("pong", () => {
      this.lastRtt = Date.now() - this.pingStartTime;
      console.log(`[SocketIO] RTT: ${this.lastRtt}ms`);
    });
  }

  private attemptReconnect(): void {
    if (
      this.socket &&
      this.joinData &&
      this.reconnectAttempts < this.maxReconnectAttempts
    ) {
      console.log("[SocketIO] Attempting manual reconnect...");
      this.socket.connect();
    }
  }

  private startRttMeasurement(): void {
    // Measure immediately
    this.measureRtt();

    // Then measure every 5 seconds
    this.rttInterval = setInterval(() => this.measureRtt(), 5000);
  }

  private stopRttMeasurement(): void {
    if (this.rttInterval) {
      clearInterval(this.rttInterval);
      this.rttInterval = null;
    }
  }

  private measureRtt(): void {
    if (!this.socket || !this.socket.connected) return;

    this.pingStartTime = Date.now();
    this.socket.emit("ping");
  }

  /**
   * Send a hit command to the server
   * Returns the sequence number for tracking
   */
  sendHit(aim: AimData): number {
    if (!this.socket || !this.socket.connected) {
      console.warn("[SocketIO] Cannot send hit: not connected");
      return -1;
    }

    const sequence = ++this.shotSequence;

    // Track pending shot
    this.pendingShots.set(sequence, { aim, timestamp: Date.now() });

    console.log(`[SocketIO] Sending hit, sequence: ${sequence}`);
    this.socket.emit("hit", { aim, sequence });

    return sequence;
  }

  /**
   * Send place ball command (ball in hand)
   */
  sendPlaceBall(pos: { x: number; y: number; z: number }): number {
    if (!this.socket || !this.socket.connected) {
      console.warn("[SocketIO] Cannot send placeBall: not connected");
      return -1;
    }

    const sequence = ++this.shotSequence;
    console.log(`[SocketIO] Sending placeBall, sequence: ${sequence}`);
    this.socket.emit("placeBall", { pos, sequence });
    return sequence;
  }

  /**
   * Send aim update (for opponent to see cue position)
   */
  sendAimUpdate(angle: number, pos: { x: number; y: number; z: number }): void {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit("aimUpdate", { angle, pos });
  }

  /**
   * Send ball position update (for opponent to see ball placement)
   */
  sendBallPosUpdate(pos: { x: number; y: number; z: number }): void {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit("ballPosUpdate", { pos });
  }

  /**
   * Request current state (for reconnection)
   */
  requestState(): void {
    if (!this.socket || !this.socket.connected) return;
    console.log("[SocketIO] Requesting state");
    this.socket.emit("requestState");
  }

  /**
   * Send chat message
   */
  sendChat(message: string): void {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit("chat", { message });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopRttMeasurement();

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.snapshotBuffer.reset();
    this.pendingShots.clear();
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    console.log("[SocketIO] Disconnecting...");
    this.cleanup();
    this.joinData = null;
    this.setConnectionState("disconnected");
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      console.log(
        `[SocketIO] State change: ${this.connectionState} -> ${state}`
      );
      this.connectionState = state;
      this.callbacks.onConnectionChange?.(state);
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected === true;
  }

  /**
   * Get last measured RTT
   */
  getRtt(): number {
    return this.lastRtt;
  }

  /**
   * Check if a shot is pending confirmation
   */
  hasPendingShot(): boolean {
    return this.pendingShots.size > 0;
  }

  /**
   * Get interpolated state for rendering
   */
  getInterpolatedState(deltaTime: number) {
    return this.snapshotBuffer.getInterpolatedState(deltaTime);
  }

  /**
   * Check if buffer is ready for smooth interpolation
   */
  isBufferReady(): boolean {
    return this.snapshotBuffer.isReady();
  }
}
