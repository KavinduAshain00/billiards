const mongoose = require('mongoose');
const pino = require('pino');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/billiards';

mongoose.connect(MONGODB_URI)
.then(() => {
  logger.info({ mongodb: MONGODB_URI }, 'MongoDB connected successfully');
})
.catch((err) => {
  logger.error({ error: err.message }, 'MongoDB connection error');
  process.exit(1);
});

mongoose.connection.on('error', (err) => {
  logger.error({ error: err.message }, 'MongoDB error');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

module.exports = mongoose;
