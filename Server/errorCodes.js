/**
 * Standardized error codes for API responses
 */
const CODES = {
  // Success
  SUCCESS: { code: 'SUCCESS', message: 'Operation successful' },
  
  // Client errors (4xx)
  INVALID_GAME_SESSION: { code: 'INVALID_GAME_SESSION', message: 'Invalid game session' },
  GAME_SESSION_EXISTS: { code: 'GAME_SESSION_EXISTS', message: 'Game session already exists' },
  ROOM_NOT_FOUND: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
  MISSING_GAME_SESSION_UUID: { code: 'MISSING_GAME_SESSION_UUID', message: 'Missing game session UUID' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Unauthorized access' },
  INVALID_MOVE: { code: 'INVALID_MOVE', message: 'Invalid move' },
  GAME_ALREADY_FINISHED: { code: 'GAME_ALREADY_FINISHED', message: 'Game already finished' },
  
  // Server errors (5xx)
  SERVER_ERROR: { code: 'SERVER_ERROR', message: 'Internal server error' },
  DATABASE_ERROR: { code: 'DATABASE_ERROR', message: 'Database error' },
};

/**
 * Emit a standardized socket error
 */
function emitSocketError(socket, errorCode, gameSessionUuid = null, logMessage = null) {
  const error = {
    errorCode: errorCode.code,
    message: errorCode.message,
    timestamp: new Date().toISOString()
  };
  
  if (logMessage && gameSessionUuid) {
    console.error(`[${gameSessionUuid}] ${logMessage}`);
  }
  
  socket.emit('error', error);
}

module.exports = {
  CODES,
  emitSocketError
};
