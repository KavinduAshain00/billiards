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
exports.RejoinEvent = void 0;
var gameevent_1 = require("./gameevent");
var eventtype_1 = require("./eventtype");
var RejoinEvent = /** @class */ (function (_super) {
    __extends(RejoinEvent, _super);
    function RejoinEvent(clientResendFrom, serverResendFrom) {
        if (clientResendFrom === void 0) { clientResendFrom = ""; }
        if (serverResendFrom === void 0) { serverResendFrom = ""; }
        var _this = _super.call(this) || this;
        _this.type = eventtype_1.EventType.REJOIN;
        _this.clientResendFrom = clientResendFrom;
        _this.serverResendFrom = serverResendFrom;
        return _this;
    }
    RejoinEvent.prototype.applyToController = function (controller) {
        return controller.handleRejoin(this);
    };
    RejoinEvent.fromJson = function (json) {
        var event = new RejoinEvent(json.clientResendFrom, json.serverResendFrom);
        return event;
    };
    return RejoinEvent;
}(gameevent_1.GameEvent));
exports.RejoinEvent = RejoinEvent;
//# sourceMappingURL=rejoinevent.js.map