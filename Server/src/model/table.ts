/**
 * Server-side Table - EXACT MATCH with client src/model/table.ts
 * Authoritative physics simulation
 */

import { Ball, BallState, State } from "./ball"
import { Collision } from "./collision"
import { Cushion } from "./cushion"
import { Knuckle } from "./knuckle"
import { Pocket } from "./pocket"
import { TableGeometry } from "./tablegeometry"
import { PocketGeometry } from "./pocketgeometry"
import { bounceHanBlend } from "../physics/physics"
import { Vector3, zero, unitAtAngle } from "../physics/utils"
import { R } from "../physics/constants"
import { cueToSpin } from "../physics/physics"

interface Pair {
  a: Ball
  b: Ball
}

export interface Outcome {
  type: "collision" | "cushion" | "pot"
  ballId: number
  ballId2?: number
  speed: number
}

export interface AimState {
  angle: number
  power: number
  offset: { x: number; y: number; z: number }
  pos: { x: number; y: number; z: number }
}

export interface TableSnapshot {
  timestamp: number
  serverTick: number
  balls: BallState[]
  isStationary: boolean
  outcomes: Outcome[]
}

export class Table {
  balls!: Ball[]
  pairs!: Pair[]
  outcome: Outcome[] = []
  cueball: Ball
  cushionModel = bounceHanBlend
  hasPockets: boolean = true

  constructor(balls: Ball[]) {
    this.cueball = balls[0]
    this.initialiseBalls(balls)
  }

  initialiseBalls(balls: Ball[]) {
    this.balls = balls
    this.pairs = []
    for (let a = 0; a < balls.length; a++) {
      for (let b = 0; b < balls.length; b++) {
        if (a < b) {
          this.pairs.push({ a: balls[a], b: balls[b] })
        }
      }
    }
  }

  advance(t: number) {
    let depth = 0
    while (!this.prepareAdvanceAll(t)) {
      if (depth++ > 100) {
        throw new Error("Depth exceeded resolving collisions")
      }
    }
    this.balls.forEach((a) => {
      a.update(t)
      a.fround()
    })
  }

  prepareAdvanceAll(t: number): boolean {
    return (
      this.pairs.every((pair) => this.prepareAdvancePair(pair.a, pair.b, t)) &&
      this.balls.every((ball) => this.prepareAdvanceToCushions(ball, t))
    )
  }

  private prepareAdvancePair(a: Ball, b: Ball, t: number): boolean {
    if (Collision.willCollide(a, b, t)) {
      const incidentSpeed = Collision.collide(a, b)
      this.outcome.push({
        type: "collision",
        ballId: a.id,
        ballId2: b.id,
        speed: incidentSpeed,
      })
      return false
    }
    return true
  }

  private prepareAdvanceToCushions(a: Ball, t: number): boolean {
    if (!a.onTable()) {
      return true
    }
    const futurePosition = a.futurePosition(t)
    if (
      Math.abs(futurePosition.y) < TableGeometry.tableY &&
      Math.abs(futurePosition.x) < TableGeometry.tableX
    ) {
      return true
    }

    const incidentSpeed = Cushion.bounceAny(
      a,
      t,
      this.hasPockets,
      this.cushionModel
    )
    if (incidentSpeed !== undefined) {
      this.outcome.push({
        type: "cushion",
        ballId: a.id,
        speed: incidentSpeed,
      })
      return false
    }

    const k = Knuckle.findBouncing(a, t, PocketGeometry.knuckles)
    if (k) {
      const knuckleIncidentSpeed = k.bounce(a)
      this.outcome.push({
        type: "cushion",
        ballId: a.id,
        speed: knuckleIncidentSpeed,
      })
      return false
    }
    const p = Pocket.findPocket(PocketGeometry.pocketCenters, a, t)
    if (p) {
      const pocketIncidentSpeed = p.fall(a, t)
      this.outcome.push({
        type: "pot",
        ballId: a.id,
        speed: pocketIncidentSpeed,
      })
      return false
    }

    return true
  }

  allStationary(): boolean {
    return this.balls.every((b) => !b.inMotion())
  }

  inPockets(): number {
    return this.balls.reduce((acc, b) => (b.onTable() ? acc : acc + 1), 0)
  }

  hit(aim: AimState) {
    const ball = this.cueball
    ball.state = State.Sliding
    ball.vel.copy(unitAtAngle(aim.angle).multiplyScalar(aim.power))
    const offset = new Vector3(aim.offset.x, aim.offset.y, aim.offset.z)
    ball.rvel.copy(cueToSpin(offset, ball.vel))
  }

  serialise(): { balls: BallState[] } {
    return {
      balls: this.balls.map((b) => b.serialise()),
    }
  }

  snapshot(serverTick: number): TableSnapshot {
    const outcomes = [...this.outcome]
    this.outcome = []
    return {
      timestamp: Date.now(),
      serverTick,
      balls: this.balls.map((b) => b.serialise()),
      isStationary: this.allStationary(),
      outcomes,
    }
  }

  /**
   * Create optimized snapshot with delta compression
   * Only includes balls that have moved significantly
   */
  deltaSnapshot(serverTick: number, prevSnapshot: TableSnapshot | null): TableSnapshot {
    const outcomes = [...this.outcome]
    this.outcome = []
    
    const POSITION_THRESHOLD = 0.001 // 1mm movement threshold
    const VELOCITY_THRESHOLD = 0.01  // Velocity change threshold
    
    let balls: BallState[]
    
    if (prevSnapshot) {
      // Delta compression: only include balls that changed
      balls = this.balls
        .map((b) => b.serialise())
        .filter((ball) => {
          const prev = prevSnapshot.balls.find((p) => p.id === ball.id)
          if (!prev) return true // New ball
          
          // Check if position changed significantly
          const posDelta = Math.sqrt(
            Math.pow(ball.pos.x - prev.pos.x, 2) +
            Math.pow(ball.pos.y - prev.pos.y, 2) +
            Math.pow(ball.pos.z - prev.pos.z, 2)
          )
          
          // Check if velocity changed significantly
          const velDelta = Math.sqrt(
            Math.pow(ball.vel.x - prev.vel.x, 2) +
            Math.pow(ball.vel.y - prev.vel.y, 2) +
            Math.pow(ball.vel.z - prev.vel.z, 2)
          )
          
          return posDelta > POSITION_THRESHOLD || velDelta > VELOCITY_THRESHOLD || ball.state !== prev.state
        })
    } else {
      // Full snapshot if no previous
      balls = this.balls.map((b) => b.serialise())
    }
    
    return {
      timestamp: Date.now(),
      serverTick,
      balls,
      isStationary: this.allStationary(),
      outcomes,
    }
  }

  /**
   * Get current outcomes without clearing them
   */
  getOutcomes(): Outcome[] {
    return [...this.outcome]
  }

  /**
   * Clear all outcomes
   */
  clearOutcomes(): void {
    this.outcome = []
  }

  static fromSerialised(data: { balls: BallState[] }): Table {
    Ball.resetIdCounter()
    const balls = data.balls.map((b) => Ball.fromSerialised(b))
    return new Table(balls)
  }

  updateFromSerialised(data: { balls: BallState[] }) {
    if (data.balls) {
      data.balls.forEach((b) => {
        const ball = this.balls.find((ball) => ball.id === b.id)
        if (ball) {
          ball.updateFromSerialised(b)
        }
      })
    }
  }

  halt() {
    this.balls.forEach((b) => {
      b.vel.copy(zero)
      b.rvel.copy(zero)
      b.state = State.Stationary
    })
  }

  overlapsAny(pos: Vector3, excluding: Ball = this.cueball): boolean {
    return this.balls
      .filter((b) => b !== excluding)
      .some((b) => b.pos.distanceTo(pos) < 2 * R)
  }
}
