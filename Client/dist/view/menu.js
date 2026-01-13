"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Menu = void 0;
var breakevent_1 = require("../events/breakevent");
var chatevent_1 = require("../events/chatevent");
var stationaryevent_1 = require("../events/stationaryevent");
var shorten_1 = require("../utils/shorten");
var Menu = /** @class */ (function () {
    function Menu(container) {
        var _this = this;
        this.disabled = true;
        this.container = container;
        this.replay = this.getElement("replay");
        this.redo = this.getElement("redo");
        this.share = this.getElement("share");
        this.camera = this.getElement("camera");
        if (this.camera) {
            this.setMenu(true);
            this.camera.onclick = function (_) {
                _this.adjustCamera();
            };
        }
    }
    Menu.prototype.setMenu = function (disabled) {
        this.replay.disabled = disabled;
        this.redo.disabled = disabled;
        this.share.disabled = disabled;
    };
    Menu.prototype.adjustCamera = function () {
        this.container.view.camera.toggleMode();
        this.container.lastEventTime = performance.now();
    };
    Menu.prototype.replayMode = function (url, breakEvent) {
        var _this = this;
        if (!this.replay) {
            return;
        }
        this.setMenu(false);
        var queue = this.container.eventQueue;
        this.share.onclick = function (_) {
            (0, shorten_1.shorten)(url, function (url) {
                var response = (0, shorten_1.share)(url);
                queue.push(new chatevent_1.ChatEvent(null, response));
            });
        };
        this.redo.onclick = function (_) {
            var redoEvent = new breakevent_1.BreakEvent(breakEvent.init, breakEvent.shots);
            redoEvent.retry = true;
            _this.interuptEventQueue(redoEvent);
        };
        this.replay.onclick = function (_) {
            _this.interuptEventQueue(breakEvent);
        };
    };
    Menu.prototype.interuptEventQueue = function (breakEvent) {
        this.container.table.halt();
        var queue = this.container.eventQueue;
        queue.length = 0;
        queue.push(new stationaryevent_1.StationaryEvent());
        queue.push(breakEvent);
    };
    Menu.prototype.getElement = function (id) {
        return document.getElementById(id);
    };
    return Menu;
}());
exports.Menu = Menu;
//# sourceMappingURL=menu.js.map