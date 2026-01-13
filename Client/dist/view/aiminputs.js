"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AimInputs = void 0;
var three_1 = require("three");
var input_1 = require("../events/input");
var overlap_1 = require("../utils/overlap");
var utils_1 = require("../utils/utils");
var AimInputs = /** @class */ (function () {
    function AimInputs(container) {
        var _this = this;
        var _a;
        this.mousemove = function (e) {
            e.buttons === 1 && _this.adjustSpin(e);
        };
        this.powerChanged = function (_) {
            _this.container.table.cue.setPower(_this.cuePowerElement.value);
        };
        this.hit = function (_) {
            var _a;
            _this.container.table.cue.setPower((_a = _this.cuePowerElement) === null || _a === void 0 ? void 0 : _a.value);
            _this.container.inputQueue.push(new input_1.Input(0, "SpaceUp"));
        };
        this.mousewheel = function (e) {
            if (_this.cuePowerElement) {
                _this.cuePowerElement.value -= Math.sign(e.deltaY) / 10;
                _this.container.table.cue.setPower(_this.cuePowerElement.value);
                _this.container.lastEventTime = performance.now();
            }
        };
        this.container = container;
        this.cueBallElement = document.getElementById("cueBall");
        this.cueTipElement = document.getElementById("cueTip");
        this.cuePowerElement = document.getElementById("cuePower");
        this.cueHitElement = document.getElementById("cueHit");
        this.objectBallStyle = (_a = document.getElementById("objectBall")) === null || _a === void 0 ? void 0 : _a.style;
        this.overlap = new overlap_1.Overlap(this.container.table.balls);
        this.addListeners();
    }
    AimInputs.prototype.addListeners = function () {
        var _this = this;
        var _a, _b, _c, _d, _e;
        (_a = this.cueBallElement) === null || _a === void 0 ? void 0 : _a.addEventListener("pointermove", this.mousemove);
        (_b = this.cueBallElement) === null || _b === void 0 ? void 0 : _b.addEventListener("click", function (e) {
            _this.adjustSpin(e);
        });
        (_c = this.cueHitElement) === null || _c === void 0 ? void 0 : _c.addEventListener("click", this.hit);
        (_d = this.cuePowerElement) === null || _d === void 0 ? void 0 : _d.addEventListener("change", this.powerChanged);
        if (!("ontouchstart" in window)) {
            (_e = document.getElementById("viewP1")) === null || _e === void 0 ? void 0 : _e.addEventListener("dblclick", this.hit);
        }
        document.addEventListener("wheel", this.mousewheel);
    };
    AimInputs.prototype.setButtonText = function (text) {
        this.cueHitElement && (this.cueHitElement.innerText = text);
    };
    AimInputs.prototype.readDimensions = function () {
        var _a, _b, _c;
        this.ballWidth = (_a = this.cueBallElement) === null || _a === void 0 ? void 0 : _a.offsetWidth;
        this.ballHeight = (_b = this.cueBallElement) === null || _b === void 0 ? void 0 : _b.offsetHeight;
        this.tipRadius = ((_c = this.cueTipElement) === null || _c === void 0 ? void 0 : _c.offsetWidth) / 2;
    };
    AimInputs.prototype.adjustSpin = function (e) {
        this.readDimensions();
        this.container.table.cue.setSpin(new three_1.Vector3(-(e.offsetX - this.ballWidth / 2) / this.ballWidth, -(e.offsetY - this.ballHeight / 2) / this.ballHeight), this.container.table);
        this.container.lastEventTime = performance.now();
    };
    AimInputs.prototype.updateVisualState = function (x, y) {
        var _a;
        this.readDimensions();
        var elt = (_a = this.cueTipElement) === null || _a === void 0 ? void 0 : _a.style;
        if (elt) {
            elt.left = (-x + 0.5) * this.ballWidth - this.tipRadius + "px";
            elt.top = (-y + 0.5) * this.ballHeight - this.tipRadius + "px";
        }
        this.showOverlap();
    };
    AimInputs.prototype.showOverlap = function () {
        if (this.objectBallStyle) {
            var table = this.container.table;
            var dir = (0, utils_1.unitAtAngle)(table.cue.aim.angle);
            var closest = this.overlap.getOverlapOffset(table.cueball, dir);
            if (closest) {
                this.readDimensions();
                this.objectBallStyle.visibility = "visible";
                this.objectBallStyle.left =
                    5 + (closest.overlap * this.ballWidth) / 2 + "px";
                this.objectBallStyle.backgroundColor = new three_1.Color(0, 0, 0)
                    .lerp(closest.ball.ballmesh.color, 0.5)
                    .getStyle();
            }
            else {
                this.objectBallStyle.visibility = "hidden";
            }
        }
    };
    AimInputs.prototype.updatePowerSlider = function (power) {
        var _a;
        power > 0 &&
            ((_a = this.cuePowerElement) === null || _a === void 0 ? void 0 : _a.value) &&
            (this.cuePowerElement.value = power);
    };
    return AimInputs;
}());
exports.AimInputs = AimInputs;
//# sourceMappingURL=aiminputs.js.map