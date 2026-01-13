import { Container } from "./container"
import { Keyboard } from "../events/keyboard"
import { BreakEvent } from "../events/breakevent"
import { GameEvent } from "../events/gameevent"
import {
  bounceHan,
  bounceHanBlend,
  mathavenAdapter,
} from "../model/physics/physics"
import { Assets } from "../view/assets"
import { Session } from "../network/client/session"
import { BeginEvent } from "../events/beginevent"
import { SocketIOMessageRelay, ConnectionState } from "../network/client/socketiorelay"
import { AuthoritativePlayback, PlaybackMode } from "../controller/authoritativeplayback"
import { WaitingPopup } from "../view/waitingpopup"
import { DisconnectionPopup } from "../view/disconnectionpopup"
import { GameResultPopup } from "../view/gameresultpopup"
import { StartAimEvent } from "../events/startaimevent"
import { PlaceBallEvent } from "../events/placeballevent"
import { WatchEvent } from "../events/watchevent"
import { AbortEvent } from "../events/abortevent"
import { BallMesh } from "../view/ballmesh"

/**
 * Integrate game container into HTML page
 * 
 * Uses Socket.IO server-authoritative multiplayer with snapshot interpolation
 */
export class BrowserContainer {
  container: Container
  canvas3d
  tableId
  clientId
  ruletype
  playername: string
  
  // Socket.IO server-authoritative mode
  socketRelay: SocketIOMessageRelay | null = null
  authoritativePlayback: AuthoritativePlayback | null = null
  useServerAuthoritative: boolean = false
  serverUrl: string = ""
  
  // Waiting popup for multiplayer
  waitingPopup: WaitingPopup | null = null
  disconnectionPopup: DisconnectionPopup | null = null
  gameResultPopup: GameResultPopup | null = null
  gameStarted: boolean = false
  gamePaused: boolean = false
  
  cushionModel
  spectator
  assets: Assets
  now
  
  constructor(canvas3d, params) {
    this.now = Date.now()
    this.playername = params.get("name") ?? ""
    this.ruletype = params.get("ruletype") ?? "eightball"
    this.canvas3d = canvas3d
    this.cushionModel = this.cushion(params.get("cushionModel"))
    this.spectator = params.has("spectator")
    
    // Server-authoritative mode configuration
    this.serverUrl = params.get("server") ?? ""
    const gameSessionUuid = params.get("gameSessionUuid")
    const uuid = params.get("uuid")
    
    // If gameSessionUuid is provided, enable multiplayer mode
    if (gameSessionUuid) {
      this.useServerAuthoritative = true
      // Use provided server URL or default to same origin port 3001
      if (!this.serverUrl) {
        const protocol = window.location.protocol
        const hostname = window.location.hostname
        this.serverUrl = `${protocol}//${hostname}:3001`
      }
      // Use gameSessionUuid as tableId and uuid as clientId
      this.tableId = gameSessionUuid
      this.clientId = uuid ?? params.get("clientId") ?? "default"
    } else {
      this.useServerAuthoritative = !!this.serverUrl
      this.tableId = params.get("tableId") ?? "default"
      this.clientId = params.get("clientId") ?? "default"
    }
    
    // Use name from URL or generate from clientId
    if (!this.playername && this.clientId) {
      this.playername = this.clientId
    }
    
    Session.init(this.clientId, this.playername, this.tableId, this.spectator)
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

    if (this.spectator) {
      this.container.eventQueue.push(new BeginEvent())
      this.container.animate(performance.now())
      return
    }

    // Server-authoritative multiplayer mode with Socket.IO
    if (this.useServerAuthoritative) {
      this.initServerAuthoritative()
      return
    }

    // Single player mode
    this.container.eventQueue.push(new BreakEvent())

    // trigger animation loops
    this.container.animate(performance.now())
  }

  /**
   * Initialize server-authoritative multiplayer mode
   * Uses Socket.IO with snapshot interpolation
   */
  initServerAuthoritative() {
    console.log(`Connecting to authoritative server: ${this.serverUrl}`)
    
    this.container.isSinglePlayer = false
    this.gameStarted = false
    
    // Set multiplayer flags for camera (top view only) and shadows (disabled)
    this.container.view.camera.isMultiplayer = true
    BallMesh.isMultiplayer = true
    
    // Set container flags for server-authoritative mode
    this.container.useServerAuthoritative = true
    this.container.submitAuthoritativeShot = (aim) => {
      this.submitAuthoritativeShot(aim)
    }
    this.container.submitPlaceBall = (pos) => {
      this.socketRelay?.sendPlaceBall(pos)
    }
    
    // Wire up aim/ball sync functions
    this.container.sendAimUpdate = (angle, pos) => {
      this.socketRelay?.sendAimUpdate(angle, pos)
    }
    this.container.sendBallPosUpdate = (pos) => {
      this.socketRelay?.sendBallPosUpdate(pos)
    }
    
    // Create waiting popup
    this.waitingPopup = new WaitingPopup()
    
    // Create disconnection popup (for when opponent disconnects)
    this.disconnectionPopup = new DisconnectionPopup()
    
    // Create Socket.IO relay
    this.socketRelay = new SocketIOMessageRelay(this.serverUrl)
    
    // Create authoritative playback controller
    this.authoritativePlayback = new AuthoritativePlayback(
      this.container,
      this.socketRelay
    )
    
    // Set client ID for distinguishing own vs opponent shots
    this.authoritativePlayback.setClientId(this.clientId)
    
    // Setup callbacks - IMPORTANT: include the authoritative playback handlers
    this.socketRelay.setCallbacks({
      onWelcome: (data) => {
        console.log(`Connected to room ${data.roomId}`, data)
        this.container.chat.showMessage(`Connected to server`)
        
        // Apply initial state
        this.container.table.applyAuthoritativeState(data.initialState, 0)
        
        // Set initial turn state if game is in progress
        if (data.isYourTurn !== undefined) {
          this.container.setTurnState(data.isYourTurn)
        }
        
        // Check room state - show waiting popup if waiting for opponent
        if (data.roomState === "waiting") {
          console.log("Room is waiting for opponent, showing popup")
          this.waitingPopup?.show()
          if (data.players) {
            this.waitingPopup?.updatePlayers(data.players)
          }
        } else if (data.roomState === "playing") {
          // Game already in playing state
          // This can happen in two cases:
          // 1. Reconnecting to an ongoing game (need BreakEvent)
          // 2. Fresh game just started (gameStart event will come, don't push BreakEvent here)
          // We can distinguish by checking if this is the first welcome or a reconnection
          // For now, just set turn state and wait for gameStart event for fresh games
          console.log("Room already playing")
          this.waitingPopup?.hide()
          
          // Set turn state
          if (data.isYourTurn !== undefined) {
            this.container.setTurnState(data.isYourTurn)
          }
          
          // NOTE: Don't push BreakEvent here - gameStart event will handle it
          // This avoids duplicate BreakEvents when both players join at the same time
        }
        
        // Start animation with server-authoritative mode
        this.startServerAuthoritativeAnimation()
      },
      onConnectionChange: (state: ConnectionState) => {
        if (state === "disconnected") {
          this.container.chat.showMessage("Disconnected from server")
        } else if (state === "connecting") {
          this.container.chat.showMessage("Connecting to server...")
        }
      },
      onPlayerJoined: (data) => {
        this.container.chat.showMessage(`${data.playerName} joined`)
      },
      onPlayerLeft: (_data) => {
        this.container.chat.showMessage(`Player left`)
      },
      onChat: (data) => {
        this.container.chat.showMessage(`${data.playerName}: ${data.message}`)
      },
      onError: (data) => {
        console.error("Server error:", data.message)
        this.container.chat.showMessage(`Error: ${data.message}`)
      },
      // Waiting system callbacks
      onWaitingUpdate: (data) => {
        this.waitingPopup?.updateTimer(data.secondsLeft)
      },
      onGameStart: (data) => {
        console.log("[GameStart] Game starting!", data)
        console.log("[GameStart] My clientId:", this.clientId)
        console.log("[GameStart] currentPlayerId:", data.currentPlayerId)
        console.log("[GameStart] Current controller:", this.container.controller.constructor.name)
        
        this.gameStarted = true
        this.waitingPopup?.showGameStarting()
        
        // Apply initial table state from server (includes ball numbers for colors)
        if (data.initialState && data.initialState.balls) {
          this.container.table.applyInitialServerState(data.initialState)
        }
        
        // Set initial turn state with ball-in-hand info
        const isMyTurn = data.currentPlayerId === this.clientId
        const ballInHand = data.ballInHand ?? data.isBreakShot ?? false
        const behindHeadString = data.behindHeadString ?? data.isBreakShot ?? false
        console.log("[GameStart] isMyTurn:", isMyTurn, "ballInHand:", ballInHand, "behindHeadString:", behindHeadString)
        this.container.setTurnState(isMyTurn, ballInHand, behindHeadString)
        
        this.container.chat.showMessage(
          isMyTurn 
            ? "Game started! Your turn - break shot!" 
            : "Game started! Opponent's turn to break."
        )
        
        // Push appropriate event based on turn and ball-in-hand state
        if (isMyTurn) {
          if (ballInHand) {
            // Our turn with ball in hand - go to PlaceBall
            console.log("[GameStart] Pushing PlaceBallEvent for my turn with ball in hand")
            this.container.eventQueue.push(new PlaceBallEvent(null, behindHeadString))
            console.log("[GameStart] EventQueue length:", this.container.eventQueue.length)
          } else {
            // Our turn, normal aim
            console.log("[GameStart] Pushing StartAimEvent for my turn")
            this.container.eventQueue.push(new StartAimEvent())
          }
        } else {
          // Opponent's turn - watch them
          console.log("[GameStart] Pushing WatchEvent - opponent's turn")
          this.container.eventQueue.push(new WatchEvent(this.container.table.serialise()))
        }
      },
      onWaitingTimeout: (data) => {
        console.log("Waiting timeout", data)
        this.waitingPopup?.showTimeout(data.message)
      },
      onPlayerCountUpdate: (data) => {
        this.waitingPopup?.updatePlayers(data.players)
        if (data.count >= 2) {
          this.waitingPopup?.setMessage("Opponent joined! Starting game...")
        }
      },
      // Turn-based game callbacks
      onTurnChange: (data) => {
        console.log(`Turn changed to ${data.currentPlayerId}`)
        const isMyTurn = data.currentPlayerId === this.clientId
        this.container.chat.showMessage(
          isMyTurn 
            ? `Your turn! ${data.reason}` 
            : `Opponent's turn. ${data.reason}`
        )
        
        // Update container turn state
        this.container.setTurnState(isMyTurn, data.ballInHand, data.behindHeadString)
        
        // Update player groups if provided
        if (data.playerGroup !== undefined) {
          console.log(`Your group: ${data.playerGroup}, Opponent: ${data.opponentGroup}`)
        }
        
        // CRITICAL: Push event to trigger controller state transition
        if (isMyTurn) {
          if (data.ballInHand) {
            // Ball in hand - transition to PlaceBall controller
            console.log("[TurnChange] Pushing PlaceBallEvent")
            this.container.eventQueue.push(new PlaceBallEvent(null, data.behindHeadString))
          } else {
            // Normal turn - transition to Aim controller
            console.log("[TurnChange] Pushing StartAimEvent")
            this.container.eventQueue.push(new StartAimEvent())
          }
        } else {
          // Opponent's turn - transition to WatchAim controller
          console.log("[TurnChange] Pushing WatchEvent")
          this.container.eventQueue.push(new WatchEvent(this.container.table.serialise()))
        }
      },
      onGameOver: (data) => {
        console.log(`Game over! Winner: ${data.winnerId}`)
        const didWin = data.winnerId === this.clientId
        
        // Show result popup
        if (!this.gameResultPopup) {
          this.gameResultPopup = new GameResultPopup()
        }
        
        if (didWin) {
          this.gameResultPopup.showWin(data.reason)
        } else {
          this.gameResultPopup.showLose(data.reason)
        }
        
        this.container.chat.showMessage(
          didWin 
            ? `You won! ${data.reason}` 
            : `You lost. ${data.reason}`
        )
        // Push abort event to transition to End controller
        this.container.eventQueue.push(new AbortEvent())
      },
      onFoul: (data) => {
        console.log(`Foul: ${data.reason}`)
        const wasMyFoul = data.playerId === this.clientId
        this.container.chat.showMessage(
          wasMyFoul 
            ? `Foul! ${data.reason}` 
            : `Opponent fouled. ${data.reason}`
        )
      },
      // CRITICAL: Authoritative playback callbacks for physics sync
      onSnapshot: (_snapshot) => {
        // Notify authoritative playback controller
        this.authoritativePlayback?.handleSnapshot()
      },
      onShotAccepted: (data) => {
        console.log("Shot accepted by server:", data)
        this.authoritativePlayback?.handleShotAccepted(data)
      },
      onShotRejected: (data) => {
        console.log("Shot rejected by server:", data)
        this.authoritativePlayback?.handleShotRejected(data)
      },
      onStationary: (data) => {
        console.log("Table stationary from server")
        this.authoritativePlayback?.handleStationary(data)
      },
      // Pause/reconnection callbacks
      onGamePaused: (data) => {
        console.log(`Game paused - ${data.disconnectedPlayerName} disconnected`)
        this.gamePaused = true
        
        // Create disconnection popup if not exists
        if (!this.disconnectionPopup) {
          this.disconnectionPopup = new DisconnectionPopup()
        }
        
        this.disconnectionPopup.show(
          data.disconnectedPlayerName, 
          data.secondsToReconnect
        )
        this.container.chat.showMessage(`${data.disconnectedPlayerName} disconnected - waiting for reconnection...`)
      },
      onGameResumed: (data) => {
        console.log(`Game resumed - ${data.reconnectedPlayerName} reconnected`, data)
        this.gamePaused = false
        
        if (this.disconnectionPopup) {
          this.disconnectionPopup.showReconnected(data.reconnectedPlayerName)
        }
        this.container.chat.showMessage(`${data.reconnectedPlayerName} reconnected! Game resuming...`)
        
        // Restore table state from snapshot
        if (data.snapshot) {
          this.container.table.applyAuthoritativeState(data.snapshot, 0)
        }
        
        // Restore turn state - CRITICAL for proper game flow
        if (data.currentPlayerId) {
          const isMyTurn = data.currentPlayerId === this.clientId
          this.container.setTurnState(isMyTurn, data.ballInHand, data.behindHeadString)
          
          // Push appropriate event to transition controller
          if (isMyTurn) {
            if (data.ballInHand) {
              console.log("[GameResumed] Restoring PlaceBall state for my turn")
              this.container.eventQueue.push(new PlaceBallEvent(null, data.behindHeadString))
            } else {
              console.log("[GameResumed] Restoring Aim state for my turn")
              this.container.eventQueue.push(new StartAimEvent())
            }
          } else {
            console.log("[GameResumed] Restoring Watch state - opponent's turn")
            this.container.eventQueue.push(new WatchEvent(this.container.table.serialise()))
          }
        }
      },
      onReconnectionUpdate: (data) => {
        this.disconnectionPopup?.updateTimer(data.secondsLeft)
      },
      onForfeit: (data) => {
        console.log(`Forfeit: ${data.forfeitPlayerId}`)
        this.gamePaused = false
        
        // Show win message
        const didWin = data.winnerId === this.clientId
        if (didWin && this.disconnectionPopup) {
          // We're the remaining player - show victory in popup
          this.disconnectionPopup.showForfeit("Opponent")
        }
        
        this.container.chat.showMessage(
          didWin 
            ? `You won! ${data.reason}` 
            : `You lost. ${data.reason}`
        )
        
        // Push abort event to transition to End controller
        this.container.eventQueue.push(new AbortEvent())
      },
      // Ball placement callback
      onBallPlaced: (data) => {
        console.log(`[BallPlaced] Ball placed by ${data.playerId} at`, data.pos)
        
        // Apply the snapshot to sync table state (snap immediately, no interpolation)
        if (data.snapshot) {
          this.container.table.applyAuthoritativeState(data.snapshot, 0)
        }
        
        // If it's our ball placement, transition to Aim
        if (data.playerId === this.clientId) {
          console.log("[BallPlaced] Our ball - transitioning to Aim")
          this.container.eventQueue.push(new StartAimEvent())
        }
      },
      // Aim sync from opponent (show their cue position)
      onAimUpdate: (data) => {
        // Only apply if from opponent
        if (data.playerId !== this.clientId) {
          this.container.table.cue.aim.angle = data.angle
          this.container.table.cue.aim.pos.set(data.pos.x, data.pos.y, data.pos.z)
          this.container.table.cue.moveTo(this.container.table.cue.aim.pos)
        }
      },
      // Ball position sync from opponent during placement
      onBallPosUpdate: (data) => {
        if (data.playerId !== this.clientId) {
          // Update cueball position locally for visual feedback
          this.container.table.cueball.pos.set(data.pos.x, data.pos.y, data.pos.z)
          this.container.table.cueball.updateMesh(0)
          this.container.table.cue.moveTo(this.container.table.cueball.pos)
        }
      },
    })
    
    // Connect to server using gameSessionUuid and uuid from URL params
    const params = new URLSearchParams(window.location.search)
    const gameSessionUuid = params.get("gameSessionUuid") || this.tableId
    const uuid = params.get("uuid") || this.clientId
    
    this.socketRelay.connect({
      roomId: gameSessionUuid,
      clientId: uuid,
      playerName: this.playername,
      ruletype: this.ruletype,
    })
  }

  /**
   * Animation loop for server-authoritative mode
   * 60 FPS render with snapshot interpolation
   */
  startServerAuthoritativeAnimation() {
    let lastTimestamp = performance.now()
    let lastPingUpdate = 0
    
    const animate = (timestamp: number) => {
      const elapsed = (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp
      
      // Update authoritative playback (handles interpolation and returns whether local physics should run)
      let shouldRunLocalPhysics = false
      if (this.authoritativePlayback) {
        shouldRunLocalPhysics = this.authoritativePlayback.update(timestamp)
      }
      
      // Run local physics if needed:
      // - Aiming mode: local physics for cue preview
      // - LocalPrediction: shooter's immediate feedback
      // - AuthoritativePlayback with buffer not ready and isShooter: fallback
      if (shouldRunLocalPhysics) {
        this.container.advance(elapsed)
      }
      
      // Update visuals
      this.container.table.updateBallMesh(elapsed)
      this.container.view.update(elapsed, this.container.table.cue.aim)
      this.container.table.cue.update(elapsed)
      
      // Process sound outcomes
      this.container.sound.processOutcomes(this.container.table.outcome)
      
      // Update ping indicator periodically (throttle to 250ms)
      const now = Date.now()
      if (now - lastPingUpdate > 250) {
        lastPingUpdate = now
        const rtt = Math.round(this.socketRelay?.getRtt() ?? 0)
        if (this.container.hud && typeof this.container.hud.updatePing === "function") {
          this.container.hud.updatePing(rtt)
        }
      }
      
      // Process input events
      this.container.processEvents()
      
      // Render
      this.container.view.render()
      
      requestAnimationFrame(animate)
    }
    
    // Start animation loop
    requestAnimationFrame(animate)
  }

  /**
   * Submit a shot via server-authoritative mode
   */
  submitAuthoritativeShot(aim: any) {
    if (this.authoritativePlayback) {
      this.authoritativePlayback.submitShot(aim)
    }
  }

  /**
   * Check if can submit a shot in server-authoritative mode
   */
  canSubmitShot(): boolean {
    // Can't shoot if game hasn't started (waiting for opponent)
    if (!this.gameStarted && this.useServerAuthoritative) {
      return false
    }
    // Can't shoot if game is paused (opponent disconnected)
    if (this.gamePaused) {
      return false
    }
    if (!this.authoritativePlayback) return true
    return this.authoritativePlayback.canShoot()
  }

  /**
   * Get current playback mode for UI feedback
   */
  getPlaybackMode(): PlaybackMode | null {
    return this.authoritativePlayback?.getMode() ?? null
  }

  /**
   * Get network stats for debugging
   */
  getNetworkStats() {
    return this.authoritativePlayback?.getStats() ?? null
  }

  broadcast(_event: GameEvent) {
    // In server-authoritative mode, events are handled via Socket.IO
    // This is kept for compatibility but is a no-op
  }

  offerUpload() {
    this.container.chat.showMessage(
      `<a class="pill" target="_blank" href="https://scoreboard-tailuge.vercel.app/hiscore.html${location.search}"> upload high score 🏆</a`
    )
  }
}
