/**
 * Request Correlation Middleware
 * 
 * Adds correlation IDs to all requests for better traceability across
 * the application. This helps with debugging, monitoring, and log analysis.
 * 
 * Features:
 * - Automatic correlation ID generation
 * - Header-based correlation ID propagation
 * - Request/response logging with correlation
 * - Performance monitoring integration
 */

import { debugLog, perfMonitor, apiLogger, DEBUG_CATEGORIES } from '../../shared/debug-utils.js';
import configManager from '../../shared/config-manager.js';

/**
 * Generate a unique correlation ID
 */
function generateCorrelationId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `req-${timestamp}-${random}`;
}

/**
 * Extract correlation ID from request headers
 */
function extractCorrelationId(req) {
  // Check various header formats
  const headers = [
    'x-correlation-id',
    'x-request-id',
    'x-trace-id',
    'correlation-id',
    'request-id'
  ];
  
  for (const header of headers) {
    const value = req.get(header);
    if (value && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  
  return null;
}

/**
 * Validate correlation ID format
 */
function isValidCorrelationId(id) {
  if (!id || typeof id !== 'string') return false;
  
  // Allow alphanumeric, hyphens, and underscores, 8-64 characters
  const pattern = /^[a-zA-Z0-9_-]{8,64}$/;
  return pattern.test(id);
}

/**
 * Main correlation middleware
 */
export function correlationMiddleware(req, res, next) {
  const startTime = process.hrtime.bigint();
  
  // Extract or generate correlation ID
  let correlationId = extractCorrelationId(req);
  
  if (!correlationId || !isValidCorrelationId(correlationId)) {
    correlationId = generateCorrelationId();
  }
  
  // Attach correlation ID to request
  req.correlationId = correlationId;
  
  // Set response header
  res.set('X-Correlation-ID', correlationId);
  
  // Log request with correlation ID
  if (configManager.get('debug.enableDebugMode')) {
    apiLogger.request(req, correlationId);
  }
  
  // Start performance timer
  const perfTimer = perfMonitor.start(`${req.method} ${req.route?.path || req.path}`, DEBUG_CATEGORIES.PERFORMANCE);
  
  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // End performance timer
    perfTimer.end();
    
    // Log response with correlation ID
    if (configManager.get('debug.enableDebugMode')) {
      apiLogger.response(req, res, correlationId, duration);
    }
    
    // Log performance metrics
    debugLog.debug('Request completed', {
      correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      contentLength: res.get('content-length') || 'unknown'
    }, DEBUG_CATEGORIES.PERFORMANCE);
    
    // Call original end method
    originalEnd.call(res, chunk, encoding);
  };
  
  // Add correlation context to request for use in other middleware/routes
  req.getCorrelationContext = () => ({
    correlationId,
    startTime: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip
  });
  
  next();
}

/**
 * Enhanced logging middleware that uses correlation ID
 */
export function enhancedLoggingMiddleware(req, res, next) {
  const context = req.getCorrelationContext?.() || {};
  
  // Log request details
  debugLog.info('Incoming request', {
    ...context,
    headers: sanitizeHeaders(req.headers),
    query: req.query,
    body: sanitizeBody(req.body)
  }, DEBUG_CATEGORIES.API);
  
  // Monitor memory usage for long-running requests
  const memoryCheckInterval = setInterval(() => {
    perfMonitor.memory(`request-${context.correlationId}`);
  }, 5000);
  
  // Clear interval when request completes
  res.on('finish', () => {
    clearInterval(memoryCheckInterval);
  });
  
  res.on('close', () => {
    clearInterval(memoryCheckInterval);
  });
  
  next();
}

/**
 * Security middleware that logs suspicious activity
 */
export function securityLoggingMiddleware(req, res, next) {
  const context = req.getCorrelationContext?.() || {};
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//,  // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript injection
    /eval\(/i, // Code injection
    /exec\(/i  // Command injection
  ];
  
  const checkString = `${req.url} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;
  
  const suspiciousActivity = suspiciousPatterns.some(pattern => pattern.test(checkString));
  
  if (suspiciousActivity) {
    debugLog.warn('Suspicious request detected', {
      ...context,
      suspiciousContent: checkString.substring(0, 500), // Limit length
      userAgent: req.get('user-agent'),
      referer: req.get('referer')
    }, DEBUG_CATEGORIES.SECURITY);
  }
  
  // Log failed authentication attempts
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      debugLog.warn('Authentication/Authorization failure', {
        ...context,
        statusCode: res.statusCode,
        authHeader: req.get('authorization') ? '[PRESENT]' : '[MISSING]'
      }, DEBUG_CATEGORIES.SECURITY);
    }
  });
  
  next();
}

/**
 * Utility functions
 */
function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-access-token'
  ];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'secret',
    'token',
    'apiKey',
    'clientSecret',
    'apiSecret'
  ];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Middleware to add correlation ID to WebSocket connections
 */
export function websocketCorrelationMiddleware(socket, next) {
  const correlationId = socket.handshake.headers['x-correlation-id'] || generateCorrelationId();
  
  socket.correlationId = correlationId;
  socket.emit('correlation-id', correlationId);
  
  debugLog.debug('WebSocket connection established', {
    correlationId,
    socketId: socket.id,
    userAgent: socket.handshake.headers['user-agent'],
    ip: socket.handshake.address
  }, DEBUG_CATEGORIES.WEBSOCKET);
  
  next();
}

export default {
  correlationMiddleware,
  enhancedLoggingMiddleware,
  securityLoggingMiddleware,
  websocketCorrelationMiddleware,
  generateCorrelationId
};