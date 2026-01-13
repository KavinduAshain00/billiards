"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trace = void 0;
var three_1 = require("three");
var constants_1 = require("../model/physics/constants");
var Trace = /** @class */ (function () {
    function Trace(size, colour) {
        this.lastPos = new three_1.Vector3();
        this.lastVel = new three_1.Vector3();
        this.geometry = new three_1.BufferGeometry();
        this.positions = new Float32Array(size * 3);
        this.geometry.setAttribute("position", new three_1.BufferAttribute(this.positions, 3));
        this.reset();
        var material = new three_1.LineBasicMaterial({
            color: colour,
            opacity: 0.25,
            linewidth: 3,
            transparent: true,
        });
        this.line = new three_1.Line(this.geometry, material);
        this.line.visible = false;
    }
    Trace.prototype.reset = function () {
        this.geometry.setDrawRange(0, 0);
        this.lastVel.setZ(1);
    };
    Trace.prototype.forceTrace = function (pos) {
        this.lastVel.z = 1;
        this.addTraceGiven(pos, this.lastVel, 1, 0.1, 1);
    };
    Trace.prototype.addTrace = function (pos, vel) {
        if (vel.length() === 0) {
            return;
        }
        var curvature = this.lastVel.angleTo(vel);
        var delta = curvature > Math.PI / 32 ? 0.01 * constants_1.R : constants_1.R;
        var distance = this.lastPos.distanceTo(pos);
        this.addTraceGiven(pos, vel, distance, delta, curvature);
    };
    Trace.prototype.addTraceGiven = function (pos, vel, distance, delta, curvature) {
        var index = this.geometry.drawRange.count;
        if (index !== 0 && distance < delta) {
            return;
        }
        if (index > 1 && curvature < 0.0001) {
            index--;
        }
        this.lastPos.copy(pos);
        this.lastVel.copy(vel);
        this.addPoint(pos, index);
    };
    Trace.prototype.addPoint = function (pos, i) {
        var index = i * 3;
        if (index > this.positions.length) {
            return;
        }
        this.positions[index++] = pos.x;
        this.positions[index++] = pos.y;
        this.positions[index] = pos.z;
        this.geometry.setDrawRange(0, i + 1);
        this.line.geometry.attributes.position.needsUpdate = true;
    };
    return Trace;
}());
exports.Trace = Trace;
//# sourceMappingURL=trace.js.map