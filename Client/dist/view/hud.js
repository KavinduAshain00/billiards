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
exports.EightBallHud = exports.SnookerHud = exports.Hud = void 0;
var Hud = /** @class */ (function () {
    function Hud() {
    }
    // Generic HUD base – no-op default implementations
    Hud.prototype.updateBreak = function (_) { };
    Hud.prototype.updateGroups = function (_) { };
    return Hud;
}());
exports.Hud = Hud;
var SnookerHud = /** @class */ (function (_super) {
    __extends(SnookerHud, _super);
    function SnookerHud() {
        var _this = _super.call(this) || this;
        _this.element = _this.getElement("snookerScore");
        return _this;
    }
    SnookerHud.prototype.updateBreak = function (score) {
        if (this.element) {
            if (score > 0) {
                this.element.innerHTML = "Break</br>" + score;
            }
            else {
                this.element.innerHTML = "";
            }
        }
    };
    SnookerHud.prototype.getElement = function (id) {
        return document.getElementById(id);
    };
    return SnookerHud;
}(Hud));
exports.SnookerHud = SnookerHud;
var EightBallHud = /** @class */ (function (_super) {
    __extends(EightBallHud, _super);
    function EightBallHud() {
        var _this = _super.call(this) || this;
        _this.breakElement = _this.getElement("eightBallBreak");
        _this.groupElement = _this.getElement("eightBallGroup");
        _this.clear();
        return _this;
    }
    EightBallHud.prototype.updateBreak = function (score) {
        if (this.breakElement) {
            if (score > 0) {
                this.breakElement.innerHTML = "Break: ".concat(score);
            }
            else {
                this.breakElement.innerHTML = "";
            }
        }
    };
    EightBallHud.prototype.updateGroups = function (group) {
        if (!this.groupElement)
            return;
        if (!group) {
            this.groupElement.innerHTML = "Table: Open";
        }
        else if (group === "solids") {
            this.groupElement.innerHTML = "You: Solids";
        }
        else {
            this.groupElement.innerHTML = "You: Stripes";
        }
    };
    EightBallHud.prototype.clear = function () {
        this.updateBreak(0);
        this.updateGroups(null);
    };
    EightBallHud.prototype.getElement = function (id) {
        return document.getElementById(id);
    };
    return EightBallHud;
}(Hud));
exports.EightBallHud = EightBallHud;
//# sourceMappingURL=hud.js.map