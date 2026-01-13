/**
 * Ball state - EXACT MATCH with client src/model/ball.ts
 */

import { Vector3, zero, passesThroughZero } from "../physics/utils"
import { forceRoll, rollingFull, sliding, surfaceVelocityFull } from "../physics/physics"
import { Pocket } from "./pocket"
import { R, g } from "../physics/constants"

export enum State {
  Stationary = "Stationary",
  Rolling = "Rolling",
  Sliding = "Sliding",
  Falling = "Falling",
  InPocket = "InPocket",
}

export interface BallState {
  id: number
  pos: { x: number; y: number; z: number }
  vel: { x: number; y: number; z: number }
  rvel: { x: number; y: number; z: number }
  state: State
  ballNumber?: number  // For 8-ball: the number on the ball (1-15)
}

export class Ball {
  readonly pos: Vector3
  readonly vel: Vector3 = zero.clone()
  readonly rvel: Vector3 = zero.clone()
  readonly futurePos: Vector3 = zero.clone()
  state: State = State.Stationary
  pocket: Pocket | null = null
  ballNumber?: number  // For 8-ball: the number on the ball (1-15)

  static id = 0
  readonly id: number

  static readonly transition = 0.05

  constructor(pos: Vector3, id?: number, ballNumber?: number) {
    this.pos = pos.clone()
    this.id = id !== undefined ? id : Ball.id++
    this.ballNumber = ballNumber
  }

  static resetIdCounter() {
    Ball.id = 0
  }

  update(t: number) {
    this.updatePosition(t)
    if (this.state === State.Falling && this.pocket) {
      this.pocket.updateFall(this, t)
    } else {
      this.updateVelocity(t)
    }
  }

  private updatePosition(t: number) {
    this.pos.addScaledVector(this.vel, t)
  }

  private updateVelocity(t: number) {
    if (this.inMotion()) {
      if (this.isRolling()) {
        this.state = State.Rolling
        forceRoll(this.vel, this.rvel)
        this.addDelta(t, rollingFull(this.rvel))
      } else {
        this.state = State.Sliding
        this.addDelta(t, sliding(this.vel, this.rvel))
      }
    }
  }

  private addDelta(t: number, delta: { v: Vector3; w: Vector3 }) {
    delta.v.multiplyScalar(t)
    delta.w.multiplyScalar(t)
    if (!this.passesZero(delta)) {
      this.vel.add(delta.v)
      this.rvel.add(delta.w)
    }
  }

  private passesZero(delta: { v: Vector3; w: Vector3 }): boolean {
    const vz = passesThroughZero(this.vel, delta.v)
    const wz = passesThroughZero(this.rvel, delta.w)
    const halts = this.state === State.Rolling ? vz || wz : vz && wz
    if (halts && Math.abs(this.rvel.z) < 0.01) {
      this.setStationary()
      return true
    }
    return false
  }

  setStationary() {
    this.vel.copy(zero)
    this.rvel.copy(zero)
    this.state = State.Stationary
  }

  isRolling(): boolean {
    return (
      this.vel.lengthSq() !== 0 &&
      this.rvel.lengthSq() !== 0 &&
      surfaceVelocityFull(this.vel, this.rvel).length() < Ball.transition
    )
  }

  onTable(): boolean {
    return this.state !== State.Falling && this.state !== State.InPocket
  }

  inMotion(): boolean {
    return (
      this.state === State.Rolling ||
      this.state === State.Sliding ||
      this.isFalling()
    )
  }

  isFalling(): boolean {
    return this.state === State.Falling
  }

  futurePosition(t: number): Vector3 {
    this.futurePos.copy(this.pos).addScaledVector(this.vel, t)
    return this.futurePos
  }

  fround() {
    this.pos.x = Math.fround(this.pos.x)
    this.pos.y = Math.fround(this.pos.y)
    this.vel.x = Math.fround(this.vel.x)
    this.vel.y = Math.fround(this.vel.y)
    this.rvel.x = Math.fround(this.rvel.x)
    this.rvel.y = Math.fround(this.rvel.y)
    this.rvel.z = Math.fround(this.rvel.z)
  }

  serialise(): BallState {
    return {
      id: this.id,
      pos: { x: this.pos.x, y: this.pos.y, z: this.pos.z },
      vel: { x: this.vel.x, y: this.vel.y, z: this.vel.z },
      rvel: { x: this.rvel.x, y: this.rvel.y, z: this.rvel.z },
      state: this.state,
      ballNumber: this.ballNumber,
    }
  }

  static fromSerialised(data: BallState): Ball {
    const ball = new Ball(new Vector3(data.pos.x, data.pos.y, data.pos.z), data.id, data.ballNumber)
    ball.vel.set(data.vel.x, data.vel.y, data.vel.z)
    ball.rvel.set(data.rvel.x, data.rvel.y, data.rvel.z)
    ball.state = data.state
    return ball
  }

  updateFromSerialised(data: BallState) {
    this.pos.set(data.pos.x, data.pos.y, data.pos.z)
    this.vel.set(data.vel.x, data.vel.y, data.vel.z)
    this.rvel.set(data.rvel.x, data.rvel.y, data.rvel.z)
    this.state = data.state
  }
}
