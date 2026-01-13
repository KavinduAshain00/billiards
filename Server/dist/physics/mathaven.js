"use strict";
/**
 * Mathaven cushion physics model - EXACT MATCH with client src/model/physics/mathaven.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mathaven = void 0;
const constants_1 = require("./constants");
class Mathaven {
    constructor(M, R, ee, μs, μw) {
        this.M = M;
        this.R = R;
        this.ee = ee;
        this.μs = μs;
        this.μw = μw;
        this.vx = 0;
        this.vy = 0;
        this.ωx = 0;
        this.ωy = 0;
        this.ωz = 0;
    }
    // Moments of inertia
    get I() {
        return (2 / 5) * this.M * this.R * this.R;
    }
    solve(v0x, v0y, ω0x, ω0y, ω0z) {
        const { M, R, I, ee, μs, μw } = this;
        // Initial velocities at contact point on cushion
        const s0x = -v0y + R * ω0z * constants_1.cosθ - R * ω0x * constants_1.sinθ;
        const s0y = R * ω0y;
        const s0 = Math.sqrt(s0x * s0x + s0y * s0y);
        // Work done by cushion during compression
        const PzC = (M * v0x * (1 + ee)) / (1 + M * R * R * constants_1.sinθ * constants_1.sinθ / I);
        // Slip velocity direction
        const φ = s0 > 0 ? Math.atan2(s0y, s0x) : 0;
        // Compression impulse components
        const PxC = -μw * PzC * Math.cos(φ);
        const PyC = -μs * PzC * Math.sin(φ);
        // Final velocities after cushion bounce
        this.vx = v0x + (PzC * constants_1.sinθ * constants_1.sinθ / M) - (ee * v0x);
        this.vy = v0y + PxC / M;
        this.ωx = ω0x + (R * PzC * constants_1.sinθ * constants_1.cosθ / I);
        this.ωy = ω0y - (R * PyC * constants_1.sinθ / I);
        this.ωz = ω0z - (R * PxC * constants_1.cosθ / I);
    }
}
exports.Mathaven = Mathaven;
//# sourceMappingURL=mathaven.js.map