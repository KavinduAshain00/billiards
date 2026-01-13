import { ControllerBase } from "./controllerbase"
import { Controller, Input } from "./controller"
import { Aim } from "./aim"
import { BreakEvent } from "../events/breakevent"
import { R } from "../model/physics/constants"
import { Vector3 } from "three"
import { CueMesh } from "../view/cuemesh"
import { StartAimEvent } from "../events/startaimevent"

/**
 * Place cue ball using input events.
 *
 * Needs to be configurable to break place ball and post foul place ball anywhere legal.
 */
export class PlaceBall extends ControllerBase {
  readonly placescale = 0.02 * R

  constructor(container) {
    super(container)
    this.container.table.cue.moveTo(this.container.table.cueball.pos)
    this.container.table.cue.aim.power = 0
    this.container.view.camera.forceMode(this.container.view.camera.topView)
    // Make sure placerMesh is visible for ball placement
    this.container.table.cue.placerMesh.visible = true
  }

  override onFirst() {
    const cueball = this.container.table.cueball
    if (this.container.rules.allowsPlaceBall()) {
      cueball.pos.copy(this.container.rules.placeBall())
    }
    cueball.setStationary()
    cueball.updateMesh(0)
    this.container.table.cue.placeBallMode()
    this.container.table.cue.showHelper(false)
    this.container.table.cue.moveTo(this.container.table.cueball.pos)
    this.container.table.cue.aimInputs.setButtonText("Place\nBall")
    if (!this.container.rules.allowsPlaceBall()) {
      this.container.inputQueue.push(new Input(1, "SpaceUp"))
    }
  }

  override handleInput(input: Input): Controller {
    // Block input if not our turn in multiplayer
    if (this.container.useServerAuthoritative && !this.container.isMyTurn) {
      return this
    }
    
    const ballPos = this.container.table.cueball.pos
    switch (input.key) {
      // Arrow keys for fine placement
      case "ArrowLeft":
        this.moveTo(0, input.t * this.placescale)
        break
      case "ArrowRight":
        this.moveTo(0, -input.t * this.placescale)
        break
      case "ArrowUp":
        this.moveTo(input.t * this.placescale, 0)
        break
      case "ArrowDown":
        this.moveTo(-input.t * this.placescale, 0)
        break
        
      // Mouse/touch drag for placement (new system)
      case "dragRotate":
        // Horizontal drag moves ball left/right (Y axis on table)
        // Reduced sensitivity for placement drags
        this.moveTo(0, -input.t * 0.01)
        break
      case "dragPower":
        // Vertical drag moves ball up/down (X axis on table)
        this.moveTo(input.t * 0.01, 0)
        break
        
      // Legacy mouse events (backward compatibility)
      case "movementXUp":
        this.moveTo(0, -input.t * this.placescale * 2)
        break
      case "movementYUp":
        this.moveTo(input.t * this.placescale * 2, 0)
        break
        
      // IJKL keys for placement
      case "KeyI":
        this.moveTo(input.t * this.placescale, 0)
        break
      case "KeyK":
        this.moveTo(-input.t * this.placescale, 0)
        break
      case "KeyJ":
        this.moveTo(0, input.t * this.placescale)
        break
      case "KeyL":
        this.moveTo(0, -input.t * this.placescale)
        break
        
      case "SpaceUp":
        return this.placed()
      default:
        this.commonKeyHandler(input)
    }

    this.container.table.cue.moveTo(ballPos)
    this.container.sendEvent(this.container.table.cue.aim)
    
    // Send ball position to server for opponent sync
    if (this.container.sendBallPosUpdate) {
      this.container.sendBallPosUpdate({ x: ballPos.x, y: ballPos.y, z: ballPos.z })
    }

    return this
  }

  moveTo(dx, dy) {
    const delta = new Vector3(dx, dy)
    const ballPos = this.container.table.cueball.pos.add(delta)
    ballPos.copy(this.container.rules.placeBall(ballPos))
    CueMesh.indicateValid(!this.container.table.overlapsAny(ballPos))
  }

  placed() {
    if (this.container.table.overlapsAny(this.container.table.cueball.pos)) {
      return this
    }
    this.container.table.cue.aimInputs.setButtonText("Hit")
    this.container.sound.playNotify()
    
    // In server-authoritative mode, send ball placement to server
    // The server will respond with ballPlaced event which triggers transition to Aim
    if (this.container.useServerAuthoritative) {
      // Send ball placement to server via socketRelay
      const pos = this.container.table.cueball.pos
      console.log("[PlaceBall] Sending ball placement to server:", pos)
      this.container.submitPlaceBall({ x: pos.x, y: pos.y, z: pos.z })
      // Stay in PlaceBall state - server's ballPlaced event will transition us to Aim
      return this
    } else {
      // Single player - send BreakEvent locally and transition to Aim
      this.container.sendEvent(
        new BreakEvent(this.container.table.shortSerialise())
      )
      return new Aim(this.container)
    }
  }

  // Server sends StartAimEvent after ballPlaced confirmation
  override handleStartAim(_event: StartAimEvent): Controller {
    console.log("[PlaceBall] handleStartAim - server confirmed ball placement, transitioning to Aim")
    return new Aim(this.container)
  }
}
