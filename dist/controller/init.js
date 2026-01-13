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
exports.Init = void 0;
var watchevent_1 = require("../events/watchevent");
var watchaim_1 = require("./watchaim");
var controllerbase_1 = require("./controllerbase");
var placeball_1 = require("./placeball");
var replay_1 = require("./replay");
var session_1 = require("../network/client/session");
var spectate_1 = require("./spectate");
var nchanmessagerelay_1 = require("../network/client/nchanmessagerelay");
/**
 * Initial state of controller.
 *
 * Transitions into active player or watcher or replay mode.
 */
var Init = /** @class */ (function (_super) {
    __extends(Init, _super);
    function Init() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Init.prototype.handleBegin = function (_) {
        if (session_1.Session.isSpectator()) {
            return new spectate_1.Spectate(this.container, new nchanmessagerelay_1.NchanMessageRelay(), session_1.Session.getInstance().tableId);
        }
        this.container.chat.showMessage("Start");
        this.container.sendEvent(new watchevent_1.WatchEvent(this.container.table.serialise()));
        return new placeball_1.PlaceBall(this.container);
    };
    Init.prototype.handleWatch = function (event) {
        this.container.chat.showMessage("Opponent to break");
        this.container.rules.secondToPlay();
        this.container.table.updateFromSerialised(event.json);
        return new watchaim_1.WatchAim(this.container);
    };
    Init.prototype.handleBreak = function (event) {
        if (event.init) {
            this.container.table.updateFromShortSerialised(event.init);
            this.container.chat.showMessage("Replay");
            return new replay_1.Replay(this.container, event.init, event.shots);
        }
        return new placeball_1.PlaceBall(this.container);
    };
    return Init;
}(controllerbase_1.ControllerBase));
exports.Init = Init;
//# sourceMappingURL=init.js.map