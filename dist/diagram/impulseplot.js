"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImpulsePlot = void 0;
var constants_1 = require("./constants");
var historymathaven_1 = require("./historymathaven");
var plotlyconfig_1 = require("./plotlyconfig");
var ImpulsePlot = /** @class */ (function () {
    function ImpulsePlot() {
    }
    ImpulsePlot.prototype.plot = function (v0, alpha, wS, wT) {
        if (v0 === void 0) { v0 = 2; }
        if (alpha === void 0) { alpha = Math.PI / 4; }
        if (wS === void 0) { wS = (2 * v0) / constants_1.R; }
        if (wT === void 0) { wT = (1.5 * v0) / constants_1.R; }
        var calculation = new historymathaven_1.HistoryMathaven(constants_1.M, constants_1.R, constants_1.ee, constants_1.μs, constants_1.μw);
        try {
            calculation.solvePaper(v0, alpha, wS, wT);
        }
        catch (error) {
            console.error(error);
        }
        var vals = calculation.extractValues;
        var impulse = vals(function (h) { return h.P; });
        plotlyconfig_1.layout.title.text = "<b>Figure.12</b> Slip\u2013impulse curves \nfor V0 = 2 m/s, \u03B1 = 45\u25E6,\u03C9S0 = 2V0/R, and \u03C9T0 = 1.5V0/R \n<br>(s and \u03C6 are for the slip at the cushion, \nand s\u02B9 and \u03C6\u02B9 are for the slip at the table)";
        window.Plotly.newPlot("mathaven-impulse", [
            (0, plotlyconfig_1.createTrace)(impulse, vals(function (h) { return h.s; }), "s", (0, plotlyconfig_1.color)(0)),
            (0, plotlyconfig_1.createTrace)(impulse, vals(function (h) { return h.φ; }), "φ", (0, plotlyconfig_1.color)(1)),
            (0, plotlyconfig_1.createTrace)(impulse, vals(function (h) { return h.sʹ; }), "s'", (0, plotlyconfig_1.color)(2)),
            (0, plotlyconfig_1.createTrace)(impulse, vals(function (h) { return h.φʹ; }), "φʹ", (0, plotlyconfig_1.color)(3)),
            (0, plotlyconfig_1.createTrace)(impulse, vals(function (h) { return h.WzI; }), "WzI", (0, plotlyconfig_1.color)(4)),
            (0, plotlyconfig_1.createTrace)(impulse, vals(function (h) { return h.P; }), "P", (0, plotlyconfig_1.color)(5)),
        ], plotlyconfig_1.layout, plotlyconfig_1.config);
    };
    return ImpulsePlot;
}());
exports.ImpulsePlot = ImpulsePlot;
//# sourceMappingURL=impulseplot.js.map