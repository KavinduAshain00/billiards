/**
 * Math utilities - EXACT MATCH with client src/utils/utils.ts
 * All functions use Math.fround() for deterministic floating point
 */
export declare class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    setX(x: number): this;
    setY(y: number): this;
    setZ(z: number): this;
    clone(): Vector3;
    copy(v: Vector3): this;
    add(v: Vector3): this;
    sub(v: Vector3): this;
    addScaledVector(v: Vector3, s: number): this;
    multiplyScalar(s: number): this;
    divideScalar(s: number): this;
    length(): number;
    lengthSq(): number;
    normalize(): this;
    dot(v: Vector3): number;
    cross(v: Vector3): this;
    distanceTo(v: Vector3): number;
    distanceToSquared(v: Vector3): number;
    applyAxisAngle(axis: Vector3, angle: number): this;
    lerp(v: Vector3, alpha: number): this;
}
export declare const zero: Vector3;
export declare const up: Vector3;
export declare function vec(v: {
    x: number;
    y: number;
    z?: number;
}): Vector3;
export declare function upCross(v: Vector3): Vector3;
export declare function norm(v: Vector3): Vector3;
export declare function passesThroughZero(v: Vector3, dv: Vector3): boolean;
export declare function unitAtAngle(theta: number): Vector3;
export declare function round(num: number): number;
export declare function round2(num: number): number;
export declare function roundVec(v: Vector3): Vector3;
export declare function atan2(y: number, x: number): number;
export declare function pow(y: number, x: number): number;
export declare function sin(theta: number): number;
export declare function cos(theta: number): number;
export declare function sqrt(theta: number): number;
export declare function exp(theta: number): number;
//# sourceMappingURL=utils.d.ts.map