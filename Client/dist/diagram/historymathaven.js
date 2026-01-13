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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryMathaven = void 0;
var mathaven_1 = require("../model/physics/mathaven");
var HistoryMathaven = /** @class */ (function (_super) {
    __extends(HistoryMathaven, _super);
    function HistoryMathaven() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.h = [];
        _this.extractValues = function (selector) {
            return _this.h.map(selector).map(function (value) { return value !== null && value !== void 0 ? value : 0; });
        };
        return _this;
    }
    HistoryMathaven.prototype.updateSingleStep = function (ΔP) {
        _super.prototype.updateSingleStep.call(this, ΔP);
        this.h.push(__assign({}, this));
    };
    return HistoryMathaven;
}(mathaven_1.Mathaven));
exports.HistoryMathaven = HistoryMathaven;
//# sourceMappingURL=historymathaven.js.map