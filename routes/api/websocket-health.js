/**
 * WebSocket Health Check API Routes
 * 
 * Provides API endpoints for monitoring WebSocket health and status.
 * 
 * @version 6.5.2.4
 */

import express from 'express';

const router = express.Router();

/**
 * @swagger
 * /api/websocket/health:
 *   get:
 *     summary: WebSocket health check endpoint
 *     description: |
 *       Returns comprehensive health status of the WebSocket server and connections.
 *     tags:
 *       - WebSocket
 *     responses:
 *       200:
 *         description: Health check completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, critical]
 *                   description: Overall health status
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Time of the health check
 *                 websocket:
 *                   type: object
 *                   properties:
 *                     active:
 *                       type: integer
 *                       description: Number of active connections
 *                     total:
 *                       type: integer
 *                       description: Total connections since server start
 *                     failed:
 *                       type: integer
 *                       description: Number of failed connections
 *                     uptime:
 *                       type: integer
 *                       description: WebSocket server uptime in seconds
 *                     lastError:
 *                       type: object
 *                       nullable: true
 *                       description: Details of the last error
 *                 socketio:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [connected, disconnected]
 *                       description: Socket.IO connection status
 *                     clients:
 *                       type: integer
 *                       description: Number of connected Socket.IO clients
 *                     rooms:
 *                       type: integer
 *                       description: Number of active Socket.IO rooms
 */
router.get('/health', (req, res) => {
    const app = req.app;
    const wss = app.get('wss');
    const io = app.get('io');
    
    // If WebSocket server is not available
    if (!wss) {
        return res.status(503).json({
            status: 'critical',
            timestamp: new Date().toISOString(),
            error: 'WebSocket server not initialized',
            message: 'The WebSocket server is not available'
        });
    }
    
    // Get WebSocket health data
    const wsHealth = wss.getHealth ? wss.getHealth() : {
        isHealthy: wss.clients && wss.clients.size > 0,
        activeConnections: wss.clients ? wss.clients.size : 0,
        totalConnections: 'unknown',
        failedConnections: 'unknown'
    };
    
    // Get Socket.IO health data
    const socketIoHealth = io ? {
        status: io.engine && io.engine.clientsCount > 0 ? 'connected' : 'disconnected',
        clients: io.engine ? io.engine.clientsCount : 0,
        rooms: io.sockets ? Object.keys(io.sockets.adapter.rooms).length : 0
    } : {
        status: 'unavailable',
        clients: 0,
        rooms: 0
    };
    
    // Determine overall status
    let status = 'healthy';
    
    if (!wsHealth.isHealthy && socketIoHealth.status === 'disconnected') {
        status = 'critical';
    } else if (!wsHealth.isHealthy || socketIoHealth.status === 'disconnected') {
        status = 'degraded';
    }
    
    res.json({
        status,
        timestamp: new Date().toISOString(),
        websocket: {
            active: wsHealth.activeConnections,
            total: wsHealth.totalConnections,
            failed: wsHealth.failedConnections,
            uptime: wsHealth.uptime,
            lastError: wsHealth.lastError
        },
        socketio: socketIoHealth
    });
});

/**
 * @swagger
 * /api/websocket/stats:
 *   get:
 *     summary: WebSocket detailed statistics
 *     description: |
 *       Returns detailed statistics about WebSocket connections and performance.
 *     tags:
 *       - WebSocket
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', (req, res) => {
    const app = req.app;
    const wss = app.get('wss');
    const io = app.get('io');
    const serverState = app.get('serverState') || {};
    
    // If WebSocket server is not available
    if (!wss) {
        return res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: 'WebSocket server not initialized'
        });
    }
    
    // Collect client information
    const clients = [];
    if (wss.clients) {
        wss.clients.forEach(client => {
            clients.push({
                id: client.id,
                isAlive: client.isAlive,
                connectionTime: client.connectionTime,
                lastActivity: client.lastActivity,
                authenticated: client.isAuthenticated || false
            });
        });
    }
    
    res.json({
        timestamp: new Date().toISOString(),
        serverVersion: process.env.npm_package_version || '6.5.2.4',
        serverState: {
            isInitialized: serverState.isInitialized || false,
            pingOneInitialized: serverState.pingOneInitialized || false
        },
        websocket: {
            clients: clients,
            clientCount: clients.length,
            maxClients: wss.maxClients || 'unlimited'
        },
        socketio: io ? {
            clientsCount: io.engine ? io.engine.clientsCount : 0,
            rooms: io.sockets ? Object.keys(io.sockets.adapter.rooms) : [],
            middlewareCount: io.middlewares ? io.middlewares.length : 0
        } : {
            status: 'unavailable'
        }
    });
});

/**
 * @swagger
 * /api/websocket/reset:
 *   post:
 *     summary: Reset WebSocket connections
 *     description: |
 *       Closes all existing WebSocket connections and resets the connection state.
 *     tags:
 *       - WebSocket
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: WebSocket connections reset successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/reset', (req, res) => {
    const app = req.app;
    const wss = app.get('wss');
    
    // Check authentication
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required'
        });
    }
    
    // If WebSocket server is not available
    if (!wss) {
        return res.status(503).json({
            status: 'error',
            message: 'WebSocket server not initialized'
        });
    }
    
    // Close all connections
    let closedCount = 0;
    wss.clients.forEach(client => {
        client.close(1012, 'Server reset requested');
        closedCount++;
    });
    
    res.json({
        status: 'success',
        message: `Reset ${closedCount} WebSocket connections`,
        timestamp: new Date().toISOString()
    });
});

export default router;
