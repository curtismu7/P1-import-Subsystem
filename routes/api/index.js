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

import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

import { apiLogger, apiLogHelpers } from '../../server/winston-config.js';
import { sendProgressEvent, sendCompletionEvent, sendErrorEvent } from '../../server/connection-manager.js';
import serverMessageFormatter from '../../server/message-formatter.js';

// Import sub-routers
import debugLogRouter from './debug-log.js';
import logsRouter from './logs.js';
import exportRouter from './export.js';
import historyRouter from './history.js';
import pingoneRouter from './pingone.js';
import versionRouter from './version.js';
import settingsRouter from './settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ============================================================================
// GLOBAL MIDDLEWARE
// ============================================================================

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
// MOUNT SUB-ROUTERS
// ============================================================================

// Mount routers for specific API endpoints.
router.use('/debug-log', debugLogRouter);
router.use('/logs', logsRouter);
router.use('/export', exportRouter);
router.use('/history', historyRouter);
router.use('/pingone', pingoneRouter);
router.use('/version', versionRouter);
router.use('/settings', settingsRouter);

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
        
        res.status(200).json({
            success: true,
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
        
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    }
});

// ============================================================================
// Export the configured router
// ============================================================================
export default router;
