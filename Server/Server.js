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
  }
});

// Store game rooms and player information
const rooms = new Map();

class GameRoom {
  constructor(tableId) {
    this.tableId = tableId;
    this.players = []; // Array of player objects with uuid, socketId, playerNumber, etc.
    this.spectators = new Set();
    this.createdAt = Date.now();
    this.gameStarted = false;
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
      return { 
        success: true, 
        playerNumber: this.players[existingPlayerIndex].playerNumber,
        isReconnection: true 
      };
    }
    
    // Assign player number based on order
    const playerNumber = this.players.length + 1;
    const player = {
      ...playerInfo,
      playerNumber,
      joinedAt: Date.now()
    };
    
    this.players.push(player);
    return { success: true, playerNumber, isReconnection: false };
  }

  addSpectator(socketId) {
    this.spectators.add(socketId);
  }

  removePlayer(socketId) {
    this.players = this.players.filter(p => p.socketId !== socketId);
    this.spectators.delete(socketId);
  }

  getPlayerBySocketId(socketId) {
    return this.players.find(p => p.socketId === socketId);
  }

  getPlayerByUuid(uuid) {
    return this.players.find(p => p.uuid === uuid);
  }

  isEmpty() {
    return this.players.length === 0 && this.spectators.size === 0;
  }

  getPlayerCount() {
    return this.players.length;
  }

  isFull() {
    return this.players.length >= 2;
  }

  canStartGame() {
    return this.players.length === 2 && !this.gameStarted;
  }
}

io.on('connection', (socket) => {
  logger.info(null, 'Client connected', { socketId: socket.id });

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
        role: 'spectator'
      });

      // Notify others
      socket.to(tableId).emit('player-joined', {
        clientId,
        username,
        spectator: true,
        playerCount: room.getPlayerCount()
      });

      logger.info(tableId, 'Spectator joined');
    } else {
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
            username = validPlayer.name || ''
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
        role: 'player'
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

      // If both players are now present, notify them to start the game
      if (room.canStartGame()) {
        room.gameStarted = true;
        logger.info(tableId, '🎮 Both players connected - game can start!');
        
        // Emit game ready event to all players
        io.to(tableId).emit('game-ready', {
          players: room.players.map(p => ({
            playerNumber: p.playerNumber,
            name: p.name,
            uuid: p.uuid
          })),
          message: 'Both players connected. Game starting!'
        });
        
        // Also emit a begin event to trigger the game start
        setTimeout(() => {
          io.to(tableId).emit('game-event', JSON.stringify({
            type: 'begin',
            clientId: room.players[0].uuid,
            timestamp: Date.now()
          }));
        }, 500);
      }
    }
  });

  socket.on('game-event', ({ tableId, event }) => {
    if (!tableId || !event) {
      logger.warn(null, 'Invalid game event data', { socketId: socket.id });
      return;
    }

    const room = rooms.get(tableId);
    if (!room) {
      logger.warn(tableId, 'Room not found', { socketId: socket.id });
      return;
    }

    // Broadcast the event to all other clients in the room
    socket.to(tableId).emit('game-event', event);
    
    logger.debug(tableId, 'Game event broadcasted', { 
      socketId: socket.id,
      eventType: typeof event === 'string' ? 'string' : event.type 
    });
  });

  socket.on('disconnect', () => {
    logger.info(null, 'Client disconnected', { socketId: socket.id });

    // Find and clean up rooms
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
            playerCount: room.getPlayerCount()
          });

          logger.info(tableId, 'Player left room', {
            username: player.name,
            playerNumber: player.playerNumber,
            playerCount: room.getPlayerCount()
          });
        } else {
          logger.info(tableId, 'Spectator left room');
        }

        // Clean up empty rooms
        if (room.isEmpty()) {
          rooms.delete(tableId);
          logger.info({ tableId }, 'Room deleted (empty)');
        }

        break;
      }
    }
  });

  socket.on('error', (error) => {
    logger.error(null, 'Socket error', { socketId: socket.id, error });
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
