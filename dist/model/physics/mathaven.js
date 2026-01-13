"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mathaven = void 0;
var utils_1 = require("../../utils/utils");
var constants_1 = require("./constants");
var Mathaven = /** @class */ (function () {
    function Mathaven(M, R, ee, μs, μw) {
        // work done
        this.P = 0;
        this.WzI = 0;
        this.i = 0;
        this.N = 100;
        this.M = M;
        this.R = R;
        this.ee = ee;
        this.μs = μs;
        this.μw = μw;
    }
    Mathaven.prototype.updateSlipSpeedsAndAngles = function () {
        var R = this.R;
        // Calculate velocities at the cushion (I)
        var v_xI = this.vx + this.ωy * R * constants_1.sinθ - this.ωz * R * constants_1.cosθ;
        var v_yI = -this.vy * constants_1.sinθ + this.ωx * R;
        // Calculate velocities at the table (C)
        var v_xC = this.vx - this.ωy * R;
        var v_yC = this.vy + this.ωx * R;
        // Update slip speeds and angles at the cushion (I)
        this.s = (0, utils_1.sqrt)((0, utils_1.pow)(v_xI, 2) + (0, utils_1.pow)(v_yI, 2));
        this.φ = (0, utils_1.atan2)(v_yI, v_xI);
        if (this.φ < 0) {
            this.φ += 2 * Math.PI;
        }
        // Update slip speeds and angles at the table (C)
        this.sʹ = (0, utils_1.sqrt)((0, utils_1.pow)(v_xC, 2) + (0, utils_1.pow)(v_yC, 2));
        this.φʹ = (0, utils_1.atan2)(v_yC, v_xC);
        if (this.φʹ < 0) {
            this.φʹ += 2 * Math.PI;
        }
    };
    Mathaven.prototype.compressionPhase = function () {
        var ΔP = Math.max((this.M * this.vy) / this.N, 0.001);
        while (this.vy > 0) {
            this.updateSingleStep(ΔP);
        }
    };
    Mathaven.prototype.restitutionPhase = function (targetWorkRebound) {
        var ΔP = Math.max(targetWorkRebound / this.N, 0.001);
        this.WzI = 0;
        while (this.WzI < targetWorkRebound) {
            this.updateSingleStep(ΔP);
        }
    };
    Mathaven.prototype.updateSingleStep = function (ΔP) {
        this.updateSlipSpeedsAndAngles();
        this.updateVelocity(ΔP);
        this.updateAngularVelocity(ΔP);
        this.updateWorkDone(ΔP);
        if (this.i++ > 10 * this.N) {
            throw new Error("Solution not found");
        }
    };
    Mathaven.prototype.updateVelocity = function (ΔP) {
        var μs = this.μs;
        var μw = this.μw;
        var M = this.M;
        // Update centroid velocity components
        this.vx -=
            (1 / M) *
                (μw * (0, utils_1.cos)(this.φ) +
                    μs * (0, utils_1.cos)(this.φʹ) * (constants_1.sinθ + μw * (0, utils_1.sin)(this.φ) * constants_1.cosθ)) *
                ΔP;
        this.vy -=
            (1 / M) *
                (constants_1.cosθ -
                    μw * constants_1.sinθ * (0, utils_1.sin)(this.φ) +
                    μs * (0, utils_1.sin)(this.φʹ) * (constants_1.sinθ + μw * (0, utils_1.sin)(this.φ) * constants_1.cosθ)) *
                ΔP;
    };
    Mathaven.prototype.updateAngularVelocity = function (ΔP) {
        var μs = this.μs;
        var μw = this.μw;
        var M = this.M;
        var R = this.R;
        this.ωx +=
            -(5 / (2 * M * R)) *
                (μw * (0, utils_1.sin)(this.φ) +
                    μs * (0, utils_1.sin)(this.φʹ) * (constants_1.sinθ + μw * (0, utils_1.sin)(this.φ) * constants_1.cosθ)) *
                ΔP;
        this.ωy +=
            -(5 / (2 * M * R)) *
                (μw * (0, utils_1.cos)(this.φ) * constants_1.sinθ -
                    μs * (0, utils_1.cos)(this.φʹ) * (constants_1.sinθ + μw * (0, utils_1.sin)(this.φ) * constants_1.cosθ)) *
                ΔP;
        this.ωz += (5 / (2 * M * R)) * (μw * (0, utils_1.cos)(this.φ) * constants_1.cosθ) * ΔP;
    };
    Mathaven.prototype.updateWorkDone = function (ΔP) {
        var ΔWzI = ΔP * Math.abs(this.vy);
        this.WzI += ΔWzI;
        this.P += ΔP;
    };
    Mathaven.prototype.solvePaper = function (v0, α, ω0S, ω0T) {
        this.solve(v0 * (0, utils_1.cos)(α), v0 * (0, utils_1.sin)(α), -ω0T * (0, utils_1.sin)(α), ω0T * (0, utils_1.cos)(α), ω0S);
    };
    Mathaven.prototype.solve = function (vx, vy, ωx, ωy, ωz) {
        this.vx = vx;
        this.vy = vy;
        this.ωx = ωx;
        this.ωy = ωy;
        this.ωz = ωz;
        this.WzI = 0;
        this.P = 0;
        this.i = 0;
        this.compressionPhase();
        var targetWorkRebound = this.ee * this.ee * this.WzI;
        this.restitutionPhase(targetWorkRebound);
    };
    return Mathaven;
}());
exports.Mathaven = Mathaven;
//# sourceMappingURL=mathaven.js.map