const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const msgpack = require('socket.io-msgpack-parser');
const Room = require('./schemas/roomSchema');
const logger = require('./logger');
const { CODES, emitSocketError } = require('./errorCodes');
require('./config/database'); // Setup MongoDB connection

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  parser: msgpack,
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  // Increase ping timeout to prevent premature disconnects
  pingTimeout: 5000,
  pingInterval: 5000,
});

// Store game rooms and player information
const rooms = new Map();

/**
 * GameRoom class with authoritative state management
 */
class GameRoom {
  constructor(tableId) {
    this.tableId = tableId;
    this.players = []; // Array of player objects with uuid, socketId, playerNumber, etc.
    this.spectators = new Set();
    this.createdAt = Date.now();
    this.gameStarted = false;
    this.gameState = null; // Server-authoritative game state
    this.currentPlayer = 1; // Player 1 or 2's turn
    this.sequence = 0; // Event sequence for ordering
    this.readyPlayers = new Set(); // Players who signaled ready
    this.lastCueUpdate = {}; // Last cue position per player
  }

  addPlayer(playerInfo) {
    if (this.players.length >= 2) {
      return { success: false, error: 'Room is full' };
    }

    // Check if player already exists (reconnection)
    const existingPlayerIndex = this.players.findIndex(p => p.uuid === playerInfo.uuid);
    if (existingPlayerIndex !== -1) {
      // Update socket ID for reconnection
      this.players[existingPlayerIndex].socketId = playerInfo.socketId;
      this.players[existingPlayerIndex].connected = true;
      return {
        success: true,
        playerNumber: this.players[existingPlayerIndex].playerNumber,
        isReconnection: true,
      };
    }

    // Assign player number based on order
    const playerNumber = this.players.length + 1;
    const player = {
      ...playerInfo,
      playerNumber,
      joinedAt: Date.now(),
      connected: true,
      ready: false,
      score: 0, // server-tracked score
      group: null, // 'solids' | 'stripes' | null
    };

    this.players.push(player);
    return { success: true, playerNumber, isReconnection: false };
  }

  addSpectator(socketId) {
    this.spectators.add(socketId);
  }

  removePlayer(socketId) {
    const player = this.players.find(p => p.socketId === socketId);
    if (player) {
      player.connected = false;
    }
    this.spectators.delete(socketId);
  }

  getPlayerBySocketId(socketId) {
    return this.players.find(p => p.socketId === socketId);
  }

  getPlayerByUuid(uuid) {
    return this.players.find(p => p.uuid === uuid);
  }

  isEmpty() {
    const connectedPlayers = this.players.filter(p => p.connected);
    return connectedPlayers.length === 0 && this.spectators.size === 0;
  }

  getPlayerCount() {
    return this.players.length;
  }

  getConnectedPlayerCount() {
    return this.players.filter(p => p.connected).length;
  }

  isFull() {
    return this.players.length >= 2;
  }

  canStartGame() {
    return this.players.length === 2 && !this.gameStarted && this.getConnectedPlayerCount() === 2;
  }

  setReady(uuid) {
    this.readyPlayers.add(uuid);
    const player = this.getPlayerByUuid(uuid);
    if (player) {
      player.ready = true;
    }
  }

  allPlayersReady() {
    return this.players.length === 2 && this.readyPlayers.size === 2;
  }

  nextSequence() {
    return ++this.sequence;
  }

  switchTurn() {
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    return this.currentPlayer;
  }

  getCurrentPlayerUuid() {
    const player = this.players.find(p => p.playerNumber === this.currentPlayer);
    return player ? player.uuid : null;
  }

  isPlayerTurn(uuid) {
    return this.getCurrentPlayerUuid() === uuid;
  }

  getOpponent(uuid) {
    return this.players.find(p => p.uuid !== uuid);
  }

  updateGameState(state) {
    this.gameState = {
      ...state,
      sequence: this.sequence,
      timestamp: Date.now(),
    };
  }

  // Utility to detect potted balls between previous and current ball lists
  detectPottedBalls(prevBalls = [], newBalls = []) {
    const prevMap = new Map();
    prevBalls.forEach((b) => prevMap.set(b.id, b));
    const potted = [];
    newBalls.forEach((b) => {
      const prev = prevMap.get(b.id);
      if (prev && prev.state !== 'InPocket' && b.state === 'InPocket') {
        potted.push(b.id);
      }
    });
    return potted;
  }

  updateCuePosition(uuid, cueData) {
    this.lastCueUpdate[uuid] = {
      ...cueData,
      timestamp: Date.now()
    };
  }
}

io.on('connection', (socket) => {
  logger.info(null, '✅ Client connected', { 
    socketId: socket.id,
    transport: socket.conn.transport.name,
    remoteAddress: socket.handshake.address 
  });

  // Log transport upgrade
  socket.conn.on('upgrade', (transport) => {
    logger.info(null, '🔄 Transport upgraded', { 
      socketId: socket.id, 
      newTransport: transport.name 
    });
  });

  // Log disconnection with reason
  socket.on('disconnect', (reason) => {
    logger.info(null, '🔌 Client disconnected', { 
      socketId: socket.id, 
      reason 
    });

    // Find and update rooms
    for (const [tableId, room] of rooms.entries()) {
      const player = room.getPlayerBySocketId(socket.id);
      const isSpectator = room.spectators.has(socket.id);
      
      if (player || isSpectator) {
        room.removePlayer(socket.id);

        // Notify other players
        if (player) {
          io.to(tableId).emit('player-left', {
            clientId: player.uuid,
            username: player.name,
            playerNumber: player.playerNumber,
            playerCount: room.getConnectedPlayerCount()
          });

          logger.info(tableId, 'Player disconnected', {
            username: player.name,
            playerNumber: player.playerNumber,
            connectedPlayers: room.getConnectedPlayerCount(),
            reason
          });

          // If game was in progress, notify about potential forfeit
          if (room.gameStarted && room.getConnectedPlayerCount() === 1) {
            // Give some time for reconnection before declaring forfeit
            setTimeout(() => {
              const currentRoom = rooms.get(tableId);
              if (currentRoom && currentRoom.getConnectedPlayerCount() === 1) {
                const remainingPlayer = currentRoom.players.find(p => p.connected);
                if (remainingPlayer) {
                  io.to(tableId).emit('gameOver', {
                    winner: remainingPlayer.playerNumber,
                    reason: 'opponent_disconnected'
                  });
                }
              }
            }, 30000); // 30 second grace period for reconnection
          }
        } else {
          logger.info(tableId, 'Spectator left room');
        }

        // Clean up empty rooms after grace period
        setTimeout(() => {
          const currentRoom = rooms.get(tableId);
          if (currentRoom && currentRoom.isEmpty()) {
            rooms.delete(tableId);
            logger.info(tableId, 'Room deleted (empty)');
          }
        }, 60000);

        break;
      }
    }
  });

  socket.on('error', (error) => {
    logger.error(null, '❌ Socket error', { 
      socketId: socket.id, 
      error: error.message 
    });
  });

  // ========== JOIN TABLE ==========
  socket.on('join-table', async ({ tableId, clientId, username, spectator }) => {
    logger.info(tableId, 'Join table request', { 
      socketId: socket.id, 
      clientId, 
      username, 
      spectator 
    });

    // Get or create room
    if (!rooms.has(tableId)) {
      rooms.set(tableId, new GameRoom(tableId));
      logger.info(tableId, 'Created new game room');
    }

    const room = rooms.get(tableId);

    if (spectator) {
      room.addSpectator(socket.id);
      socket.join(tableId);
      
      socket.emit('joined', {
        success: true,
        tableId,
        clientId,
        username,
        spectator: true,
        playerCount: room.getPlayerCount(),
        role: 'spectator',
        gameStarted: room.gameStarted
      });

      // Send current game state to spectator if game in progress
      if (room.gameState) {
        socket.emit('game-state', room.gameState);
      }

      logger.info(tableId, 'Spectator joined');
      return;
    }

    // Validate player against database
    try {
      const dbRoom = await Room.findOne({ gameSessionUuid: tableId });
      if (dbRoom) {
        const validPlayer = dbRoom.players.find(p => p.uuid === clientId);
        if (!validPlayer) {
          logger.warn(tableId, `Unauthorized player ${clientId} attempting to join`);
          socket.emit('joined', {
            success: false,
            error: 'Unauthorized: UUID not registered for this game',
            tableId
          });
          return;
        }

        // Use the name from DB if client didn't provide one
        if (!username || username.trim() === '') {
          username = validPlayer.name || '';
        }
      }
    } catch (err) {
      logger.error(tableId, 'Database error during join validation:', err);
    }

    // Try to add as player
    const playerInfo = {
      uuid: clientId,
      name: username,
      socketId: socket.id
    };

    const result = room.addPlayer(playerInfo);
    
    if (!result.success) {
      socket.emit('joined', {
        success: false,
        error: result.error,
        tableId
      });
      logger.warn(tableId, result.error);
      return;
    }

    socket.join(tableId);

    // Get opponent info if exists
    const opponent = room.getOpponent(clientId);

    // Send joined confirmation with player number
    socket.emit('joined', {
      success: true,
      tableId,
      clientId,
      username,
      spectator: false,
      playerCount: room.getPlayerCount(),
      playerNumber: result.playerNumber,
      isFirstPlayer: result.playerNumber === 1,
      role: 'player',
      opponentName: opponent?.name || null,
      opponentConnected: opponent?.connected || false,
      waitingForOpponent: room.getPlayerCount() < 2
    });

    logger.info(tableId, `Player joined as Player ${result.playerNumber}`, {
      username,
      playerCount: room.getPlayerCount()
    });

    // Notify others about new player
    socket.to(tableId).emit('player-joined', {
      clientId,
      username,
      spectator: false,
      playerCount: room.getPlayerCount(),
      playerNumber: result.playerNumber
    });

    // If both players are now present, emit game-ready (but don't start yet)
    if (room.canStartGame()) {
      logger.info(tableId, '🎮 Both players connected - waiting for ready signals');
      
      // Emit game ready event to all players
      io.to(tableId).emit('game-ready', {
        players: room.players.map(p => ({
          playerNumber: p.playerNumber,
          name: p.name,
          uuid: p.uuid
        })),
        message: 'Both players connected. Waiting for ready signals.',
        firstPlayer: 1
      });
    }
  });

  // ========== PLAYER READY ==========
  socket.on('ready', ({ tableId }) => {
    const room = rooms.get(tableId);
    if (!room) return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    room.setReady(player.uuid);
    logger.info(tableId, `Player ${player.playerNumber} is ready`);

    // Check if all players are ready to start
    if (room.allPlayersReady() && !room.gameStarted) {
      room.gameStarted = true;
      room.currentPlayer = 1;
      
      logger.info(tableId, '🎮 All players ready - starting game!');
      
      // Emit initial score and group state (server authoritative)
      io.to(tableId).emit('score-update', {
        scores: room.players.reduce((acc, p) => { acc[p.playerNumber] = 0; return acc; }, {})
      });
      io.to(tableId).emit('group-update', {
        groups: room.players.reduce((acc, p) => { acc[p.playerNumber] = null; return acc; }, {})
      });
      
      // Emit game start event
      io.to(tableId).emit('game-start', {
        firstPlayer: 1,
        tableState: room.gameState,
        timestamp: Date.now()
      });
    }
  });

  // ========== CUE AIMING (Real-time sync) ==========
  socket.on('cue-aim', ({ tableId, angle, power, offset, pos }) => {
    const room = rooms.get(tableId);
    if (!room) return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    // Store cue position on server
    room.updateCuePosition(player.uuid, { angle, power, offset, pos });

    // Broadcast to opponent and spectators (not to sender)
    socket.to(tableId).emit('cue-update', {
      playerId: player.uuid,
      playerNumber: player.playerNumber,
      angle,
      power,
      offset,
      pos,
      timestamp: Date.now()
    });
  });

  // ========== SHOT REQUEST (Server validates) ==========
  socket.on('shot-request', ({ tableId, tableState, power, angle, offset, timestamp }) => {
    const room = rooms.get(tableId);
    if (!room) {
      socket.emit('shot-rejected', { reason: 'Room not found', correctState: null });
      return;
    }

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) {
      socket.emit('shot-rejected', { reason: 'Player not in room', correctState: null });
      return;
    }

    // Validate it's the player's turn
    if (!room.isPlayerTurn(player.uuid)) {
      logger.warn(tableId, `Player ${player.uuid} tried to shoot but it's not their turn`);
      socket.emit('shot-rejected', { 
        reason: 'Not your turn', 
        correctState: room.gameState 
      });
      return;
    }

    // Accept the shot and update server state
    const sequence = room.nextSequence();
    // Capture previous balls for pot detection
    const prevBalls = room.gameState && room.gameState.balls ? room.gameState.balls : [];
    room.updateGameState(tableState);
    
    // Detect potted balls and update server-side groups/scores
    const pottedIds = room.detectPottedBalls(prevBalls, tableState.balls || []);
    if (pottedIds && pottedIds.length > 0) {
      // Basic scoring: increment player's score by potted count
      player.score = (player.score || 0) + pottedIds.length;

      // If groups not assigned and this is eightball-like (1-7 solids, 9-15 stripes), assign groups
      if (player.group === null) {
        // Find first potted ball that is not the 8-ball
        const ballId = pottedIds.find(id => id !== 8);
        if (ballId && ballId <= 7) {
          player.group = 'solids';
          const opp = room.getOpponent(player.uuid);
          if (opp) opp.group = 'stripes';
        } else if (ballId && ballId >= 9) {
          player.group = 'stripes';
          const opp = room.getOpponent(player.uuid);
          if (opp) opp.group = 'solids';
        }
      }

      // Emit score update and group update for UI
      io.to(tableId).emit('score-update', {
        scores: this.players.reduce((acc, p) => {
          acc[p.playerNumber] = p.score || 0;
          return acc;
        }, {})
      });

      io.to(tableId).emit('group-update', {
        groups: this.players.reduce((acc, p) => {
          acc[p.playerNumber] = p.group || null;
          return acc;
        }, {})
      });
    }
    
    logger.info(tableId, `Shot validated for Player ${player.playerNumber}`, {
      power,
      angle,
      sequence,
      pottedIds
    });

    // Broadcast validated shot to all players (including sender for confirmation)
    io.to(tableId).emit('shot-validated', {
      accepted: true,
      tableState,
      playerId: player.uuid,
      playerNumber: player.playerNumber,
      sequence,
      timestamp: Date.now(),
      potted: pottedIds
    });

    // NOTE: Turn change is now handled by shot-complete event
    // The shooting player will report when balls stop and whether they pot/foul
  });

  // ========== SHOT COMPLETE (Client reports outcome) ==========
  socket.on('shot-complete', ({ tableId, potted, fouled, continuesTurn }) => {
    const room = rooms.get(tableId);
    if (!room) return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    // Only the shooting player can report shot completion
    if (!room.isPlayerTurn(player.uuid)) {
      logger.warn(tableId, `Player ${player.uuid} tried to report shot-complete but it's not their turn`);
      return;
    }

    logger.info(tableId, `Shot complete for Player ${player.playerNumber}`, {
      potted,
      fouled,
      continuesTurn
    });

    if (continuesTurn && !fouled) {
      // Player continues their turn (potted a ball, no foul)
      io.to(tableId).emit('turn-continues', {
        currentPlayer: player.playerNumber,
        playerId: player.uuid,
        reason: potted ? 'ball-potted' : 'continue'
      });
    } else {
      // Switch turn
      const newCurrentPlayer = room.switchTurn();
      const currentPlayerUuid = room.getCurrentPlayerUuid();

      logger.info(tableId, `Turn changed to Player ${newCurrentPlayer} (${currentPlayerUuid})`);

      io.to(tableId).emit('turn-change', {
        currentPlayer: newCurrentPlayer,
        playerId: currentPlayerUuid,
        reason: fouled ? 'foul' : 'no-pot',
        placeRequired: fouled,
        placePlayerId: fouled ? currentPlayerUuid : null
      });
    }
  });

  // ========== BALL PLACEMENT ==========
  socket.on('place-ball', ({ tableId, position }) => {
    const room = rooms.get(tableId);
    if (!room) return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    // Validate it's the player's turn
    if (!room.isPlayerTurn(player.uuid)) {
      logger.warn(tableId, `Player ${player.uuid} tried to place ball but it's not their turn`);
      return;
    }

    // Broadcast ball placement to all
    io.to(tableId).emit('ball-positions', {
      balls: [{ id: 0, pos: position, vel: { x: 0, y: 0, z: 0 }, state: 'placed' }],
      timestamp: Date.now()
    });

    logger.info(tableId, `Player ${player.playerNumber} placed cue ball`, { position });
  });

  // ========== TURN CHANGE ==========
  socket.on('turn-complete', ({ tableId, nextPlayer }) => {
    const room = rooms.get(tableId);
    if (!room) return;

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    // Only the server decides turn changes
    const newCurrentPlayer = room.switchTurn();
    const currentPlayerUuid = room.getCurrentPlayerUuid();

    io.to(tableId).emit('turn-change', {
      currentPlayer: newCurrentPlayer,
      playerId: currentPlayerUuid,
      reason: 'shot-complete'
    });

    logger.info(tableId, `Turn changed to Player ${newCurrentPlayer}`);
  });

  // ========== GAME STATE SYNC REQUEST ==========
  socket.on('request-state', ({ tableId }) => {
    const room = rooms.get(tableId);
    if (!room || !room.gameState) return;

    socket.emit('game-state', room.gameState);
  });
});

// --- REST API Endpoints --- //

/**
 * Create a new game room
 * POST /api/createRoom
 * Body: { room: { gameSessionUuid, name, ruletype }, players: [{ uuid, name }] }
 */
app.post('/api/createRoom', async (req, res) => {
  logger.info(null, '=========Received request to create room=========');
  try {
    const { room, players } = req.body;

    if (!room || !room.gameSessionUuid || !room.name) {
      return res.status(400).json({ 
        status: false, 
        errorCode: CODES.MISSING_GAME_SESSION_UUID.code, 
        message: 'Missing required room data' 
      });
    }

    if (!players || players.length !== 2) {
      return res.status(400).json({ 
        status: false, 
        errorCode: CODES.INVALID_GAME_SESSION.code, 
        message: 'Exactly 2 players required' 
      });
    }

    // Check if room already exists
    const existingRoom = await Room.findOne({ gameSessionUuid: room.gameSessionUuid });
    if (existingRoom) {
      return res.status(400).json({ 
        status: false, 
        errorCode: CODES.GAME_SESSION_EXISTS.code, 
        message: 'Game session already exists' 
      });
    }

    logger.info(room.gameSessionUuid, `Creating room: ${room.gameSessionUuid}`);
    logger.debug(room.gameSessionUuid, 'Players:', players);

    // Determine game type from ruletype
    const ruleTypeMap = {
      'nineball': 'NINEBALL',
      'eightball': 'EIGHTBALL',
      'snooker': 'SNOOKER',
      'threecushion': 'THREECUSHION',
      'fourteenone': 'FOURTEENONE'
    };
    const gameType = ruleTypeMap[room.ruletype?.toLowerCase()] || 'EIGHTBALL';

    // Prepare room data
    const roomData = {
      gameSessionUuid: room.gameSessionUuid,
      name: room.name,
      gameType: gameType,
      players: players.map(player => ({
        uuid: player.uuid,
        name: player.name,
        winState: 'DEFEATED'
      })),
      createdDate: new Date()
    };

    const newRoom = new Room(roomData);
    await newRoom.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const responseData = {
      status: true,
      message: 'success',
      payload: {
        gameSessionUuid: newRoom.gameSessionUuid,
        name: newRoom.name,
        gameType: newRoom.gameType,
        createDate: newRoom.createdDate,
        // Minimal links — player name and websocket server are NOT included in the URL
        link1: `${process.env.FRONTEND_URL || frontendUrl}/?gameSessionUuid=${newRoom.gameSessionUuid}&gameStateId=${newRoom._id}&uuid=${players[0].uuid}`,
        link2: `${process.env.FRONTEND_URL || frontendUrl}/?gameSessionUuid=${newRoom.gameSessionUuid}&gameStateId=${newRoom._id}&uuid=${players[1]?.uuid || ''}`
      }
    };

    logger.info(newRoom.gameSessionUuid, `Room created successfully: ${newRoom.gameSessionUuid}`);
    res.status(200).json(responseData);
  } catch (err) {
    logger.error(null, 'Error creating room:', err.message || err);
    res.status(500).json({ 
      status: false, 
      errorCode: CODES.SERVER_ERROR.code, 
      message: 'Internal Server Error' 
    });
  }
});

/**
 * Get game session details
 * GET /api/getGameDetails?gameSessionUuid=xxx
 */
app.get('/api/getGameDetails', async (req, res) => {
  try {
    const { gameSessionUuid } = req.query;
    
    if (!gameSessionUuid) {
      return res.status(400).json({ 
        status: false, 
        errorCode: CODES.MISSING_GAME_SESSION_UUID.code, 
        message: 'Missing gameSessionUuid' 
      });
    }

    const room = await Room.findOne({ gameSessionUuid });
    if (!room) {
      logger.warn(gameSessionUuid, `Room not found for gameSessionUuid: ${gameSessionUuid}`);
      return res.status(404).json({ 
        status: false, 
        errorCode: CODES.ROOM_NOT_FOUND.code, 
        message: 'Room not found' 
      });
    }

    logger.info(gameSessionUuid, `Game details retrieved for session: ${gameSessionUuid}`);
    return res.status(200).json({ 
      status: true, 
      gameDetails: room, 
      message: 'Game details retrieved successfully' 
    });  } catch (error) {
    logger.error(null, 'Error retrieving game details:', error);
    return res.status(500).json({ 
      status: false, 
      message: 'Internal Server Error', 
      errorCode: CODES.SERVER_ERROR.code 
    });
  }
});

/**
 * Get player details (by session + uuid)
 * GET /api/getPlayerDetails?gameSessionUuid=xxx&uuid=yyy
 */
app.get('/api/getPlayerDetails', async (req, res) => {
  try {
    const { gameSessionUuid, uuid } = req.query;
    if (!gameSessionUuid || !uuid) {
      return res.status(400).json({ status: false, message: 'Missing parameters', errorCode: CODES.MISSING_GAME_SESSION_UUID.code });
    }

    const room = await Room.findOne({ gameSessionUuid });
    if (!room) {
      return res.status(404).json({ status: false, message: 'Room not found', errorCode: CODES.ROOM_NOT_FOUND.code });
    }

    const player = room.players.find(p => p.uuid === uuid);
    if (!player) {
      return res.status(404).json({ status: false, message: 'Player not found in this session', errorCode: CODES.UNAUTHORIZED.code });
    }

    return res.status(200).json({ status: true, player: { uuid: player.uuid, name: player.name, winState: player.winState } });
  } catch (error) {
    logger.error(null, 'Error retrieving player details:', error);
    return res.status(500).json({ status: false, message: 'Internal Server Error', errorCode: CODES.SERVER_ERROR.code });
  }
});  

/**
 * Handle user deliberately leaving the game
 * POST /api/userBack
 * Body: { gameSessionUuid, uuid }
 */
app.post('/api/userBack', async (req, res) => {
  try {
    const { gameSessionUuid, uuid } = req.body;
    
    if (!gameSessionUuid || !uuid) {
      return res.status(400).json({ 
        status: false, 
        errorCode: CODES.MISSING_GAME_SESSION_UUID.code, 
        message: 'Missing gameSessionUuid or uuid' 
      });
    }

    logger.info(gameSessionUuid, `User ${uuid} leaving game ${gameSessionUuid}`);

    const room = await Room.findOne({ gameSessionUuid });
    if (!room) {
      return res.status(404).json({ 
        status: false, 
        errorCode: CODES.ROOM_NOT_FOUND.code, 
        message: 'Room not found' 
      });
    }

    // Verify the uuid is a valid player in this game
    const validPlayer = room.players.find(player => player.uuid === uuid);
    if (!validPlayer) {
      return res.status(403).json({ 
        status: false, 
        errorCode: CODES.UNAUTHORIZED.code, 
        message: 'Unauthorized: UUID not a player in this game session' 
      });
    }

    // If game is already finished, don't process
    if (room.winnerSent || room.gameStatus !== 'ACTIVE') {
      return res.status(200).json({ 
        status: true, 
        message: 'Game already ended' 
      });
    }

    // Update room status - mark the leaving player as DROPPED, other player as WON
    room.players.forEach(player => {
      if (player.uuid === uuid) {
        player.winState = 'DROPPED';
        logger.info(gameSessionUuid, `Player ${player.uuid} winState set to DROPPED (userBack)`);
      } else {
        player.winState = 'WON';
        logger.info(gameSessionUuid, `Player ${player.uuid} winState set to WON (userBack)`);
      }
    });
    room.gameStatus = 'DROPPED';
    room.winnerSent = true;
    await room.save();

    // Find the winner's player number from the in-memory rooms
    let winnerPlayerNumber = 1;
    const inMemoryRoom = rooms.get(gameSessionUuid);
    if (inMemoryRoom) {
      const players = Array.from(inMemoryRoom.players.values());
      const leavingPlayer = players.find(p => p.uuid === uuid);
      if (leavingPlayer && leavingPlayer.playerNumber) {
        winnerPlayerNumber = leavingPlayer.playerNumber === 1 ? 2 : 1;
      }
    }

    // Notify all clients in the game room
    logger.info(gameSessionUuid, `=========Game finished with reason: user_left=========`);
    io.to(gameSessionUuid).emit("gameOver", { 
      winner: winnerPlayerNumber, 
      reason: 'player_left' 
    });

    // Clean up in-memory room
    if (rooms.has(gameSessionUuid)) {
      rooms.delete(gameSessionUuid);
      logger.info(gameSessionUuid, `Session cleaned up after user left`);
    }

    return res.status(200).json({ 
      status: true, 
      message: 'Game ended successfully' 
    });
  } catch (error) {
    logger.error(null, 'Error in userBack endpoint:', error);
    return res.status(500).json({ 
      status: false, 
      message: 'Internal Server Error', 
      errorCode: CODES.SERVER_ERROR.code 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

// Get rooms info endpoint
app.get('/rooms', (req, res) => {
  const roomsInfo = Array.from(rooms.entries()).map(([tableId, room]) => ({
    tableId,
    playerCount: room.getPlayerCount(),
    spectatorCount: room.spectators.size,
    createdAt: room.createdAt
  }));
  
  res.json({ rooms: roomsInfo });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, `Billiards server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
