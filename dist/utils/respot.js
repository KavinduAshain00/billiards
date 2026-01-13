"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Respot = void 0;
var ball_1 = require("../model/ball");
var tablegeometry_1 = require("../view/tablegeometry");
var constants_1 = require("../model/physics/constants");
var rack_1 = require("./rack");
var Respot = /** @class */ (function () {
    function Respot() {
    }
    Respot.respot = function (ball, table) {
        var positions = rack_1.Rack.snookerColourPositions();
        positions.push(positions[ball.id - 1]);
        positions.reverse();
        var placed = positions.some(function (p) {
            if (!table.overlapsAny(p, ball)) {
                ball.pos.copy(p);
                ball.state = ball_1.State.Stationary;
                return true;
            }
            return false;
        });
        if (!placed) {
            Respot.respotBehind(positions[0], ball, table);
        }
        return ball;
    };
    Respot.respotBehind = function (targetpos, ball, table) {
        var pos = targetpos.clone();
        while (pos.x < tablegeometry_1.TableGeometry.tableX && table.overlapsAny(pos, ball)) {
            pos.x += constants_1.R / 8;
        }
        while (pos.x > -tablegeometry_1.TableGeometry.tableX && table.overlapsAny(pos, ball)) {
            pos.x -= constants_1.R / 8;
        }
        ball.pos.copy(pos);
        ball.state = ball_1.State.Stationary;
    };
    Respot.closest = function (cueball, balls) {
        var onTable = balls
            .filter(function (ball) { return ball.onTable(); })
            .filter(function (ball) { return ball !== cueball; });
        if (onTable.length === 0) {
            return;
        }
        var distanceToCueBall = function (b) {
            return cueball.pos.distanceTo(b.pos);
        };
        return onTable.reduce(function (a, b) { return (distanceToCueBall(a) < distanceToCueBall(b) ? a : b); }, onTable[0]);
    };
    return Respot;
}());
exports.Respot = Respot;
//# sourceMappingURL=respot.js.map