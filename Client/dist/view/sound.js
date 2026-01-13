"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sound = void 0;
var three_1 = require("three");
var Sound = /** @class */ (function () {
    function Sound(loadAssets) {
        this.lastOutcomeTime = 0;
        this.loadAssets = loadAssets;
        if (!loadAssets) {
            return;
        }
        this.listener = new three_1.AudioListener();
        this.audioLoader = new three_1.AudioLoader();
        this.ballcollision = new three_1.Audio(this.listener);
        this.load("sounds/ballcollision.ogg", this.ballcollision);
        this.cue = new three_1.Audio(this.listener);
        this.load("sounds/cue.ogg", this.cue);
        this.cushion = new three_1.Audio(this.listener);
        this.load("sounds/cushion.ogg", this.cushion);
        this.pot = new three_1.Audio(this.listener);
        this.load("sounds/pot.ogg", this.pot);
        this.success = new three_1.Audio(this.listener);
        this.load("sounds/success.ogg", this.success);
    }
    Sound.prototype.addCameraToListener = function (camera) {
        camera.add(this.listener);
    };
    Sound.prototype.load = function (path, audio) {
        this.audioLoader.load(path, function (buffer) {
            audio.setBuffer(buffer);
            audio.setLoop(false);
        }, function (_) { }, function (_) { });
    };
    Sound.prototype.play = function (audio, volume, detune) {
        var _a;
        if (detune === void 0) { detune = 0; }
        if (this.loadAssets) {
            var context = three_1.AudioContext.getContext();
            if ((context === null || context === void 0 ? void 0 : context.state) === "suspended") {
                if ((_a = navigator === null || navigator === void 0 ? void 0 : navigator.userActivation) === null || _a === void 0 ? void 0 : _a.hasBeenActive) {
                    context.resume();
                }
                return;
            }
            audio.setVolume(volume);
            if (audio.isPlaying) {
                audio.stop();
            }
            audio.play(three_1.MathUtils.randFloat(0, 0.01));
            audio.setDetune(detune);
        }
    };
    Sound.prototype.outcomeToSound = function (outcome) {
        if (outcome.type === "Collision") {
            this.play(this.ballcollision, outcome.incidentSpeed / 80, outcome.incidentSpeed * 5);
        }
        if (outcome.type === "Pot") {
            this.play(this.pot, outcome.incidentSpeed / 10, -1000 + outcome.incidentSpeed * 10);
        }
        if (outcome.type === "Cushion") {
            this.play(this.cushion, outcome.incidentSpeed / 70);
        }
        if (outcome.type === "Hit") {
            this.play(this.cue, outcome.incidentSpeed / 30);
        }
    };
    Sound.prototype.processOutcomes = function (outcomes) {
        var _this = this;
        outcomes.every(function (outcome) {
            if (outcome.timestamp > _this.lastOutcomeTime) {
                _this.lastOutcomeTime = outcome.timestamp;
                _this.outcomeToSound(outcome);
                return false;
            }
            return true;
        });
    };
    Sound.prototype.playNotify = function () {
        this.play(this.pot, 1);
    };
    Sound.prototype.playSuccess = function (pitch) {
        this.play(this.success, 0.1, pitch * 100 - 2200);
    };
    return Sound;
}());
exports.Sound = Sound;
//# sourceMappingURL=sound.js.map