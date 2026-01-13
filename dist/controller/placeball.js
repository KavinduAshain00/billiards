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
exports.PlaceBall = void 0;
var controllerbase_1 = require("./controllerbase");
var controller_1 = require("./controller");
var aim_1 = require("./aim");
var breakevent_1 = require("../events/breakevent");
var constants_1 = require("../model/physics/constants");
var three_1 = require("three");
var cuemesh_1 = require("../view/cuemesh");
/**
 * Place cue ball using input events.
 *
 * Needs to be configurable to break place ball and post foul place ball anywhere legal.
 */
var PlaceBall = /** @class */ (function (_super) {
    __extends(PlaceBall, _super);
    function PlaceBall(container) {
        var _this = _super.call(this, container) || this;
        _this.placescale = 0.02 * constants_1.R;
        _this.container.table.cue.moveTo(_this.container.table.cueball.pos);
        _this.container.table.cue.aim.power = 0;
        _this.container.view.camera.forceMode(_this.container.view.camera.topView);
        return _this;
    }
    PlaceBall.prototype.onFirst = function () {
        var cueball = this.container.table.cueball;
        if (this.container.rules.allowsPlaceBall()) {
            cueball.pos.copy(this.container.rules.placeBall());
        }
        cueball.setStationary();
        cueball.updateMesh(0);
        this.container.table.cue.placeBallMode();
        this.container.table.cue.showHelper(false);
        this.container.table.cue.moveTo(this.container.table.cueball.pos);
        this.container.table.cue.aimInputs.setButtonText("Place\nBall");
        if (!this.container.rules.allowsPlaceBall()) {
            this.container.inputQueue.push(new controller_1.Input(1, "SpaceUp"));
        }
    };
    PlaceBall.prototype.handleInput = function (input) {
        var ballPos = this.container.table.cueball.pos;
        switch (input.key) {
            case "ArrowLeft":
                this.moveTo(0, input.t * this.placescale);
                break;
            case "ArrowRight":
                this.moveTo(0, -input.t * this.placescale);
                break;
            // use cursor movement for placing cueball
            case "movementXUp":
                this.moveTo(input.t * this.placescale * 2, 0);
                break;
            case "movementYUp":
                this.moveTo(0, -input.t * this.placescale * 2);
                break;
            // use IJKL for placing cueball
            case "KeyI":
                this.moveTo(0, input.t * this.placescale);
                break;
            case "KeyK":
                this.moveTo(0, -input.t * this.placescale);
                break;
            case "KeyJ":
                this.moveTo(-input.t * this.placescale, 0);
                break;
            case "KeyL":
                this.moveTo(input.t * this.placescale, 0);
                break;
            case "SpaceUp":
                return this.placed();
            default:
                this.commonKeyHandler(input);
        }
        this.container.table.cue.moveTo(ballPos);
        this.container.sendEvent(this.container.table.cue.aim);
        return this;
    };
    PlaceBall.prototype.moveTo = function (dx, dy) {
        var delta = new three_1.Vector3(dx, dy);
        var ballPos = this.container.table.cueball.pos.add(delta);
        ballPos.copy(this.container.rules.placeBall(ballPos));
        cuemesh_1.CueMesh.indicateValid(!this.container.table.overlapsAny(ballPos));
    };
    PlaceBall.prototype.placed = function () {
        if (this.container.table.overlapsAny(this.container.table.cueball.pos)) {
            return this;
        }
        this.container.table.cue.aimInputs.setButtonText("Hit");
        this.container.sound.playNotify();
        this.container.sendEvent(new breakevent_1.BreakEvent(this.container.table.shortSerialise()));
        return new aim_1.Aim(this.container);
    };
    return PlaceBall;
}(controllerbase_1.ControllerBase));
exports.PlaceBall = PlaceBall;
//# sourceMappingURL=placeball.js.map