"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sliders = void 0;
var constants_1 = require("../model/physics/constants");
var Sliders = /** @class */ (function () {
    function Sliders(notify) {
        var _a, _b;
        this.notify = notify !== null && notify !== void 0 ? notify : (function () { });
        this.style =
            (_b = (_a = document.getElementById("constants")) === null || _a === void 0 ? void 0 : _a.style) !== null && _b !== void 0 ? _b : {};
        this.initialiseSlider("R", constants_1.R, constants_1.setR);
        this.initialiseSlider("m", constants_1.m, constants_1.setm);
        this.initialiseSlider("e", constants_1.e, constants_1.sete);
        this.initialiseSlider("mu", constants_1.mu, constants_1.setmu);
        this.initialiseSlider("muS", constants_1.muS, constants_1.setmuS);
        this.initialiseSlider("muC", constants_1.muC, constants_1.setmuC);
        this.initialiseSlider("rho", constants_1.rho, constants_1.setrho);
        this.initialiseSlider("μs", constants_1.μs, constants_1.setμs);
        this.initialiseSlider("μw", constants_1.μw, constants_1.setμw);
        this.initialiseSlider("ee", constants_1.ee, constants_1.setee);
    }
    Sliders.prototype.toggleVisibility = function () {
        this.style.visibility =
            this.style.visibility === "visible" ? "hidden" : "visible";
    };
    Sliders.prototype.getInputElement = function (id) {
        var _a;
        return (_a = document.getElementById(id)) !== null && _a !== void 0 ? _a : {};
    };
    Sliders.prototype.initialiseSlider = function (id, initialValue, setter, max) {
        var _this = this;
        if (max === void 0) { max = 1; }
        var slider = this.getInputElement(id);
        if (!slider) {
            return;
        }
        slider.step = "0.001";
        slider.min = "0.01";
        slider.max = "".concat(max);
        slider.value = initialValue;
        this.showValue(id, initialValue);
        slider.oninput = function (e) {
            var val = parseFloat(e.target.value);
            setter(val);
            _this.showValue(id, val);
            _this.notify();
        };
    };
    Sliders.prototype.showValue = function (element, value) {
        var label = document.querySelector("label[for=".concat(element, "]"));
        label && (label.innerHTML = "".concat(element, "=").concat(value));
    };
    return Sliders;
}());
exports.Sliders = Sliders;
//# sourceMappingURL=sliders.js.map