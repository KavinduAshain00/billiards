"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealOverlay = void 0;
var realposition_1 = require("./realposition");
var realdraw_1 = require("./realdraw");
var breakevent_1 = require("../../events/breakevent");
var abortevent_1 = require("../../events/abortevent");
var beginevent_1 = require("../../events/beginevent");
var aiminputs_1 = require("./aiminputs");
var RealOverlay = /** @class */ (function () {
    function RealOverlay(canvas, container) {
        this.fileInput = document.getElementById("fileInput");
        this.shotIndexDisplay = document.getElementById("shotIndexDisplay");
        this.shotSelector = document.getElementById("shotSelector");
        this.replayButton = document.getElementById("replay");
        this.myIframe = document.getElementById("myIframe");
        this.allShots = [];
        this.currentShotIndex = 0;
        this.animationTimer = -2.35;
        this.isPlaying = false;
        this.lastFrameTime = 0;
        this.animationStartTime = 0;
        this.realPosition = null;
        this.elapsedTime = 0;
        this.drawer = new realdraw_1.RealDraw(canvas);
        this.container = container;
        this.aimInputs = new aiminputs_1.AimInputs();
        container && (container.frame = this.advance.bind(this));
        this.start();
    }
    RealOverlay.prototype.start = function () {
        console.log("real overlay start");
        this.loadDefaultData();
        this.addEventListeners();
    };
    RealOverlay.prototype.addEventListeners = function () {
        var _this = this;
        this.fileInput.addEventListener("change", function (event) {
            return _this.handleFileChange(event);
        });
        this.shotSelector.addEventListener("change", function () { return _this.handleShotSelect(); });
        this.replayButton.addEventListener("click", function () { return _this.handleReplay(); });
    };
    RealOverlay.prototype.handleFileChange = function (event) {
        var _this = this;
        var file = event.target.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function (e) {
                try {
                    var shotsData = JSON.parse(e.target.result);
                    _this.processShots(shotsData);
                }
                catch (error) {
                    console.error("Error parsing JSON:", error);
                    alert("Error parsing JSON file.");
                }
            };
            reader.readAsText(file);
        }
    };
    RealOverlay.prototype.handleShotSelect = function () {
        this.currentShotIndex = parseInt(this.shotSelector.value, 10);
        this.updateDisplay();
        this.resetAnimation();
    };
    RealOverlay.prototype.loadDefaultData = function () {
        var _this = this;
        fetch("simple_shots.json")
            .then(function (response) {
            if (!response.ok) {
                throw new Error("HTTP error! status: ".concat(response.status));
            }
            return response.json();
        })
            .then(function (shotsData) { return _this.processShots(shotsData); });
    };
    RealOverlay.prototype.processShots = function (shotsData) {
        this.allShots = shotsData;
        this.realPosition = new realposition_1.RealPosition(this.allShots);
        if (this.allShots.length > 0) {
            this.currentShotIndex = 0;
            this.populateShotSelector();
            this.updateDisplay();
            this.resetAnimation();
        }
    };
    RealOverlay.prototype.populateShotSelector = function () {
        var _this = this;
        this.shotSelector.innerHTML = "";
        this.allShots.forEach(function (shot, index) {
            var option = document.createElement("option");
            option.value = index.toString();
            option.text = "Shot ".concat(index + 1, " (ID: ").concat(shot.shotID, ")");
            _this.shotSelector.appendChild(option);
        });
        if (this.allShots.length > 0) {
            this.shotSelector.value = this.currentShotIndex.toString();
        }
    };
    RealOverlay.prototype.updateDisplay = function () {
        this.shotIndexDisplay.textContent = "Shot: ".concat(this.currentShotIndex + 1);
        if (this.allShots[this.currentShotIndex]) {
            this.shotSelector.value = this.currentShotIndex.toString();
        }
    };
    RealOverlay.prototype.drawShot = function (shotData, currentTime) {
        if (currentTime === void 0) { currentTime = 0; }
        if (!this.realPosition)
            return;
        var ballPositions = this.realPosition.getPositionsAtTime(shotData.shotID, currentTime);
        if (!ballPositions)
            return;
        for (var ballNum in ballPositions) {
            this.drawer.updateBallPaths(ballNum, ballPositions[ballNum]);
        }
        this.drawer.clear();
        this.drawer.drawShot(ballPositions);
    };
    RealOverlay.prototype.handleReplay = function () {
        this.resetAnimation();
    };
    RealOverlay.prototype.resetAnimation = function () {
        this.isPlaying = false;
        this.animationTimer = -2.3;
        this.drawer.resetCanvas();
        this.drawShot(this.allShots[this.currentShotIndex], 0);
        this.resetSimulation(this.allShots[this.currentShotIndex]);
    };
    RealOverlay.prototype.resetSimulation = function (shotData) {
        console.log("reset simulation");
        var state = this.realPosition.stateFrom(shotData);
        this.container.table.updateFromShortSerialised(state.init);
        this.container.eventQueue.push(new abortevent_1.AbortEvent());
        this.container.eventQueue.push(new beginevent_1.BeginEvent());
        this.container.eventQueue.push(new breakevent_1.BreakEvent(state.init, state.shots));
        // Update aim inputs with the shot state
        this.aimInputs.setAim(state.shots[0]);
    };
    RealOverlay.prototype.advance = function (elapsed) {
        this.elapsedTime += elapsed;
        this.animationTimer += elapsed;
        var currentShot = this.allShots[this.currentShotIndex];
        this.drawShot(currentShot, this.animationTimer);
    };
    return RealOverlay;
}());
exports.RealOverlay = RealOverlay;
//# sourceMappingURL=realoverlay.js.map