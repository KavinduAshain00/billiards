"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnookerUtils = void 0;
var outcome_1 = require("../../model/outcome");
var respot_1 = require("../../utils/respot");
var SnookerUtils = /** @class */ (function () {
    function SnookerUtils() {
    }
    SnookerUtils.shotInfo = function (table, outcome, targetIsRed) {
        var firstCollision = outcome_1.Outcome.firstCollision(outcome);
        return {
            pots: outcome_1.Outcome.potCount(outcome),
            firstCollision: firstCollision,
            legalFirstCollision: SnookerUtils.isLegalFirstCollision(table, targetIsRed, firstCollision),
            whitePotted: outcome_1.Outcome.isCueBallPotted(table.cueball, outcome),
        };
    };
    SnookerUtils.isLegalFirstCollision = function (table, targetIsRed, firstCollision) {
        if (!firstCollision) {
            return false;
        }
        var id = firstCollision.ballB.id;
        if (targetIsRed) {
            var isRed = id >= 7;
            return isRed;
        }
        var lesserBallOnTable = SnookerUtils.coloursOnTable(table).filter(function (b) { return b.id < id; }).length > 0;
        return !lesserBallOnTable;
    };
    SnookerUtils.respotAllPottedColours = function (table, outcome) {
        return outcome_1.Outcome.pots(outcome)
            .filter(function (ball) { return ball.id < 7; })
            .filter(function (ball) { return ball.id !== 0; })
            .map(function (ball) { return respot_1.Respot.respot(ball, table); });
    };
    SnookerUtils.redsOnTable = function (table) {
        return table.balls.slice(7).filter(function (ball) { return ball.onTable(); });
    };
    SnookerUtils.coloursOnTable = function (table) {
        return table.balls.slice(1, 7).filter(function (ball) { return ball.onTable(); });
    };
    return SnookerUtils;
}());
exports.SnookerUtils = SnookerUtils;
//# sourceMappingURL=snookerutils.js.map