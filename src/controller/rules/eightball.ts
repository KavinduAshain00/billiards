import { Vector3 } from "three"
import { Container } from "../../container/container"
import { Aim } from "../aim"
import { Controller } from "../controller"
import { PlaceBall } from "../placeball"
import { WatchAim } from "../watchaim"
import { ChatEvent } from "../../events/chatevent"
import { PlaceBallEvent } from "../../events/placeballevent"
import { WatchEvent } from "../../events/watchevent"
import { Ball } from "../../model/ball"
import { Outcome, OutcomeType } from "../../model/outcome"
import { Table } from "../../model/table"
import { Rack } from "../../utils/rack"
import { zero } from "../../utils/utils"
import { End } from "../end"
import { Rules } from "./rules"
import { R } from "../../model/physics/constants"
import { TableGeometry } from "../../view/tablegeometry"
import { StartAimEvent } from "../../events/startaimevent"

export class EightBall implements Rules {
  readonly container: Container
  cueball: Ball
  currentBreak = 0
  previousBreak = 0
  score = 0
  rulename = "eightball"
  playerGroup: "solids" | "stripes" | null = null // null means table is open
  opponentGroup: "solids" | "stripes" | null = null
  isBreakShot = true
  ballInHandBehindHeadString = false
  
  constructor(container) {
    this.container = container
  }

  startTurn() {
    this.previousBreak = this.currentBreak
    this.currentBreak = 0
  }

  nextCandidateBall() {
    const table = this.container.table
    
    // If table is open, return lowest numbered ball (1)
    if (this.playerGroup === null) {
      return table.balls.find(b => b.id === 1 && b.onTable()) || table.balls[0]
    }
    
    // If all player's balls are potted, return the 8-ball
    const playerBalls = this.getPlayerBalls()
    if (playerBalls.length === 0) {
      return table.balls.find(b => b.id === 8 && b.onTable()) || table.balls[0]
    }
    
    // Return any of player's balls
    return playerBalls[0]
  }

  placeBall(target?): Vector3 {
    if (target) {
      // During the break shot the cue must be placed behind the head string (kitchen).
      // Also respect existing 'ballInHandBehindHeadString' flag for fouls that give kitchen placement.
      if (this.isBreakShot || this.ballInHandBehindHeadString) {
        // Behind head string (kitchen) only
        const max = new Vector3(-TableGeometry.X / 2, TableGeometry.tableY)
        const min = new Vector3(-TableGeometry.tableX, -TableGeometry.tableY)
        return target.clamp(min, max)
      } else {
        // Ball in hand anywhere on table
        const max = new Vector3(TableGeometry.tableX, TableGeometry.tableY)
        const min = new Vector3(-TableGeometry.tableX, -TableGeometry.tableY)
        return target.clamp(min, max)
      }
    }

    // Default: if it's the initial break place in the kitchen, otherwise default to the current cueball pos
    if (this.isBreakShot) {
      return new Vector3((-R * 11) / 0.5, 0, 0)
    }

    return this.container.table ? this.container.table.cueball.pos.clone() : new Vector3(0, 0, 0)
  }

  asset(): string {
    return "models/p8.min.gltf"
  }

  tableGeometry() {
    TableGeometry.hasPockets = true
  }

  table(): Table {
    const table = new Table(this.rack())
    this.cueball = table.cueball
    return table
  }

  rack() {
    // Standard 8-ball triangle rack with all 15 balls properly numbered
    return Rack.eightBall()
  }

  getPlayerBalls(): Ball[] {
    const table = this.container.table
    if (this.playerGroup === null) return []
    
    if (this.playerGroup === "solids") {
      return table.balls.filter(b => b.id >= 1 && b.id <= 7 && b.onTable())
    } else {
      return table.balls.filter(b => b.id >= 9 && b.id <= 15 && b.onTable())
    }
  }

  getOpponentBalls(): Ball[] {
    const table = this.container.table
    if (this.opponentGroup === null) return []
    
    if (this.opponentGroup === "solids") {
      return table.balls.filter(b => b.id >= 1 && b.id <= 7 && b.onTable())
    } else {
      return table.balls.filter(b => b.id >= 9 && b.id <= 15 && b.onTable())
    }
  }

  assignGroups(pottedBall: Ball) {
    if (this.playerGroup !== null) return // Already assigned
    
    if (pottedBall.id >= 1 && pottedBall.id <= 7) {
      this.playerGroup = "solids"
      this.opponentGroup = "stripes"
      this.container.eventQueue.push(new ChatEvent(null, "You are solids"))
    } else if (pottedBall.id >= 9 && pottedBall.id <= 15) {
      this.playerGroup = "stripes"
      this.opponentGroup = "solids"
      this.container.eventQueue.push(new ChatEvent(null, "You are stripes"))
    }
  }

  isLegalBreak(outcome: Outcome[]): boolean {
    // Rule 6: Must pocket a ball OR drive at least 4 balls to rail
    const pottedBalls = Outcome.pots(outcome)
    if (pottedBalls.length > 0) return true
    
    // Count balls that hit rails (this is simplified - would need to track which balls hit rails)
    const cushionHits = outcome.filter(o => o.type === OutcomeType.Cushion)
    // If we have at least 4 cushion events, it's likely a legal break
    return cushionHits.length >= 4
  }

  isLegalShot(outcome: Outcome[]): boolean {
    const table = this.container.table
    
    // Check if cue ball hit a ball first
    const firstContact = outcome.find(o => o.type === OutcomeType.Collision)
    if (!firstContact) return false
    
    // On break shot, any ball is legal
    if (this.isBreakShot) return true
    
    // On open table, any ball except 8-ball first is legal
    if (this.playerGroup === null) {
      const hitBall = firstContact.ballB
      // Rule 10: When 8-ball is hit first on open table, no ball can be scored
      return hitBall?.id !== 8
    }
    
    // Check if player must shoot 8-ball
    const playerBalls = this.getPlayerBalls()
    const mustShootEight = playerBalls.length === 0
    
    if (mustShootEight) {
      // Must hit 8-ball first
      const eightBall = table.balls.find(b => b.id === 8)
      if (firstContact.ballB !== eightBall) return false
    } else {
      // Must hit own group first
      const hitBall = firstContact.ballB
      if (this.playerGroup === "solids") {
        if (!hitBall || hitBall.id < 1 || hitBall.id > 7) return false
      } else {
        if (!hitBall || hitBall.id < 9 || hitBall.id > 15) return false
      }
    }
    
    // Rule 12: After hitting correct ball, must pocket a ball OR hit a rail
    const pottedBalls = Outcome.pots(outcome)
    const cushionHit = outcome.some(o => o.type === OutcomeType.Cushion)
    
    return pottedBalls.length > 0 || cushionHit
  }

  update(outcome: Outcome[]): Controller {
    const table = this.container.table
    const pottedBalls = Outcome.pots(outcome)
    const eightBallPotted = pottedBalls.some(b => b.id === 8)
    const cueBallPotted = Outcome.isCueBallPotted(table.cueball, outcome)
    
    // Rule 9: 8-ball pocketed on break
    if (this.isBreakShot && eightBallPotted) {
      if (cueBallPotted) {
        // Scratch while pocketing 8-ball on break - opponent gets option
        this.container.eventQueue.push(new ChatEvent(null, "8-ball pocketed with scratch on break. Opponent's option: re-rack or spot 8-ball"))
        // For now, just give ball in hand behind head string
        this.isBreakShot = false
        this.ballInHandBehindHeadString = true
        this.startTurn()
        // Reset cue ball to spot for the foul
        this.container.table.cueball.pos.copy(Rack.spot)
        if (this.container.isSinglePlayer) {
          return new PlaceBall(this.container)
        }
        this.container.sendEvent(new PlaceBallEvent(zero, true))
        return new WatchAim(this.container)
      } else {
        // 8-ball pocketed on break without scratch - spot and continue
        this.container.eventQueue.push(new ChatEvent(null, "8-ball pocketed on break - spotted"))
        // TODO: Implement 8-ball spotting
        this.isBreakShot = false
        this.container.sendEvent(new WatchEvent(table.serialise()))
        return new Aim(this.container)
      }
    }
    
    // Handle break shot
    if (this.isBreakShot) {
      this.isBreakShot = false
      
      // Rule 7: Scratch on legal break
      if (cueBallPotted) {
        const legalBreak = this.isLegalBreak(outcome)
        if (legalBreak) {
          this.container.eventQueue.push(new ChatEvent(null, "Scratch on break. Ball in hand behind head string"))
          this.ballInHandBehindHeadString = true
          this.startTurn()
          // Reset cue ball to spot for the foul
          this.container.table.cueball.pos.copy(Rack.spot)
          if (this.container.isSinglePlayer) {
            return new PlaceBall(this.container)
          }
          // Multiplayer: report foul to server
          this.container.reportShotComplete(false, true, false)
          this.container.sendEvent(new PlaceBallEvent(zero, true))
          return new WatchAim(this.container)
        } else {
          this.container.eventQueue.push(new ChatEvent(null, "Illegal break. Opponent may re-rack or shoot"))
          this.ballInHandBehindHeadString = true
          this.startTurn()
          // Reset cue ball to spot for the foul
          this.container.table.cueball.pos.copy(Rack.spot)
          if (this.container.isSinglePlayer) {
            return new PlaceBall(this.container)
          }
          // Multiplayer: report foul to server
          this.container.reportShotComplete(false, true, false)
          this.container.sendEvent(new PlaceBallEvent(zero, true))
          return new WatchAim(this.container)
        }
      }
      
      // Rule 6: Check for legal break
      if (!this.isLegalBreak(outcome)) {
        this.container.eventQueue.push(new ChatEvent(null, "Illegal break. Opponent may re-rack or shoot"))
        this.startTurn()
        this.container.sendEvent(new StartAimEvent())
        if (this.container.isSinglePlayer) {
          this.container.sendEvent(new WatchEvent(table.serialise()))
          return new Aim(this.container)
        }
        // Multiplayer: report foul to server
        this.container.reportShotComplete(false, true, false)
        return new WatchAim(this.container)
      }
      
      // Legal break - continue shooting if any ball was pocketed
      if (pottedBalls.length > 0) {
        this.container.sound.playSuccess(table.inPockets())
        if (this.container.isSinglePlayer) {
          this.container.sendEvent(new WatchEvent(table.serialise()))
          return new Aim(this.container)
        }
        // Multiplayer: report pot to server (player continues)
        this.container.reportShotComplete(true, false, true)
        return new Aim(this.container)
      }
      
      // No balls pocketed on break - switch players
      this.startTurn()
      this.container.sendEvent(new StartAimEvent())
      if (this.container.isSinglePlayer) {
        this.container.sendEvent(new WatchEvent(table.serialise()))
        return new Aim(this.container)
      }
      // Multiplayer: report no pot to server (turn switches)
      this.container.reportShotComplete(false, false, false)
      return new WatchAim(this.container)
    }
    
    // Rule 20c: 8-ball jumped off table = loss of game
    // TODO: Need to detect jumped balls
    
    // Rule 20: 8-ball potted
    if (eightBallPotted) {
      const playerBalls = this.getPlayerBalls()
      
      // Rule 20a: Foul when pocketing 8-ball
      if (cueBallPotted) {
        this.container.eventQueue.push(new ChatEvent(null, "You lose! Scratched while pocketing 8-ball"))
        this.container.recorder.wholeGameLink()
        return new End(this.container)
      }
      
      // Rule 20e: 8-ball pocketed when not legal object ball
      if (playerBalls.length > 0) {
        this.container.eventQueue.push(new ChatEvent(null, "You lose! 8-ball potted early"))
        this.container.recorder.wholeGameLink()
        return new End(this.container)
      }
      
      // Rule 20b: 8-ball potted on same stroke as last ball
      const ownBallsPotted = pottedBalls.filter(b => {
        if (this.playerGroup === "solids") {
          return b.id >= 1 && b.id <= 7
        } else {
          return b.id >= 9 && b.id <= 15
        }
      })
      
      if (ownBallsPotted.length > 0) {
        this.container.eventQueue.push(new ChatEvent(null, "You lose! 8-ball and own ball pocketed on same shot"))
        this.container.recorder.wholeGameLink()
        return new End(this.container)
      }
      
      // Check if shot was legal
      if (!this.isLegalShot(outcome)) {
        this.container.eventQueue.push(new ChatEvent(null, "You lose! 8-ball potted on illegal shot"))
        this.container.recorder.wholeGameLink()
        return new End(this.container)
      }
      
      // Win condition
      this.container.eventQueue.push(new ChatEvent(null, "You win! 8-ball legally pocketed"))
      this.container.recorder.wholeGameLink()
      return new End(this.container)
    }
    
    // Rule 15: Cue ball potted (not on break) - ball in hand anywhere
    if (cueBallPotted) {
      this.container.eventQueue.push(new ChatEvent(null, "Foul: Scratch. Opponent gets ball in hand"))
      this.ballInHandBehindHeadString = false
      this.startTurn()
      // Reset cue ball to spot for the foul (so placement starts from a known consistent position)
      this.container.table.cueball.pos.copy(Rack.spot)
      if (this.container.isSinglePlayer) {
        return new PlaceBall(this.container)
      }
      // Multiplayer: report foul to server
      this.container.reportShotComplete(false, true, false) // potted=false, fouled=true, continues=false
      this.container.sendEvent(new PlaceBallEvent(zero, true))
      return new WatchAim(this.container)
    }
    
    // Check for illegal shot (wrong ball hit or no rail contact)
    if (!this.isLegalShot(outcome)) {
      this.container.eventQueue.push(new ChatEvent(null, "Foul: Illegal shot. Opponent gets ball in hand"))
      this.ballInHandBehindHeadString = false
      this.startTurn()
      this.container.sendEvent(new StartAimEvent())
      // Reset cueball to spot for the foul
      this.container.table.cueball.pos.copy(Rack.spot)
      if (this.container.isSinglePlayer) {
        this.container.sendEvent(new WatchEvent(table.serialise()))
        return new PlaceBall(this.container)
      }
      // Multiplayer: report foul to server
      this.container.reportShotComplete(false, true, false) // potted=false, fouled=true, continues=false
      this.container.sendEvent(new PlaceBallEvent(zero, true))
      return new WatchAim(this.container)
    }
    
    // Rule 11: Assign groups on first legal pot after break
    if (this.playerGroup === null && pottedBalls.length > 0) {
      const firstPot = pottedBalls[0]
      if (firstPot.id >= 1 && firstPot.id <= 7) {
        this.playerGroup = "solids"
        this.opponentGroup = "stripes"
        this.container.eventQueue.push(new ChatEvent(null, "You are solids"))
      } else if (firstPot.id >= 9 && firstPot.id <= 15) {
        this.playerGroup = "stripes"
        this.opponentGroup = "solids"
        this.container.eventQueue.push(new ChatEvent(null, "You are stripes"))
      }
    }
    
    // Check for valid pots
    const validPots = pottedBalls.filter(b => {
      if (b.id === 8) return false
      if (this.playerGroup === null) return true
      
      if (this.playerGroup === "solids") {
        return b.id >= 1 && b.id <= 7
      } else {
        return b.id >= 9 && b.id <= 15
      }
    })
    
    // Rule 17: All pocketed balls remain pocketed (even illegally pocketed)
    if (validPots.length > 0) {
      this.currentBreak += validPots.length
      this.score += validPots.length
      this.container.sound.playSuccess(table.inPockets())
      if (this.container.isSinglePlayer) {
        this.container.sendEvent(new WatchEvent(table.serialise()))
        return new Aim(this.container)
      }
      // Multiplayer: report valid pot to server (player continues)
      this.container.reportShotComplete(true, false, true) // potted=true, fouled=false, continues=true
      return new Aim(this.container)
    }
    
    // No valid pot - switch players
    this.startTurn()
    this.container.sendEvent(new StartAimEvent())
    if (this.container.isSinglePlayer) {
      this.container.sendEvent(new WatchEvent(table.serialise()))
      return new Aim(this.container)
    }
    // Multiplayer: report no pot to server (turn switches)
    this.container.reportShotComplete(false, false, false) // potted=false, fouled=false, continues=false
    return new WatchAim(this.container)
  }

  isPartOfBreak(outcome: Outcome[]) {
    const pottedBalls = Outcome.pots(outcome)
    
    // Any legal pot continues the break
    if (pottedBalls.length === 0) return false
    
    const validPots = pottedBalls.filter(b => {
      if (b.id === 8) return false // 8-ball doesn't continue break
      if (this.playerGroup === null) return true // On open table, any pot counts
      
      if (this.playerGroup === "solids") {
        return b.id >= 1 && b.id <= 7
      } else {
        return b.id >= 9 && b.id <= 15
      }
    })
    
    return validPots.length > 0 && this.isLegalShot(outcome)
  }

  isEndOfGame(_outcome: Outcome[]) {
    const eightBall = this.container.table.balls.find(b => b.id === 8)
    return eightBall ? !eightBall.onTable() : false
  }

  otherPlayersCueBall(): Ball {
    return this.cueball
  }

  secondToPlay() {
    // only for three cushion
  }

  allowsPlaceBall() {
    return true
  }
}