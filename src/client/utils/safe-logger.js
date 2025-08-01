/**
 * Safe Logger Wrapper
 * 
 * Provides a fault-tolerant wrapper around the logger to prevent logging errors
 * from breaking the application. Supports log levels and structured logging.
 */

// Log level constants
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
};

// Browser-compatible environment detection
const getBrowserEnvironment = () => {
    if (typeof window !== 'undefined') {
        // Check hostname for development detection
        if (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1') {
            return 'development';
        }
        // Check for test environment indicators
        if (window.location?.search?.includes('test=true') || window.location?.pathname?.includes('/test')) {
            return 'test';
        }
    }
    return 'production';
};

const browserEnv = getBrowserEnvironment();

// Default log level based on environment
const DEFAULT_LEVEL = browserEnv === 'production' ? 'INFO' : 'DEBUG';

// Environment detection
const isProduction = browserEnv === 'production';
const isTest = browserEnv === 'test';

/**
 * Create a safe logger instance
 * @param {Object} logger - The underlying logger to wrap
 * @param {Object} options - Configuration options
 * @param {string} options.level - Minimum log level to output
 * @param {Object} options.defaultMeta - Default metadata to include in logs
 * @returns {Object} Safe logger instance
 */
export function createSafeLogger(logger, options = {}) {
    const {
        level = DEFAULT_LEVEL,
        defaultMeta = {},
        disableInTest = true
    } = options;

    const currentLevel = typeof level === 'string' ? (LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO) : level;
    
    // Skip all logging in test environment if disabled
    if (isTest && disableInTest) {
        return createNoopLogger();
    }

    // Create a safe version of each logging method
    const safeLogger = {
        error: (message, error, meta = {}) => {
            if (currentLevel < LOG_LEVELS.ERROR) return;
            
            const logData = createLogData('ERROR', message, error, { ...defaultMeta, ...meta });
            try {
                if (logger?.error) {
                    logger.error(logData.message, logData);
                } else {
                    console.error(formatConsoleLog('ERROR', logData));
                }
            } catch (e) {
                console.error(`[SAFE-LOGGER] [ERROR] ${message}`, error || '');
            }
        },
        
        warn: (message, data, meta = {}) => {
            if (currentLevel < LOG_LEVELS.WARN) return;
            
            const logData = createLogData('WARN', message, data, { ...defaultMeta, ...meta });
            try {
                if (logger?.warn) {
                    logger.warn(logData.message, logData);
                } else {
                    console.warn(formatConsoleLog('WARN', logData));
                }
            } catch (e) {
                console.warn(`[SAFE-LOGGER] [WARN] ${message}`, data || '');
            }
        },
        
        info: (message, data, meta = {}) => {
            if (currentLevel < LOG_LEVELS.INFO) return;
            
            const logData = createLogData('INFO', message, data, { ...defaultMeta, ...meta });
            try {
                if (logger?.info) {
                    logger.info(logData.message, logData);
                } else {
                    console.info(formatConsoleLog('INFO', logData));
                }
            } catch (e) {
                console.log(`[SAFE-LOGGER] [INFO] ${message}`, data || '');
            }
        },
        
        debug: (message, data, meta = {}) => {
            if (currentLevel < LOG_LEVELS.DEBUG) return;
            
            const logData = createLogData('DEBUG', message, data, { ...defaultMeta, ...meta });
            try {
                if (logger?.debug) {
                    logger.debug(logData.message, logData);
                } else {
                    console.debug(formatConsoleLog('DEBUG', logData));
                }
            } catch (e) {
                console.debug(`[SAFE-LOGGER] [DEBUG] ${message}`, data || '');
            }
        },
        
        trace: (message, data, meta = {}) => {
            if (currentLevel < LOG_LEVELS.TRACE) return;
            
            const logData = createLogData('TRACE', message, data, { ...defaultMeta, ...meta });
            try {
                if (logger?.trace) {
                    logger.trace(logData.message, logData);
                } else if (logger?.debug) { // Fallback to debug if trace not available
                    logger.debug(`[TRACE] ${logData.message}`, logData);
                } else {
                    console.debug(formatConsoleLog('TRACE', logData));
                }
            } catch (e) {
                console.debug(`[SAFE-LOGGER] [TRACE] ${message}`, data || '');
            }
        },
        
        child: (context) => {
            try {
                if (logger?.child) {
                    return createSafeLogger(logger.child(context), {
                        level: currentLevel,
                        defaultMeta: { ...defaultMeta, ...context }
                    });
                }
                // If the logger doesn't support child, create a new logger with merged context
                return createSafeLogger(logger, {
                    level: currentLevel,
                    defaultMeta: { ...defaultMeta, ...context }
                });
            } catch (e) {
                console.warn('[SAFE-LOGGER] Failed to create child logger', e);
                return safeLogger;
            }
        },
        
        // Add any other logger methods that might be needed
        ...(logger || {})
    };
    
    return safeLogger;
}

/**
 * Create a no-op logger for test environments
 */
function createNoopLogger() {
    const noop = () => {};
    return {
        error: noop,
        warn: noop,
        info: noop,
        debug: noop,
        trace: noop,
        child: () => createNoopLogger()
    };
}

/**
 * Create structured log data
 */
function createLogData(level, message, errorOrData = {}, meta = {}) {
    const timestamp = new Date().toISOString();
    const isError = errorOrData instanceof Error;
    
    const logData = {
        ...meta,
        level,
        message: typeof message === 'string' ? message : JSON.stringify(message),
        timestamp,
        ...(isError ? {
            error: {
                name: errorOrData.name,
                message: errorOrData.message,
                stack: errorOrData.stack,
                ...(errorOrData.code && { code: errorOrData.code }),
                ...(errorOrData.statusCode && { statusCode: errorOrData.statusCode })
            }
        } : { data: errorOrData })
    };
    
    return logData;
}

/**
 * Format log for console output
 */
function formatConsoleLog(level, logData) {
    const { message, timestamp, ...rest } = logData;
    const timeStr = new Date(timestamp).toISOString().replace('T', ' ').replace(/\..+/, '');
    
    // Format the main log line
    let logLine = `[${timeStr}] [${level}] ${message}`;
    
    // Add additional data if present
    const hasAdditionalData = Object.keys(rest).length > 0;
    if (hasAdditionalData) {
        try {
            logLine += '\n' + JSON.stringify(rest, null, isProduction ? 0 : 2);
        } catch (e) {
            logLine += ' [Additional data could not be stringified]';
        }
    }
    
    return logLine;
}

// Default export is a safe console logger
export const safeConsoleLogger = createSafeLogger(console);

// Create a safe version of the global logger if it exists
if (typeof window !== 'undefined') {
    try {
        const globalLogger = window.logger || console;
        window.safeLogger = createSafeLogger(globalLogger, {
            level: DEFAULT_LEVEL,
            defaultMeta: {
                env: browserEnv,
                app: 'pingone-import-tool'
            }
        });
    } catch (e) {
        console.warn('Failed to create safe global logger', e);
        window.safeLogger = safeConsoleLogger;
    }
}

export { LOG_LEVELS };
