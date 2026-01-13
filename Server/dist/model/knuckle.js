"use strict";
/**
 * Knuckle physics - EXACT MATCH with client src/model/physics/knuckle.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Knuckle = void 0;
const constants_1 = require("../physics/constants");
class Knuckle {
    constructor(pos, radius) {
        this.pos = pos;
        this.radius = radius;
    }
    static willBounce(knuckle, futurePosition) {
        return futurePosition.distanceTo(knuckle.pos) < constants_1.R + knuckle.radius;
    }
    bounce(ball) {
        const kb = ball.pos.clone().sub(this.pos).normalize();
        const velDotCenters = kb.dot(ball.vel);
        ball.vel.addScaledVector(kb, -2 * constants_1.e * velDotCenters);
        ball.rvel.multiplyScalar(0.5);
        return Math.abs(velDotCenters);
    }
    static findBouncing(ball, t, knuckles) {
        const futurePosition = ball.futurePosition(t);
        return knuckles.find((k) => Knuckle.willBounce(k, futurePosition));
    }
}
exports.Knuckle = Knuckle;
//# sourceMappingURL=knuckle.js.map