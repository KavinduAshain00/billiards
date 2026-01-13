"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollDiagram = void 0;
var three_1 = require("three");
var ball_1 = require("../model/ball");
var constants_1 = require("../model/physics/constants");
var utils_1 = require("../utils/utils");
var RollDiagram = /** @class */ (function () {
    function RollDiagram(canvas) {
        this.theta = 0.0;
        this.step = 0.01;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.ball = new ball_1.Ball(utils_1.zero);
        this.ball.vel.copy(new three_1.Vector3(32 * constants_1.R, 0, 0));
        this.ball.rvel.copy(new three_1.Vector3(0, -(2.0 * this.ball.vel.x) / constants_1.R, 0));
        this.ball.state = ball_1.State.Sliding;
    }
    RollDiagram.prototype.drawBall = function (x, y, style) {
        var w = this.canvas.width;
        var h = this.canvas.height;
        var s = w / (27 * constants_1.R);
        this.ctx.beginPath();
        this.ctx.strokeStyle = style;
        this.ctx.fillStyle = style;
        var sx = x * s + 2 * constants_1.R * s;
        var sy = y * s + h / 2;
        var sr = constants_1.R * s;
        this.ctx.ellipse(sx, sy, sr, sr, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        var endx = sx + constants_1.R * -Math.sin(this.theta) * s;
        var endy = sy + constants_1.R * Math.cos(this.theta) * s;
        this.ctx.beginPath();
        this.ctx.strokeStyle = "black";
        this.ctx.moveTo(sx, sy);
        this.ctx.lineTo(endx, endy);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.fillStyle = "black";
        this.ctx.arc(endx, endy, 3, 0, 2 * Math.PI);
        this.ctx.fill();
    };
    RollDiagram.prototype.advance = function (t) {
        this.ball.update(t);
        var angle = this.ball.rvel.length() * t;
        this.theta += angle;
    };
    RollDiagram.prototype.draw = function (duration) {
        this.ctx.clearRect(0, 0, 1, 1);
        var t = 0;
        while (t < duration) {
            var color = "blue";
            if (this.ball.isRolling()) {
                color = "red";
            }
            else if (this.ball.inMotion()) {
                color = "green";
            }
            this.drawBall(this.ball.pos.x, 0, color);
            this.advance(this.step);
            t += this.step;
        }
    };
    return RollDiagram;
}());
exports.RollDiagram = RollDiagram;
//# sourceMappingURL=rolldiagram.js.map