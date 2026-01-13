"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Camera = void 0;
var three_1 = require("three");
var utils_1 = require("../utils/utils");
var cameratop_1 = require("./cameratop");
var constants_1 = require("../model/physics/constants");
var Camera = /** @class */ (function () {
    function Camera(aspectRatio) {
        this.mode = this.topView;
        this.mainMode = this.aimView;
        this.height = constants_1.R * 8;
        this.camera = new three_1.PerspectiveCamera(45, aspectRatio, constants_1.R, constants_1.R * 1000);
    }
    Camera.prototype.update = function (elapsed, aim) {
        this.elapsed = elapsed;
        this.mode(aim);
    };
    Camera.prototype.topView = function (_) {
        this.camera.fov = cameratop_1.CameraTop.fov;
        this.camera.position.lerp(cameratop_1.CameraTop.viewPoint(this.camera.aspect, this.camera.fov), 0.9);
        this.camera.up = utils_1.up;
        this.camera.lookAt(utils_1.zero);
    };
    Camera.prototype.aimView = function (aim, fraction) {
        if (fraction === void 0) { fraction = 0.08; }
        var h = this.height;
        var portrait = this.camera.aspect < 0.8;
        this.camera.fov = portrait ? 60 : 40;
        if (h < 10 * constants_1.R) {
            var factor = 100 * (10 * constants_1.R - h);
            this.camera.fov -= factor * (portrait ? 3 : 1);
        }
        this.camera.position.lerp(aim.pos.clone().addScaledVector((0, utils_1.unitAtAngle)(aim.angle), -constants_1.R * 18), fraction);
        this.camera.position.z = h;
        this.camera.up = utils_1.up;
        this.camera.lookAt(aim.pos.clone().addScaledVector(utils_1.up, h / 2));
    };
    Camera.prototype.adjustHeight = function (delta) {
        delta = this.height < 10 * constants_1.R ? delta / 8 : delta;
        this.height = three_1.MathUtils.clamp(this.height + delta, constants_1.R * 6, constants_1.R * 120);
        if (this.height > constants_1.R * 110) {
            this.suggestMode(this.topView);
        }
        if (this.height < constants_1.R * 105) {
            this.suggestMode(this.aimView);
        }
    };
    Camera.prototype.adjustPan = function (deltaX, deltaY) {
        // Pan camera in top view by adjusting the target position
        this.camera.position.x += deltaX;
        this.camera.position.y += deltaY;
    };
    Camera.prototype.suggestMode = function (mode) {
        if (this.mainMode === this.aimView) {
            this.mode = mode;
        }
    };
    Camera.prototype.forceMode = function (mode) {
        this.mode = mode;
        this.mainMode = mode;
    };
    Camera.prototype.forceMove = function (aim) {
        if (this.mode === this.aimView) {
            this.aimView(aim, 1);
        }
    };
    Camera.prototype.toggleMode = function () {
        if (this.mode === this.topView) {
            this.mode = this.aimView;
        }
        else {
            this.mode = this.topView;
        }
        this.mainMode = this.mode;
    };
    return Camera;
}());
exports.Camera = Camera;
//# sourceMappingURL=camera.js.map