/**
 * Math utilities - EXACT MATCH with client src/utils/utils.ts
 * All functions use Math.fround() for deterministic floating point
 */

export class Vector3 {
  x: number
  y: number
  z: number

  constructor(x = 0, y = 0, z = 0) {
    this.x = x
    this.y = y
    this.z = z
  }

  set(x: number, y: number, z: number): this {
    this.x = x
    this.y = y
    this.z = z
    return this
  }

  setX(x: number): this {
    this.x = x
    return this
  }

  setY(y: number): this {
    this.y = y
    return this
  }

  setZ(z: number): this {
    this.z = z
    return this
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z)
  }

  copy(v: Vector3): this {
    this.x = v.x
    this.y = v.y
    this.z = v.z
    return this
  }

  add(v: Vector3): this {
    this.x += v.x
    this.y += v.y
    this.z += v.z
    return this
  }

  sub(v: Vector3): this {
    this.x -= v.x
    this.y -= v.y
    this.z -= v.z
    return this
  }

  addScaledVector(v: Vector3, s: number): this {
    this.x += v.x * s
    this.y += v.y * s
    this.z += v.z * s
    return this
  }

  multiplyScalar(s: number): this {
    this.x *= s
    this.y *= s
    this.z *= s
    return this
  }

  divideScalar(s: number): this {
    return this.multiplyScalar(1 / s)
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  normalize(): this {
    return this.divideScalar(this.length() || 1)
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z
  }

  cross(v: Vector3): this {
    const ax = this.x,
      ay = this.y,
      az = this.z
    const bx = v.x,
      by = v.y,
      bz = v.z
    this.x = ay * bz - az * by
    this.y = az * bx - ax * bz
    this.z = ax * by - ay * bx
    return this
  }

  distanceTo(v: Vector3): number {
    return Math.sqrt(this.distanceToSquared(v))
  }

  distanceToSquared(v: Vector3): number {
    const dx = this.x - v.x
    const dy = this.y - v.y
    const dz = this.z - v.z
    return dx * dx + dy * dy + dz * dz
  }

  applyAxisAngle(axis: Vector3, angle: number): this {
    const halfAngle = angle / 2
    const s = Math.sin(halfAngle)
    const qx = axis.x * s
    const qy = axis.y * s
    const qz = axis.z * s
    const qw = Math.cos(halfAngle)

    const ix = qw * this.x + qy * this.z - qz * this.y
    const iy = qw * this.y + qz * this.x - qx * this.z
    const iz = qw * this.z + qx * this.y - qy * this.x
    const iw = -qx * this.x - qy * this.y - qz * this.z

    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx

    return this
  }

  lerp(v: Vector3, alpha: number): this {
    this.x += (v.x - this.x) * alpha
    this.y += (v.y - this.y) * alpha
    this.z += (v.z - this.z) * alpha
    return this
  }
}

export const zero = new Vector3(0, 0, 0)
export const up = new Vector3(0, 0, 1)

export function vec(v: { x: number; y: number; z?: number }): Vector3 {
  return new Vector3(v.x, v.y, v.z ?? 0)
}

const upCrossVec = new Vector3()
export function upCross(v: Vector3): Vector3 {
  return upCrossVec.copy(up).cross(v)
}

const normVec = new Vector3()
export function norm(v: Vector3): Vector3 {
  return normVec.copy(v).normalize()
}

const vc = new Vector3()
export function passesThroughZero(v: Vector3, dv: Vector3): boolean {
  return vc.copy(v).add(dv).dot(v) <= 0
}

export function unitAtAngle(theta: number): Vector3 {
  return new Vector3(1, 0, 0).applyAxisAngle(up, theta)
}

export function round(num: number): number {
  const sign = Math.sign(num)
  return (sign * Math.floor((Math.abs(num) + Number.EPSILON) * 10000)) / 10000
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

export function roundVec(v: Vector3): Vector3 {
  v.x = round(v.x)
  v.y = round(v.y)
  v.z = round(v.z)
  return v
}

export function atan2(y: number, x: number): number {
  return Math.fround(Math.atan2(y, x))
}

export function pow(y: number, x: number): number {
  return Math.fround(Math.pow(y, x))
}

export function sin(theta: number): number {
  return Math.fround(Math.sin(theta))
}

export function cos(theta: number): number {
  return Math.fround(Math.cos(theta))
}

export function sqrt(theta: number): number {
  return Math.fround(Math.sqrt(theta))
}

export function exp(theta: number): number {
  return Math.fround(Math.exp(theta))
}
