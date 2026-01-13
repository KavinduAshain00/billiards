"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControllerBase = void 0;
var controller_1 = require("./controller");
var gltf_1 = require("../utils/gltf");
var outcome_1 = require("../model/outcome");
var three_1 = require("three");
var ControllerBase = /** @class */ (function (_super) {
    __extends(ControllerBase, _super);
    function ControllerBase() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.scale = 0.001;
        return _this;
    }
    ControllerBase.prototype.handleChat = function (chatevent) {
        var sender = chatevent.sender ? "".concat(chatevent.sender, ":") : "";
        var message = "".concat(sender, " ").concat(chatevent.message);
        this.container.chat.showMessage(message);
        return this;
    };
    ControllerBase.prototype.hit = function () {
        this.container.table.outcome = [
            outcome_1.Outcome.hit(this.container.table.cueball, this.container.table.cue.aim.power),
        ];
        this.container.table.hit();
        this.container.view.camera.suggestMode(this.container.view.camera.topView);
        this.container.table.cue.showHelper(false);
    };
    ControllerBase.prototype.commonKeyHandler = function (input) {
        var cue = this.container.table.cue;
        var delta = input.t * this.scale;
        switch (input.key) {
            case "ArrowLeft":
                cue.rotateAim(-delta, this.container.table);
                return true;
            case "ArrowRight":
                cue.rotateAim(delta, this.container.table);
                return true;
            case "ArrowDown":
                cue.adjustSpin(new three_1.Vector3(0, -delta), this.container.table);
                return true;
            case "ArrowUp":
                cue.adjustSpin(new three_1.Vector3(0, delta), this.container.table);
                return true;
            case "ShiftArrowLeft":
                cue.adjustSpin(new three_1.Vector3(delta, 0), this.container.table);
                return true;
            case "ShiftArrowRight":
                cue.adjustSpin(new three_1.Vector3(-delta, 0), this.container.table);
                return true;
            case "KeyPUp":
                (0, gltf_1.exportGltf)(this.container.view.scene);
                return true;
            case "KeyHUp":
                cue.toggleHelper();
                return true;
            case "movementXUp":
                cue.rotateAim(-delta * 2, this.container.table);
                return true;
            case "movementYUp":
            case "NumpadSubtract":
                this.container.view.camera.adjustHeight(-delta * 8);
                return true;
            case "NumpadAdd":
                this.container.view.camera.adjustHeight(-delta * 8);
                return true;
            case "KeyOUp":
                this.container.view.camera.toggleMode();
                return true;
            case "KeyDUp":
                this.togglePanel();
                return true;
            case "KeyFUp":
                this.toggleFullscreen();
                return true;
            default:
                return false;
        }
    };
    ControllerBase.prototype.togglePanel = function () {
        this.container.sliders.toggleVisibility();
        this.container.table.showSpin(true);
        this.container.table.showTraces(true);
        typeof process !== "object" && console.log(this.container.table.serialise());
    };
    ControllerBase.prototype.toggleFullscreen = function () {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        }
        else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    };
    return ControllerBase;
}(controller_1.Controller));
exports.ControllerBase = ControllerBase;
//# sourceMappingURL=controllerbase.js.map