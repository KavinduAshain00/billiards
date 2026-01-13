"use strict";
/**
 * Room Manager - Manages all active game rooms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
const gameroom_1 = require("./gameroom");
class RoomManager {
    constructor() {
        this.rooms = new Map();
        // Cleanup interval for empty rooms
        this.cleanupInterval = null;
        this.CLEANUP_INTERVAL_MS = 60000; // 1 minute
        this.ROOM_TIMEOUT_MS = 300000; // 5 minutes empty before cleanup
        this.startCleanup();
    }
    getOrCreateRoom(roomId, ruletype = "eightball") {
        let room = this.rooms.get(roomId);
        if (!room) {
            room = new gameroom_1.GameRoom(roomId, ruletype);
            this.rooms.set(roomId, room);
            console.log(`Created room: ${roomId}`);
        }
        return room;
    }
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    removeRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.destroy();
            this.rooms.delete(roomId);
            console.log(`Removed room: ${roomId}`);
        }
    }
    getRoomCount() {
        return this.rooms.size;
    }
    getAllRooms() {
        return Array.from(this.rooms.values());
    }
    startCleanup() {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [roomId, room] of this.rooms) {
                if (room.isEmpty()) {
                    // Room is empty, remove it
                    this.removeRoom(roomId);
                }
            }
        }, this.CLEANUP_INTERVAL_MS);
    }
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        for (const room of this.rooms.values()) {
            room.destroy();
        }
        this.rooms.clear();
    }
}
exports.RoomManager = RoomManager;
//# sourceMappingURL=roommanager.js.map