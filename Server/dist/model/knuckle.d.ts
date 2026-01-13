/**
 * Knuckle physics - EXACT MATCH with client src/model/physics/knuckle.ts
 */
import { Ball } from "./ball";
import { Vector3 } from "../physics/utils";
export declare class Knuckle {
    pos: Vector3;
    radius: number;
    constructor(pos: Vector3, radius: number);
    private static willBounce;
    bounce(ball: Ball): number;
    static findBouncing(ball: Ball, t: number, knuckles: Knuckle[]): Knuckle | undefined;
}
//# sourceMappingURL=knuckle.d.ts.map