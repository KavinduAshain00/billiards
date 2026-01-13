"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AimInputs = void 0;
var AimInputs = /** @class */ (function () {
    function AimInputs() {
        var _a;
        this.MAX_DISTANCE = 0.7;
        this.position = { x: 0, y: 0 };
        this.power = 5;
        this.direction = 0;
        this.aimBall = document.getElementById("aim-ball");
        this.aimCoordinatesDisplay = document.getElementById("aim-coordinates");
        this.aimBallContainer = document.getElementById("aim-ball-container");
        this.powerSlider = document.getElementById("power");
        this.directionSlider = document.getElementById("direction");
        this.BALL_CONTAINER_RADIUS = (((_a = this.aimBallContainer) === null || _a === void 0 ? void 0 : _a.clientWidth) || 0) / 2;
        this.addEventListeners();
    }
    AimInputs.prototype.addEventListeners = function () {
        var _this = this;
        var _a, _b, _c;
        (_a = this.aimBallContainer) === null || _a === void 0 ? void 0 : _a.addEventListener("click", function (event) {
            return _this.handleClick(event);
        });
        (_b = this.powerSlider) === null || _b === void 0 ? void 0 : _b.addEventListener("input", function (event) {
            _this.power = parseInt(event.target.value);
        });
        (_c = this.directionSlider) === null || _c === void 0 ? void 0 : _c.addEventListener("input", function (event) {
            _this.direction = parseInt(event.target.value);
        });
    };
    AimInputs.prototype.handleClick = function (event) {
        if (!this.aimBallContainer || !this.aimBall)
            return;
        var rect = this.aimBallContainer.getBoundingClientRect();
        var x = event.clientX - rect.left - rect.width / 2;
        var y = event.clientY - rect.top - rect.height / 2;
        // Calculate the distance from the center
        var distance = Math.sqrt(x * x + y * y);
        // Clamp the distance to MAX_DISTANCE * BALL_CONTAINER_RADIUS
        if (distance > this.MAX_DISTANCE * this.BALL_CONTAINER_RADIUS) {
            var angle = Math.atan2(y, x);
            x = this.MAX_DISTANCE * this.BALL_CONTAINER_RADIUS * Math.cos(angle);
            y = this.MAX_DISTANCE * this.BALL_CONTAINER_RADIUS * Math.sin(angle);
        }
        // Keep the ball within the container bounds
        var maxX = rect.width / 2 - this.aimBall.offsetWidth / 2;
        var minX = -maxX;
        var maxY = rect.height / 2 - this.aimBall.offsetHeight / 2;
        var minY = -maxY;
        var clampedX = Math.max(minX, Math.min(maxX, x));
        var clampedY = Math.max(minY, Math.min(maxY, y));
        // Update position
        this.position.x = clampedX / this.BALL_CONTAINER_RADIUS;
        this.position.y = clampedY / this.BALL_CONTAINER_RADIUS;
        this.updateDom();
    };
    AimInputs.prototype.updateDom = function () {
        if (!this.aimBall || !this.aimBallContainer)
            return;
        var rect = this.aimBallContainer.getBoundingClientRect();
        var x = this.position.x * this.BALL_CONTAINER_RADIUS;
        var y = this.position.y * this.BALL_CONTAINER_RADIUS;
        this.aimBall.style.left = "".concat(x + rect.width / 2 - this.aimBall.offsetWidth / 2, "px");
        this.aimBall.style.top = "".concat(y + rect.height / 2 - this.aimBall.offsetHeight / 2, "px");
        if (this.aimCoordinatesDisplay) {
            this.aimCoordinatesDisplay.textContent = "x: ".concat(this.position.x.toFixed(2), ", y: ").concat(this.position.y.toFixed(2));
        }
    };
    AimInputs.prototype.getAim = function () {
        return {
            offset: { x: this.position.x, y: this.position.y, z: 0 },
            angle: this.direction,
            power: this.power,
        };
    };
    AimInputs.prototype.setAim = function (state) {
        this.position.x = state.offset.x;
        this.position.y = state.offset.y;
        this.power = state.power;
        this.powerSlider.value = state.power.toString();
        this.direction = state.angle;
        this.directionSlider.value = state.angle.toString();
        console.log("set aim", state);
        this.updateDom();
    };
    return AimInputs;
}());
exports.AimInputs = AimInputs;
//# sourceMappingURL=aiminputs.js.map