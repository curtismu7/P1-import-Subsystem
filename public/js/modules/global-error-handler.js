
/**
 * Global Error Handler - Catches uncaught exceptions and promise rejections
 */
class GlobalErrorHandler {
    constructor() {
        this.setupHandlers();
    }

    setupHandlers() {
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                error: event.error
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || 'Promise rejected',
                reason: event.reason
            });
            event.preventDefault();
        });
    }

    handleError(errorInfo) {
        console.error('🚨 Global Error:', errorInfo);
        
        // Show user notification
        this.showErrorNotification(errorInfo);
        
        // Log to server if available
        this.logToServer(errorInfo);
    }

    showErrorNotification(errorInfo) {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24;
            padding: 15px; border-radius: 5px; max-width: 400px;
        `;
        notification.innerHTML = `
            <strong>⚠️ Error Detected</strong><br>
            ${errorInfo.message}<br>
            <button onclick="this.parentElement.remove()" style="margin-top: 10px;">Dismiss</button>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 10000);
    }

    async logToServer(errorInfo) {
        try {
            await fetch('/api/logs/error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorInfo)
            });
        } catch (error) {
            console.warn('Failed to log error to server');
        }
    }
}

// Initialize
window.globalErrorHandler = new GlobalErrorHandler();
