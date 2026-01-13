"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDBConnected = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let isConnected = false;
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/billiards";
        await mongoose_1.default.connect(mongoUri, {
            serverSelectionTimeoutMS: 3000, // 3 second timeout
            connectTimeoutMS: 3000,
        });
        console.log("MongoDB connected successfully");
        isConnected = true;
        return true;
    }
    catch (err) {
        console.warn("MongoDB connection failed - running in offline mode");
        console.warn("Room persistence will not be available");
        isConnected = false;
        return false;
    }
};
exports.connectDB = connectDB;
const isDBConnected = () => isConnected;
exports.isDBConnected = isDBConnected;
//# sourceMappingURL=database.js.map