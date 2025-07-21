/**
 * Client-Side Debug Logger
 * 
 * Browser-compatible version of the debug logger that sends logs to the server.
 */

class ClientDebugLogger {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.isClient = true;
        
        // Initialize with session start
        this.log('SESSION_START', 'Client debug logging session started', {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            userAgent: navigator.userAgent,
            url: window.location.href
        });
    }
    
    generateSessionId() {
        return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    formatLogEntry(level, category, message, data = {}) {
        const timestamp = new Date().toISOString();
        const entry = {
            timestamp,
            sessionId: this.sessionId,
            level: level.toUpperCase(),
            category: category.toUpperCase(),
            message,
            environment: 'client',
            url: window.location.href,
            data: data || {}
        };
        
        // Format as readable string
        const formattedEntry = `[${timestamp}] [${this.sessionId}] [CLIENT] [${level.toUpperCase()}] [${category.toUpperCase()}] ${message}`;
        const dataString = Object.keys(data).length > 0 ? `\n  Data: ${JSON.stringify(data, null, 2)}` : '';
        
        return formattedEntry + dataString + '\n' + '-'.repeat(80) + '\n';
    }
    
    async sendToServer(entry) {
        try {
            await fetch('/api/debug-log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ entry })
            });
        } catch (error) {
            console.error('Failed to send debug log to server:', error);
        }
    }
    
    // Main logging method
    log(category, message, data = {}) {
        const entry = this.formatLogEntry('info', category, message, data);
        this.sendToServer(entry);
        
        // Also log to console in development
        console.log(`🐛 [${category.toUpperCase()}] ${message}`, data);
    }
    
    // Error logging
    error(category, message, error = null, data = {}) {
        const errorData = {
            ...data,
            error: error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : null
        };
        
        const entry = this.formatLogEntry('error', category, message, errorData);
        this.sendToServer(entry);
        
        // Always log errors to console
        console.error(`🚨 [${category.toUpperCase()}] ${message}`, errorData);
    }
    
    // Warning logging
    warn(category, message, data = {}) {
        const entry = this.formatLogEntry('warn', category, message, data);
        this.sendToServer(entry);
        
        console.warn(`⚠️ [${category.toUpperCase()}] ${message}`, data);
    }
    
    // Debug logging
    debug(category, message, data = {}) {
        const entry = this.formatLogEntry('debug', category, message, data);
        this.sendToServer(entry);
        
        console.debug(`🔍 [${category.toUpperCase()}] ${message}`, data);
    }
    
    // Event logging
    event(category, eventName, data = {}) {
        const eventData = {
            eventName,
            ...data
        };
        
        const entry = this.formatLogEntry('event', category, `Event: ${eventName}`, eventData);
        this.sendToServer(entry);
        
        console.log(`📊 [${category.toUpperCase()}] Event: ${eventName}`, eventData);
    }
    
    // Performance logging
    performance(category, operation, duration, data = {}) {
        const perfData = {
            operation,
            duration: `${duration}ms`,
            ...data
        };
        
        const entry = this.formatLogEntry('perf', category, `Performance: ${operation}`, perfData);
        this.sendToServer(entry);
        
        console.log(`⚡ [${category.toUpperCase()}] Performance: ${operation} (${duration}ms)`, perfData);
    }
    
    // Navigation logging
    navigation(from, to, data = {}) {
        this.event('navigation', 'view_change', {
            from,
            to,
            ...data
        });
    }
    
    // API logging
    api(method, url, status, duration, data = {}) {
        this.event('api', 'request', {
            method,
            url,
            status,
            duration: `${duration}ms`,
            ...data
        });
    }
    
    // User action logging
    userAction(action, element, data = {}) {
        this.event('user', action, {
            element,
            ...data
        });
    }
    
    // System state logging
    systemState(component, state, data = {}) {
        this.log('system', `${component} state: ${state}`, data);
    }
    
    // Feature flag logging
    featureFlag(flag, enabled, data = {}) {
        this.log('feature', `Feature flag ${flag}: ${enabled ? 'enabled' : 'disabled'}`, data);
    }
    
    // Subsystem logging
    subsystem(name, action, data = {}) {
        this.log('subsystem', `${name}: ${action}`, data);
    }
}

// Create singleton instance
let clientDebugLogger = null;

export function getClientDebugLogger() {
    if (!clientDebugLogger) {
        clientDebugLogger = new ClientDebugLogger();
    }
    return clientDebugLogger;
}

// Convenience exports
export const debugLog = {
    log: (category, message, data) => getClientDebugLogger().log(category, message, data),
    error: (category, message, error, data) => getClientDebugLogger().error(category, message, error, data),
    warn: (category, message, data) => getClientDebugLogger().warn(category, message, data),
    debug: (category, message, data) => getClientDebugLogger().debug(category, message, data),
    event: (category, eventName, data) => getClientDebugLogger().event(category, eventName, data),
    performance: (category, operation, duration, data) => getClientDebugLogger().performance(category, operation, duration, data),
    navigation: (from, to, data) => getClientDebugLogger().navigation(from, to, data),
    api: (method, url, status, duration, data) => getClientDebugLogger().api(method, url, status, duration, data),
    userAction: (action, element, data) => getClientDebugLogger().userAction(action, element, data),
    systemState: (component, state, data) => getClientDebugLogger().systemState(component, state, data),
    featureFlag: (flag, enabled, data) => getClientDebugLogger().featureFlag(flag, enabled, data),
    subsystem: (name, action, data) => getClientDebugLogger().subsystem(name, action, data)
};

export default debugLog;