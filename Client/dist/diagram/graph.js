"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Graph = void 0;
var Graph = /** @class */ (function () {
    function Graph(canvasId, title, label) {
        this.gutter = 20;
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.canvas.previousElementSibling.innerHTML =
            title;
        this.canvas.nextElementSibling.innerHTML = label;
    }
    Graph.prototype.plot = function (xValues, y1, y2) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.shadowColor = "grey";
        this.ctx.shadowBlur = 2;
        var allY = __spreadArray(__spreadArray([], y1, true), y2, true);
        allY.push(0);
        this.xAxis = this.axisInfo(xValues, this.canvas.width);
        this.yAxis = this.axisInfo(allY, this.canvas.height);
        this.drawXAxis(xValues);
        this.drawYAxis(allY);
        this.plotLine(xValues, y1, "blue");
        this.plotLine(xValues, y2, "red");
    };
    Graph.prototype.plotLine = function (xs, ys, colour) {
        this.ctx.beginPath();
        for (var i = 0; i < xs.length; i++) {
            var x = this.scale(xs[i], this.xAxis);
            var y = this.canvas.height - this.scale(ys[i], this.yAxis) * 0.8 - this.gutter;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            }
            else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.strokeStyle = colour;
        this.ctx.stroke();
    };
    Graph.prototype.drawXAxis = function (xs) {
        var h = this.canvas.height - this.gutter;
        this.ctx.beginPath();
        this.ctx.moveTo(0, h);
        this.ctx.lineTo(this.canvas.width, h);
        this.ctx.strokeStyle = "grey";
        this.ctx.stroke();
        this.ctx.font = "8px Arial";
        this.ctx.strokeStyle = "grey";
        var skip = false;
        for (var i = 2; i < xs.length - 2; i++) {
            var x = this.scale(xs[i], this.xAxis);
            this.ctx.beginPath();
            this.ctx.moveTo(x, h);
            this.ctx.lineTo(x, h + 4);
            this.ctx.stroke();
            if (!skip) {
                this.ctx.fillText(xs[i], x - 5, h + 10);
            }
            skip = !skip;
        }
    };
    Graph.prototype.drawYAxis = function (ys) {
        var min = 0;
        var max = Math.max.apply(Math, ys);
        var maxy = this.canvas.height - this.scale(max, this.yAxis) * 0.8 - this.gutter;
        var miny = this.canvas.height - this.scale(min, this.yAxis) * 0.8 - this.gutter;
        this.ctx.beginPath();
        this.ctx.moveTo(0, miny);
        this.ctx.lineTo(0, maxy);
        this.ctx.strokeStyle = "grey";
        this.ctx.stroke();
        this.ctx.fillText("".concat(min.toFixed(3)), 0, miny);
        this.ctx.fillText("".concat(max.toFixed(3)), 0, maxy);
    };
    Graph.prototype.scale = function (p, pAxis) {
        return (p - pAxis.min) * pAxis.scale;
    };
    Graph.prototype.axisInfo = function (values, pixels) {
        var min = Math.min.apply(Math, values);
        var max = Math.max.apply(Math, values);
        var range = max - min || 1;
        return { min: min, max: max, scale: pixels / range };
    };
    return Graph;
}());
exports.Graph = Graph;
//# sourceMappingURL=graph.js.map