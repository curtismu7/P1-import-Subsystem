/**
 * Centralized Debug Utilities
 * 
 * Provides comprehensive debugging support across the entire application.
 * Features include conditional logging, performance monitoring, error tracking,
 * and development helpers.
 * 
 * Usage:
 *   import { debugLog, perfMonitor, errorTracker } from './debug-utils.js';
 *   
 *   debugLog.info('Operation started', { userId: 123 });
 *   const timer = perfMonitor.start('api-call');
 *   // ... operation
 *   timer.end();
 */

import { createWinstonLogger } from '../server/services/winston-config.js';

// Debug levels
export const DEBUG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// Debug categories for filtering
export const DEBUG_CATEGORIES = {
  API: 'api',
  AUTH: 'auth',
  DATABASE: 'database',
  UI: 'ui',
  WEBSOCKET: 'websocket',
  IMPORT: 'import',
  EXPORT: 'export',
  VALIDATION: 'validation',
  PERFORMANCE: 'performance',
  SECURITY: 'security'
};

class DebugUtils {
  constructor() {
    this.isDebugMode = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
    this.debugLevel = this.parseDebugLevel(process.env.DEBUG_LEVEL || 'INFO');
    this.enabledCategories = this.parseDebugCategories(process.env.DEBUG_CATEGORIES || 'all');
    
    this.logger = createWinstonLogger({
      service: 'debug-utils',
      env: process.env.NODE_ENV || 'development'
    });
    
    this.performanceTimers = new Map();
    this.errorCounts = new Map();
    this.operationCounts = new Map();
    
    this.init();
  }
  
  init() {
    if (this.isDebugMode) {
      this.logger.info('🐛 Debug mode enabled', {
        level: Object.keys(DEBUG_LEVELS)[this.debugLevel],
        categories: this.enabledCategories,
        environment: process.env.NODE_ENV
      });
    }
  }
  
  parseDebugLevel(level) {
    const upperLevel = level.toUpperCase();
    return DEBUG_LEVELS[upperLevel] !== undefined ? DEBUG_LEVELS[upperLevel] : DEBUG_LEVELS.INFO;
  }
  
  parseDebugCategories(categories) {
    if (categories === 'all') {
      return Object.values(DEBUG_CATEGORIES);
    }
    return categories.split(',').map(cat => cat.trim().toLowerCase());
  }
  
  shouldLog(level, category) {
    if (!this.isDebugMode) return false;
    if (level > this.debugLevel) return false;
    if (category && !this.enabledCategories.includes('all') && !this.enabledCategories.includes(category)) {
      return false;
    }
    return true;
  }
  
  /**
   * Enhanced logging with context and correlation
   */
  log(level, message, data = {}, category = null) {
    if (!this.shouldLog(level, category)) return;
    
    const logData = {
      timestamp: new Date().toISOString(),
      category,
      correlationId: data.correlationId || this.generateCorrelationId(),
      ...data
    };
    
    const levelName = Object.keys(DEBUG_LEVELS)[level];
    const categoryPrefix = category ? `[${category.toUpperCase()}]` : '';
    const formattedMessage = `${categoryPrefix} ${message}`;
    
    switch (level) {
      case DEBUG_LEVELS.ERROR:
        this.logger.error(formattedMessage, logData);
        break;
      case DEBUG_LEVELS.WARN:
        this.logger.warn(formattedMessage, logData);
        break;
      case DEBUG_LEVELS.INFO:
        this.logger.info(formattedMessage, logData);
        break;
      case DEBUG_LEVELS.DEBUG:
        this.logger.debug(formattedMessage, logData);
        break;
      case DEBUG_LEVELS.TRACE:
        this.logger.debug(`[TRACE] ${formattedMessage}`, logData);
        break;
      default:
        this.logger.info(formattedMessage, logData);
    }
  }
  
  /**
   * Convenience methods for different log levels
   */
  error(message, data = {}, category = null) {
    this.log(DEBUG_LEVELS.ERROR, message, data, category);
    this.trackError(message, data, category);
  }
  
  warn(message, data = {}, category = null) {
    this.log(DEBUG_LEVELS.WARN, message, data, category);
  }
  
  info(message, data = {}, category = null) {
    this.log(DEBUG_LEVELS.INFO, message, data, category);
  }
  
  debug(message, data = {}, category = null) {
    this.log(DEBUG_LEVELS.DEBUG, message, data, category);
  }
  
  trace(message, data = {}, category = null) {
    this.log(DEBUG_LEVELS.TRACE, message, data, category);
  }
  
  /**
   * Performance monitoring utilities
   */
  startTimer(operationName, category = DEBUG_CATEGORIES.PERFORMANCE) {
    const timerId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = process.hrtime.bigint();
    
    this.performanceTimers.set(timerId, {
      operationName,
      category,
      startTime,
      startTimestamp: new Date().toISOString()
    });
    
    this.debug(`Performance timer started: ${operationName}`, { timerId }, category);
    
    return {
      id: timerId,
      end: () => this.endTimer(timerId)
    };
  }
  
  endTimer(timerId) {
    const timer = this.performanceTimers.get(timerId);
    if (!timer) {
      this.warn(`Timer not found: ${timerId}`, {}, DEBUG_CATEGORIES.PERFORMANCE);
      return null;
    }
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - timer.startTime) / 1000000; // Convert to milliseconds
    
    this.performanceTimers.delete(timerId);
    
    const performanceData = {
      operationName: timer.operationName,
      duration: `${duration.toFixed(2)}ms`,
      durationMs: duration,
      startTime: timer.startTimestamp,
      endTime: new Date().toISOString()
    };
    
    this.info(`Performance: ${timer.operationName} completed`, performanceData, timer.category);
    
    // Track operation counts
    const opCount = this.operationCounts.get(timer.operationName) || 0;
    this.operationCounts.set(timer.operationName, opCount + 1);
    
    return performanceData;
  }
  
  /**
   * Error tracking utilities
   */
  trackError(message, data = {}, category = null) {
    const errorKey = `${category || 'unknown'}:${message}`;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);
    
    if (count > 0 && count % 5 === 0) {
      this.warn(`Repeated error detected (${count + 1} times)`, {
        errorMessage: message,
        category,
        data
      }, DEBUG_CATEGORIES.SECURITY);
    }
  }
  
  /**
   * Memory usage monitoring
   */
  logMemoryUsage(context = 'general') {
    if (!this.shouldLog(DEBUG_LEVELS.DEBUG, DEBUG_CATEGORIES.PERFORMANCE)) return;
    
    const memUsage = process.memoryUsage();
    const formatBytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)}MB`;
    
    this.debug(`Memory usage - ${context}`, {
      rss: formatBytes(memUsage.rss),
      heapTotal: formatBytes(memUsage.heapTotal),
      heapUsed: formatBytes(memUsage.heapUsed),
      external: formatBytes(memUsage.external),
      heapUsedPercent: `${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2)}%`
    }, DEBUG_CATEGORIES.PERFORMANCE);
  }
  
  /**
   * Request/Response logging for APIs
   */
  logApiRequest(req, correlationId = null) {
    const id = correlationId || this.generateCorrelationId();
    
    this.info('API Request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      correlationId: id,
      headers: this.sanitizeHeaders(req.headers),
      query: req.query,
      body: this.sanitizeBody(req.body)
    }, DEBUG_CATEGORIES.API);
    
    return id;
  }
  
  logApiResponse(req, res, correlationId, duration = null) {
    this.info('API Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      correlationId,
      duration: duration ? `${duration}ms` : null,
      responseSize: res.get('content-length') || 'unknown'
    }, DEBUG_CATEGORIES.API);
  }
  
  /**
   * Database operation logging
   */
  logDatabaseOperation(operation, collection, query = {}, result = null) {
    this.debug(`Database ${operation}`, {
      collection,
      query: this.sanitizeQuery(query),
      resultCount: result?.length || (result ? 1 : 0),
      hasResult: !!result
    }, DEBUG_CATEGORIES.DATABASE);
  }
  
  /**
   * WebSocket event logging
   */
  logWebSocketEvent(event, data = {}, socketId = null) {
    this.debug(`WebSocket event: ${event}`, {
      socketId,
      eventData: this.sanitizeData(data),
      timestamp: new Date().toISOString()
    }, DEBUG_CATEGORIES.WEBSOCKET);
  }
  
  /**
   * Utility methods
   */
  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
  
  sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'secret', 'token', 'apiKey', 'clientSecret'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
  
  sanitizeQuery(query) {
    return this.sanitizeBody(query);
  }
  
  sanitizeData(data) {
    return this.sanitizeBody(data);
  }
  
  /**
   * Get debug statistics
   */
  getStats() {
    return {
      errorCounts: Object.fromEntries(this.errorCounts),
      operationCounts: Object.fromEntries(this.operationCounts),
      activeTimers: this.performanceTimers.size,
      debugMode: this.isDebugMode,
      debugLevel: Object.keys(DEBUG_LEVELS)[this.debugLevel],
      enabledCategories: this.enabledCategories
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.errorCounts.clear();
    this.operationCounts.clear();
    this.performanceTimers.clear();
    this.info('Debug statistics reset');
  }
}

// Create singleton instance
const debugUtils = new DebugUtils();

// Export convenience methods
export const debugLog = {
  error: (msg, data, cat) => debugUtils.error(msg, data, cat),
  warn: (msg, data, cat) => debugUtils.warn(msg, data, cat),
  info: (msg, data, cat) => debugUtils.info(msg, data, cat),
  debug: (msg, data, cat) => debugUtils.debug(msg, data, cat),
  trace: (msg, data, cat) => debugUtils.trace(msg, data, cat)
};

export const perfMonitor = {
  start: (name, cat) => debugUtils.startTimer(name, cat),
  memory: (ctx) => debugUtils.logMemoryUsage(ctx)
};

export const apiLogger = {
  request: (req, id) => debugUtils.logApiRequest(req, id),
  response: (req, res, id, dur) => debugUtils.logApiResponse(req, res, id, dur)
};

export const dbLogger = {
  operation: (op, col, query, result) => debugUtils.logDatabaseOperation(op, col, query, result)
};

export const wsLogger = {
  event: (event, data, id) => debugUtils.logWebSocketEvent(event, data, id)
};

export const errorTracker = {
  track: (msg, data, cat) => debugUtils.trackError(msg, data, cat),
  stats: () => debugUtils.getStats(),
  reset: () => debugUtils.resetStats()
};

export default debugUtils;