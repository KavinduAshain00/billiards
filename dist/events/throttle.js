"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Throttle = void 0;
var eventtype_1 = require("./eventtype");
/**
 * Throttle AIM events.
 */
var Throttle = /** @class */ (function () {
    function Throttle(period, apply) {
        this.pending = null;
        this.sentTime = 0;
        this.apply = function (_) { };
        this.period = period;
        this.apply = apply;
    }
    Throttle.prototype.flush = function () {
        if (this.pending) {
            this.apply(this.pending);
            this.pending = null;
        }
    };
    Throttle.prototype.send = function (event) {
        if (performance.now() > this.sentTime + this.period ||
            event.type !== eventtype_1.EventType.AIM) {
            this.flush();
            this.apply(event);
            this.sentTime = performance.now();
            return;
        }
        this.pending = event;
    };
    return Throttle;
}());
exports.Throttle = Throttle;
//# sourceMappingURL=throttle.js.map