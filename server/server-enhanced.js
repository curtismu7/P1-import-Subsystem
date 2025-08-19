#!/usr/bin/env node

/**
 * Enhanced Minimal Server
 * 
 * This server includes essential functionality while avoiding Winston logger issues:
 * - Basic logging (console-based)
 * - Essential API routes (populations, health, status)
 * - WebSocket support
 * - Credential decryption
 * - PingOne environment setup
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple console-based logger
const logger = {
    info: (message) => console.log(`[INFO] ${message}`),
    error: (message, error) => console.error(`[ERROR] ${message}`, error || ''),
    warn: (message) => console.warn(`[WARN] ${message}`),
    debug: (message) => console.log(`[DEBUG] ${message}`)
};

// Simple credential decryption
async function decryptCredential(encryptedValue) {
    if (!encryptedValue || !encryptedValue.startsWith('enc:')) {
        return encryptedValue;
    }
    
    try {
        const envKey = process.env.AUTH_SUBSYSTEM_ENCRYPTION_KEY;
        if (!envKey) {
            throw new Error('No encryption key found');
        }
        
        const key = Buffer.from(envKey.padEnd(32).slice(0, 32));
        const data = encryptedValue.substring(4);
        const parts = data.split(':');
        
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        
        const crypto = await import('crypto');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        logger.error('Decryption failed:', error.message);
        throw new Error('Failed to decrypt credential');
    }
}

// Set up PingOne environment variables
async function setPingOneEnvVars() {
    try {
        const fs = await import('fs/promises');
        const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
        
        if (await fs.access(settingsPath).then(() => true).catch(() => false)) {
            const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
            
            // Set environment variables
            if (settings.pingone_environment_id) {
                process.env.PINGONE_ENVIRONMENT_ID = settings.pingone_environment_id;
                logger.info('[PingOne ENV] Environment ID: Set');
            }
            
            if (settings.pingone_client_id) {
                process.env.PINGONE_CLIENT_ID = settings.pingone_client_id;
                logger.info('[PingOne ENV] Client ID: Set');
            }
            
            if (settings.pingone_client_secret) {
                let clientSecret = settings.pingone_client_secret;
                
                if (clientSecret.startsWith('enc:')) {
                    try {
                        clientSecret = await decryptCredential(clientSecret);
                        logger.info('[PingOne ENV] Successfully decrypted client secret');
                    } catch (decryptError) {
                        logger.error('[PingOne ENV] Failed to decrypt client secret:', decryptError.message);
                        logger.warn('[PingOne ENV] Using encrypted value as-is (may cause API issues)');
                    }
                }
                
                process.env.PINGONE_CLIENT_SECRET = clientSecret;
                logger.info('[PingOne ENV] Client Secret: Set');
            }
            
            if (settings.pingone_region) {
                process.env.PINGONE_REGION = settings.pingone_region;
                logger.info('[PingOne ENV] Region: Set');
            }
            
            logger.info('[PingOne ENV] Environment variables set from settings.json.');
        } else {
            logger.warn('[PingOne ENV] No settings.json found, using environment variables only.');
        }
    } catch (error) {
        logger.error('[PingOne ENV] Error setting environment variables:', error.message);
    }
}

// Create Express app
const app = express();
const server = createServer(app);

// Create Socket.IO server
const io = new SocketIOServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        server: 'enhanced-minimal',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// CSRF Token endpoint
app.get('/api/csrf-token', (req, res) => {
    // Generate a simple CSRF token
    const token = 'csrf-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    res.json({ token });
});

// Settings endpoint
app.get('/api/settings', async (req, res) => {
    try {
        const fs = await import('fs/promises');
        const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
        
        if (await fs.access(settingsPath).then(() => true).catch(() => false)) {
            const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
            
            // Remove sensitive data before sending to client
            const clientSettings = {
                pingone_environment_id: settings.pingone_environment_id || '',
                pingone_client_id: settings.pingone_client_id || '',
                pingone_region: settings.pingone_region || 'NA',
                // Don't send the actual client secret
                has_client_secret: !!settings.pingone_client_secret
            };
            
            res.json(clientSettings);
        } else {
            res.json({
                pingone_environment_id: '',
                pingone_client_id: '',
                pingone_region: 'NA',
                has_client_secret: false
            });
        }
    } catch (error) {
        logger.error('Error loading settings:', error);
        res.status(500).json({
            error: 'Failed to load settings',
            message: error.message
        });
    }
});

// Version endpoint
app.get('/api/version', (req, res) => {
    res.json({
        version: '7.4.6.1',
        server: 'enhanced-minimal',
        build: Date.now(),
        node: process.version
    });
});

// Token status endpoint
app.get('/api/token/status', (req, res) => {
    // Basic token status - in production this would check actual token
    const hasCredentials = !!(process.env.PINGONE_CLIENT_ID && process.env.PINGONE_CLIENT_SECRET);
    
    res.json({
        hasToken: hasCredentials,
        isValid: hasCredentials,
        expiresIn: hasCredentials ? 3600 : 0,
        environmentId: process.env.PINGONE_ENVIRONMENT_ID || null,
        region: process.env.PINGONE_REGION || 'NA',
        lastUpdated: new Date().toISOString()
    });
});

// Token refresh endpoint
app.post('/api/token/refresh', (req, res) => {
    // Basic token refresh - in production this would refresh actual tokens
    const hasCredentials = !!(process.env.PINGONE_CLIENT_ID && process.env.PINGONE_CLIENT_SECRET);
    
    if (hasCredentials) {
        res.json({
            success: true,
            token: 'refreshed-token-' + Date.now(),
            expiresIn: 3600,
            message: 'Token refreshed successfully'
        });
    } else {
        res.status(400).json({
            success: false,
            error: 'No credentials configured',
            message: 'Cannot refresh token without valid credentials'
        });
    }
});

// Populations endpoint (basic implementation)
app.get('/api/populations', async (req, res) => {
    try {
        // For now, return a basic response
        // In production, this would integrate with PingOne API
        res.json({
            populations: [],
            count: 0,
            message: 'Populations endpoint working (basic implementation)'
        });
    } catch (error) {
        logger.error('Error in populations endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Populations cache status endpoint
app.get('/api/populations/cache-status', (req, res) => {
    res.json({
        cached: false,
        lastUpdated: null,
        count: 0,
        status: 'empty'
    });
});

// Basic WebSocket connection handling
io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
    
    // Handle basic events
    socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
    });
    
    // Broadcast server status
    socket.emit('server-status', {
        status: 'connected',
        timestamp: Date.now(),
        server: 'enhanced-minimal'
    });
});

// Start server function
async function startServer() {
    try {
        // Set up PingOne environment
        await setPingOneEnvVars();
        
        const port = process.env.PORT || 4000;
        
        server.listen(port, () => {
            logger.info(`🚀 Enhanced minimal server is running on http://localhost:${port}`);
            logger.info(`📊 Health check: http://localhost:${port}/api/health`);
            logger.info(`📋 Status: http://localhost:${port}/api/status`);
            logger.info(`🔌 WebSocket: ws://localhost:${port}`);
        });
        
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT. Starting graceful shutdown...');
    
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
    
    // Force exit after 5 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 5000);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Starting graceful shutdown...');
    
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

// Start the server
startServer();
