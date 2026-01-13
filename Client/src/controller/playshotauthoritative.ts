/**
 * PlayShotAuthoritative - Controller for server-authoritative shot playback
 * 
 * This controller is used when in multiplayer mode with server-authoritative physics.
 * It doesn't run local physics - instead it waits for server snapshots and displays
 * the interpolated state until the server reports balls are stationary.
 * 
 * CRITICAL: Does NOT run client-side rules - waits for server turnChange event!
 */

import { Controller, Input } from "./controller"
import { ControllerBase } from "./controllerbase"
import { Outcome } from "../model/outcome"
import { Aim } from "./aim"
import { PlaceBall } from "./placeball"
import { WatchAim } from "./watchaim"
import { End } from "./end"

export class PlayShotAuthoritative extends ControllerBase {
  constructor(container) {
    super(container)
    
    // Hide cue during shot playback
    this.container.table.cue.mesh.visible = false
    this.container.table.cue.showHelper(false)
    this.container.view.camera.suggestMode(this.container.view.camera.topView)
    
    // Record initial hit outcome for sounds
    this.container.table.outcome = [
      Outcome.hit(
        this.container.table.cueball,
        this.container.table.cue.aim.power
      ),
    ]
    
    console.log("[PlayShotAuthoritative] Waiting for server physics")
  }

  /**
   * Called when server reports balls are stationary
   * In server-authoritative mode, we do NOT run client rules!
   * Just wait here for the turnChange event from server.
   */
  override handleStationary(_) {
    console.log("[PlayShotAuthoritative] Server reported stationary - waiting for turnChange")
    
    // Update break recording for sounds/visuals only
    const table = this.container.table
    this.container.recorder.updateBreak(table.outcome)
    
    // Setup aim for next shot (visual only)
    table.cue.aimAtNext(table.cueball, this.container.rules.nextCandidateBall())
    
    // Stay in this state - turnChange event will trigger proper transition
    return this
  }

  /**
   * Handle server turn change event - transition to appropriate controller
   */
  override handleStartAim(_) {
    console.log("[PlayShotAuthoritative] handleStartAim - my turn to shoot")
    return new Aim(this.container)
  }

  override handlePlaceBall(_) {
    console.log("[PlayShotAuthoritative] handlePlaceBall - ball in hand")
    return new PlaceBall(this.container)
  }

  override handleWatch(_) {
    console.log("[PlayShotAuthoritative] handleWatch - opponent's turn")
    return new WatchAim(this.container)
  }

  override handleAbort(_) {
    console.log("[PlayShotAuthoritative] Game over")
    return new End(this.container)
  }

  /**
   * Handle input during shot - limited actions available
   */
  override handleInput(input: Input): Controller {
    // Only allow camera controls during shot playback
    this.commonKeyHandler(input)
    return this
  }
}
