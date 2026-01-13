"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NineBall = void 0;
var three_1 = require("three");
var aim_1 = require("../../controller/aim");
var placeball_1 = require("../../controller/placeball");
var watchaim_1 = require("../../controller/watchaim");
var chatevent_1 = require("../../events/chatevent");
var watchevent_1 = require("../../events/watchevent");
var outcome_1 = require("../../model/outcome");
var table_1 = require("../../model/table");
var rack_1 = require("../../utils/rack");
var end_1 = require("../end");
var constants_1 = require("../../model/physics/constants");
var respot_1 = require("../../utils/respot");
var tablegeometry_1 = require("../../view/tablegeometry");
var startaimevent_1 = require("../../events/startaimevent");
var NineBall = /** @class */ (function () {
    function NineBall(container) {
        this.currentBreak = 0;
        this.previousBreak = 0;
        this.score = 0;
        this.rulename = "nineball";
        this.container = container;
    }
    NineBall.prototype.startTurn = function () {
        this.previousBreak = this.currentBreak;
        this.currentBreak = 0;
    };
    NineBall.prototype.nextCandidateBall = function () {
        return respot_1.Respot.closest(this.container.table.cueball, this.container.table.balls);
    };
    NineBall.prototype.placeBall = function (target) {
        if (target) {
            var max = new three_1.Vector3(-tablegeometry_1.TableGeometry.X / 2, tablegeometry_1.TableGeometry.tableY);
            var min = new three_1.Vector3(-tablegeometry_1.TableGeometry.tableX, -tablegeometry_1.TableGeometry.tableY);
            return target.clamp(min, max);
        }
        return new three_1.Vector3((-constants_1.R * 11) / 0.5, 0, 0);
    };
    NineBall.prototype.asset = function () {
        return "models/p8.min.gltf";
    };
    NineBall.prototype.tableGeometry = function () {
        tablegeometry_1.TableGeometry.hasPockets = true;
    };
    NineBall.prototype.table = function () {
        var table = new table_1.Table(this.rack());
        this.cueball = table.cueball;
        return table;
    };
    NineBall.prototype.rack = function () {
        return rack_1.Rack.diamond();
    };
    NineBall.prototype.update = function (outcome) {
        var table = this.container.table;
        // if white potted switch to other player
        if (outcome_1.Outcome.isCueBallPotted(table.cueball, outcome)) {
            this.startTurn();
            if (this.container.isSinglePlayer) {
                return new placeball_1.PlaceBall(this.container);
            }
            // Multiplayer: report foul to server and wait for turn change
            this.container.reportShotComplete(false, true, false); // potted=false, fouled=true, continues=false
            // Do NOT send a PlaceBallEvent from the fouling client – the opponent will receive the turn-change and place the ball
            return new watchaim_1.WatchAim(this.container);
        }
        if (outcome_1.Outcome.isBallPottedNoFoul(table.cueball, outcome)) {
            var pots = outcome_1.Outcome.potCount(outcome);
            this.currentBreak += pots;
            this.score += pots;
            this.container.sound.playSuccess(table.inPockets());
            if (this.isEndOfGame(outcome)) {
                this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "game over"));
                this.container.recorder.wholeGameLink();
                return new end_1.End(this.container);
            }
            // Player continues their turn (potted a ball, no foul)
            if (this.container.isSinglePlayer) {
                this.container.sendEvent(new watchevent_1.WatchEvent(table.serialise()));
                return new aim_1.Aim(this.container);
            }
            // Multiplayer: report pot to server and continue
            this.container.reportShotComplete(true, false, true); // potted=true, fouled=false, continues=true
            return new aim_1.Aim(this.container);
        }
        // if no pot and no foul switch to other player
        if (this.container.isSinglePlayer) {
            this.container.sendEvent(new startaimevent_1.StartAimEvent());
            this.container.sendEvent(new watchevent_1.WatchEvent(table.serialise()));
            this.startTurn();
            return new aim_1.Aim(this.container);
        }
        // Multiplayer: report no pot to server and wait for turn change
        this.container.reportShotComplete(false, false, false); // potted=false, fouled=false, continues=false
        return new watchaim_1.WatchAim(this.container);
    };
    NineBall.prototype.isPartOfBreak = function (outcome) {
        return outcome_1.Outcome.isBallPottedNoFoul(this.container.table.cueball, outcome);
    };
    NineBall.prototype.isEndOfGame = function (_) {
        var onTable = this.container.table.balls.filter(function (ball) { return ball.onTable(); });
        return onTable.length === 1 && onTable[0] === this.cueball;
    };
    NineBall.prototype.otherPlayersCueBall = function () {
        // only for three cushion
        return this.cueball;
    };
    NineBall.prototype.secondToPlay = function () {
        // only for three cushion
    };
    NineBall.prototype.allowsPlaceBall = function () {
        return true;
    };
    return NineBall;
}());
exports.NineBall = NineBall;
//# sourceMappingURL=nineball.js.map