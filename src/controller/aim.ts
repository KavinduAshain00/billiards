import { BreakEvent } from "../events/breakevent"
import { Controller, HitEvent, Input } from "./controller"
import { ControllerBase } from "./controllerbase"
import { PlayShot } from "./playshot"
import { PlayShotAuthoritative } from "./playshotauthoritative"

/**
 * Aim using input events.
 *
 */
export class Aim extends ControllerBase {
  constructor(container) {
    super(container)
    const table = this.container.table
    table.cue.aimMode()
    table.cue.showHelper(true)
    // Make sure cue is visible when it's our turn to aim
    table.cue.mesh.visible = true
    table.cueball = this.container.rules.cueball
    table.cue.moveTo(table.cueball.pos)
    // In multiplayer, always use top view. In single player, suggest aimView (can be toggled)
    if (this.container.useServerAuthoritative) {
      this.container.view.camera.forceMode(this.container.view.camera.topView)
    } else {
      this.container.view.camera.forceMode(this.container.view.camera.aimView)
    }
    table.cue.aimInputs.showOverlap()
  }

  override handleInput(input: Input): Controller {
    // In server-authoritative mode, check if it's our turn before allowing aim adjustments
    if (this.container.useServerAuthoritative && !this.container.isMyTurn) {
      // Still allow camera movement and viewing, but not shooting
      switch (input.key) {
        case "Space":
        case "SpaceUp":
          this.container.chat.showMessage("Not your turn!")
          return this
        default:
          // Allow other inputs (camera, etc.)
          if (!this.commonKeyHandler(input)) {
            return this
          }
      }
      return this
    }
    
    switch (input.key) {
      case "Space":
        this.container.table.cue.adjustPower(input.t * this.scale * 0.7)
        break
      case "SpaceUp":
        return this.playShot()
      default:
        if (!this.commonKeyHandler(input)) {
          return this
        }
    }

    // Send aim position to server for opponent sync
    if (this.container.sendAimUpdate) {
      const aim = this.container.table.cue.aim
      this.container.sendAimUpdate(aim.angle, { x: aim.pos.x, y: aim.pos.y, z: aim.pos.z })
    }
    
    this.container.sendEvent(this.container.table.cue.aim)
    return this
  }

  override handleBreak(_breakEvent: BreakEvent): Controller {
    // BreakEvent no longer used for replay, just continue with normal aim
    return this
  }

  playShot() {
    // Check if we're in server-authoritative mode
    if (this.container.useServerAuthoritative) {
      // Submit shot via authoritative playback system
      const aim = this.container.table.cue.aim
      this.container.submitAuthoritativeShot(aim)
      
      // Record the shot
      const hitEvent = new HitEvent(this.container.table.serialise())
      this.container.recorder.record(hitEvent)
      
      // Switch to authoritative playshot controller
      return new PlayShotAuthoritative(this.container)
    }
    
    // Standard local physics mode
    const hitEvent = new HitEvent(this.container.table.serialise())
    this.container.sendEvent(hitEvent)
    this.container.recorder.record(hitEvent)
    return new PlayShot(this.container)
  }
}
