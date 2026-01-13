/**
 * Authoritative Playback Controller
 * 
 * This controller handles server-authoritative multiplayer mode:
 * - Receives snapshots from server at 20Hz
 * - Interpolates for 60 FPS rendering
 * - Provides immediate VISUAL feedback on shot (no physics prediction)
 * - Smoothly blends visual position into server state when snapshots arrive
 * 
 * VISUAL LATENCY MASKING:
 * On shot input, we immediately:
 * 1. Play cue strike animation
 * 2. Play cue hit sound
 * 3. Apply visual-only forward motion to cue ball (decaying velocity, no collisions)
 * 
 * When server snapshots arrive, we smoothly blend the visual position into the
 * authoritative server position. The client NEVER predicts collisions or outcomes.
 */

import { Container } from "../container/container"
import { SocketIOMessageRelay, ShotAcceptedData } from "../network/client/socketiorelay"
import { InterpolatedState } from "../network/client/snapshotbuffer"
import { State } from "../model/ball"
import { AimEvent } from "../events/aimevent"
import { StationaryEvent } from "../events/stationaryevent"
import { Vector3 } from "three"
import { unitAtAngle } from "../utils/utils"
import { R } from "../model/physics/constants"
import { TableGeometry } from "../view/tablegeometry"

export enum PlaybackMode {
  // Waiting for shot input
  Aiming = "Aiming",
  // Visual-only cue ball motion while waiting for server
  VisualMotion = "VisualMotion",
  // Blending from visual position to server position
  BlendingToServer = "BlendingToServer",
  // Playing back authoritative server state
  AuthoritativePlayback = "AuthoritativePlayback",
  // Waiting for balls to stop (server will notify)
  WaitingStationary = "WaitingStationary",
}

export class AuthoritativePlayback {
  private container: Container
  private relay: SocketIOMessageRelay
  private mode: PlaybackMode = PlaybackMode.Aiming
  
  // Visual motion state (for latency masking)
  private visualVelocity: Vector3 = new Vector3()
  private visualPosition: Vector3 = new Vector3()
  private visualMotionStartTime: number = 0
  private readonly VISUAL_MOTION_DECAY = 3.0  // Velocity decay rate (units/sec²)
  private readonly VISUAL_MOTION_MAX_TIME_MS = 500 // Max time before forcing server blend
  
  // Blend state (visual → server)
  private blendStartPos: Vector3 = new Vector3()
  private blendTargetPos: Vector3 = new Vector3()
  private blendProgress: number = 0
  private readonly BLEND_DURATION = 0.15 // 150ms blend time
  
  // Pending shot sequence number
  private pendingShotSequence: number = -1
  
  // Interpolation timing
  private lastFrameTime: number = 0
  
  // Our client ID for distinguishing own vs opponent shots
  private clientId: string = ""
  
  // Track if we're the shooter (has visual masking) or watcher (relies on snapshots only)
  private isShooter: boolean = false
  
  // Flag to track if we've received first snapshot after shot
  private receivedFirstSnapshot: boolean = false
  
  // Visual collision detection state
  private prevBallPositions: Map<number, Vector3> = new Map()
  private collisionCooldowns: Map<string, number> = new Map() // "ball1-ball2" -> cooldown time
  private cushionCooldowns: Map<number, number> = new Map() // ballId -> cooldown time
  private readonly COLLISION_COOLDOWN_MS = 100 // Prevent duplicate sounds
  
  // Callbacks
  onModeChange: ((mode: PlaybackMode) => void) | null = null
  onShotConfirmed: (() => void) | null = null
  onBallsStationary: (() => void) | null = null
  onOpponentShot: ((aim: any) => void) | null = null // Called when opponent takes a shot

  constructor(container: Container, relay: SocketIOMessageRelay) {
    this.container = container
    this.relay = relay
    // Don't set callbacks here - browsercontainer will set them and call our handler methods
  }

  /**
   * Set our client ID for distinguishing own vs opponent shots
   */
  setClientId(clientId: string): void {
    this.clientId = clientId
    console.log("[AuthPlayback] Client ID set:", clientId)
  }

  /**
   * Handle shot accepted event from server
   * Called by browsercontainer's callback
   * 
   * CRITICAL: This is called for ALL shots in the room (own + opponent)
   */
  handleShotAccepted(data: ShotAcceptedData): void {
    const isOwnShot = data.shooterId === this.clientId || data.sequence === this.pendingShotSequence
    
    if (isOwnShot) {
      // Our shot was accepted - we're the shooter
      this.isShooter = true
      
      if (data.sequence !== this.pendingShotSequence) {
        console.warn("[AuthPlayback] Received confirmation for unknown shot sequence")
        return
      }
      
      console.log("[AuthPlayback] OUR shot accepted, waiting for first snapshot to blend")
      this.pendingShotSequence = -1
      this.onShotConfirmed?.()
      
      // Don't switch yet - stay in VisualMotion until first snapshot arrives
      // handleSnapshot will trigger the blend when data is ready
    } else {
      // OPPONENT shot was accepted - we're the watcher
      this.isShooter = false
      
      console.log("[AuthPlayback] OPPONENT shot accepted, switching to authoritative playback")
      
      // DON'T clear the buffer - keep receiving snapshots smoothly
      // The buffer will naturally update with new snapshot data
      // Clearing would cause a gap where no interpolation data is available
      
      // Notify callback (can be used to update UI state)
      this.onOpponentShot?.(data.aim)
      
      // Switch directly to authoritative playback mode to receive snapshots
      this.mode = PlaybackMode.AuthoritativePlayback
      this.onModeChange?.(this.mode)
    }
  }

  /**
   * Handle shot rejected event from server
   * Called by browsercontainer's callback
   */
  handleShotRejected(data: { sequence: number; reason: string }): void {
    if (data.sequence !== this.pendingShotSequence) {
      return
    }
    
    console.warn("[AuthPlayback] Shot rejected:", data.reason)
    
    // Revert to last known good state
    this.revertToServerState()
    this.mode = PlaybackMode.Aiming
    this.pendingShotSequence = -1
    
    this.onModeChange?.(this.mode)
  }

  /**
   * Handle stationary event from server
   * Called by browsercontainer's callback
   */
  handleStationary(data: { finalState: any }): void {
    console.log("[AuthPlayback] Balls stationary (server)")
    
    this.mode = PlaybackMode.Aiming
    this.isShooter = false // Reset shooter flag for next shot
    this.receivedFirstSnapshot = false // Reset for next shot
    
    // Apply final authoritative state
    this.container.table.applyAuthoritativeState(data.finalState, 0)
    
    // Push stationary event to queue so controller can process it
    this.container.eventQueue.push(new StationaryEvent())
    
    this.onModeChange?.(this.mode)
    this.onBallsStationary?.()
  }

  /**
   * Handle snapshot received event from server
   * Called by browsercontainer's callback
   */
  handleSnapshot(): void {
    // Snapshots are automatically added to buffer by relay
    
    // If we're in visual motion mode and this is the first snapshot, start blending
    if (this.mode === PlaybackMode.VisualMotion && this.relay.isBufferReady() && !this.receivedFirstSnapshot) {
      this.receivedFirstSnapshot = true
      this.startBlendToServer()
    }
  }

  /**
   * Submit a shot to the server and start visual latency masking
   */
  submitShot(aim: AimEvent): void {
    if (this.mode !== PlaybackMode.Aiming) {
      console.warn("[AuthPlayback] Cannot submit shot: not in aiming mode")
      return
    }
    
    // We're the shooter for this shot
    this.isShooter = true
    this.receivedFirstSnapshot = false
    
    // Send to server
    const sequence = this.relay.sendHit({
      angle: aim.angle,
      power: aim.power,
      offset: { x: aim.offset.x, y: aim.offset.y, z: aim.offset.z },
      pos: { x: aim.pos.x, y: aim.pos.y, z: aim.pos.z },
    })
    
    if (sequence < 0) {
      console.error("[AuthPlayback] Failed to send shot")
      this.isShooter = false // Reset on failure
      return
    }
    
    // Store pending shot sequence
    this.pendingShotSequence = sequence
    
    // Start visual latency masking immediately for responsive feel
    this.startVisualMotion(aim)
  }

  /**
   * Start visual-only motion for latency masking
   * This does NOT run physics - just applies a decaying visual velocity to the cue ball
   */
  private startVisualMotion(aim: AimEvent): void {
    this.mode = PlaybackMode.VisualMotion
    this.visualMotionStartTime = performance.now()
    
    // Clear collision cooldowns for new shot
    this.collisionCooldowns.clear()
    this.cushionCooldowns.clear()
    this.prevBallPositions.clear()
    
    // Store cue ball's current position as starting point
    const cueball = this.container.table.cueball
    this.visualPosition.copy(cueball.pos)
    
    // Calculate initial visual velocity in shot direction
    // Use a fraction of the actual power for visual effect
    const shotDirection = unitAtAngle(aim.angle)
    const visualSpeed = Math.min(aim.power * 0.8, 50) // Cap visual speed
    this.visualVelocity.copy(shotDirection).multiplyScalar(visualSpeed)
    
    // Play cue animation - set t to 0 to start the swing animation
    this.container.table.cue.t = 0
    this.container.table.cue.aim = aim.copy()
    
    // Play cue hit sound immediately
    this.container.sound.outcomeToSound({ type: "Hit", incidentSpeed: aim.power })
    
    this.onModeChange?.(this.mode)
    console.log("[AuthPlayback] Started visual motion masking")
  }

  /**
   * Start blending from visual position to server position
   */
  private startBlendToServer(): void {
    console.log("[AuthPlayback] Starting blend to server position")
    
    // Store current visual position as blend start
    this.blendStartPos.copy(this.container.table.cueball.pos)
    this.blendProgress = 0
    
    // Get the first server position as target
    const interpolated = this.relay.getInterpolatedState(0)
    if (interpolated) {
      const cueballState = interpolated.balls.find(b => b.id === this.container.table.cueball.id)
      if (cueballState) {
        this.blendTargetPos.copy(cueballState.pos)
      }
    }
    
    this.mode = PlaybackMode.BlendingToServer
    this.onModeChange?.(this.mode)
  }

  /**
   * Switch to authoritative playback mode
   */
  private switchToAuthoritativePlayback(): void {
    if (this.mode === PlaybackMode.AuthoritativePlayback) return
    
    console.log("[AuthPlayback] Switching to authoritative playback")
    this.mode = PlaybackMode.AuthoritativePlayback
    
    this.onModeChange?.(this.mode)
  }

  /**
   * Revert local state to last known server state
   */
  private revertToServerState(): void {
    const latest = this.relay.snapshotBuffer.getLatestSnapshot()
    if (latest) {
      this.container.table.applyAuthoritativeState(latest, 0)
    }
  }

  /**
   * Update called every frame (60 FPS)
   * Returns true if local physics should run
   */
  update(timestamp: number): boolean {
    const deltaTime = this.lastFrameTime > 0 
      ? (timestamp - this.lastFrameTime) / 1000 
      : 1/60
    this.lastFrameTime = timestamp
    
    switch (this.mode) {
      case PlaybackMode.Aiming:
        // In aiming mode, local physics should run (table settling, cue preview, etc.)
        return true
        
      case PlaybackMode.VisualMotion:
        return this.updateVisualMotion(deltaTime)
        
      case PlaybackMode.BlendingToServer:
        return this.updateBlendToServer(deltaTime)
        
      case PlaybackMode.AuthoritativePlayback:
        return this.updateAuthoritativePlayback(deltaTime)
        
      case PlaybackMode.WaitingStationary:
        return this.updateAuthoritativePlayback(deltaTime)
        
      default:
        return false
    }
  }

  /**
   * Update visual-only motion (latency masking)
   * Applies decaying velocity to cue ball without any physics/collisions
   */
  private updateVisualMotion(deltaTime: number): boolean {
    const cueball = this.container.table.cueball
    
    // Apply decaying velocity to visual position
    const decay = Math.exp(-this.VISUAL_MOTION_DECAY * deltaTime)
    this.visualVelocity.multiplyScalar(decay)
    
    // Update visual position
    this.visualPosition.addScaledVector(this.visualVelocity, deltaTime)
    
    // Apply visual position to cue ball (visual only, no physics)
    cueball.pos.copy(this.visualPosition)
    
    // Check if visual motion has run too long - force blend if we have data
    const motionDuration = performance.now() - this.visualMotionStartTime
    if (motionDuration > this.VISUAL_MOTION_MAX_TIME_MS && this.relay.isBufferReady()) {
      console.log("[AuthPlayback] Visual motion timeout, forcing blend")
      this.startBlendToServer()
      return false
    }
    
    // DON'T run local physics - we're just moving the visual position
    return false
  }

  /**
   * Update blend from visual position to server position
   */
  private updateBlendToServer(deltaTime: number): boolean {
    const cueball = this.container.table.cueball
    
    // Get latest server state for target position
    const interpolated = this.relay.getInterpolatedState(deltaTime)
    if (interpolated) {
      const cueballState = interpolated.balls.find(b => b.id === cueball.id)
      if (cueballState) {
        // Update target position to latest server position
        this.blendTargetPos.copy(cueballState.pos)
      }
      
      // Apply other balls' positions directly from server
      for (const ballState of interpolated.balls) {
        if (ballState.id !== cueball.id) {
          const ball = this.container.table.balls[ballState.id]
          if (ball) {
            ball.pos.copy(ballState.pos)
            ball.vel.copy(ballState.vel)
            ball.rvel.copy(ballState.rvel)
            ball.state = ballState.state as State
          }
        }
      }
      
      // Process outcomes for sound effects
      this.processOutcomes(interpolated.outcomes)
    }
    
    // Advance blend progress
    this.blendProgress += deltaTime / this.BLEND_DURATION
    
    if (this.blendProgress >= 1) {
      // Blend complete - switch to full authoritative playback
      console.log("[AuthPlayback] Blend complete, switching to authoritative")
      cueball.pos.copy(this.blendTargetPos)
      this.switchToAuthoritativePlayback()
      return false
    }
    
    // Smoothstep for smooth acceleration/deceleration
    const t = this.blendProgress
    const smoothT = t * t * (3 - 2 * t)
    
    // Interpolate cue ball position
    cueball.pos.lerpVectors(this.blendStartPos, this.blendTargetPos, smoothT)
    
    // DON'T run local physics during blend
    return false
  }

  /**
   * Update using interpolated server state
   */
  private updateAuthoritativePlayback(deltaTime: number): boolean {
    const interpolated = this.relay.getInterpolatedState(deltaTime)
    
    if (!interpolated) {
      // Buffer not ready
      if (this.isShooter) {
        // Shooter: if we're still waiting for data, stay in visual motion mode
        console.log("[AuthPlayback] Shooter: buffer not ready")
        return false
      } else {
        // Watcher must wait for snapshot data - can't run local physics
        // Table shows last known state until snapshots arrive
        return false // No update
      }
    }
    
    // Apply interpolated state to table
    this.applyInterpolatedState(interpolated)
    
    // Process outcomes for sound effects
    this.processOutcomes(interpolated.outcomes)
    
    // IMPORTANT: Don't run local physics when applying server state
    // The server is authoritative - running local physics would cause collisions
    // from lerped positions that don't match server reality
    return false
  }

  /**
   * Apply interpolated state to table balls with smooth local interpolation
   * Uses exponential moving average for silky-smooth ball movement
   */
  private applyInterpolatedState(state: InterpolatedState): void {
    const now = performance.now()
    
    for (const ballState of state.balls) {
      const ball = this.container.table.balls[ballState.id]
      if (ball) {
        const distSq = ball.pos.distanceToSquared(ballState.pos)
        
        // Calculate adaptive lerp factor based on distance and velocity
        // Faster balls need quicker response, slow balls can be smoother
        const velMag = ballState.vel.length()
        
        // Base lerp factor - higher = snappier, lower = smoother
        // Scale with velocity: fast balls lerp faster to avoid trailing
        const baseLerp = 0.15
        const velFactor = Math.min(1, velMag * 0.1) // Cap velocity influence
        const adaptiveLerp = baseLerp + velFactor * 0.35 // Range: 0.15 - 0.5
        
        if (distSq > 4) {
          // Very large jump (>2 units) - teleport immediately
          ball.pos.copy(ballState.pos)
          ball.vel.copy(ballState.vel)
        } else if (distSq > 0.0001) {
          // Normal case - smooth exponential interpolation
          ball.pos.lerp(ballState.pos, adaptiveLerp)
          ball.vel.lerp(ballState.vel, adaptiveLerp)
        }
        // If very close (< 0.01 units), leave as-is to avoid micro-jitter
        
        ball.rvel.copy(ballState.rvel)
        ball.state = ballState.state as State
      }
    }
    
    // Detect visual collisions for sounds
    this.detectVisualCollisions(now)
  }

  /**
   * Detect collisions visually and play sounds
   * Uses crossing detection: plays sound when balls transition from non-colliding to colliding
   * This ensures sounds sync with the visual collision moment during interpolation
   */
  private detectVisualCollisions(now: number): void {
    const balls = this.container.table.balls
    const COLLISION_DIST = R * 2 // Exact collision distance (2 ball radii)
    
    // Ball-to-ball collisions using crossing detection
    for (let i = 0; i < balls.length; i++) {
      const ball1 = balls[i]
      if (ball1.state === State.InPocket) continue
      
      const prevPos1 = this.prevBallPositions.get(ball1.id)
      
      for (let j = i + 1; j < balls.length; j++) {
        const ball2 = balls[j]
        if (ball2.state === State.InPocket) continue
        
        const collisionKey = `${Math.min(ball1.id, ball2.id)}-${Math.max(ball1.id, ball2.id)}`
        const cooldown = this.collisionCooldowns.get(collisionKey) || 0
        
        // Skip if on cooldown
        if (now <= cooldown) continue
        
        const prevPos2 = this.prevBallPositions.get(ball2.id)
        const currDist = ball1.pos.distanceTo(ball2.pos)
        
        // Calculate previous distance (if we have previous positions)
        let prevDist = Infinity
        if (prevPos1 && prevPos2) {
          prevDist = prevPos1.distanceTo(prevPos2)
        }
        
        // CROSSING DETECTION: Sound plays when balls transition from separated to colliding
        // Previous frame: balls were separated (dist > threshold)
        // Current frame: balls are colliding (dist <= threshold)
        const wasColliding = prevDist <= COLLISION_DIST
        const isColliding = currDist <= COLLISION_DIST
        
        if (!wasColliding && isColliding) {
          // Collision just happened this frame - play sound
          const relVel = ball1.vel.clone().sub(ball2.vel).length()
          if (relVel > 0.3) { // Only play sound if significant movement
            this.container.sound.outcomeToSound({
              type: "Collision",
              incidentSpeed: relVel * 30,
            })
            this.collisionCooldowns.set(collisionKey, now + this.COLLISION_COOLDOWN_MS)
          }
        }
      }
    }
    
    // Ball-to-cushion collisions using crossing detection
    for (let i = 0; i < balls.length; i++) {
      const ball1 = balls[i]
      if (ball1.state === State.InPocket) continue
      
      const cushionCooldown = this.cushionCooldowns.get(ball1.id) || 0
      if (now <= cushionCooldown) continue
      
      const prevPos = this.prevBallPositions.get(ball1.id)
      
      // Check cushion boundaries
      const cushionX = TableGeometry.tableX - R
      const cushionY = TableGeometry.tableY - R
      
      const currAtCushionX = Math.abs(ball1.pos.x) >= cushionX
      const currAtCushionY = Math.abs(ball1.pos.y) >= cushionY
      
      let prevAtCushionX = false
      let prevAtCushionY = false
      if (prevPos) {
        prevAtCushionX = Math.abs(prevPos.x) >= cushionX
        prevAtCushionY = Math.abs(prevPos.y) >= cushionY
      }
      
      // CROSSING DETECTION: Sound plays when ball crosses into cushion zone
      const crossedX = !prevAtCushionX && currAtCushionX
      const crossedY = !prevAtCushionY && currAtCushionY
      
      if (crossedX || crossedY) {
        const velMag = ball1.vel.length()
        if (velMag > 0.3) { // Only play if moving
          this.container.sound.outcomeToSound({
            type: "Cushion",
            incidentSpeed: velMag * 25,
          })
          this.cushionCooldowns.set(ball1.id, now + this.COLLISION_COOLDOWN_MS)
        }
      }
    }
    
    // Store current positions for next frame's crossing detection
    for (const ball of balls) {
      if (!this.prevBallPositions.has(ball.id)) {
        this.prevBallPositions.set(ball.id, new Vector3())
      }
      this.prevBallPositions.get(ball.id)!.copy(ball.pos)
    }
  }

  /**
   * Process collision/cushion/pot outcomes for sound effects (server-based)
   * Note: Visual collision sounds take priority, this is fallback
   */
  private processOutcomes(outcomes: { type: string; ballId: number; speed: number }[]): void {
    for (const outcome of outcomes) {
      // Only process pot sounds from server (visual detection handles collision/cushion)
      if (outcome.type === "pot") {
        const soundOutcome = {
          type: "Pot",
          incidentSpeed: outcome.speed,
        }
        this.container.sound.outcomeToSound(soundOutcome)
      }
    }
  }

  /**
   * Get current playback mode
   */
  getMode(): PlaybackMode {
    return this.mode
  }

  /**
   * Check if currently in authoritative playback mode
   */
  isPlayingBack(): boolean {
    return this.mode === PlaybackMode.AuthoritativePlayback
  }

  /**
   * Check if ready to accept new shots
   */
  canShoot(): boolean {
    return this.mode === PlaybackMode.Aiming
  }

  /**
   * Get debug stats
   */
  getStats() {
    return {
      mode: this.mode,
      bufferStats: this.relay.snapshotBuffer.getStats(),
      rtt: this.relay.getRtt(),
      hasPendingShot: this.relay.hasPendingShot(),
    }
  }
}
