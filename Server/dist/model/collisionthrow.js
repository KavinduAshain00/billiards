"use strict";
/**
 * Collision throw physics - EXACT MATCH with client src/model/physics/collisionthrow.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollisionThrow = void 0;
const utils_1 = require("../physics/utils");
const collision_1 = require("./collision");
const constants_1 = require("../physics/constants");
function exp(theta) {
    return Math.fround(Math.exp(theta));
}
class CollisionThrow {
    constructor() {
        this.normalImpulse = 0;
        this.tangentialImpulse = 0;
    }
    dynamicFriction(vRel) {
        return 0.01 + 0.108 * exp(-1.088 * vRel);
    }
    updateVelocities(a, b) {
        const contact = collision_1.Collision.positionsAtContact(a, b);
        const ab = contact.b.sub(contact.a).normalize();
        const abTangent = new utils_1.Vector3(-ab.y, ab.x, 0);
        const e = 0.99;
        const vPoint = a.vel
            .clone()
            .sub(b.vel)
            .add(ab
            .clone()
            .multiplyScalar(-constants_1.R)
            .cross(a.rvel)
            .sub(ab.clone().multiplyScalar(constants_1.R).cross(b.rvel)));
        const vRelNormalMag = ab.dot(vPoint);
        const vRel = vPoint.addScaledVector(ab, -vRelNormalMag);
        const vRelMag = vRel.length();
        const vRelTangential = abTangent.dot(vRel);
        const μ = this.dynamicFriction(vRelMag);
        this.normalImpulse = (-(1 + e) * vRelNormalMag) / (2 / constants_1.m);
        this.tangentialImpulse =
            0.25 *
                Math.min((μ * Math.abs(this.normalImpulse)) / vRelMag, 1 / 7) *
                -vRelTangential;
        const impulseNormal = ab.clone().multiplyScalar(this.normalImpulse);
        const impulseTangential = abTangent
            .clone()
            .multiplyScalar(this.tangentialImpulse);
        a.vel
            .addScaledVector(impulseNormal, 1 / constants_1.m)
            .addScaledVector(impulseTangential, 1 / constants_1.m);
        b.vel
            .addScaledVector(impulseNormal, -1 / constants_1.m)
            .addScaledVector(impulseTangential, -1 / constants_1.m);
        const angularImpulseA = ab
            .clone()
            .multiplyScalar(-constants_1.R)
            .cross(impulseTangential);
        const angularImpulseB = ab
            .clone()
            .multiplyScalar(constants_1.R)
            .cross(impulseTangential);
        a.rvel.addScaledVector(angularImpulseA, 1 / constants_1.I);
        b.rvel.addScaledVector(angularImpulseB, 1 / constants_1.I);
        return vRelNormalMag;
    }
}
exports.CollisionThrow = CollisionThrow;
//# sourceMappingURL=collisionthrow.js.map