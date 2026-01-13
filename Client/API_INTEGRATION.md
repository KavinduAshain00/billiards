# API Integration Summary

## Overview

Successfully integrated REST API endpoints from Connect4 into the Billiards Socket.IO server for game session management and player tracking.

## Files Created

### 1. Schema & Database
- **Server/schemas/roomSchema.js** - MongoDB schema for game rooms
  - Stores game session UUID, room name, players, game type, status
  - Tracks win states: WON, DEFEATED, DRAW, DROPPED, CRASHED
  - Supports game types: NINEBALL, EIGHTBALL, SNOOKER, THREECUSHION, FOURTEENONE

- **Server/config/database.js** - MongoDB connection configuration
  - Connects to MongoDB using environment variable
  - Error handling and reconnection logic
  - Structured logging

### 2. Utilities
- **Server/errorCodes.js** - Standardized error codes
  - Client errors (4xx): INVALID_GAME_SESSION, ROOM_NOT_FOUND, UNAUTHORIZED, etc.
  - Server errors (5xx): SERVER_ERROR, DATABASE_ERROR
  - Helper function for socket error emission

### 3. Documentation
- **Server/API.md** - Complete REST API documentation
  - Request/response examples
  - Error code reference
  - cURL examples
  - Field descriptions

- **Server/.env.example** - Environment variable template
  - MongoDB URI
  - Port configuration
  - Frontend URL
  - CORS origins

### 4. Testing
- **Server/test-api.sh** - Automated API test script
  - Tests all endpoints
  - Validates responses
  - Creates sample game sessions
  - Color-coded output

## Files Modified

### Server/Server.js
Added three REST API endpoints:

1. **POST /api/createRoom**
   - Creates new game session in MongoDB
   - Validates 2 players required
   - Prevents duplicate game sessions
   - Generates player join links
   - Maps rule types to game types

2. **GET /api/getGameDetails**
   - Retrieves full game session details
   - Returns players, status, timestamps
   - Used for game state verification

3. **POST /api/userBack**
   - Handles player deliberately leaving
   - Marks leaver as DROPPED, opponent as WON
   - Updates game status to DROPPED
   - Emits gameOver Socket.IO event
   - Cleans up in-memory session

### Server/package.json
- Added `dotenv: ^16.4.7` dependency
- Updated dev script to use nodemon

### Server/README.md
- Added MongoDB setup instructions
- Added API endpoints section
- Updated installation steps
- Added database configuration

## API Endpoints

### Create Room
```http
POST /api/createRoom
Content-Type: application/json

{
  "room": {
    "gameSessionUuid": "unique-id",
    "name": "Room Name",
    "ruletype": "eightball"
  },
  "players": [
    { "uuid": "player1-uuid", "name": "Player 1" },
    { "uuid": "player2-uuid", "name": "Player 2" }
  ]
}
```

Response:
```json
{
  "status": true,
  "payload": {
    "gameSessionUuid": "unique-id",
    "name": "Room Name",
    "gameType": "EIGHTBALL",
    "link1": "http://localhost:8080/dist/?gameSessionUuid=...",
    "link2": "http://localhost:8080/dist/?gameSessionUuid=..."
  }
}
```

### Get Game Details
```http
GET /api/getGameDetails?gameSessionUuid=unique-id
```

Response:
```json
{
  "status": true,
  "gameDetails": {
    "gameSessionUuid": "unique-id",
    "name": "Room Name",
    "gameType": "EIGHTBALL",
    "gameStatus": "ACTIVE",
    "players": [...],
    "winnerSent": false
  }
}
```

### User Back (Leave Game)
```http
POST /api/userBack
Content-Type: application/json

{
  "gameSessionUuid": "unique-id",
  "uuid": "player-uuid"
}
```

Response:
```json
{
  "status": true,
  "message": "Game ended successfully"
}
```

## Environment Variables

Required `.env` configuration:

```bash
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/billiards

# Frontend
FRONTEND_URL=http://localhost:8080

# CORS
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:5173
```

## Dependencies Added

- `mongoose`: ^9.1.2 (already installed)
- `dotenv`: ^16.4.7 (newly installed)

## Game Flow with API

### 1. External System Creates Room
```bash
POST /api/createRoom
→ Returns two player links
```

### 2. Players Join via Links
```
Player clicks link
→ Opens game with gameSessionUuid & uuid parameters
→ Client connects via Socket.IO
→ join-table event sent
```

### 3. Game Plays
```
Players take turns
→ Socket.IO events synchronized
→ In-memory game state maintained
```

### 4. Game Ends
```
Win/Loss/Draw determined
→ Room updated in MongoDB
→ gameStatus set to FINISHED/DRAW/DROPPED
→ winnerSent flag set to true
```

### 5. Player Can Leave Early
```bash
POST /api/userBack
→ Marks player as DROPPED
→ Opponent marked as WON
→ gameOver event emitted
```

## Testing

### Start MongoDB
```bash
# macOS
brew services start mongodb-community

# Or Docker
docker run -d -p 27017:27017 mongo
```

### Start Server
```bash
cd Server
npm install
cp .env.example .env
# Edit .env with your settings
npm start
```

### Run API Tests
```bash
./test-api.sh
```

Expected output:
```
🎱 Testing Billiards Server API
================================
✓ Health check passed
✓ Room created successfully
✓ Game details retrieved successfully
✓ Rooms list retrieved successfully
✓ Player left successfully
✓ Game status correctly updated to DROPPED
✓ Duplicate room correctly rejected
All tests completed!
```

### Manual Testing

1. Create a room:
```bash
curl -X POST http://localhost:3000/api/createRoom \
  -H "Content-Type: application/json" \
  -d '{"room":{"gameSessionUuid":"test123","name":"Test","ruletype":"eightball"},"players":[{"uuid":"alice","name":"Alice"},{"uuid":"bob","name":"Bob"}]}'
```

2. Open the returned links in two browser windows

3. Play the game

4. Check game details:
```bash
curl "http://localhost:3000/api/getGameDetails?gameSessionUuid=test123"
```

## Integration Benefits

1. **Persistence**: Game sessions stored in MongoDB
2. **External Integration**: REST API for game management systems
3. **Player Tracking**: Full player state and win/loss tracking
4. **Game History**: All games persisted with timestamps
5. **Flexible Game Types**: Support for all billiards variants
6. **Robust Error Handling**: Standardized error codes
7. **Production Ready**: Environment-based configuration

## Compatibility

- ✅ Works with existing Socket.IO multiplayer
- ✅ Maintains backward compatibility
- ✅ No changes to client-side game logic required
- ✅ Optional REST API (Socket.IO still works standalone)

## Next Steps

### For Development
- Test with MongoDB Atlas (cloud database)
- Add player authentication
- Implement matchmaking API
- Add game replay endpoints

### For Production
- Set up MongoDB replica set
- Configure proper CORS origins
- Add rate limiting
- Implement API key authentication
- Set up monitoring/alerting
- Add database indexes for performance

## Rollback Plan

If issues arise:
1. Remove API endpoints from Server.js
2. Remove MongoDB connection
3. Server will work as pure Socket.IO server
4. Game sessions will be ephemeral (in-memory only)

## Support

- **API Documentation**: [Server/API.md](./Server/API.md)
- **Server Setup**: [Server/README.md](./Server/README.md)
- **Socket.IO Guide**: [MULTIPLAYER.md](./MULTIPLAYER.md)
- **Test Script**: `./Server/test-api.sh`
