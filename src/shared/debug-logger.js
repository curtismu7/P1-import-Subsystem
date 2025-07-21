/**
 * Debug Logger
 * 
 * A dedicated logging system for development and debugging purposes.
 * Writes to debug.log file and provides structured logging for errors, events, and debug info.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DebugLogger {
    constructor() {
        this.logFile = path.join(process.cwd(), 'logs', 'debug.log');
        this.isClient = typeof window !== 'undefined';
        this.sessionId = this.generateSessionId();
        
        // Ensure logs directory exists
        if (!this.isClient) {
            this.ensureLogDirectory();
        }
        
        // Initialize with session start
        this.log('SESSION_START', 'Debug logging session started', {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            environment: this.isClient ? 'client' : 'server',
            userAgent: this.isClient ? navigator.userAgent : 'N/A'
        });
    }
    
    generateSessionId() {
        return 'debug_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
    
    formatLogEntry(level, category, message, data = {}) {
        const timestamp = new Date().toISOString();
        const entry = {
            timestamp,
            sessionId: this.sessionId,
            level: level.toUpperCase(),
            category: category.toUpperCase(),
            message,
            environment: this.isClient ? 'client' : 'server',
            data: data || {}
        };
        
        // Format as readable string
        const formattedEntry = `[${timestamp}] [${this.sessionId}] [${level.toUpperCase()}] [${category.toUpperCase()}] ${message}`;
        const dataString = Object.keys(data).length > 0 ? `\n  Data: ${JSON.stringify(data, null, 2)}` : '';
        
        return formattedEntry + dataString + '\n' + '-'.repeat(80) + '\n';
    }
    
    writeToFile(entry) {
        if (this.isClient) {
            // For client-side, send to server
            this.sendToServer(entry);
        } else {
            // For server-side, write directly to file
            try {
                fs.appendFileSync(this.logFile, entry);
            } catch (error) {
                console.error('Failed to write to debug log:', error);
            }
        }
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
        this.writeToFile(entry);
        
        // Also log to console in development
        if (process.env.NODE_ENV === 'development' || this.isClient) {
            console.log(`🐛 [${category.toUpperCase()}] ${message}`, data);
        }
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
        this.writeToFile(entry);
        
        // Always log errors to console
        console.error(`🚨 [${category.toUpperCase()}] ${message}`, errorData);
    }
    
    // Warning logging
    warn(category, message, data = {}) {
        const entry = this.formatLogEntry('warn', category, message, data);
        this.writeToFile(entry);
        
        if (process.env.NODE_ENV === 'development' || this.isClient) {
            console.warn(`⚠️ [${category.toUpperCase()}] ${message}`, data);
        }
    }
    
    // Debug logging (only in development)
    debug(category, message, data = {}) {
        if (process.env.NODE_ENV !== 'development' && !this.isClient) {
            return; // Skip debug logs in production
        }
        
        const entry = this.formatLogEntry('debug', category, message, data);
        this.writeToFile(entry);
        
        console.debug(`🔍 [${category.toUpperCase()}] ${message}`, data);
    }
    
    // Event logging
    event(category, eventName, data = {}) {
        const eventData = {
            eventName,
            ...data
        };
        
        const entry = this.formatLogEntry('event', category, `Event: ${eventName}`, eventData);
        this.writeToFile(entry);
        
        if (process.env.NODE_ENV === 'development' || this.isClient) {
            console.log(`📊 [${category.toUpperCase()}] Event: ${eventName}`, eventData);
        }
    }
    
    // Performance logging
    performance(category, operation, duration, data = {}) {
        const perfData = {
            operation,
            duration: `${duration}ms`,
            ...data
        };
        
        const entry = this.formatLogEntry('perf', category, `Performance: ${operation}`, perfData);
        this.writeToFile(entry);
        
        if (process.env.NODE_ENV === 'development' || this.isClient) {
            console.log(`⚡ [${category.toUpperCase()}] Performance: ${operation} (${duration}ms)`, perfData);
        }
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
let debugLogger = null;

export function getDebugLogger() {
    if (!debugLogger) {
        debugLogger = new DebugLogger();
    }
    return debugLogger;
}

// Convenience exports
export const debugLog = {
    log: (category, message, data) => getDebugLogger().log(category, message, data),
    error: (category, message, error, data) => getDebugLogger().error(category, message, error, data),
    warn: (category, message, data) => getDebugLogger().warn(category, message, data),
    debug: (category, message, data) => getDebugLogger().debug(category, message, data),
    event: (category, eventName, data) => getDebugLogger().event(category, eventName, data),
    performance: (category, operation, duration, data) => getDebugLogger().performance(category, operation, duration, data),
    navigation: (from, to, data) => getDebugLogger().navigation(from, to, data),
    api: (method, url, status, duration, data) => getDebugLogger().api(method, url, status, duration, data),
    userAction: (action, element, data) => getDebugLogger().userAction(action, element, data),
    systemState: (component, state, data) => getDebugLogger().systemState(component, state, data),
    featureFlag: (flag, enabled, data) => getDebugLogger().featureFlag(flag, enabled, data),
    subsystem: (name, action, data) => getDebugLogger().subsystem(name, action, data)
};

export default debugLog;