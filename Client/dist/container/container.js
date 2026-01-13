"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Container = void 0;
var stationaryevent_1 = require("../events/stationaryevent");
var view_1 = require("../view/view");
var init_1 = require("../controller/init");
var aiminputs_1 = require("../view/aiminputs");
var util_1 = require("../controller/util");
var chat_1 = require("../view/chat");
var chatevent_1 = require("../events/chatevent");
var throttle_1 = require("../events/throttle");
var sliders_1 = require("../view/sliders");
var recorder_1 = require("../events/recorder");
var rulefactory_1 = require("../controller/rules/rulefactory");
var menu_1 = require("../view/menu");
var ballmesh_1 = require("../view/ballmesh");
/**
 * Model, View, Controller container.
 */
var Container = /** @class */ (function () {
    function Container(element, log, assets, ruletype, keyboard, id) {
        var _this = this;
        this.inputQueue = [];
        this.eventQueue = [];
        this.id = "";
        this.isSinglePlayer = true;
        this.last = performance.now();
        this.step = 0.001953125 * 1;
        this.broadcast = function () { };
        this.reportShotComplete = function () { };
        this.sendChat = function (msg) {
            _this.sendEvent(new chatevent_1.ChatEvent(_this.id, msg));
        };
        this.throttle = new throttle_1.Throttle(0, function (event) {
            _this.broadcast(event);
        });
        this.lastEventTime = performance.now();
        this.log = log;
        this.rules = rulefactory_1.RuleFactory.create(ruletype, this);
        // Pass ball models to BallMesh before creating table
        if (assets.ballModels && assets.ballModels.size > 0) {
            ballmesh_1.BallMesh.ballModels = assets.ballModels;
        }
        this.table = this.rules.table();
        this.view = new view_1.View(element, this.table, assets);
        this.table.cue.aimInputs = new aiminputs_1.AimInputs(this);
        this.keyboard = keyboard;
        this.sound = assets.sound;
        this.chat = new chat_1.Chat(this.sendChat);
        this.sliders = new sliders_1.Sliders();
        this.recorder = new recorder_1.Recorder(this);
        this.id = id;
        this.menu = new menu_1.Menu(this);
        // instantiate rule-specific HUD
        try {
            var _a = require("../view/hud"), SnookerHud = _a.SnookerHud, EightBallHud = _a.EightBallHud, Hud = _a.Hud;
            if (ruletype === "snooker") {
                this.hud = new SnookerHud();
            }
            else if (ruletype === "eightball") {
                this.hud = new EightBallHud();
            }
            else {
                this.hud = new Hud();
            }
        }
        catch (e) {
            // In environments without DOM (some tests), fallback to base Hud
            var Hud = require("../view/hud").Hud;
            this.hud = new Hud();
        }
        this.table.addToScene(this.view.scene);
        this.updateController(new init_1.Init(this));
    }
    Container.prototype.sendEvent = function (event) {
        this.throttle.send(event);
    };
    Container.prototype.advance = function (elapsed) {
        var _a;
        (_a = this.frame) === null || _a === void 0 ? void 0 : _a.call(this, elapsed);
        var steps = Math.floor(elapsed / this.step);
        var computedElapsed = steps * this.step;
        var stateBefore = this.table.allStationary();
        for (var i = 0; i < steps; i++) {
            this.table.advance(this.step);
        }
        this.table.updateBallMesh(computedElapsed);
        this.view.update(computedElapsed, this.table.cue.aim);
        this.table.cue.update(computedElapsed);
        if (!stateBefore && this.table.allStationary()) {
            this.eventQueue.push(new stationaryevent_1.StationaryEvent());
        }
        this.sound.processOutcomes(this.table.outcome);
    };
    Container.prototype.processEvents = function () {
        var _this = this;
        if (this.keyboard) {
            var inputs = this.keyboard.getEvents();
            inputs.forEach(function (i) { return _this.inputQueue.push(i); });
        }
        while (this.inputQueue.length > 0) {
            this.lastEventTime = this.last;
            var input = this.inputQueue.shift();
            input && this.updateController(this.controller.handleInput(input));
        }
        // only process events when stationary
        if (this.table.allStationary()) {
            var event_1 = this.eventQueue.shift();
            if (event_1) {
                this.lastEventTime = performance.now();
                this.updateController(event_1.applyToController(this.controller));
            }
        }
    };
    Container.prototype.animate = function (timestamp) {
        var _this = this;
        this.advance((timestamp - this.last) / 1000);
        this.last = timestamp;
        this.processEvents();
        var needsRender = timestamp < this.lastEventTime + 12000 ||
            !this.table.allStationary() ||
            this.view.sizeChanged();
        if (needsRender) {
            this.view.render();
        }
        requestAnimationFrame(function (t) {
            _this.animate(t);
        });
    };
    Container.prototype.updateController = function (controller) {
        if (controller !== this.controller) {
            this.log("Transition to " + (0, util_1.controllerName)(controller));
            this.controller = controller;
            this.controller.onFirst();
        }
    };
    return Container;
}());
exports.Container = Container;
//# sourceMappingURL=container.js.map