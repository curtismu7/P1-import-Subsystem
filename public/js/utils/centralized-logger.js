/**
 * Centralized Logger Utility
 * 
 * Provides structured logging with sensitive data masking, remote logging,
 * and consistent formatting across the application.
 */

class CentralizedLogger {
    constructor(options = {}) {
        this.component = options.component || 'app';
        this.level = options.level || 'info';
        this.enableRemoteLogging = options.enableRemoteLogging !== false;
        this.enableConsoleLogging = options.enableConsoleLogging !== false;
        this.timers = new Map();
        this.sensitivePatterns = [
            /password/i,
            /token/i,
            /secret/i,
            /key/i,
            /credential/i,
            /auth/i
        ];
    }

    /**
     * Mask sensitive data in log messages
     */
    maskSensitiveData(data) {
        if (typeof data === 'string') {
            return data.replace(/("(?:password|token|secret|key|credential|auth)"\s*:\s*")([^"]+)"/gi, '$1***MASKED***"');
        }
        
        if (typeof data === 'object' && data !== null) {
            const masked = { ...data };
            for (const key in masked) {
                if (this.sensitivePatterns.some(pattern => pattern.test(key))) {
                    masked[key] = '***MASKED***';
                } else if (typeof masked[key] === 'object') {
                    masked[key] = this.maskSensitiveData(masked[key]);
                }
            }
            return masked;
        }
        
        return data;
    }

    /**
     * Format log message with timestamp and component info
     */
    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const component = this.component;
        
        let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${component}] ${message}`;
        
        if (data) {
            const maskedData = this.maskSensitiveData(data);
            formattedMessage += ` | Data: ${JSON.stringify(maskedData, null, 2)}`;
        }
        
        return formattedMessage;
    }

    /**
     * Send log to remote endpoint
     */
    async sendRemoteLog(level, message, data = null) {
        if (!this.enableRemoteLogging) return;
        
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                level,
                component: this.component,
                message,
                data: this.maskSensitiveData(data),
                userAgent: navigator.userAgent,
                url: window.location.href
            };

            await fetch('/api/logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logEntry)
            });
        } catch (error) {
            // Fallback to console if remote logging fails
            if (this.enableConsoleLogging) {
                console.warn('Remote logging failed:', error);
            }
        }
    }

    /**
     * Log debug message
     */
    debug(message, data = null) {
        // Only log if debug mode is enabled in settings
        const settings = window.settings || {};
        if (!settings.debugMode) {
            return; // Suppress debug log if not in debug mode
        }

        try {
            const formattedMessage = this.formatMessage ? this.formatMessage('debug', message, data) : `[DEBUG] ${message}`;
            
            if (this.enableConsoleLogging) {
                console.debug(formattedMessage);
            }
            
            // Optionally, send debug logs remotely if needed for remote debugging sessions
            this.sendRemoteLog('debug', message, data);
        } catch (error) {
            console.debug(`[DEBUG] ${message}`, data);
        }
    }

    /**
     * Log info message
     */
    info(message, data = null) {
        try {
            const formattedMessage = this.formatMessage ? this.formatMessage('info', message, data) : `[INFO] ${message}`;
            
            if (this.enableConsoleLogging) {
                console.log(formattedMessage);
            }
            
            this.sendRemoteLog('info', message, data);
        } catch (error) {
            console.log(`[INFO] ${message}`, data);
        }
    }

    /**
     * Log warning message
     */
    warn(message, data = null) {
        try {
            const formattedMessage = this.formatMessage ? this.formatMessage('warn', message, data) : `[WARN] ${message}`;
            
            if (this.enableConsoleLogging) {
                console.warn(formattedMessage);
            }
            
            this.sendRemoteLog('warn', message, data);
        } catch (error) {
            console.warn(`[WARN] ${message}`, data);
        }
    }

    /**
     * Log error message
     */
    error(message, data = null) {
        try {
            const formattedMessage = this.formatMessage ? this.formatMessage('error', message, data) : `[ERROR] ${message}`;
            
            if (this.enableConsoleLogging) {
                console.error(formattedMessage);
            }
            
            this.sendRemoteLog('error', message, data);
        } catch (error) {
            console.error(`[ERROR] ${message}`, data);
        }
    }

    /**
     * Start a performance timer
     */
    startTimer(label) {
        if (!this.timers) {
            this.timers = new Map();
        }
        
        const startTime = performance ? performance.now() : Date.now();
        this.timers.set(label, startTime);
        
        if (console.time) {
            console.time(label);
        }
        
        this.debug(`Timer started: ${label}`);
        
        return {
            label,
            startTime
        };
    }

    /**
     * End a performance timer
     */
    endTimer(timer) {
        if (!timer || !timer.label) {
            this.warn('Invalid timer object provided to endTimer');
            return 0;
        }
        
        const label = timer.label;
        
        if (!this.timers || !this.timers.has(label)) {
            this.warn(`Timer '${label}' not found`);
            return 0;
        }
        
        const startTime = this.timers.get(label);
        const endTime = performance ? performance.now() : Date.now();
        const duration = endTime - startTime;
        
        this.timers.delete(label);
        
        if (console.timeEnd) {
            console.timeEnd(label);
        }
        
        this.info(`Timer '${label}' completed in ${duration.toFixed(2)}ms`);
        
        return duration;
    }

    /**
     * Create child logger with additional component context
     */
    child(options = {}) {
        const childComponent = options.component 
            ? `${this.component}.${options.component}`
            : this.component;
            
        return new CentralizedLogger({
            ...options,
            component: childComponent,
            level: options.level || this.level,
            enableRemoteLogging: options.enableRemoteLogging !== undefined ? options.enableRemoteLogging : this.enableRemoteLogging,
            enableConsoleLogging: options.enableConsoleLogging !== undefined ? options.enableConsoleLogging : this.enableConsoleLogging
        });
    }
}

// Export for both ES modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    // CommonJS
    module.exports = { CentralizedLogger };
} else if (typeof define === 'function' && define.amd) {
    // AMD/RequireJS
    define([], function() {
        return { CentralizedLogger };
    });
} else if (typeof window !== 'undefined') {
    // Browser global
    window.CentralizedLogger = CentralizedLogger;
}

// ES Module export
try {
    if (typeof exports !== 'undefined' && !exports.nodeType) {
        if (typeof module !== 'undefined' && !module.nodeType && module.exports) {
            exports = module.exports = { CentralizedLogger };
        }
        exports.CentralizedLogger = CentralizedLogger;
    } else if (typeof define === 'function' && define.amd) {
        // Already handled by AMD above
    } else if (typeof window !== 'undefined') {
        // Already handled by browser global above
    } else {
        // Fallback for other environments
        var root = typeof global !== 'undefined' ? global : window || {};
        root.CentralizedLogger = CentralizedLogger;
    }
} catch (e) {
    // Silent catch for environments where exports/define might not be available
    if (typeof console !== 'undefined' && console.warn) {
        console.warn('CentralizedLogger export failed:', e);
    }
}

// ES Module export only if in module context
if (typeof window === 'undefined' && typeof exports !== 'undefined') {
    // Node.js environment
    try {
        exports.CentralizedLogger = CentralizedLogger;
    } catch (e) {
        // Silent catch
    }
}
