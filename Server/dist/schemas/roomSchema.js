"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const playerSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    uuid: { type: String, required: true },
    profileImage: { type: String, required: false },
    ready: { type: Boolean, default: false },
    winState: {
        type: String,
        default: "DEFEATED",
        enum: ["DEFEATED", "WON", "DROPPED", "CRASHED"]
    },
});
const roomSchema = new mongoose_1.Schema({
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
}, { collection: "billiards_game_rooms" });
const Room = mongoose_1.default.model("Room", roomSchema);
exports.Room = Room;
//# sourceMappingURL=roomSchema.js.map