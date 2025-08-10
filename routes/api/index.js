/**
 * @fileoverview Main API routes for the PingOne Import Tool.
 * @author PingOne Import Tool Team
 * @version 6.5.0
 * @since 1.0.0
*
 * @description
 * This module serves as the central API router for the application. It imports and
 * mounts all sub-routers for different API areas, such as debug logging and client-side
 * logging. It also includes a global request/response logging middleware and a health
 * check endpoint.
*
 * @requires express
 * @requires multer
 * @requires node-fetch
 * @requires winston-config
 * @requires ./debug-log.js
 * @requires ./logs.js
 */

import express, { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import logsRouter from './logs.js';
import debugLogRouter from './debug-log.js';
import credentialRouter from './credential-management.js';
import exportRouter from './export.js';
import importRouter from './import.js';
import historyRouter from './history.js';
import pingoneRouter from './pingone.js';
import versionRouter from './version.js';
import settingsRouter from './settings.js';
import { apiLogHelpers, apiLogger } from '../../server/winston-config.js';
import { logSeparator, logTag } from '../../server/winston-config.js';
import { debugLog } from '../../src/shared/debug-utils.js';
import { sendProgressEvent } from '../../server/connection-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Mount all API routers
router.use('/debug-log', debugLogRouter);
router.use('/logs', logsRouter);
router.use('/auth', credentialRouter);

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get server status information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     uptime:
 *                       type: number
 *                     memory:
 *                       type: object
 *                     version:
 *                       type: string
 *                 timestamp:
 *                   type: string
 */
router.get('/status', (req, res) => {
    try {
        const serverStatus = {
            status: 'running',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            pid: process.pid,
            environment: process.env.NODE_ENV || 'development'
        };
        
        res.success('Server status retrieved successfully', serverStatus);
    } catch (error) {
        res.error('Failed to retrieve server status', {
            code: 'STATUS_ERROR',
            details: error.message
        }, 500);
    }
});
router.use('/export', exportRouter);
router.use('/import', importRouter);
router.use('/history', historyRouter);
router.use('/pingone', pingoneRouter);
router.use('/version', versionRouter);
router.use('/settings', settingsRouter);

// Enable debug logging in development mode
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// This middleware logs every incoming request and its corresponding response.
router.use((req, res, next) => {
    const startTime = Date.now();
    const requestId = apiLogHelpers.logApiRequest(req);
    req.requestId = requestId;
    req.startTime = startTime;
    
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        apiLogHelpers.logApiResponse(req, res, requestId, duration);
        originalEnd.call(res, chunk, encoding);
    };
    
    next();
});



// ============================================================================
// CORE API ENDPOINTS
// ============================================================================

/**
 * @route GET /api/health
 * @description Health check endpoint for server monitoring.
 * Returns server status, metrics, and dependency health.
 * @returns {object} Health status object.
 */
router.get('/health', async (req, res) => {
    const functionName = 'GET /api/health';
    const startTime = Date.now();
    
    apiLogger.debug(`${functionName} - Entry`, { requestId: req.requestId });
    
    try {
        const healthChecks = {
            server: true,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development',
            requestId: req.requestId
        };

        // Check token manager availability
        try {
            const tokenManager = req.app.get('tokenManager');
            healthChecks.tokenManager = !!tokenManager;
            healthChecks.tokenStatus = tokenManager ? 'available' : 'unavailable';
        } catch (error) {
            healthChecks.tokenManager = false;
            healthChecks.tokenStatus = 'error';
            healthChecks.tokenError = error.message;
        }

        // Check settings file accessibility
        try {
            const settingsPath = path.join(__dirname, '../../data/settings.json');
            await fs.access(settingsPath);
            healthChecks.settings = true;
        } catch (error) {
            healthChecks.settings = false;
            healthChecks.settingsError = error.message;
        }

        const responseTime = Date.now() - startTime;
        apiLogger.info(`${functionName} - Health check completed successfully`, {
            requestId: req.requestId,
            responseTime: `${responseTime}ms`
        });
        
        res.success('Health check completed successfully', {
            status: 'healthy',
            checks: healthChecks,
            responseTime: `${responseTime}ms`
        });

    } catch (error) {
        const responseTime = Date.now() - startTime;
        apiLogger.error(`${functionName} - Health check failed`, {
            requestId: req.requestId,
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`
        });
        
        res.error('Health check failed', {
            code: 'HEALTH_CHECK_ERROR',
            status: 'unhealthy',
            details: error.message,
            responseTime: `${responseTime}ms`
        }, 500);
    }
});

// ============================================================================
// Export the configured router
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
        
        debugLog.info("🔄 Starting import process", { sessionId }, "Import");
        
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
        
        debugLog.info("🔍 Session data retrieved", {
            populationId: populationId || 'MISSING',
            populationName: populationName || 'MISSING',
            totalUsers: totalUsers || 0
        });
        
        // Parse CSV file
        debugLog.info("📄 Parsing CSV file", { fileName: file.originalname });
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
        
        debugLog.info("✅ CSV parsed successfully", {
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
        const region = settings.region || 'NorthAmerica';
        
        if (!environmentId) {
            throw new Error('Environment ID not configured');
        }
        
        // Helper function to get region-specific API domain
        const getApiDomain = (region) => {
            const domainMap = {
                'NorthAmerica': 'api.pingone.com',
                'Europe': 'api.eu.pingone.com',
                'Canada': 'api.ca.pingone.com',
                'Asia': 'api.apsoutheast.pingone.com',
                'Australia': 'api.aus.pingone.com',
                'US': 'api.pingone.com',
                'EU': 'api.eu.pingone.com',
                'AP': 'api.apsoutheast.pingone.com'
            };
            return domainMap[region] || 'api.pingone.com';
        };
        
        const apiDomain = getApiDomain(region);
        logger.info(`Using API domain: ${apiDomain} (region: ${region})`, { region, apiDomain });
        
        debugLog.info("🔑 Authentication ready", { environmentId });
        if (logger.flush) await logger.flush();
        
        // Process users in batches to avoid rate limiting
        const batchSize = 5;
        const delayBetweenBatches = 1000; // 1 second delay between batches
        
        const importStart = Date.now();
        
        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            
            debugLog.info(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(users.length/batchSize)}`, {
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
                        debugLog.info(`❌ ${error}`);
                        if (logger.flush) await logger.flush();
                        continue;
                    }
                    
                    // Check if user already exists (with option to bypass for testing)
                    const skipDuplicateCheck = process.env.SKIP_DUPLICATE_CHECK === 'true' || app.get('skipDuplicateCheck') === true;
                    
                    if (!skipDuplicateCheck) {
                        const checkUrl = `https://${apiDomain}/v1/environments/${environmentId}/users?username=${encodeURIComponent(username)}`;
                        
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
                                debugLog.info(`⏭️ User already exists: ${username}`, { lineNumber: user._lineNumber });
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
                    const createUrl = `https://${apiDomain}/v1/environments/${environmentId}/users`;
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
                    debugLog.info(`🔍 Creating user in PingOne`, {
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
                                debugLog.info(`⏭️ User already exists (uniqueness violation): ${username}`,
                                    { lineNumber: user._lineNumber, errorText });
                                skipped++;
                                sendProgressEvent(
                                    sessionId,
                                    processed,
                                    users.length,
                                    `Skipped: ${username} already exists`,
                                    { processed, created, skipped, failed },
                                    username,
                                    populationName,
                                    populationId,
                                    app
                                );
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
                            debugLog.info(`❌ User creation failed`, {
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
                        debugLog.info(`❌ User creation exception`, {
                            sessionId,
                            username,
                            error: err,
                            userData
                        });
                        failed++;
                        continue;
                    }
        
        // Log successful user creation
        debugLog.info(`✅ User created successfully: ${username}`, { 
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
        debugLog.info(`❌ ${errorMsg}`);
        if (logger.flush) await logger.flush();
        sendProgressEvent(sessionId, processed, users.length, `Error: ${user.username || user.email || 'unknown'}`, 
            { processed, created, skipped, failed }, user.username || user.email || 'unknown', populationName, populationId, app);
                }
            }
            
            // Add delay between batches to avoid rate limiting
            if (i + batchSize < users.length) {
                debugLog.info(`⏱️ Adding delay between batches: ${delayBetweenBatches}ms`);
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
        debugLog.info("🏁 Import process completed", {
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
            return res.error('enabled must be a boolean', { code: 'VALIDATION_ERROR' }, 400);
        }
        
        featureFlags.setFeatureFlag(flag, enabled);
        res.success('Feature flag set successfully', { flag, enabled });
    } catch (error) {
        res.error('Failed to set feature flag', { code: 'FEATURE_FLAG_SET_ERROR', details: error.message }, 500);
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
        res.success('Feature flags reset to defaults', null);
    } catch (error) {
        res.error('Failed to reset feature flags', { code: 'FEATURE_FLAG_RESET_ERROR', details: error.message }, 500);
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
        
        debugLog.info("🚀 Import request received");
        
        // Validate file upload
        if (!req.file) {
            debugLog.info("❌ No file uploaded");
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
        
        debugLog.info("🔍 Population data received", { 
            populationId: populationId || 'MISSING', 
            populationName: populationName || 'MISSING',
            totalUsers: totalUsers || 'MISSING'
        });
        
        if (!populationId || !populationName) {
            debugLog.info("❌ Missing population information", { populationId, populationName });
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
        
        debugLog.info("✅ Import options validated", {
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
        
        debugLog.info("📋 Import session created", { sessionId });
        
        // Start import process in background with proper error handling
        runImportProcess(sessionId, req.app).catch(error => {
            debugLog.info("❌ Background import process failed", { error: error.message });
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
        debugLog.info("❌ Import endpoint error", { error: error.message });
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
        
        res.success('History retrieved successfully', responseData);
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`🔍 [History Debug] ${requestId} - Error occurred after ${duration}ms:`, error);
        console.error(`🔍 [History Debug] ${requestId} - Error stack:`, error.stack);
        res.error('Failed to retrieve history', {
            code: 'HISTORY_RETRIEVAL_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, 500);
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
    const functionName = 'GET /api/populations';
    apiLogger.debug(`${functionName} - Entry`, { requestId: req.requestId });

    try {
        // Import population cache service dynamically
        const { populationCacheService } = await import('../../server/services/population-cache-service.js');
        
        // Try to get cached populations first for fast response unless refresh requested
        const forceRefresh = String(req.query.refresh || '') === '1';
        const cachedData = forceRefresh ? null : await populationCacheService.getCachedPopulations();
        if (!forceRefresh && cachedData && cachedData.populations) {
            apiLogger.debug(`${functionName} - Returning cached populations`, { 
                requestId: req.requestId, 
                count: cachedData.count,
                cachedAt: cachedData.cachedAt 
            });
            
            console.log(`[Populations] ⚡ Using cached data: ${cachedData.count} populations (cached at ${cachedData.cachedAt})`);
            
            return res.success('Populations retrieved from cache', {
                populations: cachedData.populations,
                total: cachedData.count,
                fromCache: true,
                cachedAt: cachedData.cachedAt,
                expiresAt: cachedData.expiresAt
            });
        }
        
        // Cache miss/expired or refresh requested - fetch from API
        apiLogger.debug(`${functionName} - Cache miss, fetching from PingOne API`, { requestId: req.requestId });
        console.log(`[Populations] 🔄 Cache miss, fetching from PingOne API...`);
        
        // Get token manager from Express app context
        const tokenManager = req.app.get('tokenManager');
        if (!tokenManager) {
            apiLogger.error(`${functionName} - Token manager not available`, { requestId: req.requestId });
            return res.error('Token manager not available', { code: 'TOKEN_MANAGER_ERROR' }, 500);
        }

        // Get environment ID and API base URL from token manager
        const environmentId = await tokenManager.getEnvironmentId();
        if (!environmentId) {
            apiLogger.error(`${functionName} - Environment ID not configured`, { requestId: req.requestId });
            return res.error('Environment ID not configured', { code: 'ENVIRONMENT_ID_ERROR' }, 500);
        }

        // Get API base URL from token manager
        const apiBaseUrl = tokenManager.getApiBaseUrl();

        // Get access token
        const token = await tokenManager.getAccessToken();
        if (!token) {
            apiLogger.error(`${functionName} - Failed to get access token`, { requestId: req.requestId });
            return res.error('Failed to get access token', { code: 'TOKEN_ACCESS_ERROR' }, 401);
        }

        // Fetch populations from PingOne API
        const populationsUrl = `${apiBaseUrl}/environments/${environmentId}/populations`;
        apiLogger.debug(`${functionName} - Fetching populations from PingOne API`, { requestId: req.requestId, url: populationsUrl });

        const response = await fetch(populationsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            apiLogger.error(`${functionName} - Failed to fetch populations`, {
                requestId: req.requestId,
                status: response.status,
                statusText: response.statusText,
                details: errorText
            });
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
        
        // Cache the fresh data for future requests
        try {
            await populationCacheService.savePopulationsToCache(formattedPopulations);
            console.log(`[Populations] 💾 Cached ${formattedPopulations.length} populations for future requests`);
        } catch (cacheError) {
            apiLogger.warn(`${functionName} - Failed to cache populations`, { 
                requestId: req.requestId, 
                error: cacheError.message 
            });
        }
        
        res.success('Populations retrieved successfully', {
            populations: formattedPopulations,
            total: formattedPopulations.length,
            fromCache: false,
            fetchedAt: new Date().toISOString()
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
 * /api/populations/cache-status:
 *   get:
 *     summary: Get population cache status
 *     description: |
 *       Returns information about the current population cache status including
 *       whether data is cached, expiration times, and cache statistics.
 *       
 *       ## Cache Information
 *       - Cache availability and expiration status
 *       - Number of cached populations
 *       - Cache creation and expiration timestamps
 *       - Background refresh status
 *       
 *       ## Debugging
 *       Useful for debugging cache performance and troubleshooting
 *       population loading issues.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Cache status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasCachedData:
 *                       type: boolean
 *                     isExpired:
 *                       type: boolean
 *                     count:
 *                       type: integer
 *                     cachedAt:
 *                       type: string
 *                       format: date-time
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     backgroundRefreshActive:
 *                       type: boolean
 */
router.get('/populations/cache-status', async (req, res) => {
    const functionName = 'GET /api/populations/cache-status';
    apiLogger.debug(`${functionName} - Entry`, { requestId: req.requestId });

    try {
        // Import population cache service dynamically
        const { populationCacheService } = await import('../../server/services/population-cache-service.js');
        
        // Get cache status
        const cacheStatus = await populationCacheService.getCacheStatus();
        
        apiLogger.debug(`${functionName} - Cache status retrieved`, { 
            requestId: req.requestId, 
            status: cacheStatus 
        });
        
        res.success('Population cache status retrieved', cacheStatus);
        
    } catch (error) {
        apiLogger.error(`${functionName} - Error getting cache status`, {
            requestId: req.requestId,
            error: error.message
        });
        
        res.error('Failed to get cache status', { 
            code: 'CACHE_STATUS_ERROR', 
            message: error.message 
        }, 500);
    }
});

/**
 * @swagger
 * /api/populations/{populationId}/users:
 *   get:
 *     summary: Get users from population
 *     description: |
 *       Retrieves all users from a specified PingOne population.
 *       This endpoint fetches user data from the PingOne API for the
 *       specified population ID.
 *       
 *       ## Response Format
 *       Returns an array of user objects with basic user information
 *       including ID, username, email, and name details.
 *       
 *       ## Rate Limiting
 *       This operation is subject to PingOne API rate limits.
 *     tags: [User Operations]
 *     parameters:
 *       - in: path
 *         name: populationId
 *         required: true
 *         schema:
 *           type: string
 *         description: PingOne population ID
 *         example: 3840c98d-202d-4f6a-8871-f3bc66cb3fa8
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                   example: Users retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: User ID
 *                       username:
 *                         type: string
 *                         description: Username
 *                       email:
 *                         type: string
 *                         description: Primary email address
 *                       name:
 *                         type: object
 *                         properties:
 *                           given:
 *                             type: string
 *                             description: First name
 *                           family:
 *                             type: string
 *                             description: Last name
 *       400:
 *         description: Invalid population ID
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
 *       404:
 *         description: Population not found
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
router.get('/populations/:populationId/users', async (req, res) => {
    const functionName = 'GET /api/populations/:populationId/users';
    const { populationId } = req.params;
    
    apiLogger.debug(`${functionName} - Entry`, { 
        requestId: req.requestId,
        populationId 
    });

    try {
        // Validate population ID
        if (!populationId) {
            apiLogger.error(`${functionName} - Missing population ID`, { requestId: req.requestId });
            return res.error('Population ID is required', { code: 'MISSING_POPULATION_ID' }, 400);
        }

        // Get token manager from Express app context
        const tokenManager = req.app.get('tokenManager');
        if (!tokenManager) {
            apiLogger.error(`${functionName} - Token manager not available`, { requestId: req.requestId });
            return res.error('Token manager not available', { code: 'TOKEN_MANAGER_ERROR' }, 500);
        }

        // Get environment ID and API base URL from token manager
        const environmentId = await tokenManager.getEnvironmentId();
        if (!environmentId) {
            apiLogger.error(`${functionName} - Environment ID not configured`, { requestId: req.requestId });
            return res.error('Environment ID not configured', { code: 'ENVIRONMENT_ID_ERROR' }, 500);
        }

        // Get API base URL from token manager
        const apiBaseUrl = tokenManager.getApiBaseUrl();

        // Get access token
        const token = await tokenManager.getAccessToken();
        if (!token) {
            apiLogger.error(`${functionName} - Failed to get access token`, { requestId: req.requestId });
            return res.error('Failed to get access token', { code: 'TOKEN_ACCESS_ERROR' }, 401);
        }

        // Use the same approach as the export functionality
        let usersUrl = `${apiBaseUrl}/environments/${environmentId}/users`;
        const params = new URLSearchParams();
        
        // Add population filter
        params.append('population.id', populationId);
        
        // Always expand population details to get population name and ID in response
        params.append('expand', 'population');
        
        // Append query parameters
        usersUrl += `?${params.toString()}`;
        
        apiLogger.debug(`${functionName} - Fetching users from PingOne API`, { 
            requestId: req.requestId, 
            url: usersUrl 
        });

        const response = await fetch(usersUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            apiLogger.error(`${functionName} - Failed to fetch users`, {
                requestId: req.requestId,
                populationId,
                status: response.status,
                statusText: response.statusText,
                details: errorText
            });
            
            if (response.status === 404) {
                return res.error('Population not found', { 
                    code: 'POPULATION_NOT_FOUND',
                    populationId 
                }, 404);
            }
            
            return res.status(response.status).json({
                success: false,
                error: `Failed to fetch users: ${response.statusText}`,
                details: errorText
            });
        }
        
        const data = await response.json();
        
        // Handle PingOne API response format variations
        // PingOne can return users directly as array or nested in _embedded.users
        let users = [];
        if (data._embedded && data._embedded.users) {
            users = data._embedded.users;
        } else if (Array.isArray(data)) {
            users = data;
        }
        
        console.log(`[Users] ✅ Fetched ${users.length} users from population ${populationId}`);
        
        // Format users for frontend
        const formattedUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            email: user.primaryEmail?.address || '',
            name: {
                given: user.name?.given || '',
                family: user.name?.family || ''
            },
            enabled: user.enabled !== false
        }));
        
        apiLogger.debug(`${functionName} - Users retrieved successfully`, { 
            requestId: req.requestId,
            populationId,
            userCount: formattedUsers.length
        });
        
        res.success('Users retrieved successfully', {
            users: formattedUsers,
            total: formattedUsers.length,
            populationId
        });
        
    } catch (error) {
        apiLogger.error(`${functionName} - Error fetching users`, {
            requestId: req.requestId,
            populationId,
            error: error.message
        });
        
        res.error('Failed to fetch users', { 
            code: 'USERS_FETCH_ERROR', 
            message: error.message 
        }, 500);
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

    debugLog.info("📝 Export token generation logged", logEntry);
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

    debugLog.info("📝 Export operation logged", logEntry);
    
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
    res.json({ version: '7.0.1.0' });
});

// --- BULK USER DELETE BY IDS ---
router.post('/users/delete', express.json(), async (req, res) => {
    try {
        const { userIds = [], skipNotFound = true } = req.body || {};
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ success: false, error: 'userIds is required and must be a non-empty array' });
        }
        const tokenManager = req.app.get('tokenManager');
        if (!tokenManager) return res.status(500).json({ success: false, error: 'Token manager not available' });
        const token = await tokenManager.getAccessToken();
        if (!token) return res.status(401).json({ success: false, error: 'Failed to get access token' });
        const environmentId = await tokenManager.getEnvironmentId();
        const apiBaseUrl = tokenManager.getApiBaseUrl();
        const endpointBase = `${apiBaseUrl}/environments/${environmentId}/users`;
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        let deleted = 0, failed = 0, skipped = 0;
        const concurrency = 5;
        let idx = 0, inFlight = 0;
        await new Promise((resolve) => {
            const pump = () => {
                while (inFlight < concurrency && idx < userIds.length) {
                    const id = userIds[idx++];
                    inFlight++;
                    fetch(`${endpointBase}/${encodeURIComponent(id)}`, { method: 'DELETE', headers })
                        .then(async (resp) => {
                            if (resp.ok) deleted++;
                            else if (resp.status === 404 && skipNotFound) skipped++; 
                            else failed++;
                        })
                        .catch(() => { failed++; })
                        .finally(() => { inFlight--; if (idx >= userIds.length && inFlight === 0) resolve(); else pump(); });
                }
            };
            pump();
        });
        res.json({ success: true, totals: { requested: userIds.length, deleted, skipped, failed } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- BULK USER MODIFY BY IDS ---
router.post('/users/modify', express.json(), async (req, res) => {
    try {
        const { userIds = [], modifications = [] } = req.body || {};
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ success: false, error: 'userIds is required and must be a non-empty array' });
        }
        const tokenManager = req.app.get('tokenManager');
        if (!tokenManager) return res.status(500).json({ success: false, error: 'Token manager not available' });
        const token = await tokenManager.getAccessToken();
        if (!token) return res.status(401).json({ success: false, error: 'Failed to get access token' });
        const environmentId = await tokenManager.getEnvironmentId();
        const apiBaseUrl = tokenManager.getApiBaseUrl();
        const endpointBase = `${apiBaseUrl}/environments/${environmentId}/users`;
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Build a patch body per modifications
        const buildBody = (mods) => {
            const body = {};
            for (const m of mods) {
                const attr = (m.attribute || '').toLowerCase();
                const val = m.value;
                if (!attr) continue;
                if (attr === 'email') {
                    body.emails = val ? [{ value: val, primary: true }] : [];
                } else if (attr === 'name.given') {
                    body.name = body.name || {}; body.name.given = val;
                } else if (attr === 'name.family') {
                    body.name = body.name || {}; body.name.family = val;
                } else if (attr.startsWith('phone')) {
                    body.phoneNumbers = val ? [{ value: val }] : [];
                } else if (attr === 'status') {
                    body.enabled = (String(val).toLowerCase() !== 'disabled');
                }
            }
            return body;
        };

        let modified = 0, failed = 0;
        const bodyTemplate = buildBody(modifications);
        const concurrency = 5;
        let idx = 0, inFlight = 0;
        await new Promise((resolve) => {
            const pump = () => {
                while (inFlight < concurrency && idx < userIds.length) {
                    const id = userIds[idx++];
                    inFlight++;
                    fetch(`${endpointBase}/${encodeURIComponent(id)}`, { method: 'PATCH', headers, body: JSON.stringify(bodyTemplate) })
                        .then(async (resp) => { if (resp.ok) modified++; else failed++; })
                        .catch(() => { failed++; })
                        .finally(() => { inFlight--; if (idx >= userIds.length && inFlight === 0) resolve(); else pump(); });
                }
            };
            pump();
        });
        res.json({ success: true, totals: { requested: userIds.length, modified, failed } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- USER SCHEMA (SCIM) → possible headers for CSV ---
router.get('/user-schema', async (req, res) => {
    try {
        const tokenManager = req.app.get('tokenManager');
        if (!tokenManager) return res.status(500).json({ success: false, error: 'Token manager not available' });
        const token = await tokenManager.getAccessToken();
        if (!token) return res.status(401).json({ success: false, error: 'Failed to get access token' });
        const environmentId = await tokenManager.getEnvironmentId();
        const apiBaseUrl = tokenManager.getApiBaseUrl();
        const scimBase = `${apiBaseUrl}/environments/${environmentId}/scim/v2/Schemas`;

        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        // Fetch all schemas
        const listResp = await fetch(scimBase, { headers });
        if (!listResp.ok) {
            const txt = await listResp.text().catch(() => '');
            return res.status(listResp.status).json({ success: false, error: `Failed to list schemas: ${listResp.statusText}`, details: txt });
        }
        const listJson = await listResp.json();
        const resources = listJson?.Resources || listJson?.schemas || [];

        // Helper to flatten SCIM attributes to dot paths
        const flat = [];
        const walk = (attrs, prefix = '') => {
            if (!Array.isArray(attrs)) return;
            for (const a of attrs) {
                const name = a?.name || a?.id;
                if (!name) continue;
                const path = prefix ? `${prefix}.${name}` : name;
                flat.push(path);
                if (Array.isArray(a.subAttributes)) walk(a.subAttributes, path);
            }
        };

        // Filter to user-related schemas
        const userSchemas = resources.filter(s => {
            const id = s?.id || s?.schema || '';
            return /User$/i.test(id) || /:User/.test(id) || /core:2\.0:User/.test(id);
        });

        for (const s of userSchemas) {
            if (Array.isArray(s.attributes)) walk(s.attributes);
        }

        // Common extras used by PingOne Admin API that map well to CSV headers
        const common = [
            'username', 'emails.value', 'name.given', 'name.family', 'enabled', 'status',
            'phoneNumbers.value', 'externalId', 'address.streetAddress', 'address.locality', 'address.region',
            'address.postalCode', 'address.country'
        ];

        const unique = Array.from(new Set([...flat, ...common])).sort();
        return res.json({ success: true, count: unique.length, headers: unique, schemas: userSchemas.map(s => s.id || s.schema) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// --- CSV TEMPLATE FOR IMPORT ---
router.get('/import/template', async (req, res) => {
    try {
        const tokenManager = req.app.get('tokenManager');
        if (!tokenManager) return res.status(500).json({ success: false, error: 'Token manager not available' });
        const token = await tokenManager.getAccessToken();
        if (!token) return res.status(401).json({ success: false, error: 'Failed to get access token' });
        const environmentId = await tokenManager.getEnvironmentId();
        const apiBaseUrl = tokenManager.getApiBaseUrl();
        const scimBase = `${apiBaseUrl}/environments/${environmentId}/scim/v2/Schemas`;

        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        const listResp = await fetch(scimBase, { headers });
        let flat = [];
        if (listResp.ok) {
            const listJson = await listResp.json();
            const resources = listJson?.Resources || listJson?.schemas || [];
            const userSchemas = resources.filter(s => {
                const id = s?.id || s?.schema || '';
                return /User$/i.test(id) || /:User/.test(id) || /core:2\.0:User/.test(id);
            });
            const walk = (attrs, prefix = '') => {
                if (!Array.isArray(attrs)) return;
                for (const a of attrs) {
                    const name = a?.name || a?.id;
                    if (!name) continue;
                    const path = prefix ? `${prefix}.${name}` : name;
                    flat.push(path);
                    if (Array.isArray(a.subAttributes)) walk(a.subAttributes, path);
                }
            };
            for (const s of userSchemas) {
                if (Array.isArray(s.attributes)) walk(s.attributes);
            }
        }

        // Prioritize common, minimal headers first
        const common = [
            'username', 'emails.value', 'name.given', 'name.family', 'enabled'
        ];
        const unique = Array.from(new Set([...common, ...flat])).slice(0, 60); // cap to reasonable length

        const headerRow = unique.join(',');
        const sample1 = ['user1', 'user1@example.com', 'User', 'One', 'true'];
        const sample2 = ['user2', 'user2@example.com', 'User', 'Two', 'true'];
        const paddedRow = (arr) => {
            const row = [...arr];
            while (row.length < unique.length) row.push('');
            return row.join(',');
        };
        const csv = [headerRow, paddedRow(sample1), paddedRow(sample2)].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="pingone-import-template.csv"');
        return res.send(csv);
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// --- DELETE USERS ENDPOINT ---
router.post('/delete-users', upload.single('file'), async (req, res) => {
    try {
        debugLog.info("🔄 Delete users request received", {
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

            debugLog.info("📄 CSV parsed successfully", { 
                totalUsers: usersToDelete.length,
                headers: headers
            });
        } else if (req.body.type === 'population' && req.body.populationId) {
            // Get all users from the specified population
            debugLog.info("👥 Fetching all users from population", {
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
                        debugLog.info("👥 Population users fetched successfully", {
                            totalUsers: usersToDelete.length,
                            populationId: req.body.populationId
                        });
                    } else {
                        debugLog.info("👥 No users found in population", {
                            populationId: req.body.populationId
                        });
                    }
                } else {
                    const errorText = await populationResponse.text();
                    debugLog.info("❌ Failed to fetch population users", {
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
                debugLog.info("❌ Error fetching population users", {
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

        debugLog.info("🗑️ Starting delete process", {
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
                    debugLog.info(`🗑️ Using user with existing ID`, {
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
                            debugLog.info(`🔍 Username lookup failed for "${user.username}"`, { error: error.message });
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
                            debugLog.info(`🔍 Email lookup failed for "${user.email}"`, { error: error.message });
                        }
                    }
                }

                // Delete user if found
                if (existingUser) {
                    debugLog.info(`🗑️ Deleting user found by ${lookupMethod}`, {
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
                        debugLog.info(`✅ Successfully deleted user`, {
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
                        debugLog.info(`❌ Failed to delete user`, {
                            user: existingUser.username || existingUser.email,
                            error: errorMessage
                        });
                    }
                } else {
                    if (skipNotFound) {
                        skipped++;
                        debugLog.info(`⏭️ User not found, skipping`, {
                            user: user.username || user.email || 'Unknown'
                        });
                    } else {
                        failed++;
                        errors.push({
                            user: user.username || user.email || 'Unknown',
                            error: 'User not found'
                        });
                        debugLog.info(`❌ User not found`, {
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
                debugLog.info(`❌ Error processing user`, {
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

        debugLog.info("✅ Delete operation completed", result);

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
        debugLog.info("❌ Delete operation failed", { error: error.message });
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
        debugLog.info("🔌 Testing connection with current settings");
        
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
        
        debugLog.info("✅ Connection test successful", {
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
        debugLog.info("❌ Connection test failed", { error: error.message });
        
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
        debugLog.info("👥 Fetching users from PingOne API", {
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

        debugLog.info("🌐 Making request to PingOne API", {
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
            debugLog.info("❌ PingOne API request failed", {
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
        
        debugLog.info("✅ Users fetched successfully", {
            count: users._embedded?.users?.length || 0,
            hasEmbedded: !!users._embedded,
            hasUsers: !!users._embedded?.users
        });

        // Return the response as-is to maintain PingOne API format
        res.json(users);

    } catch (error) {
        debugLog.info("❌ Error fetching users", { error: error.message });
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
// Module info endpoint for version manager
router.get('/module-info', (req, res) => {
    res.json({
        success: true,
        version: '7.1.1',
        name: 'PingOne Import Tool',
        description: 'User import/export tool for PingOne',
        timestamp: new Date().toISOString()
    });
});

export default router;
