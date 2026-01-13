"use strict";
/**
 * Snapshot Buffer for Server-Authoritative Interpolation
 *
 * Maintains a 100ms time buffer of server snapshots and provides
 * interpolated states for smooth 60 FPS rendering.
 *
 * Architecture:
 * - Receives 20 snapshots/sec from server
 * - Buffers with 100ms delay for jitter absorption
 * - Interpolates between snapshots for 60 FPS render
 * - Handles clock synchronization with server
 */
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotBuffer = void 0;
var three_1 = require("three");
var SnapshotBuffer = /** @class */ (function () {
    function SnapshotBuffer() {
        // Buffer of received snapshots, sorted by timestamp
        this.snapshots = [];
        // Configuration
        this.BUFFER_TIME_MS = 100; // 100ms interpolation delay
        this.MAX_BUFFER_SIZE = 60; // ~3 seconds at 20Hz
        this.SNAPSHOT_INTERVAL_MS = 50; // Expected 20Hz
        // Clock synchronization
        this.serverTimeOffset = 0; // local time - server time
        this.lastServerTime = 0;
        this.rttSamples = [];
        this.MAX_RTT_SAMPLES = 10;
        // Interpolation state
        this.renderTime = 0;
        this.lastRenderTime = 0;
        // Pending outcomes to be processed
        this.pendingOutcomes = [];
        // Debug stats
        this.stats = {
            snapshotsReceived: 0,
            snapshotsDropped: 0,
            interpolations: 0,
            extrapolations: 0,
        };
        this.reset();
    }
    /**
     * Reset buffer state
     */
    SnapshotBuffer.prototype.reset = function () {
        this.snapshots = [];
        this.pendingOutcomes = [];
        this.renderTime = 0;
        this.lastRenderTime = 0;
    };
    /**
     * Update clock synchronization with server
     */
    SnapshotBuffer.prototype.syncClock = function (serverTime, rtt) {
        // Estimate one-way latency
        var oneWayLatency = rtt / 2;
        // Server time when we received the message
        var estimatedServerNow = serverTime + oneWayLatency;
        // Calculate offset
        var localNow = Date.now();
        this.serverTimeOffset = localNow - estimatedServerNow;
        // Track RTT for jitter estimation
        this.rttSamples.push(rtt);
        if (this.rttSamples.length > this.MAX_RTT_SAMPLES) {
            this.rttSamples.shift();
        }
    };
    /**
     * Get estimated RTT jitter
     */
    SnapshotBuffer.prototype.getRttJitter = function () {
        if (this.rttSamples.length < 2)
            return 20; // Default jitter
        var avg = this.rttSamples.reduce(function (a, b) { return a + b; }, 0) / this.rttSamples.length;
        var variance = this.rttSamples.reduce(function (sum, rtt) { return sum + Math.pow(rtt - avg, 2); }, 0) / this.rttSamples.length;
        return Math.sqrt(variance);
    };
    /**
     * Add a snapshot from the server
     */
    SnapshotBuffer.prototype.addSnapshot = function (snapshot) {
        var _a;
        this.stats.snapshotsReceived++;
        // Collect outcomes
        if (snapshot.outcomes && snapshot.outcomes.length > 0) {
            (_a = this.pendingOutcomes).push.apply(_a, snapshot.outcomes);
        }
        // Convert server timestamp to local time
        var localTimestamp = snapshot.timestamp + this.serverTimeOffset;
        var localSnapshot = __assign(__assign({}, snapshot), { timestamp: localTimestamp });
        // Insert in sorted order
        var insertIndex = this.snapshots.length;
        for (var i = this.snapshots.length - 1; i >= 0; i--) {
            if (this.snapshots[i].timestamp <= localSnapshot.timestamp) {
                insertIndex = i + 1;
                break;
            }
            if (i === 0) {
                insertIndex = 0;
            }
        }
        this.snapshots.splice(insertIndex, 0, localSnapshot);
        // Trim old snapshots
        while (this.snapshots.length > this.MAX_BUFFER_SIZE) {
            this.snapshots.shift();
            this.stats.snapshotsDropped++;
        }
        // Initialize render time if this is the first snapshot
        if (this.snapshots.length === 1) {
            this.renderTime = localSnapshot.timestamp - this.BUFFER_TIME_MS;
            this.lastRenderTime = Date.now();
        }
    };
    /**
     * Get interpolated state for current render frame
     */
    SnapshotBuffer.prototype.getInterpolatedState = function (deltaTime) {
        if (this.snapshots.length === 0) {
            return null;
        }
        // Advance render time
        var now = Date.now();
        var realDelta = now - this.lastRenderTime;
        this.lastRenderTime = now;
        // Target render time is BUFFER_TIME_MS behind latest snapshot
        var latestTimestamp = this.snapshots[this.snapshots.length - 1].timestamp;
        var targetRenderTime = latestTimestamp - this.BUFFER_TIME_MS;
        // Smoothly adjust render time to target
        // This handles clock drift and jitter
        var timeDiff = targetRenderTime - this.renderTime;
        var catchupRate = 0.1; // Smooth adjustment
        this.renderTime += realDelta + (timeDiff * catchupRate);
        // Find the two snapshots to interpolate between
        var before = null;
        var after = null;
        for (var i = 0; i < this.snapshots.length; i++) {
            if (this.snapshots[i].timestamp > this.renderTime) {
                after = this.snapshots[i];
                before = i > 0 ? this.snapshots[i - 1] : null;
                break;
            }
        }
        // Handle edge cases
        if (!after) {
            // Render time is ahead of all snapshots - extrapolate from last
            after = this.snapshots[this.snapshots.length - 1];
            before = this.snapshots.length > 1 ? this.snapshots[this.snapshots.length - 2] : null;
            this.stats.extrapolations++;
        }
        if (!before) {
            // Only one snapshot or before first - use first snapshot
            before = after;
        }
        this.stats.interpolations++;
        // Calculate interpolation factor
        var range = after.timestamp - before.timestamp;
        var t = range > 0 ? (this.renderTime - before.timestamp) / range : 0;
        var clampedT = Math.max(0, Math.min(1, t));
        // Interpolate ball states
        var balls = this.interpolateBalls(before.balls, after.balls, clampedT);
        // Calculate buffer health
        var idealBufferSize = Math.ceil(this.BUFFER_TIME_MS / this.SNAPSHOT_INTERVAL_MS);
        var bufferHealth = Math.min(1, this.snapshots.length / idealBufferSize);
        // Collect and clear pending outcomes
        var outcomes = __spreadArray([], this.pendingOutcomes, true);
        this.pendingOutcomes = [];
        return {
            balls: balls,
            isStationary: after.isStationary,
            outcomes: outcomes,
            renderTime: this.renderTime,
            bufferHealth: bufferHealth,
        };
    };
    /**
     * Interpolate between two ball snapshots
     */
    SnapshotBuffer.prototype.interpolateBalls = function (before, after, t) {
        var result = [];
        var _loop_1 = function (afterBall) {
            var beforeBall = before.find(function (b) { return b.id === afterBall.id; });
            if (beforeBall) {
                // Interpolate position
                var pos = new three_1.Vector3(this_1.lerp(beforeBall.pos.x, afterBall.pos.x, t), this_1.lerp(beforeBall.pos.y, afterBall.pos.y, t), this_1.lerp(beforeBall.pos.z, afterBall.pos.z, t));
                // Interpolate velocity (for prediction)
                var vel = new three_1.Vector3(this_1.lerp(beforeBall.vel.x, afterBall.vel.x, t), this_1.lerp(beforeBall.vel.y, afterBall.vel.y, t), this_1.lerp(beforeBall.vel.z, afterBall.vel.z, t));
                // Use latest rvel (angular velocity interpolation is complex)
                var rvel = new three_1.Vector3(afterBall.rvel.x, afterBall.rvel.y, afterBall.rvel.z);
                result.push({
                    id: afterBall.id,
                    pos: pos,
                    vel: vel,
                    rvel: rvel,
                    state: afterBall.state,
                });
            }
            else {
                // Ball not in before snapshot, use after values directly
                result.push({
                    id: afterBall.id,
                    pos: new three_1.Vector3(afterBall.pos.x, afterBall.pos.y, afterBall.pos.z),
                    vel: new three_1.Vector3(afterBall.vel.x, afterBall.vel.y, afterBall.vel.z),
                    rvel: new three_1.Vector3(afterBall.rvel.x, afterBall.rvel.y, afterBall.rvel.z),
                    state: afterBall.state,
                });
            }
        };
        var this_1 = this;
        for (var _i = 0, after_1 = after; _i < after_1.length; _i++) {
            var afterBall = after_1[_i];
            _loop_1(afterBall);
        }
        return result;
    };
    SnapshotBuffer.prototype.lerp = function (a, b, t) {
        return a + (b - a) * t;
    };
    /**
     * Get the latest snapshot (for immediate feedback before interpolation catches up)
     */
    SnapshotBuffer.prototype.getLatestSnapshot = function () {
        return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
    };
    /**
     * Get buffer statistics
     */
    SnapshotBuffer.prototype.getStats = function () {
        return __assign(__assign({}, this.stats), { bufferSize: this.snapshots.length, renderDelay: this.snapshots.length > 0
                ? this.snapshots[this.snapshots.length - 1].timestamp - this.renderTime
                : 0, rttJitter: this.getRttJitter() });
    };
    /**
     * Check if buffer has enough data for smooth interpolation
     */
    SnapshotBuffer.prototype.isReady = function () {
        return this.snapshots.length >= 2;
    };
    return SnapshotBuffer;
}());
exports.SnapshotBuffer = SnapshotBuffer;
//# sourceMappingURL=snapshotbuffer.js.map