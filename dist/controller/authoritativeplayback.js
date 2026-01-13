"use strict";
/**
 * Authoritative Playback Controller
 *
 * This controller handles server-authoritative multiplayer mode:
 * - Receives snapshots from server at 20Hz
 * - Interpolates for 60 FPS rendering
 * - Provides immediate local feedback on shot
 * - Reconciles with authoritative server state
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthoritativePlayback = exports.PlaybackMode = void 0;
var PlaybackMode;
(function (PlaybackMode) {
    // Waiting for shot input
    PlaybackMode["Aiming"] = "Aiming";
    // Local prediction running, waiting for server confirmation
    PlaybackMode["LocalPrediction"] = "LocalPrediction";
    // Playing back authoritative server state
    PlaybackMode["AuthoritativePlayback"] = "AuthoritativePlayback";
    // Waiting for balls to stop (server will notify)
    PlaybackMode["WaitingStationary"] = "WaitingStationary";
})(PlaybackMode || (exports.PlaybackMode = PlaybackMode = {}));
var AuthoritativePlayback = /** @class */ (function () {
    function AuthoritativePlayback(container, relay) {
        this.mode = PlaybackMode.Aiming;
        // Local prediction state
        this.predictionStartTime = 0;
        this.MAX_PREDICTION_TIME_MS = 500; // Max time to predict before forcing server sync
        // Pending shot for reconciliation
        this.pendingShotSequence = -1;
        // Interpolation timing
        this.lastFrameTime = 0;
        // Callbacks
        this.onModeChange = null;
        this.onShotConfirmed = null;
        this.onBallsStationary = null;
        this.container = container;
        this.relay = relay;
        this.setupRelayCallbacks();
    }
    AuthoritativePlayback.prototype.setupRelayCallbacks = function () {
        var _this = this;
        this.relay.setCallbacks({
            onShotAccepted: function (data) {
                _this.handleShotAccepted(data);
            },
            onShotRejected: function (data) {
                _this.handleShotRejected(data);
            },
            onStationary: function (data) {
                _this.handleStationary(data);
            },
            onSnapshot: function () {
                // Snapshots are automatically added to buffer by relay
                // Just need to check if we should switch from prediction to playback
                if (_this.mode === PlaybackMode.LocalPrediction && _this.relay.isBufferReady()) {
                    _this.switchToAuthoritativePlayback();
                }
            },
        });
    };
    /**
     * Submit a shot to the server and start local prediction
     */
    AuthoritativePlayback.prototype.submitShot = function (aim) {
        if (this.mode !== PlaybackMode.Aiming) {
            console.warn("Cannot submit shot: not in aiming mode");
            return;
        }
        // Send to server
        var sequence = this.relay.sendHit({
            angle: aim.angle,
            power: aim.power,
            offset: { x: aim.offset.x, y: aim.offset.y, z: aim.offset.z },
            pos: { x: aim.pos.x, y: aim.pos.y, z: aim.pos.z },
        });
        if (sequence < 0) {
            console.error("Failed to send shot");
            return;
        }
        // Store pending shot
        this.pendingShotSequence = sequence;
        this.pendingAim = aim.copy();
        // Start local prediction immediately
        this.startLocalPrediction(aim);
    };
    /**
     * Start local physics prediction for immediate feedback
     */
    AuthoritativePlayback.prototype.startLocalPrediction = function (aim) {
        var _a;
        this.mode = PlaybackMode.LocalPrediction;
        this.predictionStartTime = performance.now();
        // Apply the hit locally
        this.container.table.cue.aim = aim.copy();
        this.container.table.hit();
        (_a = this.onModeChange) === null || _a === void 0 ? void 0 : _a.call(this, this.mode);
        console.log("Started local prediction");
    };
    /**
     * Handle server confirming our shot
     */
    AuthoritativePlayback.prototype.handleShotAccepted = function (data) {
        var _a;
        if (data.sequence !== this.pendingShotSequence) {
            console.warn("Received confirmation for unknown shot sequence");
            return;
        }
        console.log("Shot accepted by server");
        this.pendingShotSequence = -1;
        (_a = this.onShotConfirmed) === null || _a === void 0 ? void 0 : _a.call(this);
        // Switch to authoritative playback when buffer is ready
        if (this.relay.isBufferReady()) {
            this.switchToAuthoritativePlayback();
        }
    };
    /**
     * Handle server rejecting our shot
     */
    AuthoritativePlayback.prototype.handleShotRejected = function (data) {
        var _a;
        if (data.sequence !== this.pendingShotSequence) {
            return;
        }
        console.warn("Shot rejected:", data.reason);
        // Revert to last known good state
        this.revertToServerState();
        this.mode = PlaybackMode.Aiming;
        this.pendingShotSequence = -1;
        (_a = this.onModeChange) === null || _a === void 0 ? void 0 : _a.call(this, this.mode);
    };
    /**
     * Handle server notifying balls are stationary
     */
    AuthoritativePlayback.prototype.handleStationary = function (data) {
        var _a, _b;
        console.log("Balls stationary (server)");
        this.mode = PlaybackMode.Aiming;
        // Apply final authoritative state
        this.container.table.applyAuthoritativeState(data.finalState, 0);
        (_a = this.onModeChange) === null || _a === void 0 ? void 0 : _a.call(this, this.mode);
        (_b = this.onBallsStationary) === null || _b === void 0 ? void 0 : _b.call(this);
    };
    /**
     * Switch from local prediction to authoritative playback
     */
    AuthoritativePlayback.prototype.switchToAuthoritativePlayback = function () {
        var _a;
        if (this.mode === PlaybackMode.AuthoritativePlayback)
            return;
        console.log("Switching to authoritative playback");
        this.mode = PlaybackMode.AuthoritativePlayback;
        (_a = this.onModeChange) === null || _a === void 0 ? void 0 : _a.call(this, this.mode);
    };
    /**
     * Revert local state to last known server state
     */
    AuthoritativePlayback.prototype.revertToServerState = function () {
        var latest = this.relay.snapshotBuffer.getLatestSnapshot();
        if (latest) {
            this.container.table.applyAuthoritativeState(latest, 0);
        }
    };
    /**
     * Update called every frame (60 FPS)
     * Returns true if the table state was updated
     */
    AuthoritativePlayback.prototype.update = function (timestamp) {
        var deltaTime = this.lastFrameTime > 0
            ? (timestamp - this.lastFrameTime) / 1000
            : 1 / 60;
        this.lastFrameTime = timestamp;
        switch (this.mode) {
            case PlaybackMode.Aiming:
                // No physics update needed
                return false;
            case PlaybackMode.LocalPrediction:
                return this.updateLocalPrediction(deltaTime);
            case PlaybackMode.AuthoritativePlayback:
                return this.updateAuthoritativePlayback(deltaTime);
            case PlaybackMode.WaitingStationary:
                return this.updateAuthoritativePlayback(deltaTime);
            default:
                return false;
        }
    };
    /**
     * Update local prediction physics
     */
    AuthoritativePlayback.prototype.updateLocalPrediction = function (deltaTime) {
        // Check if prediction has run too long
        var predictionDuration = performance.now() - this.predictionStartTime;
        if (predictionDuration > this.MAX_PREDICTION_TIME_MS && this.relay.isBufferReady()) {
            this.switchToAuthoritativePlayback();
            return this.updateAuthoritativePlayback(deltaTime);
        }
        // Run local physics (handled by container.advance)
        // Just return true to indicate update happened
        return true;
    };
    /**
     * Update using interpolated server state
     */
    AuthoritativePlayback.prototype.updateAuthoritativePlayback = function (deltaTime) {
        var interpolated = this.relay.getInterpolatedState(deltaTime);
        if (!interpolated) {
            // Buffer not ready, fall back to local physics
            return true;
        }
        // Apply interpolated state to table
        this.applyInterpolatedState(interpolated);
        // Process outcomes for sound effects
        this.processOutcomes(interpolated.outcomes);
        // Check for stationary (backup in case we miss the event)
        if (interpolated.isStationary && this.mode !== PlaybackMode.Aiming) {
            // Let the server event handle the actual mode change
            // This is just for safety
        }
        return true;
    };
    /**
     * Apply interpolated state to table balls
     */
    AuthoritativePlayback.prototype.applyInterpolatedState = function (state) {
        for (var _i = 0, _a = state.balls; _i < _a.length; _i++) {
            var ballState = _a[_i];
            var ball = this.container.table.balls[ballState.id];
            if (ball) {
                // Direct position update for smooth interpolation
                ball.pos.copy(ballState.pos);
                ball.vel.copy(ballState.vel);
                ball.rvel.copy(ballState.rvel);
                ball.state = ballState.state;
            }
        }
    };
    /**
     * Process collision/cushion/pot outcomes for sound effects
     */
    AuthoritativePlayback.prototype.processOutcomes = function (outcomes) {
        for (var _i = 0, outcomes_1 = outcomes; _i < outcomes_1.length; _i++) {
            var outcome = outcomes_1[_i];
            // Convert to format expected by sound system
            var soundOutcome = {
                type: outcome.type,
                incidentSpeed: outcome.speed,
            };
            // Sound processing is handled by container
            this.container.table.outcome.push(soundOutcome);
        }
    };
    /**
     * Get current playback mode
     */
    AuthoritativePlayback.prototype.getMode = function () {
        return this.mode;
    };
    /**
     * Check if currently in authoritative playback mode
     */
    AuthoritativePlayback.prototype.isPlayingBack = function () {
        return this.mode === PlaybackMode.AuthoritativePlayback;
    };
    /**
     * Check if ready to accept new shots
     */
    AuthoritativePlayback.prototype.canShoot = function () {
        return this.mode === PlaybackMode.Aiming;
    };
    /**
     * Get debug stats
     */
    AuthoritativePlayback.prototype.getStats = function () {
        return {
            mode: this.mode,
            bufferStats: this.relay.snapshotBuffer.getStats(),
            rtt: this.relay.getRtt(),
            hasPendingShot: this.relay.hasPendingShot(),
        };
    };
    return AuthoritativePlayback;
}());
exports.AuthoritativePlayback = AuthoritativePlayback;
//# sourceMappingURL=authoritativeplayback.js.map