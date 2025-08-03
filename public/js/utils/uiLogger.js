/**
 * Centralized UI Logger
 * 
 * This module provides a unified logging system for client-side operations,
 * ensuring consistent formatting, color coding, and token status tracking.
 */

import EnhancedClientLogger from './enhanced-client-logger.js';

// Export the default UI logger instance
export const uiLogger = new EnhancedClientLogger({
  context: 'UIManager',
  level: 'info',
  enableConsole: true
});
