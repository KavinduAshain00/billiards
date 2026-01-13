"use strict";
/**
 * Cushion physics - EXACT MATCH with client src/model/physics/cushion.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cushion = void 0;
const physics_1 = require("../physics/physics");
const tablegeometry_1 = require("./tablegeometry");
const pocketgeometry_1 = require("./pocketgeometry");
class Cushion {
    static bounceAny(ball, t, hasPockets = true, cushionModel = physics_1.bounceHanBlend) {
        const futurePosition = ball.futurePosition(t);
        if (Cushion.willBounceLong(futurePosition, hasPockets)) {
            const dir = futurePosition.y > tablegeometry_1.TableGeometry.tableY ? -Math.PI / 2 : Math.PI / 2;
            return Cushion.bounceIn(dir, ball, cushionModel);
        }
        if (Cushion.willBounceShort(futurePosition, hasPockets)) {
            const dir = futurePosition.x > tablegeometry_1.TableGeometry.tableX ? 0 : Math.PI;
            return Cushion.bounceIn(dir, ball, cushionModel);
        }
        return undefined;
    }
    static willBounceShort(futurePosition, hasPockets) {
        if (!hasPockets) {
            return Cushion.willBounceShortSegment(tablegeometry_1.TableGeometry.Y, -tablegeometry_1.TableGeometry.Y, futurePosition);
        }
        const pockets = pocketgeometry_1.PocketGeometry.pockets;
        return Cushion.willBounceShortSegment(pockets.pocketNW.knuckleSW.pos.y, pockets.pocketSW.knuckleNW.pos.y, futurePosition);
    }
    static willBounceLong(futurePosition, hasPockets) {
        if (!hasPockets) {
            return Cushion.willBounceLongSegment(-tablegeometry_1.TableGeometry.X, tablegeometry_1.TableGeometry.X, futurePosition);
        }
        const pockets = pocketgeometry_1.PocketGeometry.pockets;
        return (Cushion.willBounceLongSegment(pockets.pocketNW.knuckleNE.pos.x, pockets.pocketN.knuckleNW.pos.x, futurePosition) ||
            Cushion.willBounceLongSegment(pockets.pocketN.knuckleNE.pos.x, pockets.pocketNE.knuckleNW.pos.x, futurePosition));
    }
    static willBounceLongSegment(left, right, futurePosition) {
        return (futurePosition.x > left &&
            futurePosition.x < right &&
            Math.abs(futurePosition.y) > tablegeometry_1.TableGeometry.tableY);
    }
    static willBounceShortSegment(top, bottom, futurePosition) {
        return (futurePosition.y > bottom &&
            futurePosition.y < top &&
            Math.abs(futurePosition.x) > tablegeometry_1.TableGeometry.tableX);
    }
    static bounceIn(dir, ball, cushionModel) {
        const incidentSpeed = ball.vel.length();
        const delta = (0, physics_1.rotateApplyUnrotate)(dir, ball.vel, ball.rvel, cushionModel);
        ball.vel.add(delta.v);
        ball.rvel.add(delta.w);
        return incidentSpeed;
    }
}
exports.Cushion = Cushion;
//# sourceMappingURL=cushion.js.map