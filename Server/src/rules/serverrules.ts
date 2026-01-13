/**
 * Server-Side Rules Engine
 * 
 * Handles game rules for 8-ball and snooker on the server side.
 * Determines turn switching, fouls, wins/losses, etc.
 */

import { TableSnapshot, Outcome } from "../model/table"

export type PlayerGroup = "solids" | "stripes" | null

export interface TurnResult {
  // Did the player foul?
  fouled: boolean
  // Does the player continue their turn?
  continuesTurn: boolean
  // Is ball in hand?
  ballInHand: boolean
  // Is ball in hand restricted to kitchen (behind head string)?
  behindHeadString: boolean
  // Did the player win?
  playerWins: boolean
  // Did the player lose?
  playerLoses: boolean
  // Message to display
  message: string
  // Player groups (for 8-ball)
  playerGroup?: PlayerGroup
  opponentGroup?: PlayerGroup
  // Points scored (for snooker)
  points?: number
  // Foul points (for snooker)
  foulPoints?: number
}

export interface GameState {
  ruletype: "eightball" | "snooker"
  // Current player index (0 or 1)
  currentPlayerIndex: number
  // Player IDs in order [player0Id, player1Id]
  playerIds: string[]
  // Is it the break shot?
  isBreakShot: boolean
  // 8-ball specific
  playerGroups: [PlayerGroup, PlayerGroup] // [player0Group, player1Group]
  // Snooker specific
  targetIsRed: boolean
  scores: [number, number] // [player0Score, player1Score]
  currentBreak: number
  // Game over
  gameOver: boolean
  winnerId: string | null
}

export class ServerRules {
  /**
   * Create initial game state
   */
  static createGameState(ruletype: string, playerIds: string[]): GameState {
    return {
      ruletype: ruletype as "eightball" | "snooker",
      currentPlayerIndex: 0,
      playerIds: playerIds.slice(0, 2),
      isBreakShot: true,
      playerGroups: [null, null],
      targetIsRed: true,
      scores: [0, 0],
      currentBreak: 0,
      gameOver: false,
      winnerId: null,
    }
  }

  /**
   * Get the current player's ID
   */
  static getCurrentPlayerId(state: GameState): string {
    return state.playerIds[state.currentPlayerIndex]
  }

  /**
   * Check if a player can take a shot
   */
  static canPlayerShoot(state: GameState, playerId: string): boolean {
    if (state.gameOver) return false
    return state.playerIds[state.currentPlayerIndex] === playerId
  }

  /**
   * Process the outcome of a shot and update game state
   */
  static processShot(
    state: GameState,
    snapshot: TableSnapshot,
    outcomes: Outcome[],
    shooterId: string
  ): TurnResult {
    // Verify it's this player's turn
    if (!this.canPlayerShoot(state, shooterId)) {
      return {
        fouled: true,
        continuesTurn: false,
        ballInHand: false,
        behindHeadString: false,
        playerWins: false,
        playerLoses: false,
        message: "Not your turn!",
      }
    }

    if (state.ruletype === "eightball") {
      return this.processEightBallShot(state, snapshot, outcomes)
    } else if (state.ruletype === "snooker") {
      return this.processSnookerShot(state, snapshot, outcomes)
    }

    return {
      fouled: false,
      continuesTurn: false,
      ballInHand: false,
      behindHeadString: false,
      playerWins: false,
      playerLoses: false,
      message: "Unknown ruletype",
    }
  }

  /**
   * Process 8-ball shot
   */
  private static processEightBallShot(
    state: GameState,
    snapshot: TableSnapshot,
    outcomes: Outcome[]
  ): TurnResult {
    const pottedBalls = outcomes.filter(o => o.type === "pot")
    const pottedBallIds = pottedBalls.map(o => o.ballId)
    
    // Map ball IDs to ball numbers for rule processing
    const ballIdToNumber = new Map<number, number>()
    snapshot.balls.forEach(b => {
      ballIdToNumber.set(b.id, b.ballNumber ?? b.id)
    })
    
    // Convert potted ball IDs to ball numbers
    const pottedBallNumbers = pottedBallIds.map(id => ballIdToNumber.get(id) ?? id)
    
    const cueBallPotted = pottedBallNumbers.includes(0)
    const eightBallPotted = pottedBallNumbers.includes(8)
    
    // Check if cue ball hit any ball (collision with ballId 0)
    const collisions = outcomes.filter(o => o.type === "collision")
    const cueBallHitAnyBall = collisions.some(o => o.ballId === 0 || o.ballId2 === 0)
    
    // Find the first ball the cue ball hit (and convert to ball number)
    const firstCueBallCollision = collisions.find(o => o.ballId === 0 || o.ballId2 === 0)
    let firstBallHitId: number | null = null
    if (firstCueBallCollision) {
      if (firstCueBallCollision.ballId === 0) {
        firstBallHitId = firstCueBallCollision.ballId2 ?? null
      } else {
        firstBallHitId = firstCueBallCollision.ballId
      }
    }
    const firstBallHitNumber = firstBallHitId !== null ? (ballIdToNumber.get(firstBallHitId) ?? firstBallHitId) : null
    
    const playerIdx = state.currentPlayerIndex
    const playerGroup = state.playerGroups[playerIdx]
    
    // Determine which balls belong to which group (by ball NUMBER, not ID)
    const solidNumbers = [1, 2, 3, 4, 5, 6, 7]
    const stripeNumbers = [9, 10, 11, 12, 13, 14, 15]
    
    // Count remaining balls on table by ball NUMBER
    const ballNumbersOnTable = snapshot.balls
      .filter(b => b.state !== "InPocket")
      .map(b => b.ballNumber ?? b.id)
    const solidsRemaining = solidNumbers.filter(n => ballNumbersOnTable.includes(n))
    const stripesRemaining = stripeNumbers.filter(n => ballNumbersOnTable.includes(n))
    
    // Handle break shot
    if (state.isBreakShot) {
      state.isBreakShot = false
      
      if (eightBallPotted && cueBallPotted) {
        // Scratch + 8-ball on break - loss
        return this.endGame(state, false, "Lost! 8-ball and scratch on break")
      }
      
      if (eightBallPotted) {
        // 8-ball on break - spot it and continue
        // TODO: Need to actually spot the 8-ball
        return {
          fouled: false,
          continuesTurn: true,
          ballInHand: false,
          behindHeadString: false,
          playerWins: false,
          playerLoses: false,
          message: "8-ball pocketed on break - spotted. Continue shooting.",
        }
      }
      
      if (cueBallPotted) {
        // Scratch on break
        this.switchTurn(state)
        return {
          fouled: true,
          continuesTurn: false,
          ballInHand: true,
          behindHeadString: true,
          playerWins: false,
          playerLoses: false,
          message: "Scratch on break. Ball in hand behind head string.",
        }
      }
      
      // Legal break
      if (pottedBalls.length > 0) {
        // Potted ball on break - assign groups if a solid/stripe was potted
        const solidPotted = pottedBallNumbers.some(n => solidNumbers.includes(n))
        const stripePotted = pottedBallNumbers.some(n => stripeNumbers.includes(n))
        
        if (solidPotted && !stripePotted) {
          state.playerGroups[playerIdx] = "solids"
          state.playerGroups[1 - playerIdx] = "stripes"
        } else if (stripePotted && !solidPotted) {
          state.playerGroups[playerIdx] = "stripes"
          state.playerGroups[1 - playerIdx] = "solids"
        }
        // If both or neither, table stays open
        
        return {
          fouled: false,
          continuesTurn: true,
          ballInHand: false,
          behindHeadString: false,
          playerWins: false,
          playerLoses: false,
          message: "Nice break! Continue shooting.",
          playerGroup: state.playerGroups[playerIdx],
          opponentGroup: state.playerGroups[1 - playerIdx],
        }
      }
      
      // No ball potted on break - switch turns
      this.switchTurn(state)
      return {
        fouled: false,
        continuesTurn: false,
        ballInHand: false,
        behindHeadString: false,
        playerWins: false,
        playerLoses: false,
        message: "No ball potted. Opponent's turn.",
      }
    }
    
    // Regular play (after break)
    
    // FOUL: No ball hit at all
    if (!cueBallHitAnyBall) {
      this.switchTurn(state)
      return {
        fouled: true,
        continuesTurn: false,
        ballInHand: true,
        behindHeadString: false,
        playerWins: false,
        playerLoses: false,
        message: "Foul! Cue ball didn't hit any ball. Ball in hand for opponent.",
        playerGroup: state.playerGroups[1 - playerIdx],
        opponentGroup: state.playerGroups[playerIdx],
      }
    }
    
    // 8-ball potted
    if (eightBallPotted) {
      const playerBallsRemaining = playerGroup === "solids" ? solidsRemaining : 
                                   playerGroup === "stripes" ? stripesRemaining : []
      
      // Check if player can legally shoot 8-ball
      if (playerBallsRemaining.length > 0 || playerGroup === null) {
        // 8-ball potted early - loss
        return this.endGame(state, false, "Lost! 8-ball potted before clearing your balls")
      }
      
      if (cueBallPotted) {
        // Scratch while pocketing 8-ball - loss
        return this.endGame(state, false, "Lost! Scratch while pocketing 8-ball")
      }
      
      // Legal 8-ball pot - win!
      return this.endGame(state, true, "Winner! 8-ball legally pocketed!")
    }
    
    // Cue ball potted (scratch)
    if (cueBallPotted) {
      this.switchTurn(state)
      return {
        fouled: true,
        continuesTurn: false,
        ballInHand: true,
        behindHeadString: false,
        playerWins: false,
        playerLoses: false,
        message: "Scratch! Ball in hand for opponent.",
      }
    }
    
    // Check if any of player's balls were potted (by ball NUMBER)
    const playerBallsPotted = pottedBallNumbers.filter(n => {
      if (playerGroup === "solids") return solidNumbers.includes(n)
      if (playerGroup === "stripes") return stripeNumbers.includes(n)
      return false
    })
    
    // Table is open - assign groups if a legal pot
    if (playerGroup === null && pottedBalls.length > 0) {
      const solidPotted = pottedBallNumbers.some(n => solidNumbers.includes(n))
      const stripePotted = pottedBallNumbers.some(n => stripeNumbers.includes(n))
      
      if (solidPotted && !stripePotted) {
        state.playerGroups[playerIdx] = "solids"
        state.playerGroups[1 - playerIdx] = "stripes"
        return {
          fouled: false,
          continuesTurn: true,
          ballInHand: false,
          behindHeadString: false,
          playerWins: false,
          playerLoses: false,
          message: "You are solids! Continue shooting.",
          playerGroup: "solids",
          opponentGroup: "stripes",
        }
      } else if (stripePotted && !solidPotted) {
        state.playerGroups[playerIdx] = "stripes"
        state.playerGroups[1 - playerIdx] = "solids"
        return {
          fouled: false,
          continuesTurn: true,
          ballInHand: false,
          behindHeadString: false,
          playerWins: false,
          playerLoses: false,
          message: "You are stripes! Continue shooting.",
          playerGroup: "stripes",
          opponentGroup: "solids",
        }
      }
    }
    
    // Player legally potted their balls - continue
    if (playerBallsPotted.length > 0) {
      return {
        fouled: false,
        continuesTurn: true,
        ballInHand: false,
        behindHeadString: false,
        playerWins: false,
        playerLoses: false,
        message: "Nice shot! Continue shooting.",
        playerGroup: state.playerGroups[playerIdx],
        opponentGroup: state.playerGroups[1 - playerIdx],
      }
    }
    
    // No legal pot - switch turns
    this.switchTurn(state)
    return {
      fouled: false,
      continuesTurn: false,
      ballInHand: false,
      behindHeadString: false,
      playerWins: false,
      playerLoses: false,
      message: "No ball potted. Opponent's turn.",
      playerGroup: state.playerGroups[playerIdx],
      opponentGroup: state.playerGroups[1 - playerIdx],
    }
  }

  /**
   * Process snooker shot
   */
  private static processSnookerShot(
    state: GameState,
    snapshot: TableSnapshot,
    outcomes: Outcome[]
  ): TurnResult {
    const pottedBalls = outcomes.filter(o => o.type === "pot")
    const pottedBallIds = pottedBalls.map(o => o.ballId)
    const cueBallPotted = pottedBallIds.includes(0)
    
    // Snooker ball IDs: 0=cue, 1=red, 2=yellow(2), 3=green(3), 4=brown(4), 5=blue(5), 6=pink(6), 7=black(7)
    // Actually in this game, reds are typically balls 1-15 with id=1 being red
    // For simplicity, let's use: 
    // - IDs 1-15 = reds (worth 1 point each)
    // - ID 16 = yellow (2 points)
    // - ID 17 = green (3 points)
    // - ID 18 = brown (4 points)
    // - ID 19 = blue (5 points)
    // - ID 20 = pink (6 points)
    // - ID 21 = black (7 points)
    
    const redIds = Array.from({ length: 15 }, (_, i) => i + 1)
    const colourValues: { [key: number]: number } = {
      16: 2, // yellow
      17: 3, // green
      18: 4, // brown
      19: 5, // blue
      20: 6, // pink
      21: 7, // black
    }
    
    const ballsOnTable = snapshot.balls.filter(b => b.state !== "InPocket").map(b => b.id)
    const redsOnTable = redIds.filter(id => ballsOnTable.includes(id))
    
    const playerIdx = state.currentPlayerIndex
    
    if (cueBallPotted) {
      // Scratch - foul
      this.switchTurn(state)
      state.targetIsRed = redsOnTable.length > 0
      state.currentBreak = 0
      return {
        fouled: true,
        continuesTurn: false,
        ballInHand: true,
        behindHeadString: false, // Snooker: ball in hand in D
        playerWins: false,
        playerLoses: false,
        message: "Foul! Ball in hand in the D.",
        foulPoints: 4,
      }
    }
    
    if (pottedBalls.length === 0) {
      // No pot - switch turns
      this.switchTurn(state)
      state.targetIsRed = redsOnTable.length > 0
      state.currentBreak = 0
      return {
        fouled: false,
        continuesTurn: false,
        ballInHand: false,
        behindHeadString: false,
        playerWins: false,
        playerLoses: false,
        message: "Safety. Opponent's turn.",
      }
    }
    
    // Calculate points for potted balls
    let points = 0
    let fouled = false
    let foulPoints = 0
    
    for (const ballId of pottedBallIds) {
      if (ballId === 0) continue // Skip cue ball
      
      if (state.targetIsRed) {
        // Must pot a red
        if (redIds.includes(ballId)) {
          points += 1
        } else {
          // Potted colour when red was target - foul
          fouled = true
          foulPoints = Math.max(foulPoints, colourValues[ballId] || 4)
        }
      } else {
        // Must pot a colour
        if (redIds.includes(ballId)) {
          // Potted red when colour was target - foul
          fouled = true
          foulPoints = Math.max(foulPoints, 4)
        } else {
          points += colourValues[ballId] || 0
        }
      }
    }
    
    if (fouled) {
      this.switchTurn(state)
      state.targetIsRed = redsOnTable.length > 0
      state.currentBreak = 0
      state.scores[1 - playerIdx] += foulPoints
      return {
        fouled: true,
        continuesTurn: false,
        ballInHand: true,
        behindHeadString: false,
        playerWins: false,
        playerLoses: false,
        message: `Foul! ${foulPoints} points to opponent.`,
        foulPoints,
      }
    }
    
    // Legal pot
    state.scores[playerIdx] += points
    state.currentBreak += points
    
    // Toggle target
    if (state.targetIsRed) {
      // After potting red, must pot colour
      state.targetIsRed = false
    } else {
      // After potting colour, back to red (if any remain)
      state.targetIsRed = redsOnTable.length > 0
    }
    
    // Check for end of game (no reds and all colours potted)
    // Simplified - in real snooker there are complex rules
    if (redsOnTable.length === 0) {
      const coloursOnTable = Object.keys(colourValues).map(Number).filter(id => ballsOnTable.includes(id))
      if (coloursOnTable.length === 0) {
        // Game over
        const winner = state.scores[0] > state.scores[1] ? 0 : 1
        state.gameOver = true
        state.winnerId = state.playerIds[winner]
        return {
          fouled: false,
          continuesTurn: false,
          ballInHand: false,
          behindHeadString: false,
          playerWins: playerIdx === winner,
          playerLoses: playerIdx !== winner,
          message: `Game over! ${state.playerIds[winner]} wins ${state.scores[winner]}-${state.scores[1 - winner]}`,
          points,
        }
      }
    }
    
    return {
      fouled: false,
      continuesTurn: true,
      ballInHand: false,
      behindHeadString: false,
      playerWins: false,
      playerLoses: false,
      message: `+${points} points. Break: ${state.currentBreak}. Continue shooting.`,
      points,
    }
  }

  /**
   * Switch to the other player's turn
   */
  private static switchTurn(state: GameState): void {
    state.currentPlayerIndex = 1 - state.currentPlayerIndex
    state.currentBreak = 0
  }

  /**
   * End the game
   */
  private static endGame(state: GameState, currentPlayerWins: boolean, message: string): TurnResult {
    state.gameOver = true
    state.winnerId = currentPlayerWins 
      ? state.playerIds[state.currentPlayerIndex]
      : state.playerIds[1 - state.currentPlayerIndex]
    
    return {
      fouled: !currentPlayerWins,
      continuesTurn: false,
      ballInHand: false,
      behindHeadString: false,
      playerWins: currentPlayerWins,
      playerLoses: !currentPlayerWins,
      message,
    }
  }
}
