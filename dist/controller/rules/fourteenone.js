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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FourteenOne = void 0;
var watchevent_1 = require("../../events/watchevent");
var rack_1 = require("../../utils/rack");
var nineball_1 = require("./nineball");
var FourteenOne = /** @class */ (function (_super) {
    __extends(FourteenOne, _super);
    function FourteenOne(container) {
        var _this = _super.call(this, container) || this;
        _this.rulename = "fourteenone";
        return _this;
    }
    FourteenOne.prototype.asset = function () {
        return "models/p8.min.gltf";
    };
    FourteenOne.prototype.rack = function () {
        return rack_1.Rack.triangle();
    };
    FourteenOne.prototype.update = function (outcome) {
        var table = this.container.table;
        this.checkRerack(table);
        return _super.prototype.update.call(this, outcome);
    };
    FourteenOne.prototype.checkRerack = function (table) {
        var onTable = table.balls
            .filter(function (b) { return b.onTable(); })
            .filter(function (b) { return b !== table.cueball; });
        if (onTable.length === 1) {
            rack_1.Rack.rerack(onTable[0], table);
            this.container.sound.playSuccess(table.inPockets());
            var state = table.serialise();
            var rerack = new watchevent_1.WatchEvent(__assign(__assign({}, state), { rerack: true }));
            this.container.sendEvent(rerack);
            this.container.recorder.record(rerack);
            this.container.recorder.wholeGameLink();
        }
    };
    return FourteenOne;
}(nineball_1.NineBall));
exports.FourteenOne = FourteenOne;
//# sourceMappingURL=fourteenone.js.map