/**
 * Debug File Logger
 * 
 * Comprehensive file logging system for capturing all debugging information
 * to debug-error.log for persistent analysis and issue tracking.
 */

class DebugFileLogger {
    constructor() {
        this.logQueue = [];
        this.isWriting = false;
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        
        // Initialize with session header
        this.logToFile('SESSION_START', 'Debug file logging session started', {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            userAgent: navigator.userAgent,
            url: window.location.href,
            startTime: this.startTime
        });
    }
    
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Log message to file with comprehensive context
     */
    logToFile(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            sessionId: this.sessionId,
            level: level.toUpperCase(),
            message,
            data,
            stack: new Error().stack,
            performance: {
                now: performance.now(),
                memory: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null
            }
        };
        
        this.logQueue.push(logEntry);
        this.processQueue();
    }
    
    /**
     * Process log queue and write to file
     */
    async processQueue() {
        if (this.isWriting || this.logQueue.length === 0) {
            return;
        }
        
        this.isWriting = true;
        
        try {
            // Get all queued entries
            const entries = [...this.logQueue];
            this.logQueue = [];
            
            // Format entries for file output
            const logContent = entries.map(entry => {
                const dataStr = entry.data && Object.keys(entry.data).length > 0 
                    ? JSON.stringify(entry.data, null, 2) 
                    : '';
                
                return [
                    `[${entry.timestamp}] [${entry.level}] [${entry.sessionId}]`,
                    `MESSAGE: ${entry.message}`,
                    dataStr ? `DATA: ${dataStr}` : '',
                    `PERFORMANCE: ${entry.performance.now.toFixed(2)}ms`,
                    entry.performance.memory ? `MEMORY: ${(entry.performance.memory.used / 1024 / 1024).toFixed(2)}MB used` : '',
                    `STACK: ${entry.stack}`,
                    '=' .repeat(120),
                    ''
                ].filter(line => line !== '').join('\n');
            }).join('\n');
            
            // Write to file using File System Access API or fallback
            await this.writeToFile(logContent);
            
        } catch (error) {
            console.error('❌ [DEBUG FILE LOGGER] Failed to write to debug-error.log:', error);
            // Fallback to console logging
            console.log('📄 [DEBUG FILE LOGGER] Fallback console output:', this.logQueue);
        } finally {
            this.isWriting = false;
            
            // Process any new entries that came in while writing
            if (this.logQueue.length > 0) {
                setTimeout(() => this.processQueue(), 100);
            }
        }
    }
    
    /**
     * Write content to debug-error.log file
     */
    async writeToFile(content) {
        try {
            // Try File System Access API first (modern browsers)
            if ('showSaveFilePicker' in window) {
                await this.writeWithFileSystemAPI(content);
            } else {
                // Fallback to download approach
                await this.writeWithDownload(content);
            }
        } catch (error) {
            // Ultimate fallback to server endpoint
            await this.writeToServer(content);
        }
    }
    
    /**
     * Write using File System Access API
     */
    async writeWithFileSystemAPI(content) {
        if (!this.fileHandle) {
            // Get file handle for debug-error.log
            this.fileHandle = await window.showSaveFilePicker({
                suggestedName: 'debug-error.log',
                types: [{
                    description: 'Log files',
                    accept: { 'text/plain': ['.log'] }
                }]
            });
        }
        
        const writable = await this.fileHandle.createWritable({ keepExistingData: true });
        await writable.seek(0);
        await writable.seek(await writable.getSize()); // Append to end
        await writable.write(content);
        await writable.close();
    }
    
    /**
     * Write using download approach
     */
    async writeWithDownload(content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-error-${this.sessionId}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Write to server endpoint
     */
    async writeToServer(content) {
        try {
            await fetch('/api/debug-log/file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: 'debug-error.log',
                    content: content,
                    sessionId: this.sessionId
                })
            });
        } catch (error) {
            console.error('❌ [DEBUG FILE LOGGER] Server write failed:', error);
        }
    }
    
    /**
     * Log different types of messages
     */
    debug(message, data = {}) {
        this.logToFile('DEBUG', message, data);
    }
    
    info(message, data = {}) {
        this.logToFile('INFO', message, data);
    }
    
    warn(message, data = {}) {
        this.logToFile('WARN', message, data);
    }
    
    error(message, data = {}) {
        this.logToFile('ERROR', message, data);
    }
    
    critical(message, data = {}) {
        this.logToFile('CRITICAL', message, data);
    }
    
    /**
     * Log app initialization phases
     */
    appPhase(phase, status, data = {}) {
        this.logToFile('APP_PHASE', `Phase ${phase}: ${status}`, data);
    }
    
    /**
     * Log subsystem initialization
     */
    subsystem(name, status, data = {}) {
        this.logToFile('SUBSYSTEM', `${name}: ${status}`, data);
    }
    
    /**
     * Log performance metrics
     */
    performance(metric, value, data = {}) {
        this.logToFile('PERFORMANCE', `${metric}: ${value}`, data);
    }
    
    /**
     * Log system state changes
     */
    systemState(component, state, data = {}) {
        this.logToFile('SYSTEM_STATE', `${component}: ${state}`, data);
    }
    
    /**
     * Flush all pending logs
     */
    async flush() {
        while (this.logQueue.length > 0 || this.isWriting) {
            await this.processQueue();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    /**
     * End logging session
     */
    async endSession() {
        this.logToFile('SESSION_END', 'Debug file logging session ended', {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            duration: Date.now() - this.startTime,
            totalLogs: this.logQueue.length
        });
        
        await this.flush();
    }
}

// Create global instance
let debugFileLogger = null;

/**
 * Get or create debug file logger instance
 */
export function getDebugFileLogger() {
    if (!debugFileLogger) {
        debugFileLogger = new DebugFileLogger();
    }
    return debugFileLogger;
}

/**
 * Convenience functions for easy access
 */
export const fileLog = {
    debug: (message, data) => getDebugFileLogger().debug(message, data),
    info: (message, data) => getDebugFileLogger().info(message, data),
    warn: (message, data) => getDebugFileLogger().warn(message, data),
    error: (message, data) => getDebugFileLogger().error(message, data),
    critical: (message, data) => getDebugFileLogger().critical(message, data),
    appPhase: (phase, status, data) => getDebugFileLogger().appPhase(phase, status, data),
    subsystem: (name, status, data) => getDebugFileLogger().subsystem(name, status, data),
    performance: (metric, value, data) => getDebugFileLogger().performance(metric, value, data),
    systemState: (component, state, data) => getDebugFileLogger().systemState(component, state, data),
    flush: () => getDebugFileLogger().flush(),
    endSession: () => getDebugFileLogger().endSession()
};

export default DebugFileLogger;
