"use strict";
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
exports.ThrowPlot = void 0;
var plotlyconfig_1 = require("./plotlyconfig");
var throw_gpt4o_1 = require("./throw_gpt4o");
var ThrowPlot = /** @class */ (function () {
    function ThrowPlot() {
    }
    ThrowPlot.prototype.degToRad = function (x) {
        return x * (Math.PI / 180);
    };
    ThrowPlot.prototype.radToDeg = function (x) {
        return x * (180 / Math.PI);
    };
    ThrowPlot.prototype.plotCutAngle = function () {
        var R = throw_gpt4o_1.CollisionThrowPlot.R;
        this.plot("collision-throw-roll", [0.447, 1.341, 3.129], function (k) { return k / R; });
        this.plot("collision-throw-stun", [0.447, 1.341, 3.129], function (_) { return 0; });
        this.plotRolls("collision-throw-varying-roll", [0, 0.25, 0.5, 1], function (k) { return k / R; }, function (_) { return 0; }, function (phi) { return phi; });
        this.plotRolls("collision-throw-varying-side", [0, 0.25, 0.5, 1], function (k) { return k / R; }, function (z) { return ((1 / R) * (z - 45)) / 45; }, function (_) { return 0; });
        // test:
        var model = new throw_gpt4o_1.CollisionThrowPlot(console.log);
        model.plot(0.5, -15, -10, Math.PI / 8);
    };
    ThrowPlot.prototype.plot = function (div, ks, omegax) {
        var _this = this;
        var angles = [];
        var deg = [];
        ks.forEach(function (k) {
            var angle = [];
            deg = [];
            for (var alpha = 1; alpha < 90; alpha += 1) {
                deg.push(alpha);
                var model = new throw_gpt4o_1.CollisionThrowPlot();
                var throwAngle = model.plot(k, omegax(k), 0, _this.degToRad(alpha));
                angle.push(_this.radToDeg(throwAngle));
            }
            angles.push(angle);
        });
        var myLayout = __assign({}, plotlyconfig_1.layout);
        myLayout.title.text = "Throw effect (WIP)\n    <br>throw vs. cut angle for various-speed ".concat(div, " shots\n    <br>from https://billiards.colostate.edu/technical_proofs/new/TP_A-14.pdf");
        window.Plotly.newPlot(div, [
            (0, plotlyconfig_1.createTrace)(deg, angles[0], "slow", (0, plotlyconfig_1.color)(4)),
            (0, plotlyconfig_1.createTrace)(deg, angles[1], "medium", (0, plotlyconfig_1.color)(5)),
            (0, plotlyconfig_1.createTrace)(deg, angles[2], "fast", (0, plotlyconfig_1.color)(6)),
        ], myLayout, plotlyconfig_1.config);
    };
    ThrowPlot.prototype.plotRolls = function (div, ks, omegax, omegaz, phi) {
        var _this = this;
        var angles = [];
        var x = [];
        ks.forEach(function (k) {
            var angle = [];
            x = [];
            for (var alpha = 1; alpha < 90; alpha += 1) {
                x.push(alpha);
                var model = new throw_gpt4o_1.CollisionThrowPlot();
                var throwAngle = model.plot(1, omegax(k), omegaz(alpha), _this.degToRad(phi(alpha)));
                angle.push(_this.radToDeg(throwAngle));
            }
            angles.push(angle);
        });
        var myLayout = __assign({}, plotlyconfig_1.layout);
        myLayout.title.text = "Throw effect (WIP)\n    <br>throw vs. cut angle for various-speed ".concat(div, " shots\n    <br>from https://billiards.colostate.edu/technical_proofs/new/TP_A-14.pdf");
        window.Plotly.newPlot(div, [
            (0, plotlyconfig_1.createTrace)(x, angles[0], "0", (0, plotlyconfig_1.color)(4)),
            (0, plotlyconfig_1.createTrace)(x, angles[1], "0.25", (0, plotlyconfig_1.color)(5)),
            (0, plotlyconfig_1.createTrace)(x, angles[2], "0.5", (0, plotlyconfig_1.color)(6)),
            (0, plotlyconfig_1.createTrace)(x, angles[3], "1.0", (0, plotlyconfig_1.color)(7)),
        ], myLayout, plotlyconfig_1.config);
    };
    return ThrowPlot;
}());
exports.ThrowPlot = ThrowPlot;
//# sourceMappingURL=throwplot.js.map