/**
 * Centralized Logging Service
 * 
 * Provides unified logging across client and server with:
 * - Correlation IDs for request tracking
 * - Structured logging with metadata
 * - Multiple transports (console, file, server)
 * - Log level filtering
 * - Performance monitoring
 */

import { v4 as uuidv4 } from 'uuid';

export class CentralizedLoggingService {
    constructor(options = {}) {
        this.serviceName = options.serviceName || 'pingone-import';
        this.environment = options.environment || process.env.NODE_ENV || 'development';
        this.logLevel = options.logLevel || this.getDefaultLogLevel();
        this.enableConsole = options.enableConsole !== false;
        this.enableFile = options.enableFile !== false;
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
        return `${this.serviceName}-${Date.now()}-${uuidv4().slice(0, 8)}`;
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
        
        if (this.enableFile && typeof window === 'undefined') {
            this.transports.push({
                name: 'file',
                log: this.logToFile.bind(this)
            });
        }
        
        if (this.enableServer && typeof window !== 'undefined') {
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
            source: typeof window !== 'undefined' ? 'client' : 'server',
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
     * Log to file (server-side only)
     */
    async logToFile(level, message, meta = {}) {
        if (typeof window !== 'undefined') return; // Client-side, skip
        
        try {
            const entry = this.formatLogEntry(level, message, meta);
            const logLine = JSON.stringify(entry) + '\n';
            
            // Import fs dynamically for server-side
            const fs = await import('fs/promises');
            const path = await import('path');
            
            const logsDir = path.join(process.cwd(), 'logs');
            
            // Ensure logs directory exists
            try {
                await fs.mkdir(logsDir, { recursive: true });
            } catch (error) {
                // Directory already exists
            }
            
            // Write to appropriate log files
            const serverLogFile = path.join(logsDir, 'server.log');
            const combinedLogFile = path.join(logsDir, 'combined.log');
            
            await fs.appendFile(serverLogFile, logLine);
            await fs.appendFile(combinedLogFile, logLine);
            
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    
    /**
     * Log to server (client-side only)
     */
    async logToServer(level, message, meta = {}) {
        if (typeof window === 'undefined') return; // Server-side, skip
        
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
        this.performanceMarks.set(label, Date.now());
        this.debug(`Timer started: ${label}`);
    }
    
    endTimer(label, meta = {}) {
        const startTime = this.performanceMarks.get(label);
        if (!startTime) {
            this.warn(`Timer not found: ${label}`);
            return 0;
        }
        
        const duration = Date.now() - startTime;
        this.performanceMarks.delete(label);
        
        this.info(`Timer completed: ${label}`, {
            duration: `${duration}ms`,
            ...meta
        });
        
        return duration;
    }
    
    /**
     * Create child logger with additional context
     */
    child(additionalMeta = {}) {
        const childLogger = new CentralizedLoggingService({
            serviceName: this.serviceName,
            environment: this.environment,
            logLevel: this.logLevel,
            enableConsole: this.enableConsole,
            enableFile: this.enableFile,
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
    return new CentralizedLoggingService(options);
}

/**
 * Default logger instance
 */
export const logger = createLogger({
    serviceName: 'pingone-import-main'
});

export default CentralizedLoggingService;