/**
 * Main Server Entry Point - PingOne User Import Tool
 * 
 * This is the primary server file that initializes and configures the Express.js application
 * for the PingOne User Import Tool. It provides a comprehensive web-based interface for
 * managing PingOne user data operations including import, export, and modification.
 * 
 * ## Core Functionality
 * - Express.js server setup with production-ready middleware
 * - PingOne API integration and authentication management
 * - Real-time progress tracking via WebSocket/Socket.IO
 * - Comprehensive logging and error handling
 * - API endpoint routing and request processing
 * - Static file serving for frontend application
 * - Health monitoring and system diagnostics
 * 
 * ## Architecture Components
 * - **Authentication**: Enhanced server authentication with token management
 * - **Middleware**: CORS, body parsing, request logging, error handling
 * - **Routing**: Modular API routes for different operations
 * - **Logging**: Winston-based structured logging with multiple transports
 * - **Error Handling**: Centralized error processing with user-friendly messages
 * - **Health Checks**: Comprehensive system health monitoring
 * - **Port Management**: Automatic port conflict resolution
 * 
 * ## Environment Configuration
 * The server loads configuration from multiple sources:
 * - Environment variables (.env file)
 * - Settings file (data/settings.json)
 * - Command line arguments
 * - Default fallback values
 * 
 * ## Production Features
 * - Startup optimization with caching
 * - Performance monitoring and metrics
 * - Graceful shutdown handling
 * - Process management and monitoring
 * - Security headers and CORS configuration
 * 
 * ## Development Features
 * - Hot reloading support
 * - Detailed debug logging
 * - Swagger API documentation
 * - Development-specific error messages
 * 
 * @fileoverview Main server entry point for PingOne Import Tool
 * @author PingOne Import Tool Team
 * @version 6.5.2.4
 * @since 1.0.0
 * 
 * @requires express Express.js web framework
 * @requires cors Cross-Origin Resource Sharing middleware
 * @requires winston Logging library
 * @requires socket.io Real-time communication
 * 
 * @example
 * // Start server in development mode
 * npm run dev
 * 
 * @example
 * // Start server in production mode
 * npm start
 * 
 * @example
 * // Start server with custom port
 * PORT=3000 npm start
 * 
 * TODO: Add rate limiting middleware for production
 * TODO: Implement request caching for frequently accessed endpoints
 * VERIFY: Port conflict resolution works correctly in all environments
 * DEBUG: Monitor memory usage during large file operations
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWinstonLogger, createRequestLogger, createErrorLogger, createPerformanceLogger, serverLogger, apiLogger } from './server/winston-config.js';
import { createConnectionManager } from './server/connection-manager.js';
import { router as authSubsystemRouter, pingOneAuth } from './auth-subsystem/server/index.js';
import EnhancedServerAuth from './auth-subsystem/server/enhanced-server-auth.js';
import credentialManagementRouter, { initializeCredentialRoutes } from './routes/api/credential-management.js';
import { 
    isPortAvailable, 
    findAvailablePort, 
    getProcessesUsingPort, 
    killProcessesUsingPort, 
    generatePortConflictMessage, 
    resolvePortConflict, 
    checkPortStatus 
} from './server/port-checker.js';
import pingoneProxyRouter from './routes/pingone-proxy-fixed.js';
import { runStartupTokenTest } from './server/startup-token-test.js';
import apiRouter from './routes/api/index.js';
import settingsRouter from './routes/settings.js';
import debugLogRouter from './routes/api/debug-log.js';
import logsRouter from './routes/logs.js';
import indexRouter from './routes/index.js';
import testRunnerRouter from './routes/test-runner.js';
import importRouter from './routes/api/import.js';
import exportRouter from './routes/api/export.js';
import { setupSwagger } from './swagger-modern.js';
import session from 'express-session';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version: appVersion } = require('./package.json');
import { WebSocketServer } from 'ws';
import { Server as SocketIOServer } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load Application Settings from Configuration File
 * 
 * Loads PingOne API configuration from the settings.json file and sets corresponding
 * environment variables. This function provides a centralized way to manage configuration
 * that persists across server restarts and can be modified through the web interface.
 * 
 * ## Configuration Sources Priority
 * 1. Environment variables (highest priority)
 * 2. Settings file (data/settings.json)
 * 3. Default values (lowest priority)
 * 
 * ## Settings File Format
 * The settings.json file should contain:
 * - `environmentId`: PingOne environment identifier
 * - `apiClientId`: PingOne API client ID
 * - `apiSecret`: PingOne API client secret
 * - `region`: PingOne region (NorthAmerica, Europe, AsiaPacific, Canada)
 * 
 * ## Security Considerations
 * - API secrets are logged as [HIDDEN] for security
 * - Only partial client IDs and environment IDs are logged
 * - File permissions should restrict access to sensitive data
 * 
 * ## Error Handling
 * - Missing file: Returns false, server continues with env vars only
 * - Invalid JSON: Logs warning, returns false
 * - Partial settings: Loads available settings, continues operation
 * 
 * @async
 * @function loadSettingsFromFile
 * @returns {Promise<boolean>} True if settings loaded successfully, false otherwise
 * 
 * @throws {Error} File system errors (handled internally)
 * @throws {SyntaxError} JSON parsing errors (handled internally)
 * 
 * @example
 * // Settings file structure
 * {
 *   "environmentId": "12345678-1234-1234-1234-123456789012",
 *   "apiClientId": "abcd1234-5678-90ef-ghij-klmnopqrstuv",
 *   "apiSecret": "your-secret-key-here",
 *   "region": "NorthAmerica"
 * }
 * 
 * @example
 * // Usage in server startup
 * const settingsLoaded = await loadSettingsFromFile();
 * if (!settingsLoaded) {
 *   logger.warn('Using environment variables only');
 * }
 * 
 * TODO: Add settings validation schema
 * TODO: Implement settings encryption for sensitive data
 * VERIFY: File permissions are correctly set in production
 * DEBUG: Monitor settings loading performance
 */
async function loadSettingsFromFile() {
    try {
        const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
        logger.info('Loading settings from:', settingsPath);
        
        const data = await fs.readFile(settingsPath, 'utf8');
        const settings = JSON.parse(data);
        
        logger.info('Settings loaded:', Object.keys(settings));
        
        // Set environment variables from settings file
        // Only set if not already defined in environment (env vars take precedence)
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
        // Handle specific error types for better debugging
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

// Import startup optimizer for production-ready initialization
import startupOptimizer from './src/server/services/startup-optimizer.js';
import { getErrorHandler } from './src/shared/error-handler.js';

// Initialize centralized error handling
const errorHandler = getErrorHandler({
    enableAnalytics: true,
    enableUserNotification: false // Server-side, no user notifications
});

// Use pingOneAuth from auth subsystem for token management
// This replaces the legacy TokenManager with the new auth subsystem
const tokenManager = pingOneAuth;

// Initialize Enhanced Server Authentication
const enhancedAuth = new EnhancedServerAuth(logger);

// Initialize credential management routes with enhanced auth
initializeCredentialRoutes(enhancedAuth);

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

// Attach token manager to app for route access
app.set('tokenManager', tokenManager);

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
    // Force HTTP/1.1 for compatibility
    res.setHeader('Connection', 'close');
    res.setHeader('X-Powered-By', 'PingOne Import Tool');
    
    // Add debugging headers in development
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

// --- Auth routes ---
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

// --- Auth middleware ---
function ensureAuthenticated(req, res, next) {
  // No authentication required for now, as Google OAuth is removed
  return next();
}

// --- Protect Swagger UI and spec ---
app.use(['/swagger.html', '/swagger', '/swagger.json'], ensureAuthenticated);

// Setup Swagger documentation
setupSwagger(app);

// Static file serving with caching headers
app.use(express.static(path.join(__dirname, 'public'), {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        const fileExt = path.extname(filePath);
        if (fileExt === '.html' || filePath.includes('bundle-')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache other assets for 1 day
        }
    }
}));

console.log('📚 Swagger UI available at http://localhost:4000/swagger.html');
console.log('📄 Swagger JSON available at http://localhost:4000/swagger.json');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: |
 *       Returns comprehensive health status of the server and all services.
 *       This endpoint provides detailed information about server state, PingOne connectivity,
 *       system resources, and various health checks.
 *       
 *       ## Health Checks
 *       - **Server Status**: Initialization state and last errors
 *       - **PingOne Connectivity**: API credentials and connection status
 *       - **System Resources**: Memory usage, uptime, and performance metrics
 *       - **Environment**: Node.js version, platform, and configuration
 *       
 *       ## Usage
 *       - Use for monitoring and alerting systems
 *       - Check before performing critical operations
 *       - Monitor system resource usage
 *       
 *       ## Response Details
 *       - `status`: Overall health status ('ok' or 'error')
 *       - `server`: Server initialization and PingOne connection status
 *       - `system`: Node.js version, memory usage, and platform info
 *       - `checks`: Individual health check results
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Health check completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: "ok"
 *               timestamp: "2025-07-12T15:35:29.053Z"
 *               uptime: 5.561143042
 *               server:
 *                 isInitialized: true
 *                 isInitializing: false
 *                 pingOneInitialized: true
 *                 pingOne:
 *                   initialized: true
 *                   hasRequiredConfig: true
 *                   environmentId: "configured"
 *                   region: "NorthAmerica"
 *               system:
 *                 node: "v22.16.0"
 *                 platform: "darwin"
 *                 memory:
 *                   rss: 105086976
 *                   heapTotal: 38617088
 *                   heapUsed: 22732848
 *                 memoryUsage: "59%"
 *                 env: "development"
 *                 pid: 3317
 *               checks:
 *                 pingOneConfigured: "ok"
 *                 pingOneConnected: "ok"
 *                 memory: "ok"
 *       500:
 *         description: Health check failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: "error"
 *               error: "Health check failed"
 *               timestamp: "2025-07-12T15:35:29.053Z"
 */
// Endpoint to get the application version
app.get('/api/version', (req, res) => {
    res.json({ version: appVersion });
});

// Endpoint to get the latest bundle filename for cache-busting
app.get('/api/bundle-info', async (req, res) => {
    try {
        const manifestPath = path.join(__dirname, 'public', 'js', 'bundle-manifest.json');
        const manifestData = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestData);
        res.json(manifest);
    } catch (error) {
        logger.error('Failed to read bundle manifest', { error: error.message });
        res.status(500).json({ error: 'Could not retrieve bundle information.' });
    }
});

// PRODUCTION HEALTH CHECK: Enhanced health endpoint with startup optimizer status
app.get('/api/health', async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Get server status
        const serverStatus = {
            isInitialized: serverState.isInitialized,
            isInitializing: serverState.isInitializing,
            lastError: serverState.lastError?.message,
            pingOneInitialized: serverState.pingOneInitialized
        };
        
        // Check PingOne environment variables
        const hasRequiredPingOneVars = process.env.PINGONE_CLIENT_ID && 
                                     process.env.PINGONE_CLIENT_SECRET && 
                                     process.env.PINGONE_ENVIRONMENT_ID;
        
        // Get system metrics
        const memoryUsage = process.memoryUsage();
        const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        
        // PRODUCTION ENHANCEMENT: Include startup optimizer status
        const optimizerHealth = startupOptimizer.getHealthStatus();
        
        const status = {
            status: optimizerHealth.status === 'healthy' ? 'ok' : 'degraded',
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
            optimization: {
                status: optimizerHealth.status,
                isInitialized: optimizerHealth.isInitialized,
                tokenCached: optimizerHealth.tokenValid,
                populationsCached: optimizerHealth.populationsCached
            },
            checks: {
                pingOneConfigured: hasRequiredPingOneVars ? 'ok' : 'error',
                pingOneConnected: serverStatus.pingOneInitialized ? 'ok' : 'error',
                memory: memoryUsagePercent < 90 ? 'ok' : 'warn',
                startupOptimization: optimizerHealth.status === 'healthy' ? 'ok' : 'warn'
            }
        };
        
        const duration = Date.now() - startTime;
        performanceLogger('health_check', duration, { status: 'ok' });
        
        logger.info('Health check completed', {
            duration: `${duration}ms`,
            status: 'ok',
            checks: status.checks
        });
        
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

// PRODUCTION ENDPOINT: Cache refresh endpoint for manual cache management
app.post('/api/cache/refresh', async (req, res) => {
    try {
        logger.info('🔄 Manual cache refresh requested', {
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
        
        const result = await startupOptimizer.refreshCache();
        
        if (result.success) {
            logger.info('✅ Cache refresh completed successfully');
            res.json({
                success: true,
                message: 'Cache refreshed successfully',
                timestamp: new Date().toISOString()
            });
        } else {
            logger.error('❌ Cache refresh failed', { error: result.error });
            res.status(500).json({
                success: false,
                error: result.error,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        logger.error('❌ Cache refresh endpoint error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Cache refresh failed',
            timestamp: new Date().toISOString()
        });
    }
});

// API routes with enhanced logging
app.use('/api', apiRouter);
app.use('/api/pingone', pingoneProxyRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/v1/settings', settingsRouter); // Added to support /api/v1/settings
app.use('/api/v1/auth', authSubsystemRouter);
app.use('/api/auth', credentialManagementRouter);
app.use('/api/test-runner', testRunnerRouter);
app.use('/api/import', importRouter);
app.use('/', indexRouter);

// Enhanced error handling middleware (structured, safe, Winston-logged)
app.use((err, req, res, next) => {
    // Log full error details with Winston
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

    // Determine safe, actionable message for user
    let userMessage = 'An unexpected error occurred. Please try again.';
    let code = 'INTERNAL_ERROR';
    let status = 500;
    
    // Handle specific error types with user-friendly messages
    if (err.isJoi || err.name === 'ValidationError') {
        userMessage = err.details?.[0]?.message || 'Please check your input and try again.';
        code = 'VALIDATION_ERROR';
        status = 400;
    } else if (err.code === 'UNAUTHORIZED' || err.status === 401) {
        userMessage = 'Session expired – please log in again.';
        code = 'AUTH_ERROR';
        status = 401;
    } else if (err.code === 'FORBIDDEN' || err.status === 403) {
        userMessage = 'Access denied. Please check your permissions.';
        code = 'FORBIDDEN';
        status = 403;
    } else if (err.code === 'NOT_FOUND' || err.status === 404) {
        userMessage = 'Resource not found. Please check your settings.';
        code = 'NOT_FOUND';
        status = 404;
    } else if (err.code === 'RATE_LIMIT' || err.status === 429) {
        userMessage = 'Too many requests. Please wait a moment and try again.';
        code = 'RATE_LIMIT';
        status = 429;
    } else if (err.code === 'MAINTENANCE') {
        userMessage = 'Service is temporarily unavailable for maintenance.';
        code = 'MAINTENANCE';
        status = 503;
    } else if (err.code === 'TIMEOUT') {
        userMessage = 'Request timed out. Please try again.';
        code = 'TIMEOUT';
        status = 408;
    } else if (err.code === 'NETWORK_ERROR') {
        userMessage = 'Network error. Please check your connection.';
        code = 'NETWORK_ERROR';
        status = 503;
    } else if (err.code === 'FILE_TOO_LARGE') {
        userMessage = 'File is too large. Please use a smaller file.';
        code = 'FILE_TOO_LARGE';
        status = 413;
    } else if (err.code === 'INVALID_FILE_TYPE') {
        userMessage = 'Invalid file type. Please use a CSV file.';
        code = 'INVALID_FILE_TYPE';
        status = 400;
    } else if (err.code === 'POPULATION_NOT_FOUND') {
        userMessage = 'Selected population not found. Please check your settings.';
        code = 'POPULATION_NOT_FOUND';
        status = 404;
    } else if (err.code === 'TOKEN_EXPIRED') {
        userMessage = 'Authentication token expired. Please refresh and try again.';
        code = 'TOKEN_EXPIRED';
        status = 401;
    } else if (err.expose && err.message) {
        userMessage = err.message;
        code = err.code || 'ERROR';
        status = err.status || 400;
    }

    // Send structured error response
    res.status(status).json({
        success: false,
        error: userMessage,
        code,
        timestamp: new Date().toISOString()
    });
});

// Fallback 404 route (with status message)
app.use('*', (req, res) => {
    // Check if response has already been sent
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

// Global error handler
app.use(async (err, req, res, next) => {
    // Check if response has already been sent
    if (res.headersSent) {
        return next(err);
    }
    
    // Log the error with full context
    logger.error('Unhandled application error', {
        error: err.message,
        stack: err.stack,
        code: err.code,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        body: req.body ? JSON.stringify(req.body).substring(0, 500) : null,
        timestamp: new Date().toISOString()
    });
    
    // Update server state
    serverState.lastError = err;
    
    // Send error response
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        status: err.status || 500,
        timestamp: new Date().toISOString()
    });
});

// Import the logs directory check
import { ensureLogsDirectory } from './scripts/ensure-logs-directory.js';

// Version constant for DRYness
const APP_VERSION = '6.5.1.4';

// Server startup with enhanced logging
const startServer = async () => {
    const startTime = Date.now();
    
    try {
        // Ensure logs directory exists and is writable before starting server
        const logsReady = await ensureLogsDirectory();
        if (!logsReady) {
            console.error('⚠️ Warning: Logs directory setup failed. Logging may not work correctly.');
        }
        
        logger.info('Starting server initialization', {
            port: PORT,
            env: process.env.NODE_ENV || 'development',
            pid: process.pid
        });
        
        // Also log to server.log
        serverLogger.info('Server initialization started', {
            port: PORT,
            env: process.env.NODE_ENV || 'development',
            pid: process.pid
        });
        
        if (serverState.isInitializing) {
            throw new Error('Server initialization already in progress');
        }
        
        if (serverState.isInitialized) {
            throw new Error('Server is already initialized');
        }
        
        serverState.isInitializing = true;
        serverState.lastError = null;
        
        // Load settings from file at startup
        await loadSettingsFromFile();
        
        // PRODUCTION OPTIMIZATION: Initialize startup optimizer
        logger.info('🚀 Initializing startup optimizations...');
        const optimizationResult = await startupOptimizer.initialize();
        
        if (optimizationResult.success) {
            logger.info('✅ Startup optimization completed', {
                duration: optimizationResult.duration,
                tokenCached: optimizationResult.tokenCached,
                populationsCached: optimizationResult.populationsCached
            });
        } else {
            logger.warn('⚠️ Startup optimization failed', {
                reason: optimizationResult.reason || optimizationResult.error,
                duration: optimizationResult.duration
            });
        }
        
        // Initialize Enhanced Server Authentication System
        logger.info('🚀 Initializing Enhanced Server Authentication System...');
        try {
            const authResult = await enhancedAuth.initializeOnStartup();
            
            if (authResult.success) {
                serverState.pingOneInitialized = true;
                logger.info('✅ Enhanced authentication initialized successfully', {
                    credentialSource: authResult.credentialSource,
                    environmentId: authResult.environmentId,
                    tokenExpiresAt: authResult.expiresAt
                });
                
                // Also initialize the legacy token manager for backward compatibility
                try {
                    await tokenManager.getAccessToken();
                    logger.info('Legacy token manager initialized successfully');
                } catch (legacyError) {
                    logger.warn('Legacy token manager initialization failed, but enhanced auth is working', {
                        error: legacyError.message
                    });
                }
                
                // Perform startup token validation test
                logger.info('🔍 Performing startup token validation test...');
                try {
                    const tokenInfo = tokenManager.getTokenInfo();
                    if (tokenInfo && tokenInfo.isValid) {
                        const timeUntilExpiry = Math.floor((tokenInfo.expiresAt - Date.now()) / 1000 / 60);
                        logger.info('✅ Startup token validation passed', {
                            tokenType: tokenInfo.tokenType,
                            expiresInMinutes: timeUntilExpiry,
                            isValid: tokenInfo.isValid
                        });
                        console.log(`✅ Token validation: PASSED (expires in ${timeUntilExpiry} minutes)`);
                    } else {
                        logger.warn('⚠️ Startup token validation: No valid token found');
                        console.log('⚠️ Token validation: No valid token available');
                    }
                } catch (tokenValidationError) {
                    logger.warn('⚠️ Startup token validation failed', {
                        error: tokenValidationError.message
                    });
                    console.log('⚠️ Token validation: FAILED -', tokenValidationError.message);
                }
            } else {
                serverState.pingOneInitialized = false;
                logger.error('❌ Enhanced authentication initialization failed', {
                    error: authResult.error,
                    recommendations: authResult.recommendations
                });
                
                // Log setup recommendations for the user
                if (authResult.recommendations) {
                    logger.info('📋 Setup Recommendations:');
                    authResult.recommendations.forEach((rec, index) => {
                        logger.info(`   ${index + 1}. ${rec}`);
                    });
                }
            }
        } catch (error) {
            logger.error('Failed to initialize Enhanced Server Authentication', {
                error: error.message,
                code: error.code,
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            });
            serverState.pingOneInitialized = false;
        }
        
        // Check port availability before starting server
        logger.info('Checking port availability', { port: PORT });
        
        const portStatus = await checkPortStatus(PORT);
        if (!portStatus.isAvailable) {
            logger.error('Port conflict detected during startup', {
                port: PORT,
                processes: portStatus.processes
            });
            
            console.log(portStatus.message);
            
            // Try to resolve port conflict automatically
            try {
                const resolvedPort = await resolvePortConflict(PORT, {
                    autoKill: process.env.AUTO_KILL_PORT === 'true',
                    findAlternative: true,
                    maxAttempts: 5
                });
                
                if (resolvedPort !== PORT) {
                    logger.info('Using alternative port', { 
                        originalPort: PORT, 
                        newPort: resolvedPort 
                    });
                    console.log(`\n🔄 Using alternative port: ${resolvedPort}`);
                    PORT = resolvedPort;
                }
            } catch (error) {
                logger.error('Failed to resolve port conflict', {
                    error: error.message,
                    port: PORT
                });
                
                serverState.isInitialized = false;
                serverState.isInitializing = false;
                serverState.lastError = error;
                
                if (process.env.NODE_ENV === 'production') {
                    process.exit(1);
                } else {
                    throw error;
                }
            }
        }
        
        // Start server with enhanced port conflict handling
        const server = app.listen(PORT, '127.0.0.1', () => {
            const duration = Date.now() - startTime;
            const url = `http://127.0.0.1:${PORT}`;
            
            serverState.isInitialized = true;
            serverState.isInitializing = false;
            
            performanceLogger('server_startup', duration, { url });
            
            logger.info('Server started successfully', {
                url,
                port: PORT,
                pid: process.pid,
                node: process.version,
                platform: process.platform,
                env: process.env.NODE_ENV || 'development',
                appVersion: APP_VERSION,
                pingOneInitialized: serverState.pingOneInitialized,
                duration: `${duration}ms`,
                critical: true
            });
            
            // Console output for development
            if (process.env.NODE_ENV !== 'production') {
                console.log('\n🚀 Server started successfully!');
                console.log('='.repeat(60));
                console.log(`   URL: ${url}`);
                console.log(`   PID: ${process.pid}`);
                console.log(`   Node: ${process.version}`);
                console.log(`   Platform: ${process.platform}`);
                console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
                console.log(`   Version: ${APP_VERSION}`);
                console.log(`   PingOne: ${serverState.pingOneInitialized ? '✅ Connected' : '⚠️  Not connected'}`);
                console.log(`   📚 Swagger UI: ${url}/swagger.html`);
                console.log(`   📄 Swagger JSON: ${url}/swagger.json`);
                console.log('='.repeat(60) + '\n');
                
                // Test PingOne token acquisition at startup
                setTimeout(async () => {
                    try {
                        await runStartupTokenTest(logger);
                    } catch (error) {
                        logger.error('Startup token test failed:', error);
                    }
                }, 1000); // Wait 1 second for server to fully initialize
            }
        }).on('error', async (error) => {
            if (error.code === 'EADDRINUSE') {
                const processes = await getProcessesUsingPort(PORT);
                const errorMessage = generatePortConflictMessage(PORT, processes);
                
                logger.error('Port conflict detected during server startup', {
                    port: PORT,
                    error: error.message,
                    processes: processes.map(p => ({ pid: p.pid, command: p.command }))
                });
                
                console.log(errorMessage);
            } else {
                logger.error('Server startup error', {
                    error: error.message,
                    code: error.code,
                    stack: error.stack
                });
            }
            
            serverState.isInitialized = false;
            serverState.isInitializing = false;
            serverState.lastError = error;
            
            if (process.env.NODE_ENV === 'production') {
                process.exit(1);
            }
        });

    // --- Socket.IO server for primary real-time updates ---
    const io = new SocketIOServer(server, {
        wsEngine: WebSocketServer,
        cors: {
            origin: [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`],
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000, // 60 seconds - increased from default
        pingInterval: 25000, // 25 seconds - increased from default
        transports: ['polling', 'websocket'], // Allow both polling and websocket
        allowEIO3: true, // Allow Engine.IO v3 clients
        maxHttpBufferSize: 1e6, // 1MB max payload
        connectTimeout: 45000, // 45 seconds connection timeout
        upgradeTimeout: 10000, // 10 seconds for transport upgrade
        allowUpgrades: true, // Enable transport upgrades
        perMessageDeflate: false, // Disable compression to avoid compatibility issues
        httpCompression: true, // Enable HTTP compression for polling
    });
    global.ioClients = new Map();
    global.io = io; // Make Socket.IO instance globally available
    
    // Initialize connection manager
    const connectionManager = createConnectionManager(logger);
    app.set('connectionManager', connectionManager);
    
    // Add error handling to Socket.IO server
    io.on('error', (error) => {
        logger.error('Socket.IO server error', {
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        // Don't crash the server for Socket.IO errors
    });
    
    io.on('connection', (socket) => {
        logger.info('Socket.IO connection established', {
            id: socket.id,
            remoteAddress: socket.handshake.address
        });
        
        // Set up connection health monitoring
        socket.isAlive = true;
        socket.lastActivity = Date.now();
        
        // Add error handling to individual Socket.IO connections
        socket.on('error', (error) => {
            logger.error('Socket.IO connection error', {
                error: error.message,
                code: error.code,
                stack: error.stack,
                socketId: socket.id,
                sessionId: socket.sessionId
            });
            // Don't crash the server for individual Socket.IO errors
        });
        
        // Enhanced heartbeat monitoring
        socket.on('ping', () => {
            socket.isAlive = true;
            socket.lastActivity = Date.now();
            socket.emit('pong', { timestamp: Date.now() });
        });
        
        // Monitor for client-side pong responses
        socket.on('pong', () => {
            socket.isAlive = true;
            socket.lastActivity = Date.now();
        });
        
        socket.on('registerSession', (sessionId) => {
            if (sessionId) {
                // Store socket reference
                global.ioClients.set(sessionId, socket);
                socket.sessionId = sessionId;
                
                // Join the session room for targeted messaging
                socket.join(sessionId);
                
                logger.info('Socket.IO session registered', {
                    sessionId,
                    socketId: socket.id,
                    totalClients: global.ioClients.size
                });
                
                // Send confirmation
                socket.emit('sessionRegistered', {
                    sessionId,
                    timestamp: Date.now()
                });
            }
        });
        
        socket.on('disconnect', (reason) => {
            logger.info('Socket.IO connection disconnected', {
                socketId: socket.id,
                sessionId: socket.sessionId,
                reason
            });
            
            if (socket.sessionId) {
                global.ioClients.delete(socket.sessionId);
                logger.info('Socket.IO session removed', {
                    sessionId: socket.sessionId,
                    remainingClients: global.ioClients.size
                });
            }
        });
        
        // Handle ping/pong for connection health
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });
    });

    // Initialize connection manager with Socket.IO only
    connectionManager.initialize(io);

    // Note: WebSocket server removed to prevent conflicts with Socket.IO
    // Socket.IO already handles WebSocket connections via wsEngine: WebSocketServer
    global.wsClients = new Map(); // Keep for compatibility

    // --- Socket Connection Test on Startup ---
    const testSocketConnections = async () => {
        try {
            logger.info('Testing socket connections on startup...');
            
            // Test Socket.IO endpoint
            const socketIoTest = (async () => {
                const timeout = setTimeout(() => {
                    throw new Error('Socket.IO test timeout');
                }, 5000);
                
                try {
                    // Create a simple HTTP request to test Socket.IO endpoint
                    const http = await import('http');
                    const options = {
                        hostname: '127.0.0.1',
                        port: PORT,
                        path: '/socket.io/',
                        method: 'GET'
                    };
                    
                    return new Promise((resolve, reject) => {
                        const req = http.request(options, (res) => {
                            clearTimeout(timeout);
                            if (res.statusCode === 200) {
                                resolve('Socket.IO endpoint accessible');
                            } else {
                                reject(new Error(`Socket.IO endpoint returned status ${res.statusCode}`));
                            }
                        });
                        
                        req.on('error', (error) => {
                            clearTimeout(timeout);
                            reject(new Error(`Socket.IO endpoint error: ${error.message}`));
                        });
                        
                        req.setTimeout(3000, () => {
                            clearTimeout(timeout);
                            reject(new Error('Socket.IO endpoint timeout'));
                        });
                        
                        req.end();
                    });
                } catch (error) {
                    clearTimeout(timeout);
                    throw new Error(`Socket.IO test setup failed: ${error.message}`);
                }
            })();
            
            // Test WebSocket endpoint
            const webSocketTest = (async () => {
                const timeout = setTimeout(() => {
                    throw new Error('WebSocket test timeout');
                }, 5000);
                
                try {
                    const WebSocket = (await import('ws')).WebSocket;
                    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
                    
                    return new Promise((resolve, reject) => {
                        ws.on('open', () => {
                            clearTimeout(timeout);
                            ws.close();
                            resolve('WebSocket connection successful');
                        });
                        
                        ws.on('error', (error) => {
                            clearTimeout(timeout);
                            reject(new Error(`WebSocket connection failed: ${error.message}`));
                        });
                    });
                } catch (error) {
                    clearTimeout(timeout);
                    throw new Error(`WebSocket test setup failed: ${error.message}`);
                }
            })();
            
            // Run both tests
            const [socketIoResult, webSocketResult] = await Promise.allSettled([
                socketIoTest,
                webSocketTest
            ]);
            
            // Log results
            if (socketIoResult.status === 'fulfilled') {
                logger.info('Socket.IO test passed', { result: socketIoResult.value });
                console.log('✅ Socket.IO connection test: PASSED');
            } else {
                logger.warn('Socket.IO test failed', { error: socketIoResult.reason.message });
                console.log('⚠️  Socket.IO connection test: FAILED');
            }
            
            if (webSocketResult.status === 'fulfilled') {
                logger.info('WebSocket test passed', { result: webSocketResult.value });
                console.log('✅ WebSocket connection test: PASSED');
            } else {
                logger.warn('WebSocket test failed', { error: webSocketResult.reason.message });
                console.log('⚠️  WebSocket connection test: FAILED');
            }
            
            // Overall status
            const allTestsPassed = socketIoResult.status === 'fulfilled' && webSocketResult.status === 'fulfilled';
            
            if (allTestsPassed) {
                logger.info('All socket connection tests passed');
                console.log('🎉 All real-time communication systems are working!');
            } else {
                logger.warn('Some socket connection tests failed', {
                    socketIo: socketIoResult.status,
                    webSocket: webSocketResult.status
                });
                console.log('⚠️  Some real-time communication systems may have issues');
            }
            
        } catch (error) {
            logger.error('Socket connection test failed', {
                error: error.message,
                stack: error.stack
            });
            console.log('❌ Socket connection test failed:', error.message);
        }
    };
    
    // Run socket tests after a short delay to ensure server is fully started
    setTimeout(testSocketConnections, 1000);

    return server;
} catch (error) {
    const duration = Date.now() - startTime;
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
        appVersion: APP_VERSION,
        critical: true
    });
    
    // Don't exit for non-fatal errors like WebSocket issues or broken pipes
    if ((error.message && error.message.includes('WebSocket')) || error.code === 'EPIPE') {
        logger.warn('Ignoring non-fatal error to prevent server crash', {
            error: error.message,
            code: error.code,
            appVersion: APP_VERSION
        });
        return;
    }
    
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise,
        appVersion: APP_VERSION,
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
