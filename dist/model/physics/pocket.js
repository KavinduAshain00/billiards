"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pocket = void 0;
var ball_1 = require("../ball");
var constants_1 = require("./constants");
var utils_1 = require("../../utils/utils");
var Pocket = /** @class */ (function () {
    function Pocket(pos, radius) {
        this.pos = pos;
        this.radius = radius;
    }
    Pocket.willFall = function (pocket, futurePosition) {
        return futurePosition.distanceTo(pocket.pos) < pocket.radius;
    };
    Pocket.prototype.fall = function (ball, t) {
        ball.vel.z = -constants_1.g * t;
        ball.state = ball_1.State.Falling;
        ball.pocket = this;
        return ball.vel.length();
    };
    Pocket.prototype.updateFall = function (ball, t) {
        ball.vel.addScaledVector(utils_1.up, -constants_1.R * 10 * t * constants_1.g);
        var z = ball.pos.z;
        var xypos = ball.pos.clone().setZ(0);
        var distToCentre = xypos.distanceTo(this.pos);
        if (distToCentre > this.radius - constants_1.R) {
            var toCentre = this.pos.clone().sub(ball.pos).normalize().setZ(0);
            if (z > -constants_1.R / 2) {
                ball.vel.addScaledVector(toCentre, constants_1.R * 7 * t * constants_1.g);
                ball.rvel.addScaledVector((0, utils_1.upCross)(toCentre), 7 * t * constants_1.g);
            }
            if (ball.vel.dot(toCentre) < 0) {
                ball.ballmesh.trace.forceTrace(ball.pos);
                ball.vel.x = (toCentre.x * ball.vel.length()) / 2;
                ball.vel.y = (toCentre.y * ball.vel.length()) / 2;
            }
        }
        var restingDepth = this.restingDepth(ball);
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
    };
    Pocket.prototype.restingDepth = function (ball) {
        return -3 * constants_1.R - (constants_1.R * ball.id) / 4;
    };
    Pocket.findPocket = function (pocketCenters, ball, t) {
        var futurePosition = ball.futurePosition(t);
        return pocketCenters.find(function (p) { return Pocket.willFall(p, futurePosition); });
    };
    return Pocket;
}());
exports.Pocket = Pocket;
//# sourceMappingURL=pocket.js.map