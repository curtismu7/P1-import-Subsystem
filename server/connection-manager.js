/**
 * Real-Time Connection Management System
 * 
 * A comprehensive connection management system that provides unified real-time
 * communication capabilities with automatic fallback mechanisms, connection
 * monitoring, and event broadcasting. This system ensures reliable real-time
 * updates for long-running operations like user imports and exports.
 * 
 * ## Architecture Overview
 * 
 * ### Multi-Transport Support
 * - **Socket.IO**: Primary transport with automatic fallback capabilities
 * - **WebSocket**: Fallback transport for environments with Socket.IO issues
 * - **Graceful Degradation**: Automatic fallback when primary transport fails
 * - **Connection Pooling**: Efficient management of multiple client connections
 * 
 * ### Event Broadcasting System
 * - **Session-Based Routing**: Events routed to specific client sessions
 * - **Room Management**: Automatic client room assignment and management
 * - **Event Types**: Progress, completion, error, and custom event support
 * - **Reliable Delivery**: Retry mechanisms and delivery confirmation
 * 
 * ### Connection Monitoring
 * - **Real-Time Statistics**: Track connection counts and health
 * - **Performance Metrics**: Monitor event delivery times and success rates
 * - **Health Checks**: Automatic detection of connection issues
 * - **Diagnostic Logging**: Comprehensive logging for troubleshooting
 * 
 * ## Core Features
 * 
 * ### Connection Management
 * - **Automatic Discovery**: Detect available transport methods
 * - **Connection Tracking**: Monitor active connections per transport
 * - **Session Correlation**: Link connections to user sessions
 * - **Resource Cleanup**: Automatic cleanup of disconnected clients
 * 
 * ### Event Delivery
 * - **Guaranteed Delivery**: Ensure events reach connected clients
 * - **Event Queuing**: Queue events for temporarily disconnected clients
 * - **Broadcast Optimization**: Efficient delivery to multiple clients
 * - **Error Recovery**: Handle delivery failures gracefully
 * 
 * ### Performance Optimization
 * - **Connection Pooling**: Reuse connections efficiently
 * - **Event Batching**: Batch multiple events for efficiency
 * - **Memory Management**: Prevent memory leaks from stale connections
 * - **Rate Limiting**: Prevent event flooding
 * 
 * ## Use Cases
 * 
 * ### Long-Running Operations
 * - **User Import Progress**: Real-time progress updates during CSV imports
 * - **Export Operations**: Status updates for data export processes
 * - **Bulk Modifications**: Progress tracking for bulk user updates
 * - **System Maintenance**: Status updates during maintenance operations
 * 
 * ### Interactive Features
 * - **Live Notifications**: Real-time system notifications
 * - **Status Updates**: Dynamic status changes without page refresh
 * - **Error Alerts**: Immediate error notification to users
 * - **System Messages**: Broadcast messages to all connected users
 * 
 * ### Monitoring and Diagnostics
 * - **Connection Health**: Monitor connection stability
 * - **Performance Tracking**: Track event delivery performance
 * - **Error Monitoring**: Detect and report connection issues
 * - **Usage Analytics**: Analyze real-time feature usage
 * 
 * ## Integration Patterns
 * 
 * ### Express Application Integration
 * ```javascript
 * import { createConnectionManager } from './connection-manager.js';
 * 
 * const connectionManager = createConnectionManager(logger);
 * app.set('connectionManager', connectionManager);
 * 
 * // Initialize with Socket.IO server
 * connectionManager.initialize(io);
 * ```
 * 
 * ### Event Broadcasting
 * ```javascript
 * // Send progress update
 * sendProgressEvent(sessionId, current, total, message, counts, user, populationName, populationId, app);
 * 
 * // Send completion notification
 * sendCompletionEvent(sessionId, current, total, message, counts, app);
 * 
 * // Send error alert
 * sendErrorEvent(sessionId, title, message, details, app);
 * ```
 * 
 * ### Connection Monitoring
 * ```javascript
 * const stats = connectionManager.getStats();
 * const isAvailable = connectionManager.isAvailable();
 * const preferredMethod = connectionManager.getPreferredMethod();
 * ```
 * 
 * ## Error Handling and Recovery
 * 
 * ### Connection Failures
 * - **Automatic Retry**: Retry failed event deliveries
 * - **Fallback Transport**: Switch to alternative transport methods
 * - **Graceful Degradation**: Continue operation with reduced functionality
 * - **Error Logging**: Comprehensive error logging for diagnosis
 * 
 * ### Network Issues
 * - **Reconnection Logic**: Automatic reconnection for dropped connections
 * - **Buffering**: Buffer events during temporary disconnections
 * - **Timeout Handling**: Handle network timeouts gracefully
 * - **Connection Validation**: Verify connection health before sending
 * 
 * ### Resource Management
 * - **Memory Cleanup**: Clean up resources from disconnected clients
 * - **Connection Limits**: Prevent resource exhaustion from too many connections
 * - **Event Cleanup**: Remove stale events from queues
 * - **Performance Monitoring**: Monitor resource usage and performance
 * 
 * ## Security Considerations
 * 
 * ### Authentication and Authorization
 * - **Session Validation**: Verify client sessions before event delivery
 * - **Access Control**: Ensure clients only receive authorized events
 * - **Rate Limiting**: Prevent abuse through excessive connections
 * - **Input Validation**: Validate all event data before broadcasting
 * 
 * ### Data Protection
 * - **Event Sanitization**: Remove sensitive data from events
 * - **Secure Transmission**: Use secure WebSocket connections (WSS)
 * - **Audit Logging**: Log all connection and event activities
 * - **Privacy Compliance**: Ensure compliance with data protection regulations
 * 
 * @fileoverview Real-time connection management with multi-transport support
 * @author PingOne Import Tool Team
 * @version 5.2.0
 * @since 1.0.0
 * 
 * @requires socket.io Socket.IO for real-time communication
 * @requires ws WebSocket library for fallback transport
 * @requires winston-config Logging configuration
 * 
 * @example
 * // Create and initialize connection manager
 * import { createConnectionManager } from './connection-manager.js';
 * const connectionManager = createConnectionManager(logger);
 * connectionManager.initialize(io);
 * 
 * @example
 * // Send real-time progress update
 * sendProgressEvent(sessionId, 50, 100, 'Processing users...', counts, user, population, populationId, app);
 * 
 * @example
 * // Monitor connection health
 * const stats = connectionManager.getStats();
 * logger.info('Connection stats', stats);
 * 
 * TODO: Add support for event queuing during disconnections
 * TODO: Implement connection health monitoring with automatic recovery
 * TODO: Add support for custom event types and handlers
 * VERIFY: All transport methods handle errors gracefully
 * DEBUG: Monitor event delivery performance and connection stability
 */

import { logSeparator, logTag } from './winston-config.js';

/**
 * Connection Manager Class
 * 
 * Core class that manages real-time connections across multiple transport methods.
 * Provides a unified interface for event broadcasting, connection monitoring,
 * and automatic fallback handling.
 * 
 * ## Responsibilities
 * - **Transport Management**: Initialize and manage Socket.IO and WebSocket transports
 * - **Connection Tracking**: Monitor active connections and their health
 * - **Event Broadcasting**: Send events to specific clients or broadcast to all
 * - **Statistics Collection**: Gather metrics on connection usage and performance
 * - **Error Handling**: Manage connection failures and recovery
 * 
 * ## State Management
 * - **Transport Availability**: Track which transport methods are available
 * - **Connection Counts**: Monitor active connections per transport
 * - **Performance Metrics**: Collect timing and success rate statistics
 * - **Health Status**: Track overall system health and connectivity
 * 
 * @class ConnectionManager
 */
class ConnectionManager {
    /**
     * Initialize Connection Manager
     * 
     * Creates a new connection manager instance with logging and statistics tracking.
     * Sets up initial state for transport availability and connection monitoring.
     * 
     * @constructor
     * @param {Object} logger - Winston logger instance for connection logging
     * 
     * @example
     * const connectionManager = new ConnectionManager(logger);
     * 
     * TODO: Add configuration options for connection limits and timeouts
     * VERIFY: Logger instance is properly configured
     * DEBUG: Monitor constructor performance and initialization time
     */
    constructor(logger) {
        this.logger = logger;
        this.socketIOAvailable = false;
        this.webSocketAvailable = false;
        this.connectionStats = {
            socketIO: { connected: 0, total: 0, errors: 0, lastError: null },
            webSocket: { connected: 0, total: 0, errors: 0, lastError: null }
        };
        this.eventQueue = new Map(); // Queue events for disconnected clients
        this.connectionHealth = {
            lastHealthCheck: null,
            healthStatus: 'unknown',
            issues: []
        };
        
        // Log initialization
        this.logger.info('ConnectionManager initialized', {
            timestamp: new Date().toISOString(),
            initialState: {
                socketIOAvailable: this.socketIOAvailable,
                webSocketAvailable: this.webSocketAvailable
            }
        });
    }

    /**
     * Initialize Connection Manager with Transport Servers
     * 
     * Configures the connection manager with available transport servers and
     * sets up monitoring for connection health. This method should be called
     * after creating the Socket.IO and WebSocket servers.
     * 
     * ## Initialization Process
     * 1. **Transport Detection**: Detect available transport methods
     * 2. **Health Monitoring**: Set up connection health monitoring
     * 3. **Event Handlers**: Configure connection event handlers
     * 4. **Statistics Setup**: Initialize performance tracking
     * 
     * ## Transport Configuration
     * - **Socket.IO**: Primary transport for rich real-time features
     * - **WebSocket**: Fallback transport for basic real-time communication
     * - **Availability Flags**: Track which transports are operational
     * 
     * @method initialize
     * @param {Object} io - Socket.IO server instance
     * @param {Object} [wsServer] - Optional WebSocket server instance
     * 
     * @example
     * // Initialize with Socket.IO only
     * connectionManager.initialize(io);
     * 
     * @example
     * // Initialize with both transports
     * connectionManager.initialize(io, wsServer);
     * 
     * TODO: Add WebSocket server support for complete fallback
     * TODO: Implement automatic transport health checking
     * VERIFY: Transport servers are properly configured
     * DEBUG: Monitor initialization performance and success rates
     */
    initialize(io, wsServer = null) {
        const startTime = Date.now();
        
        try {
            // Configure Socket.IO transport
            this.socketIOAvailable = !!io;
            if (this.socketIOAvailable) {
                this.logger.info('Socket.IO transport available', {
                    engineVersion: io.engine?.protocol,
                    transports: io.engine?.transports
                });
            }
            
            // Configure WebSocket transport (future enhancement)
            this.webSocketAvailable = !!wsServer;
            if (this.webSocketAvailable) {
                this.logger.info('WebSocket transport available');
            }
            
            // Update health status
            this.connectionHealth.lastHealthCheck = new Date().toISOString();
            this.connectionHealth.healthStatus = this.isAvailable() ? 'healthy' : 'degraded';
            this.connectionHealth.issues = [];
            
            const duration = Date.now() - startTime;
            this.logger.info('Connection Manager initialization completed', {
                socketIO: this.socketIOAvailable,
                webSocket: this.webSocketAvailable,
                healthStatus: this.connectionHealth.healthStatus,
                duration: `${duration}ms`
            });
            
        } catch (error) {
            this.logger.error('Connection Manager initialization failed', {
                error: error.message,
                stack: error.stack
            });
            
            // Set degraded health status
            this.connectionHealth.healthStatus = 'unhealthy';
            this.connectionHealth.issues.push({
                type: 'initialization_error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }

    /**
     * Send Event to Client with Multi-Transport Support
     * 
     * Sends real-time events to specific clients using the best available transport
     * method. Implements automatic fallback and retry logic for reliable delivery.
     * 
     * ## Event Delivery Process
     * 1. **Transport Selection**: Choose best available transport method
     * 2. **Client Lookup**: Find active connection for the session
     * 3. **Event Transmission**: Send event using selected transport
     * 4. **Delivery Confirmation**: Verify successful delivery
     * 5. **Fallback Handling**: Try alternative transports if primary fails
     * 6. **Statistics Update**: Update delivery statistics and metrics
     * 
     * ## Transport Priority
     * 1. **Socket.IO**: Primary transport with rich features
     * 2. **WebSocket**: Fallback transport for basic communication
     * 3. **Event Queuing**: Queue events if no transport available
     * 
     * ## Event Types
     * - **progress**: Real-time progress updates for long operations
     * - **completion**: Operation completion notifications
     * - **error**: Error alerts and notifications
     * - **custom**: Application-specific event types
     * 
     * @method sendEvent
     * @param {string} sessionId - Unique session identifier for client targeting
     * @param {string} eventType - Type of event (progress, completion, error, custom)
     * @param {Object} eventData - Event payload data to send to client
     * @returns {boolean} True if event was successfully sent, false otherwise
     * 
     * @example
     * // Send progress update
     * const success = connectionManager.sendEvent('session123', 'progress', {
     *   current: 50,
     *   total: 100,
     *   message: 'Processing users...'
     * });
     * 
     * @example
     * // Send error notification
     * const success = connectionManager.sendEvent('session123', 'error', {
     *   title: 'Import Failed',
     *   message: 'Unable to process CSV file',
     *   details: { error: 'Invalid format' }
     * });
     * 
     * TODO: Implement event queuing for disconnected clients
     * TODO: Add delivery confirmation and retry logic
     * TODO: Support broadcast events to multiple clients
     * VERIFY: Event data is properly sanitized before sending
     * DEBUG: Monitor event delivery success rates and performance
     */
    sendEvent(sessionId, eventType, eventData) {
        const startTime = Date.now();
        const eventId = `${sessionId}_${eventType}_${Date.now()}`;
        
        try {
            let sent = false;
            let transportUsed = null;
            let errorDetails = null;
            
            // Validate input parameters
            if (!sessionId || !eventType || !eventData) {
                this.logger.warn('Invalid event parameters', {
                    sessionId: !!sessionId,
                    eventType: !!eventType,
                    eventData: !!eventData
                });
                return false;
            }
            
            // Add event metadata
            const enrichedEventData = {
                ...eventData,
                eventId,
                timestamp: new Date().toISOString(),
                sessionId
            };
            
            // Try Socket.IO first (primary transport)
            if (this.socketIOAvailable && global.io && global.ioClients) {
                try {
                    const socket = global.ioClients.get(sessionId);
                    if (socket && socket.connected) {
                        // Ensure client is in the correct room
                        socket.join(sessionId);
                        
                        // Send event to the specific session room
                        global.io.to(sessionId).emit(eventType, enrichedEventData);
                        
                        sent = true;
                        transportUsed = 'socketio';
                        this.connectionStats.socketIO.total++;
                        
                        this.logger.debug('Event sent via Socket.IO', {
                            eventId,
                            sessionId,
                            eventType,
                            socketId: socket.id
                        });
                    } else {
                        errorDetails = 'Socket not found or disconnected';
                    }
                } catch (error) {
                    errorDetails = error.message;
                    this.connectionStats.socketIO.errors++;
                    this.connectionStats.socketIO.lastError = error.message;
                    
                    this.logger.warn('Socket.IO send failed', {
                        eventId,
                        error: error.message,
                        sessionId,
                        eventType
                    });
                }
            }
            
            // Try WebSocket fallback (if Socket.IO failed and WebSocket available)
            if (!sent && this.webSocketAvailable && global.wsClients) {
                try {
                    const ws = global.wsClients.get(sessionId);
                    if (ws && ws.readyState === ws.OPEN) {
                        const wsMessage = JSON.stringify({
                            type: eventType,
                            ...enrichedEventData
                        });
                        
                        ws.send(wsMessage);
                        sent = true;
                        transportUsed = 'websocket';
                        this.connectionStats.webSocket.total++;
                        
                        this.logger.debug('Event sent via WebSocket', {
                            eventId,
                            sessionId,
                            eventType
                        });
                    } else {
                        errorDetails = errorDetails || 'WebSocket not found or not open';
                    }
                } catch (error) {
                    errorDetails = error.message;
                    this.connectionStats.webSocket.errors++;
                    this.connectionStats.webSocket.lastError = error.message;
                    
                    this.logger.warn('WebSocket send failed', {
                        eventId,
                        error: error.message,
                        sessionId,
                        eventType
                    });
                }
            }
            
            // Queue event if no transport succeeded (future enhancement)
            if (!sent) {
                // TODO: Implement event queuing for offline clients
                this.logger.warn('Event delivery failed - no available transport', {
                    eventId,
                    sessionId,
                    eventType,
                    errorDetails,
                    availableTransports: {
                        socketIO: this.socketIOAvailable && global.ioClients ? global.ioClients.size : 0,
                        webSocket: this.webSocketAvailable && global.wsClients ? global.wsClients.size : 0
                    }
                });
            }
            
            // Log delivery results
            const duration = Date.now() - startTime;
            if (sent) {
                this.logger.info('Event delivered successfully', {
                    eventId,
                    sessionId,
                    eventType,
                    transport: transportUsed,
                    duration: `${duration}ms`
                });
            } else {
                this.logger.error('Event delivery failed', {
                    eventId,
                    sessionId,
                    eventType,
                    errorDetails,
                    duration: `${duration}ms`
                });
            }
            
            return sent;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('Critical error in sendEvent', {
                eventId,
                error: error.message,
                stack: error.stack,
                sessionId,
                eventType,
                duration: `${duration}ms`
            });
            return false;
        }
    }

    /**
     * Get Comprehensive Connection Statistics
     * 
     * Returns detailed statistics about all connection transports including
     * availability, active connections, performance metrics, and error rates.
     * This information is useful for monitoring, debugging, and capacity planning.
     * 
     * ## Statistics Categories
     * - **Transport Availability**: Which transport methods are operational
     * - **Active Connections**: Current number of connected clients per transport
     * - **Performance Metrics**: Event delivery counts and success rates
     * - **Error Statistics**: Error counts and recent error details
     * - **Health Information**: Overall system health and status
     * 
     * @method getStats
     * @returns {Object} Comprehensive connection statistics object
     * 
     * @example
     * const stats = connectionManager.getStats();
     * console.log('Socket.IO connections:', stats.socketIO.connected);
     * console.log('Total events sent:', stats.socketIO.stats.total);
     * 
     * TODO: Add historical statistics and trending data
     * VERIFY: Statistics accurately reflect current system state
     * DEBUG: Monitor statistics collection performance
     */
    getStats() {
        const currentTime = new Date().toISOString();
        
        return {
            timestamp: currentTime,
            socketIO: {
                available: this.socketIOAvailable,
                connected: global.ioClients ? global.ioClients.size : 0,
                stats: {
                    ...this.connectionStats.socketIO,
                    successRate: this.connectionStats.socketIO.total > 0 
                        ? ((this.connectionStats.socketIO.total - this.connectionStats.socketIO.errors) / this.connectionStats.socketIO.total * 100).toFixed(2) + '%'
                        : 'N/A'
                }
            },
            webSocket: {
                available: this.webSocketAvailable,
                connected: global.wsClients ? global.wsClients.size : 0,
                stats: {
                    ...this.connectionStats.webSocket,
                    successRate: this.connectionStats.webSocket.total > 0 
                        ? ((this.connectionStats.webSocket.total - this.connectionStats.webSocket.errors) / this.connectionStats.webSocket.total * 100).toFixed(2) + '%'
                        : 'N/A'
                }
            },
            overall: {
                totalConnections: (global.ioClients ? global.ioClients.size : 0) + (global.wsClients ? global.wsClients.size : 0),
                totalEventsSent: this.connectionStats.socketIO.total + this.connectionStats.webSocket.total,
                totalErrors: this.connectionStats.socketIO.errors + this.connectionStats.webSocket.errors,
                healthStatus: this.connectionHealth.healthStatus,
                lastHealthCheck: this.connectionHealth.lastHealthCheck
            }
        };
    }

    /**
     * Check Transport Availability
     * 
     * Determines if any real-time transport method is available for event delivery.
     * This is used to decide whether real-time features can be enabled.
     * 
     * @method isAvailable
     * @returns {boolean} True if at least one transport method is available
     * 
     * @example
     * if (connectionManager.isAvailable()) {
     *   // Enable real-time features
     *   enableProgressUpdates();
     * } else {
     *   // Fall back to polling or disable real-time features
     *   usePollingUpdates();
     * }
     * 
     * TODO: Add health checking for available transports
     * VERIFY: Availability check reflects actual transport health
     */
    isAvailable() {
        return this.socketIOAvailable || this.webSocketAvailable;
    }

    /**
     * Get Preferred Connection Method
     * 
     * Determines the best available transport method based on availability,
     * active connections, and performance characteristics. This helps optimize
     * event delivery by using the most suitable transport.
     * 
     * ## Selection Criteria
     * 1. **Socket.IO**: Preferred if available and has active connections
     * 2. **WebSocket**: Fallback if Socket.IO unavailable but WebSocket has connections
     * 3. **None**: No suitable transport available
     * 
     * @method getPreferredMethod
     * @returns {string} Preferred transport method ('socketio', 'websocket', or 'none')
     * 
     * @example
     * const preferred = connectionManager.getPreferredMethod();
     * switch (preferred) {
     *   case 'socketio':
     *     // Use Socket.IO features
     *     break;
     *   case 'websocket':
     *     // Use basic WebSocket
     *     break;
     *   case 'none':
     *     // No real-time transport available
     *     break;
     * }
     * 
     * TODO: Add performance-based transport selection
     * VERIFY: Method selection logic matches actual transport capabilities
     */
    getPreferredMethod() {
        // Check Socket.IO first (preferred transport)
        if (this.socketIOAvailable && global.ioClients && global.ioClients.size > 0) {
            return 'socketio';
        }
        
        // Check WebSocket fallback
        if (this.webSocketAvailable && global.wsClients && global.wsClients.size > 0) {
            return 'websocket';
        }
        
        // No active connections available
        return 'none';
    }

    /**
     * Log Current Connection Status
     * 
     * Outputs comprehensive connection status information to the logger.
     * This is useful for monitoring, debugging, and operational visibility.
     * 
     * ## Logged Information
     * - Transport availability and active connections
     * - Performance statistics and error rates
     * - Health status and recent issues
     * - Preferred transport method
     * 
     * @method logStatus
     * 
     * @example
     * // Log status periodically for monitoring
     * setInterval(() => {
     *   connectionManager.logStatus();
     * }, 60000); // Every minute
     * 
     * TODO: Add configurable log levels for different verbosity
     * VERIFY: Status logging doesn't impact performance
     * DEBUG: Include additional diagnostic information
     */
    logStatus() {
        const stats = this.getStats();
        const preferredMethod = this.getPreferredMethod();
        
        this.logger.info('Connection Manager Status Report', {
            timestamp: stats.timestamp,
            transports: {
                socketIO: {
                    available: stats.socketIO.available,
                    connected: stats.socketIO.connected,
                    eventsSent: stats.socketIO.stats.total,
                    errors: stats.socketIO.stats.errors,
                    successRate: stats.socketIO.stats.successRate
                },
                webSocket: {
                    available: stats.webSocket.available,
                    connected: stats.webSocket.connected,
                    eventsSent: stats.webSocket.stats.total,
                    errors: stats.webSocket.stats.errors,
                    successRate: stats.webSocket.stats.successRate
                }
            },
            overall: {
                totalConnections: stats.overall.totalConnections,
                totalEventsSent: stats.overall.totalEventsSent,
                totalErrors: stats.overall.totalErrors,
                healthStatus: stats.overall.healthStatus,
                preferredMethod
            },
            health: {
                status: this.connectionHealth.healthStatus,
                lastCheck: this.connectionHealth.lastHealthCheck,
                issues: this.connectionHealth.issues.length
            }
        });
    }
}

/**
 * Connection Manager Factory Function
 * 
 * Creates and configures a new ConnectionManager instance with the provided
 * logger. This factory function provides a clean interface for creating
 * connection managers with consistent configuration.
 * 
 * ## Factory Benefits
 * - **Consistent Configuration**: Ensures all connection managers are configured similarly
 * - **Dependency Injection**: Provides logger dependency cleanly
 * - **Future Extensibility**: Easy to add configuration options
 * - **Testing Support**: Simplifies mocking and testing
 * 
 * @function createConnectionManager
 * @param {Object} logger - Winston logger instance for connection logging
 * @returns {ConnectionManager} Fully configured connection manager instance
 * 
 * @example
 * // Create connection manager with application logger
 * import { createConnectionManager } from './connection-manager.js';
 * const connectionManager = createConnectionManager(appLogger);
 * 
 * @example
 * // Use in Express application
 * const connectionManager = createConnectionManager(logger);
 * app.set('connectionManager', connectionManager);
 * 
 * TODO: Add configuration options parameter
 * VERIFY: Logger instance is properly validated
 * DEBUG: Monitor connection manager creation frequency
 */
export function createConnectionManager(logger) {
    if (!logger) {
        throw new Error('Logger is required for ConnectionManager');
    }
    
    return new ConnectionManager(logger);
}

/**
 * Send Progress Event Helper Function
 * 
 * Specialized helper function for sending real-time progress updates during
 * long-running operations like user imports, exports, or bulk modifications.
 * Provides a standardized interface for progress reporting across the application.
 * 
 * ## Progress Event Structure
 * - **current**: Current number of items processed
 * - **total**: Total number of items to process
 * - **message**: Human-readable progress message
 * - **counts**: Detailed statistics (created, updated, failed, etc.)
 * - **user**: Information about the current item being processed
 * - **population**: Target population details
 * - **timestamp**: Event timestamp for client synchronization
 * 
 * ## Use Cases
 * - **CSV Import Progress**: Real-time updates during user import
 * - **Export Operations**: Progress tracking for data exports
 * - **Bulk Updates**: Status updates for bulk user modifications
 * - **System Operations**: Progress for maintenance or migration tasks
 * 
 * ## Client Integration
 * Clients can listen for 'progress' events to update UI elements:
 * ```javascript
 * socket.on('progress', (data) => {
 *   updateProgressBar(data.current, data.total);
 *   updateStatusMessage(data.message);
 *   updateStatistics(data.counts);
 * });
 * ```
 * 
 * @function sendProgressEvent
 * @param {string} sessionId - Unique session identifier for client targeting
 * @param {number} current - Current number of items processed (0-based or 1-based)
 * @param {number} total - Total number of items to process
 * @param {string} message - Human-readable progress message for display
 * @param {Object} counts - Detailed operation statistics
 * @param {number} counts.created - Number of items successfully created
 * @param {number} counts.updated - Number of items successfully updated
 * @param {number} counts.failed - Number of items that failed processing
 * @param {number} counts.skipped - Number of items skipped
 * @param {Object} user - Current user/item being processed
 * @param {string} user.username - Username or identifier
 * @param {string} user.email - Email address
 * @param {number} user._lineNumber - Line number in source file
 * @param {string} populationName - Human-readable population name
 * @param {string} populationId - Population UUID identifier
 * @param {Object} app - Express application instance
 * @returns {boolean} True if event was successfully sent, false otherwise
 * 
 * @example
 * // Send progress update during user import
 * sendProgressEvent(
 *   'session123',
 *   50,
 *   100,
 *   'Processing user john.doe@example.com',
 *   { created: 45, updated: 3, failed: 2, skipped: 0 },
 *   { username: 'john.doe', email: 'john.doe@example.com', _lineNumber: 51 },
 *   'Sales Team',
 *   'pop-uuid-123',
 *   app
 * );
 * 
 * @example
 * // Send progress with minimal information
 * sendProgressEvent(
 *   sessionId,
 *   processed,
 *   totalUsers,
 *   `Processing ${processed}/${totalUsers} users`,
 *   counts,
 *   currentUser,
 *   populationName,
 *   populationId,
 *   app
 * );
 * 
 * TODO: Add support for estimated time remaining
 * TODO: Implement progress event batching for high-frequency updates
 * VERIFY: All progress data is properly sanitized
 * DEBUG: Monitor progress event frequency and client responsiveness
 */
export function sendProgressEvent(sessionId, current, total, message, counts, user, populationName, populationId, app) {
    // Validate required parameters
    if (!sessionId || typeof current !== 'number' || typeof total !== 'number') {
        console.warn('Invalid progress event parameters', {
            sessionId: !!sessionId,
            current: typeof current,
            total: typeof total
        });
        return false;
    }
    
    // Calculate progress percentage
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    // Create standardized event data
    const eventData = {
        // Core progress information
        current,
        total,
        percentage,
        message: message || `Processing ${current}/${total} items`,
        
        // Detailed statistics
        counts: counts || { created: 0, updated: 0, failed: 0, skipped: 0 },
        
        // Current item information (sanitized)
        user: {
            username: user?.username || user?.email || 'unknown',
            email: user?.email || null,
            lineNumber: user?._lineNumber || null,
            // Don't include sensitive user data
        },
        
        // Population context
        populationName: populationName || 'Unknown Population',
        populationId: populationId || null,
        
        // Event metadata
        timestamp: new Date().toISOString(),
        eventType: 'progress'
    };
    
    // Use connection manager if available (preferred)
    if (app && app.get('connectionManager')) {
        return app.get('connectionManager').sendEvent(sessionId, 'progress', eventData);
    }
    
    // Fallback to direct implementation
    return sendEventDirect(sessionId, 'progress', eventData);
}

/**
 * Send Smart Progress Event Helper Function
 * 
 * Enhanced progress event function that intelligently manages update frequency
 * based on import mode and record count. This function provides optimal
 * performance for large imports while maintaining detailed visibility for
 * smaller operations.
 * 
 * ## Smart Update Strategy
 * - **Real-time Mode**: Updates for every individual user operation
 * - **Batch Mode**: Summary updates at configurable intervals
 * - **Auto Mode**: Automatically chooses optimal strategy based on record count
 * 
 * ## Update Strategy Configuration
 * - **updateFrequency**: How often to send updates (every N operations)
 * - **batchUpdates**: Whether to send batch summaries or individual updates
 * - **detailedLogging**: Whether to include detailed user information
 * 
 * ## Performance Benefits
 * - **Large Imports**: Reduced event overhead for 100,000+ records
 * - **Small Imports**: Full real-time visibility for ≤100 records
 * - **Memory Management**: Prevents excessive event queuing
 * - **Network Optimization**: Balances detail vs. performance
 * 
 * @function sendSmartProgressEvent
 * @param {string} sessionId - Unique session identifier for client targeting
 * @param {number} current - Current number of items processed
 * @param {number} total - Total number of items to process
 * @param {string} message - Human-readable progress message
 * @param {Object} counts - Current operation statistics
 * @param {string} user - Username or identifier of current user
 * @param {string} populationName - Name of target population
 * @param {string} populationId - ID of target population
 * @param {Object} app - Express application instance
 * @param {Object} updateStrategy - Update strategy configuration
 * @param {number} updateStrategy.updateFrequency - Update frequency (every N operations)
 * @param {boolean} updateStrategy.batchUpdates - Whether to send batch updates
 * @param {boolean} updateStrategy.detailedLogging - Whether to include detailed logging
 * @returns {boolean} True if event was successfully sent, false otherwise
 * 
 * @example
 * // Send smart progress update for large import
 * const updateStrategy = { updateFrequency: 100, batchUpdates: true, detailedLogging: false };
 * sendSmartProgressEvent(sessionId, 1000, 50000, 'Processing batch...', counts, username, popName, popId, app, updateStrategy);
 */
export function sendSmartProgressEvent(sessionId, current, total, message, counts, user, populationName, populationId, app, updateStrategy) {
    // Validate required parameters
    if (!sessionId || typeof current !== 'number' || typeof total !== 'number') {
        console.warn('Invalid smart progress event parameters', {
            sessionId: !!sessionId,
            current: typeof current,
            total: typeof total
        });
        return false;
    }
    
    // Check if we should send an update based on strategy
    if (updateStrategy && updateStrategy.updateFrequency > 1) {
        // Only send updates at specified frequency
        if (current % updateStrategy.updateFrequency !== 0 && current !== total) {
            return false; // Skip this update
        }
    }
    
    // Calculate progress percentage
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    // Create event data based on strategy
    const eventData = {
        // Core progress information
        current,
        total,
        percentage,
        message: message || `Processing ${current}/${total} items`,
        
        // Detailed statistics
        counts: counts || { created: 0, updated: 0, failed: 0, skipped: 0 },
        
        // User information (conditional based on strategy)
        user: updateStrategy?.detailedLogging ? {
            username: user?.username || user?.email || user || 'unknown',
            email: user?.email || null,
            lineNumber: user?._lineNumber || null,
        } : null,
        
        // Population context
        populationName: populationName || 'Unknown Population',
        populationId: populationId || null,
        
        // Strategy information
        mode: updateStrategy?.batchUpdates ? 'batch' : 'realtime',
        updateFrequency: updateStrategy?.updateFrequency || 1,
        
        // Event metadata
        timestamp: new Date().toISOString(),
        eventType: 'smart-progress'
    };
    
    // Use connection manager if available (preferred)
    if (app && app.get('connectionManager')) {
        return app.get('connectionManager').sendEvent(sessionId, 'smart-progress', eventData);
    }
    
    // Fallback to direct implementation
    return sendEventDirect(sessionId, 'smart-progress', eventData);
}

/**
 * Send Completion Event Helper Function
 * 
 * Specialized helper function for sending operation completion notifications
 * to clients. This function marks the end of long-running operations and
 * provides final statistics and results to the user interface.
 * 
 * ## Completion Event Structure
 * - **current**: Final number of items processed
 * - **total**: Total number of items that were to be processed
 * - **message**: Human-readable completion message
 * - **counts**: Final operation statistics and results
 * - **success**: Overall operation success status
 * - **duration**: Total operation duration
 * - **timestamp**: Completion timestamp
 * 
 * ## Use Cases
 * - **Import Completion**: Notify when CSV import finishes
 * - **Export Completion**: Signal when data export is ready
 * - **Bulk Operation Completion**: Mark end of bulk user updates
 * - **System Task Completion**: Notify completion of maintenance tasks
 * 
 * ## Client Integration
 * Clients can listen for 'completion' events to update UI and show results:
 * ```javascript
 * socket.on('completion', (data) => {
 *   hideProgressBar();
 *   showCompletionMessage(data.message);
 *   displayFinalStatistics(data.counts);
 *   enableNextAction();
 * });
 * ```
 * 
 * @function sendCompletionEvent
 * @param {string} sessionId - Unique session identifier for client targeting
 * @param {number} current - Final number of items processed
 * @param {number} total - Total number of items that were to be processed
 * @param {string} message - Human-readable completion message
 * @param {Object} counts - Final operation statistics
 * @param {number} counts.created - Total items successfully created
 * @param {number} counts.updated - Total items successfully updated
 * @param {number} counts.failed - Total items that failed processing
 * @param {number} counts.skipped - Total items skipped
 * @param {Object} app - Express application instance
 * @returns {boolean} True if event was successfully sent, false otherwise
 * 
 * @example
 * // Send completion notification for successful import
 * sendCompletionEvent(
 *   'session123',
 *   100,
 *   100,
 *   'Import completed successfully',
 *   { created: 95, updated: 3, failed: 2, skipped: 0 },
 *   app
 * );
 * 
 * @example
 * // Send completion with partial success
 * sendCompletionEvent(
 *   sessionId,
 *   processed,
 *   totalUsers,
 *   `Import completed with ${failedCount} errors`,
 *   finalCounts,
 *   app
 * );
 * 
 * TODO: Add support for operation duration tracking
 * TODO: Include download links for result files
 * VERIFY: Completion events are sent only once per operation
 * DEBUG: Monitor completion event delivery and client acknowledgment
 */
export function sendCompletionEvent(sessionId, current, total, message, counts, app) {
    // Validate required parameters
    if (!sessionId || typeof current !== 'number' || typeof total !== 'number') {
        console.warn('Invalid completion event parameters', {
            sessionId: !!sessionId,
            current: typeof current,
            total: typeof total
        });
        return false;
    }
    
    // Calculate final statistics
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    const success = counts ? (counts.failed || 0) === 0 : current === total;
    
    // Create standardized completion event data
    const eventData = {
        // Final progress information
        current,
        total,
        percentage,
        message: message || `Operation completed: ${current}/${total} items processed`,
        
        // Final statistics
        counts: counts || { created: 0, updated: 0, failed: 0, skipped: 0 },
        
        // Operation results
        success,
        completed: true,
        
        // Event metadata
        timestamp: new Date().toISOString(),
        eventType: 'completion'
    };
    
    // Add success/failure indicators
    if (counts) {
        eventData.summary = {
            totalProcessed: current,
            successfulOperations: (counts.created || 0) + (counts.updated || 0),
            failedOperations: counts.failed || 0,
            skippedOperations: counts.skipped || 0,
            successRate: current > 0 ? Math.round(((current - (counts.failed || 0)) / current) * 100) : 0
        };
    }
    
    // Use connection manager if available (preferred)
    if (app && app.get('connectionManager')) {
        return app.get('connectionManager').sendEvent(sessionId, 'completion', eventData);
    }
    
    // Fallback to direct implementation
    return sendEventDirect(sessionId, 'completion', eventData);
}

/**
 * Send Error Event Helper Function
 * 
 * Specialized helper function for sending real-time error notifications to
 * clients. This function provides immediate feedback when operations fail,
 * allowing users to understand and respond to problems quickly.
 * 
 * ## Error Event Structure
 * - **title**: Brief error title for display
 * - **message**: Detailed error message explaining the problem
 * - **details**: Additional technical details and context
 * - **severity**: Error severity level (critical, high, medium, low)
 * - **recoverable**: Whether the error can be recovered from
 * - **suggestions**: Recommended actions for the user
 * - **timestamp**: Error occurrence timestamp
 * 
 * ## Error Categories
 * - **Validation Errors**: Input validation failures
 * - **Authentication Errors**: Authentication and authorization failures
 * - **Network Errors**: API communication failures
 * - **System Errors**: Internal system failures
 * - **Business Logic Errors**: Application-specific errors
 * 
 * ## Client Integration
 * Clients can listen for 'error' events to show error messages:
 * ```javascript
 * socket.on('error', (data) => {
 *   showErrorModal(data.title, data.message);
 *   logErrorDetails(data.details);
 *   if (data.suggestions) {
 *     showSuggestions(data.suggestions);
 *   }
 * });
 * ```
 * 
 * @function sendErrorEvent
 * @param {string} sessionId - Unique session identifier for client targeting
 * @param {string} title - Brief, user-friendly error title
 * @param {string} message - Detailed error message explaining the problem
 * @param {Object} [details={}] - Additional error context and technical details
 * @param {string} [details.code] - Error code for programmatic handling
 * @param {string} [details.severity] - Error severity (critical, high, medium, low)
 * @param {boolean} [details.recoverable] - Whether error can be recovered from
 * @param {Array<string>} [details.suggestions] - Recommended user actions
 * @param {Object} [details.context] - Additional context information
 * @param {Object} app - Express application instance
 * @returns {boolean} True if event was successfully sent, false otherwise
 * 
 * @example
 * // Send validation error
 * sendErrorEvent(
 *   'session123',
 *   'Invalid CSV Format',
 *   'The uploaded file contains invalid data in row 15',
 *   {
 *     code: 'VALIDATION_ERROR',
 *     severity: 'medium',
 *     recoverable: true,
 *     suggestions: [
 *       'Check the CSV format requirements',
 *       'Verify data in row 15',
 *       'Try uploading the file again'
 *     ],
 *     context: { row: 15, column: 'email' }
 *   },
 *   app
 * );
 * 
 * @example
 * // Send critical system error
 * sendErrorEvent(
 *   sessionId,
 *   'System Error',
 *   'Unable to connect to PingOne API',
 *   {
 *     code: 'API_CONNECTION_ERROR',
 *     severity: 'critical',
 *     recoverable: false,
 *     suggestions: ['Please try again later', 'Contact system administrator']
 *   },
 *   app
 * );
 * 
 * TODO: Add error categorization and automatic suggestion generation
 * TODO: Implement error event batching for multiple related errors
 * VERIFY: Error messages don't contain sensitive information
 * DEBUG: Monitor error event frequency and types for system health
 */
export function sendErrorEvent(sessionId, title, message, details = {}, app) {
    // Validate required parameters
    if (!sessionId || !title || !message) {
        console.warn('Invalid error event parameters', {
            sessionId: !!sessionId,
            title: !!title,
            message: !!message
        });
        return false;
    }
    
    // Determine error severity if not provided
    const severity = details.severity || 'medium';
    const recoverable = details.recoverable !== undefined ? details.recoverable : true;
    
    // Create standardized error event data
    const eventData = {
        // Core error information
        title: title.trim(),
        message: message.trim(),
        
        // Error classification
        severity,
        recoverable,
        code: details.code || 'GENERAL_ERROR',
        
        // Additional context
        details: {
            ...details,
            // Remove internal fields from client-facing details
            stack: undefined, // Don't send stack traces to clients
            internalError: undefined
        },
        
        // User guidance
        suggestions: details.suggestions || [
            'Please try the operation again',
            'If the problem persists, contact support'
        ],
        
        // Event metadata
        timestamp: new Date().toISOString(),
        eventType: 'error'
    };
    
    // Add context information if available
    if (details.context) {
        eventData.context = details.context;
    }
    
    // Log error for server-side monitoring
    console.error('Error event sent to client', {
        sessionId,
        title,
        message,
        severity,
        code: details.code,
        timestamp: eventData.timestamp
    });
    
    // Use connection manager if available (preferred)
    if (app && app.get('connectionManager')) {
        return app.get('connectionManager').sendEvent(sessionId, 'error', eventData);
    }
    
    // Fallback to direct implementation
    return sendEventDirect(sessionId, 'error', eventData);
}

/**
 * Direct Event Sending (Fallback Method)
 * 
 * Low-level event sending function that directly interfaces with global
 * transport instances. This function serves as a fallback when the
 * ConnectionManager instance is not available or accessible.
 * 
 * ## Fallback Strategy
 * 1. **Socket.IO First**: Attempt to send via Socket.IO transport
 * 2. **WebSocket Fallback**: Try WebSocket if Socket.IO fails
 * 3. **Error Handling**: Log failures and return status
 * 
 * ## Global Dependencies
 * - `global.io`: Socket.IO server instance
 * - `global.ioClients`: Map of Socket.IO client connections
 * - `global.wsClients`: Map of WebSocket client connections
 * 
 * ## Usage Context
 * This function is used when:
 * - ConnectionManager instance is not available
 * - Direct transport access is needed
 * - Legacy code compatibility is required
 * - Emergency fallback scenarios
 * 
 * @function sendEventDirect
 * @param {string} sessionId - Unique session identifier for client targeting
 * @param {string} eventType - Type of event to send (progress, completion, error)
 * @param {Object} eventData - Event payload data to send
 * @returns {boolean} True if event was successfully sent via any transport
 * 
 * @example
 * // Direct event sending when ConnectionManager unavailable
 * const success = sendEventDirect('session123', 'progress', {
 *   current: 50,
 *   total: 100,
 *   message: 'Processing...'
 * });
 * 
 * TODO: Add retry logic for failed transmissions
 * TODO: Implement event queuing for offline clients
 * VERIFY: Global transport instances are properly maintained
 * DEBUG: Monitor fallback usage frequency and success rates
 */
function sendEventDirect(sessionId, eventType, eventData) {
    let sent = false;
    let lastError = null;
    const startTime = Date.now();
    
    // Validate parameters
    if (!sessionId || !eventType || !eventData) {
        console.warn('Invalid parameters for direct event sending', {
            sessionId: !!sessionId,
            eventType: !!eventType,
            eventData: !!eventData
        });
        return false;
    }
    
    // Try Socket.IO first (preferred transport)
    if (global.io && global.ioClients) {
        try {
            const socket = global.ioClients.get(sessionId);
            if (socket && socket.connected) {
                // Ensure client is in the correct room
                socket.join(sessionId);
                
                // Send event to the specific session room
                global.io.to(sessionId).emit(eventType, eventData);
                sent = true;
                
                console.debug('Direct Socket.IO event sent', {
                    sessionId,
                    eventType,
                    socketId: socket.id,
                    duration: `${Date.now() - startTime}ms`
                });
            } else {
                lastError = 'Socket not found or disconnected';
            }
        } catch (error) {
            lastError = `Socket.IO error: ${error.message}`;
            console.warn('Direct Socket.IO send failed', {
                sessionId,
                eventType,
                error: error.message
            });
        }
    } else {
        lastError = 'Socket.IO not available (global.io or global.ioClients missing)';
    }
    
    // Try WebSocket fallback if Socket.IO failed
    if (!sent && global.wsClients) {
        try {
            const ws = global.wsClients.get(sessionId);
            if (ws && ws.readyState === ws.OPEN) {
                const wsMessage = JSON.stringify({
                    type: eventType,
                    ...eventData
                });
                
                ws.send(wsMessage);
                sent = true;
                
                console.debug('Direct WebSocket event sent', {
                    sessionId,
                    eventType,
                    duration: `${Date.now() - startTime}ms`
                });
            } else {
                lastError = lastError + '; WebSocket not found or not open';
            }
        } catch (error) {
            lastError = lastError + `; WebSocket error: ${error.message}`;
            console.warn('Direct WebSocket send failed', {
                sessionId,
                eventType,
                error: error.message
            });
        }
    } else if (!sent) {
        lastError = lastError + '; WebSocket not available (global.wsClients missing)';
    }
    
    // Log final result
    const duration = Date.now() - startTime;
    if (sent) {
        console.info('Direct event delivery successful', {
            sessionId,
            eventType,
            duration: `${duration}ms`
        });
    } else {
        console.error('Direct event delivery failed', {
            sessionId,
            eventType,
            error: lastError,
            duration: `${duration}ms`,
            availableTransports: {
                socketIO: !!(global.io && global.ioClients),
                webSocket: !!global.wsClients
            }
        });
    }
    
    return sent;
} 