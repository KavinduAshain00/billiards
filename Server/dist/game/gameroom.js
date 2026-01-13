"use strict";
/**
 * Game Room - Manages a single game instance with authoritative physics
 * 20 snapshots/sec during motion
 * Waiting system: waits 60 seconds for second player
 * Turn-based gameplay with 8-ball and snooker rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const table_1 = require("../model/table");
const ball_1 = require("../model/ball");
const utils_1 = require("../physics/utils");
const constants_1 = require("../physics/constants");
const tablegeometry_1 = require("../model/tablegeometry");
const serverrules_1 = require("../rules/serverrules");
class GameRoom {
    constructor(roomId, ruletype = "eightball") {
        this.players = new Map();
        this.playerOrder = []; // [player0Id, player1Id]
        this.isSimulating = false;
        this.serverTick = 0;
        this.simulationInterval = null;
        // Room state
        this.roomState = "waiting";
        this.waitingTimer = null;
        this.waitingStartTime = 0;
        this.WAITING_TIMEOUT_MS = 60000; // 60 seconds
        // Pause/reconnection state
        this.isPaused = false;
        this.disconnectedPlayer = null;
        this.reconnectionTimer = null;
        this.reconnectionStartTime = 0;
        this.RECONNECTION_TIMEOUT_MS = 60000; // 60 seconds to reconnect
        // Game state for rules
        this.gameState = null;
        // Current turn state (updated after each shot)
        this.currentBallInHand = false;
        this.currentBehindHeadString = false;
        // Current shot aim (for rule processing after simulation)
        this.currentShotAim = null;
        this.currentShooterId = null;
        // Accumulated outcomes during the entire shot
        this.shotOutcomes = [];
        // Physics timestep - MUST match client exactly
        this.PHYSICS_STEP = 0.001953125; // Same as client container.step
        // Snapshot broadcast rate: adaptive 10-20Hz based on movement
        this.BASE_SNAPSHOT_INTERVAL_MS = 50; // 20Hz when balls moving fast
        this.SLOW_SNAPSHOT_INTERVAL_MS = 100; // 10Hz when balls slowing down
        this.currentSnapshotInterval = 50;
        // Delta compression for snapshots
        this.lastBroadcastSnapshot = null;
        // Accumulated time for physics
        this.accumulatedTime = 0;
        this.lastSimTime = 0;
        // Callback for broadcasting snapshots
        this.onSnapshot = null;
        this.onStationary = null;
        // Callbacks for room state changes
        this.onWaitingUpdate = null;
        this.onGameStart = null;
        this.onWaitingTimeout = null;
        this.onPlayerCountChange = null;
        // Callbacks for game events
        this.onTurnChange = null;
        this.onGameOver = null;
        this.onFoul = null;
        // Callbacks for pause/reconnection
        this.onGamePaused = null;
        this.onGameResumed = null;
        this.onForfeit = null;
        this.onReconnectionUpdate = null;
        this.roomId = roomId;
        this.ruletype = ruletype;
        this.table = this.createTable(ruletype);
    }
    createTable(ruletype) {
        ball_1.Ball.resetIdCounter();
        const balls = this.createBalls(ruletype);
        return new table_1.Table(balls);
    }
    createBalls(ruletype) {
        const balls = [];
        // Cue ball (id 0, ballNumber 0)
        balls.push(new ball_1.Ball(new utils_1.Vector3(-tablegeometry_1.TableGeometry.tableX * 0.5, 0, 0), undefined, 0));
        // Racked balls - standard triangle formation
        const footSpot = new utils_1.Vector3(tablegeometry_1.TableGeometry.tableX * 0.35, 0, 0);
        const spacing = 2 * constants_1.R + 0.001;
        const rowOffset = spacing * Math.sqrt(3) / 2;
        // Generate triangle positions
        const positions = [];
        const rows = [
            [0], // Row 0: 1 ball
            [-0.5, 0.5], // Row 1: 2 balls
            [-1, 0, 1], // Row 2: 3 balls
            [-1.5, -0.5, 0.5, 1.5], // Row 3: 4 balls
            [-2, -1, 0, 1, 2], // Row 4: 5 balls
        ];
        rows.forEach((row, rowIndex) => {
            row.forEach((offset) => {
                const x = footSpot.x + rowIndex * rowOffset;
                const y = footSpot.y + offset * spacing;
                positions.push(new utils_1.Vector3(x, y, 0));
            });
        });
        if (ruletype === "eightball") {
            // Create randomized 8-ball rack
            // Ball numbers 1-7 are solids, 8 is 8-ball, 9-15 are stripes
            // 8-ball must be in the center (position index 4)
            const numbers = [];
            for (let i = 1; i <= 15; i++) {
                if (i !== 8)
                    numbers.push(i);
            }
            // Fisher-Yates shuffle
            for (let i = numbers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
            }
            // Assign ball numbers: 8-ball goes at index 4 (center of rack)
            const assigned = [];
            let idx = 0;
            for (let i = 0; i < positions.length; i++) {
                if (i === 4) {
                    assigned[i] = 8; // 8-ball in center
                }
                else {
                    assigned[i] = numbers[idx++];
                }
            }
            // Create balls with their assigned numbers
            for (let i = 0; i < positions.length; i++) {
                const ballNumber = assigned[i];
                balls.push(new ball_1.Ball(positions[i], undefined, ballNumber));
            }
            console.log(`[GameRoom] Created 8-ball rack with ball numbers: ${assigned.join(', ')}`);
        }
        else {
            // Other rule types: just create balls without special numbering
            positions.forEach(() => {
                balls.push(new ball_1.Ball(positions.shift()));
            });
        }
        return balls;
    }
    addPlayer(clientId, playerName, socketId) {
        // Assign player index based on order of joining
        const playerIndex = this.playerOrder.length;
        // Only allow 2 players max
        if (playerIndex >= 2) {
            console.log(`Room ${this.roomId}: Rejecting player ${clientId} - room full`);
            return;
        }
        this.players.set(clientId, { clientId, playerName, socketId, playerIndex });
        this.playerOrder.push(clientId);
        // Notify about player count change
        if (this.onPlayerCountChange) {
            this.onPlayerCountChange(this.players.size, this.getPlayers());
        }
        // Check if we should start the game
        if (this.players.size >= 2 && this.roomState === "waiting") {
            this.startGame();
        }
        else if (this.players.size === 1 && this.roomState === "waiting") {
            // First player joined - start waiting timer
            this.startWaitingTimer();
        }
    }
    removePlayer(clientId) {
        const player = this.players.get(clientId);
        if (!player)
            return;
        // If game is in progress, pause for reconnection
        if (this.roomState === "playing" && this.players.size === 2) {
            this.disconnectedPlayer = player;
            this.players.delete(clientId);
            this.pauseGame();
        }
        else {
            this.players.delete(clientId);
        }
        // Notify about player count change
        if (this.onPlayerCountChange) {
            this.onPlayerCountChange(this.players.size, this.getPlayers());
        }
    }
    /**
     * Try to reconnect a player who disconnected
     */
    tryReconnect(clientId, playerName, socketId) {
        // Check if this is the disconnected player trying to reconnect
        if (this.disconnectedPlayer && this.disconnectedPlayer.clientId === clientId) {
            const player = {
                clientId,
                playerName,
                socketId,
                playerIndex: this.disconnectedPlayer.playerIndex,
            };
            this.players.set(clientId, player);
            this.resumeGame();
            return true;
        }
        return false;
    }
    /**
     * Pause game when a player disconnects during play
     */
    pauseGame() {
        if (this.isPaused || !this.disconnectedPlayer)
            return;
        this.isPaused = true;
        console.log(`Room ${this.roomId}: Game paused - waiting for ${this.disconnectedPlayer.playerName} to reconnect`);
        // Start reconnection timer
        this.startReconnectionTimer();
        // Notify remaining player
        if (this.onGamePaused) {
            this.onGamePaused({
                disconnectedPlayerId: this.disconnectedPlayer.clientId,
                disconnectedPlayerName: this.disconnectedPlayer.playerName,
                secondsToReconnect: Math.ceil(this.RECONNECTION_TIMEOUT_MS / 1000),
            });
        }
    }
    /**
     * Resume game when disconnected player reconnects
     */
    resumeGame() {
        if (!this.isPaused || !this.disconnectedPlayer)
            return;
        console.log(`Room ${this.roomId}: Player ${this.disconnectedPlayer.playerName} reconnected - resuming game`);
        // Stop reconnection timer
        this.stopReconnectionTimer();
        // Notify players with full game state
        if (this.onGameResumed) {
            this.onGameResumed({
                reconnectedPlayerId: this.disconnectedPlayer.clientId,
                reconnectedPlayerName: this.disconnectedPlayer.playerName,
                currentPlayerId: this.getCurrentPlayerId(),
                ballInHand: this.currentBallInHand,
                behindHeadString: this.currentBehindHeadString,
                snapshot: this.table.snapshot(this.serverTick),
            });
        }
        this.isPaused = false;
        this.disconnectedPlayer = null;
    }
    /**
     * Start reconnection countdown timer
     */
    startReconnectionTimer() {
        if (this.reconnectionTimer)
            return;
        this.reconnectionStartTime = Date.now();
        // Send updates every second
        this.reconnectionTimer = setInterval(() => {
            const elapsed = Date.now() - this.reconnectionStartTime;
            const remaining = Math.max(0, this.RECONNECTION_TIMEOUT_MS - elapsed);
            const secondsLeft = Math.ceil(remaining / 1000);
            if (this.onReconnectionUpdate) {
                this.onReconnectionUpdate(secondsLeft);
            }
            if (remaining <= 0) {
                this.handleReconnectionTimeout();
            }
        }, 1000);
    }
    /**
     * Stop reconnection timer
     */
    stopReconnectionTimer() {
        if (this.reconnectionTimer) {
            clearInterval(this.reconnectionTimer);
            this.reconnectionTimer = null;
        }
    }
    /**
     * Handle reconnection timeout - player forfeits
     */
    handleReconnectionTimeout() {
        console.log(`Room ${this.roomId}: Reconnection timeout - player forfeited`);
        this.stopReconnectionTimer();
        if (!this.disconnectedPlayer)
            return;
        // Remaining player wins by forfeit
        const remainingPlayer = this.getPlayers()[0];
        if (remainingPlayer && this.onForfeit) {
            this.onForfeit({
                forfeitPlayerId: this.disconnectedPlayer.clientId,
                winnerId: remainingPlayer.clientId,
                reason: "Opponent disconnected and did not reconnect in time",
            });
        }
        this.roomState = "finished";
        this.isPaused = false;
        this.disconnectedPlayer = null;
    }
    /**
     * Check if game is paused
     */
    isGamePaused() {
        return this.isPaused;
    }
    /**
     * Get disconnected player info (for reconnection)
     */
    getDisconnectedPlayer() {
        return this.disconnectedPlayer;
    }
    getPlayers() {
        return Array.from(this.players.values());
    }
    getPlayerCount() {
        return this.players.size;
    }
    isEmpty() {
        return this.players.size === 0;
    }
    getRoomState() {
        return this.roomState;
    }
    isGameStarted() {
        return this.roomState === "playing";
    }
    /**
     * Get the current player's ID (whose turn it is)
     */
    getCurrentPlayerId() {
        if (!this.gameState)
            return null;
        return serverrules_1.ServerRules.getCurrentPlayerId(this.gameState);
    }
    /**
     * Get the current player index (0 or 1)
     */
    getCurrentPlayerIndex() {
        if (!this.gameState)
            return 0;
        return this.gameState.currentPlayerIndex;
    }
    /**
     * Check if it's a specific player's turn
     */
    isPlayersTurn(playerId) {
        if (!this.gameState)
            return false;
        return serverrules_1.ServerRules.canPlayerShoot(this.gameState, playerId);
    }
    /**
     * Get current game state
     */
    getGameState() {
        return this.gameState;
    }
    /**
     * Start the waiting timer for second player
     */
    startWaitingTimer() {
        if (this.waitingTimer)
            return; // Already running
        this.waitingStartTime = Date.now();
        console.log(`Room ${this.roomId}: Waiting for second player (60 seconds)`);
        // Send updates every second
        this.waitingTimer = setInterval(() => {
            const elapsed = Date.now() - this.waitingStartTime;
            const remaining = Math.max(0, this.WAITING_TIMEOUT_MS - elapsed);
            const secondsLeft = Math.ceil(remaining / 1000);
            if (this.onWaitingUpdate) {
                this.onWaitingUpdate(secondsLeft);
            }
            if (remaining <= 0) {
                this.handleWaitingTimeout();
            }
        }, 1000);
    }
    /**
     * Stop the waiting timer
     */
    stopWaitingTimer() {
        if (this.waitingTimer) {
            clearInterval(this.waitingTimer);
            this.waitingTimer = null;
        }
    }
    /**
     * Handle waiting timeout - no second player joined
     */
    handleWaitingTimeout() {
        console.log(`Room ${this.roomId}: Waiting timeout - no second player joined`);
        this.stopWaitingTimer();
        this.roomState = "finished";
        if (this.onWaitingTimeout) {
            this.onWaitingTimeout();
        }
    }
    /**
     * Start the game when both players are ready
     */
    startGame() {
        console.log(`Room ${this.roomId}: Both players joined - starting game`);
        this.stopWaitingTimer();
        this.roomState = "playing";
        // Initialize game state with rules engine
        this.gameState = serverrules_1.ServerRules.createGameState(this.ruletype, this.playerOrder);
        // Break shot starts with ball in hand behind head string
        this.currentBallInHand = true;
        this.currentBehindHeadString = true;
        const firstPlayerId = serverrules_1.ServerRules.getCurrentPlayerId(this.gameState);
        console.log(`Room ${this.roomId}: Game started. First player: ${firstPlayerId}`);
        if (this.onGameStart) {
            this.onGameStart(firstPlayerId);
        }
    }
    getSnapshot() {
        return this.table.snapshot(this.serverTick);
    }
    isTableStationary() {
        return this.table.allStationary();
    }
    /**
     * Accept a hit command and start authoritative simulation
     * Returns null if hit is rejected, or reason string if rejected
     */
    hit(aim, shooterId) {
        if (this.isSimulating) {
            return { accepted: false, reason: "Simulation in progress" };
        }
        if (this.isPaused) {
            return { accepted: false, reason: "Game is paused - waiting for player to reconnect" };
        }
        if (!this.gameState) {
            return { accepted: false, reason: "Game not started" };
        }
        // CRITICAL: Validate it's this player's turn
        if (!serverrules_1.ServerRules.canPlayerShoot(this.gameState, shooterId)) {
            const currentPlayer = serverrules_1.ServerRules.getCurrentPlayerId(this.gameState);
            return { accepted: false, reason: `Not your turn. Waiting for ${currentPlayer}` };
        }
        // Check if game is over
        if (this.gameState.gameOver) {
            return { accepted: false, reason: "Game is over" };
        }
        // Store current shooter for rule processing after simulation
        this.currentShooterId = shooterId;
        this.currentShotAim = aim;
        // Apply hit to table
        this.table.hit(aim);
        // Start simulation loop
        this.startSimulation();
        return { accepted: true };
    }
    /**
     * Place the cue ball (ball in hand)
     */
    placeBall(pos, playerId) {
        if (this.isSimulating) {
            return { accepted: false, reason: "Simulation in progress" };
        }
        if (this.isPaused) {
            return { accepted: false, reason: "Game is paused - waiting for player to reconnect" };
        }
        // Validate it's this player's turn
        if (!this.gameState || !serverrules_1.ServerRules.canPlayerShoot(this.gameState, playerId)) {
            return { accepted: false, reason: "Not your turn" };
        }
        const position = new utils_1.Vector3(pos.x, pos.y, pos.z);
        // Validate position is on table and doesn't overlap
        if (this.table.overlapsAny(position)) {
            return { accepted: false, reason: "Invalid position - overlaps another ball" };
        }
        // TODO: Validate behind head string if required
        this.table.cueball.pos.copy(position);
        this.table.cueball.vel.set(0, 0, 0);
        this.table.cueball.rvel.set(0, 0, 0);
        return { accepted: true };
    }
    startSimulation() {
        if (this.isSimulating)
            return;
        this.isSimulating = true;
        this.lastSimTime = Date.now();
        this.accumulatedTime = 0;
        // Clear accumulated outcomes for this shot
        this.shotOutcomes = [];
        // Reset delta compression state
        this.lastBroadcastSnapshot = null;
        this.currentSnapshotInterval = this.BASE_SNAPSHOT_INTERVAL_MS;
        // Run simulation at high frequency for accurate physics
        // Broadcast snapshots at adaptive rate (10-20Hz)
        let lastSnapshotTime = Date.now();
        this.simulationInterval = setInterval(() => {
            const now = Date.now();
            const dt = (now - this.lastSimTime) / 1000;
            this.lastSimTime = now;
            this.accumulatedTime += dt;
            // Run physics steps
            while (this.accumulatedTime >= this.PHYSICS_STEP) {
                this.table.advance(this.PHYSICS_STEP);
                this.serverTick++;
                this.accumulatedTime -= this.PHYSICS_STEP;
            }
            // Broadcast snapshot at adaptive rate
            if (now - lastSnapshotTime >= this.currentSnapshotInterval) {
                lastSnapshotTime = now;
                // Use delta compression for smaller payloads
                const snapshot = this.table.deltaSnapshot(this.serverTick, this.lastBroadcastSnapshot);
                // Adaptive rate: reduce frequency when balls are slowing down
                const maxVel = Math.max(...this.table.balls.map(b => b.vel.length()));
                if (maxVel < 0.5) {
                    // Balls moving slowly - use lower rate
                    this.currentSnapshotInterval = this.SLOW_SNAPSHOT_INTERVAL_MS;
                }
                else {
                    // Balls moving fast - use full rate
                    this.currentSnapshotInterval = this.BASE_SNAPSHOT_INTERVAL_MS;
                }
                // Accumulate outcomes from this snapshot
                if (snapshot.outcomes && snapshot.outcomes.length > 0) {
                    this.shotOutcomes.push(...snapshot.outcomes);
                }
                if (this.onSnapshot) {
                    this.onSnapshot(snapshot);
                }
                // Store for delta compression
                // Need full snapshot for proper delta calculation
                this.lastBroadcastSnapshot = this.table.snapshot(this.serverTick);
                // Check if simulation complete
                if (snapshot.isStationary) {
                    this.stopSimulation();
                    // Process rules and determine turn result
                    const turnResult = this.processRules(snapshot);
                    if (this.onStationary) {
                        this.onStationary(this.lastBroadcastSnapshot, turnResult);
                    }
                }
            }
        }, 1); // Run as fast as possible for smooth physics
    }
    /**
     * Process game rules after a shot completes
     */
    processRules(snapshot) {
        if (!this.gameState || !this.currentShooterId) {
            return {
                fouled: false,
                continuesTurn: false,
                ballInHand: false,
                behindHeadString: false,
                playerWins: false,
                playerLoses: false,
                message: "No game state",
            };
        }
        // Use accumulated outcomes from the entire shot
        const outcomes = this.shotOutcomes;
        console.log(`Room ${this.roomId}: Processing shot with ${outcomes.length} outcomes`);
        console.log(`Outcomes:`, outcomes.filter(o => o.type === 'pot').map(o => ({ type: o.type, ballId: o.ballId })));
        // Process the shot through rules engine
        const turnResult = serverrules_1.ServerRules.processShot(this.gameState, snapshot, outcomes, this.currentShooterId);
        console.log(`Room ${this.roomId}: Shot processed - ${turnResult.message}`);
        console.log(`Current player after shot: ${serverrules_1.ServerRules.getCurrentPlayerId(this.gameState)}`);
        // Emit appropriate events based on result
        if (turnResult.playerWins || turnResult.playerLoses) {
            // Game over
            if (this.onGameOver) {
                const winnerId = this.gameState.winnerId;
                const loserId = this.gameState.playerIds.find(id => id !== winnerId);
                this.onGameOver({
                    winnerId,
                    loserId,
                    reason: turnResult.message,
                });
            }
            this.roomState = "finished";
        }
        else if (turnResult.fouled) {
            // Foul occurred
            if (this.onFoul) {
                this.onFoul({
                    playerId: this.currentShooterId,
                    reason: turnResult.message,
                    ballInHand: turnResult.ballInHand,
                    behindHeadString: turnResult.behindHeadString,
                    foulPoints: turnResult.foulPoints,
                });
            }
        }
        // Always emit turn change (even if same player continues)
        if (this.onTurnChange && !this.gameState.gameOver) {
            // Update tracked ball-in-hand state
            this.currentBallInHand = turnResult.ballInHand;
            this.currentBehindHeadString = turnResult.behindHeadString;
            this.onTurnChange({
                currentPlayerId: serverrules_1.ServerRules.getCurrentPlayerId(this.gameState),
                currentPlayerIndex: this.gameState.currentPlayerIndex,
                reason: turnResult.message,
                ballInHand: turnResult.ballInHand,
                behindHeadString: turnResult.behindHeadString,
                playerGroup: turnResult.playerGroup,
                opponentGroup: turnResult.opponentGroup,
            });
        }
        // Clear current shot data
        this.currentShooterId = null;
        this.currentShotAim = null;
        this.shotOutcomes = [];
        return turnResult;
    }
    stopSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        this.isSimulating = false;
    }
    /**
     * Reset the table to initial state
     */
    reset(ruletype = "eightball") {
        this.stopSimulation();
        this.table = this.createTable(ruletype);
        this.serverTick = 0;
        // Reset game state
        if (this.playerOrder.length >= 2) {
            this.gameState = serverrules_1.ServerRules.createGameState(ruletype, this.playerOrder);
        }
        this.currentShooterId = null;
        this.currentShotAim = null;
    }
    /**
     * Get current table state for reconnection
     */
    getTableState() {
        return this.table.snapshot(this.serverTick);
    }
    /**
     * Get full state for reconnection (including game state)
     */
    getFullState() {
        return {
            snapshot: this.table.snapshot(this.serverTick),
            gameState: this.gameState,
            currentPlayerId: this.getCurrentPlayerId(),
        };
    }
    /**
     * Cleanup when room is destroyed
     */
    destroy() {
        this.stopSimulation();
        this.stopWaitingTimer();
        this.stopReconnectionTimer();
        this.players.clear();
        this.playerOrder = [];
        this.gameState = null;
        this.disconnectedPlayer = null;
        this.isPaused = false;
    }
}
exports.GameRoom = GameRoom;
//# sourceMappingURL=gameroom.js.map