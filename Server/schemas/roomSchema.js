const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  uuid: { type: String, required: true },
  name: { type: String, required: true },
  winState: { 
    type: String, 
    enum: ['WON', 'DEFEATED', 'DRAW', 'DROPPED', 'CRASHED'],
    default: 'DEFEATED'
  }
});

const roomSchema = new mongoose.Schema({
  gameSessionUuid: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  players: [playerSchema],
  gameStatus: {
    type: String,
    enum: ['ACTIVE', 'FINISHED', 'DRAW', 'DROPPED', 'CRASHED'],
    default: 'ACTIVE'
  },
  gameType: {
    type: String,
    enum: ['NINEBALL', 'EIGHTBALL', 'SNOOKER', 'THREECUSHION', 'FOURTEENONE'],
    default: 'EIGHTBALL'
  },
  createdDate: {
    type: Date,
    default: Date.now
  },
  winnerSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster lookups
roomSchema.index({ gameSessionUuid: 1 });
roomSchema.index({ gameStatus: 1 });
roomSchema.index({ createdDate: -1 });

module.exports = mongoose.model('Room', roomSchema);
