/**
 * Game Room - Manages a single game instance with authoritative physics
 * 20 snapshots/sec during motion
 * Waiting system: waits 60 seconds for second player
 * Turn-based gameplay with 8-ball and snooker rules
 */
import { TableSnapshot, AimState } from "../model/table";
import { GameState, TurnResult, PlayerGroup } from "../rules/serverrules";
export interface RoomPlayer {
    clientId: string;
    playerName: string;
    socketId: string;
    playerIndex: number;
}
export type RoomState = "waiting" | "playing" | "finished";
export interface TurnChangeData {
    currentPlayerId: string;
    currentPlayerIndex: number;
    reason: string;
    ballInHand: boolean;
    behindHeadString: boolean;
    playerGroup?: PlayerGroup;
    opponentGroup?: PlayerGroup;
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
export type { Outcome } from "../model/table";
export interface GamePausedData {
    disconnectedPlayerId: string;
    disconnectedPlayerName: string;
    secondsToReconnect: number;
}
export interface GameResumedData {
    reconnectedPlayerId: string;
    reconnectedPlayerName: string;
    currentPlayerId: string | null;
    ballInHand: boolean;
    behindHeadString: boolean;
    snapshot: TableSnapshot;
}
export interface ForfeitData {
    forfeitPlayerId: string;
    winnerId: string;
    reason: string;
}
export declare class GameRoom {
    readonly roomId: string;
    readonly ruletype: string;
    private table;
    private players;
    private playerOrder;
    private isSimulating;
    private serverTick;
    private simulationInterval;
    private roomState;
    private waitingTimer;
    private waitingStartTime;
    private readonly WAITING_TIMEOUT_MS;
    private isPaused;
    private disconnectedPlayer;
    private reconnectionTimer;
    private reconnectionStartTime;
    private readonly RECONNECTION_TIMEOUT_MS;
    private gameState;
    private currentBallInHand;
    private currentBehindHeadString;
    private currentShotAim;
    private currentShooterId;
    private shotOutcomes;
    private readonly PHYSICS_STEP;
    private readonly BASE_SNAPSHOT_INTERVAL_MS;
    private readonly SLOW_SNAPSHOT_INTERVAL_MS;
    private currentSnapshotInterval;
    private lastBroadcastSnapshot;
    private accumulatedTime;
    private lastSimTime;
    onSnapshot: ((snapshot: TableSnapshot) => void) | null;
    onStationary: ((snapshot: TableSnapshot, turnResult: TurnResult) => void) | null;
    onWaitingUpdate: ((secondsLeft: number) => void) | null;
    onGameStart: ((firstPlayerId: string) => void) | null;
    onWaitingTimeout: (() => void) | null;
    onPlayerCountChange: ((count: number, players: RoomPlayer[]) => void) | null;
    onTurnChange: ((data: TurnChangeData) => void) | null;
    onGameOver: ((data: GameOverData) => void) | null;
    onFoul: ((data: FoulData) => void) | null;
    onGamePaused: ((data: GamePausedData) => void) | null;
    onGameResumed: ((data: GameResumedData) => void) | null;
    onForfeit: ((data: ForfeitData) => void) | null;
    onReconnectionUpdate: ((secondsLeft: number) => void) | null;
    constructor(roomId: string, ruletype?: string);
    private createTable;
    private createBalls;
    addPlayer(clientId: string, playerName: string, socketId: string): void;
    removePlayer(clientId: string): void;
    /**
     * Try to reconnect a player who disconnected
     */
    tryReconnect(clientId: string, playerName: string, socketId: string): boolean;
    /**
     * Pause game when a player disconnects during play
     */
    private pauseGame;
    /**
     * Resume game when disconnected player reconnects
     */
    private resumeGame;
    /**
     * Start reconnection countdown timer
     */
    private startReconnectionTimer;
    /**
     * Stop reconnection timer
     */
    private stopReconnectionTimer;
    /**
     * Handle reconnection timeout - player forfeits
     */
    private handleReconnectionTimeout;
    /**
     * Check if game is paused
     */
    isGamePaused(): boolean;
    /**
     * Get disconnected player info (for reconnection)
     */
    getDisconnectedPlayer(): RoomPlayer | null;
    getPlayers(): RoomPlayer[];
    getPlayerCount(): number;
    isEmpty(): boolean;
    getRoomState(): RoomState;
    isGameStarted(): boolean;
    /**
     * Get the current player's ID (whose turn it is)
     */
    getCurrentPlayerId(): string | null;
    /**
     * Get the current player index (0 or 1)
     */
    getCurrentPlayerIndex(): number;
    /**
     * Check if it's a specific player's turn
     */
    isPlayersTurn(playerId: string): boolean;
    /**
     * Get current game state
     */
    getGameState(): GameState | null;
    /**
     * Start the waiting timer for second player
     */
    private startWaitingTimer;
    /**
     * Stop the waiting timer
     */
    private stopWaitingTimer;
    /**
     * Handle waiting timeout - no second player joined
     */
    private handleWaitingTimeout;
    /**
     * Start the game when both players are ready
     */
    private startGame;
    getSnapshot(): TableSnapshot;
    isTableStationary(): boolean;
    /**
     * Accept a hit command and start authoritative simulation
     * Returns null if hit is rejected, or reason string if rejected
     */
    hit(aim: AimState, shooterId: string): {
        accepted: boolean;
        reason?: string;
    };
    /**
     * Place the cue ball (ball in hand)
     */
    placeBall(pos: {
        x: number;
        y: number;
        z: number;
    }, playerId: string): {
        accepted: boolean;
        reason?: string;
    };
    private startSimulation;
    /**
     * Process game rules after a shot completes
     */
    private processRules;
    private stopSimulation;
    /**
     * Reset the table to initial state
     */
    reset(ruletype?: string): void;
    /**
     * Get current table state for reconnection
     */
    getTableState(): TableSnapshot;
    /**
     * Get full state for reconnection (including game state)
     */
    getFullState(): {
        snapshot: TableSnapshot;
        gameState: GameState | null;
        currentPlayerId: string | null;
    };
    /**
     * Cleanup when room is destroyed
     */
    destroy(): void;
}
//# sourceMappingURL=gameroom.d.ts.map