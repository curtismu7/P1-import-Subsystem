/**
 * Defensive Programming Utilities
 * 
 * Provides utilities for defensive programming to make the application more robust.
 * 
 * @version 6.5.2.4
 */

import { createWinstonLogger } from './winston-config.js';

// Create specialized logger for defensive programming
const defLogger = createWinstonLogger({
    service: 'defensive',
    env: process.env.NODE_ENV || 'development',
    enableFileLogging: process.env.NODE_ENV !== 'test'
});

/**
 * Safely access a property path in an object
 * 
 * @param {Object} obj - Object to access
 * @param {string} path - Property path (e.g., 'user.profile.name')
 * @param {*} defaultValue - Default value if path doesn't exist
 * @returns {*} - Value at path or default value
 */
export function safeGet(obj, path, defaultValue = null) {
    if (!obj || !path) return defaultValue;
    
    try {
        const keys = path.split('.');
        let result = obj;
        
        for (const key of keys) {
            if (result === null || result === undefined || typeof result !== 'object') {
                return defaultValue;
            }
            
            result = result[key];
        }
        
        return result === undefined ? defaultValue : result;
    } catch (error) {
        defLogger.debug(`safeGet failed for path ${path}`, { error: error.message });
        return defaultValue;
    }
}

/**
 * Safely call a function with error handling
 * 
 * @param {Function} fn - Function to call
 * @param {Array} args - Arguments to pass to the function
 * @param {*} defaultValue - Default value if function throws
 * @param {boolean} logError - Whether to log the error
 * @returns {*} - Function result or default value
 */
export function safeCall(fn, args = [], defaultValue = null, logError = true) {
    if (typeof fn !== 'function') return defaultValue;
    
    try {
        return fn(...args);
    } catch (error) {
        if (logError) {
            defLogger.warn('safeCall caught error', {
                function: fn.name || 'anonymous',
                error: error.message,
                stack: error.stack
            });
        }
        
        return defaultValue;
    }
}

/**
 * Safely call an async function with error handling
 * 
 * @param {Function} fn - Async function to call
 * @param {Array} args - Arguments to pass to the function
 * @param {*} defaultValue - Default value if function throws
 * @param {boolean} logError - Whether to log the error
 * @returns {Promise} - Promise resolving to function result or default value
 */
export async function safeCallAsync(fn, args = [], defaultValue = null, logError = true) {
    if (typeof fn !== 'function') return defaultValue;
    
    try {
        return await fn(...args);
    } catch (error) {
        if (logError) {
            defLogger.warn('safeCallAsync caught error', {
                function: fn.name || 'anonymous',
                error: error.message,
                stack: error.stack
            });
        }
        
        return defaultValue;
    }
}

/**
 * Validate an object against a schema
 * 
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Schema to validate against
 * @param {boolean} strict - Whether to fail on extra properties
 * @returns {Object} - Validation result { valid, errors, sanitized }
 */
export function validateObject(obj, schema, strict = false) {
    if (!obj || !schema) {
        return { valid: false, errors: ['Invalid input'], sanitized: null };
    }
    
    const errors = [];
    const sanitized = {};
    
    // Check required properties
    for (const [key, config] of Object.entries(schema)) {
        const value = obj[key];
        
        // Check if required
        if (config.required && (value === undefined || value === null)) {
            errors.push(`Missing required property: ${key}`);
            continue;
        }
        
        // Skip if not required and not present
        if (!config.required && (value === undefined || value === null)) {
            continue;
        }
        
        // Type checking
        if (config.type && typeof value !== config.type) {
            errors.push(`Invalid type for ${key}: expected ${config.type}, got ${typeof value}`);
            continue;
        }
        
        // Array validation
        if (config.type === 'array' && !Array.isArray(value)) {
            errors.push(`Invalid type for ${key}: expected array, got ${typeof value}`);
            continue;
        }
        
        // Min/max validation for numbers
        if (config.type === 'number') {
            if (config.min !== undefined && value < config.min) {
                errors.push(`Value for ${key} is below minimum: ${value} < ${config.min}`);
            }
            
            if (config.max !== undefined && value > config.max) {
                errors.push(`Value for ${key} exceeds maximum: ${value} > ${config.max}`);
            }
        }
        
        // Min/max length validation for strings and arrays
        if ((config.type === 'string' || Array.isArray(value)) && config.minLength !== undefined) {
            if (value.length < config.minLength) {
                errors.push(`Length of ${key} is below minimum: ${value.length} < ${config.minLength}`);
            }
        }
        
        if ((config.type === 'string' || Array.isArray(value)) && config.maxLength !== undefined) {
            if (value.length > config.maxLength) {
                errors.push(`Length of ${key} exceeds maximum: ${value.length} > ${config.maxLength}`);
            }
        }
        
        // Pattern validation for strings
        if (config.type === 'string' && config.pattern && !new RegExp(config.pattern).test(value)) {
            errors.push(`Value for ${key} does not match pattern: ${config.pattern}`);
        }
        
        // Enum validation
        if (config.enum && !config.enum.includes(value)) {
            errors.push(`Value for ${key} is not one of allowed values: ${config.enum.join(', ')}`);
        }
        
        // Add to sanitized object
        sanitized[key] = value;
    }
    
    // Check for extra properties in strict mode
    if (strict) {
        for (const key of Object.keys(obj)) {
            if (!schema[key]) {
                errors.push(`Unknown property: ${key}`);
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        sanitized: errors.length === 0 ? sanitized : null
    };
}

/**
 * Create a safe version of an Express middleware
 * 
 * @param {Function} middleware - Express middleware function
 * @returns {Function} - Safe middleware function
 */
export function safeMiddleware(middleware) {
    return async (req, res, next) => {
        try {
            await middleware(req, res, next);
        } catch (error) {
            defLogger.error('Middleware error caught', {
                middleware: middleware.name || 'anonymous',
                url: req.url,
                method: req.method,
                error: error.message,
                stack: error.stack
            });
            
            // Don't send response if already sent
            if (res.headersSent) {
                return next(error);
            }
            
            res.status(500).json({
                status: 'error',
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message
            });
        }
    };
}

/**
 * Create a safe version of an Express route handler
 * 
 * @param {Function} handler - Express route handler function
 * @returns {Function} - Safe route handler function
 */
export function safeHandler(handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        } catch (error) {
            defLogger.error('Route handler error caught', {
                handler: handler.name || 'anonymous',
                url: req.url,
                method: req.method,
                error: error.message,
                stack: error.stack
            });
            
            // Don't send response if already sent
            if (res.headersSent) {
                return next(error);
            }
            
            res.status(500).json({
                status: 'error',
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message
            });
        }
    };
}

/**
 * Retry a function with exponential backoff
 * 
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.initialDelay - Initial delay in ms
 * @param {number} options.maxDelay - Maximum delay in ms
 * @param {number} options.factor - Backoff factor
 * @param {Function} options.shouldRetry - Function to determine if retry should occur
 * @returns {Promise} - Promise resolving to function result
 */
export async function retry(fn, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const initialDelay = options.initialDelay || 1000;
    const maxDelay = options.maxDelay || 10000;
    const factor = options.factor || 2;
    const shouldRetry = options.shouldRetry || (() => true);
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt >= maxRetries || !shouldRetry(error)) {
                throw error;
            }
            
            const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);
            
            defLogger.info(`Retrying after error (attempt ${attempt + 1}/${maxRetries})`, {
                delay,
                error: error.message
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

export default {
    safeGet,
    safeCall,
    safeCallAsync,
    validateObject,
    safeMiddleware,
    safeHandler,
    retry
};
