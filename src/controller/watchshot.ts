import { Aim } from "./aim"
import { WatchAim } from "./watchaim"
import { ControllerBase } from "./controllerbase"
import { PlaceBall } from "./placeball"

export class WatchShot extends ControllerBase {
  constructor(container) {
    super(container)
    console.log('[WatchShot] Entered WatchShot state - watching opponent shot play out')
    this.container.table.outcome = []
    this.container.table.hit()
    // Force topView when watching shot - user can manually toggle via camera button (KeyO)
    this.container.view.camera.forceMode(this.container.view.camera.topView)
    
    // Hide cue while shot is playing
    this.container.table.cue.mesh.visible = false
  }

  override handleStationary(_) {
    // When balls stop after watching opponent's shot, just stay in WatchShot
    // The server will send turn-change event which will trigger handleStartAim or handleWatch
    console.log('[WatchShot] Balls stopped - waiting for server turn-change event')
    return this
  }

  override handleStartAim(_) {
    console.log('[WatchShot] handleStartAim - transitioning to Aim (my turn)')
    return new Aim(this.container)
  }

  override handlePlaceBall(_) {
    console.log('[WatchShot] handlePlaceBall - transitioning to PlaceBall (my turn)')
    return new PlaceBall(this.container)
  }

  override handleWatch(event) {
    if ("rerack" in event.json) {
      console.log('[WatchShot] Respot detected')
      this.container.table.applyAuthoritativeState(event.json, 0)
      return this
    }
    console.log('[WatchShot] handleWatch - continuing to watch (opponent continues)')
    return new WatchAim(this.container)
  }
}
