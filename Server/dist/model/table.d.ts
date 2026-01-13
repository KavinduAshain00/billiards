/**
 * Server-side Table - EXACT MATCH with client src/model/table.ts
 * Authoritative physics simulation
 */
import { Ball, BallState } from "./ball";
import { bounceHanBlend } from "../physics/physics";
import { Vector3 } from "../physics/utils";
interface Pair {
    a: Ball;
    b: Ball;
}
export interface Outcome {
    type: "collision" | "cushion" | "pot";
    ballId: number;
    ballId2?: number;
    speed: number;
}
export interface AimState {
    angle: number;
    power: number;
    offset: {
        x: number;
        y: number;
        z: number;
    };
    pos: {
        x: number;
        y: number;
        z: number;
    };
}
export interface TableSnapshot {
    timestamp: number;
    serverTick: number;
    balls: BallState[];
    isStationary: boolean;
    outcomes: Outcome[];
}
export declare class Table {
    balls: Ball[];
    pairs: Pair[];
    outcome: Outcome[];
    cueball: Ball;
    cushionModel: typeof bounceHanBlend;
    hasPockets: boolean;
    constructor(balls: Ball[]);
    initialiseBalls(balls: Ball[]): void;
    advance(t: number): void;
    prepareAdvanceAll(t: number): boolean;
    private prepareAdvancePair;
    private prepareAdvanceToCushions;
    allStationary(): boolean;
    inPockets(): number;
    hit(aim: AimState): void;
    serialise(): {
        balls: BallState[];
    };
    snapshot(serverTick: number): TableSnapshot;
    /**
     * Create optimized snapshot with delta compression
     * Only includes balls that have moved significantly
     */
    deltaSnapshot(serverTick: number, prevSnapshot: TableSnapshot | null): TableSnapshot;
    /**
     * Get current outcomes without clearing them
     */
    getOutcomes(): Outcome[];
    /**
     * Clear all outcomes
     */
    clearOutcomes(): void;
    static fromSerialised(data: {
        balls: BallState[];
    }): Table;
    updateFromSerialised(data: {
        balls: BallState[];
    }): void;
    halt(): void;
    overlapsAny(pos: Vector3, excluding?: Ball): boolean;
}
export {};
//# sourceMappingURL=table.d.ts.map