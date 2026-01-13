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
exports.ChatEvent = void 0;
var gameevent_1 = require("./gameevent");
var eventtype_1 = require("./eventtype");
var ChatEvent = /** @class */ (function (_super) {
    __extends(ChatEvent, _super);
    function ChatEvent(sender, message) {
        var _this = _super.call(this) || this;
        _this.sender = sender;
        _this.message = message;
        _this.type = eventtype_1.EventType.CHAT;
        return _this;
    }
    ChatEvent.prototype.applyToController = function (controller) {
        return controller.handleChat(this);
    };
    ChatEvent.fromJson = function (json) {
        return new ChatEvent(json.sender, json.message);
    };
    return ChatEvent;
}(gameevent_1.GameEvent));
exports.ChatEvent = ChatEvent;
//# sourceMappingURL=chatevent.js.map