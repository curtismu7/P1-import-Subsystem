// Enhanced Error Handler with Recovery Mechanisms
// Version 7.3.0 - Phase 1 Improvements
//
// This enhanced error handler provides:
// - Intelligent error categorization and recovery
// - User-friendly error messages
// - Automatic retry mechanisms with exponential backoff
// - Graceful degradation for API failures
// - Comprehensive error logging and analytics

import EventEmitter from 'events';

/**
 * Enhanced Error Handler Class
 * 
 * Provides comprehensive error handling with automatic recovery,
 * user-friendly messaging, and intelligent retry mechanisms.
 */
class EnhancedErrorHandler extends EventEmitter {
    constructor(logger) {
        super();
        
        this.logger = logger || {
            debug: console.debug.bind(console),
            info: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console)
        };
        
        // Error tracking
        this.errorStats = {
            total: 0,
            byCategory: {},
            byEndpoint: {},
            recoveredErrors: 0,
            criticalErrors: 0,
            lastError: null,
            startTime: Date.now()
        };
        
        // Recovery configuration
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000, // 1 second
            maxDelay: 30000, // 30 seconds
            backoffMultiplier: 2
        };
        
        // Error categories and their handling strategies
        this.errorCategories = {
            NETWORK: {
                name: 'Network Error',
                recoverable: true,
                userMessage: 'Connection issue detected. Retrying automatically...',
                retryStrategy: 'exponential_backoff'
            },
            AUTHENTICATION: {
                name: 'Authentication Error',
                recoverable: true,
                userMessage: 'Authentication expired. Refreshing credentials...',
                retryStrategy: 'token_refresh'
            },
            VALIDATION: {
                name: 'Validation Error',
                recoverable: false,
                userMessage: 'Please check your input and try again.',
                retryStrategy: 'none'
            },
            SERVER: {
                name: 'Server Error',
                recoverable: true,
                userMessage: 'Server temporarily unavailable. Retrying...',
                retryStrategy: 'exponential_backoff'
            },
            CLIENT: {
                name: 'Client Error',
                recoverable: false,
                userMessage: 'Invalid request. Please check your input.',
                retryStrategy: 'none'
            },
            UNKNOWN: {
                name: 'Unknown Error',
                recoverable: true,
                userMessage: 'An unexpected error occurred. Attempting recovery...',
                retryStrategy: 'simple_retry'
            }
        };
        
        // Active retry operations
        this.activeRetries = new Map();
        
        this.logger.info('Enhanced Error Handler initialized');
    }

    /**
     * Handle error with automatic categorization and recovery
     */
    async handleError(error, context = {}) {
        try {
            // Generate unique error ID
            const errorId = this.generateErrorId();
            
            // Categorize the error
            const category = this.categorizeError(error);
            
            // Update statistics
            this.updateErrorStats(category, context);
            
            // Create enhanced error object
            const enhancedError = {
                id: errorId,
                category,
                originalError: error,
                context,
                timestamp: Date.now(),
                userMessage: this.errorCategories[category].userMessage,
                recoverable: this.errorCategories[category].recoverable
            };
            
            // Log the error
            this.logError(enhancedError);
            
            // Emit error event
            this.emit('error', enhancedError);
            
            // Attempt recovery if possible
            if (enhancedError.recoverable) {
                const recoveryResult = await this.attemptRecovery(enhancedError);
                if (recoveryResult.success) {
                    this.errorStats.recoveredErrors++;
                    this.emit('errorRecovered', { errorId, recoveryResult });
                    return { success: true, recovered: true, result: recoveryResult };
                }
            }
            
            // If recovery failed or not possible, return error details
            return {
                success: false,
                error: enhancedError,
                userMessage: enhancedError.userMessage
            };
            
        } catch (handlingError) {
            this.logger.error('Error in error handler:', handlingError);
            return {
                success: false,
                error: { message: 'Error handling failed', originalError: error },
                userMessage: 'An unexpected error occurred. Please try again.'
            };
        }
    }

    /**
     * Categorize error based on type and content
     */
    categorizeError(error) {
        try {
            const errorMessage = (error.message || '').toLowerCase();
            const errorCode = error.code || error.status || error.statusCode;
            
            // Network errors
            if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || 
                errorCode === 'ETIMEDOUT' || errorMessage.includes('network') ||
                errorMessage.includes('connection') || errorMessage.includes('timeout')) {
                return 'NETWORK';
            }
            
            // Authentication errors
            if (errorCode === 401 || errorCode === 403 || 
                errorMessage.includes('unauthorized') || errorMessage.includes('forbidden') ||
                errorMessage.includes('token') || errorMessage.includes('auth')) {
                return 'AUTHENTICATION';
            }
            
            // Validation errors
            if (errorCode === 400 || errorCode === 422 || 
                errorMessage.includes('validation') || errorMessage.includes('invalid') ||
                errorMessage.includes('required') || errorMessage.includes('format')) {
                return 'VALIDATION';
            }
            
            // Server errors
            if (errorCode >= 500 && errorCode < 600 || 
                errorMessage.includes('server') || errorMessage.includes('internal')) {
                return 'SERVER';
            }
            
            // Client errors
            if (errorCode >= 400 && errorCode < 500) {
                return 'CLIENT';
            }
            
            // Default to unknown
            return 'UNKNOWN';
            
        } catch (e) {
            this.logger.warn('Error categorization failed:', e);
            return 'UNKNOWN';
        }
    }

    /**
     * Attempt error recovery based on category
     */
    async attemptRecovery(enhancedError) {
        const { category, context, id } = enhancedError;
        const strategy = this.errorCategories[category].retryStrategy;
        
        try {
            this.logger.info(`Attempting recovery for error ${id} using strategy: ${strategy}`);
            
            switch (strategy) {
                case 'exponential_backoff':
                    return await this.exponentialBackoffRetry(enhancedError);
                    
                case 'token_refresh':
                    return await this.tokenRefreshRetry(enhancedError);
                    
                case 'simple_retry':
                    return await this.simpleRetry(enhancedError);
                    
                case 'none':
                default:
                    return { success: false, reason: 'No recovery strategy available' };
            }
            
        } catch (recoveryError) {
            this.logger.error(`Recovery failed for error ${id}:`, recoveryError);
            return { success: false, reason: 'Recovery attempt failed', error: recoveryError };
        }
    }

    /**
     * Exponential backoff retry strategy
     */
    async exponentialBackoffRetry(enhancedError) {
        const { context, id } = enhancedError;
        const retryKey = `${id}_${Date.now()}`;
        
        if (this.activeRetries.has(retryKey)) {
            return { success: false, reason: 'Retry already in progress' };
        }
        
        this.activeRetries.set(retryKey, { attempts: 0, startTime: Date.now() });
        
        try {
            for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
                const delay = Math.min(
                    this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
                    this.retryConfig.maxDelay
                );
                
                this.logger.debug(`Retry attempt ${attempt}/${this.retryConfig.maxRetries} for error ${id} (delay: ${delay}ms)`);
                
                // Wait before retry
                await this.sleep(delay);
                
                // Attempt the original operation
                if (context.retryFunction && typeof context.retryFunction === 'function') {
                    try {
                        const result = await context.retryFunction();
                        this.activeRetries.delete(retryKey);
                        return { success: true, attempt, result };
                    } catch (retryError) {
                        this.logger.warn(`Retry attempt ${attempt} failed:`, retryError);
                        if (attempt === this.retryConfig.maxRetries) {
                            throw retryError;
                        }
                    }
                }
            }
            
            return { success: false, reason: 'All retry attempts exhausted' };
            
        } finally {
            this.activeRetries.delete(retryKey);
        }
    }

    /**
     * Token refresh retry strategy
     */
    async tokenRefreshRetry(enhancedError) {
        const { context, id } = enhancedError;
        
        try {
            this.logger.info(`Attempting token refresh for error ${id}`);
            
            // Try to refresh token via the enhanced token manager
            if (global.tokenManager && typeof global.tokenManager.forceRefresh === 'function') {
                await global.tokenManager.forceRefresh();
                
                // Retry the original operation with new token
                if (context.retryFunction && typeof context.retryFunction === 'function') {
                    const result = await context.retryFunction();
                    return { success: true, method: 'token_refresh', result };
                }
            }
            
            return { success: false, reason: 'Token manager not available' };
            
        } catch (refreshError) {
            this.logger.error('Token refresh failed:', refreshError);
            return { success: false, reason: 'Token refresh failed', error: refreshError };
        }
    }

    /**
     * Simple retry strategy
     */
    async simpleRetry(enhancedError) {
        const { context, id } = enhancedError;
        
        try {
            this.logger.info(`Attempting simple retry for error ${id}`);
            
            // Wait a short time before retry
            await this.sleep(1000);
            
            // Retry the original operation
            if (context.retryFunction && typeof context.retryFunction === 'function') {
                const result = await context.retryFunction();
                return { success: true, method: 'simple_retry', result };
            }
            
            return { success: false, reason: 'No retry function available' };
            
        } catch (retryError) {
            this.logger.error('Simple retry failed:', retryError);
            return { success: false, reason: 'Simple retry failed', error: retryError };
        }
    }

    /**
     * Update error statistics
     */
    updateErrorStats(category, context) {
        this.errorStats.total++;
        this.errorStats.byCategory[category] = (this.errorStats.byCategory[category] || 0) + 1;
        
        if (context.endpoint) {
            this.errorStats.byEndpoint[context.endpoint] = (this.errorStats.byEndpoint[context.endpoint] || 0) + 1;
        }
        
        if (category === 'SERVER' || category === 'UNKNOWN') {
            this.errorStats.criticalErrors++;
        }
        
        this.errorStats.lastError = Date.now();
    }

    /**
     * Log error with appropriate level and context
     */
    logError(enhancedError) {
        const { category, originalError, context, id } = enhancedError;
        
        const logLevel = this.getLogLevel(category);
        const logMessage = `[${id}] ${this.errorCategories[category].name}: ${originalError.message}`;
        
        this.logger[logLevel](logMessage, {
            errorId: id,
            category,
            context,
            stack: originalError.stack,
            recoverable: enhancedError.recoverable
        });
    }

    /**
     * Get appropriate log level for error category
     */
    getLogLevel(category) {
        switch (category) {
            case 'NETWORK':
            case 'AUTHENTICATION':
                return 'warn';
            case 'SERVER':
            case 'UNKNOWN':
                return 'error';
            case 'VALIDATION':
            case 'CLIENT':
            default:
                return 'info';
        }
    }

    /**
     * Generate unique error ID
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sleep utility for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get comprehensive error statistics
     */
    getErrorStats() {
        const uptime = Date.now() - this.errorStats.startTime;
        const errorRate = this.errorStats.total > 0 ? (this.errorStats.total / (uptime / 1000)) : 0;
        const recoveryRate = this.errorStats.total > 0 ? (this.errorStats.recoveredErrors / this.errorStats.total) : 0;
        
        return {
            ...this.errorStats,
            uptime: Math.floor(uptime / 1000),
            errorRate: Math.round(errorRate * 100) / 100, // errors per second
            recoveryRate: Math.round(recoveryRate * 100), // percentage
            activeRetries: this.activeRetries.size
        };
    }

    /**
     * Create user-friendly error message
     */
    createUserFriendlyMessage(error, context = {}) {
        const category = this.categorizeError(error);
        const baseMessage = this.errorCategories[category].userMessage;
        
        // Add context-specific information
        let contextMessage = '';
        if (context.operation) {
            contextMessage = ` during ${context.operation}`;
        }
        
        return baseMessage + contextMessage;
    }

    /**
     * Express middleware for error handling
     */
    expressMiddleware() {
        return async (error, req, res, next) => {
            const context = {
                endpoint: req.path,
                method: req.method,
                operation: req.body?.operation || 'request processing'
            };
            
            const result = await this.handleError(error, context);
            
            if (result.success && result.recovered) {
                // Error was recovered, continue with success
                return next();
            }
            
            // Send error response
            const statusCode = this.getStatusCode(error);
            res.status(statusCode).json({
                success: false,
                error: result.userMessage,
                errorId: result.error?.id,
                recoverable: result.error?.recoverable || false,
                timestamp: Date.now()
            });
        };
    }

    /**
     * Get appropriate HTTP status code for error
     */
    getStatusCode(error) {
        if (error.status || error.statusCode) {
            return error.status || error.statusCode;
        }
        
        const category = this.categorizeError(error);
        switch (category) {
            case 'AUTHENTICATION': return 401;
            case 'VALIDATION': return 400;
            case 'CLIENT': return 400;
            case 'SERVER': return 500;
            case 'NETWORK': return 503;
            default: return 500;
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.activeRetries.clear();
        this.removeAllListeners();
        this.logger.info('Enhanced Error Handler destroyed');
    }
}

export default EnhancedErrorHandler;
