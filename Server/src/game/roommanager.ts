/**
 * Room Manager - Manages all active game rooms
 */

import { GameRoom } from "./gameroom"

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map()
  
  // Cleanup interval for empty rooms
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly CLEANUP_INTERVAL_MS = 60000 // 1 minute
  private readonly ROOM_TIMEOUT_MS = 300000 // 5 minutes empty before cleanup

  constructor() {
    this.startCleanup()
  }

  getOrCreateRoom(roomId: string, ruletype: string = "eightball"): GameRoom {
    let room = this.rooms.get(roomId)
    if (!room) {
      room = new GameRoom(roomId, ruletype)
      this.rooms.set(roomId, room)
      console.log(`Created room: ${roomId}`)
    }
    return room
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId)
  }

  removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId)
    if (room) {
      room.destroy()
      this.rooms.delete(roomId)
      console.log(`Removed room: ${roomId}`)
    }
  }

  getRoomCount(): number {
    return this.rooms.size
  }

  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values())
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [roomId, room] of this.rooms) {
        if (room.isEmpty()) {
          // Room is empty, remove it
          this.removeRoom(roomId)
        }
      }
    }, this.CLEANUP_INTERVAL_MS)
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    for (const room of this.rooms.values()) {
      room.destroy()
    }
    this.rooms.clear()
  }
}
