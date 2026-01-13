"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EightBall = void 0;
var three_1 = require("three");
var aim_1 = require("../aim");
var placeball_1 = require("../placeball");
var watchaim_1 = require("../watchaim");
var chatevent_1 = require("../../events/chatevent");
var placeballevent_1 = require("../../events/placeballevent");
var watchevent_1 = require("../../events/watchevent");
var outcome_1 = require("../../model/outcome");
var table_1 = require("../../model/table");
var rack_1 = require("../../utils/rack");
var utils_1 = require("../../utils/utils");
var end_1 = require("../end");
var constants_1 = require("../../model/physics/constants");
var tablegeometry_1 = require("../../view/tablegeometry");
var startaimevent_1 = require("../../events/startaimevent");
var EightBall = /** @class */ (function () {
    function EightBall(container) {
        this.currentBreak = 0;
        this.previousBreak = 0;
        this.score = 0;
        this.rulename = "eightball";
        this.playerGroup = null; // null means table is open
        this.opponentGroup = null;
        this.isBreakShot = true;
        this.ballInHandBehindHeadString = false;
        this.container = container;
    }
    EightBall.prototype.startTurn = function () {
        var _a, _b;
        this.previousBreak = this.currentBreak;
        this.currentBreak = 0;
        // update HUD
        (_b = (_a = this.container) === null || _a === void 0 ? void 0 : _a.hud) === null || _b === void 0 ? void 0 : _b.updateBreak(this.currentBreak);
    };
    EightBall.prototype.nextCandidateBall = function () {
        var table = this.container.table;
        // If table is open, return lowest numbered ball (1)
        if (this.playerGroup === null) {
            return table.balls.find(function (b) { return b.id === 1 && b.onTable(); }) || table.balls[0];
        }
        // If all player's balls are potted, return the 8-ball
        var playerBalls = this.getPlayerBalls();
        if (playerBalls.length === 0) {
            return table.balls.find(function (b) { return b.id === 8 && b.onTable(); }) || table.balls[0];
        }
        // Return any of player's balls
        return playerBalls[0];
    };
    EightBall.prototype.placeBall = function (target) {
        if (target) {
            // During the break shot the cue must be placed behind the head string (kitchen).
            // Also respect existing 'ballInHandBehindHeadString' flag for fouls that give kitchen placement.
            if (this.isBreakShot || this.ballInHandBehindHeadString) {
                // Behind head string (kitchen) only
                var max = new three_1.Vector3(-tablegeometry_1.TableGeometry.X / 2, tablegeometry_1.TableGeometry.tableY);
                var min = new three_1.Vector3(-tablegeometry_1.TableGeometry.tableX, -tablegeometry_1.TableGeometry.tableY);
                return target.clamp(min, max);
            }
            else {
                // Ball in hand anywhere on table
                var max = new three_1.Vector3(tablegeometry_1.TableGeometry.tableX, tablegeometry_1.TableGeometry.tableY);
                var min = new three_1.Vector3(-tablegeometry_1.TableGeometry.tableX, -tablegeometry_1.TableGeometry.tableY);
                return target.clamp(min, max);
            }
        }
        // Default: if it's the initial break place in the kitchen, otherwise default to the current cueball pos
        if (this.isBreakShot) {
            return new three_1.Vector3((-constants_1.R * 11) / 0.5, 0, 0);
        }
        return this.container.table ? this.container.table.cueball.pos.clone() : new three_1.Vector3(0, 0, 0);
    };
    EightBall.prototype.asset = function () {
        return "models/p8.min.gltf";
    };
    EightBall.prototype.tableGeometry = function () {
        tablegeometry_1.TableGeometry.hasPockets = true;
    };
    EightBall.prototype.table = function () {
        var table = new table_1.Table(this.rack());
        this.cueball = table.cueball;
        return table;
    };
    EightBall.prototype.rack = function () {
        // Standard 8-ball triangle rack with all 15 balls properly numbered
        return rack_1.Rack.eightBall();
    };
    EightBall.prototype.getPlayerBalls = function () {
        var table = this.container.table;
        if (this.playerGroup === null)
            return [];
        if (this.playerGroup === "solids") {
            return table.balls.filter(function (b) { return b.id >= 1 && b.id <= 7 && b.onTable(); });
        }
        else {
            return table.balls.filter(function (b) { return b.id >= 9 && b.id <= 15 && b.onTable(); });
        }
    };
    EightBall.prototype.getOpponentBalls = function () {
        var table = this.container.table;
        if (this.opponentGroup === null)
            return [];
        if (this.opponentGroup === "solids") {
            return table.balls.filter(function (b) { return b.id >= 1 && b.id <= 7 && b.onTable(); });
        }
        else {
            return table.balls.filter(function (b) { return b.id >= 9 && b.id <= 15 && b.onTable(); });
        }
    };
    EightBall.prototype.assignGroups = function (pottedBall) {
        var _a, _b, _c, _d, _e, _f;
        if (this.playerGroup !== null)
            return; // Already assigned
        var n = (_b = (_a = pottedBall.ballmesh) === null || _a === void 0 ? void 0 : _a.ballNumber) !== null && _b !== void 0 ? _b : pottedBall.id;
        if (n >= 1 && n <= 7) {
            this.playerGroup = "solids";
            this.opponentGroup = "stripes";
            this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "You are solids"));
            (_d = (_c = this.container) === null || _c === void 0 ? void 0 : _c.hud) === null || _d === void 0 ? void 0 : _d.updateGroups(this.playerGroup);
        }
        else if (n >= 9 && n <= 15) {
            this.playerGroup = "stripes";
            this.opponentGroup = "solids";
            this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "You are stripes"));
            (_f = (_e = this.container) === null || _e === void 0 ? void 0 : _e.hud) === null || _f === void 0 ? void 0 : _f.updateGroups(this.playerGroup);
        }
    };
    EightBall.prototype.isLegalBreak = function (outcome) {
        // Rule 6: Must pocket a ball OR drive at least 4 balls to rail
        var pottedBalls = outcome_1.Outcome.pots(outcome);
        if (pottedBalls.length > 0)
            return true;
        // Count balls that hit rails (this is simplified - would need to track which balls hit rails)
        var cushionHits = outcome.filter(function (o) { return o.type === outcome_1.OutcomeType.Cushion; });
        // If we have at least 4 cushion events, it's likely a legal break
        return cushionHits.length >= 4;
    };
    EightBall.prototype.isLegalShot = function (outcome) {
        var table = this.container.table;
        // Check if cue ball hit a ball first
        var firstContact = outcome.find(function (o) { return o.type === outcome_1.OutcomeType.Collision; });
        if (!firstContact)
            return false;
        // On break shot, any ball is legal
        if (this.isBreakShot)
            return true;
        // On open table, any ball except 8-ball first is legal
        if (this.playerGroup === null) {
            var hitBall = firstContact.ballB;
            // Rule 10: When 8-ball is hit first on open table, no ball can be scored
            return (hitBall === null || hitBall === void 0 ? void 0 : hitBall.id) !== 8;
        }
        // Check if player must shoot 8-ball
        var playerBalls = this.getPlayerBalls();
        var mustShootEight = playerBalls.length === 0;
        if (mustShootEight) {
            // Must hit 8-ball first
            var eightBall = table.balls.find(function (b) { return b.id === 8; });
            if (firstContact.ballB !== eightBall)
                return false;
        }
        else {
            // Must hit own group first
            var hitBall = firstContact.ballB;
            if (this.playerGroup === "solids") {
                if (!hitBall || hitBall.id < 1 || hitBall.id > 7)
                    return false;
            }
            else {
                if (!hitBall || hitBall.id < 9 || hitBall.id > 15)
                    return false;
            }
        }
        // Rule 12: After hitting correct ball, must pocket a ball OR hit a rail
        var pottedBalls = outcome_1.Outcome.pots(outcome);
        var cushionHit = outcome.some(function (o) { return o.type === outcome_1.OutcomeType.Cushion; });
        return pottedBalls.length > 0 || cushionHit;
    };
    EightBall.prototype.update = function (outcome) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        var table = this.container.table;
        var pottedBalls = outcome_1.Outcome.pots(outcome);
        var eightBallPotted = pottedBalls.some(function (b) { return b.id === 8; });
        var cueBallPotted = outcome_1.Outcome.isCueBallPotted(table.cueball, outcome);
        // Rule 9: 8-ball pocketed on break
        if (this.isBreakShot && eightBallPotted) {
            if (cueBallPotted) {
                // Scratch while pocketing 8-ball on break - opponent gets option
                this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "8-ball pocketed with scratch on break. Opponent's option: re-rack or spot 8-ball"));
                // For now, just give ball in hand behind head string
                this.isBreakShot = false;
                this.ballInHandBehindHeadString = true;
                this.startTurn();
                // Reset cue ball to spot for the foul
                this.container.table.cueball.pos.copy(rack_1.Rack.spot);
                if (this.container.isSinglePlayer) {
                    return new placeball_1.PlaceBall(this.container);
                }
                this.container.sendEvent(new placeballevent_1.PlaceBallEvent(utils_1.zero, true));
                return new watchaim_1.WatchAim(this.container);
            }
            else {
                // 8-ball pocketed on break without scratch - spot and continue
                this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "8-ball pocketed on break - spotted"));
                // TODO: Implement 8-ball spotting
                this.isBreakShot = false;
                this.container.sendEvent(new watchevent_1.WatchEvent(table.serialise()));
                return new aim_1.Aim(this.container);
            }
        }
        // Handle break shot
        if (this.isBreakShot) {
            this.isBreakShot = false;
            // Rule 7: Scratch on legal break
            if (cueBallPotted) {
                var legalBreak = this.isLegalBreak(outcome);
                if (legalBreak) {
                    this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "Scratch on break. Ball in hand behind head string"));
                    this.ballInHandBehindHeadString = true;
                    this.startTurn();
                    // Reset cue ball to spot for the foul
                    this.container.table.cueball.pos.copy(rack_1.Rack.spot);
                    // update HUD
                    (_b = (_a = this.container) === null || _a === void 0 ? void 0 : _a.hud) === null || _b === void 0 ? void 0 : _b.updateBreak(this.currentBreak);
                    if (this.container.isSinglePlayer) {
                        return new placeball_1.PlaceBall(this.container);
                    }
                    // Multiplayer: report foul to server
                    this.container.reportShotComplete(false, true, false);
                    this.container.sendEvent(new placeballevent_1.PlaceBallEvent(utils_1.zero, true));
                    return new watchaim_1.WatchAim(this.container);
                }
                else {
                    this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "Illegal break. Opponent may re-rack or shoot"));
                    this.ballInHandBehindHeadString = true;
                    this.startTurn();
                    // Reset cue ball to spot for the foul
                    this.container.table.cueball.pos.copy(rack_1.Rack.spot);
                    // update HUD
                    (_d = (_c = this.container) === null || _c === void 0 ? void 0 : _c.hud) === null || _d === void 0 ? void 0 : _d.updateBreak(this.currentBreak);
                    if (this.container.isSinglePlayer) {
                        return new placeball_1.PlaceBall(this.container);
                    }
                    // Multiplayer: report foul to server
                    this.container.reportShotComplete(false, true, false);
                    this.container.sendEvent(new placeballevent_1.PlaceBallEvent(utils_1.zero, true));
                    return new watchaim_1.WatchAim(this.container);
                }
            }
            // Rule 6: Check for legal break
            if (!this.isLegalBreak(outcome)) {
                this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "Illegal break. Opponent may re-rack or shoot"));
                this.startTurn();
                this.container.sendEvent(new startaimevent_1.StartAimEvent());
                if (this.container.isSinglePlayer) {
                    this.container.sendEvent(new watchevent_1.WatchEvent(table.serialise()));
                    return new aim_1.Aim(this.container);
                }
                // Multiplayer: report foul to server
                this.container.reportShotComplete(false, true, false);
                return new watchaim_1.WatchAim(this.container);
            }
            // Legal break - continue shooting if any ball was pocketed
            if (pottedBalls.length > 0) {
                this.container.sound.playSuccess(table.inPockets());
                if (this.container.isSinglePlayer) {
                    this.container.sendEvent(new watchevent_1.WatchEvent(table.serialise()));
                    return new aim_1.Aim(this.container);
                }
                // Multiplayer: report pot to server (player continues)
                this.container.reportShotComplete(true, false, true);
                return new aim_1.Aim(this.container);
            }
            // No balls pocketed on break - switch players
            this.startTurn();
            this.container.sendEvent(new startaimevent_1.StartAimEvent());
            if (this.container.isSinglePlayer) {
                this.container.sendEvent(new watchevent_1.WatchEvent(table.serialise()));
                return new aim_1.Aim(this.container);
            }
            // Multiplayer: report no pot to server (turn switches)
            this.container.reportShotComplete(false, false, false);
            return new watchaim_1.WatchAim(this.container);
        }
        // Rule 20c: 8-ball jumped off table = loss of game
        // TODO: Need to detect jumped balls
        // Rule 20: 8-ball potted
        if (eightBallPotted) {
            var playerBalls = this.getPlayerBalls();
            // Rule 20a: Foul when pocketing 8-ball
            if (cueBallPotted) {
                this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "You lose! Scratched while pocketing 8-ball"));
                this.container.recorder.wholeGameLink();
                return new end_1.End(this.container);
            }
            // Rule 20e: 8-ball pocketed when not legal object ball
            if (playerBalls.length > 0) {
                this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "You lose! 8-ball potted early"));
                this.container.recorder.wholeGameLink();
                return new end_1.End(this.container);
            }
            // Rule 20b: 8-ball potted on same stroke as last ball
            var ownBallsPotted = pottedBalls.filter(function (b) {
                if (_this.playerGroup === "solids") {
                    return b.id >= 1 && b.id <= 7;
                }
                else {
                    return b.id >= 9 && b.id <= 15;
                }
            });
            if (ownBallsPotted.length > 0) {
                this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "You lose! 8-ball and own ball pocketed on same shot"));
                this.container.recorder.wholeGameLink();
                return new end_1.End(this.container);
            }
            // Check if shot was legal
            if (!this.isLegalShot(outcome)) {
                this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "You lose! 8-ball potted on illegal shot"));
                this.container.recorder.wholeGameLink();
                return new end_1.End(this.container);
            }
            // Win condition
            this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "You win! 8-ball legally pocketed"));
            this.container.recorder.wholeGameLink();
            return new end_1.End(this.container);
        }
        // Rule 15: Cue ball potted (not on break) - ball in hand anywhere
        if (cueBallPotted) {
            this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "Foul: Scratch. Opponent gets ball in hand"));
            this.ballInHandBehindHeadString = false;
            this.startTurn();
            // Reset cue ball to spot for the foul (so placement starts from a known consistent position)
            this.container.table.cueball.pos.copy(rack_1.Rack.spot);
            // update HUD
            (_f = (_e = this.container) === null || _e === void 0 ? void 0 : _e.hud) === null || _f === void 0 ? void 0 : _f.updateBreak(this.currentBreak);
            if (this.container.isSinglePlayer) {
                return new placeball_1.PlaceBall(this.container);
            }
            // Multiplayer: report foul to server
            this.container.reportShotComplete(false, true, false); // potted=false, fouled=true, continues=false
            this.container.sendEvent(new placeballevent_1.PlaceBallEvent(utils_1.zero, true));
            return new watchaim_1.WatchAim(this.container);
        }
        // Check for illegal shot (wrong ball hit or no rail contact)
        if (!this.isLegalShot(outcome)) {
            this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "Foul: Illegal shot. Opponent gets ball in hand"));
            this.ballInHandBehindHeadString = false;
            this.startTurn();
            this.container.sendEvent(new startaimevent_1.StartAimEvent());
            // Reset cueball to spot for the foul
            this.container.table.cueball.pos.copy(rack_1.Rack.spot);
            if (this.container.isSinglePlayer) {
                this.container.sendEvent(new watchevent_1.WatchEvent(table.serialise()));
                return new placeball_1.PlaceBall(this.container);
            }
            // Multiplayer: report foul to server
            this.container.reportShotComplete(false, true, false); // potted=false, fouled=true, continues=false
            this.container.sendEvent(new placeballevent_1.PlaceBallEvent(utils_1.zero, true));
            return new watchaim_1.WatchAim(this.container);
        }
        // Rule 11: Assign groups on first legal pot after break
        if (this.playerGroup === null && pottedBalls.length > 0) {
            var firstPot = pottedBalls[0];
            if (firstPot.id >= 1 && firstPot.id <= 7) {
                this.playerGroup = "solids";
                this.opponentGroup = "stripes";
                this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "You are solids"));
                // update HUD
                (_h = (_g = this.container) === null || _g === void 0 ? void 0 : _g.hud) === null || _h === void 0 ? void 0 : _h.updateGroups(this.playerGroup);
            }
            else if (firstPot.id >= 9 && firstPot.id <= 15) {
                this.playerGroup = "stripes";
                this.opponentGroup = "solids";
                this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "You are stripes"));
                // update HUD
                (_k = (_j = this.container) === null || _j === void 0 ? void 0 : _j.hud) === null || _k === void 0 ? void 0 : _k.updateGroups(this.playerGroup);
            }
        }
        // Check for valid pots
        var validPots = pottedBalls.filter(function (b) {
            if (b.id === 8)
                return false;
            if (_this.playerGroup === null)
                return true;
            if (_this.playerGroup === "solids") {
                return b.id >= 1 && b.id <= 7;
            }
            else {
                return b.id >= 9 && b.id <= 15;
            }
        });
        // Rule 17: All pocketed balls remain pocketed (even illegally pocketed)
        if (validPots.length > 0) {
            this.currentBreak += validPots.length;
            this.score += validPots.length;
            this.container.sound.playSuccess(table.inPockets());
            if (this.container.isSinglePlayer) {
                this.container.sendEvent(new watchevent_1.WatchEvent(table.serialise()));
                return new aim_1.Aim(this.container);
            }
            // Multiplayer: report valid pot to server (player continues)
            this.container.reportShotComplete(true, false, true); // potted=true, fouled=false, continues=true
            return new aim_1.Aim(this.container);
        }
        // No valid pot - switch players
        this.startTurn();
        this.container.sendEvent(new startaimevent_1.StartAimEvent());
        if (this.container.isSinglePlayer) {
            this.container.sendEvent(new watchevent_1.WatchEvent(table.serialise()));
            return new aim_1.Aim(this.container);
        }
        // Multiplayer: report no pot to server (turn switches)
        this.container.reportShotComplete(false, false, false); // potted=false, fouled=false, continues=false
        return new watchaim_1.WatchAim(this.container);
    };
    EightBall.prototype.isPartOfBreak = function (outcome) {
        var _this = this;
        var pottedBalls = outcome_1.Outcome.pots(outcome);
        // Any legal pot continues the break
        if (pottedBalls.length === 0)
            return false;
        var validPots = pottedBalls.filter(function (b) {
            if (b.id === 8)
                return false; // 8-ball doesn't continue break
            if (_this.playerGroup === null)
                return true; // On open table, any pot counts
            if (_this.playerGroup === "solids") {
                return b.id >= 1 && b.id <= 7;
            }
            else {
                return b.id >= 9 && b.id <= 15;
            }
        });
        return validPots.length > 0 && this.isLegalShot(outcome);
    };
    EightBall.prototype.isEndOfGame = function (_outcome) {
        var eightBall = this.container.table.balls.find(function (b) { return b.id === 8; });
        return eightBall ? !eightBall.onTable() : false;
    };
    EightBall.prototype.otherPlayersCueBall = function () {
        return this.cueball;
    };
    EightBall.prototype.secondToPlay = function () {
        // only for three cushion
    };
    EightBall.prototype.allowsPlaceBall = function () {
        return true;
    };
    return EightBall;
}());
exports.EightBall = EightBall;
//# sourceMappingURL=eightball.js.map