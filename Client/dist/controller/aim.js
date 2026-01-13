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
exports.Aim = void 0;
var controller_1 = require("./controller");
var controllerbase_1 = require("./controllerbase");
var playshot_1 = require("./playshot");
var replay_1 = require("./replay");
/**
 * Aim using input events.
 *
 */
var Aim = /** @class */ (function (_super) {
    __extends(Aim, _super);
    function Aim(container) {
        var _this = _super.call(this, container) || this;
        var table = _this.container.table;
        table.cue.aimMode();
        table.cue.showHelper(true);
        table.cueball = _this.container.rules.cueball;
        table.cue.moveTo(table.cueball.pos);
        // Suggest aimView for active player (can be toggled via camera button)
        _this.container.view.camera.forceMode(_this.container.view.camera.aimView);
        table.cue.aimInputs.showOverlap();
        return _this;
    }
    Aim.prototype.handleInput = function (input) {
        switch (input.key) {
            case "Space":
                this.container.table.cue.adjustPower(input.t * this.scale * 0.7);
                break;
            case "SpaceUp":
                return this.playShot();
            default:
                if (!this.commonKeyHandler(input)) {
                    return this;
                }
        }
        this.container.sendEvent(this.container.table.cue.aim);
        return this;
    };
    Aim.prototype.handleBreak = function (breakEvent) {
        return new replay_1.Replay(this.container, breakEvent.init, breakEvent.shots, breakEvent.retry);
    };
    Aim.prototype.playShot = function () {
        var hitEvent = new controller_1.HitEvent(this.container.table.serialise());
        this.container.sendEvent(hitEvent);
        this.container.recorder.record(hitEvent);
        return new playshot_1.PlayShot(this.container);
    };
    return Aim;
}(controllerbase_1.ControllerBase));
exports.Aim = Aim;
//# sourceMappingURL=aim.js.map