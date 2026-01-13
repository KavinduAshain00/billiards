/**
 * Room Manager - Manages all active game rooms
 */
import { GameRoom } from "./gameroom";
export declare class RoomManager {
    private rooms;
    private cleanupInterval;
    private readonly CLEANUP_INTERVAL_MS;
    private readonly ROOM_TIMEOUT_MS;
    constructor();
    getOrCreateRoom(roomId: string, ruletype?: string): GameRoom;
    getRoom(roomId: string): GameRoom | undefined;
    removeRoom(roomId: string): void;
    getRoomCount(): number;
    getAllRooms(): GameRoom[];
    private startCleanup;
    destroy(): void;
}
//# sourceMappingURL=roommanager.d.ts.map