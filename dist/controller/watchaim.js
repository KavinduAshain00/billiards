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
exports.WatchAim = void 0;
var watchshot_1 = require("./watchshot");
var controllerbase_1 = require("./controllerbase");
var aim_1 = require("./aim");
var placeball_1 = require("./placeball");
var WatchAim = /** @class */ (function (_super) {
    __extends(WatchAim, _super);
    function WatchAim(container) {
        var _this = _super.call(this, container) || this;
        console.log('[WatchAim] Entered WatchAim state - watching opponent aim');
        _this.container.table.cueball = _this.container.rules.otherPlayersCueBall();
        _this.container.table.cue.moveTo(_this.container.table.cueball.pos);
        // Force topView when watching - user can manually toggle via camera button (KeyO)
        _this.container.view.camera.forceMode(_this.container.view.camera.topView);
        return _this;
    }
    WatchAim.prototype.handleAim = function (event) {
        console.log('[WatchAim] Received aim update from opponent');
        this.container.table.cue.aim = event;
        this.container.table.cueball.pos.copy(event.pos);
        return this;
    };
    WatchAim.prototype.handleHit = function (event) {
        console.log('[WatchAim] Received hit event from opponent - transitioning to WatchShot');
        this.container.table.applyAuthoritativeState(event.tablejson);
        return new watchshot_1.WatchShot(this.container);
    };
    WatchAim.prototype.handleStartAim = function (_) {
        console.log('[WatchAim] handleStartAim - transitioning to Aim (my turn now)');
        return new aim_1.Aim(this.container);
    };
    WatchAim.prototype.handlePlaceBall = function (_) {
        console.log('[WatchAim] handlePlaceBall - transitioning to PlaceBall (my turn, ball in hand)');
        return new placeball_1.PlaceBall(this.container);
    };
    return WatchAim;
}(controllerbase_1.ControllerBase));
exports.WatchAim = WatchAim;
//# sourceMappingURL=watchaim.js.map