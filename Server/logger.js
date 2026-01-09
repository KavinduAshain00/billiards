const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { Writable } = require('stream');

dotenv.config();

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

function getDateString(d) {
    return d.toISOString().split('T')[0];
}

// Create a writable stream wrapper that rotates the underlying file each day.
function createDailyFileStream() {
    let currentDate = getDateString(new Date());
    let filePath = path.join(logsDir, `connect4-${currentDate}.log`);
    let underlying = fs.createWriteStream(filePath, { flags: 'a' });

    const writer = new Writable({
        write(chunk, encoding, callback) {
            try {
                const todayStr = getDateString(new Date());
                if (todayStr !== currentDate) {
                    // rotate
                    underlying.end();
                    currentDate = todayStr;
                    filePath = path.join(logsDir, `connect4-${currentDate}.log`);
                    underlying = fs.createWriteStream(filePath, { flags: 'a' });
                }
                // forward the chunk to the current underlying stream
                underlying.write(chunk, encoding, callback);
            } catch (err) {
                // If underlying write fails, callback with error
                callback(err);
            }
        },
    });

    // expose end/destroy for compatibility
    writer.end = function (cb) {
        try {
            underlying.end(cb);
        } catch (e) {
            if (typeof cb === 'function') cb(e);
        }
    };
    writer.destroy = function () {
        try {
            underlying.destroy();
        } catch (e) {
            // ignore
        }
    };

    return writer;
}

// Create pino logger with file transport and pretty printing for development
// create a single daily stream instance so we can close it on shutdown
const dailyStream = createDailyFileStream();

const logger = pino(
    {
        level: (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
        base: null, // Exclude pid and hostname from all logs
        formatters: {
            level: (label) => {
                return { level: label.toUpperCase() };
            },
        },
        timestamp: () => {
            // Sri Lanka Standard Time (same as IST +05:30) - readable format
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            return `,"time":"${hours}:${minutes}:${seconds}"`;
        },
    },
    pino.multistream([
        // Write to daily-rotated log file (creates a new file each date)
        {
            level: 'debug',
            stream: dailyStream,
        },
        // Pretty print to console in development
        ...(process.env.NODE_ENV === 'development'
            ? [
                  {
                      level: 'debug',
                      stream: pino.transport({
                          target: 'pino-pretty',
                          options: {
                              colorize: true,
                              translateTime: 'HH:MM:ss',
                              ignore: 'pid,hostname,time,gameSessionUuid',
                          },
                      }),
                  },
              ]
            : []),
    ])
);

// Wrapper class to maintain backward compatibility with existing code
class LoggerWrapper {
    constructor(pinoInstance) {
        this.pino = pinoInstance;
    }

    info(gameSessionUuid, ...messages) {
        const message = this._formatMessage(messages);
        if (gameSessionUuid) {
            this.pino.info({ gameSessionUuid }, message);
        } else {
            this.pino.info(message);
        }
    }

    warn(gameSessionUuid, ...messages) {
        const message = this._formatMessage(messages);
        if (gameSessionUuid) {
            this.pino.warn({ gameSessionUuid }, message);
        } else {
            this.pino.warn(message);
        }
    }

    error(gameSessionUuid, ...messages) {
        const message = this._formatMessage(messages);
        if (gameSessionUuid) {
            this.pino.error({ gameSessionUuid }, message);
        } else {
            this.pino.error(message);
        }
    }

    debug(gameSessionUuid, ...messages) {
        const message = this._formatMessage(messages);
        if (gameSessionUuid) {
            this.pino.debug({ gameSessionUuid }, message);
        } else {
            this.pino.debug(message);
        }
    }

    // Create a child logger with gameSessionUuid bound for better performance
    child(gameSessionUuid) {
        return this.pino.child({ gameSessionUuid });
    }

    _formatMessage(messages) {
        return messages
            .map((msg) =>
                typeof msg === 'object' ? JSON.stringify(msg) : String(msg)
            )
            .join(' ');
    }
}

// Cleanup old log files (runs once at startup)
function cleanupOldLogs() {
    try {
        const files = fs.readdirSync(logsDir);
        const now = new Date();

        files.forEach((file) => {
            if (file.startsWith('connect4-') && file.endsWith('.log')) {
                const filePath = path.join(logsDir, file);
                const stats = fs.statSync(filePath);
                const fileAge = (now - stats.mtime) / (1000 * 60 * 60 * 24);

                if (fileAge > 5) {
                    fs.unlinkSync(filePath);
                    logger.info(null, `Cleaned up old log file: ${file}`);
                }
            }
        });
    } catch (error) {
        logger.error(null, 'Error during log cleanup:', error.message);
    }
}

// Run cleanup at startup
cleanupOldLogs();

// Schedule daily cleanup
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

module.exports = new LoggerWrapper(logger);

// Graceful shutdown: close daily stream on exit to flush buffers
function closeStreams() {
    try {
        if (dailyStream && typeof dailyStream.end === 'function') {
            dailyStream.end();
        }
    } catch (e) {
        // ignore
    }
}

process.on('exit', closeStreams);
process.on('SIGINT', () => {
    closeStreams();
    process.exit(0);
});
process.on('SIGTERM', () => {
    closeStreams();
    process.exit(0);
});