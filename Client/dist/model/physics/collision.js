"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collision = void 0;
var ball_1 = require("../ball");
var collisionthrow_1 = require("./collisionthrow");
var constants_1 = require("./constants");
var Collision = /** @class */ (function () {
    function Collision() {
    }
    Collision.willCollide = function (a, b, t) {
        return ((a.inMotion() || b.inMotion()) &&
            a.onTable() &&
            b.onTable() &&
            a.futurePosition(t).distanceToSquared(b.futurePosition(t)) < 4 * constants_1.R * constants_1.R);
    };
    Collision.collide = function (a, b) {
        return Collision.updateVelocities(a, b);
    };
    Collision.positionsAtContact = function (a, b) {
        var sep = a.pos.distanceTo(b.pos);
        var rv = a.vel.clone().sub(b.vel);
        var t = (sep - 2 * constants_1.R) / rv.length() || 0;
        return {
            a: a.pos.clone().addScaledVector(a.vel, t),
            b: b.pos.clone().addScaledVector(b.vel, t),
        };
    };
    Collision.updateVelocities = function (a, b) {
        var impactSpeed = Collision.model.updateVelocities(a, b);
        a.state = ball_1.State.Sliding;
        b.state = ball_1.State.Sliding;
        return impactSpeed;
    };
    Collision.model = new collisionthrow_1.CollisionThrow();
    return Collision;
}());
exports.Collision = Collision;
//# sourceMappingURL=collision.js.map