"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CameraTop = void 0;
var three_1 = require("three");
var tablegeometry_1 = require("./tablegeometry");
var constants_1 = require("../model/physics/constants");
var CameraTop = /** @class */ (function () {
    function CameraTop() {
    }
    CameraTop.viewPoint = function (aspectRatio, fov) {
        var dist = CameraTop.zoomFactor / (2 * Math.tan((fov * Math.PI) / 360));
        if (aspectRatio > this.portrait) {
            var factor_1 = aspectRatio > CameraTop.aspectLimit
                ? 2.75 * tablegeometry_1.TableGeometry.tableY
                : (2.4 * tablegeometry_1.TableGeometry.tableX) / aspectRatio;
            return new three_1.Vector3(0, -0.01 * constants_1.R, dist * factor_1);
        }
        var factor = aspectRatio > 1 / CameraTop.aspectLimit
            ? 4.9 * tablegeometry_1.TableGeometry.tableY
            : (1.35 * tablegeometry_1.TableGeometry.tableX) / aspectRatio;
        return new three_1.Vector3(-0.01 * constants_1.R, 0, dist * factor);
    };
    CameraTop.aspectLimit = 1.78;
    CameraTop.portrait = 0.95;
    CameraTop.fov = 20;
    CameraTop.zoomFactor = 1;
    return CameraTop;
}());
exports.CameraTop = CameraTop;
//# sourceMappingURL=cameratop.js.map