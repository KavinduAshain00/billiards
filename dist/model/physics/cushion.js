"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cushion = void 0;
var tablegeometry_1 = require("../../view/tablegeometry");
var physics_1 = require("./physics");
var pocketgeometry_1 = require("../../view/pocketgeometry");
var Cushion = /** @class */ (function () {
    function Cushion() {
    }
    /**
     * Modify ball state reflecting in cushion if it impacts in time t.
     * Returns impact speed else undefined.
     *
     * Knuckle impacts are not part of this and handled elsewhere.
     */
    Cushion.bounceAny = function (ball, t, hasPockets, cushionModel) {
        if (hasPockets === void 0) { hasPockets = true; }
        if (cushionModel === void 0) { cushionModel = physics_1.bounceHanBlend; }
        var futurePosition = ball.futurePosition(t);
        if (Cushion.willBounceLong(futurePosition, hasPockets)) {
            var dir = futurePosition.y > tablegeometry_1.TableGeometry.tableY ? -Math.PI / 2 : Math.PI / 2;
            return Cushion.bounceIn(dir, ball, cushionModel);
        }
        if (Cushion.willBounceShort(futurePosition, hasPockets)) {
            var dir = futurePosition.x > tablegeometry_1.TableGeometry.tableX ? 0 : Math.PI;
            return Cushion.bounceIn(dir, ball, cushionModel);
        }
        return undefined;
    };
    Cushion.willBounceShort = function (futurePosition, hasPockets) {
        if (!hasPockets) {
            return Cushion.willBounceShortSegment(tablegeometry_1.TableGeometry.Y, -tablegeometry_1.TableGeometry.Y, futurePosition);
        }
        return Cushion.willBounceShortSegment(pocketgeometry_1.PocketGeometry.pockets.pocketNW.knuckleSW.pos.y, pocketgeometry_1.PocketGeometry.pockets.pocketSW.knuckleNW.pos.y, futurePosition);
    };
    Cushion.willBounceLong = function (futurePosition, hasPockets) {
        if (!hasPockets) {
            return Cushion.willBounceLongSegment(-tablegeometry_1.TableGeometry.X, tablegeometry_1.TableGeometry.X, futurePosition);
        }
        return (Cushion.willBounceLongSegment(pocketgeometry_1.PocketGeometry.pockets.pocketNW.knuckleNE.pos.x, pocketgeometry_1.PocketGeometry.pockets.pocketN.knuckleNW.pos.x, futurePosition) ||
            Cushion.willBounceLongSegment(pocketgeometry_1.PocketGeometry.pockets.pocketN.knuckleNE.pos.x, pocketgeometry_1.PocketGeometry.pockets.pocketNE.knuckleNW.pos.x, futurePosition));
    };
    /**
     * Long Cushion refers to longest dimention of table (skipping middle pocket),
     * in this model that is oriented along the X axis.
     */
    Cushion.willBounceLongSegment = function (left, right, futurePosition) {
        return (futurePosition.x > left &&
            futurePosition.x < right &&
            Math.abs(futurePosition.y) > tablegeometry_1.TableGeometry.tableY);
    };
    Cushion.willBounceShortSegment = function (top, bottom, futurePosition) {
        return (futurePosition.y > bottom &&
            futurePosition.y < top &&
            Math.abs(futurePosition.x) > tablegeometry_1.TableGeometry.tableX);
    };
    Cushion.bounceIn = function (rotation, ball, cushionModel) {
        ball.ballmesh.trace.forceTrace(ball.futurePos);
        var delta = (0, physics_1.rotateApplyUnrotate)(rotation, ball.vel, ball.rvel, cushionModel);
        ball.vel.add(delta.v);
        ball.rvel.add(delta.w);
        return delta.v.length();
    };
    return Cushion;
}());
exports.Cushion = Cushion;
//# sourceMappingURL=cushion.js.map