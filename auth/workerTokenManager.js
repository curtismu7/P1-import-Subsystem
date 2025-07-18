// ===============================
// workerTokenManager.js
// Purpose: Shared PingOne worker token manager for all server-side API calls
// Exports a singleton TokenManager instance with robust caching, auto-refresh, and logging
// ===============================

// SECTION: Imports
import TokenManager from '../server/token-manager.js';
import winston from 'winston';

// SECTION: Logger Setup
// Use a dedicated logger for token management
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
            return `[${timestamp}] ${level}: ${message}${metaString}`;
        })
    ),
    defaultMeta: { service: 'worker-token-manager', env: process.env.NODE_ENV || 'development' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
                    return `[${timestamp}] ${level}: ${message}${metaString}`;
                })
            )
        })
    ]
});

// SECTION: Singleton TokenManager
// This instance is shared across all routes and API calls
const workerTokenManager = new TokenManager(logger);

// SECTION: Export
export default workerTokenManager; 