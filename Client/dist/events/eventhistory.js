"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHistory = void 0;
var EventHistory = /** @class */ (function () {
    function EventHistory() {
        this.sent = [];
    }
    EventHistory.prototype.last = function (list) {
        return list[list.length - 1];
    };
    EventHistory.prototype.lastSent = function () {
        return this.last(this.sent);
    };
    EventHistory.prototype.lastRecv = function () {
        return this.recv;
    };
    EventHistory.prototype.from = function (list, sequenceId) {
        var index = list.findIndex(function (e) { return e.sequence === sequenceId; });
        return list.slice(index);
    };
    EventHistory.prototype.nextId = function (list, sequenceId) {
        var index = list.findIndex(function (e) { return e.sequence === sequenceId; });
        if (index < list.length - 1) {
            return list[index + 1].sequence;
        }
        return "";
    };
    EventHistory.after = function (list, sequenceId) {
        var index = list.findIndex(function (e) { return e.sequence === sequenceId; });
        return list.slice(index + 1);
    };
    return EventHistory;
}());
exports.EventHistory = EventHistory;
//# sourceMappingURL=eventhistory.js.map