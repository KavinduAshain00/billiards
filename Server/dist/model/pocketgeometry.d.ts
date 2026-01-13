/**
 * Pocket geometry - EXACT MATCH with client src/view/pocketgeometry.ts
 */
import { Knuckle } from "./knuckle";
import { Pocket } from "./pocket";
export declare class PocketGeometry {
    static PX: number;
    static PY: number;
    static knuckleInset: number;
    static knuckleRadius: number;
    static middleKnuckleInset: number;
    static middleKnuckleRadius: number;
    static cornerRadius: number;
    static middleRadius: number;
    static pockets: {
        pocketNW: {
            pocket: Pocket;
            knuckleNE: Knuckle;
            knuckleSW: Knuckle;
        };
        pocketN: {
            pocket: Pocket;
            knuckleNE: Knuckle;
            knuckleNW: Knuckle;
        };
        pocketS: {
            pocket: Pocket;
            knuckleSE: Knuckle;
            knuckleSW: Knuckle;
        };
        pocketNE: {
            pocket: Pocket;
            knuckleNW: Knuckle;
            knuckleSE: Knuckle;
        };
        pocketSE: {
            pocket: Pocket;
            knuckleNE: Knuckle;
            knuckleSW: Knuckle;
        };
        pocketSW: {
            pocket: Pocket;
            knuckleSE: Knuckle;
            knuckleNW: Knuckle;
        };
    };
    static knuckles: Knuckle[];
    static pocketCenters: Pocket[];
    static scaleToRadius(R: number): void;
    static enumerateKnuckles(): void;
    static enumerateCenters(): void;
    static pocketLayout(R: number): void;
}
//# sourceMappingURL=pocketgeometry.d.ts.map