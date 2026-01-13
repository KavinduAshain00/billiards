"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollisionThrow = void 0;
var three_1 = require("three");
var collision_1 = require("./collision");
var constants_1 = require("./constants");
var utils_1 = require("../../utils/utils");
/**
 * Based on
 * https://billiards.colostate.edu/technical_proofs/new/TP_A-14.pdf
 *
 */
var CollisionThrow = /** @class */ (function () {
    function CollisionThrow() {
    }
    CollisionThrow.prototype.dynamicFriction = function (vRel) {
        return 0.01 + 0.108 * (0, utils_1.exp)(-1.088 * vRel);
    };
    CollisionThrow.prototype.updateVelocities = function (a, b) {
        var contact = collision_1.Collision.positionsAtContact(a, b);
        a.ballmesh.trace.forceTrace(contact.a);
        b.ballmesh.trace.forceTrace(contact.b);
        var ab = contact.b.sub(contact.a).normalize();
        var abTangent = new three_1.Vector3(-ab.y, ab.x, 0);
        var e = 0.99;
        var vPoint = a.vel
            .clone()
            .sub(b.vel)
            .add(ab
            .clone()
            .multiplyScalar(-constants_1.R)
            .cross(a.rvel)
            .sub(ab.clone().multiplyScalar(constants_1.R).cross(b.rvel)));
        var vRelNormalMag = ab.dot(vPoint);
        var vRel = vPoint.addScaledVector(ab, -vRelNormalMag);
        var vRelMag = vRel.length();
        var vRelTangential = abTangent.dot(vRel); // slip velocity perpendicular to line of impact
        var μ = this.dynamicFriction(vRelMag);
        // let normalImpulse = vRelNormalMag;
        // let tangentialImpulse = Math.min((μ * vRelNormalMag) / vRelMag, 1 / 7) * (-vRelTangential)
        // matches paper when throwAngle = Math.atan2(tangentialImpulse, normalImpulse)
        // Normal impulse (inelastic collision)
        this.normalImpulse = (-(1 + e) * vRelNormalMag) / (2 / constants_1.m);
        // Tangential impulse (frictional constraint) reduced by 1/4 until understood
        this.tangentialImpulse =
            0.25 *
                Math.min((μ * Math.abs(this.normalImpulse)) / vRelMag, 1 / 7) *
                -vRelTangential;
        // Impulse vectors
        var impulseNormal = ab.clone().multiplyScalar(this.normalImpulse);
        var impulseTangential = abTangent
            .clone()
            .multiplyScalar(this.tangentialImpulse);
        // Apply impulses to linear velocities
        a.vel
            .addScaledVector(impulseNormal, 1 / constants_1.m)
            .addScaledVector(impulseTangential, 1 / constants_1.m);
        b.vel
            .addScaledVector(impulseNormal, -1 / constants_1.m)
            .addScaledVector(impulseTangential, -1 / constants_1.m);
        // Angular velocity updates
        var angularImpulseA = ab
            .clone()
            .multiplyScalar(-constants_1.R)
            .cross(impulseTangential);
        var angularImpulseB = ab
            .clone()
            .multiplyScalar(constants_1.R)
            .cross(impulseTangential);
        a.rvel.addScaledVector(angularImpulseA, 1 / constants_1.I);
        b.rvel.addScaledVector(angularImpulseB, 1 / constants_1.I);
        return vRelNormalMag;
    };
    return CollisionThrow;
}());
exports.CollisionThrow = CollisionThrow;
//# sourceMappingURL=collisionthrow.js.map