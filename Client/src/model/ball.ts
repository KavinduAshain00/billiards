import { Vector3 } from "three"
import { zero, vec, passesThroughZero } from "../utils/utils"
import {
  forceRoll,
  rollingFull,
  sliding,
  surfaceVelocityFull,
} from "./physics/physics"
import { BallMesh } from "../view/ballmesh"
import { Pocket } from "./physics/pocket"

export enum State {
  Stationary = "Stationary",
  Rolling = "Rolling",
  Sliding = "Sliding",
  Falling = "Falling",
  InPocket = "InPocket",
}

export class Ball {
  readonly pos: Vector3
  readonly vel: Vector3 = zero.clone()
  readonly rvel: Vector3 = zero.clone()
  readonly futurePos: Vector3 = zero.clone()
  readonly ballmesh: BallMesh
  state: State = State.Stationary
  pocket: Pocket | null = null

  // interpolation targets for server-authoritative updates
  targetPos: Vector3 | null = null
  interpStart: Vector3 = zero.clone()
  interpTimeLeft: number = 0
  interpTotal: number = 0
  targetVel: Vector3 = zero.clone()

  public static id = 0
  readonly id = Ball.id++

  static readonly transition = 0.05

  constructor(pos, color?, isStripe = false, ballNumber?: number) {
    this.pos = pos.clone()
    this.ballmesh = new BallMesh(color || 0xeeeeee * Math.random(), isStripe, ballNumber)
  }

  /**
   * Update ball number (for 8-ball when server sends randomized rack)
   * This updates the visual mesh to show the correct ball color/number
   */
  setBallNumber(ballNumber: number) {
    this.ballmesh.setBallNumber(ballNumber)
  }

  update(t) {
    this.updatePosition(t)
    // Only call updateFall if we have a pocket reference (server authoritative state may set Falling without providing pocket)
    if (this.state === State.Falling && this.pocket) {
      this.pocket.updateFall(this, t)
    } else {
      this.updateVelocity(t)
    }
  }

  updateMesh(t) {
    this.ballmesh.updateAll(this, t)
  }

  private updatePosition(t: number) {
    // If we're interpolating towards a server authoritative state, lerp the position
    if (this.interpTimeLeft > 0 && this.targetPos) {
      this.interpTimeLeft = Math.max(0, this.interpTimeLeft - t)
      const used = this.interpTotal - this.interpTimeLeft
      const frac = this.interpTotal > 0 ? used / this.interpTotal : 1
      this.pos.copy(this.interpStart).lerp(this.targetPos, frac)
      if (this.interpTimeLeft === 0) {
        // finished interpolation, snap to target velocity/state
        this.vel.copy(this.targetVel)
        this.targetPos = null
      }
      return
    }

    this.pos.addScaledVector(this.vel, t)
  }

  /**
   * Accept an authoritative state from server. A non-zero duration will smoothly
   * interpolate the visible position towards the authoritative position.
   */
  setServerState(data, duration: number = 0.1) {
    if (data.pos) {
      const p = data.pos
      this.targetPos = new Vector3(p.x, p.y, p.z ?? 0)
      this.interpStart.copy(this.pos)
      this.interpTimeLeft = duration
      this.interpTotal = duration
    } else {
      this.targetPos = null
      this.interpTimeLeft = 0
      this.interpTotal = 0
    }

    if (data.vel) {
      this.targetVel.set(data.vel.x ?? 0, data.vel.y ?? 0, data.vel.z ?? 0)
    } else {
      this.targetVel.copy(zero)
    }

    if (data.rvel) {
      this.rvel.copy(data.rvel)
    }

    if (data.state) {
      this.state = data.state
    }

    if (duration === 0 && this.targetPos) {
      // apply immediately
      this.pos.copy(this.targetPos)
      this.vel.copy(this.targetVel)
      this.targetPos = null
      this.interpTimeLeft = 0
    }
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

  private addDelta(t, delta) {
    delta.v.multiplyScalar(t)
    delta.w.multiplyScalar(t)
    if (!this.passesZero(delta)) {
      this.vel.add(delta.v)
      this.rvel.add(delta.w)
    }
  }

  private passesZero(delta) {
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

  isRolling() {
    return (
      this.vel.lengthSq() !== 0 &&
      this.rvel.lengthSq() !== 0 &&
      surfaceVelocityFull(this.vel, this.rvel).length() < Ball.transition
    )
  }

  onTable() {
    return this.state !== State.Falling && this.state !== State.InPocket
  }

  inMotion() {
    return (
      this.state === State.Rolling ||
      this.state === State.Sliding ||
      this.isFalling()
    )
  }

  isFalling() {
    return this.state === State.Falling
  }

  futurePosition(t) {
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

  serialise() {
    return {
      pos: this.pos.clone(),
      id: this.id,
    }
  }

  static fromSerialised(data) {
    return Ball.updateFromSerialised(new Ball(vec(data.pos)), data)
  }

  static updateFromSerialised(b, data) {
    b.pos.copy(data.pos)
    b.vel.copy(data?.vel ?? zero)
    b.rvel.copy(data?.rvel ?? zero)
    b.state = State.Stationary
    return b
  }
}
