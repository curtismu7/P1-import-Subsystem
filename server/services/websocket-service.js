/**
 * WebSocket Service
 * 
 * Handles real-time communication between server and clients,
 * including token status updates and system notifications.
 */

import { Server } from 'socket.io';
import { serverLogger as logger } from '../winston-config.js';
import { tokenService } from './token-service.js';

class WebSocketService {
    constructor() {
        this.io = null;
        this.clients = new Map();
        this.tokenStatusInterval = null;
    }

    /**
     * Initialize the WebSocket service with an HTTP server
     * @param {http.Server} server - HTTP server instance
     */
    initialize(server) {
        if (this.io) {
            logger.warn('WebSocket service already initialized');
            return;
        }

        this.io = new Server(server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            },
            transports: ['websocket', 'polling'],
            pingInterval: 10000,
            pingTimeout: 5000,
            cookie: false
        });

        this.setupEventHandlers();
        this.startTokenStatusBroadcast();
        
        logger.info('WebSocket service initialized');
    }

    /**
     * Set up WebSocket event handlers
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            const clientId = socket.id;
            this.clients.set(clientId, socket);
            logger.debug(`Client connected: ${clientId}`);

            // Send current token status immediately on connection
            this.sendTokenStatus(socket);

            // Handle disconnection
            socket.on('disconnect', () => {
                this.clients.delete(clientId);
                logger.debug(`Client disconnected: ${clientId}`);
            });

            // Handle token refresh requests
            socket.on('refresh_token', async (callback) => {
                try {
                    logger.debug(`Token refresh requested by client ${clientId}`);
                    const token = await tokenService.getToken();
                    this.broadcastTokenStatus();
                    if (typeof callback === 'function') {
                        callback({ success: true, token });
                    }
                } catch (error) {
                    logger.error('Token refresh failed', { error: error.message, clientId });
                    if (typeof callback === 'function') {
                        callback({ success: false, error: error.message });
                    }
                }
            });
        });
    }

    /**
     * Start broadcasting token status to all connected clients at regular intervals
     */
    startTokenStatusBroadcast(interval = 30000) {
        if (this.tokenStatusInterval) {
            clearInterval(this.tokenStatusInterval);
        }

        this.tokenStatusInterval = setInterval(() => {
            this.broadcastTokenStatus();
        }, interval);

        logger.info(`Started token status broadcast every ${interval}ms`);
    }

    /**
     * Broadcast the current token status to all connected clients
     */
    broadcastTokenStatus() {
        if (!this.io) return;

        const status = this.getTokenStatus();
        this.io.emit('token_status', status);
    }

    /**
     * Send the current token status to a specific socket
     * @param {Socket} socket - The socket to send the status to
     */
    sendTokenStatus(socket) {
        if (!socket) return;
        
        const status = this.getTokenStatus();
        socket.emit('token_status', status);
    }

    /**
     * Get the current token status
     * @returns {Object} Token status information
     */
    getTokenStatus() {
        const tokenStatus = tokenService.getTokenStatus();
        const now = Date.now();
        
        return {
            status: tokenStatus.isValid ? 'valid' : 'invalid',
            expiresIn: tokenStatus.expiresIn,
            environmentId: tokenStatus.environmentId,
            region: tokenStatus.region,
            lastUpdated: tokenStatus.lastUpdated,
            timestamp: now
        };
    }

    /**
     * Broadcast a system notification to all connected clients
     * @param {string} type - Notification type (info, success, warning, error)
     * @param {string} message - Notification message
     * @param {Object} data - Additional data to include
     */
    broadcastNotification(type, message, data = {}) {
        if (!this.io) return;

        const notification = {
            type,
            message,
            timestamp: new Date().toISOString(),
            ...data
        };

        this.io.emit('system_notification', notification);
        logger.info(`Broadcast notification: ${type} - ${message}`, data);
    }

    /**
     * Stop the WebSocket service and clean up resources
     */
    stop() {
        if (this.tokenStatusInterval) {
            clearInterval(this.tokenStatusInterval);
            this.tokenStatusInterval = null;
        }

        if (this.io) {
            this.io.close();
            this.io = null;
        }

        this.clients.clear();
        logger.info('WebSocket service stopped');
    }
}

// Export a singleton instance
export const webSocketService = new WebSocketService();

export default webSocketService;
