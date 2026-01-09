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
import { SocketEventClient } from "../network/client/socketeventclient"

/**
 * Initial state of controller.
 *
 * Transitions into active player or watcher or replay mode.
 */
export class Init extends ControllerBase {
  override handleBegin(_: BeginEvent): Controller {
    if (Session.isSpectator()) {
      const session = Session.getInstance()
      // Spectators connect via the new event client
      const serverURL = (window as any).BACKEND_URL || 'http://localhost:3000'
      const socketClient = new SocketEventClient(serverURL)

      socketClient.connect(session.tableId, session.clientId, session.username, true)
        .catch((error) => {
          console.error("Failed to connect spectator:", error)
        })

      return new Spectate(
        this.container,
        socketClient,
        session.tableId
      )
    }

    console.log('[Init] handleBegin - transitioning to PlaceBall for breaking player')
    this.container.chat.showMessage("Your turn to break")
    return new PlaceBall(this.container)
  }

  override handleWatch(event: WatchEvent): Controller {
    console.log('[Init] handleWatch - transitioning to WatchAim for watching player')
    this.container.chat.showMessage("Opponent to break")
    this.container.rules.secondToPlay()
    if (event.json && event.json.balls) {
      this.container.table.updateFromSerialised(event.json)
    }
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
