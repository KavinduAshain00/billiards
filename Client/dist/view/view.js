"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.View = void 0;
var three_1 = require("three");
var camera_1 = require("./camera");
var grid_1 = require("./grid");
var webgl_1 = require("../utils/webgl");
var snooker_1 = require("../controller/rules/snooker");
var View = /** @class */ (function () {
    function View(element, table, assets) {
        this.scene = new three_1.Scene();
        this.windowWidth = 1;
        this.windowHeight = 1;
        this.loadAssets = true;
        this.ballToCheck = 0;
        this.element = element;
        this.table = table;
        this.assets = assets;
        this.renderer = (0, webgl_1.renderer)(element);
        this.camera = new camera_1.Camera(element ? element.offsetWidth / element.offsetHeight : 1);
        this.initialiseScene();
    }
    View.prototype.update = function (elapsed, aim) {
        this.camera.update(elapsed, aim);
    };
    View.prototype.sizeChanged = function () {
        var _a, _b;
        return (this.windowWidth != ((_a = this.element) === null || _a === void 0 ? void 0 : _a.offsetWidth) ||
            this.windowHeight != ((_b = this.element) === null || _b === void 0 ? void 0 : _b.offsetHeight));
    };
    View.prototype.updateSize = function () {
        var _a, _b;
        var hasChanged = this.sizeChanged();
        if (hasChanged) {
            this.windowWidth = (_a = this.element) === null || _a === void 0 ? void 0 : _a.offsetWidth;
            this.windowHeight = (_b = this.element) === null || _b === void 0 ? void 0 : _b.offsetHeight;
        }
        return hasChanged;
    };
    View.prototype.render = function () {
        if (this.isInMotionNotVisible()) {
            this.camera.suggestMode(this.camera.topView);
        }
        this.renderCamera(this.camera);
    };
    View.prototype.renderCamera = function (cam) {
        var _a, _b, _c, _d, _e;
        if (this.updateSize()) {
            var width = this.windowWidth;
            var height = this.windowHeight;
            (_a = this.renderer) === null || _a === void 0 ? void 0 : _a.setSize(width, height);
            (_b = this.renderer) === null || _b === void 0 ? void 0 : _b.setViewport(0, 0, width, height);
            (_c = this.renderer) === null || _c === void 0 ? void 0 : _c.setScissor(0, 0, width, height);
            (_d = this.renderer) === null || _d === void 0 ? void 0 : _d.setScissorTest(true);
            cam.camera.aspect = width / height;
        }
        cam.camera.updateProjectionMatrix();
        (_e = this.renderer) === null || _e === void 0 ? void 0 : _e.render(this.scene, cam.camera);
    };
    View.prototype.initialiseScene = function () {
        this.scene.add(new three_1.AmbientLight(0x009922, 0.3));
        if (this.assets.background) {
            this.scene.add(this.assets.background);
        }
        this.scene.add(this.assets.table);
        this.table.mesh = this.assets.table;
        if (this.assets.rules.asset() !== snooker_1.Snooker.tablemodel) {
            this.scene.add(new grid_1.Grid().generateLineSegments());
        }
    };
    View.prototype.isInMotionNotVisible = function () {
        var frustrum = this.viewFrustrum();
        var b = this.table.balls[this.ballToCheck++ % this.table.balls.length];
        return b.inMotion() && !frustrum.intersectsObject(b.ballmesh.mesh);
    };
    View.prototype.viewFrustrum = function () {
        var c = this.camera.camera;
        var frustrum = new three_1.Frustum();
        frustrum.setFromProjectionMatrix(new three_1.Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse));
        return frustrum;
    };
    return View;
}());
exports.View = View;
//# sourceMappingURL=view.js.map