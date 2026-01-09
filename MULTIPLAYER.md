# Quick Start Guide - Socket.IO Multiplayer

## 1. Start the Socket.IO Server

Open a terminal and run:

```bash
cd Server
node Server.js
```

You should see:
```
Billiards server running on port 3000
```

## 2. Start the Game Client

Open another terminal and run:

```bash
npm run serve
```

The webpack dev server will start on http://localhost:8080

## 3. Test Multiplayer

### Option A: Two Browser Windows

**Window 1 (Player 1 - breaks first):**
```
http://localhost:8080/dist/?websocketserver=http://localhost:3000&name=Alice&tableId=room1&first=true&ruletype=nineball
```

**Window 2 (Player 2):**
```
http://localhost:8080/dist/?websocketserver=http://localhost:3000&name=Bob&tableId=room1&ruletype=nineball
```

### Option B: Different Game Types

**Eight Ball:**
```
?websocketserver=http://localhost:3000&name=Player1&tableId=game1&first=true&ruletype=eightball
```

**Snooker:**
```
?websocketserver=http://localhost:3000&name=Player1&tableId=game2&first=true&ruletype=snooker
```

**Three Cushion:**
```
?websocketserver=http://localhost:3000&name=Player1&tableId=game3&first=true&ruletype=threecushion
```

## 4. Verify Connection

Check the browser console. You should see:
```
Connected to server: <socket-id>
Successfully joined table room1
Alice connected to Socket.IO server
```

Check the server terminal. You should see:
```
Client connected
Player joined room1
```

## 5. Play!

- Player 1 (with `first=true`) will start the game
- Take turns shooting
- Events are synchronized automatically between players
- Open DevTools Network tab to see Socket.IO WebSocket messages

## Troubleshooting

### Players can't see each other's moves

✓ Ensure both players use the **same tableId**
✓ Ensure players have **different names or clientIds**
✓ Check that the server is running
✓ Open browser DevTools Console for errors

### "Room is full" error

✓ Only 2 players per table
✓ Use a different tableId for a new game
✓ Or join as spectator: add `&spectator=true`

### Connection refused

✓ Verify server is running on port 3000
✓ Check websocketserver URL is correct
✓ Try http://localhost:3000 not https://

## Advanced Usage

### Custom Server URL

If your server runs on a different port or host:

```
?websocketserver=http://192.168.1.100:8080&...
```

### Spectator Mode

Join and watch a game without playing:

```
?websocketserver=http://localhost:3000&name=Watcher&tableId=room1&spectator=true
```

### Development Tips

1. Use Chrome DevTools → Application → WebSockets to inspect messages
2. Use different browser profiles to simulate multiple players
3. Check server logs for connection events
4. Use the health endpoint: http://localhost:3000/health
5. List active rooms: http://localhost:3000/rooms

## Next Steps

- Read [Server/README.md](./Server/README.md) for detailed documentation
- Deploy to production with proper HTTPS
- Configure environment variables
- Set up process manager (PM2) for the server
