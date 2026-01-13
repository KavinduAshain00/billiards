"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.surfaceVelocity = surfaceVelocity;
exports.surfaceVelocityFull = surfaceVelocityFull;
exports.sliding = sliding;
exports.rollingFull = rollingFull;
exports.forceRoll = forceRoll;
exports.rotateApplyUnrotate = rotateApplyUnrotate;
exports.s0 = s0;
exports.c0 = c0;
exports.Pzs = Pzs;
exports.Pze = Pze;
exports.isGripCushion = isGripCushion;
exports.bounceHan = bounceHan;
exports.bounceHanBlend = bounceHanBlend;
exports.muCushion = muCushion;
exports.restitutionCushion = restitutionCushion;
exports.mathavenAdapter = mathavenAdapter;
exports.cueToSpin = cueToSpin;
var three_1 = require("three");
var utils_1 = require("../../utils/utils");
var constants_1 = require("./constants");
var mathaven_1 = require("./mathaven");
function surfaceVelocity(v, w) {
    return surfaceVelocityFull(v, w).setZ(0);
}
var sv = new three_1.Vector3();
function surfaceVelocityFull(v, w) {
    return sv.copy(v).addScaledVector((0, utils_1.upCross)(w), constants_1.R);
}
var delta = { v: new three_1.Vector3(), w: new three_1.Vector3() };
Object.freeze(delta);
function sliding(v, w) {
    var va = surfaceVelocity(v, w);
    delta.v.copy((0, utils_1.norm)(va).multiplyScalar(-constants_1.muS * constants_1.g));
    delta.w.copy((0, utils_1.norm)((0, utils_1.upCross)(va)).multiplyScalar(((5 / 2) * constants_1.muS * constants_1.g) / constants_1.R));
    delta.w.setZ(-(5 / 2) * (constants_1.Mz / (constants_1.m * constants_1.R * constants_1.R)) * Math.sign(w.z));
    return delta;
}
function rollingFull(w) {
    var mag = new three_1.Vector3(w.x, w.y, 0).length();
    var k = ((5 / 7) * constants_1.Mxy) / (constants_1.m * constants_1.R) / mag;
    var kw = ((5 / 7) * constants_1.Mxy) / (constants_1.m * constants_1.R * constants_1.R) / mag;
    delta.v.set(-k * w.y, k * w.x, 0);
    delta.w.set(-kw * w.x, -kw * w.y, -(5 / 2) * (constants_1.Mz / (constants_1.m * constants_1.R * constants_1.R)) * Math.sign(w.z));
    return delta;
}
function forceRoll(v, w) {
    var wz = w.z;
    w.copy((0, utils_1.upCross)(v).multiplyScalar(1 / constants_1.R));
    w.setZ(wz);
}
function rotateApplyUnrotate(theta, v, w, model) {
    var vr = v.clone().applyAxisAngle(utils_1.up, theta);
    var wr = w.clone().applyAxisAngle(utils_1.up, theta);
    var delta = model(vr, wr);
    delta.v.applyAxisAngle(utils_1.up, -theta);
    delta.w.applyAxisAngle(utils_1.up, -theta);
    return delta;
}
// Han paper cushion physics
// cushion contact point epsilon above ball centre
var epsilon = constants_1.R * 0.1;
var theta_a = Math.asin(epsilon / constants_1.R);
var sin_a = (0, utils_1.sin)(theta_a);
var cos_a = (0, utils_1.cos)(theta_a);
function s0(v, w) {
    return new three_1.Vector3(v.x * sin_a - v.z * cos_a + constants_1.R * w.y, -v.y - constants_1.R * w.z * cos_a + constants_1.R * w.x * sin_a);
}
function c0(v) {
    return v.x * cos_a;
}
function Pzs(s) {
    var A = 7 / 2 / constants_1.m;
    return s.length() / A;
}
function Pze(c) {
    var B = 1 / constants_1.m;
    var coeff = restitutionCushion(new three_1.Vector3(c / cos_a, 0, 0));
    return (constants_1.muC * ((1 + coeff) * c)) / B;
}
function isGripCushion(v, w) {
    var Pze_val = Pze(c0(v));
    var Pzs_val = Pzs(s0(v, w));
    return Pzs_val <= Pze_val;
}
function basisHan(v, w) {
    return {
        c: c0(v),
        s: s0(v, w),
        A: 7 / 2 / constants_1.m,
        B: 1 / constants_1.m,
    };
}
function gripHan(v, w) {
    var _a = basisHan(v, w), c = _a.c, s = _a.s, A = _a.A, B = _a.B;
    var ecB = (1 + constants_1.e) * (c / B);
    var PX = (-s.x / A) * sin_a - ecB * cos_a;
    var PY = s.y / A;
    var PZ = (s.x / A) * cos_a - ecB * sin_a;
    return impulseToDelta(PX, PY, PZ);
}
function slipHan(v, w) {
    var _a = basisHan(v, w), c = _a.c, B = _a.B;
    var ecB = (1 + constants_1.e) * (c / B);
    var mu = muCushion(v);
    var phi = Math.atan2(v.y, v.x);
    var cos_phi = Math.cos(phi);
    var sin_phi = Math.sin(phi);
    var PX = -mu * ecB * cos_phi * cos_a - ecB * cos_a;
    var PY = mu * ecB * sin_phi;
    var PZ = mu * ecB * cos_phi * cos_a - ecB * sin_a;
    return impulseToDelta(PX, PY, PZ);
}
/**
 * Based directly on Han2005 paper.
 * Expects ball to be bouncing in +X plane.
 *
 * @param v ball velocity
 * @param w ball spin
 * @returns delta to apply to velocity and spin
 */
function bounceHan(v, w) {
    if (isGripCushion(v, w)) {
        return gripHan(v, w);
    }
    else {
        return slipHan(v, w);
    }
}
/**
 * Modification Han 2005 paper by Taylor to blend two bounce regimes.
 * Motive is to remove cliff edge discontinuity in original model.
 * Gives more realistic check side (reverse side played at steep angle)
 *
 * @param v ball velocity
 * @param w ball spin
 * @returns delta to apply to velocity and spin
 */
function bounceHanBlend(v, w) {
    var deltaGrip = gripHan(v, w);
    var deltaSlip = slipHan(v, w);
    var isCheckSide = Math.sign(v.y) === Math.sign(w.z);
    var factor = isCheckSide ? Math.cos(Math.atan2(v.y, v.x)) : 1;
    var delta = {
        v: deltaSlip.v.lerp(deltaGrip.v, factor),
        w: deltaSlip.w.lerp(deltaGrip.w, factor),
    };
    return delta;
}
function impulseToDelta(PX, PY, PZ) {
    return {
        v: new three_1.Vector3(PX / constants_1.m, PY / constants_1.m),
        w: new three_1.Vector3((-constants_1.R / constants_1.I) * PY * sin_a, (constants_1.R / constants_1.I) * (PX * sin_a - PZ * cos_a), (constants_1.R / constants_1.I) * PY * cos_a),
    };
}
function muCushion(v) {
    var theta = Math.atan2(Math.abs(v.y), v.x);
    return 0.471 - theta * 0.241;
}
function restitutionCushion(v) {
    var e = 0.39 + 0.257 * v.x - 0.044 * v.x * v.x;
    return e;
}
function cartesionToBallCentric(v, w) {
    var mathaven = new mathaven_1.Mathaven(constants_1.m, constants_1.R, constants_1.ee, constants_1.μs, constants_1.μw + 0.1);
    mathaven.solve(v.x, v.y, w.x, w.y, w.z);
    var rv = new three_1.Vector3(mathaven.vx, mathaven.vy, 0);
    var rw = new three_1.Vector3(mathaven.ωx, mathaven.ωy, mathaven.ωz);
    return { v: rv.sub(v), w: rw.sub(w) };
}
/**
 * Bounce is called with ball travelling in +x direction to cushion,
 * mathaven expects it in +y direction and also requires angle
 * and spin to be relative to direction of ball travel.
 */
function mathavenAdapter(v, w) {
    return rotateApplyUnrotate(Math.PI / 2, v, w, cartesionToBallCentric);
}
/**
 * Spin on ball after strike with cue
 * https://billiards.colostate.edu/technical_proofs/new/TP_A-12.pdf
 *
 * @param offset (x,y,0) from center strike where x,y range from -0.5 to 0.5 the fraction of R from center.
 * @param v velocity of ball after strike
 * @returns angular velocity
 */
function cueToSpin(offset, v) {
    var spinAxis = Math.atan2(-offset.x, offset.y);
    var spinRate = ((5 / 2) * v.length() * (offset.length() * constants_1.R)) / (constants_1.R * constants_1.R);
    var dir = v.clone().normalize();
    var rvel = (0, utils_1.upCross)(dir)
        .applyAxisAngle(dir, spinAxis)
        .multiplyScalar(spinRate);
    return rvel;
}
//# sourceMappingURL=physics.js.map