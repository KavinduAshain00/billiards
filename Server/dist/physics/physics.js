"use strict";
/**
 * Physics calculations - EXACT MATCH with client src/model/physics/physics.ts
 * This MUST produce identical results to the client
 */
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
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const mathaven_1 = require("./mathaven");
function surfaceVelocity(v, w) {
    return surfaceVelocityFull(v, w).setZ(0);
}
const sv = new utils_1.Vector3();
function surfaceVelocityFull(v, w) {
    return sv.copy(v).addScaledVector((0, utils_1.upCross)(w), constants_1.R);
}
const delta = { v: new utils_1.Vector3(), w: new utils_1.Vector3() };
Object.freeze(delta);
function sliding(v, w) {
    const va = surfaceVelocity(v, w);
    delta.v.copy((0, utils_1.norm)(va).multiplyScalar(-constants_1.muS * constants_1.g));
    delta.w.copy((0, utils_1.norm)((0, utils_1.upCross)(va)).multiplyScalar(((5 / 2) * constants_1.muS * constants_1.g) / constants_1.R));
    delta.w.setZ(-(5 / 2) * (constants_1.Mz / (constants_1.m * constants_1.R * constants_1.R)) * Math.sign(w.z));
    return delta;
}
function rollingFull(w) {
    const mag = new utils_1.Vector3(w.x, w.y, 0).length();
    const k = ((5 / 7) * constants_1.Mxy) / (constants_1.m * constants_1.R) / mag;
    const kw = ((5 / 7) * constants_1.Mxy) / (constants_1.m * constants_1.R * constants_1.R) / mag;
    delta.v.set(-k * w.y, k * w.x, 0);
    delta.w.set(-kw * w.x, -kw * w.y, -(5 / 2) * (constants_1.Mz / (constants_1.m * constants_1.R * constants_1.R)) * Math.sign(w.z));
    return delta;
}
function forceRoll(v, w) {
    const wz = w.z;
    w.copy((0, utils_1.upCross)(v).multiplyScalar(1 / constants_1.R));
    w.setZ(wz);
}
function rotateApplyUnrotate(theta, v, w, model) {
    const vr = v.clone().applyAxisAngle(utils_1.up, theta);
    const wr = w.clone().applyAxisAngle(utils_1.up, theta);
    const delta = model(vr, wr);
    delta.v.applyAxisAngle(utils_1.up, -theta);
    delta.w.applyAxisAngle(utils_1.up, -theta);
    return delta;
}
// Han paper cushion physics
// cushion contact point epsilon above ball centre
const epsilon = constants_1.R * 0.1;
const theta_a = Math.asin(epsilon / constants_1.R);
const sin_a = (0, utils_1.sin)(theta_a);
const cos_a = (0, utils_1.cos)(theta_a);
function s0(v, w) {
    return new utils_1.Vector3(v.x * sin_a - v.z * cos_a + constants_1.R * w.y, -v.y - constants_1.R * w.z * cos_a + constants_1.R * w.x * sin_a);
}
function c0(v) {
    return v.x * cos_a;
}
function Pzs(s) {
    const A = 7 / 2 / constants_1.m;
    return s.length() / A;
}
function Pze(c) {
    const B = 1 / constants_1.m;
    const coeff = restitutionCushion(new utils_1.Vector3(c / cos_a, 0, 0));
    return (constants_1.muC * ((1 + coeff) * c)) / B;
}
function isGripCushion(v, w) {
    const Pze_val = Pze(c0(v));
    const Pzs_val = Pzs(s0(v, w));
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
    const { c, s, A, B } = basisHan(v, w);
    const ecB = (1 + constants_1.e) * (c / B);
    const PX = (-s.x / A) * sin_a - ecB * cos_a;
    const PY = s.y / A;
    const PZ = (s.x / A) * cos_a - ecB * sin_a;
    return impulseToDelta(PX, PY, PZ);
}
function slipHan(v, w) {
    const { c, B } = basisHan(v, w);
    const ecB = (1 + constants_1.e) * (c / B);
    const mu = muCushion(v);
    const phi = Math.atan2(v.y, v.x);
    const cos_phi = Math.cos(phi);
    const sin_phi = Math.sin(phi);
    const PX = -mu * ecB * cos_phi * cos_a - ecB * cos_a;
    const PY = mu * ecB * sin_phi;
    const PZ = mu * ecB * cos_phi * cos_a - ecB * sin_a;
    return impulseToDelta(PX, PY, PZ);
}
function bounceHan(v, w) {
    if (isGripCushion(v, w)) {
        return gripHan(v, w);
    }
    else {
        return slipHan(v, w);
    }
}
function bounceHanBlend(v, w) {
    const deltaGrip = gripHan(v, w);
    const deltaSlip = slipHan(v, w);
    const isCheckSide = Math.sign(v.y) === Math.sign(w.z);
    const factor = isCheckSide ? Math.cos(Math.atan2(v.y, v.x)) : 1;
    const delta = {
        v: deltaSlip.v.lerp(deltaGrip.v, factor),
        w: deltaSlip.w.lerp(deltaGrip.w, factor),
    };
    return delta;
}
function impulseToDelta(PX, PY, PZ) {
    return {
        v: new utils_1.Vector3(PX / constants_1.m, PY / constants_1.m),
        w: new utils_1.Vector3((-constants_1.R / constants_1.I) * PY * sin_a, (constants_1.R / constants_1.I) * (PX * sin_a - PZ * cos_a), (constants_1.R / constants_1.I) * PY * cos_a),
    };
}
function muCushion(v) {
    const theta = Math.atan2(Math.abs(v.y), v.x);
    return 0.471 - theta * 0.241;
}
function restitutionCushion(v) {
    const e = 0.39 + 0.257 * v.x - 0.044 * v.x * v.x;
    return e;
}
function cartesionToBallCentric(v, w) {
    const mathaven = new mathaven_1.Mathaven(constants_1.m, constants_1.R, constants_1.ee, constants_1.μs, constants_1.μw + 0.1);
    mathaven.solve(v.x, v.y, w.x, w.y, w.z);
    const rv = new utils_1.Vector3(mathaven.vx, mathaven.vy, 0);
    const rw = new utils_1.Vector3(mathaven.ωx, mathaven.ωy, mathaven.ωz);
    return { v: rv.sub(v), w: rw.sub(w) };
}
function mathavenAdapter(v, w) {
    return rotateApplyUnrotate(Math.PI / 2, v, w, cartesionToBallCentric);
}
function cueToSpin(offset, v) {
    const spinAxis = Math.atan2(-offset.x, offset.y);
    const spinRate = ((5 / 2) * v.length() * (offset.length() * constants_1.R)) / (constants_1.R * constants_1.R);
    const dir = v.clone().normalize();
    const rvel = (0, utils_1.upCross)(dir)
        .applyAxisAngle(dir, spinAxis)
        .multiplyScalar(spinRate);
    return rvel;
}
//# sourceMappingURL=physics.js.map