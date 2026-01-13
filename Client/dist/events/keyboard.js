"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Keyboard = void 0;
var input_1 = require("./input");
var interactjs_1 = require("interactjs");
/**
 * Maintains a map of pressed keys.
 *
 * Produces events while key is pressed with elapsed time
 */
var Keyboard = /** @class */ (function () {
    function Keyboard(element) {
        var _this = this;
        this.pressed = {};
        this.released = {};
        this.keydown = function (e) {
            if (_this.pressed[e.code] == null) {
                _this.pressed[e.code] = performance.now();
            }
            e.stopImmediatePropagation();
            if (e.key !== "F12") {
                e.preventDefault();
            }
        };
        this.keyup = function (e) {
            _this.released[e.code] = performance.now() - _this.pressed[e.code];
            delete _this.pressed[e.code];
            e.stopImmediatePropagation();
            if (e.key !== "F12") {
                e.preventDefault();
            }
        };
        this.mousetouch = function (e) {
            var _a, _b;
            var k = _this.released;
            var topHalf = e.client.y < e.rect.height / 2;
            var factor = topHalf || e.ctrlKey ? 0.5 : 1;
            var dx = e.dx * factor;
            var dy = e.dy * 0.8;
            k["movementY"] = ((_a = k["movementY"]) !== null && _a !== void 0 ? _a : 0.0) + dy;
            k["movementX"] = ((_b = k["movementX"]) !== null && _b !== void 0 ? _b : 0.0) + dx;
            if (Math.abs(k["movementX"]) > Math.abs(k["movementY"])) {
                k["movementY"] = 0;
            }
        };
        this.addHandlers(element);
        if (!/Android|iPhone/i.test(navigator.userAgent)) {
            element.contentEditable = "true";
        }
    }
    Keyboard.prototype.getEvents = function () {
        var _this = this;
        var keys = Object.keys(this.pressed)
            .filter(function (key) { return !/Shift/.test(key); })
            .filter(function (key) { return !/Control/.test(key); });
        var shift = Object.keys(this.pressed).some(function (key) { return /Shift/.test(key); });
        var control = Object.keys(this.pressed).some(function (key) { return /Control/.test(key); });
        var result = [];
        keys.forEach(function (k) {
            var t = performance.now() - _this.pressed[k];
            result.push(new input_1.Input(control ? t / 3 : t, shift ? "Shift" + k : k));
            if (k != "Space") {
                _this.pressed[k] = performance.now();
            }
        });
        Object.keys(this.released).forEach(function (key) {
            return result.push(new input_1.Input(_this.released[key], key + "Up"));
        });
        this.released = {};
        return result;
    };
    Keyboard.prototype.addHandlers = function (element) {
        var _this = this;
        element.addEventListener("keydown", this.keydown);
        element.addEventListener("keyup", this.keyup);
        element.focus();
        (0, interactjs_1.default)(element).draggable({
            listeners: {
                move: function (e) {
                    _this.mousetouch(e);
                },
            },
        });
        (0, interactjs_1.default)(element).gesturable({
            onmove: function (e) {
                e.dx /= 3;
                _this.mousetouch(e);
            },
        });
    };
    return Keyboard;
}());
exports.Keyboard = Keyboard;
//# sourceMappingURL=keyboard.js.map