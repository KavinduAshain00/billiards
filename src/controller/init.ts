import { BeginEvent } from "../events/beginevent"
import { WatchEvent } from "../events/watchevent"
import { Controller } from "./controller"
import { WatchAim } from "./watchaim"
import { ControllerBase } from "./controllerbase"
import { BreakEvent } from "../events/breakevent"
import { PlaceBall } from "./placeball"
import { Replay } from "./replay"
import { Session } from "../network/client/session"
import { Spectate } from "./spectate"
import { SocketIOMessageRelay } from "../network/client/socketiomessagerelay"

/**
 * Initial state of controller.
 *
 * Transitions into active player or watcher or replay mode.
 */
export class Init extends ControllerBase {
  override handleBegin(_: BeginEvent): Controller {
    if (Session.isSpectator()) {
      const session = Session.getInstance()
      // Reuse existing relay if available to avoid creating multiple sockets
      const serverURL = (window as any).BACKEND_URL || 'http://localhost:3000'
      let relay: SocketIOMessageRelay

      // @ts-ignore - container may hold messageRelay
      if (this.container.messageRelay && typeof this.container.messageRelay.connect === 'function') {
        // reuse
        // @ts-ignore
        relay = this.container.messageRelay as SocketIOMessageRelay
      } else {
        relay = new SocketIOMessageRelay(serverURL)
        // @ts-ignore set on container for reuse
        this.container.messageRelay = relay
      }

      // Only call connect if not already connected or connecting
      relay.connect(session.tableId, session.clientId, session.username, true)
        .catch((error) => {
          console.error("Failed to connect spectator:", error)
        })
      return new Spectate(
        this.container,
        relay,
        session.tableId
      )
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

  override handleBreak(event: BreakEvent): Controller {
    if (event.init) {
      this.container.table.updateFromShortSerialised(event.init)
      this.container.chat.showMessage("Replay")
      return new Replay(this.container, event.init, event.shots)
    }
    return new PlaceBall(this.container)
  }
}
