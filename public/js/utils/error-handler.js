/**
 * Standardized Error Handling Utility
 * 
 * Provides consistent error handling patterns, error wrapping for async operations,
 * and standardized error reporting across the application.
 */

class ErrorHandler {
    constructor(logger = null) {
        this.logger = logger || {
            error: (msg, data) => console.error(msg, data),
            warn: (msg, data) => console.warn(msg, data),
            debug: (msg, data) => console.debug(msg, data)
        };
    }

    /**
     * Wrap async functions with standardized error handling
     * @param {Function} asyncFn - The async function to wrap
     * @param {string} context - Context description for error reporting
     * @param {Object} options - Options for error handling
     * @returns {Function} Wrapped function with error handling
     */
    wrapAsync(asyncFn, context = 'Unknown operation', userMessage = null, options = {}) {
        const { 
            retries = 0, 
            retryDelay = 1000, 
            fallbackValue = null,
            suppressErrors = false,
            rethrow = false
        } = options;

        return async (...args) => {
            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    return await asyncFn(...args);
                } catch (error) {
                    if (attempt < retries) {
                        this.logger.warn(`${context} failed (attempt ${attempt + 1}/${retries + 1}), retrying...`, {
                            error: error.message,
                            args: this._sanitizeArgs(args)
                        });
                        await this._delay(retryDelay * (attempt + 1));
                        continue;
                    }
                    
                    // Final attempt failed
                    this.handleError(error, context, { 
                        userMessage: userMessage || 'An unexpected error occurred.',
                        retries, 
                        suppress: suppressErrors 
                    });

                    if (rethrow) {
                        throw error;
                    }

                    return fallbackValue;
                }
            }
            return fallbackValue; // Should be unreachable if rethrow is false
        };
    }

    /**
     * Wrap synchronous functions with standardized error handling
     * @param {Function} syncFn - The synchronous function to wrap
     * @param {string} context - Context description for error reporting
     * @param {Object} options - Options for error handling
     * @returns {Function} Wrapped function with error handling
     */
    wrapSync(syncFn, context = 'Unknown operation', userMessage = null, options = {}) {
        const {
            fallbackValue = null,
            suppressErrors = false,
            rethrow = false
        } = options;

        return (...args) => {
            try {
                return syncFn(...args);
            } catch (error) {
                this.handleError(error, context, {
                    userMessage: userMessage || 'An unexpected error occurred.',
                    suppress: suppressErrors,
                    args: this._sanitizeArgs(args)
                });

                if (rethrow) {
                    throw error;
                }

                return fallbackValue;
            }
        };
    }

    /**
     * Create a standardized error object
     * @param {string} message - Error message
     * @param {string} code - Error code
     * @param {Object} context - Additional context
     * @param {Error} originalError - Original error if wrapping
     * @returns {Error} Standardized error object
     */
    createError(message, code = 'UNKNOWN_ERROR', context = {}, originalError = null) {
        const error = new Error(message);
        error.code = code;
        error.context = context;
        error.timestamp = new Date().toISOString();
        
        if (originalError) {
            error.originalError = originalError;
            error.originalStack = originalError.stack;
        }
        
        return error;
    }

    /**
     * Handle and report errors with context
     * @param {Error} error - The error to handle
     * @param {string} context - Context description
     * @param {Object} options - Additional data for error reporting
     */
    handleError(error, context = 'Unknown context', options = {}) {
        const { userMessage, suppress, ...additionalData } = options;

        if (suppress) return; // Do not log or show UI error if suppressed

        const errorData = {
            message: error.message,
            code: error.code || 'UNHANDLED_EXCEPTION',
            context: context,
            timestamp: new Date().toISOString(),
            stack: error.stack,
            ...additionalData
        };
        
        this.logger.error(`Error in ${context}:`, errorData);
        
        // Report to external service if configured
        this._reportToErrorService(errorData);
        
        // Show UI notification if UI manager is available
        if (typeof window !== 'undefined' && window.app && window.app.uiManager) {
            const uiManager = window.app.uiManager;
            // Prioritize the user-friendly message for the UI
            const displayMessage = userMessage || error.message;
            uiManager.showError(
                `Error: ${context}`,
                displayMessage
            );
        }
    }

    /**
     * Wrap DOM event handlers with error handling
     * @param {Function} handler - The event handler function
     * @param {string} context - Context description
     * @returns {Function} Wrapped event handler
     */
    wrapEventHandler(handler, context = 'Event handler') {
        return (event) => {
            try {
                return handler(event);
            } catch (error) {
                this.logger.error(`${context} failed`, {
                    error: error.message,
                    eventType: event?.type,
                    target: event?.target?.tagName || 'unknown'
                });
                
                // Prevent error from bubbling up and breaking the UI
                event?.preventDefault?.();
                event?.stopPropagation?.();
            }
        };
    }

    /**
     * Create a safe function that never throws
     * @param {Function} fn - Function to make safe
     * @param {string} context - Context description
     * @param {*} fallbackValue - Value to return on error
     * @returns {Function} Safe function
     */
    makeSafe(fn, context = 'Safe function', fallbackValue = null) {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                this.logger.warn(`${context} failed safely`, {
                    error: error.message,
                    args: this._sanitizeArgs(args)
                });
                return fallbackValue;
            }
        };
    }

    /**
     * Validate and handle API responses
     * @param {Response} response - Fetch response object
     * @param {string} context - Context description
     * @returns {Promise<Object>} Parsed response data
     */
    async handleApiResponse(response, context = 'API call') {
        try {
            if (!response.ok) {
                const errorData = {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url
                };
                
                let errorMessage = `${context} failed with status ${response.status}`;
                
                try {
                    const errorBody = await response.text();
                    errorData.body = errorBody;
                    
                    // Try to parse as JSON for more details
                    try {
                        const jsonError = JSON.parse(errorBody);
                        if (jsonError.message) {
                            errorMessage = jsonError.message;
                        }
                    } catch (e) {
                        // Not JSON, use text as is
                    }
                } catch (e) {
                    // Could not read response body
                }
                
                throw this.createError(errorMessage, `HTTP_${response.status}`, errorData);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            if (error.code && error.code.startsWith('HTTP_')) {
                throw error; // Re-throw our custom HTTP errors
            }
            
            // Handle JSON parsing or other errors
            throw this.createError(
                `${context} response parsing failed`,
                'RESPONSE_PARSE_ERROR',
                { originalError: error.message }
            );
        }
    }

    // Private helper methods
    _sanitizeArgs(args) {
        return args.map(arg => {
            if (typeof arg === 'string' && arg.length > 100) {
                return arg.substring(0, 100) + '...';
            }
            if (typeof arg === 'object' && arg !== null) {
                return { ...arg, _truncated: true };
            }
            return arg;
        });
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _reportToErrorService(errorData) {
        // Placeholder for error reporting service integration
        // Could send to external service, local storage, etc.
        if (typeof window !== 'undefined' && window.errorReportingEnabled) {
            // Example: send to error reporting service
            // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorData) });
        }
    }
}

// Export for both ES modules and CommonJS

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorHandler };
} else if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
}

// Add ES module export for compatibility with Jest and modern imports
export { ErrorHandler };
export default ErrorHandler;
