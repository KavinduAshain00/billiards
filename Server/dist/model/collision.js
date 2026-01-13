"use strict";
/**
 * Collision physics - EXACT MATCH with client src/model/physics/collision.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collision = void 0;
const ball_1 = require("./ball");
const collisionthrow_1 = require("./collisionthrow");
const constants_1 = require("../physics/constants");
class Collision {
    static willCollide(a, b, t) {
        return ((a.inMotion() || b.inMotion()) &&
            a.onTable() &&
            b.onTable() &&
            a.futurePosition(t).distanceToSquared(b.futurePosition(t)) < 4 * constants_1.R * constants_1.R);
    }
    static collide(a, b) {
        return Collision.updateVelocities(a, b);
    }
    static positionsAtContact(a, b) {
        const sep = a.pos.distanceTo(b.pos);
        const rv = a.vel.clone().sub(b.vel);
        const t = (sep - 2 * constants_1.R) / rv.length() || 0;
        return {
            a: a.pos.clone().addScaledVector(a.vel, t),
            b: b.pos.clone().addScaledVector(b.vel, t),
        };
    }
    static updateVelocities(a, b) {
        const impactSpeed = Collision.model.updateVelocities(a, b);
        a.state = ball_1.State.Sliding;
        b.state = ball_1.State.Sliding;
        return impactSpeed;
    }
}
exports.Collision = Collision;
Collision.model = new collisionthrow_1.CollisionThrow();
//# sourceMappingURL=collision.js.map