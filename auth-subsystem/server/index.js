/**
 * Authentication Subsystem - Server API
 * 
 * Provides a unified API for PingOne authentication services.
 * Exposes endpoints for token management, credential validation, and storage.
 * 
 * This module serves as the main entry point for the server-side authentication subsystem.
 * It creates and exports an Express router with all necessary authentication endpoints,
 * as well as singleton instances of the core authentication services.
 * 
 * Key responsibilities:
 * - Token acquisition and management
 * - Credential validation and storage
 * - Secure credential encryption/decryption
 * - API endpoints for client-side authentication
 * 
 * The authentication subsystem is designed to be isolated from the rest of the application,
 * with clear API boundaries to ensure maintainability and security.
 * 
 * Integration:
 * ```javascript
 * // In your Express app:
 * import { router as authSubsystemRouter, pingOneAuth } from './auth-subsystem/server/index.js';
 * 
 * // Mount the auth routes
 * app.use('/api/v1/auth', authSubsystemRouter);
 * 
 * // Use the auth service directly when needed
 * const token = await pingOneAuth.getAccessToken();
 * ```
 */

import express from 'express';
import winston from 'winston';
import PingOneAuth from './pingone-auth.js';
import CredentialEncryptor from './credential-encryptor.js';

/**
 * Create a dedicated logger for the authentication subsystem
 * 
 * This logger is configured with:
 * - Timestamp formatting for accurate timing information
 * - JSON metadata support for structured logging
 * - Console transport with colorization for development
 * - Service and environment tagging for log aggregation
 */
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
            return `[${timestamp}] ${level}: ${message}${metaString}`;
        })
    ),
    defaultMeta: { service: 'auth-subsystem', env: process.env.NODE_ENV || 'development' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
                    return `[${timestamp}] ${level}: ${message}${metaString}`;
                })
            )
        })
    ]
});

/**
 * Create singleton instances of core authentication services
 * 
 * These singleton instances are used throughout the application to ensure
 * consistent authentication state and avoid duplicate connections.
 * 
 * - pingOneAuth: Handles PingOne API authentication and token management
 * - credentialEncryptor: Manages secure storage of API credentials
 */
const pingOneAuth = new PingOneAuth(logger);
const credentialEncryptor = new CredentialEncryptor(logger);

/**
 * Create Express router for authentication API endpoints
 * 
 * This router exposes RESTful endpoints for client-side authentication:
 * - GET /token: Retrieve a valid access token
 * - GET /status: Check token validity status
 * - POST /validate-credentials: Validate PingOne API credentials
 * - POST /save-credentials: Save validated credentials
 * - GET /credentials: Retrieve stored credentials (without secret)
 * - POST /clear-token: Clear the current token
 */
const router = express.Router();

/**
 * Get access token
 * GET /api/v1/auth/token
 */
router.get('/token', async (req, res) => {
    try {
        const token = await pingOneAuth.getAccessToken();
        res.json({ 
            success: true, 
            token,
            tokenInfo: pingOneAuth.getTokenInfo()
        });
    } catch (error) {
        logger.error('Failed to get token:', error.message);
        res.status(401).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get token status
 * GET /api/v1/auth/status
 */
router.get('/status', async (req, res) => {
    try {
        const tokenInfo = pingOneAuth.getTokenInfo();
        
        if (!tokenInfo || !tokenInfo.accessToken) {
            res.json({ 
                success: false, 
                status: 'No token available',
                hasToken: false
            });
            return;
        }
        
        res.json({ 
            success: true, 
            status: tokenInfo.isValid ? 'Valid' : 'Expired',
            hasToken: true,
            expiresIn: tokenInfo.expiresIn,
            isValid: tokenInfo.isValid
        });
    } catch (error) {
        logger.error('Failed to get token status:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Validate credentials
 * POST /api/v1/auth/validate-credentials
 */
router.post('/validate-credentials', async (req, res) => {
    try {
        const { apiClientId, apiSecret, environmentId, region } = req.body;
        
        if (!apiClientId || !apiSecret || !environmentId) {
            res.status(400).json({ 
                success: false, 
                message: 'Missing required credentials' 
            });
            return;
        }
        
        const result = await pingOneAuth.validateCredentials({
            apiClientId,
            apiSecret,
            environmentId,
            region: region || 'NorthAmerica'
        });
        
        res.json(result);
    } catch (error) {
        logger.error('Credential validation failed:', error.message);
        res.status(500).json({ 
            success: false, 
            message: `Validation error: ${error.message}` 
        });
    }
});

/**
 * Save credentials
 * POST /api/v1/auth/save-credentials
 */
router.post('/save-credentials', async (req, res) => {
    try {
        const { apiClientId, apiSecret, environmentId, region } = req.body;
        
        if (!apiClientId || !apiSecret || !environmentId) {
            res.status(400).json({ 
                success: false, 
                message: 'Missing required credentials' 
            });
            return;
        }
        
        // First validate the credentials
        const validationResult = await pingOneAuth.validateCredentials({
            apiClientId,
            apiSecret,
            environmentId,
            region: region || 'NorthAmerica'
        });
        
        if (!validationResult.success) {
            res.json(validationResult);
            return;
        }
        
        // If valid, save the credentials
        const saveResult = await pingOneAuth.saveCredentials({
            apiClientId,
            apiSecret,
            environmentId,
            region: region || 'NorthAmerica'
        });
        
        if (saveResult) {
            res.json({ 
                success: true, 
                message: 'Credentials saved successfully' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Failed to save credentials' 
            });
        }
    } catch (error) {
        logger.error('Failed to save credentials:', error.message);
        res.status(500).json({ 
            success: false, 
            message: `Save error: ${error.message}` 
        });
    }
});

/**
 * Get current credentials (without secret)
 * GET /api/v1/auth/credentials
 */
router.get('/credentials', async (req, res) => {
    try {
        const settings = await credentialEncryptor.readAndDecryptSettings();
        
        if (!settings) {
            res.json({ 
                success: false, 
                message: 'No credentials found' 
            });
            return;
        }
        
        // Return credentials without the secret
        res.json({ 
            success: true, 
            credentials: {
                apiClientId: settings.apiClientId,
                environmentId: settings.environmentId,
                region: settings.region || 'NorthAmerica',
                // Include a flag indicating if secret is available
                hasSecret: !!settings.apiSecret
            }
        });
    } catch (error) {
        logger.error('Failed to get credentials:', error.message);
        res.status(500).json({ 
            success: false, 
            message: `Error: ${error.message}` 
        });
    }
});

/**
 * Clear token
 * POST /api/v1/auth/clear-token
 */
router.post('/clear-token', (req, res) => {
    try {
        pingOneAuth.clearToken();
        res.json({ 
            success: true, 
            message: 'Token cleared successfully' 
        });
    } catch (error) {
        logger.error('Failed to clear token:', error.message);
        res.status(500).json({ 
            success: false, 
            message: `Error: ${error.message}` 
        });
    }
});

// Export the router and singleton instances
export { router, pingOneAuth, credentialEncryptor };

// Default export for Express app integration
export default router;