/**
 * WebSocket Bulletproofing Module
 * 
 * Enhances WebSocket connections with additional error handling, timeout configurations,
 * recovery mechanisms, and health monitoring.
 * 
 * @version 6.5.2.4
 */

import { WebSocketServer } from 'ws';
import { createWinstonLogger } from './winston-config.js';

// Create specialized logger for WebSocket operations
const wsLogger = createWinstonLogger({
    service: 'websocket-bulletproof',
    env: process.env.NODE_ENV || 'development',
    enableFileLogging: process.env.NODE_ENV !== 'test'
});

// Configuration with sensible defaults
const DEFAULT_CONFIG = {
    connectionTimeout: 10000,        // 10 seconds
    pingInterval: 30000,             // 30 seconds
    pongTimeout: 5000,               // 5 seconds
    reconnectAttempts: 5,            // Number of reconnection attempts
    reconnectDelay: 1000,            // Initial delay between reconnection attempts (ms)
    reconnectBackoff: 1.5,           // Exponential backoff factor
    maxReconnectDelay: 30000,        // Maximum delay between reconnection attempts (ms)
    healthCheckInterval: 60000,      // 1 minute
    logLevel: 'info'
};

/**
 * Creates an enhanced WebSocket server with bulletproofing features
 * 
 * @param {Object} server - HTTP/HTTPS server instance
 * @param {Object} options - Configuration options
 * @returns {WebSocketServer} Enhanced WebSocket server
 */
export function createBulletproofWebSocketServer(server, options = {}) {
    const config = { ...DEFAULT_CONFIG, ...options };
    
    // Create WebSocket server
    const wss = new WebSocketServer({ 
        server,
        clientTracking: true,
        perMessageDeflate: true
    });
    
    // Track connection state
    const connectionState = {
        totalConnections: 0,
        activeConnections: 0,
        failedConnections: 0,
        lastError: null,
        isHealthy: true,
        startTime: Date.now()
    };
    
    // Set up connection monitoring
    const heartbeat = setInterval(() => {
        wss.clients.forEach(client => {
            if (client.isAlive === false) {
                wsLogger.warn('Terminating inactive client connection', {
                    clientId: client.id,
                    lastActivity: client.lastActivity
                });
                return client.terminate();
            }
            
            client.isAlive = false;
            client.ping();
        });
        
        // Update health status
        connectionState.isHealthy = connectionState.failedConnections < connectionState.totalConnections * 0.1;
        
        // Log connection statistics
        wsLogger.info('WebSocket connection statistics', {
            total: connectionState.totalConnections,
            active: connectionState.activeConnections,
            failed: connectionState.failedConnections,
            healthy: connectionState.isHealthy,
            uptime: Math.floor((Date.now() - connectionState.startTime) / 1000)
        });
    }, config.healthCheckInterval);
    
    // Handle server errors
    wss.on('error', (error) => {
        connectionState.lastError = error;
        wsLogger.error('WebSocket server error', {
            error: error.message,
            code: error.code,
            stack: error.stack
        });
    });
    
    // Handle new connections
    wss.on('connection', (ws, req) => {
        // Initialize connection tracking
        ws.id = req.headers['sec-websocket-key'] || `client-${connectionState.totalConnections}`;
        ws.isAlive = true;
        ws.lastActivity = Date.now();
        ws.connectionTime = Date.now();
        
        // Update connection statistics
        connectionState.totalConnections++;
        connectionState.activeConnections++;
        
        wsLogger.info('WebSocket client connected', {
            clientId: ws.id,
            ip: req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            activeConnections: connectionState.activeConnections
        });
        
        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
            if (!ws.isAuthenticated) {
                wsLogger.warn('WebSocket connection timeout - not authenticated', {
                    clientId: ws.id,
                    connectionTime: ws.connectionTime
                });
                ws.close(1008, 'Connection timeout - not authenticated');
            }
        }, config.connectionTimeout);
        
        // Handle pong responses
        ws.on('pong', () => {
            ws.isAlive = true;
            ws.lastActivity = Date.now();
        });
        
        // Handle client messages
        ws.on('message', (message) => {
            try {
                ws.lastActivity = Date.now();
                
                // Process message (implementation depends on application logic)
                // ...
                
            } catch (error) {
                wsLogger.error('Error processing WebSocket message', {
                    clientId: ws.id,
                    error: error.message,
                    stack: error.stack
                });
                
                // Send error response to client
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Failed to process message',
                    code: 'PROCESS_ERROR'
                }));
            }
        });
        
        // Handle connection close
        ws.on('close', (code, reason) => {
            connectionState.activeConnections--;
            
            if (code !== 1000) {
                connectionState.failedConnections++;
                wsLogger.warn('WebSocket connection closed abnormally', {
                    clientId: ws.id,
                    code,
                    reason: reason.toString(),
                    duration: Date.now() - ws.connectionTime
                });
            } else {
                wsLogger.info('WebSocket connection closed normally', {
                    clientId: ws.id,
                    code,
                    reason: reason.toString(),
                    duration: Date.now() - ws.connectionTime
                });
            }
            
            // Clear connection timeout if it exists
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
            }
        });
        
        // Handle connection errors
        ws.on('error', (error) => {
            wsLogger.error('WebSocket client error', {
                clientId: ws.id,
                error: error.message,
                code: error.code,
                stack: error.stack
            });
            
            // Update error statistics
            connectionState.lastError = error;
            
            // Don't increment failed connections here as the close event will handle it
        });
    });
    
    // Clean up on server close
    wss.on('close', () => {
        clearInterval(heartbeat);
        wsLogger.info('WebSocket server closed');
    });
    
    // Add health check method
    wss.getHealth = () => {
        return {
            isHealthy: connectionState.isHealthy,
            activeConnections: connectionState.activeConnections,
            totalConnections: connectionState.totalConnections,
            failedConnections: connectionState.failedConnections,
            uptime: Math.floor((Date.now() - connectionState.startTime) / 1000),
            lastError: connectionState.lastError ? {
                message: connectionState.lastError.message,
                code: connectionState.lastError.code,
                time: connectionState.lastError.time
            } : null
        };
    };
    
    return wss;
}

/**
 * Creates an enhanced Socket.IO configuration with bulletproofing features
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} Enhanced Socket.IO configuration
 */
export function createBulletproofSocketIOConfig(options = {}) {
    const config = { ...DEFAULT_CONFIG, ...options };
    
    return {
        path: '/socket.io',
        serveClient: true,
        wsEngine: WebSocketServer,
        pingTimeout: config.pongTimeout,
        pingInterval: config.pingInterval,
        connectTimeout: config.connectionTimeout,
        transports: ['websocket', 'polling'],
        allowUpgrades: true,
        upgradeTimeout: 10000,
        maxHttpBufferSize: 1e6, // 1MB
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        // Retry logic
        reconnectionAttempts: config.reconnectAttempts,
        reconnectionDelay: config.reconnectDelay,
        reconnectionDelayMax: config.maxReconnectDelay,
        randomizationFactor: 0.5
    };
}

/**
 * Health check endpoint for WebSocket status
 * 
 * @param {WebSocketServer} wss - WebSocket server instance
 * @returns {Function} Express middleware for health check
 */
export function createWebSocketHealthCheck(wss) {
    return (req, res) => {
        const health = wss.getHealth();
        
        res.json({
            status: health.isHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            websocket: {
                active: health.activeConnections,
                total: health.totalConnections,
                failed: health.failedConnections,
                uptime: health.uptime,
                lastError: health.lastError
            }
        });
    };
}

export default {
    createBulletproofWebSocketServer,
    createBulletproofSocketIOConfig,
    createWebSocketHealthCheck
};
