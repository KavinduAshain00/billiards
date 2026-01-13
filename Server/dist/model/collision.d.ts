/**
 * Collision physics - EXACT MATCH with client src/model/physics/collision.ts
 */
import { Ball } from "./ball";
import { Vector3 } from "../physics/utils";
import { CollisionThrow } from "./collisionthrow";
export declare class Collision {
    static willCollide(a: Ball, b: Ball, t: number): boolean;
    static collide(a: Ball, b: Ball): number;
    static positionsAtContact(a: Ball, b: Ball): {
        a: Vector3;
        b: Vector3;
    };
    static readonly model: CollisionThrow;
    private static updateVelocities;
}
//# sourceMappingURL=collision.d.ts.map