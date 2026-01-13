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

import { Vector3 } from "three"

export interface Vec3Data {
  x: number
  y: number
  z: number
}

export interface BallSnapshot {
  id: number
  pos: Vec3Data
  vel: Vec3Data
  rvel: Vec3Data
  state: "Stationary" | "Rolling" | "Sliding" | "Falling" | "InPocket"
}

export interface OutcomeSnapshot {
  type: "collision" | "cushion" | "pot"
  ballId: number
  ballId2?: number
  speed: number
}

export interface TableSnapshot {
  timestamp: number
  serverTick: number
  balls: BallSnapshot[]
  isStationary: boolean
  outcomes: OutcomeSnapshot[]
}

export interface InterpolatedBall {
  id: number
  pos: Vector3
  vel: Vector3
  rvel: Vector3
  state: "Stationary" | "Rolling" | "Sliding" | "Falling" | "InPocket"
}

export interface InterpolatedState {
  balls: InterpolatedBall[]
  isStationary: boolean
  outcomes: OutcomeSnapshot[]
  renderTime: number
  bufferHealth: number // 0-1, 1 = healthy buffer
}

export class SnapshotBuffer {
  // Buffer of received snapshots, sorted by timestamp
  private snapshots: TableSnapshot[] = []
  
  // Configuration
  private readonly BUFFER_TIME_MS = 50 // Small delay for smooth interpolation
  private readonly MAX_BUFFER_SIZE = 60 // ~3 seconds at 20Hz
  private readonly SNAPSHOT_INTERVAL_MS = 50 // Expected 20Hz
  
  // Clock synchronization
  private serverTimeOffset: number = 0 // local time - server time
  private lastServerTime: number = 0
  private rttSamples: number[] = []
  private readonly MAX_RTT_SAMPLES = 10
  
  // Interpolation state
  private renderTime: number = 0
  private lastRenderTime: number = 0
  
  // Pending outcomes to be processed
  private pendingOutcomes: OutcomeSnapshot[] = []
  
  // Last full ball state (for delta reconstruction)
  private lastFullBallState: BallSnapshot[] = []
  
  // Debug stats
  private stats = {
    snapshotsReceived: 0,
    snapshotsDropped: 0,
    interpolations: 0,
    extrapolations: 0,
    deltasApplied: 0,
  }

  constructor() {
    this.reset()
  }

  /**
   * Reset buffer state
   */
  reset(): void {
    this.snapshots = []
    this.pendingOutcomes = []
    this.renderTime = 0
    this.lastRenderTime = 0
    this.lastFullBallState = []
  }

  /**
   * Clear buffer (alias for reset)
   * Called when opponent starts a new shot
   */
  clear(): void {
    this.reset()
  }

  /**
   * Update clock synchronization with server
   */
  syncClock(serverTime: number, rtt: number): void {
    // Estimate one-way latency
    const oneWayLatency = rtt / 2
    
    // Server time when we received the message
    const estimatedServerNow = serverTime + oneWayLatency
    
    // Calculate offset
    const localNow = Date.now()
    this.serverTimeOffset = localNow - estimatedServerNow
    
    // Track RTT for jitter estimation
    this.rttSamples.push(rtt)
    if (this.rttSamples.length > this.MAX_RTT_SAMPLES) {
      this.rttSamples.shift()
    }
  }

  /**
   * Get estimated RTT jitter
   */
  private getRttJitter(): number {
    if (this.rttSamples.length < 2) return 20 // Default jitter
    
    const avg = this.rttSamples.reduce((a, b) => a + b, 0) / this.rttSamples.length
    const variance = this.rttSamples.reduce((sum, rtt) => sum + Math.pow(rtt - avg, 2), 0) / this.rttSamples.length
    return Math.sqrt(variance)
  }

  /**
   * Reconstruct full snapshot from delta (partial ball list)
   * Delta snapshots only contain balls that changed
   */
  private reconstructFullSnapshot(deltaSnapshot: TableSnapshot): TableSnapshot {
    if (deltaSnapshot.balls.length === 16) {
      // Full snapshot, no reconstruction needed
      this.lastFullBallState = [...deltaSnapshot.balls]
      return deltaSnapshot
    }
    
    // Delta snapshot - merge with last full state
    if (this.lastFullBallState.length === 0) {
      // No previous state, use delta as-is
      this.lastFullBallState = [...deltaSnapshot.balls]
      return deltaSnapshot
    }
    
    this.stats.deltasApplied++
    
    // Merge: update changed balls, keep unchanged ones
    const mergedBalls = this.lastFullBallState.map(prevBall => {
      const deltaBall = deltaSnapshot.balls.find(b => b.id === prevBall.id)
      return deltaBall || prevBall
    })
    
    // Store merged state for next delta
    this.lastFullBallState = mergedBalls
    
    return {
      ...deltaSnapshot,
      balls: mergedBalls,
    }
  }

  /**
   * Add a snapshot from the server
   */
  addSnapshot(snapshot: TableSnapshot): void {
    this.stats.snapshotsReceived++
    
    // Collect outcomes
    if (snapshot.outcomes && snapshot.outcomes.length > 0) {
      this.pendingOutcomes.push(...snapshot.outcomes)
    }
    
    // Reconstruct full snapshot if delta
    const fullSnapshot = this.reconstructFullSnapshot(snapshot)
    
    // Convert server timestamp to local time
    const localTimestamp = fullSnapshot.timestamp + this.serverTimeOffset
    const localSnapshot = { ...fullSnapshot, timestamp: localTimestamp }
    
    // Insert in sorted order
    let insertIndex = this.snapshots.length
    for (let i = this.snapshots.length - 1; i >= 0; i--) {
      if (this.snapshots[i].timestamp <= localSnapshot.timestamp) {
        insertIndex = i + 1
        break
      }
      if (i === 0) {
        insertIndex = 0
      }
    }
    
    this.snapshots.splice(insertIndex, 0, localSnapshot)
    
    // Trim old snapshots
    while (this.snapshots.length > this.MAX_BUFFER_SIZE) {
      this.snapshots.shift()
      this.stats.snapshotsDropped++
    }
    
    // Initialize render time if this is the first snapshot
    if (this.snapshots.length === 1) {
      this.renderTime = localSnapshot.timestamp - this.BUFFER_TIME_MS
      this.lastRenderTime = Date.now()
    }
  }

  /**
   * Get interpolated state for current render frame
   */
  getInterpolatedState(deltaTime: number): InterpolatedState | null {
    if (this.snapshots.length === 0) {
      return null
    }
    
    // Advance render time
    const now = Date.now()
    const realDelta = now - this.lastRenderTime
    this.lastRenderTime = now
    
    // Target render time is BUFFER_TIME_MS behind latest snapshot
    const latestTimestamp = this.snapshots[this.snapshots.length - 1].timestamp
    const targetRenderTime = latestTimestamp - this.BUFFER_TIME_MS
    
    // Smoothly adjust render time to target
    // This handles clock drift and jitter
    const timeDiff = targetRenderTime - this.renderTime
    const catchupRate = 0.1 // Smooth adjustment
    
    this.renderTime += realDelta + (timeDiff * catchupRate)
    
    // Find the two snapshots to interpolate between
    let before: TableSnapshot | null = null
    let after: TableSnapshot | null = null
    
    for (let i = 0; i < this.snapshots.length; i++) {
      if (this.snapshots[i].timestamp > this.renderTime) {
        after = this.snapshots[i]
        before = i > 0 ? this.snapshots[i - 1] : null
        break
      }
    }
    
    // Handle edge cases
    if (!after) {
      // Render time is ahead of all snapshots - extrapolate from last
      after = this.snapshots[this.snapshots.length - 1]
      before = this.snapshots.length > 1 ? this.snapshots[this.snapshots.length - 2] : null
      this.stats.extrapolations++
    }
    
    if (!before) {
      // Only one snapshot or before first - use first snapshot
      before = after
    }
    
    this.stats.interpolations++
    
    // Calculate interpolation factor
    const range = after.timestamp - before.timestamp
    const t = range > 0 ? (this.renderTime - before.timestamp) / range : 0
    const clampedT = Math.max(0, Math.min(1, t))
    // Use smoothstep for less jerky movement
    const smoothT = this.smoothstep(clampedT)
    
    // Interpolate ball states
    const balls = this.interpolateBalls(before.balls, after.balls, smoothT)
    
    // Calculate buffer health
    const idealBufferSize = Math.ceil(this.BUFFER_TIME_MS / this.SNAPSHOT_INTERVAL_MS)
    const bufferHealth = Math.min(1, this.snapshots.length / idealBufferSize)
    
    // Collect and clear pending outcomes
    const outcomes = [...this.pendingOutcomes]
    this.pendingOutcomes = []
    
    return {
      balls,
      isStationary: after.isStationary,
      outcomes,
      renderTime: this.renderTime,
      bufferHealth,
    }
  }

  /**
   * Interpolate between two ball snapshots
   */
  private interpolateBalls(
    before: BallSnapshot[],
    after: BallSnapshot[],
    t: number
  ): InterpolatedBall[] {
    const result: InterpolatedBall[] = []
    
    for (const afterBall of after) {
      const beforeBall = before.find((b) => b.id === afterBall.id)
      
      if (beforeBall) {
        // Interpolate position
        const pos = new Vector3(
          this.lerp(beforeBall.pos.x, afterBall.pos.x, t),
          this.lerp(beforeBall.pos.y, afterBall.pos.y, t),
          this.lerp(beforeBall.pos.z, afterBall.pos.z, t)
        )
        
        // Interpolate velocity (for prediction)
        const vel = new Vector3(
          this.lerp(beforeBall.vel.x, afterBall.vel.x, t),
          this.lerp(beforeBall.vel.y, afterBall.vel.y, t),
          this.lerp(beforeBall.vel.z, afterBall.vel.z, t)
        )
        
        // Use latest rvel (angular velocity interpolation is complex)
        const rvel = new Vector3(afterBall.rvel.x, afterBall.rvel.y, afterBall.rvel.z)
        
        result.push({
          id: afterBall.id,
          pos,
          vel,
          rvel,
          state: afterBall.state,
        })
      } else {
        // Ball not in before snapshot, use after values directly
        result.push({
          id: afterBall.id,
          pos: new Vector3(afterBall.pos.x, afterBall.pos.y, afterBall.pos.z),
          vel: new Vector3(afterBall.vel.x, afterBall.vel.y, afterBall.vel.z),
          rvel: new Vector3(afterBall.rvel.x, afterBall.rvel.y, afterBall.rvel.z),
          state: afterBall.state,
        })
      }
    }
    
    return result
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  /**
   * Smoothstep interpolation for less jerky movement
   */
  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t)
  }

  /**
   * Get the latest snapshot (for immediate feedback before interpolation catches up)
   */
  getLatestSnapshot(): TableSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null
  }

  /**
   * Get buffer statistics
   */
  getStats() {
    return {
      ...this.stats,
      bufferSize: this.snapshots.length,
      renderDelay: this.snapshots.length > 0 
        ? this.snapshots[this.snapshots.length - 1].timestamp - this.renderTime 
        : 0,
      rttJitter: this.getRttJitter(),
    }
  }

  /**
   * Check if buffer has enough data for smooth interpolation
   */
  isReady(): boolean {
    return this.snapshots.length >= 2
  }
}
