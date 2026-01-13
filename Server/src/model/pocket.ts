/**
 * Pocket physics - EXACT MATCH with client src/model/physics/pocket.ts
 */

import { Ball, State } from "./ball"
import { Vector3, zero } from "../physics/utils"
import { R, g } from "../physics/constants"

const up = new Vector3(0, 0, 1)

function upCross(v: Vector3): Vector3 {
  return up.clone().cross(v)
}

export class Pocket {
  pos: Vector3
  radius: number

  constructor(pos: Vector3, radius: number) {
    this.pos = pos
    this.radius = radius
  }

  private static willFall(pocket: Pocket, futurePosition: Vector3): boolean {
    return futurePosition.distanceTo(pocket.pos) < pocket.radius
  }

  public fall(ball: Ball, t: number): number {
    ball.vel.z = -g * t
    ball.state = State.Falling
    ball.pocket = this
    return ball.vel.length()
  }

  public updateFall(ball: Ball, t: number) {
    ball.vel.addScaledVector(up, -R * 10 * t * g)
    const z = ball.pos.z
    const xypos = ball.pos.clone().setZ(0)
    const distToCentre = xypos.distanceTo(this.pos)
    if (distToCentre > this.radius - R) {
      const toCentre = this.pos.clone().sub(ball.pos).normalize().setZ(0)
      if (z > -R / 2) {
        ball.vel.addScaledVector(toCentre, R * 7 * t * g)
        ball.rvel.addScaledVector(upCross(toCentre), 7 * t * g)
      }
      if (ball.vel.dot(toCentre) < 0) {
        ball.vel.x = (toCentre.x * ball.vel.length()) / 2
        ball.vel.y = (toCentre.y * ball.vel.length()) / 2
      }
    }

    const restingDepth = this.restingDepth(ball)
    if (z < restingDepth && ball.rvel.length() !== 0) {
      ball.pos.z = restingDepth
      ball.vel.z = -R / 10
      ball.rvel.copy(zero)
    }

    if (z < restingDepth - R) {
      ball.pos.z = restingDepth - R
      ball.setStationary()
      ball.state = State.InPocket
    }
  }

  private restingDepth(ball: Ball): number {
    return -3 * R - (R * ball.id) / 4
  }

  static findPocket(pocketCenters: Pocket[], ball: Ball, t: number): Pocket | undefined {
    const futurePosition = ball.futurePosition(t)
    return pocketCenters.find((p) => Pocket.willFall(p, futurePosition))
  }
}
