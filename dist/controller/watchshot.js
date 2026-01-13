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
exports.WatchShot = void 0;
var aim_1 = require("./aim");
var watchaim_1 = require("./watchaim");
var controllerbase_1 = require("./controllerbase");
var placeball_1 = require("./placeball");
var WatchShot = /** @class */ (function (_super) {
    __extends(WatchShot, _super);
    function WatchShot(container) {
        var _this = _super.call(this, container) || this;
        console.log('[WatchShot] Entered WatchShot state - watching opponent shot play out');
        _this.container.table.outcome = [];
        _this.container.table.hit();
        // Force topView when watching shot - user can manually toggle via camera button (KeyO)
        _this.container.view.camera.forceMode(_this.container.view.camera.topView);
        return _this;
    }
    WatchShot.prototype.handleStationary = function (_) {
        // When balls stop after watching opponent's shot, just stay in WatchShot
        // The server will send turn-change event which will trigger handleStartAim or handleWatch
        console.log('[WatchShot] Balls stopped - waiting for server turn-change event');
        return this;
    };
    WatchShot.prototype.handleStartAim = function (_) {
        console.log('[WatchShot] handleStartAim - transitioning to Aim (my turn)');
        return new aim_1.Aim(this.container);
    };
    WatchShot.prototype.handlePlaceBall = function (_) {
        console.log('[WatchShot] handlePlaceBall - transitioning to PlaceBall (my turn)');
        return new placeball_1.PlaceBall(this.container);
    };
    WatchShot.prototype.handleWatch = function (event) {
        if ("rerack" in event.json) {
            console.log('[WatchShot] Respot detected');
            this.container.table.applyAuthoritativeState(event.json, 0);
            return this;
        }
        console.log('[WatchShot] handleWatch - continuing to watch (opponent continues)');
        return new watchaim_1.WatchAim(this.container);
    };
    return WatchShot;
}(controllerbase_1.ControllerBase));
exports.WatchShot = WatchShot;
//# sourceMappingURL=watchshot.js.map