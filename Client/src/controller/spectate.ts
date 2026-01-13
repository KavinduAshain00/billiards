import { ControllerBase } from "./controllerbase"
import { AimEvent, Controller, HitEvent, Input } from "./controller"
import { GameEvent } from "../events/gameevent"

/**
 * Spectator mode controller
 * Watches the game without being able to interact
 */
export class Spectate extends ControllerBase {
  messages: GameEvent[] = []
  
  constructor(container) {
    super(container)
    console.log("Spectate mode")
  }

  override handleAim(event: AimEvent) {
    this.container.table.cue.aim = event
    this.container.table.cueball.pos.copy(event.pos)
    return this
  }

  override handleHit(event: HitEvent) {
    console.log("Spectate Hit")
    this.container.table.updateFromSerialised(event.tablejson)
    this.container.table.outcome = []
    this.container.table.hit()
    return this
  }

  override handleInput(input: Input): Controller {
    this.commonKeyHandler(input)
    return this
  }
}
