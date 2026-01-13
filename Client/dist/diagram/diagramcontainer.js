"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagramContainer = void 0;
var container_1 = require("../container/container");
var keyboard_1 = require("../events/keyboard");
var breakevent_1 = require("../events/breakevent");
var cameratop_1 = require("../view/cameratop");
var physics_1 = require("../model/physics/physics");
var assets_1 = require("../view/assets");
var realoverlay_1 = require("./real/realoverlay");
/**
 * Integrate billiards container into diagram html page
 */
var DiagramContainer = /** @class */ (function () {
    function DiagramContainer(canvas3d, ruletype, replay) {
        var _this = this;
        this.breakState = {
            init: null,
            shots: Array(),
        };
        this.onAssetsReady = function () {
            console.log("diagram ready");
            var replaybutton = document.getElementById("replay");
            _this.replayButton(replaybutton);
            var overlayCanvas = document.getElementById("overlaycanvas");
            if (overlayCanvas) {
                _this.realOverlay = new realoverlay_1.RealOverlay(overlayCanvas, _this.container);
            }
            else {
                _this.breakState = JSON.parse(decodeURIComponent(_this.replay));
                _this.container.eventQueue.push(new breakevent_1.BreakEvent(_this.breakState.init, _this.breakState.shots));
            }
            _this.container.animate(performance.now());
        };
        this.replay = replay;
        this.ruletype = ruletype;
        this.canvas3d = canvas3d;
        cameratop_1.CameraTop.zoomFactor = 0.88;
    }
    DiagramContainer.prototype.start = function () {
        var keyboard = new keyboard_1.Keyboard(this.canvas3d);
        this.container = new container_1.Container(this.canvas3d, console.log, assets_1.Assets.localAssets(this.ruletype), this.ruletype, keyboard, "diagram");
        if (this.cushionModel) {
            this.container.table.cushionModel = this.cushionModel;
        }
        this.onAssetsReady();
    };
    DiagramContainer.prototype.replayButton = function (replaybutton) {
        var _this = this;
        replaybutton.innerHTML = "↻";
        replaybutton.addEventListener("click", function () {
            var _a;
            if (_this.container.eventQueue.length == 0) {
                _this.container.eventQueue.push(new breakevent_1.BreakEvent(_this.breakState.init, _this.breakState.shots));
            }
            (_a = _this.realOverlay) === null || _a === void 0 ? void 0 : _a.start();
        });
    };
    DiagramContainer.fromDiamgramElement = function (diagram) {
        var containerDiv = diagram === null || diagram === void 0 ? void 0 : diagram.getElementsByClassName("topview")[0];
        var stateUrl = containerDiv === null || containerDiv === void 0 ? void 0 : containerDiv.getAttribute("data-state");
        var params = new URLSearchParams(stateUrl);
        var p = diagram === null || diagram === void 0 ? void 0 : diagram.getElementsByClassName("description")[0];
        var common = document.getElementById("common");
        var editlink = document.createElement("a");
        editlink.href = "../".concat(stateUrl);
        editlink.innerHTML = "⬀";
        editlink.target = "_blank";
        p === null || p === void 0 ? void 0 : p.appendChild(editlink);
        common === null || common === void 0 ? void 0 : common.appendChild(editlink);
        var replaybutton = document.createElement("button");
        p === null || p === void 0 ? void 0 : p.appendChild(replaybutton);
        var diagramcontainer = new DiagramContainer(containerDiv, params.get("ruletype"), params.get("state"));
        diagramcontainer.replayButton(replaybutton);
        if (params.get("cushionModel") == "bounceHan") {
            diagramcontainer.cushionModel = physics_1.bounceHan;
        }
        return diagramcontainer;
    };
    return DiagramContainer;
}());
exports.DiagramContainer = DiagramContainer;
//# sourceMappingURL=diagramcontainer.js.map