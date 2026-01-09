import { Container } from "./container"
import { Keyboard } from "../events/keyboard"
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
import { SocketEventClient, JoinedData, GameReadyData, GameStartData, CueUpdateData, ShotValidatedData, PlayerJoinedData, PlayerLeftData, GameOverData, TurnContinuesData } from "../network/client/socketeventclient"
import { BeginEvent } from "../events/beginevent"
import { AimEvent } from "../events/aimevent"
import { HitEvent } from "../events/hitevent"
import { WatchEvent } from "../events/watchevent"
import { PlaceBallEvent } from "../events/placeballevent"
import { StartAimEvent } from "../events/startaimevent"

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
  socketClient: SocketEventClient | null = null
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
  playerNumber: number = 0
  isMyTurn: boolean = false
  gameReady: boolean = false
  waitingForOpponent: boolean = true
  serverURL: string = ""

  constructor(canvas3d, params) {
    this.now = Date.now()
    console.log('[BrowserContainer] Initializing with params:', Object.fromEntries(params.entries()))
    
    // Server URL can come from: 1) URL param "server", 2) window.BACKEND_URL, 3) localhost fallback
    this.serverURL = params.get("server") || (window as any).BACKEND_URL || 'http://localhost:3000'
    console.log('[BrowserContainer] Server URL:', this.serverURL)
    
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
    this.container.reportShotComplete = (potted, fouled, continuesTurn) => {
      this.reportShotComplete(potted, fouled, continuesTurn)
    }
    this.container.table.cushionModel = this.cushionModel
    this.setReplayLink()

    if (this.spectator) {
      console.log('[BrowserContainer] Spectator mode - starting single player')
      this.container.eventQueue.push(new BeginEvent())
      this.container.animate(performance.now())
      return
    }

    console.log('[BrowserContainer] Multiplayer mode - connecting to server:', this.serverURL)

    if (!this.spectator) {
      // Fetch player's name from backend instead of relying on URL
      console.log('[BrowserContainer] Fetching player details...')
      fetch(`${this.serverURL}/api/getPlayerDetails?gameSessionUuid=${this.tableId}&uuid=${this.clientId}`)
        .then(async (r) => {
          if (!r.ok) throw new Error('Player details not found')
          const data = await r.json()
          this.playername = data.player?.name || ''
          console.log('[BrowserContainer] Player name:', this.playername)
        })
        .catch((err) => {
          console.warn('[BrowserContainer] Could not fetch player details, continuing without name', err)
          this.playername = ''
        })
        .finally(() => {
          this.container.isSinglePlayer = false
          this.initSocketConnection(this.serverURL)
        })
    } else {
      // Spectator: init session without fetching player details
      this.container.isSinglePlayer = false
      Session.init(this.clientId, this.playername, this.tableId, this.spectator)
      this.initSocketConnection(this.serverURL)
    }

    if (this.replay) {
      this.startReplay(this.replay)
    }

    // trigger animation loops
    this.container.animate(performance.now())
  }

  /**
   * Initialize Socket.IO connection with event-based system
   */
  private initSocketConnection(serverURL: string) {
    console.log('[BrowserContainer] initSocketConnection called with:', serverURL)
    
    // Initialize session now that we have (maybe) the name
    Session.init(this.clientId, this.playername, this.tableId, this.spectator)

    // Prevent socket stacking - clean up existing socket
    if (this.socketClient) {
      console.log('[BrowserContainer] Cleaning up existing socket client')
      this.socketClient.disconnect()
      this.socketClient = null
    }

    // Create socket client
    this.socketClient = new SocketEventClient(serverURL)
    console.log('[BrowserContainer] Socket client created')

    // Set up event handlers before connecting
    this.setupSocketEventHandlers()

    // Show waiting UI immediately
    this.container.lobbyIndicator.show(undefined, this.playername)

    // Connect to server
    console.log('[BrowserContainer] Initiating connection...')
    this.socketClient.connect(this.tableId, this.clientId, this.playername, this.spectator)
      .then((joinedData: JoinedData) => {
        console.log('[BrowserContainer] ✅ Connection successful:', joinedData)
        this.playerNumber = joinedData.playerNumber || 0
        
        // Update lobby indicator
        this.container.lobbyIndicator.show(this.playerNumber, this.playername)
        
        // Set HUD player names
        this.container.hud.setPlayers(this.playername || 'You', joinedData.opponentName || 'Opponent')

        if (joinedData.waitingForOpponent) {
          this.waitingForOpponent = true
          this.container.lobbyIndicator.updateStatus('Waiting for opponent to join...')
        } else if (joinedData.opponentConnected) {
          // Opponent already here
          this.waitingForOpponent = false
          this.container.lobbyIndicator.opponentFound(joinedData.opponentName || 'Opponent')
        }

        // Signal ready to server
        this.socketClient?.sendReady()
      })
      .catch((error) => {
        console.error('Failed to connect to server:', error)
        this.container.lobbyIndicator.showError('Failed to connect to game server. Please try again.')
      })
  }

  /**
   * Set up all socket event handlers
   */
  private setupSocketEventHandlers() {
    if (!this.socketClient) return

    // Player joined handler
    this.socketClient.setOnPlayerJoined((data: PlayerJoinedData) => {
      console.log('Player joined:', data)
      if (!data.spectator && data.playerNumber !== this.playerNumber) {
        this.waitingForOpponent = false
        this.container.lobbyIndicator.opponentFound(data.username || 'Opponent')
        this.container.chat.showMessage(`${data.username || 'Opponent'} joined the game!`)
        // Update HUD opponent name
        this.container.hud.setPlayers(this.playername || 'You', data.username || 'Opponent')
      }
    })

    // Player left handler
    this.socketClient.setOnPlayerLeft((data: PlayerLeftData) => {
      console.log('Player left:', data)
      if (data.playerNumber !== this.playerNumber) {
        this.container.chat.showMessage(`${data.username || 'Opponent'} left the game`)
        this.waitingForOpponent = true
        this.container.lobbyIndicator.show(this.playerNumber, this.playername)
        this.container.lobbyIndicator.updateStatus('Opponent disconnected. Waiting for reconnection...')
      }
    })

    // Game ready handler (both players connected, waiting for ready signals)
    this.socketClient.setOnGameReady((data: GameReadyData) => {
      console.log('Game ready!', data)
      this.gameReady = true
      this.waitingForOpponent = false
      
      const opponent = data.players.find(p => p.uuid !== this.clientId)
      this.container.lobbyIndicator.opponentFound(opponent?.name || 'Opponent')
    })

    // Game start handler (both players ready, game begins)
    this.socketClient.setOnGameStart((data: GameStartData) => {
      console.log('[BrowserContainer] Game starting!', data)
      this.isMyTurn = data.firstPlayer === this.playerNumber
      
      // Set HUD current turn and players
      this.container.hud.setCurrentTurn(this.isMyTurn)
      this.container.hud.setPlayers(this.playername || 'You', '')

      this.container.lobbyIndicator.gameStarting(data.firstPlayer, this.isMyTurn)
      
      // Trigger game begin based on who goes first
      if (this.isMyTurn) {
        // I'm the first player to break
        console.log('[BrowserContainer] I break first')
        this.container.chat.showMessage('Your turn to break!')
        this.container.eventQueue.push(new BeginEvent())
      } else {
        // I'm player 2, opponent breaks - enter watch mode
        console.log('[BrowserContainer] Opponent breaks first - entering watch mode')
        this.container.chat.showMessage('Opponent to break')
        this.container.rules.secondToPlay()
        // Push a WatchEvent with current table state to enter WatchAim controller
        this.container.eventQueue.push(new WatchEvent(this.container.table.serialise()))
      }
    })

    // Cue update handler (opponent aiming)
    this.socketClient.setOnCueUpdate((data: CueUpdateData) => {
      // Update cue position based on opponent's input
      if (data.playerId !== this.clientId) {
        const aimEvent = new AimEvent()
        aimEvent.angle = data.angle
        aimEvent.power = data.power
        aimEvent.offset.set(data.offset.x, data.offset.y, data.offset.z)
        aimEvent.pos.set(data.pos.x, data.pos.y, data.pos.z)
        aimEvent.clientId = data.playerId
        
        // Push to event queue so controller can handle it properly
        this.container.eventQueue.push(aimEvent)
        
        // Also directly update for immediate visual feedback
        this.container.table.cue.aim = aimEvent
        if (this.container.table.cueball) {
          this.container.table.cueball.pos.set(data.pos.x, data.pos.y, data.pos.z)
        }
      }
    })

    // Shot validated handler
    this.socketClient.setOnShotValidated((data: ShotValidatedData) => {
      console.log('[BrowserContainer] Shot validated by server:', data)
      
      if (data.playerId !== this.clientId) {
        // Opponent's shot - update our table state and push hit event
        console.log('[BrowserContainer] Opponent shot - applying to our table')
        const hitEvent = new HitEvent(data.tableState)
        hitEvent.clientId = data.playerId
        this.container.eventQueue.push(hitEvent)
      } else {
        // Our own shot was validated - server confirmed
        console.log('[BrowserContainer] Our shot was validated by server')
      }
    })

    // Shot rejected handler
    this.socketClient.setOnShotRejected((data) => {
      console.error('Shot rejected:', data.reason)
      this.container.chat.showMessage(`Shot rejected: ${data.reason}`)
      
      // Rollback to server state if provided
      if (data.correctState) {
        this.container.table.applyAuthoritativeState(data.correctState)
      }
    })

    // Turn change handler
    this.socketClient.setOnTurnChange((data) => {
      console.log('[BrowserContainer] Turn changed:', data)
      this.isMyTurn = data.playerId === this.clientId
      
      // Update HUD for current turn
      this.container.hud.setCurrentTurn(this.isMyTurn)

      if (this.isMyTurn) {
        if (data.reason === 'foul') {
          // Opponent fouled - you get ball in hand and must place the cue ball
          this.container.chat.showMessage('Opponent scratched — place the cue ball')
          // Transition to PlaceBall controller so player can place the cue ball
          this.container.eventQueue.push(new PlaceBallEvent(this.container.table.cueball.pos, true))
          // Reset active pots for this new turn
          this.container.hud.updateActivePots(0)
        } else {
          this.container.chat.showMessage('Your turn!')
          // Transition to my aiming state - push StartAimEvent to enter Aim controller
          this.container.eventQueue.push(new StartAimEvent())
          // Reset active pots if starting new turn
          this.container.hud.updateActivePots(0)
        }
      } else {
        if (data.reason === 'foul') {
          this.container.chat.showMessage("Opponent scratched — waiting for them to place the cue ball")
          // Hide the cue stick locally while the opponent is placing the ball
          try {
            this.container.table.cue.mesh.visible = false
            this.container.table.cue.helperMesh.visible = false
            this.container.table.cue.placerMesh.visible = false
          } catch (err) {
            console.warn('Unable to hide cue for opponent:', err)
          }
          this.container.eventQueue.push(new WatchEvent(this.container.table.serialise()))
          // reset opponent's active pots for their new turn
          this.container.hud.updateActivePots(0)
        } else {
          this.container.chat.showMessage("Opponent's turn")
          // Transition to watch mode - push a WatchEvent to enter WatchAim
          this.container.eventQueue.push(new WatchEvent(this.container.table.serialise()))
          this.container.hud.updateActivePots(0)
        }
      }
    })

    // Turn continues handler (player potted a ball and continues)
    this.socketClient.setOnTurnContinues((data: TurnContinuesData) => {
      console.log('[BrowserContainer] Turn continues:', data)
      this.isMyTurn = data.playerId === this.clientId
      
      // Update HUD current turn
      this.container.hud.setCurrentTurn(this.isMyTurn)

      if (this.isMyTurn) {
        // I potted a ball and continue - transition back to Aim
        this.container.chat.showMessage('Great shot! Continue...')
        this.container.eventQueue.push(new StartAimEvent())
        // Keep active pots as-is (incremented by server)
      } else {
        // Opponent potted a ball and continues - stay watching
        this.container.chat.showMessage('Opponent continues...')
        this.container.eventQueue.push(new WatchEvent(this.container.table.serialise()))
      }
    })

    // Server-driven group/score updates
    this.socketClient.setOnGroupUpdate((data) => {
      console.log('[BrowserContainer] Group update from server:', data)
      if (data && data.groups) {
        const myGroup = data.groups[this.playerNumber] || null
        const oppGroup = data.groups[this.playerNumber === 1 ? 2 : 1] || null
        this.container.hud.setMyGroup(myGroup)
        this.container.hud.setOpponentGroup(oppGroup)
      }
    })

    this.socketClient.setOnScoreUpdate((data) => {
      console.log('[BrowserContainer] Score update from server:', data)
      if (data && data.scores) {
        const myScore = data.scores[this.playerNumber] || 0
        const oppScore = data.scores[this.playerNumber === 1 ? 2 : 1] || 0
        this.container.hud.updateMyPots(myScore)
        this.container.hud.updateOpponentPots(oppScore)
      }
    })

    // Game over handler
    this.socketClient.setOnGameOver((data: GameOverData) => {
      console.log('Game over:', data)
      const isWinner = data.winner === this.playerNumber
      
      if (data.reason === 'opponent_disconnected' || data.reason === 'player_left') {
        this.container.chat.showMessage(isWinner ? 'You win! Opponent left the game.' : 'You left the game. Opponent wins.')
      } else {
        this.container.chat.showMessage(isWinner ? '🎉 You win!' : 'Game Over - Opponent wins')
      }
    })

    // Ball placement positions (when a player places a cue ball)
    this.socketClient.setOnBallPositions((data) => {
      console.log('[BrowserContainer] Ball positions updated from server:', data)
      if (data && data.balls) {
        try {
          // Apply placements instantly (no interpolation)
          this.container.table.applyAuthoritativeState({ balls: data.balls }, 0)
          // Restore cue visibility after placement is broadcast
          this.container.table.cue.aimMode()
        } catch (err) {
          console.warn('Failed to apply ball-positions:', err)
        }
      }
    })

    // Connection state handler
    this.socketClient.setOnConnectionStateChange((state) => {
      console.log('Connection state:', state)
      if (state === 'disconnected') {
        this.container.lobbyIndicator.showReconnecting()
      } else if (state === 'error') {
        this.container.lobbyIndicator.showError('Connection lost')
      }
    })

    // Error handler
    this.socketClient.setOnError((data) => {
      console.error('Socket error:', data)
      this.container.chat.showMessage(`Error: ${data.message}`)
    })
  }

  broadcast(event: GameEvent) {
    if (this.socketClient && this.socketClient.isConnected()) {
      event.clientId = Session.getInstance().clientId
      console.log(
        `${this.playername} broadcasting ${event.type} : ${event.clientId}`
      )
      
      // Handle different event types appropriately
      if (event instanceof AimEvent) {
        // Send cue update for real-time sync
        this.socketClient.sendCueUpdate(event)
      } else if (event instanceof HitEvent) {
        // Send shot request for server validation
        const tableState = (event as HitEvent).tablejson
        const cue = this.container.table.cue
        this.socketClient.requestShot(
          tableState,
          cue.aim.power,
          cue.aim.angle,
          { x: cue.aim.offset.x, y: cue.aim.offset.y, z: cue.aim.offset.z }
        )
      } else if (event instanceof PlaceBallEvent) {
        // Send ball placement
        const pos = (event as PlaceBallEvent).pos
        this.socketClient.sendPlaceBall({ x: pos.x, y: pos.y, z: pos.z })
      }
      // Other events are handled by the server's event system
    }
  }

  /**
   * Report shot completion to the server
   */
  reportShotComplete(potted: boolean, fouled: boolean, continuesTurn: boolean) {
    if (this.socketClient && this.socketClient.isConnected()) {
      console.log('[BrowserContainer] Reporting shot complete:', { potted, fouled, continuesTurn })
      this.socketClient.sendShotComplete(potted, fouled, continuesTurn)
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
