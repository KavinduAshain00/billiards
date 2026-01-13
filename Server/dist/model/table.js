"use strict";
/**
 * Server-side Table - EXACT MATCH with client src/model/table.ts
 * Authoritative physics simulation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Table = void 0;
const ball_1 = require("./ball");
const collision_1 = require("./collision");
const cushion_1 = require("./cushion");
const knuckle_1 = require("./knuckle");
const pocket_1 = require("./pocket");
const tablegeometry_1 = require("./tablegeometry");
const pocketgeometry_1 = require("./pocketgeometry");
const physics_1 = require("../physics/physics");
const utils_1 = require("../physics/utils");
const constants_1 = require("../physics/constants");
const physics_2 = require("../physics/physics");
class Table {
    constructor(balls) {
        this.outcome = [];
        this.cushionModel = physics_1.bounceHanBlend;
        this.hasPockets = true;
        this.cueball = balls[0];
        this.initialiseBalls(balls);
    }
    initialiseBalls(balls) {
        this.balls = balls;
        this.pairs = [];
        for (let a = 0; a < balls.length; a++) {
            for (let b = 0; b < balls.length; b++) {
                if (a < b) {
                    this.pairs.push({ a: balls[a], b: balls[b] });
                }
            }
        }
    }
    advance(t) {
        let depth = 0;
        while (!this.prepareAdvanceAll(t)) {
            if (depth++ > 100) {
                throw new Error("Depth exceeded resolving collisions");
            }
        }
        this.balls.forEach((a) => {
            a.update(t);
            a.fround();
        });
    }
    prepareAdvanceAll(t) {
        return (this.pairs.every((pair) => this.prepareAdvancePair(pair.a, pair.b, t)) &&
            this.balls.every((ball) => this.prepareAdvanceToCushions(ball, t)));
    }
    prepareAdvancePair(a, b, t) {
        if (collision_1.Collision.willCollide(a, b, t)) {
            const incidentSpeed = collision_1.Collision.collide(a, b);
            this.outcome.push({
                type: "collision",
                ballId: a.id,
                ballId2: b.id,
                speed: incidentSpeed,
            });
            return false;
        }
        return true;
    }
    prepareAdvanceToCushions(a, t) {
        if (!a.onTable()) {
            return true;
        }
        const futurePosition = a.futurePosition(t);
        if (Math.abs(futurePosition.y) < tablegeometry_1.TableGeometry.tableY &&
            Math.abs(futurePosition.x) < tablegeometry_1.TableGeometry.tableX) {
            return true;
        }
        const incidentSpeed = cushion_1.Cushion.bounceAny(a, t, this.hasPockets, this.cushionModel);
        if (incidentSpeed !== undefined) {
            this.outcome.push({
                type: "cushion",
                ballId: a.id,
                speed: incidentSpeed,
            });
            return false;
        }
        const k = knuckle_1.Knuckle.findBouncing(a, t, pocketgeometry_1.PocketGeometry.knuckles);
        if (k) {
            const knuckleIncidentSpeed = k.bounce(a);
            this.outcome.push({
                type: "cushion",
                ballId: a.id,
                speed: knuckleIncidentSpeed,
            });
            return false;
        }
        const p = pocket_1.Pocket.findPocket(pocketgeometry_1.PocketGeometry.pocketCenters, a, t);
        if (p) {
            const pocketIncidentSpeed = p.fall(a, t);
            this.outcome.push({
                type: "pot",
                ballId: a.id,
                speed: pocketIncidentSpeed,
            });
            return false;
        }
        return true;
    }
    allStationary() {
        return this.balls.every((b) => !b.inMotion());
    }
    inPockets() {
        return this.balls.reduce((acc, b) => (b.onTable() ? acc : acc + 1), 0);
    }
    hit(aim) {
        const ball = this.cueball;
        ball.state = ball_1.State.Sliding;
        ball.vel.copy((0, utils_1.unitAtAngle)(aim.angle).multiplyScalar(aim.power));
        const offset = new utils_1.Vector3(aim.offset.x, aim.offset.y, aim.offset.z);
        ball.rvel.copy((0, physics_2.cueToSpin)(offset, ball.vel));
    }
    serialise() {
        return {
            balls: this.balls.map((b) => b.serialise()),
        };
    }
    snapshot(serverTick) {
        const outcomes = [...this.outcome];
        this.outcome = [];
        return {
            timestamp: Date.now(),
            serverTick,
            balls: this.balls.map((b) => b.serialise()),
            isStationary: this.allStationary(),
            outcomes,
        };
    }
    /**
     * Create optimized snapshot with delta compression
     * Only includes balls that have moved significantly
     */
    deltaSnapshot(serverTick, prevSnapshot) {
        const outcomes = [...this.outcome];
        this.outcome = [];
        const POSITION_THRESHOLD = 0.001; // 1mm movement threshold
        const VELOCITY_THRESHOLD = 0.01; // Velocity change threshold
        let balls;
        if (prevSnapshot) {
            // Delta compression: only include balls that changed
            balls = this.balls
                .map((b) => b.serialise())
                .filter((ball) => {
                const prev = prevSnapshot.balls.find((p) => p.id === ball.id);
                if (!prev)
                    return true; // New ball
                // Check if position changed significantly
                const posDelta = Math.sqrt(Math.pow(ball.pos.x - prev.pos.x, 2) +
                    Math.pow(ball.pos.y - prev.pos.y, 2) +
                    Math.pow(ball.pos.z - prev.pos.z, 2));
                // Check if velocity changed significantly
                const velDelta = Math.sqrt(Math.pow(ball.vel.x - prev.vel.x, 2) +
                    Math.pow(ball.vel.y - prev.vel.y, 2) +
                    Math.pow(ball.vel.z - prev.vel.z, 2));
                return posDelta > POSITION_THRESHOLD || velDelta > VELOCITY_THRESHOLD || ball.state !== prev.state;
            });
        }
        else {
            // Full snapshot if no previous
            balls = this.balls.map((b) => b.serialise());
        }
        return {
            timestamp: Date.now(),
            serverTick,
            balls,
            isStationary: this.allStationary(),
            outcomes,
        };
    }
    /**
     * Get current outcomes without clearing them
     */
    getOutcomes() {
        return [...this.outcome];
    }
    /**
     * Clear all outcomes
     */
    clearOutcomes() {
        this.outcome = [];
    }
    static fromSerialised(data) {
        ball_1.Ball.resetIdCounter();
        const balls = data.balls.map((b) => ball_1.Ball.fromSerialised(b));
        return new Table(balls);
    }
    updateFromSerialised(data) {
        if (data.balls) {
            data.balls.forEach((b) => {
                const ball = this.balls.find((ball) => ball.id === b.id);
                if (ball) {
                    ball.updateFromSerialised(b);
                }
            });
        }
    }
    halt() {
        this.balls.forEach((b) => {
            b.vel.copy(utils_1.zero);
            b.rvel.copy(utils_1.zero);
            b.state = ball_1.State.Stationary;
        });
    }
    overlapsAny(pos, excluding = this.cueball) {
        return this.balls
            .filter((b) => b !== excluding)
            .some((b) => b.pos.distanceTo(pos) < 2 * constants_1.R);
    }
}
exports.Table = Table;
//# sourceMappingURL=table.js.map