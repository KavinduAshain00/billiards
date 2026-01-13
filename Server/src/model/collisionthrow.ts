/**
 * Collision throw physics - EXACT MATCH with client src/model/physics/collisionthrow.ts
 */

import { Vector3 } from "../physics/utils"
import { Ball } from "./ball"
import { Collision } from "./collision"
import { I, m, R } from "../physics/constants"

function exp(theta: number): number {
  return Math.fround(Math.exp(theta))
}

export class CollisionThrow {
  normalImpulse: number = 0
  tangentialImpulse: number = 0

  private dynamicFriction(vRel: number): number {
    return 0.01 + 0.108 * exp(-1.088 * vRel)
  }

  public updateVelocities(a: Ball, b: Ball): number {
    const contact = Collision.positionsAtContact(a, b)
    const ab = contact.b.sub(contact.a).normalize()
    const abTangent = new Vector3(-ab.y, ab.x, 0)

    const e = 0.99
    const vPoint = a.vel
      .clone()
      .sub(b.vel)
      .add(
        ab
          .clone()
          .multiplyScalar(-R)
          .cross(a.rvel)
          .sub(ab.clone().multiplyScalar(R).cross(b.rvel))
      )

    const vRelNormalMag = ab.dot(vPoint)
    const vRel = vPoint.addScaledVector(ab, -vRelNormalMag)
    const vRelMag = vRel.length()
    const vRelTangential = abTangent.dot(vRel)

    const μ = this.dynamicFriction(vRelMag)

    this.normalImpulse = (-(1 + e) * vRelNormalMag) / (2 / m)

    this.tangentialImpulse =
      0.25 *
      Math.min((μ * Math.abs(this.normalImpulse)) / vRelMag, 1 / 7) *
      -vRelTangential

    const impulseNormal = ab.clone().multiplyScalar(this.normalImpulse)
    const impulseTangential = abTangent
      .clone()
      .multiplyScalar(this.tangentialImpulse)

    a.vel
      .addScaledVector(impulseNormal, 1 / m)
      .addScaledVector(impulseTangential, 1 / m)
    b.vel
      .addScaledVector(impulseNormal, -1 / m)
      .addScaledVector(impulseTangential, -1 / m)

    const angularImpulseA = ab
      .clone()
      .multiplyScalar(-R)
      .cross(impulseTangential)
    const angularImpulseB = ab
      .clone()
      .multiplyScalar(R)
      .cross(impulseTangential)

    a.rvel.addScaledVector(angularImpulseA, 1 / I)
    b.rvel.addScaledVector(angularImpulseB, 1 / I)

    return vRelNormalMag
  }
}
