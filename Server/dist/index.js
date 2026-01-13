"use strict";
/**
 * Billiards Authoritative Game Server
 *
 * Socket.IO server with:
 * - Server-authoritative physics simulation
 * - 20 snapshots/second during motion
 * - Room-based multiplayer with MongoDB persistence
 * - REST API for room creation and management
 * - Exact physics match with client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const roommanager_1 = require("./game/roommanager");
const database_1 = require("./config/database");
const roomSchema_1 = require("./schemas/roomSchema");
const errorCodes_1 = require("./errorCodes");
dotenv_1.default.config();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";
// Configure CORS origins
const allowedOrigins = [
    FRONTEND_URL,
    process.env.GAMEON_FRONTEND_URL,
    "http://localhost:8080",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
].filter(Boolean);
class BilliardsServer {
    constructor() {
        // Map socket IDs to room/client info
        this.socketRooms = new Map();
        this.app = (0, express_1.default)();
        this.httpServer = (0, http_1.createServer)(this.app);
        // Configure Socket.IO
        this.io = new socket_io_1.Server(this.httpServer, {
            parser: require("socket.io-msgpack-parser"),
            cors: {
                origin: allowedOrigins,
                methods: ["GET", "POST"],
                credentials: true,
            },
            pingInterval: 15000,
            pingTimeout: 10000,
            transports: ["polling", "websocket"],
            allowEIO3: true,
        });
        this.roomManager = new roommanager_1.RoomManager();
        this.setupMiddleware();
        this.setupRestAPI();
        this.setupSocketHandlers();
    }
    setupMiddleware() {
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
        this.app.use((0, cors_1.default)({
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true,
        }));
    }
    setupRestAPI() {
        // Health check endpoint
        this.app.get("/health", (req, res) => {
            res.json({
                status: "ok",
                timestamp: Date.now(),
                dbConnected: (0, database_1.isDBConnected)(),
            });
        });
        // Create Room Endpoint
        this.app.post("/api/createRoom", async (req, res) => {
            console.log("=========Received request to create room=========");
            if (!(0, database_1.isDBConnected)()) {
                return res.status(503).json({
                    status: false,
                    errorCode: "DB_NOT_CONNECTED",
                    message: "Database not connected",
                });
            }
            try {
                const { room, players } = req.body;
                if (!room || !room.gameSessionUuid) {
                    return res.status(400).json({
                        status: false,
                        errorCode: errorCodes_1.CODES.MISSING_GAME_SESSION_UUID.code,
                        message: "Missing gameSessionUuid",
                    });
                }
                const existingRoom = await roomSchema_1.Room.findOne({
                    gameSessionUuid: room.gameSessionUuid,
                });
                if (existingRoom) {
                    return res.status(400).json({
                        status: false,
                        errorCode: errorCodes_1.CODES.GAME_SESSION_EXISTS.code,
                        message: "Game session already exists",
                    });
                }
                console.log(`Creating room: ${room.gameSessionUuid}`);
                console.log("Players:", players);
                // Prepare room data
                const roomData = {
                    gameSessionUuid: room.gameSessionUuid,
                    name: room.name || `Billiards Room ${room.gameSessionUuid}`,
                    players: players.map((player) => ({
                        ...player,
                        winState: "DEFEATED",
                        ready: player.ready === "true" || player.ready === true,
                    })),
                    createdDate: new Date(),
                    ruletype: room.ruletype || "eightball",
                    gameType: room.tournament === 1
                        ? "TOURNAMENT"
                        : "MULTIPLAYER",
                    matchId: room.matchId,
                };
                const newRoom = new roomSchema_1.Room(roomData);
                await newRoom.save();
                const responseData = {
                    status: true,
                    message: "success",
                    payload: {
                        gameSessionUuid: newRoom.gameSessionUuid,
                        matchId: newRoom.matchId,
                        name: newRoom.name,
                        createDate: newRoom.createdDate,
                        link1: `${FRONTEND_URL}/?gameSessionUuid=${newRoom.gameSessionUuid}&gameStateId=${newRoom._id}&uuid=${players[0]?.uuid || ""}`,
                        link2: `${FRONTEND_URL}/?gameSessionUuid=${newRoom.gameSessionUuid}&gameStateId=${newRoom._id}&uuid=${players[1]?.uuid || ""}`,
                    },
                };
                console.log(`Room created successfully: ${newRoom.gameSessionUuid}, players: ${players.length}`);
                res.status(200).json(responseData);
            }
            catch (err) {
                console.error("Error creating room:", err.message || err);
                res.status(500).json({
                    status: false,
                    errorCode: errorCodes_1.CODES.SERVER_ERROR.code,
                    message: "Internal Server Error",
                });
            }
        });
        // Get Game Details Endpoint
        this.app.get("/api/getGameDetails", async (req, res) => {
            try {
                const { gameSessionUuid } = req.query;
                if (!gameSessionUuid) {
                    return res.status(400).json({
                        status: false,
                        errorCode: errorCodes_1.CODES.MISSING_GAME_SESSION_UUID.code,
                        message: "Missing gameSessionUuid",
                    });
                }
                const room = await roomSchema_1.Room.findOne({ gameSessionUuid });
                if (!room) {
                    console.warn(`Room not found for gameSessionUuid: ${gameSessionUuid}`);
                    return res.status(404).json({
                        status: false,
                        errorCode: errorCodes_1.CODES.ROOM_NOT_FOUND.code,
                        message: "Room not found",
                    });
                }
                console.log(`Game details retrieved for session: ${gameSessionUuid}`);
                return res.status(200).json({
                    status: true,
                    gameDetails: room,
                    message: "Game details retrieved successfully",
                });
            }
            catch (error) {
                console.error("Error retrieving game details:", error);
                return res.status(500).json({
                    status: false,
                    message: "Internal Server Error",
                    errorCode: errorCodes_1.CODES.SERVER_ERROR.code,
                });
            }
        });
        // Update Game Type Endpoint
        this.app.post("/api/updateGameType", async (req, res) => {
            try {
                const { gameSessionUuid, gameType } = req.body;
                if (!gameSessionUuid || !gameType) {
                    return res.status(400).json({
                        status: false,
                        errorCode: errorCodes_1.CODES.MISSING_GAME_TYPE.code,
                        message: "Missing gameSessionUuid or gameType",
                    });
                }
                const room = await roomSchema_1.Room.findOne({ gameSessionUuid });
                if (!room) {
                    return res.status(404).json({
                        status: false,
                        errorCode: errorCodes_1.CODES.ROOM_NOT_FOUND.code,
                        message: "Room not found",
                    });
                }
                room.gameType = gameType;
                await room.save();
                console.log(`Game type updated to ${gameType}`);
                return res
                    .status(200)
                    .json({ status: true, message: "Game type updated successfully" });
            }
            catch (error) {
                console.error("Error updating game type:", error);
                return res.status(500).json({
                    status: false,
                    message: "Internal Server Error",
                    errorCode: errorCodes_1.CODES.SERVER_ERROR.code,
                });
            }
        });
        // User Back (Leave Game) Endpoint
        this.app.post("/api/userBack", async (req, res) => {
            try {
                const { gameSessionUuid, uuid } = req.body;
                if (!gameSessionUuid || !uuid) {
                    return res.status(400).json({
                        status: false,
                        errorCode: errorCodes_1.CODES.MISSING_GAME_SESSION_UUID.code,
                        message: "Missing gameSessionUuid or uuid",
                    });
                }
                console.log(`User ${uuid} leaving game ${gameSessionUuid}`);
                const room = await roomSchema_1.Room.findOne({ gameSessionUuid });
                if (!room) {
                    return res.status(404).json({
                        status: false,
                        errorCode: errorCodes_1.CODES.ROOM_NOT_FOUND.code,
                        message: "Room not found",
                    });
                }
                // Verify the uuid is a valid player in this game
                const validPlayer = room.players.find((player) => player.uuid === uuid);
                if (!validPlayer) {
                    return res.status(403).json({
                        status: false,
                        errorCode: errorCodes_1.CODES.UNAUTHORIZED.code,
                        message: "Unauthorized: UUID not a player in this game session",
                    });
                }
                // If game is already finished, don't process
                if (room.winnerSent || room.gameStatus !== "ACTIVE") {
                    return res
                        .status(200)
                        .json({ status: true, message: "Game already ended" });
                }
                // Update room status - mark the leaving player as DROPPED, other player as WON
                room.players.forEach((player) => {
                    if (player.uuid === uuid) {
                        player.winState = "DROPPED";
                        console.log(`Player ${player.uuid} winState set to DROPPED (userBack)`);
                    }
                    else {
                        player.winState = "WON";
                        console.log(`Player ${player.uuid} winState set to WON (userBack)`);
                    }
                });
                room.gameStatus = "DROPPED";
                room.winnerSent = true;
                await room.save();
                // Notify all clients in the game room via Socket.IO
                this.io.to(gameSessionUuid).emit("gameOver", {
                    reason: "player_left",
                    winnerUuid: room.players.find((p) => p.winState === "WON")?.uuid,
                });
                console.log(`Session cleaned up after user left`);
                return res
                    .status(200)
                    .json({ status: true, message: "Game ended successfully" });
            }
            catch (error) {
                console.error("Error in userBack endpoint:", error);
                return res.status(500).json({
                    status: false,
                    message: "Internal Server Error",
                    errorCode: errorCodes_1.CODES.SERVER_ERROR.code,
                });
            }
        });
        // List active rooms
        this.app.get("/api/rooms", async (req, res) => {
            try {
                const rooms = await roomSchema_1.Room.find({ gameStatus: "ACTIVE" }).select("gameSessionUuid name players createdDate gameType ruletype");
                res.status(200).json({ status: true, rooms });
            }
            catch (error) {
                console.error("Error listing rooms:", error);
                res.status(500).json({
                    status: false,
                    errorCode: errorCodes_1.CODES.SERVER_ERROR.code,
                    message: "Internal Server Error",
                });
            }
        });
    }
    setupSocketHandlers() {
        this.io.on("connection", (socket) => {
            const transportName = socket?.conn?.transport?.name || "unknown";
            console.log(`=========New client connected: ${socket.id} (transport=${transportName})=========`);
            socket.on("joinGame", (data) => this.handleJoin(socket, data));
            // Keep old 'join' event for backward compatibility
            socket.on("join", (data) => {
                this.handleJoin(socket, {
                    gameSessionUuid: data.roomId || data.gameSessionUuid,
                    uuid: data.clientId || data.uuid,
                    playerName: data.playerName,
                    ruletype: data.ruletype,
                });
            });
            socket.on("hit", (data) => this.handleHit(socket, data));
            socket.on("placeBall", (data) => this.handlePlaceBall(socket, data));
            // Aim sync - broadcast to other players in room
            socket.on("aimUpdate", (data) => {
                const playerInfo = this.socketRooms.get(socket.id);
                if (playerInfo) {
                    socket.to(playerInfo.roomId).emit("aimUpdate", {
                        playerId: playerInfo.clientId,
                        angle: data.angle,
                        pos: data.pos,
                    });
                }
            });
            // Ball position sync during placement - broadcast to other players
            socket.on("ballPosUpdate", (data) => {
                const playerInfo = this.socketRooms.get(socket.id);
                if (playerInfo) {
                    socket.to(playerInfo.roomId).emit("ballPosUpdate", {
                        playerId: playerInfo.clientId,
                        pos: data.pos,
                    });
                }
            });
            socket.on("requestState", () => this.handleRequestState(socket));
            socket.on("chat", (data) => this.handleChat(socket, data));
            socket.on("disconnect", () => this.handleDisconnect(socket));
        });
    }
    async handleJoin(socket, data) {
        const { gameSessionUuid, uuid, playerName, ruletype } = data;
        console.log(`Player ${uuid} attempting to join game: ${gameSessionUuid}`);
        // Validate against MongoDB if room exists
        let dbRoom = await roomSchema_1.Room.findOne({ gameSessionUuid });
        if (dbRoom) {
            // Verify player is allowed in this room
            const validPlayer = dbRoom.players.find((p) => p.uuid === uuid);
            if (!validPlayer) {
                (0, errorCodes_1.emitSocketError)(socket, errorCodes_1.CODES.INVALID_PLAYER.code, "UUID not a valid player in this game session");
                return;
            }
            // Check if game is still active
            if (dbRoom.gameStatus !== "ACTIVE") {
                (0, errorCodes_1.emitSocketError)(socket, errorCodes_1.CODES.GAME_ALREADY_ENDED.code, "Game has already ended");
                return;
            }
        }
        // Leave any previous room
        const previous = this.socketRooms.get(socket.id);
        if (previous) {
            socket.leave(previous.roomId);
            const prevRoom = this.roomManager.getRoom(previous.roomId);
            if (prevRoom) {
                prevRoom.removePlayer(previous.clientId);
            }
        }
        // Use player name from DB if available
        const actualPlayerName = dbRoom?.players.find((p) => p.uuid === uuid)?.name || playerName || uuid;
        const actualRuletype = dbRoom?.ruletype || ruletype || "eightball";
        // Get or create room in physics manager
        const room = this.roomManager.getOrCreateRoom(gameSessionUuid, actualRuletype);
        // IMPORTANT: Setup room callbacks BEFORE adding player
        // This ensures callbacks are available when addPlayer triggers events
        if (!room.onSnapshot) {
            room.onSnapshot = (snapshot) => {
                this.io.to(gameSessionUuid).emit("snapshot", snapshot);
            };
            room.onStationary = (snapshot, turnResult) => {
                this.io.to(gameSessionUuid).emit("stationary", {
                    finalState: snapshot,
                    turnResult,
                });
            };
            // Waiting timer callbacks
            room.onWaitingUpdate = (secondsLeft) => {
                this.io.to(gameSessionUuid).emit("waitingUpdate", { secondsLeft });
            };
            room.onGameStart = (firstPlayerId) => {
                // This is called from addPlayer, but we'll emit gameStart separately
                // after the socket has joined the room
                console.log(`[${gameSessionUuid}] Game ready to start. First player: ${firstPlayerId}`);
            };
            room.onWaitingTimeout = async () => {
                this.io.to(gameSessionUuid).emit("waitingTimeout", {
                    reason: "opponent_not_joined",
                    message: "Opponent did not join within 60 seconds",
                });
                // Update DB if connected
                if ((0, database_1.isDBConnected)()) {
                    try {
                        const dbRoomUpdate = await roomSchema_1.Room.findOne({ gameSessionUuid });
                        if (dbRoomUpdate && !dbRoomUpdate.winnerSent) {
                            dbRoomUpdate.gameStatus = "CRASHED";
                            dbRoomUpdate.winnerSent = true;
                            await dbRoomUpdate.save();
                        }
                    }
                    catch (err) {
                        console.error("Error updating room on timeout:", err);
                    }
                }
            };
            room.onPlayerCountChange = (count, players) => {
                console.log(`[${gameSessionUuid}] Player count changed: ${count}`);
                this.io.to(gameSessionUuid).emit("playerCountUpdate", {
                    count,
                    players: players.map((p) => ({
                        clientId: p.clientId,
                        playerName: p.playerName,
                    })),
                });
            };
            // Game event callbacks
            room.onTurnChange = (data) => {
                console.log(`[${gameSessionUuid}] Turn change: ${data.currentPlayerId} (index: ${data.currentPlayerIndex})`);
                this.io.to(gameSessionUuid).emit("turnChange", data);
            };
            room.onGameOver = async (data) => {
                console.log(`[${gameSessionUuid}] Game over: ${data.winnerId} wins - ${data.reason}`);
                this.io.to(gameSessionUuid).emit("gameOver", data);
                // Update DB
                if ((0, database_1.isDBConnected)()) {
                    try {
                        const dbRoomUpdate = await roomSchema_1.Room.findOne({ gameSessionUuid });
                        if (dbRoomUpdate && !dbRoomUpdate.winnerSent) {
                            dbRoomUpdate.players.forEach((player) => {
                                if (player.uuid === data.winnerId) {
                                    player.winState = "WON";
                                }
                                else {
                                    player.winState = "DEFEATED";
                                }
                            });
                            dbRoomUpdate.gameStatus = "FINISHED";
                            dbRoomUpdate.winnerSent = true;
                            await dbRoomUpdate.save();
                        }
                    }
                    catch (err) {
                        console.error("Error updating room on game over:", err);
                    }
                }
            };
            room.onFoul = (data) => {
                console.log(`[${gameSessionUuid}] Foul by ${data.playerId}: ${data.reason}`);
                this.io.to(gameSessionUuid).emit("foul", data);
            };
            // Pause/reconnection callbacks
            room.onGamePaused = (data) => {
                console.log(`[${gameSessionUuid}] Game paused - waiting for ${data.disconnectedPlayerName} to reconnect`);
                this.io.to(gameSessionUuid).emit("gamePaused", data);
            };
            room.onGameResumed = (data) => {
                console.log(`[${gameSessionUuid}] Game resumed - ${data.reconnectedPlayerName} reconnected`);
                this.io.to(gameSessionUuid).emit("gameResumed", data);
            };
            room.onForfeit = async (data) => {
                console.log(`[${gameSessionUuid}] Forfeit: ${data.forfeitPlayerId} - ${data.reason}`);
                this.io.to(gameSessionUuid).emit("forfeit", data);
                // Update DB
                if ((0, database_1.isDBConnected)()) {
                    try {
                        const dbRoomUpdate = await roomSchema_1.Room.findOne({ gameSessionUuid });
                        if (dbRoomUpdate && !dbRoomUpdate.winnerSent) {
                            dbRoomUpdate.players.forEach((player) => {
                                if (player.uuid === data.winnerId) {
                                    player.winState = "WON";
                                }
                                else {
                                    player.winState = "DEFEATED";
                                }
                            });
                            dbRoomUpdate.gameStatus = "FINISHED";
                            dbRoomUpdate.winnerSent = true;
                            await dbRoomUpdate.save();
                        }
                    }
                    catch (err) {
                        console.error("Error updating room on forfeit:", err);
                    }
                }
            };
            room.onReconnectionUpdate = (secondsLeft) => {
                this.io.to(gameSessionUuid).emit("reconnectionUpdate", { secondsLeft });
            };
        }
        // Check if game was already playing before this player joined
        const wasPlaying = room.isGameStarted();
        // Check if this is a reconnection (player was disconnected)
        const isReconnection = room.tryReconnect(uuid, actualPlayerName, socket.id);
        if (!isReconnection) {
            // Add the player (this may trigger startGame internally if 2+ players)
            room.addPlayer(uuid, actualPlayerName, socket.id);
        }
        // CRITICAL: Join socket room BEFORE emitting any events
        socket.join(gameSessionUuid);
        this.socketRooms.set(socket.id, {
            roomId: gameSessionUuid,
            clientId: uuid,
        });
        // Get current room state after player was added
        const currentRoomState = room.getRoomState();
        const isNowPlaying = room.isGameStarted();
        const currentPlayerId = room.getCurrentPlayerId();
        const gameState = room.getGameState();
        // Send welcome with initial state including room state and turn info
        socket.emit("welcome", {
            roomId: gameSessionUuid,
            gameSessionUuid,
            clientId: uuid,
            uuid,
            initialState: room.getSnapshot(),
            serverTime: Date.now(),
            roomState: currentRoomState,
            playerCount: room.getPlayerCount(),
            players: room.getPlayers().map((p) => ({
                clientId: p.clientId,
                playerName: p.playerName,
                playerIndex: p.playerIndex,
            })),
            currentPlayerId,
            isYourTurn: currentPlayerId === uuid,
            gameState: gameState
                ? {
                    isBreakShot: gameState.isBreakShot,
                    playerGroups: gameState.playerGroups,
                    scores: gameState.scores,
                }
                : null,
            gameDetails: dbRoom
                ? {
                    name: dbRoom.name,
                    players: dbRoom.players,
                    gameType: dbRoom.gameType,
                    ruletype: dbRoom.ruletype,
                }
                : null,
        });
        // Notify others about new player
        socket.to(gameSessionUuid).emit("playerJoined", {
            clientId: uuid,
            uuid,
            playerName: actualPlayerName,
        });
        // If game just started (wasn't playing before, now it is), emit gameStart to ALL players
        if (!wasPlaying && isNowPlaying) {
            const firstPlayerId = room.getCurrentPlayerId();
            console.log(`[${gameSessionUuid}] Emitting gameStart to all players. First player: ${firstPlayerId}`);
            // Small delay to ensure all clients have processed their welcome
            setTimeout(() => {
                // Get initial table state with ball numbers for 8-ball
                const initialSnapshot = room.getSnapshot();
                const gameState = room.getGameState();
                // Break shot requires ball in hand behind head string
                const isBreakShot = gameState?.isBreakShot ?? true;
                this.io.to(gameSessionUuid).emit("gameStart", {
                    players: room.getPlayers().map((p) => ({
                        clientId: p.clientId,
                        playerName: p.playerName,
                        playerIndex: p.playerIndex,
                    })),
                    currentPlayerId: firstPlayerId,
                    isBreakShot: isBreakShot,
                    ballInHand: isBreakShot, // Break shot requires ball placement
                    behindHeadString: isBreakShot, // Break must be from kitchen
                    initialState: initialSnapshot, // Include ball positions and numbers
                });
            }, 100);
        }
        console.log(`Player ${actualPlayerName} (${uuid}) joined room ${gameSessionUuid} (state: ${currentRoomState})`);
    }
    handleHit(socket, data) {
        const info = this.socketRooms.get(socket.id);
        if (!info) {
            socket.emit("error", { message: "Not in a room" });
            return;
        }
        const room = this.roomManager.getRoom(info.roomId);
        if (!room) {
            socket.emit("error", { message: "Room not found" });
            return;
        }
        // Don't allow hits if game hasn't started
        if (!room.isGameStarted()) {
            socket.emit("shotRejected", {
                sequence: data.sequence,
                reason: "Game not started - waiting for opponent",
            });
            return;
        }
        // Validate table is stationary
        if (!room.isTableStationary()) {
            socket.emit("shotRejected", {
                sequence: data.sequence,
                reason: "Table not stationary",
            });
            return;
        }
        // Apply hit with player validation (turn check happens inside room.hit)
        const result = room.hit(data.aim, info.clientId);
        if (result.accepted) {
            // Broadcast shot accepted to all clients in room
            this.io.to(info.roomId).emit("shotAccepted", {
                sequence: data.sequence,
                serverTick: room.getSnapshot().serverTick,
                aim: data.aim,
                shooterId: info.clientId,
            });
        }
        else {
            socket.emit("shotRejected", {
                sequence: data.sequence,
                reason: result.reason || "Shot rejected",
            });
        }
    }
    handlePlaceBall(socket, data) {
        const info = this.socketRooms.get(socket.id);
        if (!info) {
            socket.emit("error", { message: "Not in a room" });
            return;
        }
        const room = this.roomManager.getRoom(info.roomId);
        if (!room) {
            socket.emit("error", { message: "Room not found" });
            return;
        }
        // Place ball with turn validation
        const result = room.placeBall(data.pos, info.clientId);
        if (result.accepted) {
            // Broadcast new state to all clients
            this.io.to(info.roomId).emit("ballPlaced", {
                pos: data.pos,
                playerId: info.clientId,
                snapshot: room.getSnapshot(),
            });
        }
        else {
            socket.emit("error", {
                message: result.reason || "Invalid ball placement",
            });
        }
    }
    handleRequestState(socket) {
        const info = this.socketRooms.get(socket.id);
        if (!info) {
            socket.emit("error", { message: "Not in a room" });
            return;
        }
        const room = this.roomManager.getRoom(info.roomId);
        if (!room) {
            socket.emit("error", { message: "Room not found" });
            return;
        }
        socket.emit("snapshot", room.getSnapshot());
    }
    handleChat(socket, data) {
        const info = this.socketRooms.get(socket.id);
        if (!info)
            return;
        const room = this.roomManager.getRoom(info.roomId);
        if (!room)
            return;
        const player = room.getPlayers().find((p) => p.clientId === info.clientId);
        if (!player)
            return;
        // Broadcast to all in room including sender
        this.io.to(info.roomId).emit("chat", {
            clientId: info.clientId,
            playerName: player.playerName,
            message: data.message,
        });
    }
    async handleDisconnect(socket) {
        const info = this.socketRooms.get(socket.id);
        if (info) {
            const room = this.roomManager.getRoom(info.roomId);
            if (room) {
                room.removePlayer(info.clientId);
                socket.to(info.roomId).emit("playerLeft", { clientId: info.clientId });
                console.log(`Player ${info.clientId} left room ${info.roomId}`);
            }
            this.socketRooms.delete(socket.id);
        }
        console.log(`Client disconnected: ${socket.id}`);
    }
    async start() {
        // Connect to MongoDB first
        await (0, database_1.connectDB)();
        this.httpServer.listen(PORT, () => {
            console.log(`Billiards server listening on port ${PORT}`);
            console.log(`Frontend URL: ${FRONTEND_URL}`);
            console.log(`Physics step: 0.001953125s (512 steps/sec)`);
            console.log(`Snapshot rate: 20Hz (50ms interval)`);
        });
    }
    stop() {
        this.roomManager.destroy();
        this.io.close();
        this.httpServer.close();
    }
}
// Start server
const server = new BilliardsServer();
server.start();
// Graceful shutdown
process.on("SIGINT", () => {
    console.log("\nShutting down...");
    server.stop();
    process.exit(0);
});
process.on("SIGTERM", () => {
    console.log("\nShutting down...");
    server.stop();
    process.exit(0);
});
//# sourceMappingURL=index.js.map