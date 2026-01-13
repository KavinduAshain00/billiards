/**
 * Ball state - EXACT MATCH with client src/model/ball.ts
 */
import { Vector3 } from "../physics/utils";
import { Pocket } from "./pocket";
export declare enum State {
    Stationary = "Stationary",
    Rolling = "Rolling",
    Sliding = "Sliding",
    Falling = "Falling",
    InPocket = "InPocket"
}
export interface BallState {
    id: number;
    pos: {
        x: number;
        y: number;
        z: number;
    };
    vel: {
        x: number;
        y: number;
        z: number;
    };
    rvel: {
        x: number;
        y: number;
        z: number;
    };
    state: State;
    ballNumber?: number;
}
export declare class Ball {
    readonly pos: Vector3;
    readonly vel: Vector3;
    readonly rvel: Vector3;
    readonly futurePos: Vector3;
    state: State;
    pocket: Pocket | null;
    ballNumber?: number;
    static id: number;
    readonly id: number;
    static readonly transition = 0.05;
    constructor(pos: Vector3, id?: number, ballNumber?: number);
    static resetIdCounter(): void;
    update(t: number): void;
    private updatePosition;
    private updateVelocity;
    private addDelta;
    private passesZero;
    setStationary(): void;
    isRolling(): boolean;
    onTable(): boolean;
    inMotion(): boolean;
    isFalling(): boolean;
    futurePosition(t: number): Vector3;
    fround(): void;
    serialise(): BallState;
    static fromSerialised(data: BallState): Ball;
    updateFromSerialised(data: BallState): void;
}
//# sourceMappingURL=ball.d.ts.map