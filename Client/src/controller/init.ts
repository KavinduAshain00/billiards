import { BeginEvent } from "../events/beginevent"
import { WatchEvent } from "../events/watchevent"
import { Controller } from "./controller"
import { WatchAim } from "./watchaim"
import { ControllerBase } from "./controllerbase"
import { Aim } from "./aim"
import { BreakEvent } from "../events/breakevent"
import { PlaceBall } from "./placeball"
import { Spectate } from "./spectate"
import { Session } from "../network/client/session"
import { PlaceBallEvent } from "../events/placeballevent"
import { StartAimEvent } from "../events/startaimevent"

/**
 * Initial state of controller.
 *
 * Transitions into active player or watcher.
 */
export class Init extends ControllerBase {
  override handleBegin(_: BeginEvent): Controller {
    // In server-authoritative mode, spectators are handled differently
    if (Session.isSpectator()) {
      this.container.chat.showMessage("Spectator mode")
      return new Spectate(this.container)
    }

    this.container.chat.showMessage("Start")
    this.container.sendEvent(new WatchEvent(this.container.table.serialise()))
    return new PlaceBall(this.container)
  }

  override handleWatch(event: WatchEvent): Controller {
    this.container.chat.showMessage("Opponent to break")
    this.container.rules.secondToPlay()
    this.container.table.updateFromSerialised(event.json)
    return new WatchAim(this.container)
  }

  override handleBreak(_event: BreakEvent): Controller {
    // For multiplayer, check whose turn it is
    if (this.container.useServerAuthoritative) {
      if (this.container.isMyTurn) {
        // Our turn - go to PlaceBall for break shot placement
        return new PlaceBall(this.container)
      } else {
        // Opponent's turn - watch them
        return new WatchAim(this.container)
      }
    }
    // Single player - always start with PlaceBall
    return new PlaceBall(this.container)
  }

  override handlePlaceBall(_event: PlaceBallEvent): Controller {
    // Server-authoritative: our turn with ball in hand
    console.log("[Init] handlePlaceBall - transitioning to PlaceBall")
    return new PlaceBall(this.container)
  }

  override handleStartAim(_event: StartAimEvent): Controller {
    // Server-authoritative: our turn, normal aim (no ball in hand)
    console.log("[Init] handleStartAim - transitioning to Aim")
    return new Aim(this.container)
  }
}
