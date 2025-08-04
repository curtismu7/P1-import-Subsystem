/**
 * Centralized Logger Fallback
 * 
 * Regular script version - not an ES module
 */

/**
 * Centralized Logger Fallback
 * 
 * Provides a fallback implementation of the centralized logger that won't break the application
 * if the main logger fails to load or throws errors.
 */

// Simple console-based logger that won't throw errors
class FallbackLogger {
    constructor(component = 'app') {
        this.component = component;
    }

    // Simple log methods that won't throw
    log(level, message, data) {
        try {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.component}] ${message}`;
            
            if (data) {
                // Safely stringify data, handling circular references
                let dataStr;
                try {
                    const seen = new WeakSet();
                    dataStr = JSON.stringify(data, (key, value) => {
                        if (typeof value === 'object' && value !== null) {
                            if (seen.has(value)) return '[Circular]';
                            seen.add(value);
                        }
                        return value;
                    }, 2);
                } catch (e) {
                    dataStr = '[Non-serializable data]';
                }
                
                console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
                    logMessage,
                    dataStr
                );
            } else {
                console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](logMessage);
            }
        } catch (e) {
            // Last resort - use the most basic logging possible
            console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
                `[${level.toUpperCase()}] ${message}`
            );
        }
    }

    // Standard logging methods
    info(message, data) {
        this.log('info', message, data);
    }

    debug(message, data) {
        if (process.env.NODE_ENV !== 'production') {
            this.log('debug', message, data);
        }
    }

    error(message, error) {
        this.log('error', message, error || '');
    }

    warn(message, data) {
        this.log('warn', message, data);
    }

    // Simple child logger implementation
    child(context) {
        const component = context?.component || this.component;
        return new FallbackLogger(component);
    }
    
    // Performance timing methods
    startTimer(label) {
        if (console.time) {
            console.time(label);
        }
        return {
            label,
            startTime: performance ? performance.now() : Date.now()
        };
    }
    
    endTimer(timer) {
        if (console.timeEnd && timer && timer.label) {
            console.timeEnd(timer.label);
        } else if (timer && timer.startTime) {
            const endTime = performance ? performance.now() : Date.now();
            const duration = endTime - timer.startTime;
            this.info(`Timer '${timer.label || 'unnamed'}' completed in ${duration.toFixed(2)}ms`);
        }
        return timer;
    }
}

// Create a safe global logger that won't break the app
function createSafeGlobalLogger() {
    try {
        // Try to use the real logger if available
        if (window.CentralizedLogger) {
            return new window.CentralizedLogger();
        }
    } catch (e) {
        console.warn('Failed to initialize CentralizedLogger, falling back to console logging', e);
    }
    
    // Fall back to console logging
    return new FallbackLogger('app');
}

// Set up the global logger with fallback
window.logger = createSafeGlobalLogger();

// Export for ES modules (only if in module context)
if (typeof module !== 'undefined' && module.exports) {
    module.exports.logger = window.logger;
    module.exports.FallbackLogger = FallbackLogger;
} else if (typeof window !== 'undefined') {
    // Already set window.logger above
}
