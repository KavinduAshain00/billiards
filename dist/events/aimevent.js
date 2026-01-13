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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AimEvent = void 0;
var gameevent_1 = require("./gameevent");
var eventtype_1 = require("./eventtype");
var utils_1 = require("../utils/utils");
var three_1 = require("three");
var AimEvent = /** @class */ (function (_super) {
    __extends(AimEvent, _super);
    function AimEvent() {
        var _this = _super.call(this) || this;
        _this.offset = new three_1.Vector3(0, 0, 0);
        _this.angle = 0;
        _this.power = 0;
        _this.pos = new three_1.Vector3(0, 0, 0);
        _this.i = 0;
        _this.type = eventtype_1.EventType.AIM;
        return _this;
    }
    AimEvent.prototype.applyToController = function (controller) {
        return controller.handleAim(this);
    };
    AimEvent.fromJson = function (json) {
        var event = new AimEvent();
        event.pos = (0, utils_1.vec)(json.pos);
        event.angle = json.angle;
        event.offset = (0, utils_1.vec)(json.offset);
        event.power = json.power;
        if (json.i) {
            event.i = json.i;
        }
        return event;
    };
    AimEvent.prototype.copy = function () {
        return AimEvent.fromJson(this);
    };
    return AimEvent;
}(gameevent_1.GameEvent));
exports.AimEvent = AimEvent;
//# sourceMappingURL=aimevent.js.map