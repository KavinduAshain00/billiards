import { ControllerBase } from "./controllerbase"
import { AimEvent, Controller, HitEvent, Input } from "./controller"
import { SocketEventClient, CueUpdateData, ShotValidatedData } from "../network/client/socketeventclient"
import { GameEvent } from "../events/gameevent"

export class Spectate extends ControllerBase {
  socketClient: SocketEventClient
  tableId: string
  messages: GameEvent[] = []

  constructor(container, socketClient: SocketEventClient, tableId: string) {
    super(container)
    this.socketClient = socketClient
    this.tableId = tableId
    
    // Set up event handlers for spectator
    this.setupEventHandlers()
    console.log("Spectate mode initialized")
  }

  private setupEventHandlers() {
    // Handle cue updates (watching players aim)
    this.socketClient.setOnCueUpdate((data: CueUpdateData) => {
      const aimEvent = new AimEvent()
      aimEvent.angle = data.angle
      aimEvent.power = data.power
      aimEvent.offset.set(data.offset.x, data.offset.y, data.offset.z)
      aimEvent.pos.set(data.pos.x, data.pos.y, data.pos.z)
      aimEvent.clientId = data.playerId
      
      this.container.eventQueue.push(aimEvent)
    })

    // Handle validated shots
    this.socketClient.setOnShotValidated((data: ShotValidatedData) => {
      const hitEvent = new HitEvent(data.tableState)
      hitEvent.clientId = data.playerId
      this.container.eventQueue.push(hitEvent)
    })

    // Handle game over
    this.socketClient.setOnGameOver((data) => {
      this.container.chat.showMessage(`Game Over! Player ${data.winner} wins! (${data.reason})`)
    })
  }

  override handleAim(event: AimEvent) {
    this.container.table.cue.aim = event
    if (this.container.table.cueball) {
      this.container.table.cueball.pos.copy(event.pos)
    }
    return this
  }

  override handleHit(event: HitEvent) {
    console.log("Spectate Hit")
    this.container.table.applyAuthoritativeState(event.tablejson)
    this.container.table.outcome = []
    this.container.table.hit()
    return this
  }

  override handleInput(input: Input): Controller {
    this.commonKeyHandler(input)
    return this
  }
}
