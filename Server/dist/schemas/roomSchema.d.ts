import mongoose, { Document } from "mongoose";
export interface IPlayer {
    name: string;
    uuid: string;
    profileImage?: string;
    ready: boolean;
    winState: "DEFEATED" | "WON" | "DROPPED" | "CRASHED";
}
export interface IRoom extends Document {
    gameSessionUuid: string;
    name?: string;
    players: IPlayer[];
    matchId?: number;
    createdDate: Date;
    gameStatus: "ACTIVE" | "FINISHED" | "DROPPED" | "DRAW" | "CRASHED";
    gameType: "MULTIPLAYER" | "BOT_GAME" | "TOURNAMENT";
    winnerSent: boolean;
    ruletype: string;
}
declare const Room: mongoose.Model<IRoom, {}, {}, {}, mongoose.Document<unknown, {}, IRoom, {}, {}> & IRoom & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export { Room };
//# sourceMappingURL=roomSchema.d.ts.map