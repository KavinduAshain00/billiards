"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Overlap = void 0;
var three_1 = require("three");
var utils_1 = require("./utils");
var constants_1 = require("../model/physics/constants");
var tablegeometry_1 = require("../view/tablegeometry");
var Overlap = /** @class */ (function () {
    function Overlap(balls) {
        this.line = new three_1.Line3();
        this.balls = balls;
    }
    Overlap.prototype.getFirst = function (cueball, direction) {
        var _this = this;
        this.line.set(cueball.pos, (0, utils_1.norm)(direction)
            .multiplyScalar(tablegeometry_1.TableGeometry.X * 4)
            .add(cueball.pos));
        var res = new three_1.Vector3();
        var projected = this.balls.map(function (ball) {
            _this.line.closestPointToPoint(ball.pos, true, res);
            return {
                ball: ball,
                perpendicular: res.distanceTo(ball.pos),
                distance: res.distanceTo(cueball.pos),
            };
        });
        var inPath = projected
            .filter(function (info) { return info.perpendicular < 2 * constants_1.R; })
            .filter(function (info) { return info.ball !== cueball; });
        return inPath.reduce(function (best, current) { return (best.distance < current.distance ? best : current); }, inPath[0]);
    };
    Overlap.prototype.getOverlapOffset = function (cueball, direction) {
        var closest = this.getFirst(cueball, direction);
        if (!closest) {
            return undefined;
        }
        var centers = closest.ball.pos.clone().sub(cueball.pos);
        var overlap = (closest.perpendicular * Math.sign(centers.cross(direction).z)) / constants_1.R;
        return { ball: closest.ball, overlap: overlap };
    };
    return Overlap;
}());
exports.Overlap = Overlap;
//# sourceMappingURL=overlap.js.map