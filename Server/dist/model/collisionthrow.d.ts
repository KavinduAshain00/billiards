/**
 * Collision throw physics - EXACT MATCH with client src/model/physics/collisionthrow.ts
 */
import { Ball } from "./ball";
export declare class CollisionThrow {
    normalImpulse: number;
    tangentialImpulse: number;
    private dynamicFriction;
    updateVelocities(a: Ball, b: Ball): number;
}
//# sourceMappingURL=collisionthrow.d.ts.map