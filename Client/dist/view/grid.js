"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Grid = void 0;
var three_1 = require("three");
var tablegeometry_1 = require("./tablegeometry");
var constants_1 = require("../model/physics/constants");
var Grid = /** @class */ (function () {
    function Grid() {
        this.material = new three_1.LineBasicMaterial({
            color: 0x000084,
            opacity: 0.15,
            transparent: true,
        });
    }
    Grid.prototype.generateLineSegments = function () {
        var _this = this;
        var points = [
            this.point(0, (-11.13 * constants_1.R) / 0.5),
            this.point(0, (11.13 * constants_1.R) / 0.5),
        ];
        var stepx = tablegeometry_1.TableGeometry.X / 4;
        var xs = [1, 2, 3, -1, -2, -3];
        var yedge = tablegeometry_1.TableGeometry.tableY + constants_1.R;
        xs.forEach(function (x) {
            points.push(_this.point(x * stepx, -yedge));
            points.push(_this.point(x * stepx, yedge));
        });
        var stepy = (tablegeometry_1.TableGeometry.Y + constants_1.R) / 2;
        var ys = [-1, 0, 1];
        var xedge = tablegeometry_1.TableGeometry.tableX + constants_1.R;
        ys.forEach(function (y) {
            points.push(_this.point(-xedge, y * stepy));
            points.push(_this.point(xedge, y * stepy));
        });
        var geometry = new three_1.BufferGeometry().setFromPoints(points);
        return new three_1.LineSegments(geometry, this.material);
    };
    Grid.prototype.point = function (x, y) {
        var z = (-constants_1.R * 0.485) / 0.5;
        return new three_1.Vector3(x, y, z);
    };
    return Grid;
}());
exports.Grid = Grid;
//# sourceMappingURL=grid.js.map