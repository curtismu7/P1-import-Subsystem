// File: server/sse-logger.js
// Description: Dedicated SSE (Server-Sent Events) logger with structured events,
// comprehensive tracking, and performance metrics collection
// 
// This module provides enhanced logging specifically for SSE operations including:
// - Connection lifecycle tracking (connect, disconnect, reconnect)
// - Performance metrics collection
// - Error recovery mechanisms
// - Structured event logging with context
// - Separate transports for events and errors
// 
// Supports both development and production environments with appropriate
// logging levels and file rotation.

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SSE Metrics Collection
const sseMetrics = {
    connections: {
        active: 0,
        total: 0,
        dropped: 0,
        errors: 0,
        reconnects: 0
    },
    events: {
        progress: 0,
        completion: 0,
        error: 0,
        keepalive: 0
    },
    performance: {
        avgResponseTime: 0,
        maxResponseTime: 0,
        errorRate: 0,
        totalProcessingTime: 0
    },
    sessions: new Map() // Track individual session metrics
};

/**
 * Generate unique connection ID for tracking
 * @returns {string} Unique connection identifier
 */
function generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current SSE metrics
 * @returns {Object} Current metrics state
 */
function getSSEMetrics() {
    const totalConnections = sseMetrics.connections.total;
    const errorRate = totalConnections > 0 ? 
        (sseMetrics.connections.errors / totalConnections * 100).toFixed(2) : 0;
    
    return {
        ...sseMetrics,
        performance: {
            ...sseMetrics.performance,
            errorRate: parseFloat(errorRate)
        }
    };
}

/**
 * Update SSE metrics
 * @param {string} type - Metric type to update
 * @param {string} sessionId - Session identifier
 * @param {Object} data - Additional data for metrics
 */
function updateSSEMetrics(type, sessionId, data = {}) {
    const timestamp = Date.now();
    
    switch (type) {
        case 'connect':
            sseMetrics.connections.active++;
            sseMetrics.connections.total++;
            sseMetrics.sessions.set(sessionId, {
                startTime: timestamp,
                events: 0,
                errors: 0,
                lastActivity: timestamp
            });
            break;
            
        case 'disconnect':
            sseMetrics.connections.active = Math.max(0, sseMetrics.connections.active - 1);
            sseMetrics.connections.dropped++;
            sseMetrics.sessions.delete(sessionId);
            break;
            
        case 'error':
            sseMetrics.connections.errors++;
            if (sseMetrics.sessions.has(sessionId)) {
                const session = sseMetrics.sessions.get(sessionId);
                session.errors++;
                session.lastActivity = timestamp;
            }
            break;
            
        case 'reconnect':
            sseMetrics.connections.reconnects++;
            break;
            
        case 'progress':
            sseMetrics.events.progress++;
            if (sseMetrics.sessions.has(sessionId)) {
                const session = sseMetrics.sessions.get(sessionId);
                session.events++;
                session.lastActivity = timestamp;
            }
            break;
            
        case 'completion':
            sseMetrics.events.completion++;
            break;
            
        case 'keepalive':
            sseMetrics.events.keepalive++;
            break;
    }
    
    // Update performance metrics
    if (data.duration) {
        sseMetrics.performance.totalProcessingTime += data.duration;
        sseMetrics.performance.maxResponseTime = Math.max(sseMetrics.performance.maxResponseTime, data.duration);
        
        const totalEvents = sseMetrics.events.progress + sseMetrics.events.completion;
        if (totalEvents > 0) {
            sseMetrics.performance.avgResponseTime = sseMetrics.performance.totalProcessingTime / totalEvents;
        }
    }
}

/**
 * Create dedicated SSE logger with structured events
 */
const sseLogger = winston.createLogger({
    level: process.env.SSE_LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json({
            replacer: (key, value) => {
                // Handle circular references and large objects
                if (value instanceof Error) {
                    return {
                        message: value.message,
                        stack: value.stack,
                        code: value.code
                    };
                }
                // Limit large objects for logging
                if (typeof value === 'object' && value !== null) {
                    const keys = Object.keys(value);
                    if (keys.length > 20) {
                        return { 
                            _truncated: true, 
                            keys: keys.slice(0, 20),
                            message: 'Object truncated for logging'
                        };
                    }
                }
                return value;
            }
        })
    ),
    defaultMeta: { 
        service: 'pingone-import-sse',
        component: 'stream-manager',
        env: process.env.NODE_ENV || 'development',
        pid: process.pid
    },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, eventType, sessionId, ...meta }) => {
                    const metaString = Object.keys(meta).length ? 
                        `\n${JSON.stringify(meta, null, 2)}` : '';
                    return `[${timestamp}] [SSE] ${level}: ${eventType || 'event'} - ${message}${metaString}`;
                })
            ),
            level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
        })
    ],
    exitOnError: false
});

// Add file transports for production
if (process.env.NODE_ENV !== 'test') {
    // SSE events log (all SSE events)
    sseLogger.add(new winston.transports.File({
        filename: path.join(__dirname, '../logs/sse-events.log'),
        level: 'info',
        maxsize: 5 * 1024 * 1024, // 5MB
        maxFiles: 10,
        tailable: true,
        zippedArchive: true,
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            winston.format.json()
        )
    }));
    
    // Add combined.log transport for all SSE events
    sseLogger.add(new winston.transports.File({
        filename: path.join(__dirname, '../logs/combined.log'),
        level: 'info',
        maxsize: 20 * 1024 * 1024, // 20MB
        maxFiles: 14,
        tailable: true,
        zippedArchive: true,
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            winston.format.json()
        )
    }));

    // SSE errors log (errors only)
    sseLogger.add(new winston.transports.File({
        filename: path.join(__dirname, '../logs/sse-errors.log'),
        level: 'error',
        maxsize: 2 * 1024 * 1024, // 2MB
        maxFiles: 5,
        tailable: true,
        zippedArchive: true,
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            winston.format.json()
        )
    }));
    
    // SSE performance metrics log
    sseLogger.add(new winston.transports.File({
        filename: path.join(__dirname, '../logs/sse-metrics.log'),
        level: 'info',
        maxsize: 1 * 1024 * 1024, // 1MB
        maxFiles: 5,
        tailable: true,
        zippedArchive: true,
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            winston.format.json()
        )
    }));
}

/**
 * Log SSE event with structured data
 * @param {string} eventType - Type of SSE event
 * @param {string} sessionId - Session identifier
 * @param {Object} data - Event data and context
 */
function logSSEEvent(eventType, sessionId, data = {}) {
    const eventData = {
        eventType,
        sessionId,
        timestamp: new Date().toISOString(),
        clientIP: data.clientIP,
        userAgent: data.userAgent,
        retryCount: data.retryCount || 0,
        duration: data.duration,
        message: data.message,
        error: data.error,
        metrics: getSSEMetrics(),
        context: {
            ...data.context,
            connectionId: data.connectionId,
            populationId: data.populationId,
            populationName: data.populationName
        }
    };
    
    // Update metrics based on event type
    updateSSEMetrics(eventType, sessionId, data);
    
    // Log with appropriate level
    const level = data.error ? 'error' : 'info';
    sseLogger.log(level, `SSE Event: ${eventType}`, eventData);
    
    // Log performance metrics periodically
    if (sseMetrics.events.progress % 10 === 0 && sseMetrics.events.progress > 0) {
        logSSEMetrics();
    }
}

/**
 * Log SSE performance metrics
 */
function logSSEMetrics() {
    const metrics = getSSEMetrics();
    sseLogger.info('SSE Performance Metrics', {
        eventType: 'metrics',
        timestamp: new Date().toISOString(),
        metrics: {
            connections: metrics.connections,
            events: metrics.events,
            performance: metrics.performance,
            activeSessions: metrics.sessions.size
        }
    });
}

/**
 * Handle SSE error with recovery mechanisms
 * @param {string} sessionId - Session identifier
 * @param {Error} error - Error object
 * @param {Object} context - Error context
 */
function handleSSEError(sessionId, error, context = {}) {
    const errorData = {
        eventType: 'error',
        sessionId,
        error: {
            message: error.message,
            stack: error.stack,
            code: error.code
        },
        context,
        timestamp: new Date().toISOString(),
        metrics: getSSEMetrics()
    };
    
    // Log error with full context
    logSSEEvent('error', sessionId, errorData);
    
    // Attempt recovery based on error type
    if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
        logSSEEvent('recovery_attempt', sessionId, {
            strategy: 'reconnect',
            reason: 'connection_reset',
            error: error.message
        });
        // Return recovery strategy for caller to implement
        return {
            shouldReconnect: true,
            delay: 1000, // 1 second delay
            maxRetries: 3
        };
    }
    
    if (error.code === 'ETIMEDOUT') {
        logSSEEvent('recovery_attempt', sessionId, {
            strategy: 'timeout_retry',
            reason: 'connection_timeout',
            error: error.message
        });
        return {
            shouldReconnect: true,
            delay: 2000, // 2 second delay for timeouts
            maxRetries: 2
        };
    }
    
    // Update error metrics
    updateSSEMetrics('error', sessionId, { duration: 0 });
    
    return {
        shouldReconnect: false,
        reason: 'unrecoverable_error'
    };
}

/**
 * Get active SSE connections count
 * @returns {number} Number of active connections
 */
function getActiveSSEConnections() {
    return sseMetrics.connections.active;
}

/**
 * Get total SSE events count
 * @returns {number} Total events processed
 */
function getTotalSSEEvents() {
    return sseMetrics.events.progress + sseMetrics.events.completion + sseMetrics.events.error;
}

/**
 * Get SSE error rate
 * @returns {number} Error rate percentage
 */
function getSSEErrorRate() {
    const totalConnections = sseMetrics.connections.total;
    return totalConnections > 0 ? 
        (sseMetrics.connections.errors / totalConnections * 100).toFixed(2) : 0;
}

/**
 * Reset SSE metrics (useful for testing)
 */
function resetSSEMetrics() {
    sseMetrics.connections.active = 0;
    sseMetrics.connections.total = 0;
    sseMetrics.connections.dropped = 0;
    sseMetrics.connections.errors = 0;
    sseMetrics.connections.reconnects = 0;
    sseMetrics.events.progress = 0;
    sseMetrics.events.completion = 0;
    sseMetrics.events.error = 0;
    sseMetrics.events.keepalive = 0;
    sseMetrics.performance.avgResponseTime = 0;
    sseMetrics.performance.maxResponseTime = 0;
    sseMetrics.performance.errorRate = 0;
    sseMetrics.performance.totalProcessingTime = 0;
    sseMetrics.sessions.clear();
}

// Export functions and logger
export {
    sseLogger,
    logSSEEvent,
    logSSEMetrics,
    handleSSEError,
    updateSSEMetrics,
    getSSEMetrics,
    getActiveSSEConnections,
    getTotalSSEEvents,
    getSSEErrorRate,
    resetSSEMetrics,
    generateConnectionId
}; 