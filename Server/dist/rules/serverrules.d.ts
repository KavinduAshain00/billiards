/**
 * Server-Side Rules Engine
 *
 * Handles game rules for 8-ball and snooker on the server side.
 * Determines turn switching, fouls, wins/losses, etc.
 */
import { TableSnapshot, Outcome } from "../model/table";
export type PlayerGroup = "solids" | "stripes" | null;
export interface TurnResult {
    fouled: boolean;
    continuesTurn: boolean;
    ballInHand: boolean;
    behindHeadString: boolean;
    playerWins: boolean;
    playerLoses: boolean;
    message: string;
    playerGroup?: PlayerGroup;
    opponentGroup?: PlayerGroup;
    points?: number;
    foulPoints?: number;
}
export interface GameState {
    ruletype: "eightball" | "snooker";
    currentPlayerIndex: number;
    playerIds: string[];
    isBreakShot: boolean;
    playerGroups: [PlayerGroup, PlayerGroup];
    targetIsRed: boolean;
    scores: [number, number];
    currentBreak: number;
    gameOver: boolean;
    winnerId: string | null;
}
export declare class ServerRules {
    /**
     * Create initial game state
     */
    static createGameState(ruletype: string, playerIds: string[]): GameState;
    /**
     * Get the current player's ID
     */
    static getCurrentPlayerId(state: GameState): string;
    /**
     * Check if a player can take a shot
     */
    static canPlayerShoot(state: GameState, playerId: string): boolean;
    /**
     * Process the outcome of a shot and update game state
     */
    static processShot(state: GameState, snapshot: TableSnapshot, outcomes: Outcome[], shooterId: string): TurnResult;
    /**
     * Process 8-ball shot
     */
    private static processEightBallShot;
    /**
     * Process snooker shot
     */
    private static processSnookerShot;
    /**
     * Switch to the other player's turn
     */
    private static switchTurn;
    /**
     * End the game
     */
    private static endGame;
}
//# sourceMappingURL=serverrules.d.ts.map