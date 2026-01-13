"use strict";
/**
 * Socket.IO Message Relay for Server-Authoritative Multiplayer
 *
 * Features:
 * - Socket.IO client with msgpack binary serialization
 * - RTT measurement for clock synchronization
 * - Automatic reconnection
 * - Event-based API matching existing MessageRelay interface
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketIOMessageRelay = void 0;
var socket_io_client_1 = require("socket.io-client");
var snapshotbuffer_1 = require("./snapshotbuffer");
var SocketIOMessageRelay = /** @class */ (function () {
    function SocketIOMessageRelay(serverUrl) {
        if (serverUrl === void 0) { serverUrl = "http://localhost:3001"; }
        this.serverUrl = serverUrl;
        this.socket = null;
        this.callbacks = {};
        this.connectionState = "disconnected";
        // Sequence number for shot commands
        this.shotSequence = 0;
        // RTT measurement
        this.pingStartTime = 0;
        this.lastRtt = 50; // Default RTT estimate
        // Pending shots awaiting confirmation
        this.pendingShots = new Map();
        this.snapshotBuffer = new snapshotbuffer_1.SnapshotBuffer();
    }
    /**
     * Set callbacks for server events
     */
    SocketIOMessageRelay.prototype.setCallbacks = function (callbacks) {
        this.callbacks = callbacks;
    };
    /**
     * Connect to the server and join a room
     */
    SocketIOMessageRelay.prototype.connect = function (joinData) {
        if (this.socket) {
            this.disconnect();
        }
        this.setConnectionState("connecting");
        // Create socket connection
        this.socket = (0, socket_io_client_1.io)(this.serverUrl, {
            parser: require("socket.io-msgpack-parser"),
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });
        this.setupEventHandlers(joinData);
    };
    SocketIOMessageRelay.prototype.setupEventHandlers = function (joinData) {
        var _this = this;
        if (!this.socket)
            return;
        this.socket.on("connect", function () {
            console.log("Socket.IO connected");
            _this.setConnectionState("connected");
            // Join the room
            _this.socket.emit("join", joinData);
            // Start RTT measurement
            _this.measureRtt();
        });
        this.socket.on("disconnect", function (reason) {
            console.log("Socket.IO disconnected:", reason);
            _this.setConnectionState("disconnected");
        });
        this.socket.on("connect_error", function (error) {
            console.error("Socket.IO connection error:", error);
            _this.setConnectionState("disconnected");
        });
        // Game events
        this.socket.on("welcome", function (data) {
            var _a, _b;
            console.log("Welcome received:", data.roomId);
            // Sync clock with server
            _this.snapshotBuffer.syncClock(data.serverTime, _this.lastRtt);
            // Add initial state to buffer
            _this.snapshotBuffer.addSnapshot(data.initialState);
            (_b = (_a = _this.callbacks).onWelcome) === null || _b === void 0 ? void 0 : _b.call(_a, data);
        });
        this.socket.on("snapshot", function (snapshot) {
            var _a, _b;
            _this.snapshotBuffer.addSnapshot(snapshot);
            (_b = (_a = _this.callbacks).onSnapshot) === null || _b === void 0 ? void 0 : _b.call(_a, snapshot);
        });
        this.socket.on("shotAccepted", function (data) {
            var _a, _b;
            // Remove from pending
            _this.pendingShots.delete(data.sequence);
            (_b = (_a = _this.callbacks).onShotAccepted) === null || _b === void 0 ? void 0 : _b.call(_a, data);
        });
        this.socket.on("shotRejected", function (data) {
            var _a, _b;
            console.warn("Shot rejected:", data.reason);
            _this.pendingShots.delete(data.sequence);
            (_b = (_a = _this.callbacks).onShotRejected) === null || _b === void 0 ? void 0 : _b.call(_a, data);
        });
        this.socket.on("stationary", function (data) {
            var _a, _b;
            // Final authoritative state
            _this.snapshotBuffer.addSnapshot(data.finalState);
            (_b = (_a = _this.callbacks).onStationary) === null || _b === void 0 ? void 0 : _b.call(_a, data);
        });
        this.socket.on("playerJoined", function (data) {
            var _a, _b;
            console.log("Player joined:", data.playerName);
            (_b = (_a = _this.callbacks).onPlayerJoined) === null || _b === void 0 ? void 0 : _b.call(_a, data);
        });
        this.socket.on("playerLeft", function (data) {
            var _a, _b;
            console.log("Player left:", data.clientId);
            (_b = (_a = _this.callbacks).onPlayerLeft) === null || _b === void 0 ? void 0 : _b.call(_a, data);
        });
        this.socket.on("chat", function (data) {
            var _a, _b;
            (_b = (_a = _this.callbacks).onChat) === null || _b === void 0 ? void 0 : _b.call(_a, data);
        });
        this.socket.on("error", function (data) {
            var _a, _b;
            console.error("Server error:", data.message);
            (_b = (_a = _this.callbacks).onError) === null || _b === void 0 ? void 0 : _b.call(_a, data);
        });
        // RTT measurement response
        this.socket.on("pong", function () {
            _this.lastRtt = Date.now() - _this.pingStartTime;
            // Schedule next RTT measurement
            setTimeout(function () { return _this.measureRtt(); }, 5000);
        });
    };
    SocketIOMessageRelay.prototype.measureRtt = function () {
        if (!this.socket || !this.socket.connected)
            return;
        this.pingStartTime = Date.now();
        this.socket.emit("ping");
    };
    /**
     * Send a hit command to the server
     * Returns the sequence number for tracking
     */
    SocketIOMessageRelay.prototype.sendHit = function (aim) {
        if (!this.socket || !this.socket.connected) {
            console.warn("Cannot send hit: not connected");
            return -1;
        }
        var sequence = ++this.shotSequence;
        // Track pending shot
        this.pendingShots.set(sequence, { aim: aim, timestamp: Date.now() });
        this.socket.emit("hit", { aim: aim, sequence: sequence });
        return sequence;
    };
    /**
     * Send place ball command (ball in hand)
     */
    SocketIOMessageRelay.prototype.sendPlaceBall = function (pos) {
        if (!this.socket || !this.socket.connected) {
            console.warn("Cannot send placeBall: not connected");
            return -1;
        }
        var sequence = ++this.shotSequence;
        this.socket.emit("placeBall", { pos: pos, sequence: sequence });
        return sequence;
    };
    /**
     * Request current state (for reconnection)
     */
    SocketIOMessageRelay.prototype.requestState = function () {
        if (!this.socket || !this.socket.connected)
            return;
        this.socket.emit("requestState");
    };
    /**
     * Send chat message
     */
    SocketIOMessageRelay.prototype.sendChat = function (message) {
        if (!this.socket || !this.socket.connected)
            return;
        this.socket.emit("chat", { message: message });
    };
    /**
     * Disconnect from server
     */
    SocketIOMessageRelay.prototype.disconnect = function () {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.snapshotBuffer.reset();
        this.pendingShots.clear();
        this.setConnectionState("disconnected");
    };
    SocketIOMessageRelay.prototype.setConnectionState = function (state) {
        var _a, _b;
        this.connectionState = state;
        (_b = (_a = this.callbacks).onConnectionChange) === null || _b === void 0 ? void 0 : _b.call(_a, state);
    };
    /**
     * Get current connection state
     */
    SocketIOMessageRelay.prototype.getConnectionState = function () {
        return this.connectionState;
    };
    /**
     * Get last measured RTT
     */
    SocketIOMessageRelay.prototype.getRtt = function () {
        return this.lastRtt;
    };
    /**
     * Check if a shot is pending confirmation
     */
    SocketIOMessageRelay.prototype.hasPendingShot = function () {
        return this.pendingShots.size > 0;
    };
    /**
     * Get interpolated state for rendering
     */
    SocketIOMessageRelay.prototype.getInterpolatedState = function (deltaTime) {
        return this.snapshotBuffer.getInterpolatedState(deltaTime);
    };
    /**
     * Check if buffer is ready for smooth interpolation
     */
    SocketIOMessageRelay.prototype.isBufferReady = function () {
        return this.snapshotBuffer.isReady();
    };
    return SocketIOMessageRelay;
}());
exports.SocketIOMessageRelay = SocketIOMessageRelay;
//# sourceMappingURL=socketiorelay.js.map