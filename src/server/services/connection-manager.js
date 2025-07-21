/**
 * Connection Manager for Socket.IO and WebSocket Fallback
 * 
 * This module provides a unified interface for managing real-time connections
 * with automatic fallback from Socket.IO to WebSocket when needed.
 * 
 * @author PingOne Import Tool
 * @version 5.0
 */

import { logSeparator, logTag } from './winston-config.js';

/**
 * Connection Manager Class
 * Handles Socket.IO and WebSocket connections with fallback support
 */
class ConnectionManager {
    constructor(logger) {
        this.logger = logger;
        this.socketIOAvailable = false;
        this.webSocketAvailable = false;
        this.connectionStats = {
            socketIO: { connected: 0, total: 0 },
            webSocket: { connected: 0, total: 0 }
        };
    }

    /**
     * Initialize connection manager
     * @param {Object} io - Socket.IO server instance
     */
    initialize(io) {
        this.socketIOAvailable = !!io;
        this.webSocketAvailable = false; // No separate WebSocket server
        
        this.logger.info('Connection Manager initialized', {
            socketIO: this.socketIOAvailable,
            webSocket: this.webSocketAvailable
        });
    }

    /**
     * Send event to client via Socket.IO
     * @param {string} sessionId - Session identifier
     * @param {string} eventType - Event type (progress, completion, error)
     * @param {Object} eventData - Event data to send
     * @returns {boolean} Success status
     */
    sendEvent(sessionId, eventType, eventData) {
        const startTime = Date.now();
        
        try {
            let sent = false;
            
            // Use Socket.IO only
            if (this.socketIOAvailable && global.io && global.ioClients) {
                try {
                    const socket = global.ioClients.get(sessionId);
                    if (socket && socket.connected) {
                        socket.join(sessionId);
                        global.io.to(sessionId).emit(eventType, eventData);
                        sent = true;
                        this.connectionStats.socketIO.total++;
                    }
                } catch (error) {
                    this.logger.warn('Socket.IO send failed', {
                        error: error.message,
                        sessionId,
                        eventType
                    });
                }
            }
            
            // Log results
            const duration = Date.now() - startTime;
            if (sent) {
                this.logger.info('Event sent via Socket.IO', {
                    sessionId,
                    eventType,
                    method: 'socketio',
                    duration: `${duration}ms`
                });
            } else {
                this.logger.warn('No Socket.IO client found for event', {
                    sessionId,
                    eventType,
                    availableClients: global.ioClients ? global.ioClients.size : 0
                });
            }
            
            return sent;
            
        } catch (error) {
            this.logger.error('Error sending event', {
                error: error.message,
                sessionId,
                eventType
            });
            return false;
        }
    }

    /**
     * Get connection statistics
     * @returns {Object} Connection statistics
     */
    getStats() {
        return {
            socketIO: {
                available: this.socketIOAvailable,
                connected: global.ioClients ? global.ioClients.size : 0,
                stats: this.connectionStats.socketIO
            },
            webSocket: {
                available: this.webSocketAvailable,
                connected: global.wsClients ? global.wsClients.size : 0,
                stats: this.connectionStats.webSocket
            }
        };
    }

    /**
     * Check if any connection method is available
     * @returns {boolean} True if any connection method is available
     */
    isAvailable() {
        return this.socketIOAvailable || this.webSocketAvailable;
    }

    /**
     * Get preferred connection method
     * @returns {string} Preferred method ('socketio', 'websocket', or 'none')
     */
    getPreferredMethod() {
        if (this.socketIOAvailable && global.ioClients && global.ioClients.size > 0) {
            return 'socketio';
        } else if (this.webSocketAvailable && global.wsClients && global.wsClients.size > 0) {
            return 'websocket';
        }
        return 'none';
    }

    /**
     * Log connection status
     */
    logStatus() {
        const stats = this.getStats();
        this.logger.info('Connection Manager Status', {
            socketIO: {
                available: stats.socketIO.available,
                connected: stats.socketIO.connected
            },
            webSocket: {
                available: stats.webSocket.available,
                connected: stats.webSocket.connected
            },
            preferred: this.getPreferredMethod()
        });
    }
}

/**
 * Create and configure connection manager
 * @param {Object} logger - Winston logger instance
 * @returns {ConnectionManager} Configured connection manager
 */
export function createConnectionManager(logger) {
    return new ConnectionManager(logger);
}

/**
 * Send progress event with connection manager
 * @param {string} sessionId - Session identifier
 * @param {number} current - Current progress
 * @param {number} total - Total items
 * @param {string} message - Progress message
 * @param {Object} counts - Count statistics
 * @param {Object} user - Current user
 * @param {string} populationName - Population name
 * @param {string} populationId - Population ID
 * @param {Object} app - Express app instance
 * @returns {boolean} Success status
 */
export function sendProgressEvent(sessionId, current, total, message, counts, user, populationName, populationId, app) {
    const eventData = {
        current,
        total,
        message,
        counts,
        user: {
            username: user?.username || user?.email || 'unknown',
            lineNumber: user?._lineNumber
        },
        populationName,
        populationId,
        timestamp: new Date().toISOString()
    };
    
    // Use connection manager if available
    if (app && app.get('connectionManager')) {
        return app.get('connectionManager').sendEvent(sessionId, 'progress', eventData);
    }
    
    // Fallback to direct implementation
    return sendEventDirect(sessionId, 'progress', eventData);
}

/**
 * Send completion event with connection manager
 * @param {string} sessionId - Session identifier
 * @param {number} current - Final progress
 * @param {number} total - Total items
 * @param {string} message - Completion message
 * @param {Object} counts - Final statistics
 * @param {Object} app - Express app instance
 * @returns {boolean} Success status
 */
export function sendCompletionEvent(sessionId, current, total, message, counts, app) {
    const eventData = {
        current,
        total,
        message,
        counts,
        timestamp: new Date().toISOString()
    };
    
    // Use connection manager if available
    if (app && app.get('connectionManager')) {
        return app.get('connectionManager').sendEvent(sessionId, 'completion', eventData);
    }
    
    // Fallback to direct implementation
    return sendEventDirect(sessionId, 'completion', eventData);
}

/**
 * Send error event with connection manager
 * @param {string} sessionId - Session identifier
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {Object} details - Error details
 * @param {Object} app - Express app instance
 * @returns {boolean} Success status
 */
export function sendErrorEvent(sessionId, title, message, details = {}, app) {
    const eventData = {
        title,
        message,
        details,
        timestamp: new Date().toISOString()
    };
    
    // Use connection manager if available
    if (app && app.get('connectionManager')) {
        return app.get('connectionManager').sendEvent(sessionId, 'error', eventData);
    }
    
    // Fallback to direct implementation
    return sendEventDirect(sessionId, 'error', eventData);
}

/**
 * Direct event sending (fallback method)
 * @param {string} sessionId - Session identifier
 * @param {string} eventType - Event type
 * @param {Object} eventData - Event data
 * @returns {boolean} Success status
 */
function sendEventDirect(sessionId, eventType, eventData) {
    let sent = false;
    
    // Try Socket.IO first
    if (global.io && global.ioClients) {
        try {
            const socket = global.ioClients.get(sessionId);
            if (socket && socket.connected) {
                socket.join(sessionId);
                global.io.to(sessionId).emit(eventType, eventData);
                sent = true;
            }
        } catch (error) {
            console.warn('Socket.IO send failed:', error.message);
        }
    }
    
    // WebSocket fallback
    if (!sent && global.wsClients) {
        try {
            const ws = global.wsClients.get(sessionId);
            if (ws && ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                    type: eventType,
                    ...eventData
                }));
                sent = true;
            }
        } catch (error) {
            console.warn('WebSocket send failed:', error.message);
        }
    }
    
    return sent;
} 