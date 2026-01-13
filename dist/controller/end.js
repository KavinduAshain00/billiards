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
exports.End = void 0;
var controller_1 = require("./controller");
var init_1 = require("./init");
var End = /** @class */ (function (_super) {
    __extends(End, _super);
    function End() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    End.prototype.handleChat = function (chatevent) {
        var sender = chatevent.sender ? "".concat(chatevent.sender, ":") : "";
        var message = "".concat(sender, " ").concat(chatevent.message);
        this.container.chat.showMessage(message);
        return this;
    };
    End.prototype.handleBegin = function (_) {
        return new init_1.Init(this.container);
    };
    return End;
}(controller_1.Controller));
exports.End = End;
//# sourceMappingURL=end.js.map