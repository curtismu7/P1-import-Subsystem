/**
 * @fileoverview Express API routes for PingOne user import tool
 * 
 * This module handles all backend API endpoints for the PingOne user import tool,
 * including user import/export/modify operations, real-time progress tracking via SSE,
 * population validation, and token management.
 * 
 * Key Features:
 * - CSV file upload and parsing
 * - User import with conflict resolution
 * - Real-time progress streaming via Server-Sent Events (SSE)
 * - Population validation and conflict handling
 * - User export in JSON/CSV formats
 * - User modification with batch processing
 * - Token management and authentication
 * - Feature flag management
 * 
 * @author PingOne Import Tool
 * @version 6.1
 */

import { Router } from 'express';
import multer from 'multer';
import { isFeatureEnabled, setFeatureFlag, getAllFeatureFlags, resetFeatureFlags } from '../../server/feature-flags.js';
import { v4 as uuidv4 } from 'uuid';
// SSE imports removed - using Socket.IO instead
import fetch from 'node-fetch'; // Add this if not already present
import { logSeparator, logTag, apiLogger, apiLogHelpers } from '../../server/winston-config.js';
import serverMessageFormatter from '../../server/message-formatter.js';
import { sendProgressEvent, sendCompletionEvent, sendErrorEvent } from '../../server/connection-manager.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Feature flags configuration object for easy access
const featureFlags = {
  isFeatureEnabled,
  setFeatureFlag,
  getAllFeatureFlags,
  resetFeatureFlags,
};

const router = Router();

// Enable debug logging in development mode
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// API Request/Response Logging Middleware
router.use((req, res, next) => {
    const startTime = Date.now();
    
    // Log incoming request
    const requestId = apiLogHelpers.logApiRequest(req);
    req.requestId = requestId;
    req.startTime = startTime;
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        
        // Log API response
        apiLogHelpers.logApiResponse(req, res, requestId, duration);
        
        // Call original end method
        originalEnd.call(res, chunk, encoding);
    };
    
    next();
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * Health check endpoint for server monitoring
 * Returns server status and basic health information
 */
router.get('/health', async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Basic health checks
        const healthChecks = {
            server: true,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development'
        };
        
        // Check if token manager is available
        try {
            const tokenManager = req.app.get('tokenManager');
            if (tokenManager) {
                healthChecks.tokenManager = true;
                healthChecks.tokenStatus = 'available';
            } else {
                healthChecks.tokenManager = false;
                healthChecks.tokenStatus = 'unavailable';
            }
        } catch (error) {
            healthChecks.tokenManager = false;
            healthChecks.tokenStatus = 'error';
            healthChecks.tokenError = error.message;
        }
        
        // Check if settings are accessible
        try {
            const settingsPath = path.join(__dirname, '../../data/settings.json');
            await fs.access(settingsPath);
            healthChecks.settings = true;
        } catch (error) {
            healthChecks.settings = false;
            healthChecks.settingsError = error.message;
        }
        
        const responseTime = Date.now() - startTime;
        
        res.status(200).json({
            success: true,
            status: 'healthy',
            checks: healthChecks,
            responseTime: `${responseTime}ms`
        });
        
        debugLog("Health", "✅ Health check completed", { responseTime });
    } catch (error) {
        debugLog("Health", "❌ Health check failed", { error: error.message });
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Debug logging utility for server-side diagnostics
 * Provides structured logging with timestamps and area categorization
 * Only active in development mode to avoid production noise
 * 
 * @param {string} area - Log area/tag for categorization (e.g., 'Import', 'SSE', 'User')
 * @param {string} message - Human-readable log message
 * @param {any} data - Optional data object for detailed debugging
 */
function debugLog(area, message, data = null) {
    if (!DEBUG_MODE) return;
    const timestamp = new Date().toISOString();
    const formatted = `[DEBUG - ${area}] ${message}`;
    if (data !== null) {
        apiLogger.info(`${timestamp} ${formatted}`, data);
    } else {
        apiLogger.info(`${timestamp} ${formatted}`);
    }
}

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

/**
 * Configure multer for secure file uploads
 * Uses memory storage for processing CSV files with 10MB size limit
 * This prevents disk I/O and allows direct buffer access for parsing
 */
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit - sufficient for most CSV files
    }
});

// ============================================================================
// IMPORT PROCESS FUNCTION
// ============================================================================

/**
 * Runs the import process in the background
 * 
 * This function handles the complete import workflow:
 * 1. Parses the uploaded CSV file
 * 2. Validates user data and population information
 * 3. Creates users in PingOne via API calls
 * 4. Sends real-time progress updates via SSE
 * 5. Handles errors and provides detailed logging
 * 
 * @param {string} sessionId - Unique session identifier for SSE communication
 * @param {Object} app - Express app instance for accessing services
 */
async function runImportProcess(sessionId, app) {
    try {
        const logger = app.get('importLogger') || apiLogger;
        logger.info(logSeparator());
        logger.info(logTag('START OF IMPORT'), { tag: logTag('START OF IMPORT'), separator: logSeparator() });
        logger.info(`[${new Date().toISOString()}] [INFO] Import process started`, { sessionId });
        if (logger.flush) await logger.flush();
        
        debugLog("Import", "🔄 Starting import process", { sessionId });
        
        // Get import session data
        const importSessions = app.get('importSessions');
        const session = importSessions.get(sessionId);
        if (!session) {
            throw new Error('Import session not found');
        }
        
        const { file, populationId, populationName, totalUsers } = session;
        
        // Add clear log at start
        logger.info('********** START IMPORT **********');
        logger.info(`* Population Name: ${populationName || 'MISSING'}`);
        logger.info(`* Population ID:   ${populationId || 'MISSING'}`);
        logger.info('**********************************');
        
        // DEBUG: Log the session data retrieved for import process
        logger.info(`[${new Date().toISOString()}] [DEBUG] Import process started with session data`, {
            sessionId,
            populationId: populationId || 'MISSING',
            populationName: populationName || 'MISSING',
            totalUsers: totalUsers || 0,
            fileName: file.originalname
        });
        if (logger.flush) await logger.flush();
        
        debugLog("Import", "🔍 Session data retrieved", { 
            populationId: populationId || 'MISSING',
            populationName: populationName || 'MISSING',
            totalUsers: totalUsers || 0
        });
        
        // Parse CSV file
        debugLog("Import", "📄 Parsing CSV file", { fileName: file.originalname });
        const csvContent = file.buffer.toString('utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            throw new Error('CSV file must contain at least a header row and one data row');
        }
        
        // Parse header and data
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const users = lines.slice(1).map((line, index) => {
            const values = line.split(',').map(v => v.trim());
            const user = {};
            headers.forEach((header, i) => {
                user[header] = values[i] || '';
            });
            user._lineNumber = index + 2; // +2 for 1-based indexing and header row
            return user;
        });
        
        debugLog("Import", "✅ CSV parsed successfully", { 
            totalUsers: users.length,
            headers: headers
        });
        if (logger.flush) await logger.flush();
        
        // Initialize progress tracking
        let processed = 0;
        let created = 0;
        let skipped = 0;
        let failed = 0;
        let errors = [];
        
        // Get token manager for PingOne API calls
        const tokenManager = app.get('tokenManager');
        if (!tokenManager) {
            throw new Error('Token manager not available');
        }
        
        // Get access token
        const token = await tokenManager.getAccessToken();
        if (!token) {
            throw new Error('Failed to get access token');
        }
        
        // Get environment ID from settings
        const settingsResponse = await fetch('http://127.0.0.1:4000/api/settings');
        if (!settingsResponse.ok) {
            throw new Error('Failed to load settings');
        }
        const settingsData = await settingsResponse.json();
        const settings = settingsData.success && settingsData.data ? settingsData.data : settingsData;
        const environmentId = settings.environmentId;
        
        if (!environmentId) {
            throw new Error('Environment ID not configured');
        }
        
        debugLog("Import", "🔑 Authentication ready", { environmentId });
        if (logger.flush) await logger.flush();
        
        // Process users in batches to avoid rate limiting
        const batchSize = 5;
        const delayBetweenBatches = 1000; // 1 second delay between batches
        
        const importStart = Date.now();
        
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            
            debugLog("Import", `📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(users.length/batchSize)}`, {
                batchSize: batch.length,
                startIndex: i
            });
            if (logger.flush) await logger.flush();
            
            // Process each user in the batch
            for (const user of batch) {
                try {
                    processed++;
                    
                    // Validate required fields
                    const username = user.username || user.email;
                    if (!username) {
                        const error = `Line ${user._lineNumber}: Missing username or email`;
                        errors.push(error);
                        failed++;
                        debugLog("Import", `❌ ${error}`);
                        if (logger.flush) await logger.flush();
                        continue;
                    }
                    
                    // Check if user already exists (with option to bypass for testing)
                    const skipDuplicateCheck = process.env.SKIP_DUPLICATE_CHECK === 'true' || app.get('skipDuplicateCheck') === true;
                    
                    if (!skipDuplicateCheck) {
                        const checkUrl = `https://api.pingone.com/v1/environments/${environmentId}/users?username=${encodeURIComponent(username)}`;
                        
                        // DEBUG: Log the duplicate check request
                        logger.info(`[${new Date().toISOString()}] [DEBUG] Checking if user exists`, {
                            sessionId,
                            username,
                            checkUrl,
                            lineNumber: user._lineNumber
                        });
                        
                        const checkResponse = await fetch(checkUrl, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        // DEBUG: Log the duplicate check response
                        logger.info(`[${new Date().toISOString()}] [DEBUG] Duplicate check response`, {
                            sessionId,
                            username,
                            status: checkResponse.status,
                            statusText: checkResponse.statusText,
                            ok: checkResponse.ok
                        });
                        
                        if (checkResponse.ok) {
                            const checkData = await checkResponse.json();
                            
                            // DEBUG: Log the response data
                            logger.info(`[${new Date().toISOString()}] [DEBUG] Duplicate check data`, {
                                sessionId,
                                username,
                                hasEmbedded: !!checkData._embedded,
                                hasUsers: !!(checkData._embedded && checkData._embedded.users),
                                usersCount: checkData._embedded && checkData._embedded.users ? checkData._embedded.users.length : 0,
                                responseKeys: Object.keys(checkData)
                            });
                            
                            if (checkData._embedded && checkData._embedded.users && checkData._embedded.users.length > 0) {
                                // User already exists
                                skipped++;
                                debugLog("Import", `⏭️ User already exists: ${username}`, { lineNumber: user._lineNumber });
                                sendProgressEvent(sessionId, processed, users.length, `Skipped: ${username} already exists`, 
                                    { processed, created, skipped, failed }, username, populationName, populationId, app);
                                continue;
                            }
                        } else {
                            // Log error but continue with user creation (don't skip on API error)
                            logger.warn(`[${new Date().toISOString()}] [WARN] Duplicate check failed for ${username}`, {
                                sessionId,
                                username,
                                status: checkResponse.status,
                                statusText: checkResponse.statusText
                            });
                        }
                    } else {
                        logger.info(`[${new Date().toISOString()}] [DEBUG] Skipping duplicate check for ${username} (SKIP_DUPLICATE_CHECK=true)`);
                    }
                    
                    // DEBUG: Log the user data and population before PingOne API call
                    logger.info(`[${new Date().toISOString()}] [DEBUG] Creating user in PingOne`, {
                        sessionId,
                        username,
                        populationId: populationId || 'MISSING',
                        populationName: populationName || 'MISSING',
                        lineNumber: user._lineNumber,
                        userData: {
                            username,
                            email: user.email || username,
                            givenName: user.givenname || user.firstname || user['first name'] || '',
                            familyName: user.familyname || user.lastname || user['last name'] || '',
                            population: {
                                id: populationId
                            }
                        }
                    });
                    if (logger.flush) await logger.flush();
                    
                    // Create user in PingOne
                    const createUrl = `https://api.pingone.com/v1/environments/${environmentId}/users`;
                    const userData = {
                        username: username,
                        email: user.email || username,
                        givenName: user.givenname || user.firstname || user['first name'] || '',
                        familyName: user.familyname || user.lastname || user['last name'] || '',
                        population: {
                            id: populationId
                        }
                    };
                    
                    // Add optional fields if present
                    if (user.phone) userData.phoneNumber = user.phone;
                    if (user.title) userData.title = user.title;
                    
                    // DEBUG: Log the user creation request
                    debugLog("Import", `🔍 Creating user in PingOne`, {
                        sessionId,
                        username,
                        populationId,
                        populationName,
                        lineNumber: user._lineNumber,
                        userData,
                        createUrl
                    });
                    
                    let createResponse, createData, errorText;
                    try {
                        createResponse = await fetch(createUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(userData)
                        });
                        if (!createResponse.ok) {
                            errorText = await createResponse.text();
                            
                            // Check if this is a uniqueness violation (user already exists)
                            let isUniquenessViolation = false;
                            try {
                                const errorData = JSON.parse(errorText);
                                isUniquenessViolation = errorData.code === 'INVALID_DATA' && 
                                    errorData.details && 
                                    errorData.details.some(detail => detail.code === 'UNIQUENESS_VIOLATION');
                            } catch (e) {
                                // If we can't parse the error, assume it's not a uniqueness violation
                            }
                            
                            if (isUniquenessViolation) {
                                // Treat uniqueness violation as a skip, not a failure
                                logger.info(`[${new Date().toISOString()}] [INFO] User already exists (uniqueness violation): ${username}`);
                                debugLog("Import", `⏭️ User already exists (uniqueness violation): ${username}`, { 
                                    lineNumber: user._lineNumber,
                                    errorText 
                                });
                                skipped++;
                                sendProgressEvent(sessionId, processed, users.length, `Skipped: ${username} already exists`, 
                                    { processed, created, skipped, failed }, username, populationName, populationId, app);
                                continue;
                            }
                            
                            // Log error to console for visibility
                            apiLogger.error('[USER CREATE ERROR]', {
                                sessionId,
                                username,
                                status: createResponse.status,
                                statusText: createResponse.statusText,
                                errorText,
                                userData
                            });
                            debugLog("Import", `❌ User creation failed`, {
                                sessionId,
                                username,
                                status: createResponse.status,
                                statusText: createResponse.statusText,
                                errorText,
                                userData
                            });
                            failed++;
                            continue;
                        }
                        createData = await createResponse.json();
                        created++;
                    } catch (err) {
                        // Log error to console for visibility
                        apiLogger.error('[USER CREATE EXCEPTION]', {
                            sessionId,
                            username,
                            error: err,
                            userData
                        });
                        debugLog("Import", `❌ User creation exception`, {
                            sessionId,
                            username,
                            error: err,
                            userData
                        });
                        failed++;
                        continue;
                    }
                    
                    debugLog("Import", `✅ User created successfully: ${username}`, { 
                        lineNumber: user._lineNumber,
                        populationName,
                        populationId
                    });
                    if (logger.flush) await logger.flush();
                    sendProgressEvent(sessionId, processed, users.length, `Created: ${username} in ${populationName}`, 
                        { processed, created, skipped, failed }, username, populationName, populationId, app);
                    
                } catch (error) {
                    const errorMsg = `Line ${user._lineNumber}: Error processing user ${user.username || user.email || 'unknown'} - ${error.message}`;
                    errors.push(errorMsg);
                    failed++;
                    debugLog("Import", `❌ ${errorMsg}`);
                    if (logger.flush) await logger.flush();
                    sendProgressEvent(sessionId, processed, users.length, `Error: ${user.username || user.email || 'unknown'}`, 
                        { processed, created, skipped, failed }, user.username || user.email || 'unknown', populationName, populationId, app);
                }
            }
            
            // Add delay between batches to avoid rate limiting
            if (i + batchSize < users.length) {
                debugLog("Import", `⏱️ Adding delay between batches: ${delayBetweenBatches}ms`);
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }
        
        const importDuration = Date.now() - importStart;
        logger.info(logSeparator('-'));
        logger.info(logTag('IMPORT SUMMARY'), { tag: logTag('IMPORT SUMMARY'), separator: logSeparator('-') });
        logger.info(`[${new Date().toISOString()}] [INFO] Import Summary:`, {
            total: users.length,
            processed,
            created,
            skipped,
            failed,
            durationMs: importDuration
        });
        logger.info('**********************************');
        logger.info(`* Population Name: ${populationName || 'MISSING'}`);
        logger.info(`* Population ID:   ${populationId || 'MISSING'}`);
        logger.info('*********** END IMPORT ***********');
        logger.info(logSeparator());
        logger.info(logTag('END OF IMPORT'), { tag: logTag('END OF IMPORT'), separator: logSeparator() });
        logger.info(`[${new Date().toISOString()}] [INFO] Import process completed`, { sessionId });
        if (logger.flush) await logger.flush();
        
        // Send completion event
        debugLog("Import", "🏁 Import process completed", {
            total: users.length,
            processed,
            created,
            skipped,
            failed,
            errors: errors.length
        });
        
        const finalMessage = `Import completed: ${created} created, ${failed} failed, ${skipped} skipped`;
        sendCompletionEvent(sessionId, processed, users.length, finalMessage, { processed, created, skipped, failed }, app);
        
        // Log import operation to history
        try {
            const session = importSessions.get(sessionId);
            if (session && session.file) {
                await logOperationToHistory({ ip: '127.0.0.1', get: () => 'Import Tool' }, {
                    type: 'IMPORT',
                    fileName: session.file.originalname,
                    populationName: session.populationName,
                    message: `Imported ${created} users, ${failed} failed, ${skipped} skipped from file "${session.file.originalname}"`,
                    success: created,
                    errors: failed,
                    skipped: skipped,
                    total: processed
                });
            }
        } catch (historyError) {
            apiLogger.error('Failed to log import to history:', historyError);
        }
        
        // Clean up session
        importSessions.delete(sessionId);
        
    } catch (error) {
        const logger = app.get('importLogger') || apiLogger;
        logger.error(logSeparator());
        logger.error(logTag('ERROR'), { tag: logTag('ERROR'), separator: logSeparator() });
        logger.error(`[${new Date().toISOString()}] [ERROR] Import failed: ${error.message}`, {
            error: error.message,
            stack: error.stack
        });
        logger.error(logSeparator());
        if (logger.flush) await logger.flush();
        
        sendErrorEvent(sessionId, 'Import failed', error.message, {}, app);
        
        // Clean up session on error
        const importSessions = app.get('importSessions');
        if (importSessions) {
            importSessions.delete(sessionId);
        }
    }
}

// ============================================================================
// FEATURE FLAGS MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/feature-flags:
 *   get:
 *     summary: Get all feature flags
 *     description: Retrieves all current feature flags and their states
 *     tags: [Feature Flags]
 *     responses:
 *       200:
 *         description: Feature flags retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 flags:
 *                   $ref: '#/components/schemas/FeatureFlags'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/feature-flags', (req, res) => {
    try {
        const flags = featureFlags.getAllFeatureFlags();
        res.json({ success: true, flags });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get feature flags', details: error.message });
    }
});

/**
 * @swagger
 * /api/feature-flags/{flag}:
 *   post:
 *     summary: Update feature flag
 *     description: Updates a specific feature flag's enabled state
 *     tags: [Feature Flags]
 *     parameters:
 *       - in: path
 *         name: flag
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature flag name to update
 *         example: A
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: New enabled state for the flag
 *                 example: true
 *             required:
 *               - enabled
 *     responses:
 *       200:
 *         description: Feature flag updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 flag:
 *                   type: string
 *                   example: A
 *                 enabled:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/feature-flags/:flag', (req, res) => {
    try {
        const { flag } = req.params;
        const { enabled } = req.body;
        
        // Validate that enabled is a boolean value
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'enabled must be a boolean' });
        }
        
        featureFlags.setFeatureFlag(flag, enabled);
        res.json({ success: true, flag, enabled });
    } catch (error) {
        res.status(500).json({ error: 'Failed to set feature flag', details: error.message });
    }
});

/**
 * @swagger
 * /api/feature-flags/reset:
 *   post:
 *     summary: Reset feature flags
 *     description: Resets all feature flags to their default values
 *     tags: [Feature Flags]
 *     responses:
 *       200:
 *         description: Feature flags reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Feature flags reset to defaults
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/feature-flags/reset', (req, res) => {
    try {
        featureFlags.resetFeatureFlags();
        res.json({ success: true, message: 'Feature flags reset to defaults' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset feature flags', details: error.message });
    }
});

// ============================================================================
// SOCKET.IO EVENT FUNCTIONS (Replaces SSE)
// ============================================================================

// Event functions are now imported from connection-manager.js

// Event functions are now imported from connection-manager.js

// Event functions are now imported from connection-manager.js

// ============================================================================
// MAIN IMPORT ENDPOINT
// ============================================================================

/**
 * @swagger
 * /api/import:
 *   post:
 *     summary: Import users from CSV
 *     description: Handles user import from CSV file with real-time progress tracking
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing user data
 *               populationId:
 *                 type: string
 *                 description: PingOne population ID
 *                 example: 3840c98d-202d-4f6a-8871-f3bc66cb3fa8
 *               populationName:
 *                 type: string
 *                 description: PingOne population name
 *                 example: Sample Users
 *               totalUsers:
 *                 type: number
 *                 description: Expected number of users in CSV
 *                 example: 100
 *             required:
 *               - file
 *               - populationId
 *               - populationName
 *     responses:
 *       200:
 *         description: Import started successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportResponse'
 *       400:
 *         description: Invalid request (missing file or population info)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       413:
 *         description: File too large (max 10MB)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /api/import:
 *   post:
 *     summary: Import users from CSV file
 *     description: |
 *       Uploads a CSV file and imports users into a specified PingOne population.
 *       This endpoint starts an asynchronous import process and returns a session ID
 *       for tracking progress via Server-Sent Events (SSE).
 *       
 *       ## Process Flow
 *       1. Validates the uploaded CSV file
 *       2. Checks population selection and permissions
 *       3. Generates a unique session ID for progress tracking
 *       4. Starts background import process
 *       5. Returns session ID for SSE connection
 *       
 *       ## CSV Format Requirements
 *       - Must contain header row with column names
 *       - Required columns: username or email
 *       - Optional columns: firstname, lastname, phone, title
 *       - Maximum file size: 10MB
 *       
 *       ## Progress Tracking
 *       Use the returned sessionId with `/api/import/progress/{sessionId}` 
 *       to receive real-time progress updates via SSE.
 *       
 *       ## Error Handling
 *       - Validates file format and size
 *       - Checks population existence and permissions
 *       - Handles duplicate user detection
 *       - Provides detailed error messages
 *     tags: [User Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing user data
 *               populationId:
 *                 type: string
 *                 description: PingOne population ID
 *                 example: 3840c98d-202d-4f6a-8871-f3bc66cb3fa8
 *               populationName:
 *                 type: string
 *                 description: PingOne population name
 *                 example: Sample Users
 *               totalUsers:
 *                 type: number
 *                 description: Expected number of users in CSV
 *                 example: 100
 *             required:
 *               - file
 *               - populationId
 *               - populationName
 *     responses:
 *       200:
 *         description: Import started successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportResponse'
 *             example:
 *               success: true
 *               sessionId: "session-12345"
 *               message: "Import started successfully"
 *               populationName: "Sample Users"
 *               populationId: "3840c98d-202d-4f6a-8871-f3bc66cb3fa8"
 *               totalUsers: 100
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "No file uploaded"
 *               message: "Please select a CSV file to import"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/import', upload.single('file'), async (req, res, next) => {
    try {
        const logger = req.app.get('importLogger') || apiLogger;
        logger.info(logSeparator());
        logger.info(logTag('IMPORT ENDPOINT HIT'), { tag: logTag('IMPORT ENDPOINT HIT'), separator: logSeparator() });
        logger.info(`[${new Date().toISOString()}] [INFO] Import endpoint triggered`, {
            file: req.file ? req.file.originalname : null,
            populationId: req.body.populationId,
            populationName: req.body.populationName
        });
        if (logger.flush) await logger.flush();
        
        debugLog("Import", "🚀 Import request received");
        
        // Validate file upload
        if (!req.file) {
            debugLog("Import", "❌ No file uploaded");
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
                message: 'Please select a CSV file to import'
            });
        }
        
        // Validate population selection
        const { populationId, populationName, totalUsers } = req.body;
        
        // DEBUG: Log the received population data
        logger.info(`[${new Date().toISOString()}] [DEBUG] Population data received from frontend`, {
            populationId: populationId || 'MISSING',
            populationName: populationName || 'MISSING',
            totalUsers: totalUsers || 'MISSING',
            hasPopulationId: !!populationId,
            hasPopulationName: !!populationName
        });
        if (logger.flush) await logger.flush();
        
        debugLog("Import", "🔍 Population data received", { 
            populationId: populationId || 'MISSING', 
            populationName: populationName || 'MISSING',
            totalUsers: totalUsers || 'MISSING'
        });
        
        if (!populationId || !populationName) {
            debugLog("Import", "❌ Missing population information", { populationId, populationName });
            logger.error(`[${new Date().toISOString()}] [ERROR] Missing population information`, {
                populationId: populationId || 'MISSING',
                populationName: populationName || 'MISSING'
            });
            if (logger.flush) await logger.flush();
            return res.status(400).json({
                success: false,
                error: 'Missing population information',
                message: 'Please select a population for the import'
            });
        }
        
        debugLog("Import", "✅ Import options validated", {
            totalUsers: parseInt(totalUsers) || 0,
            populationId,
            populationName,
            fileName: req.file.originalname
        });
        
        // Generate session ID for SSE connection
        const sessionId = uuidv4();
        
        // Store import session data
        const importSession = {
            sessionId,
            file: req.file,
            populationId,
            populationName,
            totalUsers: parseInt(totalUsers) || 0,
            startTime: new Date(),
            status: 'starting'
        };
        
        // DEBUG: Log the session data being stored
        logger.info(`[${new Date().toISOString()}] [DEBUG] Import session data stored`, {
            sessionId,
            populationId,
            populationName,
            totalUsers: parseInt(totalUsers) || 0,
            fileName: req.file.originalname
        });
        if (logger.flush) await logger.flush();
        
        // Store session in app context for SSE access
        if (!req.app.get('importSessions')) {
            req.app.set('importSessions', new Map());
        }
        req.app.get('importSessions').set(sessionId, importSession);
        
        debugLog("Import", "📋 Import session created", { sessionId });
        
        // Start import process in background with proper error handling
        runImportProcess(sessionId, req.app).catch(error => {
            debugLog("Import", "❌ Background import process failed", { error: error.message });
            sendErrorEvent(sessionId, 'Import failed', error.message, {}, req.app);
        });
        
        // Return session ID for SSE connection
        res.json({
            success: true,
            sessionId,
            message: 'Import started successfully',
            populationName,
            populationId,
            totalUsers: parseInt(totalUsers) || 0
        });
        
    } catch (error) {
        debugLog("Import", "❌ Import endpoint error", { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Import failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================================================
// Socket.IO Progress Tracking (Replaces SSE)
// ============================================================================
/**
 * @swagger
 * /api/import/progress/{sessionId}:
 *   get:
 *     summary: Get import progress via Socket.IO
 *     description: Socket.IO connection for real-time import progress (replaces SSE)
 *     tags: [Import]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Import session ID
 *         example: session-12345
 *     responses:
 *       200:
 *         description: Socket.IO connection established
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Use Socket.IO connection for real-time updates"
 *                 sessionId:
 *                   type: string
 *                   example: "session-12345"
 *       400:
 *         description: Invalid session ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/import/progress/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    // Validate session ID
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 8) {
        return res.status(400).json({ 
            error: 'Invalid session ID for Socket.IO connection', 
            code: 'INVALID_SESSION_ID',
            details: {
                sessionId,
                minLength: 8,
                actualLength: sessionId ? sessionId.length : 0
            }
        });
    }
    
    // Return information about using Socket.IO instead of SSE
    res.json({
        message: 'Use Socket.IO connection for real-time updates',
        sessionId,
        connectionType: 'socket.io',
        timestamp: new Date().toISOString()
    });
});

// ============================================================================
// USER EXPORT ENDPOINT
// ============================================================================

/**
 * @swagger
 * /api/export-users:
 *   post:
 *     summary: Export users from PingOne
 *     description: Exports users from PingOne in JSON or CSV format with optional filtering
 *     tags: [Export]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExportRequest'
 *     responses:
 *       200:
 *         description: Users exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExportResponse'
 *           text/csv:
 *             schema:
 *               type: string
 *               description: CSV file content
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Get operation history
 *     description: Retrieves operation history with optional filtering and pagination
 *     tags: [History]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of history items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: Filter by operation type (import, delete, modify, export)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering history
 *     responses:
 *       200:
 *         description: History data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                       fileName:
 *                         type: string
 *                       population:
 *                         type: string
 *                       message:
 *                         type: string
 *                       success:
 *                         type: integer
 *                       errors:
 *                         type: integer
 *                       skipped:
 *                         type: integer
 *                 total:
 *                   type: integer
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get('/history', async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`🔍 [History Debug] ${requestId} - Request started`);
    console.log(`🔍 [History Debug] ${requestId} - Query parameters:`, req.query);
    console.log(`🔍 [History Debug] ${requestId} - User Agent:`, req.get('User-Agent'));
    console.log(`🔍 [History Debug] ${requestId} - IP Address:`, req.ip);
    
    try {
        const { limit = 100, offset = 0, filter, search } = req.query;
        
        console.log(`🔍 [History Debug] ${requestId} - Parsed parameters:`, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            filter: filter || 'none',
            search: search || 'none'
        });
        
        // Read operation history from file
        const historyFilePath = path.join(process.cwd(), 'logs', 'operation-history.json');
        console.log(`🔍 [History Debug] ${requestId} - History file path:`, historyFilePath);
        
        let history = [];
        let fileExists = false;
        let fileSize = 0;
        
        try {
            // Check if file exists
            const stats = await fs.stat(historyFilePath);
            fileExists = true;
            fileSize = stats.size;
            console.log(`🔍 [History Debug] ${requestId} - File exists, size:`, fileSize, 'bytes');
            
            const historyData = await fs.readFile(historyFilePath, 'utf8');
            console.log(`🔍 [History Debug] ${requestId} - File read successfully, data length:`, historyData.length);
            
            history = JSON.parse(historyData);
            console.log(`🔍 [History Debug] ${requestId} - JSON parsed successfully, history items:`, history.length);
            
            // Log first few items for debugging
            if (history.length > 0) {
                console.log(`🔍 [History Debug] ${requestId} - First item:`, JSON.stringify(history[0], null, 2));
                if (history.length > 1) {
                    console.log(`🔍 [History Debug] ${requestId} - Second item:`, JSON.stringify(history[1], null, 2));
                }
            }
            
        } catch (error) {
            console.log(`🔍 [History Debug] ${requestId} - File read error:`, error.message);
            console.log(`🔍 [History Debug] ${requestId} - File exists:`, fileExists);
            console.log(`🔍 [History Debug] ${requestId} - File size:`, fileSize);
            // If file doesn't exist or is invalid, return empty history
            console.log(`🔍 [History Debug] ${requestId} - No operation history file found, returning empty history`);
        }
        
        console.log(`🔍 [History Debug] ${requestId} - Initial history count:`, history.length);
        
        // Apply filters if provided
        let filteredHistory = history;
        
        if (filter) {
            console.log(`🔍 [History Debug] ${requestId} - Applying filter:`, filter);
            const beforeFilterCount = filteredHistory.length;
            filteredHistory = filteredHistory.filter(item => 
                item.type && item.type.toLowerCase() === filter.toLowerCase()
            );
            console.log(`🔍 [History Debug] ${requestId} - After filter:`, filteredHistory.length, 'items (was', beforeFilterCount, ')');
            
            // Log filtered items for debugging
            if (filteredHistory.length > 0) {
                console.log(`🔍 [History Debug] ${requestId} - Filtered items:`, filteredHistory.map(item => ({
                    id: item.id,
                    type: item.type,
                    timestamp: item.timestamp,
                    fileName: item.fileName
                })));
            }
        }
        
        if (search) {
            console.log(`🔍 [History Debug] ${requestId} - Applying search:`, search);
            const beforeSearchCount = filteredHistory.length;
            const searchLower = search.toLowerCase();
            filteredHistory = filteredHistory.filter(item => 
                (item.fileName && item.fileName.toLowerCase().includes(searchLower)) ||
                (item.population && item.population.toLowerCase().includes(searchLower)) ||
                (item.message && item.message.toLowerCase().includes(searchLower)) ||
                (item.type && item.type.toLowerCase().includes(searchLower))
            );
            console.log(`🔍 [History Debug] ${requestId} - After search:`, filteredHistory.length, 'items (was', beforeSearchCount, ')');
            
            // Log search results for debugging
            if (filteredHistory.length > 0) {
                console.log(`🔍 [History Debug] ${requestId} - Search results:`, filteredHistory.map(item => ({
                    id: item.id,
                    type: item.type,
                    fileName: item.fileName,
                    population: item.population,
                    message: item.message
                })));
            }
        }
        
        console.log(`🔍 [History Debug] ${requestId} - After filtering/search:`, filteredHistory.length, 'items');
        
        // Apply pagination
        const totalItems = filteredHistory.length;
        const startIndex = parseInt(offset);
        const endIndex = startIndex + parseInt(limit);
        const paginatedHistory = filteredHistory.slice(startIndex, endIndex);
        
        console.log(`🔍 [History Debug] ${requestId} - Pagination:`, {
            totalItems,
            startIndex,
            endIndex,
            paginatedCount: paginatedHistory.length
        });
        
        // Sort by timestamp (newest first)
        console.log(`🔍 [History Debug] ${requestId} - Sorting by timestamp (newest first)`);
        paginatedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const responseData = {
            success: true,
            history: paginatedHistory,
            total: totalItems,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };
        
        const duration = Date.now() - startTime;
        console.log(`🔍 [History Debug] ${requestId} - Response prepared:`, {
            success: responseData.success,
            historyCount: responseData.history.length,
            total: responseData.total,
            limit: responseData.limit,
            offset: responseData.offset,
            duration: `${duration}ms`
        });
        
        res.json(responseData);
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`🔍 [History Debug] ${requestId} - Error occurred after ${duration}ms:`, error);
        console.error(`🔍 [History Debug] ${requestId} - Error stack:`, error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve history',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @swagger
 * /api/populations:
 *   get:
 *     summary: Get PingOne populations
 *     description: |
 *       Retrieves all populations from the configured PingOne environment.
 *       This endpoint fetches population data including user counts and metadata.
 *       
 *       ## Population Data
 *       - Population ID and name
 *       - Description and metadata
 *       - User count for each population
 *       - Creation and update timestamps
 *       
 *       ## Authentication
 *       Requires valid PingOne API credentials configured in settings.
 *       
 *       ## Rate Limiting
 *       Subject to PingOne API rate limits for population queries.
 *       
 *       ## Error Handling
 *       - Handles authentication failures gracefully
 *       - Provides detailed error messages for debugging
 *       - Returns empty array if no populations found
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Populations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PopulationsResponse'
 *             example:
 *               success: true
 *               populations: [
 *                 {
 *                   id: "3840c98d-202d-4f6a-8871-f3bc66cb3fa8",
 *                   name: "Sample Users",
 *                   description: "This is a sample user population",
 *                   userCount: 380
 *                 }
 *               ]
 *               total: 5
 *       401:
 *         description: Authentication error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/populations', async (req, res) => {
    try {
        // Get token manager from Express app context
        const tokenManager = req.app.get('tokenManager');
        if (!tokenManager) {
            console.error('[Populations] Token manager not available');
            return res.status(500).json({ success: false, error: 'Token manager not available' });
        }
        
        // Get environment ID and API base URL from token manager
        const environmentId = await tokenManager.getEnvironmentId();
        if (!environmentId) {
            console.error('[Populations] Environment ID not configured');
            return res.status(500).json({ 
                success: false, 
                error: 'Environment ID not configured',
                details: 'Please configure your Environment ID in the Settings page'
            });
        }
        
        // Get API base URL from token manager
        const apiBaseUrl = tokenManager.getApiBaseUrl();
        
        // Get access token
        const token = await tokenManager.getAccessToken();
        if (!token) {
            console.error('[Populations] Failed to get access token');
            return res.status(401).json({ success: false, error: 'Failed to get access token' });
        }
        
        // Fetch populations from PingOne API
        const populationsUrl = `${apiBaseUrl}/environments/${environmentId}/populations`;
        const response = await fetch(populationsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Populations] ❌ Failed to fetch populations: ${response.status} ${errorText}`);
            return res.status(response.status).json({
                success: false,
                error: `Failed to fetch populations: ${response.statusText}`,
                details: errorText
            });
        }
        
        const data = await response.json();
        const populations = data._embedded?.populations || [];
        
        console.log(`[Populations] ✅ Fetched ${populations.length} populations`);
        
        // Format populations for frontend
        const formattedPopulations = populations.map(population => ({
            id: population.id,
            name: population.name,
            description: population.description || '',
            userCount: population.userCount || 0
        }));
        
        res.json({
            success: true,
            populations: formattedPopulations,
            total: formattedPopulations.length
        });
        
    } catch (error) {
        console.error(`[Populations] ❌ Populations error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch populations',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/export-users:
 *   post:
 *     summary: Export users from population
 *     description: |
 *       Exports users from a specified PingOne population in JSON or CSV format.
 *       This endpoint fetches user data from PingOne API and returns it in the
 *       requested format with optional field filtering.
 *       
 *       ## Export Options
 *       - **Format**: JSON or CSV output
 *       - **Fields**: All fields, basic fields only, or custom selection
 *       - **Population**: Export from specific population or all populations
 *       - **User Status**: Include or exclude disabled users
 *       
 *       ## Field Selection
 *       - **all**: Complete user data including all PingOne fields
 *       - **basic**: Essential fields (id, username, email, firstName, lastName, enabled)
 *       - **custom**: User-defined field selection (not implemented in current version)
 *       
 *       ## Response Format
 *       - **JSON**: Structured data with user objects
 *       - **CSV**: Comma-separated values with header row
 *       
 *       ## Rate Limiting
 *       Export operations are subject to PingOne API rate limits.
 *       Large exports may take time to complete.
 *     tags: [User Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               populationId:
 *                 type: string
 *                 description: PingOne population ID (empty for all populations)
 *                 example: 3840c98d-202d-4f6a-8871-f3bc66cb3fa8
 *               selectedPopulationId:
 *                 type: string
 *                 description: Alternative field name for population ID
 *                 example: 3840c98d-202d-4f6a-8871-f3bc66cb3fa8
 *               format:
 *                 type: string
 *                 enum: [json, csv]
 *                 description: Export format
 *                 example: csv
 *               fields:
 *                 type: string
 *                 enum: [all, basic, custom]
 *                 description: Field selection for export
 *                 example: basic
 *               ignoreDisabledUsers:
 *                 type: boolean
 *                 description: Include disabled users in export
 *                 example: false
 *             required:
 *               - populationId
 *     responses:
 *       200:
 *         description: Export completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExportResponse'
 *             example:
 *               success: true
 *               data: [
 *                 {
 *                   id: "user-123",
 *                   username: "john.doe@example.com",
 *                   email: "john.doe@example.com",
 *                   firstName: "John",
 *                   lastName: "Doe",
 *                   enabled: true
 *                 }
 *               ]
 *               total: 100
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/export-users', async (req, res, next) => {
    try {
        // Get token manager from Express app context
        const tokenManager = req.app.get('tokenManager');
        if (!tokenManager) {
            return res.status(500).json({
                success: false,
                error: 'Token manager not available'
            });
        }

        // Extract and normalize request parameters
        const { 
            populationId, 
            selectedPopulationId, // Frontend sends this
            fields, 
            format, 
            ignoreDisabledUsers 
        } = req.body;
        
        // Handle both field name variations
        const actualPopulationId = populationId || selectedPopulationId;
        
        // Convert ignoreDisabledUsers to boolean if it's a string (handles form data)
        const shouldIgnoreDisabledUsers = ignoreDisabledUsers === true || ignoreDisabledUsers === 'true';
        
        // Enhanced validation with detailed error messages
        if (!actualPopulationId && actualPopulationId !== '') {
            console.error('Export validation failed: Missing population ID', {
                received: { populationId, selectedPopulationId },
                body: req.body
            });
            return res.status(400).json({
                error: 'Missing required field',
                message: 'Population ID is required for export operations',
                details: {
                    received: { populationId, selectedPopulationId },
                    expected: 'populationId or selectedPopulationId'
                }
            });
        }

        // Validate format parameter
        const validFormats = ['csv', 'json'];
        if (format && !validFormats.includes(format)) {
            console.error('Export validation failed: Invalid format', {
                received: format,
                validFormats
            });
            return res.status(400).json({
                error: 'Invalid format',
                message: `Format must be one of: ${validFormats.join(', ')}`,
                details: {
                    received: format,
                    validFormats
                }
            });
        }

        // Validate fields parameter
        const validFields = ['all', 'basic', 'custom'];
        if (fields && !validFields.includes(fields)) {
            console.error('Export validation failed: Invalid fields', {
                received: fields,
                validFields
            });
            return res.status(400).json({
                error: 'Invalid fields',
                message: `Fields must be one of: ${validFields.join(', ')}`,
                details: {
                    received: fields,
                    validFields
                }
            });
        }

        console.log('Export validation passed, proceeding with export', {
            populationId: actualPopulationId,
            fields: fields || 'all',
            format: format || 'csv',
            ignoreDisabledUsers: shouldIgnoreDisabledUsers
        });

        // Get access token and environment ID directly from token manager
        const token = await tokenManager.getAccessToken();
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Failed to get access token - check your PingOne credentials'
            });
        }

        const environmentId = await tokenManager.getEnvironmentId();
        if (!environmentId) {
            return res.status(400).json({
                success: false,
                error: 'Environment ID is required',
                message: 'Please configure your Environment ID in the Settings page'
            });
        }

        // Build PingOne API URL directly
        let pingOneUrl = `${tokenManager.getApiBaseUrl()}/environments/${environmentId}/users`;
        const params = new URLSearchParams();
        
        // Add population filter if specified (empty string means all populations)
        if (actualPopulationId && actualPopulationId.trim() !== '') {
            params.append('population.id', actualPopulationId.trim());
        }
        
        // Always expand population details to get population name and ID in response
        params.append('expand', 'population');
        
        // Append query parameters if any exist
        if (params.toString()) {
            pingOneUrl += `?${params.toString()}`;
        }

        console.log('Fetching users from PingOne API:', pingOneUrl);

        const pingOneResponse = await fetch(pingOneUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!pingOneResponse.ok) {
            const errorData = await pingOneResponse.json().catch(() => ({}));
            console.error('PingOne API request failed:', {
                status: pingOneResponse.status,
                statusText: pingOneResponse.statusText,
                errorData
            });
            return res.status(pingOneResponse.status).json({
                error: 'Failed to fetch users from PingOne',
                message: errorData.message || `HTTP ${pingOneResponse.status}: ${pingOneResponse.statusText}`,
                details: errorData
            });
        }

        let users = await pingOneResponse.json();
        
        // Handle PingOne API response format variations
        // PingOne can return users directly as array or nested in _embedded.users
        if (users._embedded && users._embedded.users) {
            users = users._embedded.users;
        } else if (!Array.isArray(users)) {
            users = [];
        }

        console.log('Users fetched successfully:', {
            count: users.length,
            populationId: actualPopulationId
        });

        // Filter out disabled users if the ignore flag is set
        // This provides a way to export only active users
        if (shouldIgnoreDisabledUsers) {
            const originalCount = users.length;
            users = users.filter(user => user.enabled !== false);
            console.log('Filtered disabled users:', {
                originalCount,
                filteredCount: users.length,
                disabledCount: originalCount - users.length
            });
        }

        // Check if population information is available in the user objects
        // This determines whether we need to fetch population data separately
        let hasPopulationInfo = false;
        if (users.length > 0 && users[0].population) {
            hasPopulationInfo = true;
        }

        // If population info is not available, try to fetch it separately
        if (!hasPopulationInfo && actualPopulationId && actualPopulationId.trim() !== '') {
            try {
                const populationResponse = await fetch(`http://127.0.0.1:4000/api/pingone/populations/${actualPopulationId.trim()}`);
                if (populationResponse.ok) {
                    const populationData = await populationResponse.json();
                    const populationName = populationData.name || '';
                    
                    // Add population information to all users
                    users = users.map(user => ({
                        ...user,
                        population: {
                            id: actualPopulationId.trim(),
                            name: populationName
                        }
                    }));
                    console.log('Added population info to users:', {
                        populationId: actualPopulationId.trim(),
                        populationName
                    });
                }
            } catch (error) {
                console.warn('Failed to fetch population info:', error.message);
            }
        }
        
        // Process user data based on the requested field selection
        // This transforms the raw PingOne API response into the desired format
        let processedUsers = users;
        
        if (fields === 'basic') {
            // Basic fields: minimal set of essential user information
            // Useful for quick exports with core user data only
            processedUsers = users.map(user => ({
                id: user.id,
                username: user.username || '',
                email: user.email || '',
                populationId: user.population?.id || '',
                populationName: user.population?.name || '',
                enabled: user.enabled || false
            }));
        } else if (fields === 'custom') {
            // Custom fields: comprehensive field mapping with nested object flattening
            // Excludes complex objects and _links, flattens nested structures for CSV compatibility
            processedUsers = users.map(user => {
                const customFields = {};
                
                Object.keys(user).forEach(key => {
                    // Skip _links entirely (PingOne API metadata)
                    if (key === '_links') {
                        return;
                    }
                    
                    const value = user[key];
                    
                    // Handle nested objects by flattening or extracting meaningful values
                    // This prevents [object Object] in CSV exports
                    if (typeof value === 'object' && value !== null) {
                        if (key === 'name') {
                            // Flatten name object into givenName and familyName
                            customFields.givenName = value.given || '';
                            customFields.familyName = value.family || '';
                        } else if (key === 'population') {
                            // Flatten population object into populationId and populationName
                            customFields.populationId = value.id || '';
                            customFields.populationName = value.name || '';
                        } else if (key === 'environment') {
                            customFields.environmentId = value.id || '';
                        } else if (key === 'account') {
                            customFields.accountId = value.id || '';
                        } else if (key === 'identityProvider') {
                            customFields.identityProviderType = value.type || '';
                        } else if (key === 'lifecycle') {
                            customFields.lifecycleStatus = value.status || '';
                        } else if (key === 'address') {
                            // Flatten address object into individual address fields
                            customFields.streetAddress = value.streetAddress || '';
                            customFields.locality = value.locality || '';
                            customFields.region = value.region || '';
                            customFields.postalCode = value.postalCode || '';
                            customFields.countryCode = value.countryCode || '';
                        } else {
                            // Skip other complex objects to avoid [object Object] in CSV
                        }
                    } else {
                        // Include primitive values as-is
                        customFields[key] = value;
                    }
                });
                return {
                    id: user.id,
                    populationId: user.population?.id || '',
                    populationName: user.population?.name || '',
                    ...customFields
                };
            });
        } else {
            // All fields: comprehensive export with all available data
            // Similar to custom but processes all users with complete field mapping
            processedUsers = users.map(user => {
                const processedUser = {};
                
                Object.keys(user).forEach(key => {
                    // Skip _links entirely (PingOne API metadata)
                    if (key === '_links') {
                        return;
                    }
                    
                    const value = user[key];
                    
                    // Handle nested objects by flattening or extracting meaningful values
                    if (typeof value === 'object' && value !== null) {
                        if (key === 'name') {
                            // Flatten name object into givenName and familyName
                            processedUser.givenName = value.given || '';
                            processedUser.familyName = value.family || '';
                        } else if (key === 'population') {
                            // Flatten population object into populationId and populationName
                            processedUser.populationId = value.id || '';
                            processedUser.populationName = value.name || '';
                        } else if (key === 'environment') {
                            processedUser.environmentId = value.id || '';
                        } else if (key === 'account') {
                            processedUser.accountId = value.id || '';
                        } else if (key === 'address') {
                            // Flatten address object into individual address fields
                            processedUser.streetAddress = value.streetAddress || '';
                            processedUser.locality = value.locality || '';
                            processedUser.region = value.region || '';
                            processedUser.postalCode = value.postalCode || '';
                            processedUser.countryCode = value.countryCode || '';
                        } else if (key === 'identityProvider') {
                            processedUser.identityProviderType = value.type || '';
                            processedUser.identityProviderName = value.name || '';
                        } else if (key === 'lifecycle') {
                            processedUser.lifecycleStatus = value.status || '';
                        } else {
                            // Skip other complex objects to avoid [object Object] in CSV
                        }
                    } else {
                        // Include primitive values as-is
                        processedUser[key] = value;
                    }
                });
                
                return processedUser;
            });
        }

        console.log('User processing completed:', {
            originalCount: users.length,
            processedCount: processedUsers.length,
            fields: fields || 'all'
        });

        // Convert processed user data to the requested output format
        // Supports both JSON and CSV formats with proper content type headers
        let output;
        let contentType;
        let fileName;
        
        if (format === 'json') {
            // JSON format: pretty-printed with 2-space indentation
            output = JSON.stringify(processedUsers, null, 2);
            contentType = 'application/json';
            fileName = `pingone-users-export-${new Date().toISOString().split('T')[0]}.json`;
        } else {
            // CSV format: comma-separated values with proper escaping
            if (processedUsers.length === 0) {
                output = '';
            } else {
                // Extract headers from the first user object
                const headers = Object.keys(processedUsers[0]);
                const csvRows = [headers.join(',')];
                
                // Convert each user to a CSV row with proper escaping
                processedUsers.forEach(user => {
                    const row = headers.map(header => {
                        const value = user[header];
                        // Escape commas and quotes in CSV values
                        // Double quotes are escaped by doubling them
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value || '';
                    });
                    csvRows.push(row.join(','));
                });
                
                output = csvRows.join('\n');
            }
            contentType = 'text/csv';
            fileName = `pingone-users-export-${new Date().toISOString().split('T')[0]}.csv`;
        }

        console.log('Export completed successfully:', {
            format: format || 'csv',
            userCount: processedUsers.length,
            fileName,
            contentType
        });

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(output);

        // Log export operation
        logger.info('********** START EXPORT **********');
        logger.info(`* Population ID:   ${actualPopulationId || 'ALL'}`);
        logger.info('**********************************');
        logger.info(`[${new Date().toISOString()}] [INFO] Export operation completed`, {
            populationId: actualPopulationId,
            populationName: req.body.populationName,
            userCount: users.length,
            format,
            includeDisabled: shouldIgnoreDisabledUsers,
            includeMetadata: req.body.includeMetadata,
            useOverrideCredentials: req.body.useOverrideCredentials,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        logger.info(logTag('END OF EXPORT'), { tag: logTag('END OF EXPORT'), separator: logSeparator() });
        logger.info('**********************************');
        logger.info(`* Population ID:   ${actualPopulationId || 'ALL'}`);
        logger.info('*********** END EXPORT ***********');
    } catch (error) {
        console.error('Export operation failed:', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });
        next(error);
    }
});

/**
 * Decode JWT token for environment extraction
 */
function decodeJWT(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return { payload };
}

/**
 * Log export token generation for audit
 */
function logExportTokenGeneration(req, environmentId, expiresAt) {
    const logger = req.app.get('importLogger') || apiLogger;
    
    logger.info(logSeparator());
    logger.info(logTag('EXPORT TOKEN GENERATION'), { tag: logTag('EXPORT TOKEN GENERATION'), separator: logSeparator() });
    logger.info(`[${new Date().toISOString()}] [INFO] Export token generated`, {
        environmentId,
        expiresAt,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });
    logger.info(logTag('END OF TOKEN GENERATION'), { tag: logTag('END OF TOKEN GENERATION'), separator: logSeparator() });
    
    const logEntry = {
        timestamp: new Date().toISOString(),
        action: 'EXPORT_TOKEN_GENERATION',
        environmentId,
        expiresAt,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    };

    debugLog("Export", "📝 Export token generation logged", logEntry);
}

/**
 * Log export operation for audit
 */
// Helper function to log operations to history
async function logOperationToHistory(req, operationData) {
    try {
        const historyEntry = {
            id: uuidv4(),
            type: operationData.type || 'UNKNOWN',
            timestamp: new Date().toISOString(),
            fileName: operationData.fileName || null,
            population: operationData.populationName || operationData.populationId || null,
            message: operationData.message || 'Operation completed',
            success: operationData.success || 0,
            errors: operationData.errors || 0,
            skipped: operationData.skipped || 0,
            total: operationData.total || 0,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            environmentId: operationData.environmentId || null
        };

        // Read existing history
        const historyFilePath = path.join(process.cwd(), 'logs', 'operation-history.json');
        let history = [];
        
        try {
            const historyData = await fs.readFile(historyFilePath, 'utf8');
            history = JSON.parse(historyData);
        } catch (error) {
            // If file doesn't exist or is invalid, start with empty array
            console.log('Creating new operation history file');
        }

        // Add new entry
        history.push(historyEntry);

        // Keep only the most recent 1000 entries
        if (history.length > 1000) {
            history = history.slice(-1000);
        }

        // Write back to file
        await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2));
        
        console.log('Operation logged to history successfully');
    } catch (error) {
        console.error('Error logging operation to history:', error);
    }
}

function logExportOperation(req, operationData) {
    const logger = req.app.get('importLogger') || apiLogger;
    
    logger.info(logSeparator());
    logger.info(logTag('EXPORT OPERATION SUMMARY'), { tag: logTag('EXPORT OPERATION SUMMARY'), separator: logSeparator('-') });
    logger.info(`[${new Date().toISOString()}] [INFO] Export operation completed`, {
        populationId: operationData.populationId,
        populationName: operationData.populationName,
        userCount: operationData.userCount,
        format: operationData.format,
        includeDisabled: operationData.includeDisabled,
        includeMetadata: operationData.includeMetadata,
        useOverrideCredentials: operationData.useOverrideCredentials,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });
    logger.info(logTag('END OF EXPORT'), { tag: logTag('END OF EXPORT'), separator: logSeparator() });
    
    const logEntry = {
        timestamp: new Date().toISOString(),
        action: 'EXPORT_USERS',
        ...operationData,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    };

    debugLog("Export", "📝 Export operation logged", logEntry);
    
    // Also log to operations history
    logOperationToHistory(req, {
        type: 'EXPORT',
        fileName: null,
        populationName: operationData.populationName,
        message: `Exported ${operationData.userCount} users from population "${operationData.populationName}"`,
        success: operationData.userCount,
        errors: 0,
        skipped: 0,
        total: operationData.userCount
    });
}

/**
 * @swagger
 * /api/pingone/get-token:
 *   post:
 *     summary: Get PingOne access token
 *     description: |
 *       Retrieves an access token from PingOne using client credentials flow.
 *       This endpoint handles authentication with PingOne API and returns a token
 *       that can be used for subsequent API requests.
 *     tags: [PingOne API]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               useOverrideCredentials:
 *                 type: boolean
 *                 description: Whether to use override credentials instead of stored settings
 *                 default: false
 *     responses:
 *       200:
 *         description: Token retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 access_token:
 *                   type: string
 *                   description: The access token for PingOne API
 *                 token_type:
 *                   type: string
 *                   example: "Bearer"
 *                 expires_in:
 *                   type: integer
 *                   description: Token expiration time in seconds
 *                   example: 3600
 *       400:
 *         description: Bad request - missing credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/pingone/get-token', async (req, res, next) => {
    try {
        console.log('[DEBUG] /api/pingone/get-token called');
        
        // Get token manager from app
        const tokenManager = req.app.get('tokenManager');
        if (!tokenManager) {
            console.error('[DEBUG] Token manager not available');
            return res.status(500).json({
                success: false,
                error: 'Token manager not available'
            });
        }

        // Get access token using token manager
        const token = await tokenManager.getAccessToken();
        
        if (!token) {
            console.error('[DEBUG] Failed to get access token');
            return res.status(401).json({
                success: false,
                error: 'Failed to get access token',
                details: 'Please check your PingOne API credentials in the Settings page or data/settings.json file'
            });
        }

        // Return token response
        console.log('[DEBUG] Token retrieved successfully');
        res.json({
            success: true,
            access_token: token,
            token_type: 'Bearer',
            expires_in: 3600 // Default expiry time
        });

    } catch (error) {
        console.error('[DEBUG] Error in /api/pingone/get-token:', error.stack || error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

// --- VERSION ENDPOINT ---
router.get('/version', (req, res) => {
    // You can import VersionManager or use a static version string
    // For now, use a static version
    res.json({ version: '6.3.0' });
});

// --- DELETE USERS ENDPOINT ---
router.post('/delete-users', upload.single('file'), async (req, res) => {
    try {
        debugLog("Delete", "🔄 Delete users request received", {
            hasFile: !!req.file,
            populationId: req.body.populationId,
            type: req.body.type,
            skipNotFound: req.body.skipNotFound
        });

        // Get token manager from app
        const tokenManager = req.app.get('tokenManager');
        if (!tokenManager) {
            return res.status(500).json({
                success: false,
                error: 'Token manager not available'
            });
        }

        // Get access token
        const token = await tokenManager.getAccessToken();
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Failed to get access token - check your PingOne credentials'
            });
        }

        // Get environment ID and API base URL from token manager
        const environmentId = await tokenManager.getEnvironmentId();
        if (!environmentId) {
            return res.status(400).json({
                success: false,
                error: 'Environment ID not configured'
            });
        }

        // Get API base URL from token manager
        const apiBaseUrl = tokenManager.getApiBaseUrl();

        // Parse CSV file if provided, or get all users from population
        let usersToDelete = [];
        if (req.file) {
            const csvContent = req.file.buffer.toString('utf8');
            const lines = csvContent.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'CSV file must contain at least a header row and one data row'
                });
            }

            // Parse header and data
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            usersToDelete = lines.slice(1).map((line, index) => {
                const values = line.split(',').map(v => v.trim());
                const user = {};
                headers.forEach((header, i) => {
                    user[header] = values[i] || '';
                });
                user._lineNumber = index + 2;
                return user;
            });

            debugLog("Delete", "📄 CSV parsed successfully", { 
                totalUsers: usersToDelete.length,
                headers: headers
            });
        } else if (req.body.type === 'population' && req.body.populationId) {
            // Get all users from the specified population
            debugLog("Delete", "👥 Fetching all users from population", {
                populationId: req.body.populationId
            });

            try {
                const populationResponse = await fetch(
                    `${apiBaseUrl}/environments/${environmentId}/populations/${req.body.populationId}/users`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (populationResponse.ok) {
                    const populationData = await populationResponse.json();
                    if (populationData._embedded && populationData._embedded.users) {
                        usersToDelete = populationData._embedded.users.map(user => ({
                            username: user.username,
                            email: user.primaryEmail?.address,
                            id: user.id
                        }));
                        debugLog("Delete", "👥 Population users fetched successfully", {
                            totalUsers: usersToDelete.length,
                            populationId: req.body.populationId
                        });
                    } else {
                        debugLog("Delete", "👥 No users found in population", {
                            populationId: req.body.populationId
                        });
                    }
                } else {
                    const errorText = await populationResponse.text();
                    debugLog("Delete", "❌ Failed to fetch population users", {
                        populationId: req.body.populationId,
                        status: populationResponse.status,
                        error: errorText
                    });
                    return res.status(populationResponse.status).json({
                        success: false,
                        error: `Failed to fetch users from population: ${populationResponse.status} ${populationResponse.statusText}`,
                        details: errorText
                    });
                }
            } catch (error) {
                debugLog("Delete", "❌ Error fetching population users", {
                    populationId: req.body.populationId,
                    error: error.message
                });
                return res.status(500).json({
                    success: false,
                    error: `Error fetching users from population: ${error.message}`
                });
            }
        }

        // Initialize progress tracking
        let processed = 0;
        let deleted = 0;
        let skipped = 0;
        let failed = 0;
        let errors = [];

        const skipNotFound = req.body.skipNotFound === 'true';
        const populationId = req.body.populationId;

        debugLog("Delete", "🗑️ Starting delete process", {
            totalUsers: usersToDelete.length,
            populationId,
            skipNotFound
        });

        // Process each user for deletion
        for (const user of usersToDelete) {
            try {
                processed++;
                
                // Find user by username or email, or use existing user data
                let existingUser = null;
                let lookupMethod = '';

                // If user already has an ID (from population fetch), use it directly
                if (user.id) {
                    existingUser = user;
                    lookupMethod = 'id';
                    debugLog("Delete", `🗑️ Using user with existing ID`, {
                        user: existingUser.username || existingUser.email,
                        userId: existingUser.id
                    });
                } else {
                    // Try to find user by username first
                    if (user.username) {
                        try {
                            const searchResponse = await fetch(
                                `${apiBaseUrl}/environments/${environmentId}/users?filter=username eq "${user.username}"`,
                                {
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    }
                                }
                            );

                            if (searchResponse.ok) {
                                const searchData = await searchResponse.json();
                                if (searchData._embedded && searchData._embedded.users && searchData._embedded.users.length > 0) {
                                    existingUser = searchData._embedded.users[0];
                                    lookupMethod = 'username';
                                }
                            }
                        } catch (error) {
                            debugLog("Delete", `🔍 Username lookup failed for "${user.username}"`, { error: error.message });
                        }
                    }

                    // Try to find user by email if not found by username
                    if (!existingUser && user.email) {
                        try {
                            const searchResponse = await fetch(
                                `${apiBaseUrl}/environments/${environmentId}/users?filter=email eq "${user.email}"`,
                                {
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    }
                                }
                            );

                            if (searchResponse.ok) {
                                const searchData = await searchResponse.json();
                                if (searchData._embedded && searchData._embedded.users && searchData._embedded.users.length > 0) {
                                    existingUser = searchData._embedded.users[0];
                                    lookupMethod = 'email';
                                }
                            }
                        } catch (error) {
                            debugLog("Delete", `🔍 Email lookup failed for "${user.email}"`, { error: error.message });
                        }
                    }
                }

                // Delete user if found
                if (existingUser) {
                    debugLog("Delete", `🗑️ Deleting user found by ${lookupMethod}`, {
                        user: existingUser.username || existingUser.email,
                        userId: existingUser.id
                    });

                    const deleteResponse = await fetch(
                        `${apiBaseUrl}/environments/${environmentId}/users/${existingUser.id}`,
                        {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    if (deleteResponse.ok) {
                        deleted++;
                        debugLog("Delete", `✅ Successfully deleted user`, {
                            user: existingUser.username || existingUser.email
                        });
                    } else {
                        const errorText = await deleteResponse.text();
                        const errorMessage = `Failed to delete user: ${deleteResponse.status} ${deleteResponse.statusText}`;
                        errors.push({
                            user: user.username || user.email || 'Unknown',
                            error: errorMessage,
                            details: errorText
                        });
                        failed++;
                        debugLog("Delete", `❌ Failed to delete user`, {
                            user: existingUser.username || existingUser.email,
                            error: errorMessage
                        });
                    }
                } else {
                    if (skipNotFound) {
                        skipped++;
                        debugLog("Delete", `⏭️ User not found, skipping`, {
                            user: user.username || user.email || 'Unknown'
                        });
                    } else {
                        failed++;
                        errors.push({
                            user: user.username || user.email || 'Unknown',
                            error: 'User not found'
                        });
                        debugLog("Delete", `❌ User not found`, {
                            user: user.username || user.email || 'Unknown'
                        });
                    }
                }

                // Rate limiting - add small delay between requests
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                failed++;
                const errorMessage = `Error processing user: ${error.message}`;
                errors.push({
                    user: user.username || user.email || 'Unknown',
                    error: errorMessage
                });
                debugLog("Delete", `❌ Error processing user`, {
                    user: user.username || user.email || 'Unknown',
                    error: error.message
                });
            }
        }

        const result = {
            success: true,
            totalUsers: usersToDelete.length,
            processed,
            deleted,
            deletedCount: deleted, // Add this for frontend compatibility
            skipped,
            failed,
            errors: errors.length > 0 ? errors : undefined,
            counts: {
                total: usersToDelete.length,
                processed,
                deleted,
                skipped,
                failed
            }
        };

        debugLog("Delete", "✅ Delete operation completed", result);

        // Log delete operation to history
        try {
            const deleteType = req.body.type || 'unknown';
            const fileName = req.file ? req.file.originalname : null;
            const populationId = req.body.populationId;
            
            await logOperationToHistory(req, {
                type: 'DELETE',
                fileName: fileName,
                populationName: populationId,
                message: `Deleted ${deleted} users, ${failed} failed, ${skipped} skipped (${deleteType} mode)`,
                success: deleted,
                errors: failed,
                skipped: skipped,
                total: usersToDelete.length
            });
        } catch (historyError) {
            console.error('Failed to log delete to history:', historyError);
        }

        res.json(result);

    } catch (error) {
        debugLog("Delete", "❌ Delete operation failed", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

// ============================================================================
// SETTINGS ENDPOINTS
// ============================================================================

/**
 * Test connection endpoint
 * POST /api/test-connection
 * Tests the current settings by attempting to get a new token
 */
router.post('/test-connection', async (req, res) => {
    try {
        debugLog("Settings", "🔌 Testing connection with current settings");
        
        // Get token manager from app
        const tokenManager = req.app.get('tokenManager');
        if (!tokenManager) {
            throw new Error('Token manager not available');
        }
        
        // Attempt to get a new token
        const token = await tokenManager.getAccessToken();
        
        if (!token) {
            throw new Error('Failed to obtain access token - please check your PingOne API credentials');
        }
        
        // Get token info for response
        const tokenInfo = tokenManager.getTokenInfo();
        
        debugLog("Settings", "✅ Connection test successful", {
            hasToken: !!token,
            expiresAt: tokenInfo.expiresAt
        });
        
        res.json({
            success: true,
            message: 'Connection test successful',
            data: {
                token: token.substring(0, 20) + '...',
                expiresAt: tokenInfo.expiresAt,
                timeRemaining: tokenInfo.timeRemaining
            }
        });
        
    } catch (error) {
        debugLog("Settings", "❌ Connection test failed", { error: error.message });
        
        res.status(500).json({
            success: false,
            error: error.message || 'Connection test failed',
            details: {
                message: 'Failed to authenticate with PingOne API',
                suggestion: 'Please check your credentials and try again'
            }
        });
    }
});

// ============================================================================
// PINGONE USERS ENDPOINT
// ============================================================================

/**
 * Get users from PingOne API
 * GET /api/pingone/users
 * Fetches users from PingOne with optional filtering and population expansion
 */
router.get('/pingone/users', async (req, res) => {
    try {
        debugLog("PingOne", "👥 Fetching users from PingOne API", {
            query: req.query,
            headers: Object.keys(req.headers)
        });

        // Get token manager from app
        const tokenManager = req.app.get('tokenManager');
        if (!tokenManager) {
            return res.status(500).json({
                success: false,
                error: 'Token manager not available'
            });
        }

        // Get access token
        const token = await tokenManager.getAccessToken();
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Failed to get access token - check your PingOne credentials'
            });
        }

        // Get environment ID from token manager
        const environmentId = await tokenManager.getEnvironmentId();
        if (!environmentId) {
            return res.status(400).json({
                success: false,
                error: 'Environment ID is required',
                message: 'Please configure your Environment ID in the Settings page'
            });
        }

        // Build PingOne API URL with query parameters
        let pingOneUrl = `${tokenManager.getApiBaseUrl()}/environments/${environmentId}/users`;
        const params = new URLSearchParams();

        // Add population filter if specified
        if (req.query['population.id']) {
            params.append('population.id', req.query['population.id']);
        }

        // Add expand parameter if specified
        if (req.query.expand) {
            params.append('expand', req.query.expand);
        }

        // Add limit parameter if specified
        if (req.query.limit) {
            params.append('limit', req.query.limit);
        }

        // Add offset parameter if specified
        if (req.query.offset) {
            params.append('offset', req.query.offset);
        }

        // Add filter parameter if specified
        if (req.query.filter) {
            params.append('filter', req.query.filter);
        }

        // Append query parameters if any exist
        if (params.toString()) {
            pingOneUrl += `?${params.toString()}`;
        }

        debugLog("PingOne", "🌐 Making request to PingOne API", {
            url: pingOneUrl,
            environmentId: environmentId.substring(0, 8) + '...',
            hasToken: !!token
        });

        // Make request to PingOne API
        const pingOneResponse = await fetch(pingOneUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!pingOneResponse.ok) {
            const errorData = await pingOneResponse.json().catch(() => ({}));
            debugLog("PingOne", "❌ PingOne API request failed", {
                status: pingOneResponse.status,
                statusText: pingOneResponse.statusText,
                errorData
            });
            return res.status(pingOneResponse.status).json({
                success: false,
                error: 'Failed to fetch users from PingOne',
                message: errorData.message || `HTTP ${pingOneResponse.status}: ${pingOneResponse.statusText}`,
                details: errorData
            });
        }

        const users = await pingOneResponse.json();
        
        debugLog("PingOne", "✅ Users fetched successfully", {
            count: users._embedded?.users?.length || 0,
            hasEmbedded: !!users._embedded,
            hasUsers: !!users._embedded?.users
        });

        // Return the response as-is to maintain PingOne API format
        res.json(users);

    } catch (error) {
        debugLog("PingOne", "❌ Error fetching users", { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
            details: {
                message: 'Failed to fetch users from PingOne API',
                suggestion: 'Please check your credentials and try again'
            }
        });
    }
});

// ============================================================================
// Export the configured router with all API endpoints
export default router;
