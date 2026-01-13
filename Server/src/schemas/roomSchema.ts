import mongoose, { Schema, Document } from "mongoose"

export interface IPlayer {
  name: string
  uuid: string
  profileImage?: string
  ready: boolean
  winState: "DEFEATED" | "WON" | "DROPPED" | "CRASHED"
}

export interface IRoom extends Document {
  gameSessionUuid: string
  name?: string
  players: IPlayer[]
  matchId?: number
  createdDate: Date
  gameStatus: "ACTIVE" | "FINISHED" | "DROPPED" | "DRAW" | "CRASHED"
  gameType: "MULTIPLAYER" | "BOT_GAME" | "TOURNAMENT"
  winnerSent: boolean
  ruletype: string
}

const playerSchema = new Schema<IPlayer>({
  name: { type: String, required: true },
  uuid: { type: String, required: true },
  profileImage: { type: String, required: false },
  ready: { type: Boolean, default: false },
  winState: { 
    type: String, 
    default: "DEFEATED",
    enum: ["DEFEATED", "WON", "DROPPED", "CRASHED"]
  },
})

const roomSchema = new Schema<IRoom>({
  gameSessionUuid: { type: String, required: true, unique: true },
  name: { type: String, required: false },
  players: { type: [playerSchema], default: [] },
  matchId: { type: Number, required: false },
  createdDate: { type: Date, default: Date.now },
  gameStatus: { 
    type: String, 
    default: "ACTIVE", 
    enum: ["ACTIVE", "FINISHED", "DROPPED", "DRAW", "CRASHED"] 
  },
  gameType: { 
    type: String, 
    default: "MULTIPLAYER", 
    enum: ["MULTIPLAYER", "BOT_GAME", "TOURNAMENT"] 
  },
  winnerSent: { type: Boolean, default: false },
  ruletype: { type: String, default: "eightball" },
}, { collection: "billiards_game_rooms" })

const Room = mongoose.model<IRoom>("Room", roomSchema)

export { Room }
