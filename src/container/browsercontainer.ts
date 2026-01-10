import { Container } from "./container"
import { Keyboard } from "../events/keyboard"
import { EventUtil } from "../events/eventutil"
import { BreakEvent } from "../events/breakevent"
import { GameEvent } from "../events/gameevent"
import {
  bounceHan,
  bounceHanBlend,
  mathavenAdapter,
} from "../model/physics/physics"
import JSONCrush from "jsoncrush"
import { Assets } from "../view/assets"
import { Session } from "../network/client/session"
import { MessageRelay } from "../network/client/messagerelay"
import { SocketIOMessageRelay } from "../network/client/socketiomessagerelay"
import { BeginEvent } from "../events/beginevent"

/**
 * Integrate game container into HTML page
 */
export class BrowserContainer {
  container: Container
  canvas3d
  tableId
  clientId
  wss
  ruletype
  playername: string
  replay: string | null
  messageRelay: MessageRelay | null = null
  breakState = {
    init: null,
    shots: Array<string>(),
    now: 0,
    score: 0,
  }
  cushionModel
  spectator
  first
  assets: Assets
  now
  constructor(canvas3d, params) {
    this.now = Date.now()
    // Don't read player name or websocket server from the URL anymore.
    // Name will be fetched from the backend via /api/getPlayerDetails, and
    // websocket backend URL should be injected into the frontend build or
    // available via window.BACKEND_URL. Fallback to localhost:3000.
    this.playername = ""
    this.tableId = params.get("tableId") ?? params.get("gameSessionUuid") ?? "default"
    this.clientId = params.get("clientId") ?? params.get("uuid") ?? "default"
    this.replay = params.get("state")
    this.ruletype = params.get("ruletype") ?? "eightball"
    this.canvas3d = canvas3d
    this.cushionModel = this.cushion(params.get("cushionModel"))
    this.spectator = params.has("spectator")
    this.first = params.has("first")
    // Session.init will be called after we fetch the player's name from backend
  }

  cushion(model) {
    switch (model) {
      case "bounceHan":
        return bounceHan
      case "bounceHanBlend":
        return bounceHanBlend
      default:
        return mathavenAdapter
    }
  }

  start() {
    this.assets = new Assets(this.ruletype)
    this.assets.loadFromWeb(() => {
      this.onAssetsReady()
    })
  }

  onAssetsReady() {
    console.log(`${this.playername} assets ready`)
    this.container = new Container(
      this.canvas3d,
      console.log,
      this.assets,
      this.ruletype,
      new Keyboard(this.canvas3d),
      this.playername
    )
    this.container.broadcast = (e) => {
      this.broadcast(e)
    }
    this.container.table.cushionModel = this.cushionModel
    this.setReplayLink()

    if (this.spectator) {
      this.container.eventQueue.push(new BeginEvent())
      this.container.animate(performance.now())
      return
    }

    // Determine backend server URL (prefer window.BACKEND_URL if injected at build/runtime)
    const serverURL = (window as any).BACKEND_URL || 'http://localhost:3000'

    if (!this.spectator) {
      // Fetch player's name from backend instead of relying on URL
      fetch(`${serverURL}/api/getPlayerDetails?gameSessionUuid=${this.tableId}&uuid=${this.clientId}`)
        .then(async (r) => {
          if (!r.ok) throw new Error('Player details not found')
          const data = await r.json()
          this.playername = data.player?.name || ''
        })
        .catch((err) => {
          console.warn('Could not fetch player details, continuing without name', err)
          this.playername = ''
        })
        .finally(() => {
          this.container.isSinglePlayer = false
          // Reuse existing messageRelay if present to avoid duplicate sockets
          if (!this.messageRelay) {
            this.messageRelay = new SocketIOMessageRelay(serverURL)
          }

          // Initialize session now that we have (maybe) the name
          Session.init(this.clientId, this.playername, this.tableId, this.spectator)

          // Connect to the server and join the table
          ;(this.messageRelay as SocketIOMessageRelay)
            .connect(this.tableId, this.clientId, this.playername, this.spectator)
            .then(() => {
              console.log(`${this.playername} connected to Socket.IO server`)
              // Subscribe to game events
              this.messageRelay!.subscribe(this.tableId, (e) => {
                this.netEvent(e)
              })

              // First player starts the game
              if (this.first && !this.spectator) {
                this.broadcast(new BeginEvent())
              }
            })
            .catch((error) => {
              console.error('Failed to connect to server:', error)
              alert('Failed to connect to game server. Please try again.')
            })
        })
    } else {
      // Spectator: init session without fetching player details
      this.container.isSinglePlayer = false
      Session.init(this.clientId, this.playername, this.tableId, this.spectator)
      if (!this.messageRelay) {
        this.messageRelay = new SocketIOMessageRelay(serverURL)
      }

      ;(this.messageRelay as SocketIOMessageRelay)
        .connect(this.tableId, this.clientId, this.playername, this.spectator)
        .then(() => {
          console.log('Spectator connected to Socket.IO server')
          this.messageRelay!.subscribe(this.tableId, (e) => this.netEvent(e))
        })
        .catch((error) => {
          console.error('Failed to connect as spectator:', error)
        })
    }

    if (this.replay) {
      this.startReplay(this.replay)
    } else if (!this.messageRelay) {
      this.container.eventQueue.push(new BreakEvent())
    }

    // trigger animation loops
    this.container.animate(performance.now())
  }

  netEvent(e: string) {
    const event = EventUtil.fromSerialised(e)
    console.log(`${this.playername} received ${event.type} : ${event.clientId}`)
    if (event.clientId !== Session.getInstance().clientId) {
      this.container.eventQueue.push(event)
    } else {
      console.log("Ignoring own event")
    }
  }

  broadcast(event: GameEvent) {
    if (this.messageRelay) {
      event.clientId = Session.getInstance().clientId
      console.log(
        `${this.playername} broadcasting ${event.type} : ${event.clientId}`
      )
      this.messageRelay.publish(this.tableId, EventUtil.serialise(event))
    }
  }

  setReplayLink() {
    const url = window.location.href.split("?")[0]
    const prefix = `${url}?ruletype=${this.ruletype}&state=`
    this.container.recorder.replayUrl = prefix
  }

  startReplay(replay) {
    console.log(replay)
    this.breakState = this.parse(replay)
    console.log(this.breakState)
    const breakEvent = new BreakEvent(
      this.breakState.init,
      this.breakState.shots
    )
    this.container.eventQueue.push(breakEvent)
    this.container.menu.replayMode(window.location.href, breakEvent)
  }

  parse(s) {
    try {
      return JSON.parse(s)
    } catch (_) {
      return JSON.parse(JSONCrush.uncrush(s))
    }
  }

  offerUpload() {
    this.container.chat.showMessage(
      `<a class="pill" target="_blank" href="https://scoreboard-tailuge.vercel.app/hiscore.html${location.search}"> upload high score 🏆</a`
    )
  }
}
