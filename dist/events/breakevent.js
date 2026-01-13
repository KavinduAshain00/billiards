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
exports.BreakEvent = void 0;
var gameevent_1 = require("./gameevent");
var eventtype_1 = require("./eventtype");
var BreakEvent = /** @class */ (function (_super) {
    __extends(BreakEvent, _super);
    function BreakEvent(init, shots) {
        var _this = _super.call(this) || this;
        _this.init = init;
        _this.shots = shots;
        _this.type = eventtype_1.EventType.BREAK;
        return _this;
    }
    BreakEvent.prototype.applyToController = function (controller) {
        return controller.handleBreak(this);
    };
    BreakEvent.fromJson = function (json) {
        return new BreakEvent(json.init, json.shots);
    };
    return BreakEvent;
}(gameevent_1.GameEvent));
exports.BreakEvent = BreakEvent;
//# sourceMappingURL=breakevent.js.map