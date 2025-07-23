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

        const formattedMessage = this.formatMessage('debug', message, data);
        
        if (this.enableConsoleLogging) {
            console.debug(formattedMessage);
        }
        
        // Optionally, send debug logs remotely if needed for remote debugging sessions
        this.sendRemoteLog('debug', message, data);
    }

    /**
     * Log info message
     */
    info(message, data = null) {
        const formattedMessage = this.formatMessage('info', message, data);
        
        if (this.enableConsoleLogging) {
            console.log(formattedMessage);
        }
        
        this.sendRemoteLog('info', message, data);
    }

    /**
     * Log warning message
     */
    warn(message, data = null) {
        const formattedMessage = this.formatMessage('warn', message, data);
        
        if (this.enableConsoleLogging) {
            console.warn(formattedMessage);
        }
        
        this.sendRemoteLog('warn', message, data);
    }

    /**
     * Log error message
     */
    error(message, data = null) {
        const formattedMessage = this.formatMessage('error', message, data);
        
        if (this.enableConsoleLogging) {
            console.error(formattedMessage);
        }
        
        this.sendRemoteLog('error', message, data);
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
    module.exports = { CentralizedLogger };
} else if (typeof window !== 'undefined') {
    window.CentralizedLogger = CentralizedLogger;
}

export { CentralizedLogger };
