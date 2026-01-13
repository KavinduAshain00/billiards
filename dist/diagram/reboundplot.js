"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReboundPlot = void 0;
var constants_1 = require("./constants");
var mathaven_1 = require("../model/physics/mathaven");
var plotlyconfig_1 = require("./plotlyconfig");
var ReboundPlot = /** @class */ (function () {
    function ReboundPlot() {
    }
    ReboundPlot.prototype.getFinalState = function (v0, alpha, sidespin, topspin) {
        try {
            var calc = new mathaven_1.Mathaven(constants_1.M, constants_1.R, constants_1.ee, constants_1.μs, constants_1.μw);
            calc.solvePaper(v0, alpha, sidespin, topspin);
            var vy = calc.vy;
            var vx = calc.vx;
            return {
                beta: Math.atan2(-vy, vx) * (180 / Math.PI),
                speed: Math.sqrt(vx * vx + vy * vy),
            };
        }
        catch (error) {
            console.error(error);
            return { beta: NaN, speed: NaN };
        }
    };
    ReboundPlot.prototype.plot = function (divSpeed, divAngle, title, sidespin, topspin) {
        if (sidespin === void 0) { sidespin = function (_) { return 0; }; }
        if (topspin === void 0) { topspin = function (k) { return k / constants_1.R; }; }
        var speeds = [];
        var angles = [];
        var v0 = 1;
        var deg = [];
        for (var k = -1; k <= 2; k++) {
            var speed = [];
            var angle = [];
            deg = [];
            for (var alpha = 1; alpha < 90; alpha += 9) {
                deg.push(alpha);
                var result = this.getFinalState(v0, alpha * (Math.PI / 180), sidespin(k), topspin(k));
                speed.push(result.speed);
                angle.push(result.beta);
            }
            speeds.push(speed);
            angles.push(angle);
        }
        var x = deg;
        plotlyconfig_1.layout.title.text = title;
        window.Plotly.newPlot(divSpeed, [
            (0, plotlyconfig_1.createTrace)(x, speeds[0], "k=-1", (0, plotlyconfig_1.color)(0)),
            (0, plotlyconfig_1.createTrace)(x, speeds[1], "k=0", (0, plotlyconfig_1.color)(1)),
            (0, plotlyconfig_1.createTrace)(x, speeds[2], "k=1", (0, plotlyconfig_1.color)(2)),
            (0, plotlyconfig_1.createTrace)(x, speeds[3], "k=2", (0, plotlyconfig_1.color)(3)),
        ], plotlyconfig_1.layout, plotlyconfig_1.config);
        window.Plotly.newPlot(divAngle, [
            (0, plotlyconfig_1.createTrace)(x, angles[0], "k=-1", (0, plotlyconfig_1.color)(0)),
            (0, plotlyconfig_1.createTrace)(x, angles[1], "k=0", (0, plotlyconfig_1.color)(1)),
            (0, plotlyconfig_1.createTrace)(x, angles[2], "k=1", (0, plotlyconfig_1.color)(2)),
            (0, plotlyconfig_1.createTrace)(x, angles[3], "k=2", (0, plotlyconfig_1.color)(3)),
        ], plotlyconfig_1.layout, plotlyconfig_1.config);
    };
    return ReboundPlot;
}());
exports.ReboundPlot = ReboundPlot;
//# sourceMappingURL=reboundplot.js.map