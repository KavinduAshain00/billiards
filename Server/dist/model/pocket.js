"use strict";
/**
 * Pocket physics - EXACT MATCH with client src/model/physics/pocket.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pocket = void 0;
const ball_1 = require("./ball");
const utils_1 = require("../physics/utils");
const constants_1 = require("../physics/constants");
const up = new utils_1.Vector3(0, 0, 1);
function upCross(v) {
    return up.clone().cross(v);
}
class Pocket {
    constructor(pos, radius) {
        this.pos = pos;
        this.radius = radius;
    }
    static willFall(pocket, futurePosition) {
        return futurePosition.distanceTo(pocket.pos) < pocket.radius;
    }
    fall(ball, t) {
        ball.vel.z = -constants_1.g * t;
        ball.state = ball_1.State.Falling;
        ball.pocket = this;
        return ball.vel.length();
    }
    updateFall(ball, t) {
        ball.vel.addScaledVector(up, -constants_1.R * 10 * t * constants_1.g);
        const z = ball.pos.z;
        const xypos = ball.pos.clone().setZ(0);
        const distToCentre = xypos.distanceTo(this.pos);
        if (distToCentre > this.radius - constants_1.R) {
            const toCentre = this.pos.clone().sub(ball.pos).normalize().setZ(0);
            if (z > -constants_1.R / 2) {
                ball.vel.addScaledVector(toCentre, constants_1.R * 7 * t * constants_1.g);
                ball.rvel.addScaledVector(upCross(toCentre), 7 * t * constants_1.g);
            }
            if (ball.vel.dot(toCentre) < 0) {
                ball.vel.x = (toCentre.x * ball.vel.length()) / 2;
                ball.vel.y = (toCentre.y * ball.vel.length()) / 2;
            }
        }
        const restingDepth = this.restingDepth(ball);
        if (z < restingDepth && ball.rvel.length() !== 0) {
            ball.pos.z = restingDepth;
            ball.vel.z = -constants_1.R / 10;
            ball.rvel.copy(utils_1.zero);
        }
        if (z < restingDepth - constants_1.R) {
            ball.pos.z = restingDepth - constants_1.R;
            ball.setStationary();
            ball.state = ball_1.State.InPocket;
        }
    }
    restingDepth(ball) {
        return -3 * constants_1.R - (constants_1.R * ball.id) / 4;
    }
    static findPocket(pocketCenters, ball, t) {
        const futurePosition = ball.futurePosition(t);
        return pocketCenters.find((p) => Pocket.willFall(p, futurePosition));
    }
}
exports.Pocket = Pocket;
//# sourceMappingURL=pocket.js.map