/**
 * Centralized Error Handling Middleware
 * 
 * Provides comprehensive error handling with logging, monitoring,
 * and standardized error responses.
 */

import { v4 as uuidv4 } from 'uuid';
import { APIResponse } from '../utils/api-response.js';

/**
 * Generate unique error ID for tracking
 * @returns {string} Unique error identifier
 */
function generateErrorId() {
  return `err_${Date.now()}_${uuidv4().slice(0, 8)}`;
}

/**
 * Determine if error should be logged as critical
 * @param {Error} error - Error object
 * @returns {boolean} True if critical error
 */
function isCriticalError(error) {
  const criticalPatterns = [
    /database/i,
    /connection/i,
    /timeout/i,
    /memory/i,
    /disk/i,
    /pingone.*api/i
  ];
  
  return criticalPatterns.some(pattern => 
    pattern.test(error.message) || pattern.test(error.name)
  );
}

/**
 * Sanitize error details for client response
 * @param {Error} error - Error object
 * @param {boolean} isDevelopment - Development environment flag
 * @returns {Object} Sanitized error details
 */
function sanitizeErrorDetails(error, isDevelopment = false) {
  const details = {
    name: error.name,
    timestamp: new Date().toISOString()
  };
  
  // Include stack trace only in development
  if (isDevelopment) {
    details.stack = error.stack;
    details.originalMessage = error.message;
  }
  
  // Include safe error properties
  if (error.code) details.code = error.code;
  if (error.statusCode) details.statusCode = error.statusCode;
  if (error.details) details.details = error.details;
  
  return details;
}

/**
 * Main error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function errorHandler(err, req, res, next) {
  const errorId = generateErrorId();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const logger = req.app.get('logger') || console;
  
  // Log error with full context
  const logData = {
    errorId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    user: req.user ? { id: req.user.id, email: req.user.email } : null,
    timestamp: new Date().toISOString()
  };
  
  // Log at appropriate level
  if (isCriticalError(err)) {
    logger.error('Critical application error', logData);
  } else {
    logger.warn('Application error', logData);
  }
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.validationError(err.details || [{ field: 'unknown', message: err.message }]);
  }
  
  if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    return res.unauthorized(err.message || 'Authentication required');
  }
  
  if (err.name === 'ForbiddenError' || err.statusCode === 403) {
    return res.error('Access forbidden', 'FORBIDDEN', sanitizeErrorDetails(err, isDevelopment), 403);
  }
  
  if (err.name === 'NotFoundError' || err.statusCode === 404) {
    return res.notFound(err.resource || 'Resource');
  }
  
  if (err.name === 'ConflictError' || err.statusCode === 409) {
    return res.error(err.message || 'Resource conflict', 'CONFLICT', sanitizeErrorDetails(err, isDevelopment), 409);
  }
  
  if (err.name === 'TooManyRequestsError' || err.statusCode === 429) {
    return res.rateLimitExceeded(err.retryAfter || 60);
  }
  
  // Handle Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.error('File too large', 'FILE_TOO_LARGE', { maxSize: err.limit, field: err.field }, 413);
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.error('Unexpected file field', 'UNEXPECTED_FILE', { field: err.field }, 400);
  }
  
  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.error('Invalid JSON in request body', 'INVALID_JSON', sanitizeErrorDetails(err, isDevelopment), 400);
  }
  
  // Handle database errors
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    return res.error('Database operation failed', 'DATABASE_ERROR', { errorId, ...sanitizeErrorDetails(err, isDevelopment) }, 500);
  }
  
  // Handle network/API errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
    return res.error('External service unavailable', 'SERVICE_UNAVAILABLE', { errorId, service: err.hostname || 'unknown' }, 503);
  }
  
  // Generic server error
  const statusCode = err.statusCode || err.status || 500;
  const message = isDevelopment ? err.message : 'Internal server error';
  
  return res.error(message, 'INTERNAL_ERROR', { errorId, ...sanitizeErrorDetails(err, isDevelopment) }, statusCode);
}

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.url}`);
  error.statusCode = 404;
  error.name = 'NotFoundError';
  next(error);
}

/**
 * Async error wrapper for route handlers
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped route handler
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create custom error classes
 */
export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    this.statusCode = 400;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

export class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

export class TooManyRequestsError extends Error {
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message);
    this.name = 'TooManyRequestsError';
    this.statusCode = 429;
    this.retryAfter = retryAfter;
  }
}

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError
};