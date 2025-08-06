/**
 * Standardized API Response Utilities
 * 
 * Provides consistent response formatting across all API endpoints
 * to improve frontend error handling and debugging capabilities.
 */

/**
 * Standardized API Response Class
 * 
 * Creates consistent response objects for all API endpoints with
 * proper error handling, metadata, and success indicators.
 */
export class APIResponse {
  /**
   * Create a successful response
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {Object} meta - Additional metadata
   * @returns {Object} Standardized success response
   */
  static success(data, message = 'Success', meta = {}) {
    return {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        ...meta
      }
    };
  }

  /**
   * Create an error response
   * @param {string} error - Error message
   * @param {string} code - Error code
   * @param {Object} details - Additional error details
   * @returns {Object} Standardized error response
   */
  static error(error, code = 'GENERIC_ERROR', details = {}) {
    return {
      success: false,
      error: {
        message: error,
        code,
        details,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Create a paginated response
   * @param {Array} data - Response data array
   * @param {Object} pagination - Pagination info
   * @param {string} message - Success message
   * @returns {Object} Standardized paginated response
   */
  static paginated(data, pagination, message = 'Success') {
    return this.success(data, message, { pagination });
  }

  /**
   * Create a validation error response
   * @param {Array} errors - Validation errors
   * @returns {Object} Standardized validation error response
   */
  static validationError(errors) {
    return this.error(
      'Validation failed',
      'VALIDATION_ERROR',
      { validationErrors: errors }
    );
  }

  /**
   * Create an unauthorized response
   * @param {string} message - Custom unauthorized message
   * @returns {Object} Standardized unauthorized response
   */
  static unauthorized(message = 'Unauthorized access') {
    return this.error(message, 'UNAUTHORIZED');
  }

  /**
   * Create a not found response
   * @param {string} resource - Resource that was not found
   * @returns {Object} Standardized not found response
   */
  static notFound(resource = 'Resource') {
    return this.error(`${resource} not found`, 'NOT_FOUND');
  }

  /**
   * Create a rate limit exceeded response
   * @param {number} retryAfter - Seconds to wait before retry
   * @returns {Object} Standardized rate limit response
   */
  static rateLimitExceeded(retryAfter = 60) {
    return this.error(
      'Rate limit exceeded',
      'RATE_LIMIT_EXCEEDED',
      { retryAfter }
    );
  }
}

/**
 * Express middleware to wrap responses in standard format
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function responseWrapper(req, res, next) {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to ensure consistent format
  res.json = function(data) {
    // If data is already in standard format, use as-is
    if (data && typeof data === 'object' && 'success' in data) {
      return originalJson.call(this, data);
    }
    
    // Wrap data in standard success format
    return originalJson.call(this, APIResponse.success(data));
  };
  
  // Add helper methods to response object
  res.success = (data, message, meta) => {
    return res.json(APIResponse.success(data, message, meta));
  };
  
  res.error = (error, code, details, statusCode = 500) => {
    return res.status(statusCode).json(APIResponse.error(error, code, details));
  };
  
  res.validationError = (errors) => {
    return res.status(400).json(APIResponse.validationError(errors));
  };
  
  res.unauthorized = (message) => {
    return res.status(401).json(APIResponse.unauthorized(message));
  };
  
  res.notFound = (resource) => {
    return res.status(404).json(APIResponse.notFound(resource));
  };
  
  res.rateLimitExceeded = (retryAfter) => {
    return res.status(429).json(APIResponse.rateLimitExceeded(retryAfter));
  };
  
  next();
}

export default APIResponse;