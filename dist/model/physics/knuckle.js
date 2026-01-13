"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Knuckle = void 0;
var constants_1 = require("./constants");
var pocketgeometry_1 = require("../../view/pocketgeometry");
var Knuckle = /** @class */ (function () {
    function Knuckle(pos, radius) {
        this.pos = pos;
        this.radius = radius;
    }
    Knuckle.willBounce = function (knuckle, futurePosition) {
        return futurePosition.distanceTo(knuckle.pos) < constants_1.R + knuckle.radius;
    };
    Knuckle.prototype.bounce = function (ball) {
        var kb = ball.pos.clone().sub(this.pos).normalize();
        var velDotCenters = kb.dot(ball.vel);
        ball.vel.addScaledVector(kb, -2 * constants_1.e * velDotCenters);
        ball.rvel.multiplyScalar(0.5);
        return Math.abs(velDotCenters);
    };
    Knuckle.findBouncing = function (ball, t) {
        var futurePosition = ball.futurePosition(t);
        return pocketgeometry_1.PocketGeometry.knuckles.find(function (k) {
            return Knuckle.willBounce(k, futurePosition);
        });
    };
    return Knuckle;
}());
exports.Knuckle = Knuckle;
//# sourceMappingURL=knuckle.js.map