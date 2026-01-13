"use strict";
/**
 * Math utilities - EXACT MATCH with client src/utils/utils.ts
 * All functions use Math.fround() for deterministic floating point
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = exports.zero = exports.Vector3 = void 0;
exports.vec = vec;
exports.upCross = upCross;
exports.norm = norm;
exports.passesThroughZero = passesThroughZero;
exports.unitAtAngle = unitAtAngle;
exports.round = round;
exports.round2 = round2;
exports.roundVec = roundVec;
exports.atan2 = atan2;
exports.pow = pow;
exports.sin = sin;
exports.cos = cos;
exports.sqrt = sqrt;
exports.exp = exp;
class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    setX(x) {
        this.x = x;
        return this;
    }
    setY(y) {
        this.y = y;
        return this;
    }
    setZ(z) {
        this.z = z;
        return this;
    }
    clone() {
        return new Vector3(this.x, this.y, this.z);
    }
    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }
    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }
    addScaledVector(v, s) {
        this.x += v.x * s;
        this.y += v.y * s;
        this.z += v.z * s;
        return this;
    }
    multiplyScalar(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }
    divideScalar(s) {
        return this.multiplyScalar(1 / s);
    }
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    lengthSq() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    normalize() {
        return this.divideScalar(this.length() || 1);
    }
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    cross(v) {
        const ax = this.x, ay = this.y, az = this.z;
        const bx = v.x, by = v.y, bz = v.z;
        this.x = ay * bz - az * by;
        this.y = az * bx - ax * bz;
        this.z = ax * by - ay * bx;
        return this;
    }
    distanceTo(v) {
        return Math.sqrt(this.distanceToSquared(v));
    }
    distanceToSquared(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }
    applyAxisAngle(axis, angle) {
        const halfAngle = angle / 2;
        const s = Math.sin(halfAngle);
        const qx = axis.x * s;
        const qy = axis.y * s;
        const qz = axis.z * s;
        const qw = Math.cos(halfAngle);
        const ix = qw * this.x + qy * this.z - qz * this.y;
        const iy = qw * this.y + qz * this.x - qx * this.z;
        const iz = qw * this.z + qx * this.y - qy * this.x;
        const iw = -qx * this.x - qy * this.y - qz * this.z;
        this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
        return this;
    }
    lerp(v, alpha) {
        this.x += (v.x - this.x) * alpha;
        this.y += (v.y - this.y) * alpha;
        this.z += (v.z - this.z) * alpha;
        return this;
    }
}
exports.Vector3 = Vector3;
exports.zero = new Vector3(0, 0, 0);
exports.up = new Vector3(0, 0, 1);
function vec(v) {
    return new Vector3(v.x, v.y, v.z ?? 0);
}
const upCrossVec = new Vector3();
function upCross(v) {
    return upCrossVec.copy(exports.up).cross(v);
}
const normVec = new Vector3();
function norm(v) {
    return normVec.copy(v).normalize();
}
const vc = new Vector3();
function passesThroughZero(v, dv) {
    return vc.copy(v).add(dv).dot(v) <= 0;
}
function unitAtAngle(theta) {
    return new Vector3(1, 0, 0).applyAxisAngle(exports.up, theta);
}
function round(num) {
    const sign = Math.sign(num);
    return (sign * Math.floor((Math.abs(num) + Number.EPSILON) * 10000)) / 10000;
}
function round2(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}
function roundVec(v) {
    v.x = round(v.x);
    v.y = round(v.y);
    v.z = round(v.z);
    return v;
}
function atan2(y, x) {
    return Math.fround(Math.atan2(y, x));
}
function pow(y, x) {
    return Math.fround(Math.pow(y, x));
}
function sin(theta) {
    return Math.fround(Math.sin(theta));
}
function cos(theta) {
    return Math.fround(Math.cos(theta));
}
function sqrt(theta) {
    return Math.fround(Math.sqrt(theta));
}
function exp(theta) {
    return Math.fround(Math.exp(theta));
}
//# sourceMappingURL=utils.js.map