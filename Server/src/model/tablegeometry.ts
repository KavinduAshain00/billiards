/**
 * Table geometry - EXACT MATCH with client src/view/tablegeometry.ts
 */

import { R } from "../physics/constants"

export class TableGeometry {
  static tableX: number
  static tableY: number
  static X: number
  static Y: number
  static hasPockets: boolean = true

  static {
    TableGeometry.scaleToRadius(R)
  }

  static scaleToRadius(R: number) {
    TableGeometry.tableX = R * 43
    TableGeometry.tableY = R * 21
    TableGeometry.X = TableGeometry.tableX + R
    TableGeometry.Y = TableGeometry.tableY + R
  }
}
