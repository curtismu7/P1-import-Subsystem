/**
 * @fileoverview Winston-compatible logger for frontend environment
 * 
 * This module provides a Winston-like logging interface for the frontend
 * that maintains consistency with server-side Winston logging while
 * working within browser constraints.
 * 
 * Features:
 * - Winston-compatible API (info, warn, error, debug)
 * - Structured logging with metadata
 * - Timestamp formatting
 * - Log level filtering
 * - Console and server transport support
 * - Error stack trace handling
 * - Environment-aware configuration
 */

import { createWinstonLogger } from './winston-logger.js';
import messageFormatter from './message-formatter.js';
import { UIManager } from './ui-manager.js';
const ui = window.app && window.app.uiManager;

/**
 * Winston-compatible logger for browser environment
 */
class Logger {
    constructor(logElement = null) {
        this.logElement = logElement;
        this.logs = [];
        this.validCount = 0;
        this.errorCount = 0;
        this.initialized = false;
        this.serverLoggingEnabled = true;
        this.isLoadingLogs = false;
        this.offlineLogs = [];
        
        // Initialize Winston-compatible logger
        this.winstonLogger = createWinstonLogger({
            service: 'pingone-import-frontend',
            environment: process.env.NODE_ENV || 'development',
            enableServerLogging: true,
            enableConsoleLogging: true
        });
        
        this.initialize();
    }
    
    /**
     * Initialize the logger
     */
    initialize() {
        try {
            this.winstonLogger.info('Logger initialized successfully');
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize logger:', error);
        }
    }
    
    /**
     * Temporarily disable server logging to prevent feedback loops
     */
    disableServerLogging() {
        this.serverLoggingEnabled = false;
        this.winstonLogger.setServerLogging(false);
        this.winstonLogger.debug('Server logging disabled');
    }
    
    /**
     * Re-enable server logging
     */
    enableServerLogging() {
        this.serverLoggingEnabled = true;
        this.winstonLogger.setServerLogging(true);
        this.winstonLogger.debug('Server logging enabled');
    }
    
    /**
     * Set flag to indicate we're loading logs (prevents server logging)
     */
    setLoadingLogs(isLoading) {
        this.isLoadingLogs = isLoading;
        this.winstonLogger.debug(`Loading logs flag set to: ${isLoading}`);
    }
    
    /**
     * Create a safe file logger that handles initialization and errors
     * @private
     */
    _createSafeFileLogger() {
        const logger = {
            _initialized: false,
            _logger: null,
            _queue: [],
            _initializing: false,
            
            async init() {
                if (this._initialized || this._initializing) return;
                
                this._initializing = true;
                try {
                    // Initialize actual FileLogger for client.log
                    const { FileLogger } = await import('./file-logger.js');
                    this._logger = new FileLogger('client.log');
                    this._initialized = true;
                    this._processQueue();
                } catch (error) {
                    console.warn('Failed to initialize file logger, falling back to console:', error.message);
                    // Fallback to console logging
                    this._logger = {
                        log: (level, message, data) => {
                            console[level] || console.log(`[${level.toUpperCase()}] ${message}`, data);
                        }
                    };
                    this._initialized = true;
                    this._processQueue();
                } finally {
                    this._initializing = false;
                }
            },
            
            _processQueue() {
                while (this._queue.length > 0) {
                    const { level, message, data } = this._queue.shift();
                    if (this._logger && typeof this._logger.log === 'function') {
                        this._logger.log(level, message, data);
                    }
                }
            },
            
            log(level, message, data) {
                if (this._initialized && this._logger) {
                    this._logger.log(level, message, data);
                } else {
                    this._queue.push({ level, message, data });
                    if (!this._initializing) {
                        this.init();
                    }
                }
            }
        };
        
        return logger;
    }
    
    /**
     * Parse log arguments into structured format
     * @private
     */
    _parseLogArgs(args) {
        let message = 'Log message';
        let data = null;
        let context = null;

        if (args.length > 0) {
            if (typeof args[0] === 'string') {
                message = args[0];
                if (args.length > 1 && typeof args[1] === 'object') {
                    data = args[1];
                    if (args.length > 2 && typeof args[2] === 'object') {
                        context = args[2];
                    }
                }
            } else if (typeof args[0] === 'object') {
                data = args[0];
                message = 'Log data';
                if (args.length > 1 && typeof args[1] === 'object') {
                    context = args[1];
                }
            }
        }

        return [message, data, context];
    }
    
    /**
     * Main logging method with Winston integration
     */
    log(level, message, data = {}) {
        try {
            // Parse arguments if needed
            if (typeof level === 'string' && typeof message === 'string') {
                // Direct call: log(level, message, data)
                this._logToWinston(level, message, data);
            } else {
                // Legacy call: log(message, level)
                const [parsedMessage, parsedData, context] = this._parseLogArgs(arguments);
                this._logToWinston(level || 'info', parsedMessage, { ...parsedData, ...context });
            }
            
            // Update UI if log element exists
            this._updateLogUI({ level, message, data, timestamp: new Date() });
            
        } catch (error) {
            console.error('Error in logger.log:', error);
        }
    }
    
    /**
     * Log to Winston with proper formatting
     * @private
     */
    _logToWinston(level, message, data = {}) {
        const logData = {
            ...data,
            component: 'frontend-logger',
            timestamp: new Date().toISOString()
        };
        
        this.winstonLogger.log(level, message, logData);
    }
    
    /**
     * Log info level message
     */
    info(message, data = {}) {
        this.log('info', message, data);
    }
    
    /**
     * Log warn level message
     */
    warn(message, data = {}) {
        this.log('warn', message, data);
    }
    
    /**
     * Log error level message
     */
    error(message, data = {}) {
        this.log('error', message, data);
        if (ui) ui.showStatusBar(message, 'error', { autoDismiss: false });
        this.errorCount++;
        this.updateSummary();
    }
    
    /**
     * Log debug level message
     */
    debug(message, data = {}) {
        this.log('debug', message, data);
    }
    
    /**
     * Log success level message
     */
    success(message, data = {}) {
        this.log('info', message, { ...data, type: 'success' });
        this.validCount++;
        this.updateSummary();
    }
    
    /**
     * Log error with stack trace
     */
    errorWithStack(message, error, data = {}) {
        this.winstonLogger.errorWithStack(message, error, data);
        this.errorCount++;
        this.updateSummary();
    }
    
    /**
     * Update log UI with new entry
     * @private
     */
    _updateLogUI(logEntry) {
        if (!this.logElement) return;
        
        try {
            const logElement = document.createElement('div');
            logElement.className = `log-entry ${logEntry.level}`;
            
            // Create timestamp
            const timestamp = document.createElement('span');
            timestamp.className = 'log-timestamp';
            timestamp.textContent = new Date(logEntry.timestamp).toLocaleTimeString();
            logElement.appendChild(timestamp);
            
            // Create level badge
            const levelBadge = document.createElement('span');
            levelBadge.className = 'log-level';
            levelBadge.textContent = logEntry.level.toUpperCase();
            logElement.appendChild(levelBadge);
            
            // Create message with formatting
            const message = document.createElement('span');
            message.className = 'log-message';
            
            // Format the message for better readability
            let formattedMessage = logEntry.message;
            if (logEntry.data && logEntry.data.type) {
                // Format based on message type
                switch (logEntry.data.type) {
                    case 'progress':
                        formattedMessage = messageFormatter.formatProgressMessage(
                            logEntry.data.operation || 'import',
                            logEntry.data.current || 0,
                            logEntry.data.total || 0,
                            logEntry.message,
                            logEntry.data.counts || {}
                        );
                        break;
                    case 'error':
                        formattedMessage = messageFormatter.formatErrorMessage(
                            logEntry.data.operation || 'import',
                            logEntry.message,
                            logEntry.data
                        );
                        break;
                    case 'completion':
                        formattedMessage = messageFormatter.formatCompletionMessage(
                            logEntry.data.operation || 'import',
                            logEntry.data
                        );
                        break;
                    default:
                        // Use original message for other types
                        formattedMessage = logEntry.message;
                }
            }
            
            message.textContent = formattedMessage;
            logElement.appendChild(message);
            
            // Add details if present
            if (logEntry.data && Object.keys(logEntry.data).length > 0) {
                const detailsElement = document.createElement('div');
                detailsElement.className = 'log-details';
                
                const detailsTitle = document.createElement('h4');
                detailsTitle.textContent = 'Details';
                detailsElement.appendChild(detailsTitle);
                
                const detailsContent = document.createElement('pre');
                detailsContent.className = 'log-detail-json';
                detailsContent.textContent = JSON.stringify(logEntry.data, null, 2);
                detailsElement.appendChild(detailsContent);
                
                logElement.appendChild(detailsElement);
            }
            
            // Insert at top (newest first)
            if (this.logElement.firstChild) {
                this.logElement.insertBefore(logElement, this.logElement.firstChild);
            } else {
                this.logElement.appendChild(logElement);
            }
            
            // Auto-scroll to top
            this.logElement.scrollTop = 0;
            
            // Limit UI logs
            const maxUILogs = 100;
            while (this.logElement.children.length > maxUILogs) {
                this.logElement.removeChild(this.logElement.lastChild);
            }
            
        } catch (error) {
            console.error('Error updating log UI:', error);
        }
    }
    
    /**
     * Send log to server
     * @private
     */
    async _sendToServer(logEntry) {
        if (!this.serverLoggingEnabled || this.isLoadingLogs) {
            return;
        }
        
        try {
            await fetch('/api/logs/ui', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    level: logEntry.level,
                    message: logEntry.message,
                    data: logEntry.data
                })
            });
        } catch (error) {
            this.winstonLogger.warn('Failed to send log to server', { error: error.message });
            this.offlineLogs.push(logEntry);
        }
    }
    
    /**
     * Render all logs to UI
     */
    renderLogs() {
        if (!this.logElement) return;
        
        this.logElement.innerHTML = '';
        this.logs.forEach(log => this._updateLogUI(log));
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }
    
    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
        if (this.logElement) {
            this.logElement.innerHTML = '';
        }
        this.winstonLogger.info('Logs cleared');
    }
    
    /**
     * Get all logs
     */
    getLogs() {
        return [...this.logs];
    }
    
    /**
     * Update summary display
     */
    updateSummary() {
        // Implementation depends on UI structure
        this.winstonLogger.debug('Summary updated', { 
            validCount: this.validCount, 
            errorCount: this.errorCount 
        });
    }
    
    /**
     * Clear summary
     */
    clearSummary() {
        this.validCount = 0;
        this.errorCount = 0;
        this.winstonLogger.debug('Summary cleared');
    }
}

// Export the Logger class
export { Logger };
