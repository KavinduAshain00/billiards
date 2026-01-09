#!/usr/bin/env node
/**
 * Simple Socket.IO test client to verify server connectivity
 * Run with: node test-connection.js
 */

const { io } = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TABLE_ID = process.env.TABLE_ID || 'test-room';
const CLIENT_ID = process.env.CLIENT_ID || `test-client-${Date.now()}`;
const USERNAME = process.env.USERNAME || 'TestPlayer';

console.log('🎱 Testing Socket.IO Connection');
console.log('================================');
console.log(`Server: ${SERVER_URL}`);
console.log(`Table ID: ${TABLE_ID}`);
console.log(`Client ID: ${CLIENT_ID}`);
console.log(`Username: ${USERNAME}`);
console.log('');

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
});

socket.on('connect', () => {
  console.log('✅ Connected to server');
  console.log(`   Socket ID: ${socket.id}`);
  console.log('');
  
  // Join table
  console.log(`📡 Joining table "${TABLE_ID}"...`);
  socket.emit('join-table', {
    tableId: TABLE_ID,
    clientId: CLIENT_ID,
    username: USERNAME,
    spectator: false,
  });
});

socket.on('joined', (data) => {
  if (data.success) {
    console.log('✅ Successfully joined table');
    console.log(`   Table ID: ${data.tableId}`);
    console.log(`   Player Count: ${data.playerCount}`);
    console.log(`   First Player: ${data.isFirstPlayer}`);
    console.log('');
    
    // Send a test game event
    console.log('📤 Sending test game event...');
    socket.emit('game-event', {
      tableId: TABLE_ID,
      event: JSON.stringify({
        type: 'test',
        clientId: CLIENT_ID,
        timestamp: Date.now(),
      }),
    });
    
    console.log('✅ Test complete! Connection working properly.');
    console.log('');
    console.log('Press Ctrl+C to exit or wait for events...');
  } else {
    console.error('❌ Failed to join table');
    console.error(`   Error: ${data.error}`);
    process.exit(1);
  }
});

socket.on('game-event', (event) => {
  console.log('📥 Received game event:');
  try {
    const parsed = JSON.parse(event);
    console.log(JSON.stringify(parsed, null, 2));
  } catch {
    console.log(event);
  }
  console.log('');
});

socket.on('player-joined', (data) => {
  console.log('👤 Player joined:');
  console.log(`   Username: ${data.username}`);
  console.log(`   Client ID: ${data.clientId}`);
  console.log(`   Player Count: ${data.playerCount}`);
  console.log('');
});

socket.on('player-left', (data) => {
  console.log('👋 Player left:');
  console.log(`   Username: ${data.username}`);
  console.log(`   Client ID: ${data.clientId}`);
  console.log(`   Player Count: ${data.playerCount}`);
  console.log('');
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected from server');
  console.log(`   Reason: ${reason}`);
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:');
  console.error(error.message);
  process.exit(1);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:');
  console.error(error);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('');
  console.log('👋 Disconnecting...');
  socket.disconnect();
  process.exit(0);
});
