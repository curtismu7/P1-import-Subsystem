/**
 * Standard Response Middleware
 * 
 * Provides consistent response formats across all API endpoints
 * to improve frontend error handling and user experience.
 */

/**
 * Standard success response format
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const standardSuccessResponse = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

/**
 * Standard error response format
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @param {string} errorCode - Application-specific error code
 */
export const standardErrorResponse = (res, statusCode, message, details = {}, errorCode = null) => {
    return res.status(statusCode).json({
        success: false,
        error: message,
        errorCode,
        details,
        timestamp: new Date().toISOString()
    });
};

/**
 * HTTP Method validation middleware
 * Ensures endpoints receive the expected HTTP method
 * @param {string} expectedMethod - Expected HTTP method (GET, POST, etc.)
 * @param {string} endpointName - Name of the endpoint for logging
 */
export const validateHttpMethod = (expectedMethod, endpointName) => {
    return (req, res, next) => {
        if (req.method !== expectedMethod) {
            const requestId = req.headers['x-request-id'] || 'unknown';
            
            console.error(`[${requestId}] HTTP METHOD MISMATCH at ${endpointName}:`);
            console.error(`  Expected: ${expectedMethod}`);
            console.error(`  Received: ${req.method}`);
            console.error(`  URL: ${req.originalUrl}`);
            console.error(`  User-Agent: ${req.headers['user-agent'] || 'unknown'}`);
            console.error(`  This indicates a client-server HTTP method mismatch!`);
            
            return standardErrorResponse(res, 405, 
                `Method ${req.method} not allowed for ${endpointName}. Expected ${expectedMethod}.`,
                {
                    endpoint: endpointName,
                    expected: expectedMethod,
                    received: req.method,
                    message: 'HTTP method mismatch detected - check client-side calls'
                },
                'METHOD_NOT_ALLOWED'
            );
        }
        next();
    };
};

/**
 * Request validation middleware using Joi schemas
 * @param {Object} schema - Joi validation schema
 * @param {string} target - What to validate ('body', 'query', 'params')
 */
export const validateRequest = (schema, target = 'body') => {
    return (req, res, next) => {
        const dataToValidate = req[target];
        const { error, value } = schema.validate(dataToValidate, { 
            abortEarly: false,
            stripUnknown: true 
        });
        
        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));
            
            return standardErrorResponse(res, 400, 
                'Validation failed',
                { validationErrors: details },
                'VALIDATION_ERROR'
            );
        }
        
        // Replace the original data with the validated/sanitized version
        req[target] = value;
        next();
    };
};

/**
 * Rate limiting error response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const rateLimitErrorResponse = (req, res) => {
    return standardErrorResponse(res, 429,
        'Too many requests, please try again later',
        {
            retryAfter: req.rateLimit?.resetTime || 'unknown',
            limit: req.rateLimit?.limit || 'unknown',
            remaining: req.rateLimit?.remaining || 0
        },
        'RATE_LIMIT_EXCEEDED'
    );
};

/**
 * Async error handler wrapper
 * Catches async errors and passes them to Express error handler
 * @param {Function} fn - Async route handler function
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Global error handler middleware
 * Should be used as the last middleware in the app
 */
export const globalErrorHandler = (err, req, res, next) => {
    // Log the error
    console.error('Global error handler:', err);
    
    // Don't send error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Default error response
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal server error';
    let details = {};
    let errorCode = err.code || 'INTERNAL_ERROR';
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
        errorCode = 'VALIDATION_ERROR';
        details = { validationErrors: err.details };
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized';
        errorCode = 'UNAUTHORIZED';
    } else if (err.name === 'ForbiddenError') {
        statusCode = 403;
        message = 'Forbidden';
        errorCode = 'FORBIDDEN';
    } else if (err.name === 'NotFoundError') {
        statusCode = 404;
        message = 'Not found';
        errorCode = 'NOT_FOUND';
    }
    
    // Add stack trace in development
    if (isDevelopment) {
        details.stack = err.stack;
        details.originalError = err.toString();
    }
    
    return standardErrorResponse(res, statusCode, message, details, errorCode);
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req, res) => {
    return standardErrorResponse(res, 404,
        `Route ${req.method} ${req.originalUrl} not found`,
        {
            method: req.method,
            url: req.originalUrl,
            availableRoutes: 'Check API documentation for available endpoints'
        },
        'ROUTE_NOT_FOUND'
    );
};

export default {
    standardSuccessResponse,
    standardErrorResponse,
    validateHttpMethod,
    validateRequest,
    rateLimitErrorResponse,
    asyncHandler,
    globalErrorHandler,
    notFoundHandler
};