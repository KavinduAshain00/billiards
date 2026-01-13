"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ball = exports.State = void 0;
var three_1 = require("three");
var utils_1 = require("../utils/utils");
var physics_1 = require("../model/physics/physics");
var ballmesh_1 = require("../view/ballmesh");
var State;
(function (State) {
    State["Stationary"] = "Stationary";
    State["Rolling"] = "Rolling";
    State["Sliding"] = "Sliding";
    State["Falling"] = "Falling";
    State["InPocket"] = "InPocket";
})(State || (exports.State = State = {}));
var Ball = /** @class */ (function () {
    function Ball(pos, color, isStripe, ballNumber) {
        if (isStripe === void 0) { isStripe = false; }
        this.vel = utils_1.zero.clone();
        this.rvel = utils_1.zero.clone();
        this.futurePos = utils_1.zero.clone();
        this.state = State.Stationary;
        // interpolation targets for server-authoritative updates
        this.targetPos = null;
        this.interpStart = utils_1.zero.clone();
        this.interpTimeLeft = 0;
        this.interpTotal = 0;
        this.targetVel = utils_1.zero.clone();
        this.id = Ball.id++;
        this.pos = pos.clone();
        this.ballmesh = new ballmesh_1.BallMesh(color || 0xeeeeee * Math.random(), isStripe, ballNumber);
    }
    Ball.prototype.update = function (t) {
        this.updatePosition(t);
        if (this.state == State.Falling) {
            this.pocket.updateFall(this, t);
        }
        else {
            this.updateVelocity(t);
        }
    };
    Ball.prototype.updateMesh = function (t) {
        this.ballmesh.updateAll(this, t);
    };
    Ball.prototype.updatePosition = function (t) {
        // If we're interpolating towards a server authoritative state, lerp the position
        if (this.interpTimeLeft > 0 && this.targetPos) {
            this.interpTimeLeft = Math.max(0, this.interpTimeLeft - t);
            var used = this.interpTotal - this.interpTimeLeft;
            var frac = this.interpTotal > 0 ? used / this.interpTotal : 1;
            this.pos.copy(this.interpStart).lerp(this.targetPos, frac);
            if (this.interpTimeLeft === 0) {
                // finished interpolation, snap to target velocity/state
                this.vel.copy(this.targetVel);
                this.targetPos = null;
            }
            return;
        }
        this.pos.addScaledVector(this.vel, t);
    };
    /**
     * Accept an authoritative state from server. A non-zero duration will smoothly
     * interpolate the visible position towards the authoritative position.
     */
    Ball.prototype.setServerState = function (data, duration) {
        var _a, _b, _c, _d;
        if (duration === void 0) { duration = 0.1; }
        if (data.pos) {
            var p = data.pos;
            this.targetPos = new three_1.Vector3(p.x, p.y, (_a = p.z) !== null && _a !== void 0 ? _a : 0);
            this.interpStart.copy(this.pos);
            this.interpTimeLeft = duration;
            this.interpTotal = duration;
        }
        else {
            this.targetPos = null;
            this.interpTimeLeft = 0;
            this.interpTotal = 0;
        }
        if (data.vel) {
            this.targetVel.set((_b = data.vel.x) !== null && _b !== void 0 ? _b : 0, (_c = data.vel.y) !== null && _c !== void 0 ? _c : 0, (_d = data.vel.z) !== null && _d !== void 0 ? _d : 0);
        }
        else {
            this.targetVel.copy(utils_1.zero);
        }
        if (data.rvel) {
            this.rvel.copy(data.rvel);
        }
        if (data.state) {
            this.state = data.state;
        }
        if (duration === 0 && this.targetPos) {
            // apply immediately
            this.pos.copy(this.targetPos);
            this.vel.copy(this.targetVel);
            this.targetPos = null;
            this.interpTimeLeft = 0;
        }
    };
    Ball.prototype.updateVelocity = function (t) {
        if (this.inMotion()) {
            if (this.isRolling()) {
                this.state = State.Rolling;
                (0, physics_1.forceRoll)(this.vel, this.rvel);
                this.addDelta(t, (0, physics_1.rollingFull)(this.rvel));
            }
            else {
                this.state = State.Sliding;
                this.addDelta(t, (0, physics_1.sliding)(this.vel, this.rvel));
            }
        }
    };
    Ball.prototype.addDelta = function (t, delta) {
        delta.v.multiplyScalar(t);
        delta.w.multiplyScalar(t);
        if (!this.passesZero(delta)) {
            this.vel.add(delta.v);
            this.rvel.add(delta.w);
        }
    };
    Ball.prototype.passesZero = function (delta) {
        var vz = (0, utils_1.passesThroughZero)(this.vel, delta.v);
        var wz = (0, utils_1.passesThroughZero)(this.rvel, delta.w);
        var halts = this.state === State.Rolling ? vz || wz : vz && wz;
        if (halts && Math.abs(this.rvel.z) < 0.01) {
            this.setStationary();
            return true;
        }
        return false;
    };
    Ball.prototype.setStationary = function () {
        this.vel.copy(utils_1.zero);
        this.rvel.copy(utils_1.zero);
        this.state = State.Stationary;
    };
    Ball.prototype.isRolling = function () {
        return (this.vel.lengthSq() !== 0 &&
            this.rvel.lengthSq() !== 0 &&
            (0, physics_1.surfaceVelocityFull)(this.vel, this.rvel).length() < Ball.transition);
    };
    Ball.prototype.onTable = function () {
        return this.state !== State.Falling && this.state !== State.InPocket;
    };
    Ball.prototype.inMotion = function () {
        return (this.state === State.Rolling ||
            this.state === State.Sliding ||
            this.isFalling());
    };
    Ball.prototype.isFalling = function () {
        return this.state === State.Falling;
    };
    Ball.prototype.futurePosition = function (t) {
        this.futurePos.copy(this.pos).addScaledVector(this.vel, t);
        return this.futurePos;
    };
    Ball.prototype.fround = function () {
        this.pos.x = Math.fround(this.pos.x);
        this.pos.y = Math.fround(this.pos.y);
        this.vel.x = Math.fround(this.vel.x);
        this.vel.y = Math.fround(this.vel.y);
        this.rvel.x = Math.fround(this.rvel.x);
        this.rvel.y = Math.fround(this.rvel.y);
        this.rvel.z = Math.fround(this.rvel.z);
    };
    Ball.prototype.serialise = function () {
        return {
            pos: this.pos.clone(),
            id: this.id,
        };
    };
    Ball.fromSerialised = function (data) {
        return Ball.updateFromSerialised(new Ball((0, utils_1.vec)(data.pos)), data);
    };
    Ball.updateFromSerialised = function (b, data) {
        var _a, _b;
        b.pos.copy(data.pos);
        b.vel.copy((_a = data === null || data === void 0 ? void 0 : data.vel) !== null && _a !== void 0 ? _a : utils_1.zero);
        b.rvel.copy((_b = data === null || data === void 0 ? void 0 : data.rvel) !== null && _b !== void 0 ? _b : utils_1.zero);
        b.state = State.Stationary;
        return b;
    };
    Ball.id = 0;
    Ball.transition = 0.05;
    return Ball;
}());
exports.Ball = Ball;
//# sourceMappingURL=ball.js.map