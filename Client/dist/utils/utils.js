"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = exports.zero = void 0;
exports.vec = vec;
exports.upCross = upCross;
exports.norm = norm;
exports.passesThroughZero = passesThroughZero;
exports.unitAtAngle = unitAtAngle;
exports.round = round;
exports.round2 = round2;
exports.roundVec = roundVec;
exports.roundVec2 = roundVec2;
exports.atan2 = atan2;
exports.pow = pow;
exports.sin = sin;
exports.cos = cos;
exports.sqrt = sqrt;
exports.exp = exp;
var three_1 = require("three");
exports.zero = new three_1.Vector3(0, 0, 0);
exports.up = new three_1.Vector3(0, 0, 1);
function vec(v) {
    return new three_1.Vector3(v.x, v.y, v.z);
}
var upCrossVec = new three_1.Vector3();
function upCross(v) {
    return upCrossVec.copy(exports.up).cross(v);
}
var normVec = new three_1.Vector3();
function norm(v) {
    return normVec.copy(v).normalize();
}
var vc = new three_1.Vector3();
function passesThroughZero(v, dv) {
    return vc.copy(v).add(dv).dot(v) <= 0;
}
function unitAtAngle(theta) {
    return new three_1.Vector3(1, 0, 0).applyAxisAngle(exports.up, theta);
}
function round(num) {
    var sign = Math.sign(num);
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
function roundVec2(v) {
    v.x = round2(v.x);
    v.y = round2(v.y);
    v.z = round2(v.z);
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