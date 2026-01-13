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
exports.Spectate = void 0;
var controllerbase_1 = require("./controllerbase");
var controller_1 = require("./controller");
var eventutil_1 = require("../events/eventutil");
var Spectate = /** @class */ (function (_super) {
    __extends(Spectate, _super);
    function Spectate(container, messageRelay, tableId) {
        var _this = _super.call(this, container) || this;
        _this.messages = [];
        _this.messageRelay = messageRelay;
        _this.tableId = tableId;
        _this.messageRelay.subscribe(_this.tableId, function (message) {
            console.log(message);
            var event = eventutil_1.EventUtil.fromSerialised(message);
            _this.messages.push(event);
            if (event instanceof controller_1.HitEvent || event instanceof controller_1.AimEvent) {
                _this.container.eventQueue.push(event);
            }
        });
        console.log("Spectate");
        return _this;
    }
    Spectate.prototype.handleAim = function (event) {
        this.container.table.cue.aim = event;
        this.container.table.cueball.pos.copy(event.pos);
        return this;
    };
    Spectate.prototype.handleHit = function (event) {
        console.log("Spectate Hit");
        this.container.table.updateFromSerialised(event.tablejson);
        this.container.table.outcome = [];
        this.container.table.hit();
        return this;
    };
    Spectate.prototype.handleInput = function (input) {
        this.commonKeyHandler(input);
        return this;
    };
    return Spectate;
}(controllerbase_1.ControllerBase));
exports.Spectate = Spectate;
//# sourceMappingURL=spectate.js.map