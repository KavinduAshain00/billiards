"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Controller = exports.StationaryEvent = exports.AbortEvent = exports.Input = exports.HitEvent = exports.AimEvent = exports.BeginEvent = void 0;
var beginevent_1 = require("../events/beginevent");
Object.defineProperty(exports, "BeginEvent", { enumerable: true, get: function () { return beginevent_1.BeginEvent; } });
var aimevent_1 = require("../events/aimevent");
Object.defineProperty(exports, "AimEvent", { enumerable: true, get: function () { return aimevent_1.AimEvent; } });
var hitevent_1 = require("../events/hitevent");
Object.defineProperty(exports, "HitEvent", { enumerable: true, get: function () { return hitevent_1.HitEvent; } });
var input_1 = require("../events/input");
Object.defineProperty(exports, "Input", { enumerable: true, get: function () { return input_1.Input; } });
var abortevent_1 = require("../events/abortevent");
Object.defineProperty(exports, "AbortEvent", { enumerable: true, get: function () { return abortevent_1.AbortEvent; } });
var stationaryevent_1 = require("../events/stationaryevent");
Object.defineProperty(exports, "StationaryEvent", { enumerable: true, get: function () { return stationaryevent_1.StationaryEvent; } });
/**
 * Controller manages the state of the system reacting to input and network events in the animation loop.
 */
var Controller = /** @class */ (function () {
    function Controller(container) {
        this.container = container;
    }
    Controller.prototype.handleInput = function (_) {
        return this;
    };
    Controller.prototype.handleBegin = function (_) {
        return this;
    };
    Controller.prototype.handleBreak = function (_) {
        return this;
    };
    Controller.prototype.handleStartAim = function (_) {
        return this;
    };
    Controller.prototype.handleAim = function (_) {
        return this;
    };
    Controller.prototype.handleHit = function (_) {
        return this;
    };
    Controller.prototype.handleAbort = function (_) {
        return this;
    };
    Controller.prototype.handleWatch = function (_) {
        return this;
    };
    Controller.prototype.handlePlaceBall = function (_) {
        return this;
    };
    Controller.prototype.handleStationary = function (_) {
        return this;
    };
    Controller.prototype.handleChat = function (_) {
        return this;
    };
    Controller.prototype.handleRejoin = function (_) {
        return this;
    };
    Controller.prototype.onFirst = function () { };
    return Controller;
}());
exports.Controller = Controller;
//# sourceMappingURL=controller.js.map