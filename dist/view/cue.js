"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cue = void 0;
var tablegeometry_1 = require("../view/tablegeometry");
var utils_1 = require("../utils/utils");
var aimevent_1 = require("../events/aimevent");
var ball_1 = require("../model/ball");
var physics_1 = require("../model/physics/physics");
var cuemesh_1 = require("./cuemesh");
var three_1 = require("three");
var constants_1 = require("../model/physics/constants");
var Cue = /** @class */ (function () {
    function Cue() {
        this.offCenterLimit = 0.3;
        this.maxPower = 160 * constants_1.R;
        this.t = 0;
        this.aim = new aimevent_1.AimEvent();
        this.length = tablegeometry_1.TableGeometry.tableX * 1;
        this.mesh = cuemesh_1.CueMesh.createCue((constants_1.R * 0.05) / 0.5, (constants_1.R * 0.15) / 0.5, this.length);
        this.helperMesh = cuemesh_1.CueMesh.createHelper();
        this.placerMesh = cuemesh_1.CueMesh.createPlacer();
    }
    Cue.prototype.rotateAim = function (angle, table) {
        this.aim.angle = this.aim.angle + angle;
        this.mesh.rotation.z = this.aim.angle;
        this.helperMesh.rotation.z = this.aim.angle;
        this.aimInputs.showOverlap();
        this.avoidCueTouchingOtherBall(table);
    };
    Cue.prototype.adjustPower = function (delta) {
        this.aim.power = Math.min(this.maxPower, this.aim.power + delta);
        this.updateAimInput();
    };
    Cue.prototype.setPower = function (value) {
        this.aim.power = value * this.maxPower;
    };
    Cue.prototype.hit = function (ball) {
        var aim = this.aim;
        this.t = 0;
        ball.state = ball_1.State.Sliding;
        ball.vel.copy((0, utils_1.unitAtAngle)(aim.angle).multiplyScalar(aim.power));
        ball.rvel.copy((0, physics_1.cueToSpin)(aim.offset, ball.vel));
    };
    Cue.prototype.aimAtNext = function (cueball, ball) {
        if (!ball) {
            return;
        }
        var lineTo = (0, utils_1.norm)(ball.pos.clone().sub(cueball.pos));
        this.aim.angle = (0, utils_1.atan2)(lineTo.y, lineTo.x);
    };
    Cue.prototype.adjustSpin = function (delta, table) {
        var originalOffset = this.aim.offset.clone();
        var newOffset = originalOffset.clone().add(delta);
        this.setSpin(newOffset, table);
    };
    Cue.prototype.setSpin = function (offset, table) {
        if (offset.length() > this.offCenterLimit) {
            offset.normalize().multiplyScalar(this.offCenterLimit);
        }
        this.aim.offset.copy(offset);
        this.avoidCueTouchingOtherBall(table);
        this.updateAimInput();
    };
    Cue.prototype.avoidCueTouchingOtherBall = function (table) {
        var n = 0;
        while (n++ < 20 && this.intersectsAnything(table)) {
            this.aim.offset.y += 0.1;
            if (this.aim.offset.length() > this.offCenterLimit) {
                this.aim.offset.normalize().multiplyScalar(this.offCenterLimit);
            }
        }
        if (n > 1) {
            this.updateAimInput();
        }
    };
    Cue.prototype.updateAimInput = function () {
        var _a, _b, _c;
        (_a = this.aimInputs) === null || _a === void 0 ? void 0 : _a.updateVisualState(this.aim.offset.x, this.aim.offset.y);
        (_b = this.aimInputs) === null || _b === void 0 ? void 0 : _b.updatePowerSlider(this.aim.power / this.maxPower);
        (_c = this.aimInputs) === null || _c === void 0 ? void 0 : _c.showOverlap();
    };
    Cue.prototype.moveTo = function (pos) {
        this.aim.pos.copy(pos);
        this.mesh.rotation.z = this.aim.angle;
        this.helperMesh.rotation.z = this.aim.angle;
        var offset = this.spinOffset();
        var swing = ((0, utils_1.sin)(this.t + Math.PI / 2) - 1) * 2 * constants_1.R * (this.aim.power / this.maxPower);
        var distanceToBall = (0, utils_1.unitAtAngle)(this.aim.angle)
            .clone()
            .multiplyScalar(swing);
        this.mesh.position.copy(pos.clone().add(offset).add(distanceToBall));
        this.helperMesh.position.copy(pos);
        this.placerMesh.position.copy(pos);
        this.placerMesh.rotation.z = this.t;
    };
    Cue.prototype.update = function (t) {
        this.t += t;
        this.moveTo(this.aim.pos);
    };
    Cue.prototype.placeBallMode = function () {
        this.mesh.visible = false;
        this.placerMesh.visible = true;
        this.aim.angle = 0;
    };
    Cue.prototype.aimMode = function () {
        this.mesh.visible = true;
        this.placerMesh.visible = false;
    };
    Cue.prototype.spinOffset = function () {
        return (0, utils_1.upCross)((0, utils_1.unitAtAngle)(this.aim.angle))
            .multiplyScalar(this.aim.offset.x * 2 * constants_1.R)
            .setZ(this.aim.offset.y * 2 * constants_1.R);
    };
    Cue.prototype.intersectsAnything = function (table) {
        var offset = this.spinOffset();
        var origin = table.cueball.pos.clone().add(offset);
        var direction = (0, utils_1.norm)((0, utils_1.unitAtAngle)(this.aim.angle + Math.PI).setZ(0.1));
        var raycaster = new three_1.Raycaster(origin, direction);
        var items = table.balls.map(function (b) { return b.ballmesh.mesh; });
        if (table.mesh) {
            items.push(table.mesh);
        }
        var intersections = raycaster.intersectObjects(items, true);
        return intersections.length > 0;
    };
    Cue.prototype.showHelper = function (b) {
        this.helperMesh.visible = b;
    };
    Cue.prototype.toggleHelper = function () {
        this.showHelper(!this.helperMesh.visible);
    };
    return Cue;
}());
exports.Cue = Cue;
//# sourceMappingURL=cue.js.map