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
 * @version [Using centralized version from src/version.js]
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

// Load environment variables from .env before anything else
import dotenv from 'dotenv';
dotenv.config();

import Joi from 'joi';
import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createWinstonLogger, createRequestLogger, createErrorLogger, createPerformanceLogger, serverLogger, apiLogger } from './server/winston-config.js';
import { logStartupSuccess, logStartupFailure, runStartupTests } from './src/server/services/startup-diagnostics.js';
// Enhanced real-time communication (replaces old connection manager)
// import { createConnectionManager } from './server/connection-manager.js';
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
// Import token management services
import { tokenService } from './server/services/token-service.js';
import { populationCacheService } from './server/services/population-cache-service.js';
import { webSocketService } from './server/services/websocket-service.js';

// Import routes
import { runStartupTokenTest } from './server/startup-token-test.js';
import apiRouter from './routes/api/index.js';
import settingsRouter from './routes/settings.js';
import debugLogRouter from './routes/api/debug-log.js';
import logsRouter from './routes/logs.js';
import logsApiRouter from './routes/api/logs.js';
import indexRouter from './routes/index.js';
import testRunnerRouter from './routes/test-runner.js';
import importRouter from './routes/api/import.js';
import exportRouter from './routes/api/export.js';
import { setupSwagger } from './swagger-modern.js';
import session from 'express-session';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version: appVersion } = require('./package.json');

// Import new middleware for improved backend-frontend communication
import { responseWrapper } from './server/utils/api-response.js';
import { errorHandler, notFoundHandler, asyncHandler } from './server/middleware/error-handler.js';
import { sanitizeInput } from './server/middleware/validation.js';
import { WebSocketServer } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { EnhancedRealtimeManager } from './server/services/enhanced-realtime-manager.js';

// 🛡️ Hardening & Monitoring Systems
import { performRouteHealthCheck, startRouteMonitoring, generateRouteHealthReport } from './server/route-health-checker.js';
import { startMemoryMonitoring, getMemoryStatusReport, forceMemoryCheck } from './server/memory-monitor.js';
import { runStartupSmokeTests, generateSmokeTestReport } from './server/swagger-smoke-tests.js';

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
// Joi schema for settings and environment validation
const settingsSchema = Joi.object({
    environmentId: Joi.string().guid({ version: ['uuidv4', 'uuidv1'] }).required(),
    apiClientId: Joi.string().guid({ version: ['uuidv4', 'uuidv1'] }).required(),
    apiSecret: Joi.string().min(8).required(),
    region: Joi.string().valid('NorthAmerica', 'Europe', 'AsiaPacific', 'Canada').required()
});

async function loadSettingsFromFile() {
    try {
        const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
        let settings = {};
        let loadedFrom = 'settings.json';
        try {
            const data = await fs.readFile(settingsPath, 'utf8');
            settings = JSON.parse(data);
        } catch (err) {
            loadedFrom = '.env';
            logger.warn(`[🗝️ CREDENTIAL-MANAGER] [${new Date().toISOString()}] [server] WARN: settings.json not found or invalid, falling back to .env`);
        }

        // Fallback logic: settings.json → .env (support legacy pingone_* keys)
        const environmentId = settings.environmentId || settings.pingone_environment_id || process.env.PINGONE_ENVIRONMENT_ID || '';
        const apiClientId = settings.apiClientId || settings.pingone_client_id || process.env.PINGONE_CLIENT_ID || '';
        const apiSecret = settings.apiSecret || settings.pingone_client_secret || process.env.PINGONE_CLIENT_SECRET || '';
        let region = settings.region || settings.pingone_region || process.env.PINGONE_REGION || 'NA';
        if (region === 'NorthAmerica' || region === 'NA') region = 'NA';
        else if (region === 'Europe' || region === 'EU') region = 'EU';
        else if (region === 'AsiaPacific' || region === 'APAC') region = 'APAC';
        else if (region === 'Canada') region = 'NA';

        // Mask secrets for logging
        const mask = (val) => val ? `${val.substring(0,4)}...${val.substring(val.length-4)}` : '[NOT_SET]';
        logger.info(`[🗝️ CREDENTIAL-MANAGER] [${new Date().toISOString()}] [server] INFO: Credential source: ${loadedFrom}`);
        logger.info(`[🗝️ CREDENTIAL-MANAGER] [${new Date().toISOString()}] [server] INFO: ENV_ID: ${mask(environmentId)}, CLIENT_ID: ${mask(apiClientId)}, CLIENT_SECRET: ***MASKED***, REGION: ${region}`);

        // Set env vars for downstream use
        process.env.PINGONE_ENVIRONMENT_ID = environmentId;
        process.env.PINGONE_CLIENT_ID = apiClientId;
        process.env.PINGONE_CLIENT_SECRET = apiSecret;
        process.env.PINGONE_REGION = region;

        // Validate config
        const configToValidate = {
            environmentId,
            apiClientId,
            apiSecret,
            region
        };
        const { error } = settingsSchema.validate(configToValidate);
        if (error) {
            logger.error(`[🗝️ CREDENTIAL-MANAGER] [${new Date().toISOString()}] [server] ERROR: Invalid PingOne configuration: ${error.message}`);
            // Do not throw, just warn and continue
            return false;
        }
        logger.info(`[🗝️ CREDENTIAL-MANAGER] [${new Date().toISOString()}] [server] INFO: PingOne configuration validated successfully`);
        return true;
    } catch (error) {
        logger.error(`[🗝️ CREDENTIAL-MANAGER] [${new Date().toISOString()}] [server] ERROR: Failed to load/validate settings: ${error.message}`);
        return false;
    }
}

// Create production-ready Winston logger
const logger = createWinstonLogger({
    service: 'pingone-import',
    env: process.env.NODE_ENV || 'development',
    enableFileLogging: process.env.NODE_ENV !== 'test',
    enhancedLogging: process.env.ENABLE_ENHANCED_LOGGING === 'true'
});

// Create specialized loggers
const requestLogger = createRequestLogger(logger);
const errorLogger = createErrorLogger(logger);
const performanceLogger = createPerformanceLogger(logger);

// Import startup optimizer for production-ready initialization
import startupOptimizer from './src/server/services/startup-optimizer.js';
// Removed duplicate error handler - using middleware errorHandler instead

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
const server = http.createServer(app);
let PORT = process.env.PORT || 4000;

// Progress page feature flag
app.set('enableProgressPage', process.env.ENABLE_PROGRESS_PAGE === 'true');

// Debug mode flag
app.set('debugMode', process.env.DEBUG_MODE === 'true');

// Rate limit value
app.set('rateLimit', Number(process.env.RATE_LIMIT) || 90);

// Initialize WebSocket service
webSocketService.initialize(server);

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
if (process.env.ENABLE_ENHANCED_LOGGING === 'true') {
    app.use(requestLogger);
    logger.info('Enhanced request logging enabled');
} else {
    app.use((req, res, next) => next());
}

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

// ============================================================================
// NEW MIDDLEWARE FOR IMPROVED BACKEND-FRONTEND COMMUNICATION
// ============================================================================

// Input sanitization middleware (prevents XSS and injection attacks)
app.use(sanitizeInput({
    fields: ['body', 'query', 'params'],
    stripHtml: true,
    trimWhitespace: true
}));

// Response standardization middleware (fixes QA issues)
import { standardizeResponse, addRequestId } from './server/middleware/response-standardization.js';
app.use(addRequestId);
app.use(standardizeResponse);

// Standardized API response wrapper
app.use(responseWrapper);

// Example: Use rate limit value in middleware (plug in your rate limiter here)
// const rateLimit = require('express-rate-limit');
// app.use(rateLimit({
//     windowMs: 60 * 1000,
//     max: app.get('rateLimit'),
//     message: 'Too many requests, please try again later.'
// }));

// Direct API routes (before middleware that might interfere)
app.get('/api/module-info', (req, res) => {
    res.json({
        success: true,
        version: '7.1.1',
        name: 'PingOne Import Tool',
        description: 'User import/export tool for PingOne',
        timestamp: new Date().toISOString()
    });
});

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

// Import Maps mode is now the default (no more bundles)
const useImportMaps = true;
console.log('🗺️  Import Maps mode enabled - serving ES modules directly (default)');

// Helper function to read settings.json and inject it into HTML
async function injectSettingsIntoHtml(htmlFilePath, res) {
    try {
        // Read the HTML file
        const htmlContent = await fs.readFile(htmlFilePath, 'utf8');
        
        // Read the settings.json file
        const settingsPath = path.join(__dirname, 'data', 'settings.json');
        let settingsJson = {};
        
        try {
            const settingsContent = await fs.readFile(settingsPath, 'utf8');
            settingsJson = JSON.parse(settingsContent);
            console.log('📄 Settings.json loaded successfully for client injection:', settingsJson);
            logger.info('📄 Settings.json loaded successfully for client injection', {
                keys: Object.keys(settingsJson),
                hasEnvironmentId: !!settingsJson.pingone_environment_id,
                hasClientId: !!settingsJson.pingone_client_id,
                hasClientSecret: !!settingsJson.pingone_client_secret,
                hasRegion: !!settingsJson.pingone_region
            });
        } catch (error) {
            console.error('⚠️ Could not read settings.json:', error);
            logger.warn('⚠️ Could not read settings.json for client injection', { 
                error: error.message,
                path: settingsPath
            });
            // Continue with empty settings object
        }
        
        // Create a script tag that sets window.settingsJson
        const settingsScript = `<script>
            // Injected settings from server
            window.settingsJson = ${JSON.stringify(settingsJson)};
            console.log('🔧 Settings loaded from server:', window.settingsJson);
        </script>`;
        
        // Check if the HTML contains the head tag
        if (!htmlContent.includes('</head>')) {
            logger.error('❌ HTML does not contain </head> tag, cannot inject settings');
            res.sendFile(htmlFilePath);
            return;
        }
        
        // Inject the script right before the closing </head> tag
        const modifiedHtml = htmlContent.replace('</head>', `${settingsScript}
</head>`);
        
        // Log success
        logger.info('✅ Successfully injected settings into HTML');
        
        // Send the modified HTML
        res.setHeader('Content-Type', 'text/html');
        res.send(modifiedHtml);
        
    } catch (error) {
        console.error('💥 Error injecting settings into HTML:', error);
        logger.error('💥 Error injecting settings into HTML', { error: error.message, stack: error.stack });
        // Fallback to sending the file directly
        res.sendFile(htmlFilePath);
    }
}

// Default route for Import Maps (ES modules)
app.get('/', async (req, res) => {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    await injectSettingsIntoHtml(htmlPath, res);
});

console.log('🗺️  Import Maps route registered for /');

// Static file serving with caching headers
app.use(express.static(path.join(__dirname, 'public'), {
    etag: true,
    lastModified: true,
    // Exclude index.html to prevent conflicts with our custom route handler
    index: false,
    setHeaders: (res, filePath) => {
        const fileExt = path.extname(filePath);
        if (fileExt === '.html') {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else if (fileExt === '.js') {
            // Serve JS modules with proper MIME type and no caching during development
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache other assets for 1 day
        }
    }
}));

// SECURE settings endpoint: expose a sanitized view of settings for Swagger only
// Do NOT serve /data/settings.json publicly.
app.get('/api/settings/public', async (req, res) => {
    try {
        const settingsPath = path.join(__dirname, 'data', 'settings.json');
        const raw = await fs.readFile(settingsPath, 'utf-8').catch(() => '{}');
        const json = JSON.parse(raw || '{}');
        // Pick only safe fields (populations + default id)
        const safe = {
            populations: Array.isArray(json.populations) ? json.populations : [],
            populationCache: json.populationCache && Array.isArray(json.populationCache.populations)
                ? { populations: json.populationCache.populations } : undefined,
            pingone_population_id: json.pingone_population_id || json.populationId || undefined
        };
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.json({ success: true, data: safe });
    } catch (e) {
        res.status(200).json({ success: true, data: { populations: [] } });
    }
});

// Serve SPA routes - all serve index.html for client-side routing
app.get('/history', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

app.get('/import', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/export', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Serve source files for Import Maps
app.use('/src', express.static(path.join(__dirname, 'src'), {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        const fileExt = path.extname(filePath);
        if (fileExt === '.js') {
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

console.log('📦 Source files served at /src for Import Maps');
console.log('🗺️  Import Maps version available at http://localhost:4000/');

// Debug route to check module system status
app.get('/api/debug/modules', (req, res) => {
    res.json({
        moduleSystem: 'import-maps',
        useImportMaps: useImportMaps,
        version: packageVersion,
        timestamp: new Date().toISOString()
    });
});

console.log('📚 Swagger UI available at http://localhost:4000/swagger.html');
console.log('📄 Swagger JSON available at http://localhost:4000/swagger.json');
console.log('🔍 Debug endpoint available at http://localhost:4000/api/debug/modules');

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

// Startup diagnostics endpoint for boot-time health and readiness
app.get('/startup-report', (req, res) => {
    // Gather subsystem statuses (expand as needed)
    const subsystems = {
        logging: { status: 'ok' },
        auth: { status: typeof app.get('tokenManager') !== 'undefined' ? 'ok' : 'error' },
        token: { status: typeof app.get('tokenManager') !== 'undefined' && app.get('tokenManager').tokenCache ? 'ok' : 'error' },
        routes: { status: 'ok', registered: app._router.stack
            .filter(r => r.route)
            .map(r => r.route.path)
        },
        websocket: { status: typeof global.io !== 'undefined' ? 'ok' : 'error' }
    };

    // Collect startup metrics
    const startupDuration = process.uptime() * 1000; // ms
    const memoryUsage = process.memoryUsage();
    const memoryMB = (memoryUsage.rss / 1024 / 1024).toFixed(2);

    // Collect errors if any
    const errors = [];
    if (typeof global.startupErrors !== 'undefined' && Array.isArray(global.startupErrors)) {
        errors.push(...global.startupErrors);
    }
    if (typeof serverState !== 'undefined' && serverState.lastError) {
        errors.push(serverState.lastError.message || String(serverState.lastError));
    }

    // Diagnostics (expand as needed)
    const diagnostics = {
        environment: process.env.NODE_ENV,
        version: appVersion,
        memory: memoryMB + ' MB',
        startupDuration: startupDuration + ' ms',
        registeredRoutes: subsystems.routes.registered,
        errors
    };

    res.json({
        version: appVersion,
        environment: process.env.NODE_ENV,
        startupDuration: startupDuration + ' ms',
        memoryUsage: memoryMB + ' MB',
        subsystems,
        errors,
        diagnostics
    });
});

// Import Maps info endpoint (replaces bundle-info)
app.get('/api/module-info', async (req, res) => {
    try {
        const importMapsPath = path.join(__dirname, 'public', 'import-maps.json');
        const importMapsData = await fs.readFile(importMapsPath, 'utf8');
        const importMaps = JSON.parse(importMapsData);
        
        res.json({
            type: 'import-maps',
            version: packageVersion,
            timestamp: new Date().toISOString(),
            imports: importMaps.imports
        });
    } catch (error) {
        logger.error('Failed to read import maps', { error: error.message });
        res.status(500).json({ error: 'Could not retrieve module information.' });
    }
});

// Real-time communication statistics endpoint
app.get('/api/realtime/stats', (req, res) => {
    try {
        const realtimeManager = req.app.get('realtimeManager');
        if (!realtimeManager) {
            return res.status(503).json({
                success: false,
                error: 'Real-time manager not available',
                code: 'SERVICE_UNAVAILABLE'
            });
        }

        const stats = realtimeManager.getStats();
        res.json({
            success: true,
            message: 'Real-time statistics retrieved successfully',
            data: stats,
            meta: {
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Failed to get real-time stats', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve real-time statistics',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Session information endpoint
app.get('/api/realtime/session/:sessionId', (req, res) => {
    try {
        const realtimeManager = req.app.get('realtimeManager');
        if (!realtimeManager) {
            return res.status(503).json({
                success: false,
                error: 'Real-time manager not available',
                code: 'SERVICE_UNAVAILABLE'
            });
        }

        const sessionInfo = realtimeManager.getSessionInfo(req.params.sessionId);
        if (!sessionInfo) {
            return res.status(404).json({
                success: false,
                error: 'Session not found',
                code: 'SESSION_NOT_FOUND'
            });
        }

        res.json({
            success: true,
            message: 'Session information retrieved successfully',
            data: sessionInfo,
            meta: {
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Failed to get session info', { 
            sessionId: req.params.sessionId,
            error: error.message 
        });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve session information',
            code: 'INTERNAL_ERROR'
        });
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
        
        // Get token status
        let tokenStatus;
        try {
            tokenStatus = tokenService.getTokenStatus();
        } catch (error) {
            tokenStatus = {
                hasToken: false,
                isValid: false,
                expiresIn: 0,
                environmentId: 'unknown',
                region: 'unknown'
            };
        }
        
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
                tokenStatus: tokenStatus
            },
            token: {
                hasToken: tokenStatus.hasToken,
                isValid: tokenStatus.isValid,
                expiresIn: tokenStatus.expiresIn,
                environmentId: tokenStatus.environmentId,
                region: tokenStatus.region
            },
            checks: {
                pingOneConfigured: hasRequiredPingOneVars ? 'ok' : 'error',
                pingOneConnected: serverStatus.pingOneInitialized ? 'ok' : 'error',
                memory: memoryUsagePercent < 90 ? 'ok' : 'warn',
                startupOptimization: optimizerHealth.status === 'healthy' ? 'ok' : 'warn',
                tokenAcquisition: tokenStatus.hasToken ? 'ok' : 'error',
                websocket: webSocketService.io ? 'ok' : 'error'
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

// Token management endpoints
app.get('/api/token/status', async (req, res) => {
    try {
        // First check the server-side token service
        let status = tokenService.getTokenStatus();
        
        // If server-side token is invalid, try to get a new token using settings
        if (!status.isValid && status.expiresIn <= 0) {
            try {
                // Load settings from file
                const settingsPath = path.join(__dirname, 'data', 'settings.json');
                const settingsData = await fs.readFile(settingsPath, 'utf8');
                const settings = JSON.parse(settingsData);
                
                // Try to acquire a new token using settings
                if (settings.pingone_environment_id && settings.pingone_client_id && settings.pingone_client_secret) {
                    logger.info('Attempting to acquire token using settings for status check');
                    
                    const newToken = await tokenService.getToken({
                        environmentId: settings.pingone_environment_id,
                        clientId: settings.pingone_client_id,
                        clientSecret: settings.pingone_client_secret,
                        region: settings.pingone_region || 'NA'
                    });
                    
                    // Update status with the new token
                    status = tokenService.getTokenStatus();
                }
            } catch (settingsError) {
                logger.warn('Could not acquire token using settings for status check', { error: settingsError.message });
            }
        }
        
        // Create a response that the middleware recognizes as already standardized
        // to prevent double-wrapping
        res.json({
            success: true,
            message: status.isValid ? 'Token is valid' : 'Token is invalid or expired',
            data: {
                hasToken: status.hasToken,
                isValid: status.isValid,
                expiresIn: status.expiresIn,
                environmentId: status.environmentId,
                region: status.region,
                lastUpdated: status.lastUpdated
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Token status check failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Token refresh endpoint
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

// API routes with enhanced logging
app.use('/api', apiRouter); // Main API router includes: logs, auth, export, import, history, pingone, version, settings
app.use('/api/pingone', pingoneProxyRouter); // Additional pingone proxy routes
app.use('/api/settings', settingsRouter); // Direct settings routes
app.use('/api/v1/settings', settingsRouter); // Added to support /api/v1/settings
app.use('/api/v1/auth', authSubsystemRouter); // Auth subsystem routes
app.use('/api/test-runner', testRunnerRouter); // Test runner routes
// NOTE: /api/auth, /api/logs, /api/import, /api/export are handled by the main apiRouter above
app.use('/', indexRouter);

// Add missing endpoints for UI logging and error reporting
app.post('/api/logs/ui', (req, res) => {
  // Accept UI logs, optionally persist or forward
  res.status(200).json({ status: 'UI log received' });
});

app.post('/api/errors', (req, res) => {
  // Accept error reports, optionally persist or forward
  res.status(200).json({ status: 'Error report received' });
});

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

// ============================================================================
// CENTRALIZED ERROR HANDLING (REPLACES OLD ERROR HANDLERS)
// ============================================================================

// 404 Not Found handler
app.use(notFoundHandler);

// Centralized error handler with logging and standardized responses
app.use(errorHandler);

// Import the logs directory check
import { ensureLogsDirectory } from './scripts/ensure-logs-directory.js';

// Version constant for DRYness
const APP_VERSION = '6.5.2.4';

// Server startup with enhanced logging
const startServer = async () => {
    const startTime = Date.now(); // Track startup time for diagnostics
    
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
        
        // Load settings into environment before starting server/auth
        try {
            await loadSettingsFromFile();
            logger.info('🔧 Settings loaded into environment');
        } catch (e) {
            logger.warn('⚠️ Failed to load settings into environment, continuing with current env', { error: e.message });
        }

        // Initialize the server
        server.listen(process.env.PORT || 4000, async () => {
            const serverUrl = `http://localhost:${process.env.PORT || 4000}`;
            const port = process.env.PORT || 4000;
            
            try {
                // Initialize Enhanced Server Authentication
                logger.info('🔐 Initializing Enhanced Server Authentication...');
                const enhancedAuth = new EnhancedServerAuth(logger);
                
                try {
                    const authResult = await enhancedAuth.initializeOnStartup();
                    logger.info('✅ Enhanced Server Authentication initialized successfully', {
                        hasToken: authResult.hasToken,
                        environmentId: authResult.environmentId,
                        region: authResult.region
                    });
                    
                    // Initialize credential routes with the auth instance
                    initializeCredentialRoutes(enhancedAuth);
                    logger.info('✅ Credential management routes initialized');
                    
                } catch (authError) {
                    logger.warn('⚠️ Enhanced Server Authentication initialization failed', {
                        error: authError.message,
                        details: 'Server will continue but authentication features may be limited'
                    });
                    
                    // Still initialize credential routes with a basic instance for status endpoints
                    initializeCredentialRoutes(enhancedAuth);
                }
                
                // Run comprehensive startup diagnostics and logging
                await logStartupSuccess(logger, {
                    port,
                    tokenService,
                    startTime,
                    serverUrl
                });
                
                // 🗃️ INITIALIZE POPULATION CACHE SERVICE
                try {
                    logger.info('🗃️ Initializing population cache service...');
                    populationCacheService.initialize({
                        logger: logger,
                        tokenManager: tokenManager
                    });
                    
                    // Cache populations during startup for fast loading
                    const cacheResult = await populationCacheService.cachePopulationsOnStartup();
                    if (cacheResult) {
                        logger.info('✅ Population cache initialized successfully');
                        console.log('🗃️ POPULATION CACHE: READY - Fast home page loading enabled');
                    } else {
                        logger.warn('⚠️ Population cache initialization failed - will use API fallback');
                        console.log('⚠️ POPULATION CACHE: FALLBACK MODE - Using API calls for population data');
                    }
                } catch (error) {
                    logger.error('❌ Error initializing population cache service:', error);
                    console.log('❌ POPULATION CACHE: ERROR - Using API fallback mode');
                }
                
                // Run automated startup tests
                const testResults = await runStartupTests({
                    port,
                    tokenService
                });
                
                // Log test results
                const passedTests = Object.values(testResults).filter(test => test.passed).length;
                const totalTests = Object.keys(testResults).length;
                
                logger.info('🧪 Startup Tests Completed', {
                    passed: `${passedTests}/${totalTests}`,
                    results: testResults
                });
                
                console.log(`\n🧪 AUTOMATED STARTUP TESTS: ${passedTests}/${totalTests} PASSED`);
                for (const [key, test] of Object.entries(testResults)) {
                    const icon = test.passed ? '✅' : '❌';
                    console.log(`   ${icon} ${test.name}: ${test.passed ? 'PASSED' : 'FAILED'}`);
                    if (!test.passed && test.error) {
                        console.log(`      Error: ${test.error}`);
                    }
                }
                
                // 🚀 INITIALIZE STARTUP OPTIMIZER
                try {
                    logger.info('🚀 Initializing startup optimizer...');
                    const optimizerResult = await startupOptimizer.initialize();
                    
                    if (optimizerResult.success) {
                        logger.info('✅ Startup optimizer initialized successfully', {
                            duration: optimizerResult.duration,
                            tokenCached: optimizerResult.tokenCached,
                            populationsCached: optimizerResult.populationsCached
                        });
                        console.log('✅ Startup optimization: COMPLETE');
                    } else {
                        logger.warn('⚠️ Startup optimizer initialization had issues', {
                            reason: optimizerResult.reason,
                            duration: optimizerResult.duration
                        });
                        console.log('⚠️ Startup optimization: PARTIAL');
                    }
                } catch (optimizerError) {
                    logger.error('❌ Startup optimizer initialization failed', {
                        error: optimizerError.message,
                        stack: optimizerError.stack
                    });
                    console.log('❌ Startup optimization: FAILED');
                }
                
                // Test token acquisition on startup with retry logic for WebSocket notifications
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
                        
                        // ✅ Mark PingOne as initialized after successful token acquisition
                        serverState.pingOneInitialized = true;
                        logger.info('✅ PingOne connection established successfully', {
                            environmentId: tokenService.tokenCache.environmentId,
                            region: tokenService.tokenCache.region,
                            expiresIn: tokenService.getTokenStatus().expiresIn
                        });
                        
                        webSocketService.broadcastNotification(
                            'success', 
                            'Successfully acquired PingOne API token',
                            { 
                                environmentId: tokenService.tokenCache.environmentId,
                                region: tokenService.tokenCache.region,
                                expiresIn: tokenService.getTokenStatus().expiresIn
                            }
                        );
                        
                    } catch (error) {
                        lastError = error;
                        
                        if (attempt < maxRetries) {
                            // Exponential backoff: 2s, 4s, 8s, etc.
                            const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
                            
                            // Wait before retrying
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                }
                
                if (!success && lastError) {
                    webSocketService.broadcastNotification(
                        'error', 
                        'Failed to acquire PingOne token after maximum retries',
                        { error: lastError.message }
                    );
                }
                
            } catch (error) {
                // Log startup failure with comprehensive diagnostics
                await logStartupFailure(logger, error, {
                    port,
                    startTime,
                    tokenService
                });
                throw error; // Re-throw to trigger error handler
            }
        }).on('error', async (error) => {
            // Log comprehensive startup failure with diagnostics
            await logStartupFailure(logger, error, {
                port: PORT,
                startTime,
                tokenService
            });
            
            // Handle specific error types
            if (error.code === 'EADDRINUSE') {
                const processes = await getProcessesUsingPort(PORT);
                const errorMessage = generatePortConflictMessage(PORT, processes);
                console.log('\n' + errorMessage);
                
                // Additional port conflict recommendations
                console.log('\n💡 PORT CONFLICT RECOMMENDATIONS:');
                console.log('   🔧 Kill conflicting processes: npm run stop');
                console.log('   🔄 Use different port: PORT=4001 npm start');
                console.log('   🔍 Check running processes: lsof -i :4000');
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
    
    // Initialize enhanced real-time manager
    const realtimeManager = new EnhancedRealtimeManager(io, logger);
    app.set('realtimeManager', realtimeManager);
    app.set('connectionManager', realtimeManager); // Backward compatibility
    
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

    // Enhanced real-time manager is already initialized with io

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
    
    // 🛡️ HARDENING & MONITORING SYSTEMS
    // Run comprehensive monitoring and health checks after startup
    setTimeout(async () => {
        try {
            logger.info('🛡️ Initializing hardening and monitoring systems...');
            
            // 1. 🔁 Route Health Check
            logger.info('🔍 Performing route health check...');
            const routeHealthResult = performRouteHealthCheck(app);
            
            if (!routeHealthResult.success) {
                console.error('🚨 CRITICAL: Route health check failed!');
                console.error('Missing routes:', routeHealthResult.validation.missingRoutes);
                
                // Write detailed report to logs
                const routeReport = generateRouteHealthReport(app);
                logger.error('Route Health Check Report:', routeReport);
            } else {
                logger.info('✅ Route health check passed - all critical routes available');
            }
            
            // 2. 🔔 Memory Monitoring & Optimization
            logger.info('📊 Starting memory monitoring with optimization...');
            
            // Force garbage collection if available
            if (global.gc) {
                logger.info('🗑️ Running garbage collection...');
                global.gc();
                logger.info('✅ Garbage collection completed');
            }
            
            const memoryCleanup = startMemoryMonitoring({
                checkInterval: 60000,  // Check every 60 seconds (reduced frequency)
                alertCooldown: 300000  // 5 minutes between alerts
            });
            
            // Initial memory check
            const initialMemory = forceMemoryCheck();
            logger.info('💾 Initial memory status:', {
                heap: `${initialMemory.percentages.heap}%`,
                rss: initialMemory.formatted.rss,
                alertLevel: initialMemory.alertLevel
            });
            
            // 3. 🧪 API Smoke Tests
            logger.info('🧪 Running API smoke tests...');
            const smokeTestResults = await runStartupSmokeTests(`http://localhost:${port}`, 3000);
            
            if (!smokeTestResults.success) {
                console.error('🚨 API SMOKE TESTS FAILED!');
                const smokeReport = generateSmokeTestReport(smokeTestResults);
                console.error(smokeReport);
                logger.error('API Smoke Test Report:', smokeReport);
            } else {
                logger.info('✅ API smoke tests passed - all endpoints responding correctly');
                console.log(`✅ API SMOKE TESTS PASSED (${smokeTestResults.endpoints.successRate})`);
            }
            
            // 4. 🔄 Continuous Route Monitoring
            logger.info('🔄 Starting continuous route monitoring...');
            const routeMonitoringCleanup = startRouteMonitoring(app, 5 * 60 * 1000); // Every 5 minutes
            
            // 5. 📊 System Status Summary
            const systemStatus = {
                routes: routeHealthResult.success ? 'healthy' : 'unhealthy',
                memory: initialMemory.alertLevel,
                apiEndpoints: smokeTestResults.success ? 'operational' : 'degraded',
                monitoring: 'active'
            };
            
            logger.info('🛡️ Hardening & Monitoring Systems Initialized', {
                systemStatus,
                routeHealth: `${routeHealthResult.validation?.foundCount || 0}/${routeHealthResult.validation?.totalCritical || 0} critical routes`,
                memoryUsage: `${initialMemory.percentages.heap}%`,
                apiHealth: smokeTestResults.endpoints?.successRate || 'unknown'
            });
            
            console.log('\n🛡️ HARDENING & MONITORING SYSTEMS ACTIVE');
            console.log(`   🔍 Route Health: ${systemStatus.routes.toUpperCase()}`);
            console.log(`   📊 Memory Status: ${systemStatus.memory.toUpperCase()}`);
            console.log(`   🧪 API Health: ${systemStatus.apiEndpoints.toUpperCase()}`);
            console.log(`   🔄 Monitoring: ${systemStatus.monitoring.toUpperCase()}`);
            
            // Store cleanup functions for graceful shutdown
            process.monitoringCleanup = {
                memory: memoryCleanup,
                routes: routeMonitoringCleanup
            };
            
            // 🎯 MARK SERVER AS FULLY INITIALIZED
            serverState.isInitialized = true;
            serverState.isInitializing = false;
            logger.info('🎉 Server initialization completed successfully', {
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memoryUsage: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
            });
            
        } catch (error) {
            logger.error('💥 Error initializing monitoring systems:', error);
            console.error('🚨 MONITORING SYSTEM ERROR:', error.message);
        }
    }, 2000); // Wait 2 seconds for full server initialization

    return server;
} catch (error) {
    const duration = Date.now() - startTime;
    performanceLogger('server_startup', duration, { status: 'error', error: error.message });
    
    // Log comprehensive startup failure with diagnostics
    await logStartupFailure(logger, error, {
        port: PORT,
        startTime,
        tokenService
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
    
    // 🛡️ Cleanup monitoring systems
    if (process.monitoringCleanup) {
        logger.info('🧽 Cleaning up monitoring systems...');
        
        try {
            if (process.monitoringCleanup.memory) {
                process.monitoringCleanup.memory();
                logger.info('✅ Memory monitoring stopped');
            }
            
            if (process.monitoringCleanup.routes) {
                process.monitoringCleanup.routes();
                logger.info('✅ Route monitoring stopped');
            }
        } catch (error) {
            logger.error('⚠️ Error during monitoring cleanup:', error);
        }
    }
    
    // 🗃️ Cleanup population cache service
    try {
        populationCacheService.cleanup();
        logger.info('✅ Population cache service stopped');
    } catch (error) {
        logger.error('⚠️ Error during population cache cleanup:', error);
    }
    
    logger.info('👋 Graceful shutdown completed');
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
    startServer().catch(async error => {
        // Final comprehensive startup failure logging
        await logStartupFailure(logger, error, {
            port: process.env.PORT || 4000,
            startTime: Date.now(), // Approximate start time
            tokenService: null // May not be available at this point
        });
        
        console.log('\n💥 CRITICAL: Server failed to start. Check the diagnostics above.');
        console.log('📞 For support, provide the complete log output shown above.\n');
        
        process.exit(1);
    });
}

export { app, logger, startServer };
