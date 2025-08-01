/**
 * Logging Subsystem
 * Centralized logging system that replaces legacy window.logManager
 * Provides structured logging with levels, categories, and event integration
 */

import { createWinstonLogger } from './winston-logger.js';

export class LoggingSubsystem {
    constructor(eventBus, settingsSubsystem) {
        this.eventBus = eventBus;
        this.settingsSubsystem = settingsSubsystem;
        
        // Initialize Winston logger
        this.logger = createWinstonLogger({
            service: 'logging-subsystem',
            environment: process.env.NODE_ENV || 'development'
        });
        
        // Log storage for UI display
        this.logHistory = [];
        this.maxHistorySize = 1000;
        
        // Log levels
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };
        
        // Current log level (configurable)
        this.currentLevel = this.levels.INFO;
        
        // Log categories for filtering
        this.categories = {
            SYSTEM: 'system',
            AUTH: 'auth',
            IMPORT: 'import',
            EXPORT: 'export',
            DELETE: 'delete',
            MODIFY: 'modify',
            UI: 'ui',
            API: 'api',
            ERROR: 'error'
        };
        
        // Initialize subsystem
        this.init();
        
        this.logger.info('LoggingSubsystem initialized successfully');
    }
    
    /**
     * Initialize the logging subsystem
     */
    async init() {
        try {
            // Load logging settings
            await this.loadSettings();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Replace global logManager if it exists
            this.replaceGlobalLogManager();
            
            this.logger.info('LoggingSubsystem initialization complete');
        } catch (error) {
            this.logger.error('Failed to initialize LoggingSubsystem', error);
            throw error;
        }
    }
    
    /**
     * Load logging settings from SettingsSubsystem
     */
    async loadSettings() {
        try {
            if (this.settingsSubsystem) {
                await this.settingsSubsystem.loadCurrentSettings();
                const settings = this.settingsSubsystem.currentSettings;
                
                // Set log level from settings
                if (settings.logLevel) {
                    this.setLogLevel(settings.logLevel);
                }
                
                // Set max history size from settings
                if (settings.maxLogHistory) {
                    this.maxHistorySize = settings.maxLogHistory;
                }
            }
        } catch (error) {
            this.logger.warn('Could not load logging settings, using defaults', error);
        }
    }
    
    /**
     * Set up event listeners for cross-subsystem communication
     */
    setupEventListeners() {
        if (this.eventBus) {
            // Listen for log level changes
            this.eventBus.on('loggingLevelChanged', (data) => {
                this.setLogLevel(data.level);
            });
            
            // Listen for log clear requests
            this.eventBus.on('clearLogs', () => {
                this.clearLogs();
            });
            
            // Listen for log export requests
            this.eventBus.on('exportLogs', (data) => {
                this.exportLogs(data.options);
            });
        }
    }
    
    /**
     * Replace global window.logManager with this subsystem
     */
    replaceGlobalLogManager() {
        // Create a compatibility layer for legacy code
        window.logManager = {
            log: (level, message, data) => this.log(level, message, data),
            error: (message, data) => this.error(message, data),
            warn: (message, data) => this.warn(message, data),
            info: (message, data) => this.info(message, data),
            debug: (message, data) => this.debug(message, data),
            loadLogs: () => this.loadLogs(),
            clearLogs: () => this.clearLogs(),
            exportLogs: (options) => this.exportLogs(options),
            // Legacy compatibility
            getLogger: (name) => this.getLogger(name)
        };
        
        this.logger.info('Global logManager replaced with LoggingSubsystem compatibility layer');
    }
    
    /**
     * Main logging method
     */
    log(level, message, data = {}, category = this.categories.SYSTEM) {
        const levelValue = typeof level === 'string' ? 
            this.levels[level.toUpperCase()] : level;
        
        // Check if log level is enabled
        if (levelValue > this.currentLevel) {
            return;
        }
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toLowerCase(),
            message,
            data: this.sanitizeLogData(data),
            category,
            sessionId: this.generateSessionId()
        };
        
        // Add to history
        this.addToHistory(logEntry);
        
        // Log to Winston
        this.logger[level.toLowerCase()](message, {
            data: logEntry.data,
            category,
            sessionId: logEntry.sessionId
        });
        
        // Emit log event for UI updates
        if (this.eventBus) {
            this.eventBus.emit('logEntry', logEntry);
        }
        
        // Console output for development
        if (process.env.NODE_ENV === 'development') {
            this.consoleLog(logEntry);
        }
    }
    
    /**
     * Error logging
     */
    error(message, data = {}, category = this.categories.ERROR) {
        this.log('ERROR', message, data, category);
    }
    
    /**
     * Warning logging
     */
    warn(message, data = {}, category = this.categories.SYSTEM) {
        this.log('WARN', message, data, category);
    }
    
    /**
     * Info logging
     */
    info(message, data = {}, category = this.categories.SYSTEM) {
        this.log('INFO', message, data, category);
    }
    
    /**
     * Debug logging
     */
    debug(message, data = {}, category = this.categories.SYSTEM) {
        this.log('DEBUG', message, data, category);
    }
    
    /**
     * Trace logging
     */
    trace(message, data = {}, category = this.categories.SYSTEM) {
        this.log('TRACE', message, data, category);
    }
    
    /**
     * Get a logger instance for a specific component
     */
    getLogger(name) {
        return {
            error: (message, data) => this.error(`[${name}] ${message}`, data),
            warn: (message, data) => this.warn(`[${name}] ${message}`, data),
            info: (message, data) => this.info(`[${name}] ${message}`, data),
            debug: (message, data) => this.debug(`[${name}] ${message}`, data),
            trace: (message, data) => this.trace(`[${name}] ${message}`, data)
        };
    }
    
    /**
     * Set the current log level
     */
    setLogLevel(level) {
        if (typeof level === 'string') {
            this.currentLevel = this.levels[level.toUpperCase()] || this.levels.INFO;
        } else {
            this.currentLevel = level;
        }
        
        this.logger.info('Log level changed', { newLevel: this.currentLevel });
        
        // Emit event for UI updates
        if (this.eventBus) {
            this.eventBus.emit('logLevelChanged', { level: this.currentLevel });
        }
    }
    
    /**
     * Add log entry to history
     */
    addToHistory(logEntry) {
        this.logHistory.unshift(logEntry);
        
        // Maintain history size limit
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory = this.logHistory.slice(0, this.maxHistorySize);
        }
    }
    
    /**
     * Load logs for UI display
     */
    async loadLogs(options = {}) {
        try {
            const {
                limit = 100,
                offset = 0,
                level = null,
                category = null,
                search = null,
                startDate = null,
                endDate = null
            } = options;
            
            let filteredLogs = [...this.logHistory];
            
            // Apply filters
            if (level) {
                filteredLogs = filteredLogs.filter(log => log.level === level.toLowerCase());
            }
            
            if (category) {
                filteredLogs = filteredLogs.filter(log => log.category === category);
            }
            
            if (search) {
                const searchLower = search.toLowerCase();
                filteredLogs = filteredLogs.filter(log => 
                    log.message.toLowerCase().includes(searchLower) ||
                    JSON.stringify(log.data).toLowerCase().includes(searchLower)
                );
            }
            
            if (startDate) {
                filteredLogs = filteredLogs.filter(log => 
                    new Date(log.timestamp) >= new Date(startDate)
                );
            }
            
            if (endDate) {
                filteredLogs = filteredLogs.filter(log => 
                    new Date(log.timestamp) <= new Date(endDate)
                );
            }
            
            // Apply pagination
            const paginatedLogs = filteredLogs.slice(offset, offset + limit);
            
            const result = {
                logs: paginatedLogs,
                total: filteredLogs.length,
                hasMore: offset + limit < filteredLogs.length
            };
            
            this.logger.debug('Logs loaded', {
                requested: limit,
                returned: paginatedLogs.length,
                total: result.total
            });
            
            return result;
            
        } catch (error) {
            this.logger.error('Failed to load logs', error);
            throw error;
        }
    }
    
    /**
     * Clear all logs
     */
    clearLogs() {
        const previousCount = this.logHistory.length;
        this.logHistory = [];
        
        this.logger.info('Logs cleared', { previousCount });
        
        // Emit event for UI updates
        if (this.eventBus) {
            this.eventBus.emit('logsCleared', { previousCount });
        }
    }
    
    /**
     * Export logs to file
     */
    async exportLogs(options = {}) {
        try {
            const {
                format = 'json',
                filename = `logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`
            } = options;
            
            const logs = await this.loadLogs({ limit: this.maxHistorySize });
            
            let content;
            let mimeType;
            let extension;
            
            switch (format.toLowerCase()) {
                case 'csv':
                    content = this.convertLogsToCSV(logs.logs);
                    mimeType = 'text/csv';
                    extension = 'csv';
                    break;
                case 'txt':
                    content = this.convertLogsToText(logs.logs);
                    mimeType = 'text/plain';
                    extension = 'txt';
                    break;
                case 'json':
                default:
                    content = JSON.stringify(logs.logs, null, 2);
                    mimeType = 'application/json';
                    extension = 'json';
                    break;
            }
            
            // Create and download file
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.${extension}`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.logger.info('Logs exported successfully', {
                format,
                filename: `${filename}.${extension}`,
                logCount: logs.logs.length
            });
            
        } catch (error) {
            this.logger.error('Failed to export logs', error);
            throw error;
        }
    }
    
    /**
     * Convert logs to CSV format
     */
    convertLogsToCSV(logs) {
        const headers = ['Timestamp', 'Level', 'Category', 'Message', 'Data'];
        const csvRows = [headers.join(',')];
        
        logs.forEach(log => {
            const row = [
                log.timestamp,
                log.level,
                log.category,
                `"${log.message.replace(/"/g, '""')}"`,
                `"${JSON.stringify(log.data).replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    /**
     * Convert logs to text format
     */
    convertLogsToText(logs) {
        return logs.map(log => {
            const dataStr = Object.keys(log.data).length > 0 ? 
                ` | Data: ${JSON.stringify(log.data)}` : '';
            return `[${log.timestamp}] ${log.level.toUpperCase()} [${log.category}] ${log.message}${dataStr}`;
        }).join('\n');
    }
    
    /**
     * Console logging for development
     */
    consoleLog(logEntry) {
        const { level, message, data, category, timestamp } = logEntry;
        const prefix = `[${timestamp}] [${category}]`;
        
        switch (level) {
            case 'error':
                console.error(prefix, message, data);
                break;
            case 'warn':
                console.warn(prefix, message, data);
                break;
            case 'debug':
                console.debug(prefix, message, data);
                break;
            case 'trace':
                console.trace(prefix, message, data);
                break;
            default:
                console.log(prefix, message, data);
        }
    }
    
    /**
     * Sanitize log data to prevent circular references and sensitive data
     */
    sanitizeLogData(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        
        try {
            // Create a deep copy and remove sensitive fields
            const sanitized = JSON.parse(JSON.stringify(data, (key, value) => {
                // Remove sensitive fields
                const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey', 'clientSecret'];
                if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                    return '[REDACTED]';
                }
                
                // Handle circular references
                if (typeof value === 'object' && value !== null) {
                    if (value.constructor && value.constructor.name === 'HTMLElement') {
                        return '[HTMLElement]';
                    }
                    if (value instanceof Error) {
                        return {
                            name: value.name,
                            message: value.message,
                            stack: value.stack
                        };
                    }
                }
                
                return value;
            }));
            
            return sanitized;
        } catch (error) {
            return { error: 'Failed to sanitize log data', original: String(data) };
        }
    }
    
    /**
     * Generate session ID for log tracking
     */
    generateSessionId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get logging statistics
     */
    getStats() {
        const stats = {
            totalLogs: this.logHistory.length,
            levelCounts: {},
            categoryCounts: {},
            recentActivity: this.logHistory.slice(0, 10)
        };
        
        // Count by level
        this.logHistory.forEach(log => {
            stats.levelCounts[log.level] = (stats.levelCounts[log.level] || 0) + 1;
            stats.categoryCounts[log.category] = (stats.categoryCounts[log.category] || 0) + 1;
        });
        
        return stats;
    }
}

// Export for use in other modules
export default LoggingSubsystem;
