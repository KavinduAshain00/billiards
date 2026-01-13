"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollisionThrowPlot = void 0;
var three_1 = require("three");
var ball_1 = require("../model/ball");
var utils_1 = require("../utils/utils");
var collision_1 = require("../model/physics/collision");
var CollisionThrowPlot = /** @class */ (function () {
    function CollisionThrowPlot(log) {
        if (log === void 0) { log = function () { }; }
        this.log = log;
    }
    CollisionThrowPlot.prototype.dynamicFriction = function (vRel) {
        return (CollisionThrowPlot.a +
            CollisionThrowPlot.b * Math.exp(-CollisionThrowPlot.c * vRel));
    };
    CollisionThrowPlot.prototype.relativeVelocity = function (v, ωx, ωz, ϕ) {
        return Math.sqrt(Math.pow(v * Math.sin(ϕ) - ωz * CollisionThrowPlot.R, 2) +
            Math.pow(Math.cos(ϕ) * ωx * CollisionThrowPlot.R, 2));
    };
    CollisionThrowPlot.prototype.throwAngle = function (v, ωx, ωz, ϕ) {
        var vRel = this.relativeVelocity(v, ωx, ωz, ϕ);
        var μ = this.dynamicFriction(vRel);
        var numerator = Math.min((μ * v * Math.cos(ϕ)) / vRel, 1 / 7) *
            (v * Math.sin(ϕ) - CollisionThrowPlot.R * ωz);
        var denominator = v * Math.cos(ϕ);
        this.log("inputs:v=".concat(v, ", \u03C9x=").concat(ωx, ", \u03C9z=").concat(ωz, ", \u03D5=").concat(ϕ));
        this.log("   v * Math.sin(\u03D5) =".concat(v * Math.sin(ϕ)));
        this.log("   CollisionThrow.R * \u03C9z =".concat(CollisionThrowPlot.R * ωz));
        this.log("   Math.min((\u03BC * v * Math.cos(\u03D5)) / vRel, 1 / 7) =".concat(Math.min((μ * v * Math.cos(ϕ)) / vRel, 1 / 7)));
        this.log("   (v * Math.sin(\u03D5) - CollisionThrow.R * \u03C9z) =".concat(v * Math.sin(ϕ) - CollisionThrowPlot.R * ωz));
        this.log("");
        this.log("vRel = ", vRel);
        this.log("μ = ", μ);
        this.log("numerator = ", numerator);
        this.log("denominator = ", denominator);
        this.log("throw = ", Math.atan2(numerator, denominator));
        return Math.atan2(numerator, denominator);
    };
    CollisionThrowPlot.prototype.plot = function (v, ωx, ωz, ϕ) {
        // assume balls in contact along y axis
        // cue ball a is travelling +y only
        // object ball positioned so that collision angle is phi
        var a = new ball_1.Ball(utils_1.zero);
        a.vel.copy(new three_1.Vector3(0, v, 0));
        a.rvel.copy(new three_1.Vector3(ωx, 0, ωz));
        var straight = new three_1.Vector3(0, 2 * CollisionThrowPlot.R);
        var bpos = straight.applyAxisAngle(utils_1.up, ϕ);
        var b = new ball_1.Ball(bpos);
        collision_1.Collision.model.updateVelocities(a, b);
        return Math.atan2(collision_1.Collision.model.tangentialImpulse, -collision_1.Collision.model.normalImpulse);
    };
    CollisionThrowPlot.R = 0.029; // ball radius in meters
    // Friction parameters
    CollisionThrowPlot.a = 0.01; // Minimum friction coefficient
    CollisionThrowPlot.b = 0.108; // Range of friction variation
    CollisionThrowPlot.c = 1.088; // Decay rate
    return CollisionThrowPlot;
}());
exports.CollisionThrowPlot = CollisionThrowPlot;
//# sourceMappingURL=throw_gpt4o.js.map