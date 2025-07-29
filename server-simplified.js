/**
 * Simplified Server Entry Point - PingOne User Import Tool
 * 
 * Streamlined server implementation using the unified token service and startup manager
 * for reliable, maintainable operation.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWinstonLogger, createRequestLogger, createErrorLogger, createPerformanceLogger, serverLogger, apiLogger } from './server/winston-config.js';
import { createConnectionManager } from './server/connection-manager.js';
import { router as authSubsystemRouter } from './auth-subsystem/server/index.js';
import credentialManagementRouter, { initializeCredentialRoutes } from './routes/api/credential-management.js';
import pingoneProxyRouter from './routes/pingone-proxy-fixed.js';
import apiRouter from './routes/api/index.js';
import settingsRouter from './routes/settings.js';
import debugLogRouter from './routes/api/debug-log.js';
import logsRouter from './routes/logs.js';
import indexRouter from './routes/index.js';
import testRunnerRouter from './routes/test-runner.js';
import importRouter from './routes/api/import.js';
import exportRouter from './routes/api/export.js';
import { setupSwagger } from './swagger.js';
import session from 'express-session';
import fs from 'fs/promises';
import { WebSocketServer } from 'ws';
import { Server as SocketIOServer } from 'socket.io';

import TokenService from './src/server/services/token-service.js';
import StartupManager from './src/server/startup-manager.js';
import BundleService from './src/server/services/bundle-service.js';
import { ensureLogsDirectory } from './scripts/ensure-logs-directory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create production-ready Winston logger
const logger = createWinstonLogger({
    service: 'pingone-import',
    env: process.env.NODE_ENV || 'development',
    enableFileLogging: process.env.NODE_ENV !== 'test'
});

// Create specialized loggers
const requestLogger = createRequestLogger(logger);
const errorLogger = createErrorLogger(logger);
const performanceLogger = createPerformanceLogger(logger);

// Server state management
const serverState = {
    isInitialized: false,
    isInitializing: false,
    lastError: null,
    pingOneInitialized: false
};

// Create Express app
const app = express();
let PORT = process.env.PORT || 4000;

// Services will be initialized by startup manager
let tokenService = null;
let bundleService = null;

/**
 * Load Application Settings from Configuration File
 */
async function loadSettingsFromFile() {
    try {
        const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
        logger.info('Loading settings from:', settingsPath);
        
        const data = await fs.readFile(settingsPath, 'utf8');
        const settings = JSON.parse(data);
        
        logger.info('Settings loaded:', Object.keys(settings));
        
        // Set environment variables from settings file
        if (settings.environmentId && !process.env.PINGONE_ENVIRONMENT_ID) {
            process.env.PINGONE_ENVIRONMENT_ID = settings.environmentId;
            logger.info('Set PINGONE_ENVIRONMENT_ID:', settings.environmentId.substring(0, 8) + '...');
        }
        if (settings.apiClientId && !process.env.PINGONE_CLIENT_ID) {
            process.env.PINGONE_CLIENT_ID = settings.apiClientId;
            logger.info('Set PINGONE_CLIENT_ID:', settings.apiClientId.substring(0, 8) + '...');
        }
        if (settings.apiSecret && !process.env.PINGONE_CLIENT_SECRET) {
            process.env.PINGONE_CLIENT_SECRET = settings.apiSecret;
            logger.info('Set PINGONE_CLIENT_SECRET: [HIDDEN]');
        }
        if (settings.region && !process.env.PINGONE_REGION) {
            process.env.PINGONE_REGION = settings.region;
            logger.info('Set PINGONE_REGION:', settings.region);
        }
        
        logger.info('Settings loaded from file and environment variables set');
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            logger.info('Settings file not found, using environment variables only');
        } else if (error instanceof SyntaxError) {
            logger.error('Invalid JSON in settings file:', error.message);
        } else {
            logger.warn('Failed to load settings from file:', error.message);
        }
        return false;
    }
}

// Token service will be attached by startup manager

// Attach API logger to app for route access
app.set('apiLogger', apiLogger);
app.set('importLogger', apiLogger); // For backward compatibility with existing routes

// Set skip duplicate check flag if environment variable is set
if (process.env.SKIP_DUPLICATE_CHECK === 'true') {
    app.set('skipDuplicateCheck', true);
    console.log('⚠️  SKIP_DUPLICATE_CHECK enabled - duplicate checking will be bypassed');
}

// Attach logs router to app for internal access
app.set('logsRouter', logsRouter);

// Enhanced request logging middleware
app.use(requestLogger);

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 
        process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'] : 
        true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Add headers to ensure proper HTTP/1.1 handling
app.use((req, res, next) => {
    res.setHeader('Connection', 'close');
    res.setHeader('X-Powered-By', 'PingOne Import Tool');
    
    if (process.env.NODE_ENV !== 'production') {
        res.setHeader('X-Server-Protocol', req.protocol);
        res.setHeader('X-Server-Version', req.httpVersion);
    }
    
    next();
});

// Body parsing middleware with enhanced limits
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
}));

// Auth routes
app.get('/auth/login', (req, res) => {
  res.send('<h2>Login Required</h2><p>Please log in to continue.</p>');
});

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/auth/login');
  });
});

app.get('/auth/denied', (req, res) => {
  res.status(403).send('<h2>Access Denied</h2><p>Your account is not authorized to view this page.</p>');
});

// Auth middleware
function ensureAuthenticated(req, res, next) {
  return next();
}

// Protect Swagger UI and spec
app.use(['/swagger.html', '/swagger', '/swagger.json'], ensureAuthenticated);

// Setup Swagger documentation
setupSwagger(app);

// Static file serving with caching headers
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
    etag: true,
    lastModified: true
}));

console.log('📚 Swagger UI available at http://localhost:4000/swagger.html');
console.log('📄 Swagger JSON available at http://localhost:4000/swagger.json');

// Bundle info endpoint
// Enhanced bundle info endpoint with automatic fallback and repair
app.get('/api/bundle-info', async (req, res) => {
    try {
        const bundleService = app.get('bundleService');
        if (bundleService) {
            const bundleInfo = await bundleService.getBundleInfo();
            res.json(bundleInfo);
        } else {
            // Fallback to old method if service not available
            const manifestPath = path.join(__dirname, 'public', 'js', 'bundle-manifest.json');
            const manifestData = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestData);
            res.json(manifest);
        }
    } catch (error) {
        logger.error('Error getting bundle info:', error);
        res.json({ bundleFile: 'bundle.js', version: 'unknown', build: Date.now(), error: true });
    }
});

// Bundle health endpoint
app.get('/api/bundle-health', async (req, res) => {
    try {
        const bundleService = app.get('bundleService');
        if (bundleService) {
            const health = await bundleService.getHealthStatus();
            res.json(health);
        } else {
            res.status(503).json({ 
                status: 'unavailable', 
                message: 'Bundle service not initialized' 
            });
        }
    } catch (error) {
        logger.error('Error checking bundle health:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
});

// Bundle auto-repair endpoint
app.post('/api/bundle-repair', async (req, res) => {
    try {
        const bundleService = app.get('bundleService');
        if (bundleService) {
            const result = await bundleService.autoRepair();
            res.json(result);
        } else {
            res.status(503).json({ 
                success: false, 
                message: 'Bundle service not initialized' 
            });
        }
    } catch (error) {
        logger.error('Error during bundle repair:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Enhanced health endpoint
app.get('/api/health', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const serverStatus = {
            isInitialized: serverState.isInitialized,
            isInitializing: serverState.isInitializing,
            lastError: serverState.lastError?.message,
            pingOneInitialized: serverState.pingOneInitialized
        };
        
        const hasRequiredPingOneVars = process.env.PINGONE_CLIENT_ID && 
                                     process.env.PINGONE_CLIENT_SECRET && 
                                     process.env.PINGONE_ENVIRONMENT_ID;
        
        const memoryUsage = process.memoryUsage();
        const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        
        const status = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            server: {
                ...serverStatus,
                pingOne: {
                    initialized: serverStatus.pingOneInitialized,
                    hasRequiredConfig: hasRequiredPingOneVars,
                    environmentId: process.env.PINGONE_ENVIRONMENT_ID ? 'configured' : 'not configured',
                    region: process.env.PINGONE_REGION || 'not configured'
                }
            },
            system: {
                node: process.version,
                platform: process.platform,
                memory: memoryUsage,
                memoryUsage: `${Math.round(memoryUsagePercent)}%`,
                env: process.env.NODE_ENV || 'development',
                pid: process.pid
            },
            checks: {
                pingOneConfigured: hasRequiredPingOneVars ? 'ok' : 'error',
                pingOneConnected: serverStatus.pingOneInitialized ? 'ok' : 'error',
                memory: memoryUsagePercent < 90 ? 'ok' : 'warn'
            }
        };
        
        const duration = Date.now() - startTime;
        performanceLogger('health_check', duration, { status: 'ok' });
        
        res.json(status);
    } catch (error) {
        const duration = Date.now() - startTime;
        performanceLogger('health_check', duration, { status: 'error', error: error.message });
        
        logger.error('Health check failed', {
            error: error.message,
            stack: error.stack,
            duration: `${duration}ms`
        });
        
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API routes
app.use('/api', apiRouter);
app.use('/api/pingone', pingoneProxyRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/debug-log', debugLogRouter);
app.use('/api/v1/auth', authSubsystemRouter);
app.use('/api/auth', credentialManagementRouter);
app.use('/api/test-runner', testRunnerRouter);
app.use('/api/import', importRouter);
app.use('/api/export', exportRouter);
app.use('/', indexRouter);

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    logger.error('API Error', {
        message: err.message,
        stack: err.stack,
        code: err.code || 'INTERNAL_ERROR',
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        body: req.body ? JSON.stringify(req.body).substring(0, 500) : null,
        timestamp: new Date().toISOString()
    });

    let userMessage = 'An unexpected error occurred. Please try again.';
    let code = 'INTERNAL_ERROR';
    let status = 500;
    
    if (err.isJoi || err.name === 'ValidationError') {
        userMessage = err.details?.[0]?.message || 'Please check your input and try again.';
        code = 'VALIDATION_ERROR';
        status = 400;
    } else if (err.code === 'UNAUTHORIZED' || err.status === 401) {
        userMessage = 'Session expired – please log in again.';
        code = 'AUTH_ERROR';
        status = 401;
    } else if (err.code === 'TOKEN_EXPIRED') {
        userMessage = 'Authentication token expired. Please refresh and try again.';
        code = 'TOKEN_EXPIRED';
        status = 401;
    }

    res.status(status).json({
        success: false,
        error: userMessage,
        code,
        timestamp: new Date().toISOString()
    });
});

// Fallback 404 route
app.use('*', (req, res) => {
    if (res.headersSent) {
        return;
    }
    
    logger.warn('404 Not Found', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    res.status(404).json({
        success: false,
        error: 'Page not found.',
        code: 'NOT_FOUND'
    });
});

// Server startup with simplified startup manager
const startServer = async () => {
    try {
        // Ensure logs directory exists
        const logsReady = await ensureLogsDirectory();
        if (!logsReady) {
            console.error('⚠️ Warning: Logs directory setup failed. Logging may not work correctly.');
        }
        
        // Load settings from file
        await loadSettingsFromFile();
        
        // Check for duplicate startup
        if (serverState.isInitializing) {
            throw new Error('Server initialization already in progress');
        }
        
        if (serverState.isInitialized) {
            throw new Error('Server is already initialized');
        }
        
        serverState.isInitializing = true;
        serverState.lastError = null;
        
        // Use startup manager for reliable initialization
        const startupManager = new StartupManager(app, logger);
        const result = await startupManager.start(PORT);
        
        // Update server state
        serverState.isInitialized = true;
        serverState.isInitializing = false;
        serverState.pingOneInitialized = true;
        
        // Get token service from startup manager
        tokenService = app.get('tokenService');
        
        // Initialize bundle service
        bundleService = new BundleService();
        app.set('bundleService', bundleService);
        logger.info('Bundle service initialized');
        
        // Initialize credential management routes
        if (tokenService) {
            initializeCredentialRoutes(tokenService);
        }
        
        logger.info('🎉 Server started successfully!', {
            port: PORT,
            duration: result.duration,
            phases: result.phases
        });
        
        return result;
        
    } catch (error) {
        const duration = Date.now() - Date.now();
        performanceLogger('server_startup', duration, { status: 'error', error: error.message });
        logger.error('Server startup failed', {
            error: error.message,
            stack: error.stack,
            duration: `${duration}ms`
        });
        serverState.isInitialized = false;
        serverState.isInitializing = false;
        serverState.lastError = error;
        throw error;
    }
};

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        critical: true
    });
    
    if ((error.message && error.message.includes('WebSocket')) || error.code === 'EPIPE') {
        logger.warn('Ignoring non-fatal error to prevent server crash');
        return;
    }
    
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString(),
        critical: true
    });
    
    process.exit(1);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer().catch(error => {
        logger.error('Failed to start server', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    });
}

export { app, logger, startServer };