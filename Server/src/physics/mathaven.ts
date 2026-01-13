/**
 * Mathaven cushion physics model - EXACT MATCH with client src/model/physics/mathaven.ts
 */

import { sinθ, cosθ } from "./constants"

export class Mathaven {
  vx: number = 0
  vy: number = 0
  ωx: number = 0
  ωy: number = 0
  ωz: number = 0

  constructor(
    private readonly M: number,
    private readonly R: number,
    private readonly ee: number,
    private readonly μs: number,
    private readonly μw: number
  ) {}

  // Moments of inertia
  private get I() {
    return (2 / 5) * this.M * this.R * this.R
  }

  solve(
    v0x: number,
    v0y: number,
    ω0x: number,
    ω0y: number,
    ω0z: number
  ): void {
    const { M, R, I, ee, μs, μw } = this

    // Initial velocities at contact point on cushion
    const s0x = -v0y + R * ω0z * cosθ - R * ω0x * sinθ
    const s0y = R * ω0y
    const s0 = Math.sqrt(s0x * s0x + s0y * s0y)

    // Work done by cushion during compression
    const PzC = (M * v0x * (1 + ee)) / (1 + M * R * R * sinθ * sinθ / I)

    // Slip velocity direction
    const φ = s0 > 0 ? Math.atan2(s0y, s0x) : 0

    // Compression impulse components
    const PxC = -μw * PzC * Math.cos(φ)
    const PyC = -μs * PzC * Math.sin(φ)

    // Final velocities after cushion bounce
    this.vx = v0x + (PzC * sinθ * sinθ / M) - (ee * v0x)
    this.vy = v0y + PxC / M
    this.ωx = ω0x + (R * PzC * sinθ * cosθ / I)
    this.ωy = ω0y - (R * PyC * sinθ / I)
    this.ωz = ω0z - (R * PxC * cosθ / I)
  }
}
