/**
 * WebSocket Health Check API Tests
 * 
 * Tests for the WebSocket health check API endpoints to ensure they properly
 * report the status of WebSocket connections and provide detailed statistics.
 * 
 * @version 6.5.2.4
 */

import request from 'supertest';
import express from 'express';
import { WebSocketServer } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import websocketHealthRouter from '../../routes/api/websocket-health.js';

// Mock WebSocket server and Socket.IO server
const mockWebSocketServer = {
    clients: new Set([{}, {}, {}]),
    getHealth: jest.fn().mockReturnValue({
        isHealthy: true,
        activeConnections: 3,
        totalConnections: 10,
        failedConnections: 2,
        uptime: 3600,
        lastError: null
    }),
    maxClients: 100
};

const mockSocketIOServer = {
    engine: {
        clientsCount: 5
    },
    sockets: {
        adapter: {
            rooms: {
                room1: {},
                room2: {}
            }
        }
    },
    middlewares: [{}, {}]
};

// Create Express app for testing
const app = express();
app.set('wss', mockWebSocketServer);
app.set('io', mockSocketIOServer);
app.set('serverState', {
    isInitialized: true,
    pingOneInitialized: true
});
app.use('/api/websocket', websocketHealthRouter);

describe('WebSocket Health Check API', () => {
    test('GET /health should return WebSocket health status', async () => {
        const response = await request(app).get('/api/websocket/health');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('websocket');
        expect(response.body).toHaveProperty('socketio');
        
        // Check WebSocket data
        expect(response.body.websocket).toHaveProperty('active', 3);
        expect(response.body.websocket).toHaveProperty('total', 10);
        expect(response.body.websocket).toHaveProperty('failed', 2);
        
        // Check Socket.IO data
        expect(response.body.socketio).toHaveProperty('status', 'connected');
        expect(response.body.socketio).toHaveProperty('clients', 5);
        expect(response.body.socketio).toHaveProperty('rooms', 2);
    });
    
    test('GET /stats should return detailed WebSocket statistics', async () => {
        const response = await request(app).get('/api/websocket/stats');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('serverVersion', '6.5.2.4');
        expect(response.body).toHaveProperty('serverState');
        expect(response.body).toHaveProperty('websocket');
        expect(response.body).toHaveProperty('socketio');
        
        // Check WebSocket stats
        expect(response.body.websocket).toHaveProperty('clients');
        expect(response.body.websocket).toHaveProperty('clientCount', 3);
        expect(response.body.websocket).toHaveProperty('maxClients', 100);
        
        // Check Socket.IO stats
        expect(response.body.socketio).toHaveProperty('clientsCount', 5);
        expect(response.body.socketio).toHaveProperty('rooms');
        expect(response.body.socketio).toHaveProperty('middlewareCount', 2);
    });
    
    test('POST /reset should require authentication', async () => {
        const response = await request(app).post('/api/websocket/reset');
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('message', 'Authentication required');
    });
    
    test('GET /health should handle missing WebSocket server', async () => {
        // Create app without WebSocket server
        const appWithoutWss = express();
        appWithoutWss.use('/api/websocket', websocketHealthRouter);
        
        const response = await request(appWithoutWss).get('/api/websocket/health');
        
        expect(response.status).toBe(503);
        expect(response.body).toHaveProperty('status', 'critical');
        expect(response.body).toHaveProperty('error', 'WebSocket server not initialized');
    });
    
    test('GET /stats should handle missing WebSocket server', async () => {
        // Create app without WebSocket server
        const appWithoutWss = express();
        appWithoutWss.use('/api/websocket', websocketHealthRouter);
        
        const response = await request(appWithoutWss).get('/api/websocket/stats');
        
        expect(response.status).toBe(503);
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('error', 'WebSocket server not initialized');
    });
    
    test('GET /health should report degraded status when WebSocket is unhealthy', async () => {
        // Create app with unhealthy WebSocket server
        const appWithUnhealthyWss = express();
        appWithUnhealthyWss.set('wss', {
            ...mockWebSocketServer,
            getHealth: jest.fn().mockReturnValue({
                isHealthy: false,
                activeConnections: 0,
                totalConnections: 10,
                failedConnections: 10,
                uptime: 3600,
                lastError: { message: 'Connection error', code: 'ECONNRESET', time: new Date().toISOString() }
            })
        });
        appWithUnhealthyWss.set('io', mockSocketIOServer);
        appWithUnhealthyWss.use('/api/websocket', websocketHealthRouter);
        
        const response = await request(appWithUnhealthyWss).get('/api/websocket/health');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'degraded');
        expect(response.body.websocket).toHaveProperty('failed', 10);
        expect(response.body.websocket).toHaveProperty('lastError');
    });
    
    test('GET /health should report critical status when both WebSocket and Socket.IO are down', async () => {
        // Create app with both services down
        const appWithBothDown = express();
        appWithBothDown.set('wss', {
            ...mockWebSocketServer,
            getHealth: jest.fn().mockReturnValue({
                isHealthy: false,
                activeConnections: 0,
                totalConnections: 10,
                failedConnections: 10,
                uptime: 3600,
                lastError: { message: 'Connection error', code: 'ECONNRESET', time: new Date().toISOString() }
            })
        });
        appWithBothDown.set('io', {
            engine: {
                clientsCount: 0
            }
        });
        appWithBothDown.use('/api/websocket', websocketHealthRouter);
        
        const response = await request(appWithBothDown).get('/api/websocket/health');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'critical');
        expect(response.body.socketio).toHaveProperty('status', 'disconnected');
    });
});

// Integration tests with real server components
describe('WebSocket Health API Integration', () => {
    let server;
    let wss;
    let io;
    let testApp;
    
    beforeAll(() => {
        // Create a test server
        testApp = express();
        server = testApp.listen(0); // Random port
        
        // Create real WebSocket server
        wss = new WebSocketServer({ server });
        
        // Create real Socket.IO server
        io = new SocketIOServer(server);
        
        // Set up the app
        testApp.set('wss', wss);
        testApp.set('io', io);
        testApp.use('/api/websocket', websocketHealthRouter);
    });
    
    afterAll((done) => {
        // Clean up
        io.close();
        wss.close();
        server.close(done);
    });
    
    test('Health endpoint should work with real server components', async () => {
        const response = await request(testApp).get('/api/websocket/health');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('websocket');
        expect(response.body).toHaveProperty('socketio');
    });
    
    test('Stats endpoint should work with real server components', async () => {
        const response = await request(testApp).get('/api/websocket/stats');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('websocket');
        expect(response.body).toHaveProperty('socketio');
        expect(response.body.websocket).toHaveProperty('clientCount');
    });
});
