"use strict";
/**
 * Table geometry - EXACT MATCH with client src/view/tablegeometry.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableGeometry = void 0;
const constants_1 = require("../physics/constants");
class TableGeometry {
    static scaleToRadius(R) {
        TableGeometry.tableX = R * 43;
        TableGeometry.tableY = R * 21;
        TableGeometry.X = TableGeometry.tableX + R;
        TableGeometry.Y = TableGeometry.tableY + R;
    }
}
exports.TableGeometry = TableGeometry;
TableGeometry.hasPockets = true;
(() => {
    TableGeometry.scaleToRadius(constants_1.R);
})();
//# sourceMappingURL=tablegeometry.js.map