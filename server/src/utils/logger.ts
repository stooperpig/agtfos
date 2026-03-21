import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import fs from 'fs';
import util from 'util';

const { combine, timestamp, printf, colorize } = winston.format;

// Ensure logs directory exists in the server directory
import path from 'path';

// Get the server's root directory (where package.json is located)
const logsDir = path.join(process.cwd(), 'logs');

try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`Created logs directory at: ${logsDir}`);
  } else {
    console.log(`Using existing logs directory: ${logsDir}`);
  }
} catch (error) {
  console.error('FATAL: Failed to initialize logs directory:', error);
  console.error('Attempted path:', logsDir);
  process.exit(1);
}

// Set default directory for all file transports
const fileTransportOptions = {
  dirname: logsDir,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '100m',
  createSymlink: true,
  symlinkName: 'current.log'
};

// Console format (for readability)
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp }) => `[${timestamp}] ${level}: ${message}`)
);

// File format (structured JSON)
const fileFormat = combine(timestamp({
  format: () =>
    new Date().toLocaleString('en-US', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
}), winston.format.printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
}));

// Main logger
export const consoleLogger = winston.createLogger({
  level: process.env.NODE_ENV === 'prod' ? 'info' : 'debug',
  format: fileFormat,
  transports: [
    // Main rotating file (info and above)
    new DailyRotateFile({
      ...fileTransportOptions,
      filename: 'app-%DATE%.log',
      maxFiles: '14d',
      level: 'info',
    }),

    // Separate rotating file for errors
    new DailyRotateFile({
      ...fileTransportOptions,
      filename: 'error-%DATE%.log',
      maxFiles: '30d',
      level: 'error',
    }),
  ],
});

// Add debug log file only in development
if (process.env.NODE_ENV !== 'prod') {
  consoleLogger.add(
    new DailyRotateFile({
      ...fileTransportOptions,
      filename: 'debug-%DATE%.log',
      zippedArchive: false,
      maxFiles: '7d',
      level: 'debug',
    })
  );

  // Add colorized console output
  consoleLogger.add(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    })
  );
}

export const stringifyArgs = (args: any[]) => {
  try {
    return util.format(...(args as any));
  } catch (err) {
    return `formatError: ${JSON.stringify(err)}`;
  }
}

// Redirect console.* to Winston
console.log = (...args) => consoleLogger.debug(stringifyArgs(args));
console.info = (...args) => consoleLogger.info(stringifyArgs(args));
console.warn = (...args) => consoleLogger.warn(stringifyArgs(args));
console.error = (...args) => consoleLogger.error(stringifyArgs(args));
console.debug = (...args) => consoleLogger.debug(stringifyArgs(args));