import { AimEvent } from "../events/aimevent"
import { HitEvent } from "../events/hitevent"
import { WatchShot } from "./watchshot"
import { ControllerBase } from "./controllerbase"
import { Aim } from "./aim"
import { PlaceBall } from "./placeball"

export class WatchAim extends ControllerBase {
  constructor(container) {
    super(container)
    console.log('[WatchAim] Entered WatchAim state - watching opponent aim')
    this.container.table.cueball = this.container.rules.otherPlayersCueBall()
    this.container.table.cue.moveTo(this.container.table.cueball.pos)
    // Force topView when watching - user can manually toggle via camera button (KeyO)
    this.container.view.camera.forceMode(this.container.view.camera.topView)
  }

  override handleAim(event: AimEvent) {
    console.log('[WatchAim] Received aim update from opponent')
    this.container.table.cue.aim = event
    this.container.table.cueball.pos.copy(event.pos)
    return this
  }

  override handleHit(event: HitEvent) {
    console.log('[WatchAim] Received hit event from opponent - transitioning to WatchShot')
    this.container.table.applyAuthoritativeState(event.tablejson)
    return new WatchShot(this.container)
  }

  override handleStartAim(_) {
    console.log('[WatchAim] handleStartAim - transitioning to Aim (my turn now)')
    return new Aim(this.container)
  }

  override handlePlaceBall(_) {
    console.log('[WatchAim] handlePlaceBall - transitioning to PlaceBall (my turn, ball in hand)')
    return new PlaceBall(this.container)
  }
}
