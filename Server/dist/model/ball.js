"use strict";
/**
 * Ball state - EXACT MATCH with client src/model/ball.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ball = exports.State = void 0;
const utils_1 = require("../physics/utils");
const physics_1 = require("../physics/physics");
var State;
(function (State) {
    State["Stationary"] = "Stationary";
    State["Rolling"] = "Rolling";
    State["Sliding"] = "Sliding";
    State["Falling"] = "Falling";
    State["InPocket"] = "InPocket";
})(State || (exports.State = State = {}));
class Ball {
    constructor(pos, id, ballNumber) {
        this.vel = utils_1.zero.clone();
        this.rvel = utils_1.zero.clone();
        this.futurePos = utils_1.zero.clone();
        this.state = State.Stationary;
        this.pocket = null;
        this.pos = pos.clone();
        this.id = id !== undefined ? id : Ball.id++;
        this.ballNumber = ballNumber;
    }
    static resetIdCounter() {
        Ball.id = 0;
    }
    update(t) {
        this.updatePosition(t);
        if (this.state === State.Falling && this.pocket) {
            this.pocket.updateFall(this, t);
        }
        else {
            this.updateVelocity(t);
        }
    }
    updatePosition(t) {
        this.pos.addScaledVector(this.vel, t);
    }
    updateVelocity(t) {
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
    }
    addDelta(t, delta) {
        delta.v.multiplyScalar(t);
        delta.w.multiplyScalar(t);
        if (!this.passesZero(delta)) {
            this.vel.add(delta.v);
            this.rvel.add(delta.w);
        }
    }
    passesZero(delta) {
        const vz = (0, utils_1.passesThroughZero)(this.vel, delta.v);
        const wz = (0, utils_1.passesThroughZero)(this.rvel, delta.w);
        const halts = this.state === State.Rolling ? vz || wz : vz && wz;
        if (halts && Math.abs(this.rvel.z) < 0.01) {
            this.setStationary();
            return true;
        }
        return false;
    }
    setStationary() {
        this.vel.copy(utils_1.zero);
        this.rvel.copy(utils_1.zero);
        this.state = State.Stationary;
    }
    isRolling() {
        return (this.vel.lengthSq() !== 0 &&
            this.rvel.lengthSq() !== 0 &&
            (0, physics_1.surfaceVelocityFull)(this.vel, this.rvel).length() < Ball.transition);
    }
    onTable() {
        return this.state !== State.Falling && this.state !== State.InPocket;
    }
    inMotion() {
        return (this.state === State.Rolling ||
            this.state === State.Sliding ||
            this.isFalling());
    }
    isFalling() {
        return this.state === State.Falling;
    }
    futurePosition(t) {
        this.futurePos.copy(this.pos).addScaledVector(this.vel, t);
        return this.futurePos;
    }
    fround() {
        this.pos.x = Math.fround(this.pos.x);
        this.pos.y = Math.fround(this.pos.y);
        this.vel.x = Math.fround(this.vel.x);
        this.vel.y = Math.fround(this.vel.y);
        this.rvel.x = Math.fround(this.rvel.x);
        this.rvel.y = Math.fround(this.rvel.y);
        this.rvel.z = Math.fround(this.rvel.z);
    }
    serialise() {
        return {
            id: this.id,
            pos: { x: this.pos.x, y: this.pos.y, z: this.pos.z },
            vel: { x: this.vel.x, y: this.vel.y, z: this.vel.z },
            rvel: { x: this.rvel.x, y: this.rvel.y, z: this.rvel.z },
            state: this.state,
            ballNumber: this.ballNumber,
        };
    }
    static fromSerialised(data) {
        const ball = new Ball(new utils_1.Vector3(data.pos.x, data.pos.y, data.pos.z), data.id, data.ballNumber);
        ball.vel.set(data.vel.x, data.vel.y, data.vel.z);
        ball.rvel.set(data.rvel.x, data.rvel.y, data.rvel.z);
        ball.state = data.state;
        return ball;
    }
    updateFromSerialised(data) {
        this.pos.set(data.pos.x, data.pos.y, data.pos.z);
        this.vel.set(data.vel.x, data.vel.y, data.vel.z);
        this.rvel.set(data.rvel.x, data.rvel.y, data.rvel.z);
        this.state = data.state;
    }
}
exports.Ball = Ball;
Ball.id = 0;
Ball.transition = 0.05;
//# sourceMappingURL=ball.js.map