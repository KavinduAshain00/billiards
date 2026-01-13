"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Snooker = void 0;
var three_1 = require("three");
var watchevent_1 = require("../../events/watchevent");
var outcome_1 = require("../../model/outcome");
var rack_1 = require("../../utils/rack");
var respot_1 = require("../../utils/respot");
var aim_1 = require("../aim");
var watchaim_1 = require("../watchaim");
var chatevent_1 = require("../../events/chatevent");
var end_1 = require("../end");
var table_1 = require("../../model/table");
var tablegeometry_1 = require("../../view/tablegeometry");
var placeball_1 = require("../placeball");
var placeballevent_1 = require("../../events/placeballevent");
var utils_1 = require("../../utils/utils");
var snookerutils_1 = require("./snookerutils");
var startaimevent_1 = require("../../events/startaimevent");
var Snooker = /** @class */ (function () {
    function Snooker(container) {
        this.previousPotRed = false;
        this.targetIsRed = true;
        this.currentBreak = 0;
        this.previousBreak = 0;
        this.foulPoints = 0;
        this.score = 0;
        this.rulename = "snooker";
        this.container = container;
    }
    Snooker.prototype.snookerrule = function (outcome) {
        var _a, _b, _c;
        this.foulPoints = 0;
        var info = snookerutils_1.SnookerUtils.shotInfo(this.container.table, outcome, this.targetIsRed);
        if (info.pots === 0) {
            if (!info.legalFirstCollision) {
                var firstCollisionId = (_c = (_b = (_a = info.firstCollision) === null || _a === void 0 ? void 0 : _a.ballB) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : 0;
                this.foulPoints = Math.max(4, firstCollisionId + 1);
            }
            if (this.currentBreak > 0) {
                // end of break, reset break score
            }
            this.targetIsRed =
                snookerutils_1.SnookerUtils.redsOnTable(this.container.table).length > 0;
            return this.switchPlayer();
        }
        // ball has been potted
        if (this.targetIsRed) {
            return this.targetRedRule(outcome, info);
        }
        // non red potted
        return this.targetColourRule(outcome, info);
    };
    Snooker.prototype.targetRedRule = function (outcome, info) {
        console.log("applying target red rule");
        if (info.legalFirstCollision && outcome_1.Outcome.onlyRedsPotted(outcome)) {
            // legal pot of one or more reds
            this.currentBreak += info.pots;
            this.targetIsRed = false;
            this.previousPotRed = true;
            this.container.hud.updateBreak(this.currentBreak);
            return this.continueBreak();
        }
        this.foulPoints = this.foulCalculation(outcome, info);
        this.respot(outcome);
        if (info.whitePotted) {
            return this.whiteInHand();
        }
        return this.switchPlayer();
    };
    Snooker.prototype.targetColourRule = function (outcome, info) {
        console.log("applying target colour rule");
        if (info.whitePotted) {
            this.respot(outcome);
            return this.whiteInHand();
        }
        if (info.pots > 1) {
            this.foulPoints = this.foulCalculation(outcome, info);
            this.respot(outcome);
            return this.switchPlayer();
        }
        if (outcome_1.Outcome.pots(outcome)[0].id > 6) {
            this.foulPoints = this.foulCalculation(outcome, info);
            return this.switchPlayer();
        }
        this.targetIsRed = snookerutils_1.SnookerUtils.redsOnTable(this.container.table).length > 0;
        // exactly one non red potted
        var id = outcome_1.Outcome.pots(outcome)[0].id;
        if (id !== info.firstCollision.ballB.id) {
            return this.foul(outcome, info);
        }
        if (this.previousPotRed) {
            this.respot(outcome);
            this.currentBreak += id + 1;
            this.previousPotRed = false;
            return this.continueBreak();
        }
        var lesserBallOnTable = snookerutils_1.SnookerUtils.coloursOnTable(this.container.table).filter(function (b) { return b.id < id; })
            .length > 0;
        if (lesserBallOnTable) {
            return this.foul(outcome, info);
        }
        this.currentBreak += id + 1;
        this.previousPotRed = false;
        return this.continueBreak();
    };
    Snooker.prototype.foul = function (outcome, info) {
        this.foulPoints = this.foulCalculation(outcome, info);
        this.respot(outcome);
        return this.switchPlayer();
    };
    Snooker.prototype.foulCalculation = function (outcome, info) {
        var _a, _b, _c;
        var potted = outcome_1.Outcome.pots(outcome)
            .map(function (b) { return b.id; })
            .filter(function (id) { return id < 7; });
        var firstCollisionId = (_c = (_b = (_a = info.firstCollision) === null || _a === void 0 ? void 0 : _a.ballB) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : 0;
        if (firstCollisionId > 6) {
            firstCollisionId = 0;
        }
        return Math.max.apply(Math, __spreadArray([3, firstCollisionId], potted, false)) + 1;
    };
    Snooker.prototype.tableGeometry = function () {
        tablegeometry_1.TableGeometry.hasPockets = true;
    };
    Snooker.prototype.table = function () {
        var table = new table_1.Table(this.rack());
        this.cueball = table.cueball;
        return table;
    };
    Snooker.prototype.otherPlayersCueBall = function () {
        // only for three cushion
        return this.cueball;
    };
    Snooker.prototype.secondToPlay = function () {
        // only for three cushion
    };
    Snooker.prototype.isPartOfBreak = function (_) {
        return this.currentBreak > 0;
    };
    Snooker.prototype.isEndOfGame = function (_) {
        return outcome_1.Outcome.isClearTable(this.container.table) && this.currentBreak > 0;
    };
    Snooker.prototype.allowsPlaceBall = function () {
        return true;
    };
    Snooker.prototype.asset = function () {
        return Snooker.tablemodel;
    };
    Snooker.prototype.startTurn = function () {
        this.previousPotRed = false;
        this.targetIsRed = snookerutils_1.SnookerUtils.redsOnTable(this.container.table).length > 0;
        this.previousBreak = this.currentBreak;
        this.score += this.currentBreak;
        this.currentBreak = 0;
        this.container.hud.updateBreak(this.currentBreak);
    };
    Snooker.prototype.rack = function () {
        return rack_1.Rack.snooker();
    };
    Snooker.prototype.nextCandidateBall = function () {
        var table = this.container.table;
        var redsOnTable = snookerutils_1.SnookerUtils.redsOnTable(table);
        var coloursOnTable = snookerutils_1.SnookerUtils.coloursOnTable(table);
        if (this.previousPotRed) {
            return respot_1.Respot.closest(table.cueball, coloursOnTable);
        }
        if (redsOnTable.length > 0) {
            return respot_1.Respot.closest(table.cueball, redsOnTable);
        }
        if (coloursOnTable.length > 0) {
            return coloursOnTable[0];
        }
        return undefined;
    };
    Snooker.prototype.placeBall = function (target) {
        if (target) {
            // constrain to "D"
            var centre = new three_1.Vector3(rack_1.Rack.baulk, 0, 0);
            var radius = rack_1.Rack.sixth;
            var distance = target.distanceTo(centre);
            if (target.x >= rack_1.Rack.baulk) {
                target.x = rack_1.Rack.baulk;
            }
            if (distance > radius) {
                var direction = target.clone().sub(centre).normalize();
                return centre.add(direction.multiplyScalar(radius));
            }
            else {
                return target;
            }
        }
        return new three_1.Vector3(rack_1.Rack.baulk, -rack_1.Rack.sixth / 2.6, 0);
    };
    Snooker.prototype.switchPlayer = function () {
        if (this.foulPoints > 0) {
            console.log("foul, ".concat(this.foulPoints, " to opponent"));
        }
        console.log("end of break, switch player");
        var table = this.container.table;
        console.log(table.cue.aim);
        this.container.sendEvent(new startaimevent_1.StartAimEvent(this.foulPoints));
        if (this.container.isSinglePlayer) {
            this.container.sendEvent(new watchevent_1.WatchEvent(table.serialise()));
            this.startTurn();
            return new aim_1.Aim(this.container);
        }
        return new watchaim_1.WatchAim(this.container);
    };
    Snooker.prototype.continueBreak = function () {
        this.container.hud.updateBreak(this.currentBreak);
        var table = this.container.table;
        this.container.sound.playSuccess(table.inPockets());
        if (outcome_1.Outcome.isClearTable(table)) {
            this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "game over"));
            this.container.recorder.wholeGameLink();
            return new end_1.End(this.container);
        }
        this.container.sendEvent(new watchevent_1.WatchEvent(table.serialise()));
        return new aim_1.Aim(this.container);
    };
    Snooker.prototype.whiteInHand = function () {
        if (this.foulPoints > 0) {
            console.log("foul, ".concat(this.foulPoints, " to opponent"));
        }
        this.startTurn();
        if (this.container.isSinglePlayer) {
            return new placeball_1.PlaceBall(this.container);
        }
        this.container.sendEvent(new placeballevent_1.PlaceBallEvent(utils_1.zero, true));
        return new watchaim_1.WatchAim(this.container);
    };
    Snooker.prototype.update = function (outcome) {
        return this.snookerrule(outcome);
    };
    Snooker.prototype.respot = function (outcome) {
        var respotted = snookerutils_1.SnookerUtils.respotAllPottedColours(this.container.table, outcome);
        if (respotted.length > 0) {
            var changes = {
                balls: respotted.map(function (b) { return b.serialise(); }),
                rerack: true,
            };
            var respot = new watchevent_1.WatchEvent(changes);
            this.container.sendEvent(respot);
            this.container.recorder.record(respot);
        }
    };
    Snooker.tablemodel = "models/d-snooker.min.gltf";
    return Snooker;
}());
exports.Snooker = Snooker;
//# sourceMappingURL=snooker.js.map