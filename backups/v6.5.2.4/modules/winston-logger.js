/**
 * @fileoverview Winston-compatible logger for frontend/browser environment
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

/**
 * Winston-compatible logger for browser environment
 */
class WinstonLogger {
    constructor(options = {}) {
        this.level = options.level || this.getDefaultLevel();
        this.service = options.service || 'pingone-import-frontend';
        this.environment = options.environment || (process.env.NODE_ENV || 'development');
        this.enableServerLogging = options.enableServerLogging !== false;
        this.enableConsoleLogging = options.enableConsoleLogging !== false;
        
        // Log level hierarchy
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        // Initialize transports
        this.transports = [];
        this.initializeTransports();
    }
    
    /**
     * Get default log level based on environment
     */
    getDefaultLevel() {
        if (this.environment === 'production') {
            return 'info';
        } else if (this.environment === 'test') {
            return 'warn';
        } else {
            return 'debug';
        }
    }
    
    /**
     * Initialize logging transports
     */
    initializeTransports() {
        // Console transport
        if (this.enableConsoleLogging) {
            this.transports.push({
                name: 'console',
                log: (level, message, meta) => this.logToConsole(level, message, meta)
            });
        }
        
        // Server transport (if enabled)
        if (this.enableServerLogging) {
            this.transports.push({
                name: 'server',
                log: (level, message, meta) => this.logToServer(level, message, meta)
            });
        }
    }
    
    /**
     * Check if a log level should be logged
     */
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.level];
    }
    
    /**
     * Format timestamp
     */
    formatTimestamp() {
        return new Date().toISOString();
    }
    
    /**
     * Format log entry
     */
    formatLogEntry(level, message, meta = {}) {
        const timestamp = this.formatTimestamp();
        
        return {
            timestamp,
            level,
            message,
            service: this.service,
            environment: this.environment,
            ...meta
        };
    }
    
    /**
     * Log to console with Winston-like formatting
     */
    logToConsole(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;
        
        const logEntry = this.formatLogEntry(level, message, meta);
        const timestamp = logEntry.timestamp;
        const levelUpper = level.toUpperCase();
        
        // Create formatted console message
        let consoleMessage = `[${timestamp}] [${this.service}] ${levelUpper}: ${message}`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
            consoleMessage += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
        // Use appropriate console method
        switch (level) {
            case 'error':
                console.error(consoleMessage);
                break;
            case 'warn':
                console.warn(consoleMessage);
                break;
            case 'info':
                console.info(consoleMessage);
                break;
            case 'debug':
                console.debug(consoleMessage);
                break;
            default:
                console.log(consoleMessage);
        }
    }
    
    /**
     * Log to server via API endpoint
     */
    async logToServer(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;
        
        try {
            // Format the request body according to the API expectations
            const requestBody = {
                message,
                level,
                data: meta,
                source: 'frontend'
            };
            
            // Send to server logging endpoint
            await fetch('/api/logs/ui', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        } catch (error) {
            // Handle connection refused errors silently during startup
            if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                // Don't log connection refused errors to avoid console spam during startup
                return;
            }
            // Fallback to console if server logging fails
            console.warn('Server logging failed, falling back to console:', error.message);
            this.logToConsole(level, message, meta);
        }
    }
    
    /**
     * Main logging method
     */
    log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;
        
        // Send to all transports
        this.transports.forEach(transport => {
            try {
                transport.log(level, message, meta);
            } catch (error) {
                console.error(`Error in ${transport.name} transport:`, error);
            }
        });
    }
    
    /**
     * Log info level message
     */
    info(message, meta = {}) {
        this.log('info', message, meta);
    }
    
    /**
     * Log warn level message
     */
    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }
    
    /**
     * Log error level message
     */
    error(message, meta = {}) {
        this.log('error', message, meta);
    }
    
    /**
     * Log debug level message
     */
    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }
    
    /**
     * Log error with stack trace
     */
    errorWithStack(message, error, meta = {}) {
        const errorMeta = {
            ...meta,
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            }
        };
        
        this.error(message, errorMeta);
    }
    
    /**
     * Create child logger with additional metadata
     */
    child(additionalMeta = {}) {
        const childLogger = new WinstonLogger({
            level: this.level,
            service: this.service,
            environment: this.environment,
            enableServerLogging: this.enableServerLogging,
            enableConsoleLogging: this.enableConsoleLogging
        });
        
        // Override formatLogEntry to include additional metadata
        childLogger.formatLogEntry = (level, message, meta = {}) => {
            const baseEntry = this.formatLogEntry(level, message, meta);
            return {
                ...baseEntry,
                ...additionalMeta
            };
        };
        
        return childLogger;
    }
    
    /**
     * Set log level
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.level = level;
        } else {
            this.warn(`Invalid log level: ${level}`);
        }
    }
    
    /**
     * Enable/disable server logging
     */
    setServerLogging(enabled) {
        this.enableServerLogging = enabled;
        
        // Update transports
        this.transports = this.transports.filter(t => t.name !== 'server');
        if (enabled) {
            this.transports.push({
                name: 'server',
                log: (level, message, meta) => this.logToServer(level, message, meta)
            });
        }
    }
    
    /**
     * Enable/disable console logging
     */
    setConsoleLogging(enabled) {
        this.enableConsoleLogging = enabled;
        
        // Update transports
        this.transports = this.transports.filter(t => t.name !== 'console');
        if (enabled) {
            this.transports.push({
                name: 'console',
                log: (level, message, meta) => this.logToConsole(level, message, meta)
            });
        }
    }
}

/**
 * Create default logger instance
 */
export function createWinstonLogger(options = {}) {
    return new WinstonLogger(options);
}

/**
 * Create component-specific logger
 */
export function createComponentLogger(component, options = {}) {
    return createWinstonLogger({
        ...options,
        service: `${options.service || 'pingone-import'}-${component}`
    });
}

/**
 * Default logger instances
 */
export const defaultLogger = createWinstonLogger();
export const apiLogger = createComponentLogger('api');
export const uiLogger = createComponentLogger('ui');
export const fileLogger = createComponentLogger('file');
export const settingsLogger = createComponentLogger('settings');
export const tokenLogger = createComponentLogger('token');

// Export the class for custom instances
export { WinstonLogger }; 