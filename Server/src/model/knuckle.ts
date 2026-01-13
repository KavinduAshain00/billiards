/**
 * Knuckle physics - EXACT MATCH with client src/model/physics/knuckle.ts
 */

import { Ball } from "./ball"
import { Vector3 } from "../physics/utils"
import { R, e } from "../physics/constants"

export class Knuckle {
  pos: Vector3
  radius: number

  constructor(pos: Vector3, radius: number) {
    this.pos = pos
    this.radius = radius
  }

  private static willBounce(knuckle: Knuckle, futurePosition: Vector3): boolean {
    return futurePosition.distanceTo(knuckle.pos) < R + knuckle.radius
  }

  public bounce(ball: Ball): number {
    const kb = ball.pos.clone().sub(this.pos).normalize()
    const velDotCenters = kb.dot(ball.vel)
    ball.vel.addScaledVector(kb, -2 * e * velDotCenters)
    ball.rvel.multiplyScalar(0.5)
    return Math.abs(velDotCenters)
  }

  static findBouncing(ball: Ball, t: number, knuckles: Knuckle[]): Knuckle | undefined {
    const futurePosition = ball.futurePosition(t)
    return knuckles.find((k) => Knuckle.willBounce(k, futurePosition))
  }
}
