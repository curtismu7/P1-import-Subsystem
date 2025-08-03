/**
 * Centralized Server Logger
 * 
 * This module provides a unified logging system for server-side operations,
 * ensuring consistent formatting, color coding, and token status tracking.
 */

import { createWinstonLogger, apiLogHelpers, EMOJIS } from './winston-config.js';

// Export the default logger instance
export const logger = createWinstonLogger({
  service: 'server',
  enableFileLogging: true
});

// Export API log helpers
export { apiLogHelpers, EMOJIS };
