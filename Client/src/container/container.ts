import { Input } from "../events/input"
import { GameEvent } from "../events/gameevent"
import { StationaryEvent } from "../events/stationaryevent"
import { Controller } from "../controller/controller"
import { Table } from "../model/table"
import { View } from "../view/view"
import { Init } from "../controller/init"
import { AimInputs } from "../view/aiminputs"
import { Keyboard } from "../events/keyboard"
import { Sound } from "../view/sound"
import { controllerName } from "../controller/util"
import { Chat } from "../view/chat"
import { ChatEvent } from "../events/chatevent"
import { Throttle } from "../events/throttle"
import { Sliders } from "../view/sliders"
import { Recorder } from "../events/recorder"
import { Rules } from "../controller/rules/rules"
import { RuleFactory } from "../controller/rules/rulefactory"
import { Menu } from "../view/menu"
import { BallMesh } from "../view/ballmesh"
import { SnookerHud, EightBallHud, Hud } from "../view/hud"

/**
 * Model, View, Controller container.
 */
export class Container {
  table: Table
  view: View
  controller: Controller
  inputQueue: Input[] = []
  eventQueue: GameEvent[] = []
  keyboard: Keyboard
  sound: Sound
  chat: Chat
  sliders: Sliders
  recorder: Recorder
  id: string = ""
  isSinglePlayer: boolean = true
  rules: Rules
  menu: Menu
  frame: (timestamp: number) => void
  hud: any

  last = performance.now()
  readonly step = 0.001953125 * 1

  broadcast: (event: GameEvent) => void = () => {}
  reportShotComplete: (potted: boolean, fouled: boolean, continuesTurn: boolean) => void = () => {}
  log: (text: string) => void

  // Server-authoritative mode support
  useServerAuthoritative: boolean = false
  submitAuthoritativeShot: (aim: any) => void = () => {}
  submitPlaceBall: (pos: { x: number; y: number; z: number }) => void = () => {}
  
  // Turn-based multiplayer state
  isMyTurn: boolean = true
  ballInHand: boolean = false
  behindHeadString: boolean = false

  constructor(element, log, assets, ruletype?, keyboard?, id?) {
    this.log = log
    this.rules = RuleFactory.create(ruletype, this)
    // Pass ball models to BallMesh before creating table
    if (assets.ballModels && assets.ballModels.size > 0) {
      BallMesh.ballModels = assets.ballModels
    }
    this.table = this.rules.table()
    this.view = new View(element, this.table, assets)
    this.table.cue.aimInputs = new AimInputs(this)
    this.keyboard = keyboard
    this.sound = assets.sound
    this.chat = new Chat(this.sendChat)
    this.sliders = new Sliders()
    this.recorder = new Recorder(this)
    this.id = id
    this.menu = new Menu(this)

    // instantiate rule-specific HUD
    if (ruletype === "snooker") {
      this.hud = new SnookerHud()
    } else if (ruletype === "eightball") {
      this.hud = new EightBallHud()
    } else {
      this.hud = new Hud()
    }

    this.table.addToScene(this.view.scene)
    this.updateController(new Init(this))
  }

  sendChat = (msg) => {
    this.sendEvent(new ChatEvent(this.id, msg))
  }

  throttle = new Throttle(0, (event) => {
    this.broadcast(event)
  })

  sendEvent(event) {
    this.throttle.send(event)
  }

  advance(elapsed) {
    this.frame?.(elapsed)

    const steps = Math.floor(elapsed / this.step)
    const computedElapsed = steps * this.step
    const stateBefore = this.table.allStationary()
    for (let i = 0; i < steps; i++) {
      this.table.advance(this.step)
    }
    this.table.updateBallMesh(computedElapsed)
    this.view.update(computedElapsed, this.table.cue.aim)
    this.table.cue.update(computedElapsed)
    if (!stateBefore && this.table.allStationary()) {
      this.eventQueue.push(new StationaryEvent())
    }
    this.sound.processOutcomes(this.table.outcome)
  }

  processEvents() {
    if (this.keyboard) {
      const inputs = this.keyboard.getEvents()
      inputs.forEach((i) => this.inputQueue.push(i))
    }

    while (this.inputQueue.length > 0) {
      this.lastEventTime = this.last
      const input = this.inputQueue.shift()
      input && this.updateController(this.controller.handleInput(input))
    }

    // only process events when stationary
    if (this.table.allStationary()) {
      const event = this.eventQueue.shift()
      if (event) {
        console.log("[ProcessEvents] Processing event:", event.constructor.name, "Controller:", this.controller.constructor.name)
        this.lastEventTime = performance.now()
        this.updateController(event.applyToController(this.controller))
      }
    } else if (this.eventQueue.length > 0) {
      console.log("[ProcessEvents] Waiting for table to be stationary. Queue:", this.eventQueue.length, "events")
    }
  }

  lastEventTime = performance.now()

  animate(timestamp): void {
    this.advance((timestamp - this.last) / 1000)
    this.last = timestamp
    this.processEvents()
    const needsRender =
      timestamp < this.lastEventTime + 12000 ||
      !this.table.allStationary() ||
      this.view.sizeChanged()
    if (needsRender) {
      this.view.render()
    }
    requestAnimationFrame((t) => {
      this.animate(t)
    })
  }

  updateController(controller) {
    if (controller !== this.controller) {
      this.log("Transition to " + controllerName(controller))
      this.controller = controller
      this.controller.onFirst()
    }
  }
  
  /**
   * Set turn state for server-authoritative multiplayer
   * Also controls cue visibility - hide cue when not your turn
   */
  setTurnState(isMyTurn: boolean, ballInHand: boolean = false, behindHeadString: boolean = false): void {
    this.isMyTurn = isMyTurn
    this.ballInHand = ballInHand
    this.behindHeadString = behindHeadString
    
    // Update HUD to show current turn
    if (this.hud?.updateTurn) {
      this.hud.updateTurn(isMyTurn)
    }
    
    // Hide cue when not your turn in multiplayer
    if (this.useServerAuthoritative) {
      this.table.cue.mesh.visible = isMyTurn
      this.table.cue.helperMesh.visible = isMyTurn && this.table.cue.helperMesh.visible
      this.table.cue.placerMesh.visible = isMyTurn && ballInHand
    }
    
    console.log(`Turn state updated: myTurn=${isMyTurn}, ballInHand=${ballInHand}, behindHeadString=${behindHeadString}`)
  }
  
  /**
   * Send aim update to server for syncing to opponent
   */
  sendAimUpdate?: (angle: number, pos: { x: number; y: number; z: number }) => void
  
  /**
   * Send ball position update during placement
   */
  sendBallPosUpdate?: (pos: { x: number; y: number; z: number }) => void
}