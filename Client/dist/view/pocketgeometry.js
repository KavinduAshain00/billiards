"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PocketGeometry = void 0;
var three_1 = require("three");
var knuckle_1 = require("../model/physics/knuckle");
var pocket_1 = require("../model/physics/pocket");
var tablegeometry_1 = require("./tablegeometry");
var constants_1 = require("../model/physics/constants");
// NW 1.05 Qn{x: -22.3, y: 11.3, z: 0}
// N 1 0.9 Qn{x: 0, y: 12.0, z: 0}
var PocketGeometry = /** @class */ (function () {
    function PocketGeometry() {
    }
    PocketGeometry.scaleToRadius = function (R) {
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
    };
    PocketGeometry.enumerateKnuckles = function () {
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
    };
    PocketGeometry.enumerateCenters = function () {
        PocketGeometry.pocketCenters = [
            PocketGeometry.pockets.pocketNW.pocket,
            PocketGeometry.pockets.pocketSW.pocket,
            PocketGeometry.pockets.pocketN.pocket,
            PocketGeometry.pockets.pocketS.pocket,
            PocketGeometry.pockets.pocketNE.pocket,
            PocketGeometry.pockets.pocketSE.pocket,
        ];
    };
    PocketGeometry.pocketLayout = function (R) {
        PocketGeometry.pockets = {
            pocketNW: {
                pocket: new pocket_1.Pocket(new three_1.Vector3(-PocketGeometry.PX, PocketGeometry.PY, 0), PocketGeometry.cornerRadius),
                knuckleNE: new knuckle_1.Knuckle(new three_1.Vector3(-tablegeometry_1.TableGeometry.X + PocketGeometry.knuckleInset, tablegeometry_1.TableGeometry.Y + PocketGeometry.knuckleRadius, 0), PocketGeometry.knuckleRadius),
                knuckleSW: new knuckle_1.Knuckle(new three_1.Vector3(-tablegeometry_1.TableGeometry.X - PocketGeometry.knuckleRadius, tablegeometry_1.TableGeometry.Y - PocketGeometry.knuckleInset, 0), PocketGeometry.knuckleRadius),
            },
            pocketN: {
                pocket: new pocket_1.Pocket(new three_1.Vector3(0, PocketGeometry.PY + (R * 0.7) / 0.5, 0), PocketGeometry.middleRadius),
                knuckleNE: new knuckle_1.Knuckle(new three_1.Vector3(PocketGeometry.middleKnuckleInset, tablegeometry_1.TableGeometry.Y + PocketGeometry.middleKnuckleRadius, 0), PocketGeometry.middleKnuckleRadius),
                knuckleNW: new knuckle_1.Knuckle(new three_1.Vector3(-PocketGeometry.middleKnuckleInset, tablegeometry_1.TableGeometry.Y + PocketGeometry.middleKnuckleRadius, 0), PocketGeometry.middleKnuckleRadius),
            },
            pocketS: {
                pocket: new pocket_1.Pocket(new three_1.Vector3(0, -PocketGeometry.PY - (R * 0.7) / 0.5, 0), PocketGeometry.middleRadius),
                knuckleSE: new knuckle_1.Knuckle(new three_1.Vector3(PocketGeometry.middleKnuckleInset, -tablegeometry_1.TableGeometry.Y - PocketGeometry.middleKnuckleRadius, 0), PocketGeometry.middleKnuckleRadius),
                knuckleSW: new knuckle_1.Knuckle(new three_1.Vector3(-PocketGeometry.middleKnuckleInset, -tablegeometry_1.TableGeometry.Y - PocketGeometry.middleKnuckleRadius, 0), PocketGeometry.middleKnuckleRadius),
            },
            pocketNE: {
                pocket: new pocket_1.Pocket(new three_1.Vector3(PocketGeometry.PX, PocketGeometry.PY, 0), PocketGeometry.cornerRadius),
                knuckleNW: new knuckle_1.Knuckle(new three_1.Vector3(tablegeometry_1.TableGeometry.X - PocketGeometry.knuckleInset, tablegeometry_1.TableGeometry.Y + PocketGeometry.knuckleRadius, 0), PocketGeometry.knuckleRadius),
                knuckleSE: new knuckle_1.Knuckle(new three_1.Vector3(tablegeometry_1.TableGeometry.X + PocketGeometry.knuckleRadius, tablegeometry_1.TableGeometry.Y - PocketGeometry.knuckleInset, 0), PocketGeometry.knuckleRadius),
            },
            pocketSE: {
                pocket: new pocket_1.Pocket(new three_1.Vector3(PocketGeometry.PX, -PocketGeometry.PY, 0), PocketGeometry.cornerRadius),
                knuckleNE: new knuckle_1.Knuckle(new three_1.Vector3(tablegeometry_1.TableGeometry.X + PocketGeometry.knuckleRadius, -tablegeometry_1.TableGeometry.Y + PocketGeometry.knuckleInset, 0), PocketGeometry.knuckleRadius),
                knuckleSW: new knuckle_1.Knuckle(new three_1.Vector3(tablegeometry_1.TableGeometry.X - PocketGeometry.knuckleInset, -tablegeometry_1.TableGeometry.Y - PocketGeometry.knuckleRadius, 0), PocketGeometry.knuckleRadius),
            },
            pocketSW: {
                pocket: new pocket_1.Pocket(new three_1.Vector3(-PocketGeometry.PX, -PocketGeometry.PY, 0), PocketGeometry.cornerRadius),
                knuckleSE: new knuckle_1.Knuckle(new three_1.Vector3(-tablegeometry_1.TableGeometry.X + PocketGeometry.knuckleInset, -tablegeometry_1.TableGeometry.Y - PocketGeometry.knuckleRadius, 0), PocketGeometry.knuckleRadius),
                knuckleNW: new knuckle_1.Knuckle(new three_1.Vector3(-tablegeometry_1.TableGeometry.X - PocketGeometry.knuckleRadius, -tablegeometry_1.TableGeometry.Y + PocketGeometry.knuckleInset, 0), PocketGeometry.knuckleRadius),
            },
        };
    };
    return PocketGeometry;
}());
exports.PocketGeometry = PocketGeometry;
(function () {
    PocketGeometry.scaleToRadius(constants_1.R);
})();
//# sourceMappingURL=pocketgeometry.js.map