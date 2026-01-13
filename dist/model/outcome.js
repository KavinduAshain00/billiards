"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Outcome = exports.OutcomeType = void 0;
var OutcomeType;
(function (OutcomeType) {
    OutcomeType["Pot"] = "Pot";
    OutcomeType["Cushion"] = "Cushion";
    OutcomeType["Collision"] = "Collision";
    OutcomeType["Hit"] = "Hit";
})(OutcomeType || (exports.OutcomeType = OutcomeType = {}));
var Outcome = /** @class */ (function () {
    function Outcome(type, ballA, ballB, incidentSpeed) {
        this.ballA = null;
        this.ballB = null;
        this.type = type;
        this.ballA = ballA;
        this.ballB = ballB;
        this.incidentSpeed = incidentSpeed;
        this.timestamp = Date.now();
    }
    Outcome.pot = function (ballA, incidentSpeed) {
        return new Outcome(OutcomeType.Pot, ballA, ballA, incidentSpeed);
    };
    Outcome.cushion = function (ballA, incidentSpeed) {
        return new Outcome(OutcomeType.Cushion, ballA, ballA, incidentSpeed);
    };
    Outcome.collision = function (ballA, ballB, incidentSpeed) {
        return new Outcome(OutcomeType.Collision, ballA, ballB, incidentSpeed);
    };
    Outcome.hit = function (ballA, incidentSpeed) {
        return new Outcome(OutcomeType.Hit, ballA, ballA, incidentSpeed);
    };
    Outcome.isCueBallPotted = function (cueBall, outcomes) {
        return outcomes.some(function (o) { return o.type == OutcomeType.Pot && o.ballA === cueBall; });
    };
    Outcome.isBallPottedNoFoul = function (cueBall, outcomes) {
        return (outcomes.some(function (o) { return o.type == OutcomeType.Pot && o.ballA !== null; }) &&
            !Outcome.isCueBallPotted(cueBall, outcomes));
    };
    Outcome.pots = function (outcomes) {
        return outcomes
            .filter(function (o) { return o.type == OutcomeType.Pot; })
            .map(function (o) { return o.ballA; });
    };
    Outcome.potCount = function (outcomes) {
        return this.pots(outcomes).length;
    };
    Outcome.onlyRedsPotted = function (outcomes) {
        return this.pots(outcomes).every(function (b) { return b.id > 6; });
    };
    Outcome.firstCollision = function (outcome) {
        var collisions = outcome.filter(function (o) { return o.type === OutcomeType.Collision; });
        return collisions.length > 0 ? collisions[0] : undefined;
    };
    Outcome.isClearTable = function (table) {
        var onTable = table.balls.filter(function (ball) { return ball.onTable(); });
        return onTable.length === 1 && onTable[0] === table.cueball;
    };
    Outcome.isThreeCushionPoint = function (cueBall, outcomes) {
        outcomes = Outcome.cueBallFirst(cueBall, outcomes).filter(function (outcome) { return outcome.ballA === cueBall; });
        var cannons = new Set();
        var cushions = 0;
        for (var _i = 0, outcomes_1 = outcomes; _i < outcomes_1.length; _i++) {
            var outcome = outcomes_1[_i];
            if (outcome.type === OutcomeType.Cushion) {
                cushions++;
            }
            if (outcome.type === OutcomeType.Collision) {
                cannons.add(outcome.ballB);
                if (cannons.size === 2) {
                    return cushions >= 3;
                }
            }
        }
        return false;
    };
    Outcome.cueBallFirst = function (cueBall, outcomes) {
        outcomes.forEach(function (o) {
            if (o.type === OutcomeType.Collision && o.ballB === cueBall) {
                o.ballB = o.ballA;
                o.ballA = cueBall;
            }
        });
        return outcomes;
    };
    return Outcome;
}());
exports.Outcome = Outcome;
//# sourceMappingURL=outcome.js.map