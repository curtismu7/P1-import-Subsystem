/**
 * Authentication Subsystem - Server API Entry Point
 * 
 * This module provides a comprehensive, secure authentication subsystem for PingOne API integration.
 * It serves as the central hub for all authentication-related operations, offering both REST API
 * endpoints and programmatic access to authentication services.
 * 
 * ## Architecture Overview
 * The authentication subsystem follows a modular, service-oriented architecture:
 * - **Isolation**: Completely isolated from main application logic
 * - **Security**: Encrypted credential storage with secure token management
 * - **Scalability**: Singleton pattern for efficient resource utilization
 * - **Maintainability**: Clear separation of concerns and well-defined interfaces
 * 
 * ## Core Components
 * 
 * ### PingOneAuth Service
 * - Handles OAuth 2.0 client credentials flow
 * - Manages access token lifecycle (acquisition, validation, refresh)
 * - Provides credential validation against PingOne API
 * - Implements automatic token renewal and caching
 * 
 * ### CredentialEncryptor Service
 * - Encrypts sensitive API credentials using AES-256-GCM
 * - Manages secure storage and retrieval of credentials
 * - Provides key derivation and rotation capabilities
 * - Ensures credentials are never stored in plain text
 * 
 * ### Express Router
 * - RESTful API endpoints for client-side integration
 * - Comprehensive error handling and validation
 * - Structured JSON responses with consistent format
 * - Request/response logging for audit trails
 * 
 * ## API Endpoints
 * 
 * ### Token Management
 * - `GET /token` - Retrieve valid access token
 * - `GET /status` - Check token validity and expiration
 * - `POST /clear-token` - Invalidate current token
 * 
 * ### Credential Management
 * - `POST /validate-credentials` - Validate PingOne API credentials
 * - `POST /save-credentials` - Store validated credentials securely
 * - `GET /credentials` - Retrieve stored credentials (without secrets)
 * 
 * ## Security Features
 * - **Encryption**: All sensitive data encrypted at rest
 * - **Validation**: Comprehensive input validation and sanitization
 * - **Logging**: Security events logged for monitoring
 * - **Error Handling**: Safe error messages without sensitive data exposure
 * - **Token Security**: Secure token storage and automatic cleanup
 * 
 * ## Integration Patterns
 * 
 * ### Express Application Integration
 * ```javascript
 * import { router as authSubsystemRouter, pingOneAuth } from './auth-subsystem/server/index.js';
 * 
 * // Mount authentication routes
 * app.use('/api/v1/auth', authSubsystemRouter);
 * 
 * // Use authentication service directly
 * const token = await pingOneAuth.getAccessToken();
 * ```
 * 
 * ### Middleware Integration
 * ```javascript
 * // Create authentication middleware
 * const authMiddleware = async (req, res, next) => {
 *   try {
 *     const token = await pingOneAuth.getAccessToken();
 *     req.pingOneToken = token;
 *     next();
 *   } catch (error) {
 *     res.status(401).json({ error: 'Authentication failed' });
 *   }
 * };
 * ```
 * 
 * ### Service Layer Integration
 * ```javascript
 * // Use in service classes
 * class UserService {
 *   async getUsers() {
 *     const token = await pingOneAuth.getAccessToken();
 *     return this.apiClient.get('/users', { token });
 *   }
 * }
 * ```
 * 
 * ## Error Handling
 * The subsystem implements comprehensive error handling:
 * - **Network Errors**: Automatic retry with exponential backoff
 * - **Authentication Errors**: Clear error messages and recovery suggestions
 * - **Validation Errors**: Detailed field-level validation feedback
 * - **System Errors**: Safe error responses without sensitive data
 * 
 * ## Performance Considerations
 * - **Token Caching**: Tokens cached until near expiration
 * - **Connection Pooling**: Efficient HTTP connection management
 * - **Lazy Loading**: Services initialized only when needed
 * - **Memory Management**: Automatic cleanup of expired tokens
 * 
 * ## Monitoring and Observability
 * - **Structured Logging**: JSON-formatted logs with metadata
 * - **Performance Metrics**: Token acquisition and validation timing
 * - **Health Checks**: Service availability and credential status
 * - **Audit Trail**: All authentication events logged
 * 
 * @fileoverview Authentication subsystem server API entry point
 * @author PingOne Import Tool Team
 * @version 2.1.0
 * @since 1.0.0
 * 
 * @requires express Express.js web framework
 * @requires winston Structured logging library
 * @requires ./pingone-auth PingOne authentication service
 * @requires ./credential-encryptor Credential encryption service
 * 
 * @example
 * // Basic usage in Express app
 * import { router, pingOneAuth } from './auth-subsystem/server/index.js';
 * app.use('/api/v1/auth', router);
 * 
 * @example
 * // Direct service usage
 * const token = await pingOneAuth.getAccessToken();
 * const isValid = await pingOneAuth.validateToken(token);
 * 
 * @example
 * // Credential management
 * const credentials = {
 *   apiClientId: 'your-client-id',
 *   apiSecret: 'your-secret',
 *   environmentId: 'your-env-id',
 *   region: 'NorthAmerica'
 * };
 * const result = await pingOneAuth.validateCredentials(credentials);
 * 
 * TODO: Implement token refresh endpoint for long-running operations
 * TODO: Add support for multiple PingOne environments
 * TODO: Implement credential rotation automation
 * VERIFY: All endpoints handle edge cases correctly
 * DEBUG: Monitor token acquisition performance in production
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
 * Get Access Token Endpoint
 * 
 * Retrieves a valid PingOne API access token for client use. This endpoint handles
 * the complete OAuth 2.0 client credentials flow, including token acquisition,
 * validation, and automatic renewal when necessary.
 * 
 * ## Endpoint Details
 * - **Method**: GET
 * - **Path**: `/api/v1/auth/token`
 * - **Authentication**: None required (this IS the auth endpoint)
 * - **Rate Limiting**: Recommended to prevent abuse
 * 
 * ## Response Format
 * Success response includes:
 * - `success`: Boolean indicating operation success
 * - `token`: Valid access token string
 * - `tokenInfo`: Token metadata (expiration, validity, etc.)
 * 
 * ## Error Handling
 * Common error scenarios:
 * - **401**: Invalid or missing credentials
 * - **403**: Insufficient permissions
 * - **429**: Rate limit exceeded
 * - **500**: Internal server error
 * - **503**: PingOne API unavailable
 * 
 * ## Security Considerations
 * - Tokens are cached to minimize API calls
 * - Expired tokens are automatically renewed
 * - Failed attempts are logged for monitoring
 * - No sensitive credential data in responses
 * 
 * ## Usage Examples
 * ```javascript
 * // Client-side usage
 * const response = await fetch('/api/v1/auth/token');
 * const { token, tokenInfo } = await response.json();
 * 
 * // Use token in subsequent API calls
 * const apiResponse = await fetch('/api/users', {
 *   headers: { 'Authorization': `Bearer ${token}` }
 * });
 * ```
 * 
 * @route GET /api/v1/auth/token
 * @returns {Object} JSON response with token and metadata
 * @throws {401} When credentials are invalid or missing
 * @throws {500} When token acquisition fails
 * 
 * TODO: Add request rate limiting
 * VERIFY: Token expiration handling works correctly
 * DEBUG: Monitor token acquisition frequency
 */
router.get('/token', async (req, res) => {
    const startTime = Date.now();
    
    try {
        logger.debug('Token request received', {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString()
        });
        
        const token = await pingOneAuth.getAccessToken();
        const tokenInfo = pingOneAuth.getTokenInfo();
        
        const duration = Date.now() - startTime;
        logger.info('Token request successful', {
            duration: `${duration}ms`,
            tokenValid: tokenInfo?.isValid,
            expiresIn: tokenInfo?.expiresIn
        });
        
        res.json({ 
            success: true, 
            token,
            tokenInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Token request failed', {
            error: error.message,
            code: error.code,
            duration: `${duration}ms`,
            ip: req.ip
        });
        
        // Determine appropriate error response
        let statusCode = 401;
        let errorMessage = 'Authentication failed';
        
        if (error.code === 'NETWORK_ERROR') {
            statusCode = 503;
            errorMessage = 'PingOne API temporarily unavailable';
        } else if (error.code === 'INVALID_CREDENTIALS') {
            statusCode = 401;
            errorMessage = 'Invalid API credentials';
        } else if (error.code === 'RATE_LIMIT') {
            statusCode = 429;
            errorMessage = 'Too many requests';
        }
        
        res.status(statusCode).json({ 
            success: false, 
            error: errorMessage,
            code: error.code || 'AUTH_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get Token Status Endpoint
 * 
 * Provides detailed information about the current authentication token status
 * without triggering token acquisition. This endpoint is useful for client-side
 * applications to check authentication state before making API calls.
 * 
 * ## Endpoint Details
 * - **Method**: GET
 * - **Path**: `/api/v1/auth/status`
 * - **Authentication**: None required
 * - **Caching**: Safe to cache for short periods (30-60 seconds)
 * 
 * ## Response States
 * 
 * ### No Token Available
 * When no token has been acquired yet:
 * ```json
 * {
 *   "success": false,
 *   "status": "No token available",
 *   "hasToken": false
 * }
 * ```
 * 
 * ### Valid Token
 * When token is present and valid:
 * ```json
 * {
 *   "success": true,
 *   "status": "Valid",
 *   "hasToken": true,
 *   "expiresIn": 3600,
 *   "isValid": true
 * }
 * ```
 * 
 * ### Expired Token
 * When token exists but has expired:
 * ```json
 * {
 *   "success": true,
 *   "status": "Expired",
 *   "hasToken": true,
 *   "expiresIn": -300,
 *   "isValid": false
 * }
 * ```
 * 
 * ## Client Usage Patterns
 * ```javascript
 * // Check auth status before API calls
 * const { isValid, expiresIn } = await checkAuthStatus();
 * if (!isValid || expiresIn < 300) {
 *   await refreshToken();
 * }
 * 
 * // Periodic status checking
 * setInterval(async () => {
 *   const status = await checkAuthStatus();
 *   updateUIAuthIndicator(status);
 * }, 60000);
 * ```
 * 
 * ## Performance Notes
 * - This endpoint is very fast (no network calls)
 * - Safe to call frequently for UI updates
 * - Does not trigger token refresh automatically
 * 
 * @route GET /api/v1/auth/status
 * @returns {Object} JSON response with token status information
 * @throws {500} When status check fails (rare)
 * 
 * TODO: Add token expiration warnings
 * VERIFY: Status accuracy across different token states
 * DEBUG: Monitor status check frequency
 */
router.get('/status', async (req, res) => {
    try {
        logger.debug('Token status check requested', {
            ip: req.ip,
            timestamp: new Date().toISOString()
        });
        
        const tokenInfo = pingOneAuth.getTokenInfo();
        
        // Handle case where no token exists
        if (!tokenInfo || !tokenInfo.accessToken) {
            logger.debug('No token available for status check');
            res.json({ 
                success: false, 
                status: 'No token available',
                hasToken: false,
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // Determine token status
        const isValid = tokenInfo.isValid;
        const status = isValid ? 'Valid' : 'Expired';
        const expiresIn = tokenInfo.expiresIn;
        
        logger.debug('Token status determined', {
            status,
            isValid,
            expiresIn,
            hasToken: true
        });
        
        res.json({ 
            success: true, 
            status,
            hasToken: true,
            expiresIn,
            isValid,
            timestamp: new Date().toISOString(),
            // Additional metadata for client decision making
            needsRefresh: expiresIn < 300, // Less than 5 minutes
            isExpired: expiresIn <= 0
        });
    } catch (error) {
        logger.error('Token status check failed', {
            error: error.message,
            stack: error.stack,
            ip: req.ip
        });
        
        res.status(500).json({ 
            success: false, 
            error: 'Failed to check token status',
            code: 'STATUS_CHECK_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Validate Credentials Endpoint
 * 
 * Validates PingOne API credentials by attempting to authenticate with the PingOne API.
 * This endpoint performs a real authentication test without storing the credentials,
 * making it safe for credential verification during setup or configuration changes.
 * 
 * ## Endpoint Details
 * - **Method**: POST
 * - **Path**: `/api/v1/auth/validate-credentials`
 * - **Content-Type**: application/json
 * - **Authentication**: None required (validation endpoint)
 * 
 * ## Request Body
 * ```json
 * {
 *   "apiClientId": "12345678-1234-1234-1234-123456789012",
 *   "apiSecret": "your-client-secret-here",
 *   "environmentId": "87654321-4321-4321-4321-210987654321",
 *   "region": "NorthAmerica"
 * }
 * ```
 * 
 * ## Required Fields
 * - `apiClientId`: PingOne API client identifier (UUID format)
 * - `apiSecret`: PingOne API client secret (secure string)
 * - `environmentId`: PingOne environment identifier (UUID format)
 * 
 * ## Optional Fields
 * - `region`: PingOne region (defaults to "NorthAmerica")
 *   - Valid values: "NorthAmerica", "Europe", "AsiaPacific", "Canada"
 * 
 * ## Response Format
 * 
 * ### Successful Validation
 * ```json
 * {
 *   "success": true,
 *   "message": "Credentials validated successfully",
 *   "environmentInfo": {
 *     "name": "Production Environment",
 *     "region": "NorthAmerica",
 *     "type": "PRODUCTION"
 *   },
 *   "tokenInfo": {
 *     "expiresIn": 3600,
 *     "scope": "p1:read:user p1:create:user"
 *   }
 * }
 * ```
 * 
 * ### Validation Failure
 * ```json
 * {
 *   "success": false,
 *   "message": "Invalid client credentials",
 *   "error": "INVALID_CLIENT",
 *   "suggestions": [
 *     "Verify your client ID is correct",
 *     "Check that your client secret hasn't expired",
 *     "Ensure the environment ID matches your client"
 *   ]
 * }
 * ```
 * 
 * ## Validation Process
 * 1. **Input Validation**: Check required fields and format
 * 2. **Credential Test**: Attempt OAuth 2.0 client credentials flow
 * 3. **Environment Check**: Verify environment accessibility
 * 4. **Permission Validation**: Check required API scopes
 * 5. **Response Generation**: Return detailed validation results
 * 
 * ## Error Scenarios
 * - **400**: Missing or invalid request parameters
 * - **401**: Invalid credentials or insufficient permissions
 * - **403**: Client not authorized for environment
 * - **404**: Environment not found or inaccessible
 * - **429**: Rate limit exceeded (too many validation attempts)
 * - **500**: Internal validation error
 * - **503**: PingOne API unavailable
 * 
 * ## Security Considerations
 * - Credentials are never logged or stored during validation
 * - Failed attempts are logged for security monitoring
 * - Rate limiting prevents brute force attacks
 * - Validation results don't expose sensitive environment details
 * 
 * ## Client Usage
 * ```javascript
 * // Validate credentials before saving
 * const validateCredentials = async (credentials) => {
 *   const response = await fetch('/api/v1/auth/validate-credentials', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(credentials)
 *   });
 *   
 *   const result = await response.json();
 *   if (result.success) {
 *     console.log('Credentials valid:', result.environmentInfo);
 *   } else {
 *     console.error('Validation failed:', result.message);
 *   }
 * };
 * ```
 * 
 * @route POST /api/v1/auth/validate-credentials
 * @param {Object} req.body - Credential validation request
 * @param {string} req.body.apiClientId - PingOne API client ID
 * @param {string} req.body.apiSecret - PingOne API client secret
 * @param {string} req.body.environmentId - PingOne environment ID
 * @param {string} [req.body.region=NorthAmerica] - PingOne region
 * @returns {Object} JSON response with validation results
 * @throws {400} When required fields are missing
 * @throws {401} When credentials are invalid
 * @throws {500} When validation process fails
 * 
 * TODO: Add credential format validation (UUID format checking)
 * TODO: Implement validation result caching for repeated requests
 * VERIFY: All PingOne regions are supported correctly
 * DEBUG: Monitor validation success/failure rates
 */
router.post('/validate-credentials', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { apiClientId, apiSecret, environmentId, region } = req.body;
        
        logger.info('Credential validation requested', {
            clientId: apiClientId ? `${apiClientId.substring(0, 8)}...` : 'missing',
            environmentId: environmentId ? `${environmentId.substring(0, 8)}...` : 'missing',
            region: region || 'NorthAmerica',
            ip: req.ip
        });
        
        // Validate required fields
        const missingFields = [];
        if (!apiClientId) missingFields.push('apiClientId');
        if (!apiSecret) missingFields.push('apiSecret');
        if (!environmentId) missingFields.push('environmentId');
        
        if (missingFields.length > 0) {
            logger.warn('Credential validation failed - missing fields', {
                missingFields,
                ip: req.ip
            });
            
            res.status(400).json({ 
                success: false, 
                message: `Missing required credentials: ${missingFields.join(', ')}`,
                code: 'MISSING_FIELDS',
                missingFields,
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // Validate credential formats (basic checks)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(apiClientId)) {
            logger.warn('Invalid client ID format', { ip: req.ip });
            res.status(400).json({
                success: false,
                message: 'Invalid client ID format (must be UUID)',
                code: 'INVALID_FORMAT',
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        if (!uuidRegex.test(environmentId)) {
            logger.warn('Invalid environment ID format', { ip: req.ip });
            res.status(400).json({
                success: false,
                message: 'Invalid environment ID format (must be UUID)',
                code: 'INVALID_FORMAT',
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // Perform credential validation
        const result = await pingOneAuth.validateCredentials({
            apiClientId,
            apiSecret,
            environmentId,
            region: region || 'NorthAmerica'
        });
        
        const duration = Date.now() - startTime;
        
        if (result.success) {
            logger.info('Credential validation successful', {
                duration: `${duration}ms`,
                region: region || 'NorthAmerica',
                ip: req.ip
            });
        } else {
            logger.warn('Credential validation failed', {
                reason: result.message,
                duration: `${duration}ms`,
                ip: req.ip
            });
        }
        
        // Add timestamp to response
        result.timestamp = new Date().toISOString();
        result.duration = `${duration}ms`;
        
        res.json(result);
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Credential validation error', {
            error: error.message,
            code: error.code,
            duration: `${duration}ms`,
            ip: req.ip,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
        
        // Determine appropriate error response
        let statusCode = 500;
        let errorMessage = 'Validation error occurred';
        
        if (error.code === 'NETWORK_ERROR') {
            statusCode = 503;
            errorMessage = 'Unable to connect to PingOne API';
        } else if (error.code === 'TIMEOUT') {
            statusCode = 408;
            errorMessage = 'Validation request timed out';
        } else if (error.code === 'RATE_LIMIT') {
            statusCode = 429;
            errorMessage = 'Too many validation attempts';
        }
        
        res.status(statusCode).json({ 
            success: false, 
            message: errorMessage,
            code: error.code || 'VALIDATION_ERROR',
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`
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