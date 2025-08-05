/**
 * Centralized UI Logger
 * 
 * This module provides a unified logging system for client-side operations,
 * ensuring consistent formatting, color coding, and token status tracking.
 */

// Check if EnhancedClientLogger is available globally or via window
const EnhancedClientLogger = window.EnhancedClientLogger || function(options) {
  // Fallback implementation if the real one isn't available
  return {
    log: function(level, message, data) {
      console.log(`[${level.toUpperCase()}] [${options.context || 'UI'}] ${message}`, data || '');
    },
    info: function(message, data) {
      this.log('info', message, data);
    },
    warn: function(message, data) {
      this.log('warn', message, data);
    },
    error: function(message, data) {
      this.log('error', message, data);
    },
    debug: function(message, data) {
      this.log('debug', message, data);
    }
  };
};

// Create the UI logger instance
export const uiLogger = new EnhancedClientLogger({
  context: 'UIManager',
  level: 'info',
  enableConsole: true
});
