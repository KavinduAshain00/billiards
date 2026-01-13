"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealDraw = void 0;
var RealDraw = /** @class */ (function () {
    function RealDraw(canvas) {
        this.BALL_COLORS = { 1: "white", 2: "yellow", 3: "red" };
        this.BALL_DIAMETER = 0.0615;
        this.TABLE_WIDTH = 2.84;
        this.ballPaths = {};
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.PIXELS_PER_METER = this.canvas.width / this.TABLE_WIDTH;
    }
    RealDraw.prototype.drawBall = function (x, y, color) {
        var radius = (this.BALL_DIAMETER / 2) * this.PIXELS_PER_METER;
        var flippedX = this.canvas.width - x;
        var flippedY = y;
        this.ctx.beginPath();
        this.ctx.arc(flippedX, flippedY, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    };
    RealDraw.prototype.drawBallPath = function (ballNum, positions) {
        var _this = this;
        var color = this.BALL_COLORS[ballNum];
        this.ctx.save();
        this.ctx.beginPath();
        positions.forEach(function (pos, index) {
            var x = _this.canvas.width - pos.x * _this.PIXELS_PER_METER;
            var y = _this.canvas.height - pos.y * _this.PIXELS_PER_METER;
            if (index === 0) {
                _this.ctx.moveTo(x, y);
            }
            else {
                _this.ctx.lineTo(x, y);
            }
        });
        this.ctx.setLineDash([4, 4]);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.restore();
    };
    RealDraw.prototype.clear = function () {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    };
    RealDraw.prototype.drawShot = function (ballPositions) {
        // Draw paths first so balls appear on top
        for (var ballNum in this.ballPaths) {
            this.drawBallPath(ballNum, this.ballPaths[ballNum]);
        }
        // Draw current ball positions
        for (var ballNum in ballPositions) {
            var ballPosition = ballPositions[ballNum];
            var color = this.BALL_COLORS[ballNum];
            var x = ballPosition.x * this.PIXELS_PER_METER;
            var y = this.canvas.height - ballPosition.y * this.PIXELS_PER_METER;
            this.drawBall(x, y, color);
        }
    };
    RealDraw.prototype.resetCanvas = function () {
        this.clear();
        this.ballPaths = {};
    };
    RealDraw.prototype.updateBallPaths = function (ballNum, position) {
        if (!this.ballPaths[ballNum]) {
            this.ballPaths[ballNum] = [];
        }
        this.ballPaths[ballNum].push(position);
    };
    return RealDraw;
}());
exports.RealDraw = RealDraw;
//# sourceMappingURL=realdraw.js.map