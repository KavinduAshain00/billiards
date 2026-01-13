/**
 * Pocket physics - EXACT MATCH with client src/model/physics/pocket.ts
 */
import { Ball } from "./ball";
import { Vector3 } from "../physics/utils";
export declare class Pocket {
    pos: Vector3;
    radius: number;
    constructor(pos: Vector3, radius: number);
    private static willFall;
    fall(ball: Ball, t: number): number;
    updateFall(ball: Ball, t: number): void;
    private restingDepth;
    static findPocket(pocketCenters: Pocket[], ball: Ball, t: number): Pocket | undefined;
}
//# sourceMappingURL=pocket.d.ts.map