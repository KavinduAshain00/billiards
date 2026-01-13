"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODES = void 0;
exports.emitSocketError = emitSocketError;
exports.CODES = {
    SERVER_ERROR: { code: "SERVER_ERROR", message: "Internal Server Error" },
    GAME_SESSION_EXISTS: { code: "GAME_SESSION_EXISTS", message: "Game session already exists" },
    ROOM_NOT_FOUND: { code: "ROOM_NOT_FOUND", message: "Room not found" },
    MISSING_GAME_SESSION_UUID: { code: "MISSING_GAME_SESSION_UUID", message: "Missing gameSessionUuid" },
    MISSING_GAME_TYPE: { code: "MISSING_GAME_TYPE", message: "Missing gameType" },
    UNAUTHORIZED: { code: "UNAUTHORIZED", message: "Unauthorized access" },
    INVALID_PLAYER: { code: "INVALID_PLAYER", message: "Invalid player UUID" },
    GAME_ALREADY_ENDED: { code: "GAME_ALREADY_ENDED", message: "Game has already ended" },
};
function emitSocketError(socket, code, message) {
    socket.emit("error", { errorCode: code, message });
}
//# sourceMappingURL=errorCodes.js.map