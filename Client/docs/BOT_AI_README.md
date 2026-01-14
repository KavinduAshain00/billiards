# Bot AI Implementation for Billiards Server

## Overview

The billiards server now includes bot AI support for single-player and multiplayer games. The bot can:
- Detect when a player UUID is a bot through the GameOn backend API
- Automatically add a bot as player 2 in single-player games
- Make intelligent shot decisions based on table state
- Place balls when it has ball in hand
- Target appropriate balls based on group assignment (solids/stripes/8-ball)

## Files Added/Modified

### New Files
- **`src/game/botlogic.ts`** - Core bot AI logic
  - `triggerBotMove()` - Main function to make bot take a shot
  - `calculateBotShot()` - Shot calculation with aim parameters
  - `calculateBallPlacement()` - Cue ball placement logic for ball-in-hand
  - `findTargetBalls()` - Finds valid target balls based on group
  - `checkIsBot()` - API call to verify if UUID is a bot

### Modified Files
- **`src/index.ts`** - Server entry point
  - Added bot room tracking (`botRooms` Map)
  - Bot detection in `createRoom` endpoint
  - Bot auto-join in `handleJoin` method
  - Bot move triggers on turn changes and game start
  
- **`src/game/gameroom.ts`** - Game room management
  - Added `getTableSnapshot()` - Returns current table state for bot
  - Added `getCurrentPlayerGroup()` - Returns bot's assigned group
  - Added `hasBallInHand()` - Checks if bot has ball in hand
  - Added `handleHit()` - Wrapper for bot to make shots
  - Added `placeBallForBot()` - Wrapper for bot ball placement

- **`src/schemas/roomSchema.ts`** - Database schema
  - Added `isBot?: boolean` field to `IPlayer` interface and schema

- **`.env`** - Environment configuration
  - Added `GAMEON_BACKEND_URL` for bot detection API

- **`package.json`** - Dependencies
  - Added `axios` for HTTP requests to bot detection API

## Bot AI Features

### Shot Calculation
- **Target Selection**: Randomly picks from valid target balls (adds unpredictability)
- **Angle Calculation**: Calculates angle from cue ball to target
- **Error Simulation**: Adds angle/power errors based on skill level for realistic gameplay
- **Power Adjustment**: Adjusts power based on distance (closer = less power)

### Ball Placement
- Places cue ball near center of table when ball-in-hand
- Adds randomness based on error margin for natural behavior

### Group Targeting
- **Open Table**: Targets any ball except 8-ball
- **Assigned Group**: Targets only solids (1-7) or stripes (9-15)
- **Eight Ball**: Targets 8-ball when appropriate

### Skill Configuration
```typescript
interface BotConfig {
  skillLevel: 'easy' | 'medium' | 'hard';
  reactionTimeMs: number; // Delay before bot moves
  errorMargin: number; // 0-1, higher = more inaccurate
}

// Default: medium skill
{
  skillLevel: 'medium',
  reactionTimeMs: 2000, // 2 second think time
  errorMargin: 0.15     // 15% error margin
}
```

## Bot Triggering Logic

### When Bot Moves Are Triggered
1. **Game Start**: If bot is first player
   - 2 second delay after `gameStart` event
   
2. **Turn Change**: When `turnChange` event occurs
   - 1.5 second delay when it becomes bot's turn
   
3. **After Stationary**: When balls stop moving
   - 1.5 second delay if still bot's turn (continue turn scenario)

### Bot Detection Flow
```typescript
// 1. Room Creation (createRoom endpoint)
const isBot = await checkIsBot(player.uuid, GAMEON_BACKEND_URL);
if (isBot) {
  botRooms.set(gameSessionUuid, { botUuid, botName });
}

// 2. Player Join (handleJoin method)
const isBot = await checkIsBot(uuid, GAMEON_BACKEND_URL);
if (isBot) return; // Don't let bots join manually

// 3. Auto-add Bot (in handleJoin)
if (botInfo && room.getPlayerCount() === 1) {
  room.addPlayer(botInfo.botUuid, botInfo.botName, `bot-${gameSessionUuid}`);
}
```

## API Integration

### GameOn Backend API
```http
GET /api/sdk/v1/game-session/is-bot?uuid={uuid}
```

**Response:**
```json
{
  "content": true  // or false
}
```

**Configuration:**
```env
GAMEON_BACKEND_URL=https://backend.gameon.com
```

## Usage Examples

### Single Player Game
```javascript
// Client creates room with 1 human + 1 bot
const room = {
  gameSessionUuid: "game-123",
  name: "Single Player",
  ruletype: "eightball"
};

const players = [
  { uuid: "human-uuid", name: "Player 1" },
  { uuid: "bot-uuid-from-gameon", name: "Bot Player" }
];

// Server automatically:
// 1. Detects bot-uuid is a bot
// 2. Tracks room as having a bot
// 3. Auto-adds bot when human joins
// 4. Triggers bot moves when it's bot's turn
```

### Multiplayer with Bot Replacement
```javascript
// If a player disconnects, game could replace with bot
// (Not implemented yet - future feature)
```

## Testing

### Manual Testing
1. Create a room with a bot UUID (get from GameOn platform)
2. Have human player join
3. Observe bot automatically joins as player 2
4. Watch bot make shots when it's their turn

### Development Testing
```bash
# Start server in dev mode
cd Server
npm run dev

# Server will:
# - Check for bots via GAMEON_BACKEND_URL
# - Add bots automatically
# - Trigger bot moves with delays
```

## Future Enhancements

### Potential Improvements
1. **Difficulty Levels**
   - Easy: High error margin (0.3), slower reaction
   - Hard: Low error margin (0.05), faster reaction
   - Expert: Advanced shot planning, bank shots

2. **Advanced Shot Selection**
   - Calculate pot probability
   - Consider defensive shots
   - Plan multiple shots ahead
   - Bank shots and cushion play

3. **Spin/English**
   - Add top/backspin for position play
   - Use side spin for angle adjustments

4. **Safety Play**
   - Leave difficult shots for opponent
   - Hide cue ball behind other balls

5. **Bot Personality**
   - Aggressive vs defensive playing styles
   - Consistent vs unpredictable behavior

6. **Learning/Adaptation**
   - Track success rates
   - Adjust strategy based on results

## Troubleshooting

### Bot Not Moving
- Check `GAMEON_BACKEND_URL` is set correctly
- Verify bot UUID is recognized by GameOn API
- Check server logs for bot trigger messages: `[BotAI] Bot's turn - triggering bot move`

### Bot Makes Invalid Shots
- Check bot has correct group assignment
- Verify table state snapshot is accurate
- Review shot calculation logs

### Bot Timeout/No Response
- Check network connectivity to GameOn backend
- Verify axios timeout (default 3000ms)
- Check for errors in `checkIsBot()` function

## Architecture Diagram

```
┌─────────────────┐
│   Client Game   │
│   (Human/Bot)   │
└────────┬────────┘
         │ Socket.IO
         ↓
┌─────────────────────┐
│  Billiards Server   │
│  (index.ts)         │
├─────────────────────┤
│ • Bot Detection     │
│ • Room Management   │
│ • Event Handling    │
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
    ↓         ↓
┌─────────┐ ┌──────────────┐
│ GameRoom│ │   botlogic   │
│         │ │              │
│ Physics │←│ • Shot Calc  │
│ Rules   │ │ • Targeting  │
│ State   │ │ • Placement  │
└─────────┘ └──────────────┘
    │              │
    │              ↓
    │       ┌──────────────┐
    │       │ GameOn API   │
    └──────→│ (checkIsBot) │
            └──────────────┘
```

## Performance Considerations

- Bot moves are async with realistic delays (1.5-2 seconds)
- Bot detection is cached in `botRooms` Map
- API calls have 3-second timeout to prevent blocking
- No continuous polling - event-driven triggers only

## Security

- Bot UUIDs are validated against GameOn backend
- Only authorized bots can join games
- Bot moves go through same validation as human moves
- No special privileges or rule bypasses for bots
