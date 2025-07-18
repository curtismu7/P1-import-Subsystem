import { ErrorSeverity } from './error-types.js';

/**
 * Error Reporter
 * 
 * Handles displaying errors to the user in a consistent way
 */
export class ErrorReporter {
    /**
     * Create a new ErrorReporter
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            defaultDuration: 5000,
            autoDismiss: true,
            showErrorId: true,
            ...options
        };
        
        // Reference to the UI manager for showing notifications
        this.uiManager = null;
        this.notificationQueue = [];
        this.isInitialized = false;
    }

    /**
     * Initialize the error reporter with required dependencies
     * @param {Object} uiManager - The application's UI manager
     */
    initialize(uiManager) {
        if (this.isInitialized) return;
        
        this.uiManager = uiManager;
        this.isInitialized = true;
        
        // Process any queued notifications
        this.processQueue();
    }

    /**
     * Show a notification to the user
     * @param {string} message - The message to display
     * @param {Object} options - Notification options
     */
    showNotification(message, options = {}) {
        const notification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            message,
            options: {
                title: options.title || 'Error',
                type: options.type || 'error',
                autoDismiss: options.autoDismiss !== undefined ? options.autoDismiss : this.options.autoDismiss,
                duration: options.duration || this.options.defaultDuration,
                errorId: options.errorId,
                context: options.context || {}
            }
        };

        // Add to queue if not initialized yet
        if (!this.isInitialized || !this.uiManager) {
            this.notificationQueue.push(notification);
            return;
        }

        this._displayNotification(notification);
    }

    /**
     * Process any queued notifications
     * @private
     */
    processQueue() {
        if (!this.isInitialized || !this.uiManager) return;
        
        while (this.notificationQueue.length > 0) {
            const notification = this.notificationQueue.shift();
            this._displayNotification(notification);
        }
    }

    /**
     * Display a notification using the UI manager
     * @private
     */
    _displayNotification(notification) {
        if (!this.uiManager) return;
        
        const { message, options } = notification;
        const { title, type, autoDismiss, duration, errorId, context } = options;
        
        // Format the message with error ID if available
        let displayMessage = message;
        if (this.options.showErrorId && errorId) {
            displayMessage = `${message}\n\nError ID: ${errorId}`;
        }
        
        // Add context to the message if in development
        if (process.env.NODE_ENV === 'development' && context) {
            const contextStr = this._formatContext(context);
            if (contextStr) {
                displayMessage += `\n\nContext: ${contextStr}`;
            }
        }
        
        // Show the notification
        if (this.uiManager.showNotification) {
            this.uiManager.showNotification(displayMessage, {
                title,
                type,
                autoDismiss,
                duration
            });
        } else if (this.uiManager.showStatusBar) {
            // Fallback to status bar if showNotification is not available
            this.uiManager.showStatusBar(
                displayMessage, 
                type,
                { 
                    autoDismiss: autoDismiss !== false, 
                    duration: autoDismiss ? duration : 0 
                }
            );
        } else {
            // Last resort: use console
            console[type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log'](
                `[${type.toUpperCase()}] ${title}: ${message}`,
                context
            );
        }
    }

    /**
     * Format context for display
     * @private
     */
    _formatContext(context) {
        try {
            // Filter out sensitive information
            const safeContext = { ...context };
            const sensitiveKeys = ['password', 'token', 'secret', 'authorization'];
            
            Object.keys(safeContext).forEach(key => {
                const lowerKey = key.toLowerCase();
                if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
                    safeContext[key] = '***REDACTED***';
                }
            });
            
            return JSON.stringify(safeContext, null, 2);
        } catch (e) {
            return 'Unable to format context';
        }
    }

    /**
     * Show a success notification
     * @param {string} message - The success message
     * @param {Object} options - Additional options
     */
    showSuccess(message, options = {}) {
        this.showNotification(message, {
            ...options,
            type: 'success',
            title: options.title || 'Success'
        });
    }

    /**
     * Show a warning notification
     * @param {string} message - The warning message
     * @param {Object} options - Additional options
     */
    showWarning(message, options = {}) {
        this.showNotification(message, {
            ...options,
            type: 'warning',
            title: options.title || 'Warning'
        });
    }

    /**
     * Show an error notification
     * @param {string} message - The error message
     * @param {Object} options - Additional options
     */
    showError(message, options = {}) {
        this.showNotification(message, {
            ...options,
            type: 'error',
            title: options.title || 'Error',
            autoDismiss: options.autoDismiss !== undefined ? options.autoDismiss : false
        });
    }

    /**
     * Show an info notification
     * @param {string} message - The info message
     * @param {Object} options - Additional options
     */
    showInfo(message, options = {}) {
        this.showNotification(message, {
            ...options,
            type: 'info',
            title: options.title || 'Info'
        });
    }
}
