"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.Replay = void 0;
var hitevent_1 = require("../events/hitevent");
var controllerbase_1 = require("./controllerbase");
var aimevent_1 = require("../events/aimevent");
var breakevent_1 = require("../events/breakevent");
var aim_1 = require("./aim");
var eventtype_1 = require("../events/eventtype");
var rerackevent_1 = require("../events/rerackevent");
var end_1 = require("./end");
var Replay = /** @class */ (function (_super) {
    __extends(Replay, _super);
    function Replay(container, init, shots, retry, delay) {
        if (retry === void 0) { retry = false; }
        if (delay === void 0) { delay = 1500; }
        var _this = _super.call(this, container) || this;
        _this.init = init;
        _this.shots = __spreadArray([], shots, true);
        _this.firstShot = _this.shots[0];
        _this.delay = delay;
        _this.container.table.showTraces(true);
        _this.container.table.updateFromShortSerialised(_this.init);
        if (retry) {
            var retryEvent = new breakevent_1.BreakEvent(init, shots);
            retryEvent.retry = true;
            _this.container.eventQueue.push(retryEvent);
        }
        else {
            _this.container.view.camera.forceMode(_this.container.view.camera.topView);
            _this.playNextShot(_this.delay * 1.5);
        }
        return _this;
    }
    Replay.prototype.playNextShot = function (delay) {
        var _this = this;
        var shot = this.shots.shift();
        if ((shot === null || shot === void 0 ? void 0 : shot.type) === eventtype_1.EventType.RERACK) {
            var rerack = rerackevent_1.RerackEvent.fromJson(shot.ballinfo);
            rerack.applyToController(this);
            if (this.shots.length > 0) {
                this.playNextShot(delay);
            }
            return;
        }
        var aim = aimevent_1.AimEvent.fromJson(shot);
        this.container.table.cueball = this.container.table.balls[aim.i];
        console.log(this.container.table.cueball.pos.distanceTo(aim.pos));
        this.container.table.cueball.pos.copy(aim.pos);
        this.container.table.cue.aim = aim;
        this.container.table.cue.updateAimInput();
        this.container.table.cue.t = 1;
        clearTimeout(this.timer);
        this.timer = setTimeout(function () {
            _this.container.eventQueue.push(new hitevent_1.HitEvent(_this.container.table.cue.aim));
            _this.timer = undefined;
        }, delay);
    };
    Replay.prototype.handleHit = function (_) {
        this.hit();
        return this;
    };
    Replay.prototype.handleStationary = function (_) {
        if (this.shots.length > 0 && this.timer === undefined) {
            this.playNextShot(this.delay);
        }
        return this;
    };
    Replay.prototype.handleInput = function (input) {
        this.commonKeyHandler(input);
        return this;
    };
    Replay.prototype.handleBreak = function (event) {
        this.container.table.updateFromShortSerialised(event.init);
        this.shots = __spreadArray([], event.shots, true);
        this.container.table.showSpin(true);
        if (event.retry) {
            return this.retry();
        }
        this.playNextShot(this.delay);
        return this;
    };
    Replay.prototype.handleAbort = function (_) {
        console.log("Replay aborted");
        return new end_1.End(this.container);
    };
    Replay.prototype.retry = function () {
        clearTimeout(this.timer);
        this.timer = undefined;
        this.container.table.updateFromShortSerialised(this.init);
        var aim = aimevent_1.AimEvent.fromJson(this.firstShot);
        this.container.table.cueball = this.container.table.balls[aim.i];
        this.container.rules.cueball = this.container.table.cueball;
        this.container.table.cueball.pos.copy(aim.pos);
        this.container.table.cue.aim = aim;
        this.container.view.camera.forceMode(this.container.view.camera.topView);
        return new aim_1.Aim(this.container);
    };
    return Replay;
}(controllerbase_1.ControllerBase));
exports.Replay = Replay;
//# sourceMappingURL=replay.js.map