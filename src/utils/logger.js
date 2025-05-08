/**
 * Logger utility for WordPress MCP Server
 */
const winston = require('winston');
const config = require('../config');

const { format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;

// Custom log format for development
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
});

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: config.logging.format === 'json'
    ? combine(timestamp(), json())
    : combine(colorize(), timestamp(), consoleFormat),
  transports: [
    new transports.Console()
  ]
});

module.exports = logger; 