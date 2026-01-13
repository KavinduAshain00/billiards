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
exports.PlayShot = void 0;
var controllerbase_1 = require("./controllerbase");
/**
 * PlayShot starts balls rolling using cue state, applies rules to outcome
 *
 */
var PlayShot = /** @class */ (function (_super) {
    __extends(PlayShot, _super);
    function PlayShot(container) {
        var _this = _super.call(this, container) || this;
        _this.hit();
        return _this;
    }
    PlayShot.prototype.handleStationary = function (_) {
        var table = this.container.table;
        var outcome = table.outcome;
        var nextController = this.container.rules.update(outcome);
        this.container.recorder.updateBreak(outcome);
        table.cue.aimAtNext(table.cueball, this.container.rules.nextCandidateBall());
        return nextController;
    };
    PlayShot.prototype.handleInput = function (input) {
        this.commonKeyHandler(input);
        return this;
    };
    return PlayShot;
}(controllerbase_1.ControllerBase));
exports.PlayShot = PlayShot;
//# sourceMappingURL=playshot.js.map