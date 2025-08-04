class CentralizedLogger {
    constructor(componentName) {
        this.componentName = componentName || 'general';
        this.sessionId = this.getSessionId();
    }

    getSessionId() {
        if (!window.sessionId) {
            window.sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        }
        return window.sessionId;
    }

    formatMessage(level, message, data) {
        return `[${new Date().toISOString()}] [${this.sessionId}] [${this.componentName}] [${level.toUpperCase()}] ${message}` + (data ? ` | Data: ${JSON.stringify(data, null, 2)}` : '');
    }

    log(level, message, data) {
        const formattedMessage = this.formatMessage(level, message, data);
        console.log(formattedMessage);
    }

    info(message, data) {
        this.log('info', message, data);
    }

    warn(message, data) {
        const formattedMessage = this.formatMessage('warn', message, data);
        console.warn(formattedMessage);
    }

    error(message, data) {
        const formattedMessage = this.formatMessage('error', message, data);
        console.error(formattedMessage);
    }

    debug(message, data) {
        // Only log debug messages in development mode
        if (window.appConfig && window.appConfig.env === 'development') {
            this.log('debug', message, data);
        }
    }
}

// Export for use in other modules if using a module system.
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = CentralizedLogger;
}
