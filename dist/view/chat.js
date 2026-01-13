"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chat = void 0;
var Chat = /** @class */ (function () {
    function Chat(send) {
        var _this = this;
        var _a;
        this.sendClicked = function (_) {
            var _a, _b;
            _this.send((_a = _this.chatInputText) === null || _a === void 0 ? void 0 : _a.value);
            _this.showMessage((_b = _this.chatInputText) === null || _b === void 0 ? void 0 : _b.value);
        };
        this.chatoutput = document.getElementById("chatoutput");
        this.chatInputText = document.getElementById("chatinputtext");
        this.chatSend = document.getElementById("chatsend");
        (_a = this.chatSend) === null || _a === void 0 ? void 0 : _a.addEventListener("click", this.sendClicked);
        this.send = send;
    }
    Chat.prototype.showMessage = function (msg) {
        this.chatoutput && (this.chatoutput.innerHTML += msg);
        this.updateScroll();
    };
    Chat.prototype.updateScroll = function () {
        this.chatoutput &&
            (this.chatoutput.scrollTop = this.chatoutput.scrollHeight);
    };
    return Chat;
}());
exports.Chat = Chat;
//# sourceMappingURL=chat.js.map