"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CushionPlot = void 0;
var physics_1 = require("../model/physics/physics");
var CushionPlot = /** @class */ (function () {
    function CushionPlot(div, title) {
        this.endx = 100;
        this.endy = 100;
        this.scale = 2000;
        this.r = 20;
        div.firstElementChild.innerHTML = title;
        this.canvas = div.lastElementChild;
        this.context = this.canvas.getContext("2d");
    }
    CushionPlot.prototype.drawBall = function () {
        this.context.beginPath();
        this.context.strokeStyle = "lightgray";
        this.context.fillStyle = "beige";
        this.context.arc(this.endx, this.endy, this.r, 0, 2 * Math.PI, false);
        this.context.fill();
        this.context.stroke();
    };
    CushionPlot.prototype.drawCushion = function () {
        var gradient = this.context.createLinearGradient(10, 90, 200, 90);
        gradient.addColorStop(0, "lightgray");
        gradient.addColorStop(0.75, "white");
        this.context.fillStyle = gradient;
        this.context.fillRect(this.endx + this.r, 10, 200, 250);
    };
    CushionPlot.prototype.plot = function (angleStart, angleEnd, angleStep, fv, fw) {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawCushion();
        this.drawBall();
        for (var i = angleStart; i <= angleEnd; i += angleStep) {
            var v = fv(i);
            var w = fw(i);
            var lineDash = (0, physics_1.isGripCushion)(v, w) ? [] : [2, 2];
            this.context.setLineDash(lineDash);
            var hue = ((i + 360) * 101) % 360;
            this.context.strokeStyle = "hsl(".concat(hue, ",50%,50%)");
            this.drawArrow(this.endx - v.x * this.scale, this.endy - v.y * this.scale, this.endx, this.endy);
            var delta = (0, physics_1.rotateApplyUnrotate)(0, v, w, physics_1.mathavenAdapter);
            v.add(delta.v);
            this.drawArrow(this.endx, this.endy, this.endx + v.x * this.scale, this.endy + v.y * this.scale);
        }
    };
    CushionPlot.prototype.drawArrow = function (x1, y1, x2, y2, t) {
        if (t === void 0) { t = 0.9; }
        var arrow = {
            dx: x2 - x1,
            dy: y2 - y1,
        };
        var middle = {
            x: arrow.dx * t + x1,
            y: arrow.dy * t + y1,
        };
        var tip = {
            dx: x2 - middle.x,
            dy: y2 - middle.y,
        };
        this.context.beginPath();
        this.context.moveTo(x1, y1);
        this.context.lineTo(middle.x, middle.y);
        this.context.moveTo(middle.x + 0.5 * tip.dy, middle.y - 0.5 * tip.dx);
        this.context.lineTo(middle.x - 0.5 * tip.dy, middle.y + 0.5 * tip.dx);
        this.context.lineTo(x2, y2);
        this.context.closePath();
        this.context.stroke();
    };
    return CushionPlot;
}());
exports.CushionPlot = CushionPlot;
//# sourceMappingURL=cushionplot.js.map