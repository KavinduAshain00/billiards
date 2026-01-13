"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableGeometry = void 0;
var constants_1 = require("../model/physics/constants");
var TableGeometry = /** @class */ (function () {
    function TableGeometry() {
    }
    TableGeometry.scaleToRadius = function (R) {
        TableGeometry.tableX = R * 43;
        TableGeometry.tableY = R * 21;
        TableGeometry.X = TableGeometry.tableX + R;
        TableGeometry.Y = TableGeometry.tableY + R;
    };
    TableGeometry.hasPockets = true;
    (function () {
        TableGeometry.scaleToRadius(constants_1.R);
    })();
    return TableGeometry;
}());
exports.TableGeometry = TableGeometry;
//# sourceMappingURL=tablegeometry.js.map