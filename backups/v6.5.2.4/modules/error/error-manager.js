import { ErrorReporter } from './error-reporter.js';
import { ErrorTypes, ErrorSeverity } from './error-types.js';

/**
 * Centralized Error Management System
 * 
 * Handles all application errors in a consistent way, providing:
 * - Error categorization and processing
 * - Centralized error logging
 * - Error reporting to UI components
 * - Error recovery strategies
 */
export class ErrorManager {
    /**
     * Create a new ErrorManager
     * @param {Object} logger - Logger instance from LogManager
     * @param {Object} options - Configuration options
     */
    constructor(logger, options = {}) {
        this.logger = logger || console;
        this.errorReporter = new ErrorReporter(options.reporterOptions);
        this.errorHandlers = new Map();
        this.initializeDefaultHandlers();
    }

    /**
     * Initialize default error handlers
     */
    initializeDefaultHandlers() {
        // Network errors
        this.registerHandler(
            ErrorTypes.NETWORK,
            this.handleNetworkError.bind(this)
        );
        
        // Authentication errors
        this.registerHandler(
            ErrorTypes.AUTHENTICATION,
            this.handleAuthError.bind(this)
        );
        
        // Validation errors
        this.registerHandler(
            ErrorTypes.VALIDATION,
            this.handleValidationError.bind(this)
        );
        
        // Default error handler
        this.registerHandler(
            'default',
            this.handleDefaultError.bind(this)
        );
    }

    /**
     * Register a custom error handler
     * @param {string} errorType - Type of error to handle
     * @param {Function} handler - Handler function
     */
    registerHandler(errorType, handler) {
        this.errorHandlers.set(errorType, handler);
    }

    /**
     * Handle an error
     * @param {Error} error - The error to handle
     * @param {Object} context - Additional context
     * @returns {Object} Processed error information
     */
    handleError(error, context = {}) {
        const errorInfo = this.processError(error, context);
        
        // Log the error
        this.logError(errorInfo);
        
        // Report the error
        this.reportError(errorInfo);
        
        // Execute recovery strategy if available
        if (errorInfo.recovery) {
            errorInfo.recovery();
        }
        
        return errorInfo;
    }

    /**
     * Process an error and extract relevant information
     * @private
     */
    processError(error, context) {
        const errorType = this.determineErrorType(error, context);
        const severity = this.determineSeverity(errorType, context);
        
        return {
            id: this.generateErrorId(),
            timestamp: new Date().toISOString(),
            message: error.message || 'An unknown error occurred',
            type: errorType,
            severity,
            stack: error.stack,
            context: {
                component: context.component || 'unknown',
                operation: context.operation || 'unknown',
                ...context
            },
            originalError: error,
            recovery: this.getRecoveryStrategy(errorType, severity, context)
        };
    }

    /**
     * Log an error using the application logger
     * @private
     */
    logError(errorInfo) {
        const logEntry = {
            id: errorInfo.id,
            type: errorInfo.type,
            severity: errorInfo.severity,
            message: errorInfo.message,
            context: errorInfo.context,
            timestamp: errorInfo.timestamp
        };

        if (errorInfo.severity === ErrorSeverity.ERROR) {
            this.logger.error('Error occurred', logEntry);
        } else if (errorInfo.severity === ErrorSeverity.WARNING) {
            this.logger.warn('Warning occurred', logEntry);
        } else {
            this.logger.info('Error occurred', logEntry);
        }
    }

    /**
     * Report an error to the UI
     * @private
     */
    reportError(errorInfo) {
        this.errorReporter.showNotification(
            errorInfo.message,
            {
                title: this.getErrorTitle(errorInfo.type, errorInfo.severity),
                type: this.getNotificationType(errorInfo.severity),
                errorId: errorInfo.id,
                context: errorInfo.context
            }
        );
    }

    // Handler implementations
    handleNetworkError(error, context) {
        // Add network-specific handling here
        return {
            ...error,
            retryable: true
        };
    }

    handleAuthError(error) {
        // Add auth-specific handling here
        return {
            ...error,
            requiresReauth: true
        };
    }

    handleValidationError(error) {
        // Add validation-specific handling here
        return error;
    }

    handleDefaultError(error) {
        // Default error handling
        return error;
    }

    // Helper methods
    determineErrorType(error, context) {
        if (error.type) return error.type;
        if (error.response) {
            const status = error.response.status;
            if (status === 401) return ErrorTypes.AUTHENTICATION;
            if (status >= 400 && status < 500) return ErrorTypes.VALIDATION;
            if (status >= 500) return ErrorTypes.SERVER;
        }
        if (error.message?.includes('Network Error')) return ErrorTypes.NETWORK;
        return ErrorTypes.UNKNOWN;
    }

    determineSeverity(errorType, context) {
        const severityMap = {
            [ErrorTypes.AUTHENTICATION]: ErrorSeverity.ERROR,
            [ErrorTypes.NETWORK]: ErrorSeverity.WARNING, // Often recoverable
            [ErrorTypes.VALIDATION]: ErrorSeverity.WARNING,
            [ErrorTypes.SERVER]: ErrorSeverity.ERROR,
            [ErrorTypes.UNKNOWN]: ErrorSeverity.ERROR
        };
        
        return severityMap[errorType] || ErrorSeverity.ERROR;
    }

    getErrorTitle(errorType, severity) {
        const titles = {
            [ErrorTypes.AUTHENTICATION]: 'Authentication Error',
            [ErrorTypes.NETWORK]: 'Connection Issue',
            [ErrorTypes.VALIDATION]: 'Validation Error',
            [ErrorTypes.SERVER]: 'Server Error',
            [ErrorTypes.UNKNOWN]: 'Error'
        };
        
        return titles[errorType] || 'Error';
    }

    getNotificationType(severity) {
        const typeMap = {
            [ErrorSeverity.ERROR]: 'error',
            [ErrorSeverity.WARNING]: 'warning',
            [ErrorSeverity.INFO]: 'info'
        };
        
        return typeMap[severity] || 'error';
    }

    getRecoveryStrategy(errorType, severity, context) {
        // Implement recovery strategies based on error type and context
        if (errorType === ErrorTypes.NETWORK) {
            return () => {
                // Auto-retry logic for network errors
                if (context.retryCount < 3) {
                    setTimeout(() => context.retry(), 2000);
                }
            };
        }
        
        if (errorType === ErrorTypes.AUTHENTICATION) {
            return () => {
                // Redirect to login or refresh token
                window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            };
        }
        
        return null;
    }

    generateErrorId() {
        return 'err_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get the error reporter instance
     * @returns {ErrorReporter} The error reporter
     */
    getErrorReporter() {
        return this.errorReporter;
    }
}
