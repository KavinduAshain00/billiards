"use strict";
/**
 * Pocket geometry - EXACT MATCH with client src/view/pocketgeometry.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PocketGeometry = void 0;
const utils_1 = require("../physics/utils");
const knuckle_1 = require("./knuckle");
const pocket_1 = require("./pocket");
const tablegeometry_1 = require("./tablegeometry");
const constants_1 = require("../physics/constants");
class PocketGeometry {
    static scaleToRadius(R) {
        PocketGeometry.PX = tablegeometry_1.TableGeometry.tableX + R * (0.8 / 0.5);
        PocketGeometry.PY = tablegeometry_1.TableGeometry.tableY + R * (0.8 / 0.5);
        PocketGeometry.knuckleInset = (R * 1.6) / 0.5;
        PocketGeometry.knuckleRadius = (R * 0.31) / 0.5;
        PocketGeometry.middleKnuckleInset = (R * 1.385) / 0.5;
        PocketGeometry.middleKnuckleRadius = (R * 0.2) / 0.5;
        PocketGeometry.cornerRadius = (R * 1.1) / 0.5;
        PocketGeometry.middleRadius = (R * 0.9) / 0.5;
        PocketGeometry.pocketLayout(R);
        PocketGeometry.enumerateCenters();
        PocketGeometry.enumerateKnuckles();
    }
    static enumerateKnuckles() {
        PocketGeometry.knuckles = [
            PocketGeometry.pockets.pocketNW.knuckleNE,
            PocketGeometry.pockets.pocketNW.knuckleSW,
            PocketGeometry.pockets.pocketN.knuckleNW,
            PocketGeometry.pockets.pocketN.knuckleNE,
            PocketGeometry.pockets.pocketS.knuckleSW,
            PocketGeometry.pockets.pocketS.knuckleSE,
            PocketGeometry.pockets.pocketNE.knuckleNW,
            PocketGeometry.pockets.pocketNE.knuckleSE,
            PocketGeometry.pockets.pocketSE.knuckleNE,
            PocketGeometry.pockets.pocketSE.knuckleSW,
            PocketGeometry.pockets.pocketSW.knuckleSE,
            PocketGeometry.pockets.pocketSW.knuckleNW,
        ];
    }
    static enumerateCenters() {
        PocketGeometry.pocketCenters = [
            PocketGeometry.pockets.pocketNW.pocket,
            PocketGeometry.pockets.pocketSW.pocket,
            PocketGeometry.pockets.pocketN.pocket,
            PocketGeometry.pockets.pocketS.pocket,
            PocketGeometry.pockets.pocketNE.pocket,
            PocketGeometry.pockets.pocketSE.pocket,
        ];
    }
    static pocketLayout(R) {
        PocketGeometry.pockets = {
            pocketNW: {
                pocket: new pocket_1.Pocket(new utils_1.Vector3(-PocketGeometry.PX, PocketGeometry.PY, 0), PocketGeometry.cornerRadius),
                knuckleNE: new knuckle_1.Knuckle(new utils_1.Vector3(-tablegeometry_1.TableGeometry.X + PocketGeometry.knuckleInset, tablegeometry_1.TableGeometry.Y + PocketGeometry.knuckleRadius, 0), PocketGeometry.knuckleRadius),
                knuckleSW: new knuckle_1.Knuckle(new utils_1.Vector3(-tablegeometry_1.TableGeometry.X - PocketGeometry.knuckleRadius, tablegeometry_1.TableGeometry.Y - PocketGeometry.knuckleInset, 0), PocketGeometry.knuckleRadius),
            },
            pocketN: {
                pocket: new pocket_1.Pocket(new utils_1.Vector3(0, PocketGeometry.PY + (R * 0.7) / 0.5, 0), PocketGeometry.middleRadius),
                knuckleNE: new knuckle_1.Knuckle(new utils_1.Vector3(PocketGeometry.middleKnuckleInset, tablegeometry_1.TableGeometry.Y + PocketGeometry.middleKnuckleRadius, 0), PocketGeometry.middleKnuckleRadius),
                knuckleNW: new knuckle_1.Knuckle(new utils_1.Vector3(-PocketGeometry.middleKnuckleInset, tablegeometry_1.TableGeometry.Y + PocketGeometry.middleKnuckleRadius, 0), PocketGeometry.middleKnuckleRadius),
            },
            pocketS: {
                pocket: new pocket_1.Pocket(new utils_1.Vector3(0, -PocketGeometry.PY - (R * 0.7) / 0.5, 0), PocketGeometry.middleRadius),
                knuckleSE: new knuckle_1.Knuckle(new utils_1.Vector3(PocketGeometry.middleKnuckleInset, -tablegeometry_1.TableGeometry.Y - PocketGeometry.middleKnuckleRadius, 0), PocketGeometry.middleKnuckleRadius),
                knuckleSW: new knuckle_1.Knuckle(new utils_1.Vector3(-PocketGeometry.middleKnuckleInset, -tablegeometry_1.TableGeometry.Y - PocketGeometry.middleKnuckleRadius, 0), PocketGeometry.middleKnuckleRadius),
            },
            pocketNE: {
                pocket: new pocket_1.Pocket(new utils_1.Vector3(PocketGeometry.PX, PocketGeometry.PY, 0), PocketGeometry.cornerRadius),
                knuckleNW: new knuckle_1.Knuckle(new utils_1.Vector3(tablegeometry_1.TableGeometry.X - PocketGeometry.knuckleInset, tablegeometry_1.TableGeometry.Y + PocketGeometry.knuckleRadius, 0), PocketGeometry.knuckleRadius),
                knuckleSE: new knuckle_1.Knuckle(new utils_1.Vector3(tablegeometry_1.TableGeometry.X + PocketGeometry.knuckleRadius, tablegeometry_1.TableGeometry.Y - PocketGeometry.knuckleInset, 0), PocketGeometry.knuckleRadius),
            },
            pocketSE: {
                pocket: new pocket_1.Pocket(new utils_1.Vector3(PocketGeometry.PX, -PocketGeometry.PY, 0), PocketGeometry.cornerRadius),
                knuckleNE: new knuckle_1.Knuckle(new utils_1.Vector3(tablegeometry_1.TableGeometry.X + PocketGeometry.knuckleRadius, -tablegeometry_1.TableGeometry.Y + PocketGeometry.knuckleInset, 0), PocketGeometry.knuckleRadius),
                knuckleSW: new knuckle_1.Knuckle(new utils_1.Vector3(tablegeometry_1.TableGeometry.X - PocketGeometry.knuckleInset, -tablegeometry_1.TableGeometry.Y - PocketGeometry.knuckleRadius, 0), PocketGeometry.knuckleRadius),
            },
            pocketSW: {
                pocket: new pocket_1.Pocket(new utils_1.Vector3(-PocketGeometry.PX, -PocketGeometry.PY, 0), PocketGeometry.cornerRadius),
                knuckleSE: new knuckle_1.Knuckle(new utils_1.Vector3(-tablegeometry_1.TableGeometry.X + PocketGeometry.knuckleInset, -tablegeometry_1.TableGeometry.Y - PocketGeometry.knuckleRadius, 0), PocketGeometry.knuckleRadius),
                knuckleNW: new knuckle_1.Knuckle(new utils_1.Vector3(-tablegeometry_1.TableGeometry.X - PocketGeometry.knuckleRadius, -tablegeometry_1.TableGeometry.Y + PocketGeometry.knuckleInset, 0), PocketGeometry.knuckleRadius),
            },
        };
    }
}
exports.PocketGeometry = PocketGeometry;
(() => {
    PocketGeometry.scaleToRadius(constants_1.R);
})();
//# sourceMappingURL=pocketgeometry.js.map