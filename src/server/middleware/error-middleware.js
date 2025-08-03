/**
 * Enhanced Error Handling Middleware
 * 
 * Provides comprehensive error handling for Express applications with:
 * - Structured error responses
 * - Error logging and tracking
 * - Security-aware error messages
 * - Performance monitoring
 * - Error recovery strategies
 */

import { debugLog, errorTracker, DEBUG_CATEGORIES } from '../../shared/debug-utils.js';
import configManager from '../../shared/config-manager.js';

// Error types for classification
export const ERROR_TYPES = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NOT_FOUND: 'not_found',
  RATE_LIMIT: 'rate_limit',
  TIMEOUT: 'timeout',
  DATABASE: 'database',
  EXTERNAL_API: 'external_api',
  FILE_UPLOAD: 'file_upload',
  BUSINESS_LOGIC: 'business_logic',
  SYSTEM: 'system',
  UNKNOWN: 'unknown'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Custom error class with enhanced properties
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, type = ERROR_TYPES.UNKNOWN, severity = ERROR_SEVERITY.MEDIUM) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.type = type;
    this.severity = severity;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create specific error types
 */
export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, ERROR_TYPES.VALIDATION, ERROR_SEVERITY.LOW);
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, ERROR_TYPES.AUTHENTICATION, ERROR_SEVERITY.HIGH);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, ERROR_TYPES.AUTHORIZATION, ERROR_SEVERITY.HIGH);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, ERROR_TYPES.NOT_FOUND, ERROR_SEVERITY.LOW);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, ERROR_TYPES.RATE_LIMIT, ERROR_SEVERITY.MEDIUM);
  }
}

export class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, ERROR_TYPES.DATABASE, ERROR_SEVERITY.HIGH);
    this.originalError = originalError;
  }
}

export class ExternalApiError extends AppError {
  constructor(message, statusCode = 502, service = 'external') {
    super(message, statusCode, ERROR_TYPES.EXTERNAL_API, ERROR_SEVERITY.MEDIUM);
    this.service = service;
  }
}

/**
 * Error classification utility
 */
function classifyError(error) {
  // Check if it's already classified
  if (error.type && error.severity) {
    return { type: error.type, severity: error.severity };
  }
  
  // Classify by status code
  if (error.statusCode || error.status) {
    const code = error.statusCode || error.status;
    
    if (code === 400) return { type: ERROR_TYPES.VALIDATION, severity: ERROR_SEVERITY.LOW };
    if (code === 401) return { type: ERROR_TYPES.AUTHENTICATION, severity: ERROR_SEVERITY.HIGH };
    if (code === 403) return { type: ERROR_TYPES.AUTHORIZATION, severity: ERROR_SEVERITY.HIGH };
    if (code === 404) return { type: ERROR_TYPES.NOT_FOUND, severity: ERROR_SEVERITY.LOW };
    if (code === 429) return { type: ERROR_TYPES.RATE_LIMIT, severity: ERROR_SEVERITY.MEDIUM };
    if (code >= 500) return { type: ERROR_TYPES.SYSTEM, severity: ERROR_SEVERITY.HIGH };
  }
  
  // Classify by error message patterns
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('timeout')) {
    return { type: ERROR_TYPES.TIMEOUT, severity: ERROR_SEVERITY.MEDIUM };
  }
  if (message.includes('database') || message.includes('connection')) {
    return { type: ERROR_TYPES.DATABASE, severity: ERROR_SEVERITY.HIGH };
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return { type: ERROR_TYPES.VALIDATION, severity: ERROR_SEVERITY.LOW };
  }
  if (message.includes('unauthorized') || message.includes('token')) {
    return { type: ERROR_TYPES.AUTHENTICATION, severity: ERROR_SEVERITY.HIGH };
  }
  
  return { type: ERROR_TYPES.UNKNOWN, severity: ERROR_SEVERITY.MEDIUM };
}

/**
 * Generate user-friendly error message
 */
function getUserFriendlyMessage(error, type) {
  const isProduction = configManager.get('server.environment') === 'production';
  
  // Return specific message for known error types
  switch (type) {
    case ERROR_TYPES.VALIDATION:
      return error.message || 'Invalid input provided';
    case ERROR_TYPES.AUTHENTICATION:
      return 'Authentication required. Please log in.';
    case ERROR_TYPES.AUTHORIZATION:
      return 'You do not have permission to perform this action';
    case ERROR_TYPES.NOT_FOUND:
      return error.message || 'The requested resource was not found';
    case ERROR_TYPES.RATE_LIMIT:
      return 'Too many requests. Please try again later.';
    case ERROR_TYPES.TIMEOUT:
      return 'The request timed out. Please try again.';
    case ERROR_TYPES.FILE_UPLOAD:
      return error.message || 'File upload failed';
    case ERROR_TYPES.EXTERNAL_API:
      return 'External service is currently unavailable';
    case ERROR_TYPES.DATABASE:
      return isProduction ? 'Database operation failed' : error.message;
    case ERROR_TYPES.SYSTEM:
      return isProduction ? 'An internal server error occurred' : error.message;
    default:
      return isProduction ? 'An unexpected error occurred' : error.message;
  }
}

/**
 * Generate error response object
 */
function createErrorResponse(error, req, correlationId) {
  const { type, severity } = classifyError(error);
  const statusCode = error.statusCode || error.status || 500;
  const isProduction = configManager.get('server.environment') === 'production';
  
  const response = {
    success: false,
    error: {
      message: getUserFriendlyMessage(error, type),
      type,
      code: error.code || `${type.toUpperCase()}_ERROR`,
      timestamp: new Date().toISOString(),
      correlationId
    }
  };
  
  // Add additional details in non-production environments
  if (!isProduction) {
    response.error.details = {
      originalMessage: error.message,
      stack: error.stack,
      severity
    };
    
    if (error.details) {
      response.error.validationDetails = error.details;
    }
  }
  
  // Add request context for debugging
  if (configManager.get('debug.enableDebugMode')) {
    response.debug = {
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      ip: req.ip
    };
  }
  
  return { response, statusCode, type, severity };
}

/**
 * Log error with appropriate level and context
 */
function logError(error, req, correlationId, type, severity) {
  const logData = {
    correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    statusCode: error.statusCode || error.status || 500,
    type,
    severity,
    stack: error.stack,
    timestamp: new Date().toISOString()
  };
  
  // Log with appropriate level based on severity
  switch (severity) {
    case ERROR_SEVERITY.CRITICAL:
      debugLog.error(`CRITICAL ERROR: ${error.message}`, logData, DEBUG_CATEGORIES.API);
      break;
    case ERROR_SEVERITY.HIGH:
      debugLog.error(`HIGH SEVERITY ERROR: ${error.message}`, logData, DEBUG_CATEGORIES.API);
      break;
    case ERROR_SEVERITY.MEDIUM:
      debugLog.warn(`MEDIUM SEVERITY ERROR: ${error.message}`, logData, DEBUG_CATEGORIES.API);
      break;
    case ERROR_SEVERITY.LOW:
      debugLog.info(`LOW SEVERITY ERROR: ${error.message}`, logData, DEBUG_CATEGORIES.API);
      break;
    default:
      debugLog.error(`UNKNOWN SEVERITY ERROR: ${error.message}`, logData, DEBUG_CATEGORIES.API);
  }
  

  errorTracker.track(error.message, logData, DEBUG_CATEGORIES.API);
}

/**
 * Main error handling middleware
 */
export function errorHandler(error, req, res, next) {
  // Generate correlation ID if not present
  const correlationId = req.correlationId || `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Create structured error response
    const { response, statusCode, type, severity } = createErrorResponse(error, req, correlationId);
    
    // Log the error
    logError(error, req, correlationId, type, severity);
    
    // Set security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });
    
    // Send error response
    res.status(statusCode).json(response);
    
  } catch (handlingError) {
    // Fallback error handling
    debugLog.error('Error in error handler', {
      originalError: error.message,
      handlingError: handlingError.message,
      correlationId
    }, DEBUG_CATEGORIES.API);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'An unexpected error occurred',
        type: ERROR_TYPES.SYSTEM,
        code: 'ERROR_HANDLER_FAILURE',
        timestamp: new Date().toISOString(),
        correlationId
      }
    });
  }
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Route ${req.method} ${req.url}`);
  next(error);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error helper
 */
export function createValidationError(message, details = {}) {
  return new ValidationError(message, details);
}

/**
 * Request timeout handler
 */
export function timeoutHandler(timeout = 30000) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      const error = new AppError(
        `Request timeout after ${timeout}ms`,
        408,
        ERROR_TYPES.TIMEOUT,
        ERROR_SEVERITY.MEDIUM
      );
      next(error);
    }, timeout);
    
    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    
    next();
  };
}

/**
 * Rate limiting error handler
 */
export function rateLimitHandler(req, res, next) {
  const error = new RateLimitError('Too many requests from this IP');
  next(error);
}

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  timeoutHandler,
  rateLimitHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  DatabaseError,
  ExternalApiError,
  createValidationError,
  ERROR_TYPES,
  ERROR_SEVERITY
};