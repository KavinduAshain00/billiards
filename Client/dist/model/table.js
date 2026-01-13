"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Table = void 0;
var cushion_1 = require("./physics/cushion");
var collision_1 = require("./physics/collision");
var knuckle_1 = require("./physics/knuckle");
var pocket_1 = require("./physics/pocket");
var cue_1 = require("../view/cue");
var ball_1 = require("./ball");
var aimevent_1 = require("../events/aimevent");
var tablegeometry_1 = require("../view/tablegeometry");
var outcome_1 = require("./outcome");
var pocketgeometry_1 = require("../view/pocketgeometry");
var physics_1 = require("./physics/physics");
var utils_1 = require("../utils/utils");
var constants_1 = require("./physics/constants");
var Table = /** @class */ (function () {
    function Table(balls) {
        this.cue = new cue_1.Cue();
        this.outcome = [];
        this.cushionModel = physics_1.bounceHanBlend;
        this.cueball = balls[0];
        this.initialiseBalls(balls);
    }
    Table.prototype.initialiseBalls = function (balls) {
        this.balls = balls;
        this.pairs = [];
        for (var a = 0; a < balls.length; a++) {
            for (var b = 0; b < balls.length; b++) {
                if (a < b) {
                    this.pairs.push({ a: balls[a], b: balls[b] });
                }
            }
        }
    };
    Table.prototype.updateBallMesh = function (t) {
        this.balls.forEach(function (a) {
            a.updateMesh(t);
        });
    };
    Table.prototype.advance = function (t) {
        var depth = 0;
        while (!this.prepareAdvanceAll(t)) {
            if (depth++ > 100) {
                throw new Error("Depth exceeded resolving collisions");
            }
        }
        this.balls.forEach(function (a) {
            a.update(t);
            a.fround();
        });
    };
    /**
     * Returns true if all balls can advance by t without collision
     *
     */
    Table.prototype.prepareAdvanceAll = function (t) {
        var _this = this;
        return (this.pairs.every(function (pair) { return _this.prepareAdvancePair(pair.a, pair.b, t); }) &&
            this.balls.every(function (ball) { return _this.prepareAdvanceToCushions(ball, t); }));
    };
    /**
     * Returns true if a pair of balls can advance by t without any collision.
     * If there is a collision, adjust velocity appropriately.
     *
     */
    Table.prototype.prepareAdvancePair = function (a, b, t) {
        if (collision_1.Collision.willCollide(a, b, t)) {
            var incidentSpeed = collision_1.Collision.collide(a, b);
            this.outcome.push(outcome_1.Outcome.collision(a, b, incidentSpeed));
            return false;
        }
        return true;
    };
    /**
     * Returns true if ball can advance by t without hitting cushion, knuckle or pocket.
     * If there is a collision, adjust velocity appropriately.
     *
     */
    Table.prototype.prepareAdvanceToCushions = function (a, t) {
        if (!a.onTable()) {
            return true;
        }
        var futurePosition = a.futurePosition(t);
        if (Math.abs(futurePosition.y) < tablegeometry_1.TableGeometry.tableY &&
            Math.abs(futurePosition.x) < tablegeometry_1.TableGeometry.tableX) {
            return true;
        }
        var incidentSpeed = cushion_1.Cushion.bounceAny(a, t, tablegeometry_1.TableGeometry.hasPockets, this.cushionModel);
        if (incidentSpeed) {
            this.outcome.push(outcome_1.Outcome.cushion(a, incidentSpeed));
            return false;
        }
        var k = knuckle_1.Knuckle.findBouncing(a, t);
        if (k) {
            var knuckleIncidentSpeed = k.bounce(a);
            this.outcome.push(outcome_1.Outcome.cushion(a, knuckleIncidentSpeed));
            return false;
        }
        var p = pocket_1.Pocket.findPocket(pocketgeometry_1.PocketGeometry.pocketCenters, a, t);
        if (p) {
            var pocketIncidentSpeed = p.fall(a, t);
            this.outcome.push(outcome_1.Outcome.pot(a, pocketIncidentSpeed));
            return false;
        }
        return true;
    };
    Table.prototype.allStationary = function () {
        return this.balls.every(function (b) { return !b.inMotion(); });
    };
    Table.prototype.inPockets = function () {
        return this.balls.reduce(function (acc, b) { return (b.onTable() ? acc : acc + 1); }, 0);
    };
    Table.prototype.hit = function () {
        this.cue.hit(this.cueball);
        this.balls.forEach(function (b) {
            b.ballmesh.trace.reset();
        });
    };
    Table.prototype.serialise = function () {
        return {
            balls: this.balls.map(function (b) { return b.serialise(); }),
            aim: this.cue.aim.copy(),
        };
    };
    Table.fromSerialised = function (data) {
        var table = new Table(data.balls.map(function (b) { return ball_1.Ball.fromSerialised(b); }));
        table.updateFromSerialised(data);
        return table;
    };
    Table.prototype.updateFromSerialised = function (data) {
        var _this = this;
        if (data.balls) {
            data.balls.forEach(function (b) { return ball_1.Ball.updateFromSerialised(_this.balls[b.id], b); });
        }
        if (data.aim) {
            this.cue.aim = aimevent_1.AimEvent.fromJson(data.aim);
        }
    };
    /**
     * Apply server authoritative state. By default this will interpolate visible
     * ball positions over a short duration to hide corrections. A duration of 0
     * will snap immediately.
     */
    Table.prototype.applyAuthoritativeState = function (data, duration) {
        var _this = this;
        if (duration === void 0) { duration = 0.1; }
        if (data.balls) {
            data.balls.forEach(function (b) {
                var local = _this.balls[b.id];
                if (local) {
                    local.setServerState(b, duration);
                }
            });
        }
        if (data.aim) {
            this.cue.aim = aimevent_1.AimEvent.fromJson(data.aim);
        }
    };
    Table.prototype.shortSerialise = function () {
        return this.balls
            .map(function (b) { return [b.pos.x, b.pos.y]; })
            .reduce(function (acc, val) { return acc.concat(val); }, []);
    };
    Table.prototype.updateFromShortSerialised = function (data) {
        this.balls.forEach(function (b, i) {
            b.pos.x = data[i * 2];
            b.pos.y = data[i * 2 + 1];
            b.pos.z = 0;
            b.vel.copy(utils_1.zero);
            b.rvel.copy(utils_1.zero);
            b.state = ball_1.State.Stationary;
        });
    };
    Table.prototype.addToScene = function (scene) {
        this.balls.forEach(function (b) {
            b.ballmesh.addToScene(scene);
        });
        scene.add(this.cue.mesh);
        scene.add(this.cue.helperMesh);
        scene.add(this.cue.placerMesh);
    };
    Table.prototype.showTraces = function (bool) {
        this.balls.forEach(function (b) {
            b.ballmesh.trace.line.visible = bool;
            b.ballmesh.trace.reset();
        });
    };
    Table.prototype.showSpin = function (bool) {
        this.balls.forEach(function (b) {
            b.ballmesh.spinAxisArrow.visible = bool;
        });
    };
    Table.prototype.halt = function () {
        this.balls.forEach(function (b) {
            b.vel.copy(utils_1.zero);
            b.rvel.copy(utils_1.zero);
            b.state = ball_1.State.Stationary;
        });
    };
    Table.prototype.roundCueBallPosition = function () {
        var pos = this.cueball.pos.clone();
        if (this.overlapsAny(pos)) {
            return;
        }
        this.cueball.pos.copy(pos);
    };
    Table.prototype.overlapsAny = function (pos, excluding) {
        if (excluding === void 0) { excluding = this.cueball; }
        return this.balls
            .filter(function (b) { return b !== excluding; })
            .some(function (b) { return b.pos.distanceTo(pos) < 2 * constants_1.R; });
    };
    return Table;
}());
exports.Table = Table;
//# sourceMappingURL=table.js.map