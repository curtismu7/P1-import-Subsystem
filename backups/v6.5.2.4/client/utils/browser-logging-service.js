/**
 * Browser-Compatible Logging Service
 * 
 * Provides unified logging for browser environment with:
 * - Correlation IDs for request tracking
 * - Structured logging with metadata
 * - Console and server transports
 * - Log level filtering
 * - Performance monitoring
 */

export class BrowserLoggingService {
    constructor(options = {}) {
        this.serviceName = options.serviceName || 'pingone-import-client';
        this.environment = options.environment || 'development';
        this.logLevel = options.logLevel || this.getDefaultLogLevel();
        this.enableConsole = options.enableConsole !== false;
        this.enableServer = options.enableServer !== false;
        
        // Log levels hierarchy
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        // Correlation ID for request tracking
        this.correlationId = this.generateCorrelationId();
        
        // Performance tracking
        this.performanceMarks = new Map();
        
        this.initializeTransports();
    }
    
    /**
     * Get default log level based on environment
     */
    getDefaultLogLevel() {
        switch (this.environment) {
            case 'production': return 'info';
            case 'test': return 'warn';
            default: return 'debug';
        }
    }
    
    /**
     * Generate correlation ID for request tracking
     */
    generateCorrelationId() {
        return `${this.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    }
    
    /**
     * Initialize logging transports
     */
    initializeTransports() {
        this.transports = [];
        
        if (this.enableConsole) {
            this.transports.push({
                name: 'console',
                log: this.logToConsole.bind(this)
            });
        }
        
        if (this.enableServer) {
            this.transports.push({
                name: 'server',
                log: this.logToServer.bind(this)
            });
        }
    }
    
    /**
     * Check if log level should be processed
     */
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }
    
    /**
     * Format log entry with metadata
     */
    formatLogEntry(level, message, meta = {}) {
        return {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message,
            service: this.serviceName,
            environment: this.environment,
            correlationId: this.correlationId,
            source: 'client',
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...meta
        };
    }
    
    /**
     * Log to console with formatting
     */
    logToConsole(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;
        
        const entry = this.formatLogEntry(level, message, meta);
        const timestamp = entry.timestamp;
        const correlationId = entry.correlationId.slice(-8);
        
        let consoleMessage = `[${timestamp}] [${correlationId}] [${entry.service}] ${level.toUpperCase()}: ${message}`;
        
        if (Object.keys(meta).length > 0) {
            consoleMessage += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
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
        try {
            const entry = this.formatLogEntry(level, message, meta);
            
            await fetch('/api/logs/client', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(entry)
            });
            
        } catch (error) {
            // Silently fail to avoid infinite loops
            if (this.enableConsole) {
                console.warn('Failed to send log to server:', error.message);
            }
        }
    }
    
    /**
     * Main logging method
     */
    log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;
        
        this.transports.forEach(transport => {
            try {
                transport.log(level, message, meta);
            } catch (error) {
                console.error(`Error in ${transport.name} transport:`, error);
            }
        });
    }
    
    /**
     * Convenience methods
     */
    error(message, meta = {}) {
        this.log('error', message, meta);
    }
    
    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }
    
    info(message, meta = {}) {
        this.log('info', message, meta);
    }
    
    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }
    
    /**
     * Performance monitoring
     */
    startTimer(label) {
        this.performanceMarks.set(label, performance.now());
        this.debug(`Timer started: ${label}`);
    }
    
    endTimer(label, meta = {}) {
        const startTime = this.performanceMarks.get(label);
        if (!startTime) {
            this.warn(`Timer not found: ${label}`);
            return 0;
        }
        
        const duration = performance.now() - startTime;
        this.performanceMarks.delete(label);
        
        this.info(`Timer completed: ${label}`, {
            duration: `${duration.toFixed(2)}ms`,
            ...meta
        });
        
        return duration;
    }
    
    /**
     * Create child logger with additional context
     */
    child(additionalMeta = {}) {
        const childLogger = new BrowserLoggingService({
            serviceName: this.serviceName,
            environment: this.environment,
            logLevel: this.logLevel,
            enableConsole: this.enableConsole,
            enableServer: this.enableServer
        });
        
        // Override formatLogEntry to include additional metadata
        const originalFormatLogEntry = childLogger.formatLogEntry.bind(childLogger);
        childLogger.formatLogEntry = (level, message, meta = {}) => {
            return originalFormatLogEntry(level, message, {
                ...additionalMeta,
                ...meta
            });
        };
        
        return childLogger;
    }
    
    /**
     * Set correlation ID (useful for request tracking)
     */
    setCorrelationId(correlationId) {
        this.correlationId = correlationId;
    }
    
    /**
     * Get current correlation ID
     */
    getCorrelationId() {
        return this.correlationId;
    }
}

/**
 * Create logger instance
 */
export function createLogger(options = {}) {
    return new BrowserLoggingService(options);
}

/**
 * Default logger instance
 */
export const logger = createLogger({
    serviceName: 'pingone-import-client'
});

export default BrowserLoggingService;