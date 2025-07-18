/**
 * Error Types
 * 
 * Defines standard error types and severities for consistent error handling
 */

/**
 * Standard error types
 */
export const ErrorTypes = Object.freeze({
    // Client-side errors
    VALIDATION: 'VALIDATION',      // Data validation failed
    AUTHENTICATION: 'AUTHENTICATION', // Authentication/authorization issues
    AUTHORIZATION: 'AUTHORIZATION',   // Permission issues
    NETWORK: 'NETWORK',           // Network connectivity issues
    TIMEOUT: 'TIMEOUT',           // Request timeouts
    
    // Server-side errors
    SERVER: 'SERVER',             // Generic server error (500)
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE', // Service unavailable (503)
    NOT_FOUND: 'NOT_FOUND',       // Resource not found (404)
    CONFLICT: 'CONFLICT',         // Resource conflict (409)
    
    // Application-specific errors
    CONFIGURATION: 'CONFIGURATION', // Configuration errors
    INTEGRATION: 'INTEGRATION',   // Third-party service integration errors
    
    // Fallback
    UNKNOWN: 'UNKNOWN'            // Unclassified errors
});

/**
 * Error severity levels
 */
export const ErrorSeverity = Object.freeze({
    FATAL: 'FATAL',     // Application cannot continue
    ERROR: 'ERROR',     // Operation failed, but application can continue
    WARNING: 'WARNING', // Operation completed with issues
    INFO: 'INFO',      // Informational message
    DEBUG: 'DEBUG'     // Debug information
});

/**
 * Standard error codes
 */
export const ErrorCodes = Object.freeze({
    // Authentication (1000-1099)
    INVALID_CREDENTIALS: 1001,
    SESSION_EXPIRED: 1002,
    INVALID_TOKEN: 1003,
    
    // Validation (2000-2099)
    INVALID_INPUT: 2001,
    MISSING_REQUIRED_FIELD: 2002,
    INVALID_FORMAT: 2003,
    
    // Authorization (3000-3099)
    PERMISSION_DENIED: 3001,
    INSUFFICIENT_PERMISSIONS: 3002,
    
    // Network (4000-4099)
    NETWORK_ERROR: 4001,
    REQUEST_TIMEOUT: 4002,
    
    // Server (5000-5099)
    INTERNAL_SERVER_ERROR: 5001,
    SERVICE_UNAVAILABLE: 5002,
    
    // Business Logic (6000-6099)
    DUPLICATE_ENTRY: 6001,
    RESOURCE_NOT_FOUND: 6002,
    
    // Integration (7000-7099)
    EXTERNAL_SERVICE_ERROR: 7001,
    API_RATE_LIMIT_EXCEEDED: 7002
});

/**
 * Standard error messages
 */
export const ErrorMessages = Object.freeze({
    [ErrorTypes.VALIDATION]: 'Validation failed',
    [ErrorTypes.AUTHENTICATION]: 'Authentication required',
    [ErrorTypes.AUTHORIZATION]: 'Permission denied',
    [ErrorTypes.NETWORK]: 'Network error occurred',
    [ErrorTypes.TIMEOUT]: 'Request timed out',
    [ErrorTypes.SERVER]: 'Internal server error',
    [ErrorTypes.SERVICE_UNAVAILABLE]: 'Service unavailable',
    [ErrorTypes.NOT_FOUND]: 'Resource not found',
    [ErrorTypes.CONFLICT]: 'Resource conflict',
    [ErrorTypes.CONFIGURATION]: 'Configuration error',
    [ErrorTypes.INTEGRATION]: 'Integration error',
    [ErrorTypes.UNKNOWN]: 'An unexpected error occurred'
});

/**
 * Error metadata
 * Maps error types to their default properties
 */
export const ErrorMetadata = Object.freeze({
    [ErrorTypes.VALIDATION]: {
        severity: ErrorSeverity.WARNING,
        isRecoverable: true,
        userMessage: 'Please check your input and try again.'
    },
    [ErrorTypes.AUTHENTICATION]: {
        severity: ErrorSeverity.ERROR,
        isRecoverable: true,
        userMessage: 'Your session has expired. Please log in again.'
    },
    [ErrorTypes.AUTHORIZATION]: {
        severity: ErrorSeverity.ERROR,
        isRecoverable: false,
        userMessage: 'You do not have permission to perform this action.'
    },
    [ErrorTypes.NETWORK]: {
        severity: ErrorSeverity.WARNING,
        isRecoverable: true,
        userMessage: 'Unable to connect to the server. Please check your internet connection.'
    },
    [ErrorTypes.SERVER]: {
        severity: ErrorSeverity.ERROR,
        isRecoverable: false,
        userMessage: 'An unexpected server error occurred. Please try again later.'
    },
    [ErrorTypes.UNKNOWN]: {
        severity: ErrorSeverity.ERROR,
        isRecoverable: false,
        userMessage: 'An unexpected error occurred. Please try again.'
    }
});

/**
 * Creates a standard error object
 * @param {string} type - Error type from ErrorTypes
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Error} Standardized error object
 */
export function createError(type, message, details = {}) {
    const error = new Error(message || ErrorMessages[type] || 'An unknown error occurred');
    error.type = type;
    error.code = details.code || ErrorCodes[type] || 0;
    error.details = details;
    error.timestamp = new Date().toISOString();
    
    // Add metadata if available
    const metadata = ErrorMetadata[type];
    if (metadata) {
        error.severity = metadata.severity;
        error.isRecoverable = metadata.isRecoverable;
        error.userMessage = metadata.userMessage;
    }
    
    return error;
}

/**
 * Checks if an error is of a specific type
 * @param {Error} error - The error to check
 * @param {string} type - The error type to check against
 * @returns {boolean} True if the error is of the specified type
 */
export function isErrorType(error, type) {
    return error && error.type === type;
}

/**
 * Gets the default error message for an error type
 * @param {string} type - The error type
 * @returns {string} The default error message
 */
export function getDefaultMessage(type) {
    return ErrorMessages[type] || 'An unknown error occurred';
}

/**
 * Gets the default severity for an error type
 * @param {string} type - The error type
 * @returns {string} The default severity
 */
export function getDefaultSeverity(type) {
    const metadata = ErrorMetadata[type];
    return metadata ? metadata.severity : ErrorSeverity.ERROR;
}
