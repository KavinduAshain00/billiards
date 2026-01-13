"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserContainer = void 0;
var container_1 = require("./container");
var keyboard_1 = require("../events/keyboard");
var eventutil_1 = require("../events/eventutil");
var breakevent_1 = require("../events/breakevent");
var physics_1 = require("../model/physics/physics");
var jsoncrush_1 = require("jsoncrush");
var assets_1 = require("../view/assets");
var session_1 = require("../network/client/session");
var nchanmessagerelay_1 = require("../network/client/nchanmessagerelay");
var beginevent_1 = require("../events/beginevent");
var socketiorelay_1 = require("../network/client/socketiorelay");
var authoritativeplayback_1 = require("../controller/authoritativeplayback");
/**
 * Integrate game container into HTML page
 *
 * Supports two multiplayer modes:
 * 1. Legacy Nchan pub/sub (client-authoritative)
 * 2. Socket.IO server-authoritative with snapshot interpolation
 */
var BrowserContainer = /** @class */ (function () {
    function BrowserContainer(canvas3d, params) {
        var _a, _b, _c, _d, _e;
        this.messageRelay = null;
        // Socket.IO server-authoritative mode
        this.socketRelay = null;
        this.authoritativePlayback = null;
        this.useServerAuthoritative = false;
        this.serverUrl = "";
        this.breakState = {
            init: null,
            shots: Array(),
            now: 0,
            score: 0,
        };
        this.now = Date.now();
        this.playername = (_a = params.get("name")) !== null && _a !== void 0 ? _a : "";
        this.tableId = (_b = params.get("tableId")) !== null && _b !== void 0 ? _b : "default";
        this.clientId = (_c = params.get("clientId")) !== null && _c !== void 0 ? _c : "default";
        this.replay = params.get("state");
        this.ruletype = (_d = params.get("ruletype")) !== null && _d !== void 0 ? _d : "eightball";
        this.wss = params.get("websocketserver");
        this.canvas3d = canvas3d;
        this.cushionModel = this.cushion(params.get("cushionModel"));
        this.spectator = params.has("spectator");
        this.first = params.has("first");
        // Check for server-authoritative mode
        this.serverUrl = (_e = params.get("server")) !== null && _e !== void 0 ? _e : "";
        this.useServerAuthoritative = !!this.serverUrl;
        session_1.Session.init(this.clientId, this.playername, this.tableId, this.spectator);
    }
    BrowserContainer.prototype.cushion = function (model) {
        switch (model) {
            case "bounceHan":
                return physics_1.bounceHan;
            case "bounceHanBlend":
                return physics_1.bounceHanBlend;
            default:
                return physics_1.mathavenAdapter;
        }
    };
    BrowserContainer.prototype.start = function () {
        var _this = this;
        this.assets = new assets_1.Assets(this.ruletype);
        this.assets.loadFromWeb(function () {
            _this.onAssetsReady();
        });
    };
    BrowserContainer.prototype.onAssetsReady = function () {
        var _this = this;
        console.log("".concat(this.playername, " assets ready"));
        this.container = new container_1.Container(this.canvas3d, console.log, this.assets, this.ruletype, new keyboard_1.Keyboard(this.canvas3d), this.playername);
        this.container.broadcast = function (e) {
            _this.broadcast(e);
        };
        this.container.table.cushionModel = this.cushionModel;
        this.setReplayLink();
        if (this.spectator) {
            this.container.eventQueue.push(new beginevent_1.BeginEvent());
            this.container.animate(performance.now());
            return;
        }
        // Server-authoritative mode with Socket.IO
        if (this.useServerAuthoritative) {
            this.initServerAuthoritative();
            return;
        }
        // Legacy Nchan pub/sub mode
        if (this.wss) {
            this.container.isSinglePlayer = false;
            this.messageRelay = new nchanmessagerelay_1.NchanMessageRelay();
            this.messageRelay.subscribe(this.tableId, function (e) {
                _this.netEvent(e);
            });
            if (!this.first && !this.spectator) {
                this.broadcast(new beginevent_1.BeginEvent());
            }
        }
        if (this.replay) {
            this.startReplay(this.replay);
        }
        else if (!this.messageRelay) {
            this.container.eventQueue.push(new breakevent_1.BreakEvent());
        }
        // trigger animation loops
        this.container.animate(performance.now());
    };
    /**
     * Initialize server-authoritative multiplayer mode
     * Uses Socket.IO with snapshot interpolation
     */
    BrowserContainer.prototype.initServerAuthoritative = function () {
        var _this = this;
        console.log("Connecting to authoritative server: ".concat(this.serverUrl));
        this.container.isSinglePlayer = false;
        // Create Socket.IO relay
        this.socketRelay = new socketiorelay_1.SocketIOMessageRelay(this.serverUrl);
        // Create authoritative playback controller
        this.authoritativePlayback = new authoritativeplayback_1.AuthoritativePlayback(this.container, this.socketRelay);
        // Setup callbacks
        this.socketRelay.setCallbacks({
            onWelcome: function (data) {
                console.log("Connected to room ".concat(data.roomId));
                _this.container.chat.showMessage("Connected to server");
                // Apply initial state
                _this.container.table.applyAuthoritativeState(data.initialState, 0);
                // Start animation with server-authoritative mode
                _this.startServerAuthoritativeAnimation();
            },
            onConnectionChange: function (state) {
                if (state === "disconnected") {
                    _this.container.chat.showMessage("Disconnected from server");
                }
                else if (state === "connecting") {
                    _this.container.chat.showMessage("Connecting to server...");
                }
            },
            onPlayerJoined: function (data) {
                _this.container.chat.showMessage("".concat(data.playerName, " joined"));
            },
            onPlayerLeft: function (_data) {
                _this.container.chat.showMessage("Player left");
            },
            onChat: function (data) {
                _this.container.chat.showMessage("".concat(data.playerName, ": ").concat(data.message));
            },
            onError: function (data) {
                console.error("Server error:", data.message);
                _this.container.chat.showMessage("Error: ".concat(data.message));
            },
        });
        // Connect to server
        this.socketRelay.connect({
            roomId: this.tableId,
            clientId: this.clientId,
            playerName: this.playername,
            ruletype: this.ruletype,
        });
    };
    /**
     * Animation loop for server-authoritative mode
     * 60 FPS render with snapshot interpolation
     */
    BrowserContainer.prototype.startServerAuthoritativeAnimation = function () {
        var _this = this;
        var lastTimestamp = performance.now();
        var animate = function (timestamp) {
            var elapsed = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;
            // Update authoritative playback (handles interpolation)
            if (_this.authoritativePlayback) {
                _this.authoritativePlayback.update(timestamp);
                // Only run local physics if not in authoritative playback
                if (!_this.authoritativePlayback.isPlayingBack()) {
                    _this.container.advance(elapsed);
                }
            }
            // Update visuals
            _this.container.table.updateBallMesh(elapsed);
            _this.container.view.update(elapsed, _this.container.table.cue.aim);
            _this.container.table.cue.update(elapsed);
            // Process sound outcomes
            _this.container.sound.processOutcomes(_this.container.table.outcome);
            // Process input events
            _this.container.processEvents();
            // Render
            _this.container.view.render();
            requestAnimationFrame(animate);
        };
        // Start animation loop
        requestAnimationFrame(animate);
    };
    /**
     * Submit a shot via server-authoritative mode
     */
    BrowserContainer.prototype.submitAuthoritativeShot = function (aim) {
        if (this.authoritativePlayback) {
            this.authoritativePlayback.submitShot(aim);
        }
    };
    /**
     * Check if can submit a shot in server-authoritative mode
     */
    BrowserContainer.prototype.canSubmitShot = function () {
        if (!this.authoritativePlayback)
            return true;
        return this.authoritativePlayback.canShoot();
    };
    /**
     * Get current playback mode for UI feedback
     */
    BrowserContainer.prototype.getPlaybackMode = function () {
        var _a, _b;
        return (_b = (_a = this.authoritativePlayback) === null || _a === void 0 ? void 0 : _a.getMode()) !== null && _b !== void 0 ? _b : null;
    };
    /**
     * Get network stats for debugging
     */
    BrowserContainer.prototype.getNetworkStats = function () {
        var _a, _b;
        return (_b = (_a = this.authoritativePlayback) === null || _a === void 0 ? void 0 : _a.getStats()) !== null && _b !== void 0 ? _b : null;
    };
    BrowserContainer.prototype.netEvent = function (e) {
        var event = eventutil_1.EventUtil.fromSerialised(e);
        console.log("".concat(this.playername, " received ").concat(event.type, " : ").concat(event.clientId));
        if (event.clientId !== session_1.Session.getInstance().clientId) {
            this.container.eventQueue.push(event);
        }
        else {
            console.log("Ignoring own event");
        }
    };
    BrowserContainer.prototype.broadcast = function (event) {
        if (this.messageRelay) {
            event.clientId = session_1.Session.getInstance().clientId;
            console.log("".concat(this.playername, " broadcasting ").concat(event.type, " : ").concat(event.clientId));
            this.messageRelay.publish(this.tableId, eventutil_1.EventUtil.serialise(event));
        }
    };
    BrowserContainer.prototype.setReplayLink = function () {
        var url = window.location.href.split("?")[0];
        var prefix = "".concat(url, "?ruletype=").concat(this.ruletype, "&state=");
        this.container.recorder.replayUrl = prefix;
    };
    BrowserContainer.prototype.startReplay = function (replay) {
        console.log(replay);
        this.breakState = this.parse(replay);
        console.log(this.breakState);
        var breakEvent = new breakevent_1.BreakEvent(this.breakState.init, this.breakState.shots);
        this.container.eventQueue.push(breakEvent);
        this.container.menu.replayMode(window.location.href, breakEvent);
    };
    BrowserContainer.prototype.parse = function (s) {
        try {
            return JSON.parse(s);
        }
        catch (_) {
            return JSON.parse(jsoncrush_1.default.uncrush(s));
        }
    };
    BrowserContainer.prototype.offerUpload = function () {
        this.container.chat.showMessage("<a class=\"pill\" target=\"_blank\" href=\"https://scoreboard-tailuge.vercel.app/hiscore.html".concat(location.search, "\"> upload high score \uD83C\uDFC6</a"));
    };
    return BrowserContainer;
}());
exports.BrowserContainer = BrowserContainer;
//# sourceMappingURL=browsercontainer.js.map