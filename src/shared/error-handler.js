/**
 * Centralized Error Handler
 * 
 * Provides consistent error handling across the entire application.
 * Handles both client-side and server-side errors with proper logging,
 * user-friendly messages, and recovery strategies.
 * 
 * Features:
 * - Structured error classification
 * - User-friendly error messages
 * - Automatic retry logic for transient errors

 * - Graceful degradation strategies
 */

import { createWinstonLogger } from '../server/services/winston-config.js';

// Error types for classification
export const ERROR_TYPES = {
    NETWORK: 'network',
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    VALIDATION: 'validation',
    NOT_FOUND: 'not_found',
    RATE_LIMIT: 'rate_limit',
    SERVER: 'server',
    CLIENT: 'client',
    TIMEOUT: 'timeout',
    UNKNOWN: 'unknown'
};

// Error severity levels
export const ERROR_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

// Retry strategies
export const RETRY_STRATEGIES = {
    NONE: 'none',
    LINEAR: 'linear',
    EXPONENTIAL: 'exponential',
    IMMEDIATE: 'immediate'
};

class ErrorHandler {
    constructor(options = {}) {
        this.logger = options.logger || createWinstonLogger({
            service: 'error-handler',
            env: process.env.NODE_ENV || 'development'
        });
        
        this.isClient = typeof window !== 'undefined';
        this.errorCounts = new Map();
        this.retryAttempts = new Map();
        
        // Configuration
        this.config = {
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 1000,

            enableUserNotification: options.enableUserNotification !== false,
            ...options
        };
        
        this.init();
    }
    
    /**
     * Initialize error handler
     */
    init() {
        if (this.isClient) {
            this._initializeClientErrorHandling();
        } else {
            this._initializeServerErrorHandling();
        }
        
        this.logger.info('🛡️ Error handler initialized', {
            environment: this.isClient ? 'client' : 'server',
            config: this.config
        });
    }
    
    /**
     * Initialize client-side error handling
     */
    _initializeClientErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason || new Error('Unhandled promise rejection'), {
                source: 'unhandledrejection',
                severity: ERROR_SEVERITY.HIGH,
                context: { event }
            });
            
            // Prevent default browser behavior
            event.preventDefault();
        });
        
        // Handle uncaught exceptions
        window.addEventListener('error', (event) => {
            this.handleError(event.error || new Error(event.message), {
                source: 'uncaught_exception',
                severity: ERROR_SEVERITY.HIGH,
                context: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            });
        });
    }
    
    /**
     * Initialize server-side error handling
     */
    _initializeServerErrorHandling() {
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.handleError(reason || new Error('Unhandled promise rejection'), {
                source: 'unhandledRejection',
                severity: ERROR_SEVERITY.CRITICAL,
                context: { promise }
            });
        });
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.handleError(error, {
                source: 'uncaughtException',
                severity: ERROR_SEVERITY.CRITICAL,
                context: {}
            });
            
            // Exit process after logging
            setTimeout(() => process.exit(1), 1000);
        });
    }
    
    /**
     * Main error handling method with comprehensive debugging support
     * 
     * @param {Error|string|Object} error - The error to handle
     * @param {Object} options - Error handling options
     * @param {Function} options.retryFunction - Function to retry on recoverable errors
     * @param {string} options.source - Source of the error for tracking
     * @param {Object} options.context - Additional context for debugging
     * @param {string} options.userId - User ID for error correlation
     * @param {string} options.sessionId - Session ID for error correlation
     * @returns {Promise<Object>} Structured error response
     * 
     * DEBUG: Enhanced with detailed logging and error correlation
     * TODO: Add error sampling for high-volume scenarios
     * VERIFY: All error paths return consistent response format
     */
    async handleError(error, options = {}) {
        const functionName = 'ErrorHandler.handleError';
        const startTime = Date.now();
        const errorId = this._generateErrorId();
        
        // DEBUG: Log error handling entry
        this.logger.debug(`${functionName} - Entry`, {
            errorId,
            errorType: typeof error,
            hasRetryFunction: !!options.retryFunction,
            source: options.source || 'unknown',
            timestamp: new Date().toISOString()
        });
        
        try {
            // Normalize error object with enhanced validation
            const normalizedError = this._normalizeError(error);
            
            // DEBUG: Log normalized error details
            this.logger.debug(`${functionName} - Error normalized`, {
                errorId,
                normalizedError: {
                    name: normalizedError.name,
                    message: normalizedError.message,
                    code: normalizedError.code,
                    status: normalizedError.status
                }
            });
            
            // Classify error with detailed reasoning
            const classification = this._classifyError(normalizedError, options);
            
            // DEBUG: Log error classification
            this.logger.debug(`${functionName} - Error classified`, {
                errorId,
                classification,
                reasoning: this._getClassificationReasoning(normalizedError, classification)
            });
            
            // Create comprehensive error context
            const errorContext = this._createErrorContext(normalizedError, classification, options);
            errorContext.id = errorId;
            errorContext.handlingStartTime = startTime;
            
            // Log error with full context
            this._logError(errorContext);
            

            
            // Determine retry strategy with detailed logging
            const shouldRetry = this._shouldRetry(errorContext);
            
            // DEBUG: Log retry decision
            this.logger.debug(`${functionName} - Retry decision`, {
                errorId,
                shouldRetry,
                retryCount: this.retryAttempts.get(`${errorContext.type}:${errorContext.error.message}`) || 0,
                maxRetries: this.config.maxRetries,
                hasRetryFunction: !!options.retryFunction
            });
            
            // Handle retry logic with enhanced tracking
            if (shouldRetry && options.retryFunction) {
                return await this._handleRetry(errorContext, options.retryFunction);
            }
            
            // Notify user if appropriate with context
            if (this.config.enableUserNotification && this.isClient) {
                this._notifyUser(errorContext);
            }
            
            // Create structured error response
            const errorResponse = this._createErrorResponse(errorContext);
            const handlingDuration = Date.now() - startTime;
            
            // DEBUG: Log successful error handling completion
            this.logger.debug(`${functionName} - Error handling completed`, {
                errorId,
                handlingDuration: `${handlingDuration}ms`,
                responseCode: errorResponse.code,
                retryable: errorResponse.retryable
            });
            
            return errorResponse;
            
        } catch (handlingError) {
            const handlingDuration = Date.now() - startTime;
            
            // DEBUG: Log error handler failure with full context
            this.logger.error(`${functionName} - Error handler failure`, {
                errorId,
                originalError: error?.message || String(error),
                handlingError: handlingError.message,
                handlingStack: handlingError.stack,
                handlingDuration: `${handlingDuration}ms`,
                options,
                timestamp: new Date().toISOString()
            });
            
            // Fallback error response
            console.error('Critical: Error in error handler:', handlingError);
            return {
                success: false,
                error: 'An unexpected error occurred during error handling',
                code: 'ERROR_HANDLER_FAILURE',
                errorId,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * Get detailed reasoning for error classification
     * Helps with debugging classification logic
     * 
     * @param {Object} error - Normalized error object
     * @param {Object} classification - Error classification result
     * @returns {string} Human-readable classification reasoning
     * @private
     * 
     * DEBUG: Added for classification debugging
     */
    _getClassificationReasoning(error, classification) {
        const reasons = [];
        
        if (error.status) {
            reasons.push(`HTTP status ${error.status}`);
        }
        
        if (error.code) {
            reasons.push(`Error code: ${error.code}`);
        }
        
        if (error.message) {
            const messageKeywords = ['token', 'auth', 'timeout', 'network', 'validation'];
            const foundKeywords = messageKeywords.filter(keyword => 
                error.message.toLowerCase().includes(keyword)
            );
            if (foundKeywords.length > 0) {
                reasons.push(`Message keywords: ${foundKeywords.join(', ')}`);
            }
        }
        
        if (reasons.length === 0) {
            reasons.push('Default classification based on error structure');
        }
        
        return `Classified as ${classification.type}/${classification.severity} based on: ${reasons.join('; ')}`;
    }
    
    /**
     * Normalize error to consistent format
     */
    _normalizeError(error) {
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code,
                status: error.status || error.statusCode
            };
        }
        
        if (typeof error === 'string') {
            return {
                name: 'Error',
                message: error,
                stack: new Error(error).stack
            };
        }
        
        if (typeof error === 'object' && error !== null) {
            return {
                name: error.name || 'Error',
                message: error.message || JSON.stringify(error),
                stack: error.stack || new Error(error.message || 'Unknown error').stack,
                code: error.code,
                status: error.status || error.statusCode,
                ...error
            };
        }
        
        return {
            name: 'Error',
            message: 'Unknown error occurred',
            stack: new Error('Unknown error').stack
        };
    }
    
    /**
     * Classify error type and severity
     */
    _classifyError(error, options) {
        let type = ERROR_TYPES.UNKNOWN;
        let severity = options.severity || ERROR_SEVERITY.MEDIUM;
        
        // Classify by status code
        if (error.status) {
            if (error.status === 401) {
                type = ERROR_TYPES.AUTHENTICATION;
                severity = ERROR_SEVERITY.HIGH;
            } else if (error.status === 403) {
                type = ERROR_TYPES.AUTHORIZATION;
                severity = ERROR_SEVERITY.HIGH;
            } else if (error.status === 404) {
                type = ERROR_TYPES.NOT_FOUND;
                severity = ERROR_SEVERITY.LOW;
            } else if (error.status === 429) {
                type = ERROR_TYPES.RATE_LIMIT;
                severity = ERROR_SEVERITY.MEDIUM;
            } else if (error.status >= 400 && error.status < 500) {
                type = ERROR_TYPES.CLIENT;
                severity = ERROR_SEVERITY.MEDIUM;
            } else if (error.status >= 500) {
                type = ERROR_TYPES.SERVER;
                severity = ERROR_SEVERITY.HIGH;
            }
        }
        
        // Classify by error message/code
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            type = ERROR_TYPES.NETWORK;
            severity = ERROR_SEVERITY.HIGH;
        } else if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
            type = ERROR_TYPES.TIMEOUT;
            severity = ERROR_SEVERITY.MEDIUM;
        } else if (error.message.includes('token') || error.message.includes('auth')) {
            type = ERROR_TYPES.AUTHENTICATION;
            severity = ERROR_SEVERITY.HIGH;
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
            type = ERROR_TYPES.VALIDATION;
            severity = ERROR_SEVERITY.LOW;
        }
        
        return { type, severity };
    }
    
    /**
     * Create comprehensive error context
     */
    _createErrorContext(error, classification, options) {
        return {
            id: this._generateErrorId(),
            timestamp: new Date().toISOString(),
            error,
            type: classification.type,
            severity: classification.severity,
            source: options.source || 'unknown',
            context: options.context || {},
            environment: this.isClient ? 'client' : 'server',
            userAgent: this.isClient ? navigator.userAgent : undefined,
            url: this.isClient ? window.location.href : undefined,
            userId: options.userId,
            sessionId: options.sessionId
        };
    }
    
    /**
     * Log error with appropriate level
     */
    _logError(errorContext) {
        const logData = {
            errorId: errorContext.id,
            type: errorContext.type,
            severity: errorContext.severity,
            source: errorContext.source,
            message: errorContext.error.message,
            stack: errorContext.error.stack,
            context: errorContext.context,
            environment: errorContext.environment,
            timestamp: errorContext.timestamp
        };
        
        switch (errorContext.severity) {
            case ERROR_SEVERITY.CRITICAL:
                this.logger.error('🚨 CRITICAL ERROR', logData);
                break;
            case ERROR_SEVERITY.HIGH:
                this.logger.error('❌ HIGH SEVERITY ERROR', logData);
                break;
            case ERROR_SEVERITY.MEDIUM:
                this.logger.warn('⚠️ MEDIUM SEVERITY ERROR', logData);
                break;
            case ERROR_SEVERITY.LOW:
                this.logger.info('ℹ️ LOW SEVERITY ERROR', logData);
                break;
            default:
                this.logger.error('❓ UNKNOWN SEVERITY ERROR', logData);
        }
    }
    
    /**
     * Track error for analytics
     */
    _trackError(errorContext) {
        const errorKey = `${errorContext.type}:${errorContext.error.message}`;
        const currentCount = this.errorCounts.get(errorKey) || 0;
        this.errorCounts.set(errorKey, currentCount + 1);
        

    }
    
    /**
     * Determine if error should be retried
     */
    _shouldRetry(errorContext) {
        // Don't retry client errors (4xx) except authentication
        if (errorContext.type === ERROR_TYPES.CLIENT && 
            errorContext.type !== ERROR_TYPES.AUTHENTICATION) {
            return false;
        }
        
        // Don't retry validation errors
        if (errorContext.type === ERROR_TYPES.VALIDATION) {
            return false;
        }
        
        // Check retry count
        const retryKey = `${errorContext.type}:${errorContext.error.message}`;
        const attempts = this.retryAttempts.get(retryKey) || 0;
        
        return attempts < this.config.maxRetries;
    }
    
    /**
     * Handle retry logic with exponential backoff
     */
    async _handleRetry(errorContext, retryFunction) {
        const retryKey = `${errorContext.type}:${errorContext.error.message}`;
        const attempts = this.retryAttempts.get(retryKey) || 0;
        
        this.retryAttempts.set(retryKey, attempts + 1);
        
        // Calculate delay with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempts);
        
        this.logger.info('🔄 Retrying operation', {
            errorId: errorContext.id,
            attempt: attempts + 1,
            maxRetries: this.config.maxRetries,
            delay: `${delay}ms`
        });
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
            const result = await retryFunction();
            
            // Clear retry count on success
            this.retryAttempts.delete(retryKey);
            
            this.logger.info('✅ Retry successful', {
                errorId: errorContext.id,
                attempt: attempts + 1
            });
            
            return result;
            
        } catch (retryError) {
            // Handle retry failure
            return await this.handleError(retryError, {
                source: 'retry_failure',
                context: { originalErrorId: errorContext.id, attempt: attempts + 1 }
            });
        }
    }
    
    /**
     * Notify user of error (client-side only)
     */
    _notifyUser(errorContext) {
        if (!this.isClient) return;
        
        const userMessage = this._getUserFriendlyMessage(errorContext);
        
        // Try to use application's notification system
        if (window.app && window.app.showMessage) {
            window.app.showMessage(userMessage, 'error');
        } else {
            // Fallback to console or alert
            console.error('Error:', userMessage);
        }
    }
    
    /**
     * Generate user-friendly error message
     */
    _getUserFriendlyMessage(errorContext) {
        switch (errorContext.type) {
            case ERROR_TYPES.NETWORK:
                return 'Network connection error. Please check your internet connection and try again.';
            case ERROR_TYPES.AUTHENTICATION:
                return 'Authentication failed. Please log in again.';
            case ERROR_TYPES.AUTHORIZATION:
                return 'Access denied. You don\'t have permission to perform this action.';
            case ERROR_TYPES.NOT_FOUND:
                return 'The requested resource was not found.';
            case ERROR_TYPES.RATE_LIMIT:
                return 'Too many requests. Please wait a moment and try again.';
            case ERROR_TYPES.TIMEOUT:
                return 'Request timed out. Please try again.';
            case ERROR_TYPES.VALIDATION:
                return errorContext.error.message || 'Please check your input and try again.';
            case ERROR_TYPES.SERVER:
                return 'Server error occurred. Please try again later.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    }
    
    /**
     * Create structured error response
     */
    _createErrorResponse(errorContext) {
        return {
            success: false,
            error: this._getUserFriendlyMessage(errorContext),
            code: errorContext.type.toUpperCase(),
            errorId: errorContext.id,
            timestamp: errorContext.timestamp,
            retryable: this._shouldRetry(errorContext)
        };
    }
    
    /**
     * Generate unique error ID
     */
    _generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get error statistics
     */
    getErrorStats() {
        return {
            totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
            errorsByType: Object.fromEntries(this.errorCounts),
            activeRetries: this.retryAttempts.size
        };
    }
    
    /**
     * Clear error statistics
     */
    clearStats() {
        this.errorCounts.clear();
        this.retryAttempts.clear();
    }
}

// Create singleton instances
let clientErrorHandler = null;
let serverErrorHandler = null;

/**
 * Get error handler instance
 */
export function getErrorHandler(options = {}) {
    const isClient = typeof window !== 'undefined';
    
    if (isClient) {
        if (!clientErrorHandler) {
            clientErrorHandler = new ErrorHandler(options);
        }
        return clientErrorHandler;
    } else {
        if (!serverErrorHandler) {
            serverErrorHandler = new ErrorHandler(options);
        }
        return serverErrorHandler;
    }
}

/**
 * Handle error with default handler
 */
export async function handleError(error, options = {}) {
    const handler = getErrorHandler();
    return await handler.handleError(error, options);
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling(asyncFunction, options = {}) {
    return async (...args) => {
        try {
            return await asyncFunction(...args);
        } catch (error) {
            return await handleError(error, {
                ...options,
                retryFunction: () => asyncFunction(...args)
            });
        }
    };
}

export default ErrorHandler;