/**
 * Physics calculations - EXACT MATCH with client src/model/physics/physics.ts
 * This MUST produce identical results to the client
 */
import { Vector3 } from "./utils";
export declare function surfaceVelocity(v: Vector3, w: Vector3): Vector3;
export declare function surfaceVelocityFull(v: Vector3, w: Vector3): Vector3;
export declare function sliding(v: Vector3, w: Vector3): {
    v: Vector3;
    w: Vector3;
};
export declare function rollingFull(w: Vector3): {
    v: Vector3;
    w: Vector3;
};
export declare function forceRoll(v: Vector3, w: Vector3): void;
export declare function rotateApplyUnrotate(theta: number, v: Vector3, w: Vector3, model: (v: Vector3, w: Vector3) => {
    v: Vector3;
    w: Vector3;
}): {
    v: Vector3;
    w: Vector3;
};
export declare function s0(v: Vector3, w: Vector3): Vector3;
export declare function c0(v: Vector3): number;
export declare function Pzs(s: Vector3): number;
export declare function Pze(c: number): number;
export declare function isGripCushion(v: Vector3, w: Vector3): boolean;
export declare function bounceHan(v: Vector3, w: Vector3): {
    v: Vector3;
    w: Vector3;
};
export declare function bounceHanBlend(v: Vector3, w: Vector3): {
    v: Vector3;
    w: Vector3;
};
export declare function muCushion(v: Vector3): number;
export declare function restitutionCushion(v: Vector3): number;
export declare function mathavenAdapter(v: Vector3, w: Vector3): {
    v: Vector3;
    w: Vector3;
};
export declare function cueToSpin(offset: Vector3, v: Vector3): Vector3;
//# sourceMappingURL=physics.d.ts.map