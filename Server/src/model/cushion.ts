/**
 * Cushion physics - EXACT MATCH with client src/model/physics/cushion.ts
 */

import { Ball } from "./ball"
import { Vector3 } from "../physics/utils"
import { bounceHanBlend, rotateApplyUnrotate } from "../physics/physics"
import { TableGeometry } from "./tablegeometry"
import { PocketGeometry } from "./pocketgeometry"

export class Cushion {
  static bounceAny(
    ball: Ball,
    t: number,
    hasPockets: boolean = true,
    cushionModel = bounceHanBlend
  ): number | undefined {
    const futurePosition = ball.futurePosition(t)

    if (Cushion.willBounceLong(futurePosition, hasPockets)) {
      const dir =
        futurePosition.y > TableGeometry.tableY ? -Math.PI / 2 : Math.PI / 2
      return Cushion.bounceIn(dir, ball, cushionModel)
    }

    if (Cushion.willBounceShort(futurePosition, hasPockets)) {
      const dir = futurePosition.x > TableGeometry.tableX ? 0 : Math.PI
      return Cushion.bounceIn(dir, ball, cushionModel)
    }

    return undefined
  }

  static willBounceShort(futurePosition: Vector3, hasPockets: boolean): boolean {
    if (!hasPockets) {
      return Cushion.willBounceShortSegment(
        TableGeometry.Y,
        -TableGeometry.Y,
        futurePosition
      )
    }
    const pockets = PocketGeometry.pockets
    return Cushion.willBounceShortSegment(
      pockets.pocketNW.knuckleSW.pos.y,
      pockets.pocketSW.knuckleNW.pos.y,
      futurePosition
    )
  }

  static willBounceLong(futurePosition: Vector3, hasPockets: boolean): boolean {
    if (!hasPockets) {
      return Cushion.willBounceLongSegment(
        -TableGeometry.X,
        TableGeometry.X,
        futurePosition
      )
    }
    const pockets = PocketGeometry.pockets
    return (
      Cushion.willBounceLongSegment(
        pockets.pocketNW.knuckleNE.pos.x,
        pockets.pocketN.knuckleNW.pos.x,
        futurePosition
      ) ||
      Cushion.willBounceLongSegment(
        pockets.pocketN.knuckleNE.pos.x,
        pockets.pocketNE.knuckleNW.pos.x,
        futurePosition
      )
    )
  }

  private static willBounceLongSegment(
    left: number,
    right: number,
    futurePosition: Vector3
  ): boolean {
    return (
      futurePosition.x > left &&
      futurePosition.x < right &&
      Math.abs(futurePosition.y) > TableGeometry.tableY
    )
  }

  private static willBounceShortSegment(
    top: number,
    bottom: number,
    futurePosition: Vector3
  ): boolean {
    return (
      futurePosition.y > bottom &&
      futurePosition.y < top &&
      Math.abs(futurePosition.x) > TableGeometry.tableX
    )
  }

  private static bounceIn(
    dir: number,
    ball: Ball,
    cushionModel: (v: Vector3, w: Vector3) => { v: Vector3; w: Vector3 }
  ): number {
    const incidentSpeed = ball.vel.length()
    const delta = rotateApplyUnrotate(dir, ball.vel, ball.rvel, cushionModel)
    ball.vel.add(delta.v)
    ball.rvel.add(delta.w)
    return incidentSpeed
  }
}
