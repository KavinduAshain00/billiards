/**
 * Cushion physics - EXACT MATCH with client src/model/physics/cushion.ts
 */
import { Ball } from "./ball";
import { Vector3 } from "../physics/utils";
import { bounceHanBlend } from "../physics/physics";
export declare class Cushion {
    static bounceAny(ball: Ball, t: number, hasPockets?: boolean, cushionModel?: typeof bounceHanBlend): number | undefined;
    static willBounceShort(futurePosition: Vector3, hasPockets: boolean): boolean;
    static willBounceLong(futurePosition: Vector3, hasPockets: boolean): boolean;
    private static willBounceLongSegment;
    private static willBounceShortSegment;
    private static bounceIn;
}
//# sourceMappingURL=cushion.d.ts.map