"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Recorder = void 0;
var outcome_1 = require("../model/outcome");
var chatevent_1 = require("./chatevent");
var eventtype_1 = require("./eventtype");
var jsoncrush_1 = require("jsoncrush");
var rerackevent_1 = require("./rerackevent");
var Recorder = /** @class */ (function () {
    function Recorder(container) {
        this.shots = [];
        this.states = [];
        this.start = Date.now();
        this.hiScoreUrl = "https://scoreboard-tailuge.vercel.app/hiscore.html";
        this.container = container;
    }
    Recorder.prototype.record = function (event) {
        if (event.type === eventtype_1.EventType.WATCHAIM && "rerack" in event.json) {
            this.states.push(this.container.table.shortSerialise());
            this.shots.push(rerackevent_1.RerackEvent.fromJson({
                balls: event.json.balls,
            }));
        }
        if (event.type === eventtype_1.EventType.HIT) {
            this.states.push(this.container.table.shortSerialise());
            this.shots.push(event.tablejson.aim);
        }
    };
    Recorder.prototype.wholeGame = function () {
        return this.state(this.states[0], this.shots, this.start, this.container.rules.score, true);
    };
    Recorder.prototype.last = function () {
        var last = this.states.length - 1;
        if (last > 0 && this.shots[last].type === "RERACK") {
            last--;
        }
        return last;
    };
    Recorder.prototype.lastShot = function () {
        var last = this.last();
        return this.state(this.states[last], [this.shots[last]]);
    };
    Recorder.prototype.currentBreak = function () {
        if (this.breakStart !== undefined) {
            return this.state(this.states[this.breakStart], this.shots.slice(this.breakStart), this.breakStartTime, this.container.rules.previousBreak);
        }
        return undefined;
    };
    Recorder.prototype.state = function (init, events, start, score, wholeGame) {
        if (start === void 0) { start = 0; }
        if (score === void 0) { score = 0; }
        if (wholeGame === void 0) { wholeGame = false; }
        return {
            init: init,
            shots: events,
            start: start,
            now: Date.now(),
            score: score,
            wholeGame: wholeGame,
            v: 1,
        };
    };
    Recorder.prototype.updateBreak = function (outcome) {
        var isPartOfBreak = this.container.rules.isPartOfBreak(outcome);
        var isEndOfGame = this.container.rules.isEndOfGame(outcome);
        var potCount = outcome_1.Outcome.potCount(outcome);
        if (!isPartOfBreak) {
            this.breakLink(isEndOfGame);
        }
        this.lastShotLink(isPartOfBreak || isEndOfGame, potCount, outcome_1.Outcome.pots(outcome));
        if (isEndOfGame) {
            this.breakLink(isEndOfGame);
        }
        if (!isPartOfBreak) {
            this.breakStart = undefined;
            return;
        }
        if (this.breakStart === undefined) {
            this.breakStart = this.last();
            this.breakStartTime = Date.now();
        }
    };
    Recorder.prototype.lastShotLink = function (isPartOfBreak, potCount, balls) {
        var pots = potCount > 1 ? potCount - 1 : 0;
        var colourString = "#000000";
        if (balls.length > 0) {
            balls.forEach(function (element) {
                colourString = "#" + element.ballmesh.color.getHexString();
            });
        }
        var shotIcon = "⚈".repeat(pots) + (isPartOfBreak ? "⚈" : "⚆");
        var serialisedShot = JSON.stringify(this.lastShot());
        this.generateLink(shotIcon, serialisedShot, colourString);
    };
    Recorder.prototype.breakLink = function (includeLastShot) {
        var currentBreak = this.currentBreak();
        if (!currentBreak) {
            return;
        }
        if (!includeLastShot) {
            currentBreak.shots.pop();
        }
        if (currentBreak.shots.length === 1) {
            return;
        }
        var breakScore = this.container.rules.currentBreak === 0
            ? this.container.rules.previousBreak
            : this.container.rules.currentBreak;
        currentBreak.score = breakScore;
        var text = "break(".concat(breakScore, ")");
        var serialisedShot = JSON.stringify(currentBreak);
        var compressed = jsoncrush_1.default.crush(serialisedShot);
        this.generateLink(text, compressed, "black");
        if (breakScore >= 2) {
            this.generateHiScoreLink(compressed);
        }
    };
    Recorder.prototype.wholeGameLink = function () {
        var game = this.wholeGame();
        var text = "frame(".concat(this.shotCount(game.shots), " shots)");
        var serialisedGame = JSON.stringify(game);
        var compressed = jsoncrush_1.default.crush(serialisedGame);
        this.generateLink(text, compressed, "black");
    };
    Recorder.prototype.shotCount = function (shots) {
        return shots.filter(function (shot) { return shot.type !== "RERACK"; }).length;
    };
    Recorder.prototype.generateLink = function (text, state, colour) {
        var shotUri = "".concat(this.replayUrl).concat(this.fullyEncodeURI(state));
        var shotLink = "<a class=\"pill\" style=\"color: ".concat(colour, "\" target=\"_blank\" href=\"").concat(shotUri, "\">").concat(text, "</a>");
        this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "".concat(shotLink)));
    };
    Recorder.prototype.generateHiScoreLink = function (state) {
        var text = "hi score 🏆";
        var shotUri = "".concat(this.hiScoreUrl, "?ruletype=").concat(this.container.rules.rulename, "&state=").concat(this.fullyEncodeURI(state));
        var shotLink = "<a class=\"pill\" target=\"_blank\" href=\"".concat(shotUri, "\">").concat(text, "</a>");
        this.container.eventQueue.push(new chatevent_1.ChatEvent(null, "".concat(shotLink)));
    };
    Recorder.prototype.fullyEncodeURI = function (uri) {
        return encodeURIComponent(uri)
            .replace(/\(/g, "%28")
            .replace(/\)/g, "%29")
            .replace(/\!/g, "%21")
            .replace(/\*/g, "%2A");
    };
    return Recorder;
}());
exports.Recorder = Recorder;
//# sourceMappingURL=recorder.js.map