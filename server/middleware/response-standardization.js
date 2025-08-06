/**
 * API Response Standardization Middleware
 * Ensures all API responses follow the standardized structure:
 * {
 *   "success": boolean,
 *   "message": string,
 *   "data": any,
 *   "timestamp": string,
 *   "requestId": string (optional)
 * }
 */

/**
 * Create standardized success response
 */
function createSuccessResponse(message, data = null, requestId = null) {
  const response = {
    success: true,
    message: message || 'Operation completed successfully',
    data: data,
    timestamp: new Date().toISOString()
  };
  
  if (requestId) {
    response.requestId = requestId;
  }
  
  return response;
}

/**
 * Create standardized error response
 */
function createErrorResponse(message, details = null, statusCode = 500, requestId = null) {
  const response = {
    success: false,
    message: message || 'An error occurred',
    data: null,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    response.error = details;
  }
  
  if (requestId) {
    response.requestId = requestId;
  }
  
  return response;
}

/**
 * Response standardization middleware
 */
function standardizeResponse(req, res, next) {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to standardize responses
  res.json = function(data) {
    let standardizedResponse;
    
    // Check if response is already standardized
    if (data && typeof data === 'object' && 
        typeof data.success === 'boolean' && 
        typeof data.message === 'string' && 
        data.hasOwnProperty('data') && 
        typeof data.timestamp === 'string') {
      // Already standardized
      standardizedResponse = data;
    } else {
      // Need to standardize
      if (res.statusCode >= 400) {
        // Error response
        const message = data?.error?.message || data?.message || data?.error || 'An error occurred';
        const details = data?.error || (typeof data === 'string' ? null : data);
        standardizedResponse = createErrorResponse(message, details, res.statusCode, req.id);
      } else {
        // Success response
        let message = 'Operation completed successfully';
        let responseData = data;
        
        // Handle different response formats
        if (data && typeof data === 'object') {
          if (data.message) {
            message = data.message;
            // Remove message from data to avoid duplication
            const { message: _, ...restData } = data;
            responseData = Object.keys(restData).length > 0 ? restData : null;
          }
          
          // Handle legacy formats found in QA testing
          if (data.populations) {
            message = 'Populations retrieved successfully';
            responseData = data.populations;
          } else if (data.history) {
            message = 'History retrieved successfully';
            responseData = data.history;
          } else if (data.meta) {
            // Remove meta wrapper and use its contents
            const { meta, ...restData } = data;
            responseData = Object.keys(restData).length > 0 ? restData : null;
          }
          
          // Handle success field in data
          if (data.success !== undefined) {
            const { success, ...restData } = data;
            responseData = Object.keys(restData).length > 0 ? restData : null;
          }
        }
        
        standardizedResponse = createSuccessResponse(message, responseData, req.id);
      }
    }
    
    // Call original json method with standardized response
    return originalJson.call(this, standardizedResponse);
  };
  
  // Store helper methods on response object
  res.success = function(message, data = null) {
    return this.json(createSuccessResponse(message, data, req.id));
  };
  
  res.error = function(message, details = null, statusCode = 500) {
    this.status(statusCode);
    return this.json(createErrorResponse(message, details, statusCode, req.id));
  };
  
  next();
}

/**
 * Request ID middleware (optional)
 */
function addRequestId(req, res, next) {
  req.id = req.headers['x-request-id'] || 
           `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  next();
}

module.exports = {
  standardizeResponse,
  addRequestId,
  createSuccessResponse,
  createErrorResponse
};