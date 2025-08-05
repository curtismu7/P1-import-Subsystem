/**
 * Main Server Entry Point - PingOne User Import Tool
 * 
 * This is the primary server file that initializes and configures the Express.js application
 * for the PingOne User Import Tool. It provides a comprehensive web-based interface for
 * managing PingOne user data operations including import, export, and modification.
 */
// Auto-set PingOne environment variables from settings.json on server startup

import fs from 'fs/promises';
import path from 'path';

async function setPingOneEnvVars() {
    try {
        const settingsPath = path.resolve(process.cwd(), 'data/settings.json');
        try {
            await fs.access(settingsPath);
            const settingsRaw = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsRaw);
            process.env.PINGONE_ENVIRONMENT_ID = settings.pingone_environment_id || '';
            process.env.PINGONE_CLIENT_ID = settings.pingone_client_id || '';
            process.env.PINGONE_CLIENT_SECRET = settings.pingone_client_secret || '';
            process.env.PINGONE_REGION = settings.pingone_region || 'NorthAmerica';
            console.warn('[PingOne ENV] Environment variables set from settings.json.');
        } catch {
            console.warn('[PingOne ENV] settings.json not found. Environment variables not set.');
        }
    } catch (error) {
        console.error('[PingOne ENV] Failed to set environment variables from settings.json:', error.message);
        // Do not throw, app should continue working
    }
}

await setPingOneEnvVars();

// Core dependencies
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { Server } from 'socket.io';

// Import services
import { tokenService } from './services/token-service.js';
import { webSocketService } from './services/websocket-service.js';
import { createWinstonLogger } from './winston-config.js';
import { isPortAvailable, findAvailablePort } from './port-checker.js';

// Import routes
import apiRouter from '../routes/api/index.js';
import authRouter from '../routes/auth.js';
import settingsRouter from '../routes/settings.js';
import debugLogRouter from '../routes/api/debug-log.js';
import logsRouter from '../routes/logs.js';
import indexRouter from '../routes/index.js';
import testRunnerRouter from '../routes/test-runner.js';
import importRouter from '../routes/api/import.js';

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize WebSocket service
webSocketService.initialize(server);

// Configure middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create logger
const logger = createWinstonLogger({
    service: 'pingone-import',
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Get server status
        const memoryUsage = process.memoryUsage();
        const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal * 100).toFixed(2);
        
        // Get token status
        const tokenStatus = tokenService.getTokenStatus();
        
        // Prepare response
        const response = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '6.5.2.5',
            uptime: process.uptime(),
            memory: {
                rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
                heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
                heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
                percentUsed: parseFloat(memoryUsagePercent)
            },
            token: {
                hasToken: tokenStatus.hasToken,
                isValid: tokenStatus.isValid,
                expiresIn: tokenStatus.expiresIn,
                environmentId: tokenStatus.environmentId,
                region: tokenStatus.region,
                lastUpdated: tokenStatus.lastUpdated
            },
            checks: {
                memory: memoryUsagePercent < 90 ? 'ok' : 'warn',
                tokenAcquisition: tokenStatus.hasToken ? 'ok' : 'error',
                websocket: webSocketService.io ? 'ok' : 'error'
            }
        };

        res.json(response);
    } catch (error) {
        logger.error('Health check failed', { error: error.message });
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Token management endpoints
app.get('/api/token/status', (req, res) => {
    try {
        const status = tokenService.getTokenStatus();
        res.json(status);
    } catch (error) {
        logger.error('Failed to get token status', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/token/refresh', async (req, res) => {
    try {
        const token = await tokenService.getToken();
        const status = tokenService.getTokenStatus();
        
        // Broadcast the new token status to all clients
        webSocketService.broadcastTokenStatus();
        
        res.json({ 
            success: true,
            expiresIn: status.expiresIn,
            environmentId: status.environmentId,
            region: status.region
        });
    } catch (error) {
        logger.error('Token refresh failed', { error: error.message });
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// API routes
app.use('/api', apiRouter);
app.use('/auth', authRouter);
app.use('/settings', settingsRouter);
app.use('/api/debug', debugLogRouter);
app.use('/logs', logsRouter);
app.use('/test-runner', testRunnerRouter);
app.use('/api/import', importRouter);

// Serve static files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
        url: req.originalUrl,
        method: req.method
    });

    // Broadcast error to connected clients
    webSocketService.broadcastNotification(
        'error',
        'An error occurred',
        { 
            message: err.message,
            requestId: req.id
        }
    );

    res.status(500).json({
        status: 'error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        requestId: req.id
    });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    try {
        // Close WebSocket connections
        webSocketService.stop();
        
        // Close the HTTP server
        server.close(() => {
            logger.info('HTTP server closed');
            process.exit(0);
        });
        
        // Force shutdown after timeout
        setTimeout(() => {
            logger.warn('Forcing shutdown after timeout');
            process.exit(1);
        }, 10000);
        
    } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
    }
};

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
    // Consider whether to crash the process in production
    if (process.env.NODE_ENV === 'production') {
        // In production, we might want to keep the process alive
        // but log the error and potentially restart the failing operation
    } else {
        // In development, crash the process to surface the error
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Consider whether to crash the process in production
    if (process.env.NODE_ENV === 'production') {
        // In production, we might want to keep the process alive
        // but log the error and potentially restart the failing operation
    } else {
        // In development, crash the process to surface the error
        process.exit(1);
    }
});

// Start the server with token acquisition
const startServer = async () => {
    try {
        // Check if port is available
        const port = process.env.PORT || 4000;
        const isAvailable = await isPortAvailable(port);
        
        if (!isAvailable) {
            logger.warn(`Port ${port} is in use. Attempting to find an available port...`);
            const availablePort = await findAvailablePort(port, port + 10);
            
            if (availablePort) {
                logger.info(`Found available port: ${availablePort}`);
                process.env.PORT = availablePort;
            } else {
                logger.error('No available ports found. Please free up some ports and try again.');
                process.exit(1);
            }
        }
        
        // Start the server
        server.listen(process.env.PORT || 4000, async () => {
            const serverUrl = `http://localhost:${process.env.PORT || 4000}`;
            logger.info(`Server is running on ${serverUrl}`);
            
            try {
                // Test token acquisition on startup with retry logic
                const maxRetries = 3;
                let attempt = 0;
                let success = false;
                let lastError = null;
                
                while (attempt < maxRetries && !success) {
                    attempt++;
                    
                    try {
                        // Notify clients of token acquisition attempt
                        webSocketService.broadcastNotification(
                            'info', 
                            `Acquiring PingOne API token (attempt ${attempt}/${maxRetries})...`
                        );
                        
                        // Attempt to get a token
                        const token = await tokenService.getToken();
                        success = true;
                        
                        webSocketService.broadcastNotification(
                            'success', 
                            'Successfully acquired PingOne API token',
                            { 
                                environmentId: tokenService.tokenCache.environmentId,
                                region: tokenService.tokenCache.region,
                                expiresIn: tokenService.getTokenStatus().expiresIn
                            }
                        );
                        
                        logger.info('Successfully acquired PingOne API token');
                        
                    } catch (error) {
                        lastError = error;
                        logger.error(`Token acquisition attempt ${attempt} failed:`, error.message);
                        
                        if (attempt < maxRetries) {
                            // Exponential backoff: 2s, 4s, 8s, etc.
                            const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
                            logger.info(`Retrying in ${delay/1000} seconds...`);
                            
                            // Notify clients of retry
                            webSocketService.broadcastNotification(
                                'warning', 
                                `Token acquisition failed, retrying in ${delay/1000}s (${attempt+1}/${maxRetries})`,
                                { error: error.message }
                            );
                            
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                }
                
                if (!success) {
                    throw lastError || new Error('Failed to acquire token after multiple attempts');
                }
                
            } catch (error) {
                logger.error('Startup token acquisition failed:', error);
                
                // Notify clients of failure
                webSocketService.broadcastNotification(
                    'error', 
                    'Failed to acquire PingOne API token',
                    { 
                        error: error.message,
                        details: 'Check your credentials in Settings and try again.'
                    }
                );
            }
        });
        
    } catch (error) {
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
};

// Start the server
startServer().catch(error => {
    logger.error('Fatal error during server startup', { error: error.message });
    process.exit(1);
});
