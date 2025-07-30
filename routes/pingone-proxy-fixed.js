import express, { Router } from 'express';
import fetch from 'node-fetch';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import path from 'path';
import workerTokenManager from '../auth/workerTokenManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// HTTP Method Mismatch Debug Utility
// Use this to add defensive programming to critical endpoints
const validateHttpMethod = (req, res, expectedMethod, endpointName) => {
    if (req.method !== expectedMethod) {
        const requestId = req.headers['x-request-id'] || 'unknown';
        console.error(`[${requestId}] HTTP METHOD MISMATCH at ${endpointName}:`);
        console.error(`  Expected: ${expectedMethod}`);
        console.error(`  Received: ${req.method}`);
        console.error(`  URL: ${req.originalUrl}`);
        console.error(`  User-Agent: ${req.headers['user-agent'] || 'unknown'}`);
        console.error(`  This indicates a client-server HTTP method mismatch!`);
        
        res.status(405).json({
            success: false,
            error: `Method ${req.method} not allowed for ${endpointName}. Expected ${expectedMethod}.`,
            debug: {
                endpoint: endpointName,
                expected: expectedMethod,
                received: req.method,
                message: 'HTTP method mismatch detected - check client-side calls'
            }
        });
        return false;
    }
    return true;
};

// PingOne API base URLs by region
const PINGONE_API_BASE_URLS = {
    'NorthAmerica': 'https://api.pingone.com',
    'Europe': 'https://api.eu.pingone.com',
    'Canada': 'https://api.ca.pingone.com',
    'Asia': 'https://api.apsoutheast.pingone.com',
    'Australia': 'https://api.aus.pingone.com',
    'US': 'https://api.pingone.com',
    'EU': 'https://api.eu.pingone.com',
    'AP': 'https://api.apsoutheast.pingone.com',
    'default': 'https://auth.pingone.com'
};

// Middleware to validate required settings
const validateSettings = (req, res, next) => {
    const { environmentId, region } = req.settings;
    
    if (!environmentId) {
        return res.status(400).json({ error: 'Environment ID is required' });
    }
    
    if (!region || !PINGONE_API_BASE_URLS[region]) {
        return res.status(400).json({ error: 'Valid region is required' });
    }
    
    next();
};

// Middleware to inject settings
const injectSettings = (req, res, next) => {
    try {
        // Use environment variables for settings
        req.settings = {
            environmentId: process.env.PINGONE_ENVIRONMENT_ID || '',
            region: process.env.PINGONE_REGION || 'NorthAmerica',
            apiClientId: process.env.PINGONE_CLIENT_ID || '',
            apiSecret: process.env.PINGONE_CLIENT_SECRET || ''
        };
        next();
    } catch (error) {
        console.error('Error injecting settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * @swagger
 * /api/pingone/proxy:
 *   get:
 *     summary: Proxy request to PingOne API
 *     description: |
 *       Proxies requests to the PingOne API. This endpoint allows you to make
 *       authenticated requests to any PingOne API endpoint through this server.
 *       
 *       ## Usage
 *       - Use the `url` query parameter to specify the target PingOne API endpoint
 *       - The server will automatically add authentication headers
 *       - Supports all HTTP methods (GET, POST, PUT, DELETE, etc.)
 *       
 *       ## Examples
 *       - Get users: `GET /api/pingone/proxy?url=https://api.pingone.com/v1/environments/{envId}/users`
 *       - Create user: `POST /api/pingone/proxy?url=https://api.pingone.com/v1/environments/{envId}/users`
 *       - Get populations: `GET /api/pingone/proxy?url=https://api.pingone.com/v1/environments/{envId}/populations`
 *       
 *       ## Authentication
 *       The server automatically handles PingOne API authentication using configured credentials.
 *     tags: [PingOne API]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: The target PingOne API URL to proxy to
 *         example: "https://api.pingone.com/v1/environments/b9817c16-9910-4415-b67e-4ac687da74d9/users"
 *     responses:
 *       200:
 *         description: Successful response from PingOne API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Response from PingOne API (varies by endpoint)
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Target URL is required"
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: "Failed to authenticate with PingOne API"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Proxy POST request to PingOne API
 *     description: |
 *       Proxies POST requests to the PingOne API with request body.
 *       Useful for creating users, updating populations, etc.
 *     tags: [PingOne API]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: The target PingOne API URL to proxy to
 *         example: "https://api.pingone.com/v1/environments/b9817c16-9910-4415-b67e-4ac687da74d9/users"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Request body to send to PingOne API
 *     responses:
 *       200:
 *         description: Successful response from PingOne API
 *       400:
 *         description: Bad request
 *       401:
 *         description: Authentication failed
 *       500:
 *         description: Server error
 *   put:
 *     summary: Proxy PUT request to PingOne API
 *     description: |
 *       Proxies PUT requests to the PingOne API with request body.
 *       Useful for updating users, populations, etc.
 *     tags: [PingOne API]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: The target PingOne API URL to proxy to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Request body to send to PingOne API
 *     responses:
 *       200:
 *         description: Successful response from PingOne API
 *       400:
 *         description: Bad request
 *       401:
 *         description: Authentication failed
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Proxy DELETE request to PingOne API
 *     description: |
 *       Proxies DELETE requests to the PingOne API.
 *       Useful for deleting users, populations, etc.
 *     tags: [PingOne API]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: The target PingOne API URL to proxy to
 *     responses:
 *       200:
 *         description: Successful response from PingOne API
 *       400:
 *         description: Bad request
 *       401:
 *         description: Authentication failed
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/pingone/users:
 *   get:
 *     summary: Get users from PingOne environment
 *     description: |
 *       Retrieves users from the configured PingOne environment.
 *       This is a convenience endpoint that automatically constructs
 *       the proper PingOne API URL using the configured environment ID.
 *     tags: [PingOne API]
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: PingOne filter expression (e.g., "username eq \"john.doe\"")
 *         example: "username eq \"john.doe\""
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of users to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of users to skip
 *     responses:
 *       200:
 *         description: List of users from PingOne
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _embedded:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           email:
 *                             type: string
 *                           name:
 *                             type: object
 *                             properties:
 *                               given:
 *                                 type: string
 *                               family:
 *                                 type: string
 *                           population:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication failed
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/pingone/populations:
 *   get:
 *     summary: Get populations from PingOne environment
 *     description: |
 *       Retrieves populations from the configured PingOne environment.
 *       This is a convenience endpoint that automatically constructs
 *       the proper PingOne API URL using the configured environment ID.
 *     tags: [PingOne API]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of populations to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of populations to skip
 *     responses:
 *       200:
 *         description: List of populations from PingOne
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _embedded:
 *                   type: object
 *                   properties:
 *                     populations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Authentication failed
 *       500:
 *         description: Server error
 */

// Proxy request handler
const proxyRequest = async (req, res) => {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
        // Check if URL is provided in query parameter
        const targetUrl = req.query.url;
        
        if (!targetUrl) {
            return res.status(400).json({ error: 'Target URL is required' });
        }
        
        // Determine if this is an auth request
        const isAuthRequest = targetUrl.includes('/as/token');
        
        console.log(`[${requestId}] Proxying to: ${targetUrl}`);
        
        // Prepare request headers - filter out unwanted headers
        const headers = {};
        
        // Copy only the headers we want to forward
        const allowedHeaders = [
            'accept',
            'accept-encoding',
            'authorization',
            'content-type',
            'x-request-id'
        ];
        
        // Add allowed headers from the original request
        Object.entries(req.headers).forEach(([key, value]) => {
            const lowerKey = key.toLowerCase();
            if (allowedHeaders.includes(lowerKey)) {
                headers[key] = value;
            }
        });
        
        // Add our own headers
        headers['x-request-id'] = requestId;
        headers['accept'] = 'application/json';
        
        // Handle authentication for token requests
        if (isAuthRequest && process.env.PINGONE_CLIENT_ID && process.env.PINGONE_CLIENT_SECRET) {
            const credentials = Buffer.from(`${process.env.PINGONE_CLIENT_ID}:${process.env.PINGONE_CLIENT_SECRET}`).toString('base64');
            headers['authorization'] = `Basic ${credentials}`;
        }
        
        // Prepare request options
        const options = {
            method: req.method,
            headers,
            timeout: 30000, // 30 second timeout
            redirect: 'follow'
        };
        
        // Add request body for applicable methods
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
            options.body = JSON.stringify(req.body);
        }
        
        // In proxyRequest, before making the request to PingOne API, get the token from the shared manager
        let token;
        try {
            token = await workerTokenManager.getAccessToken({
                apiClientId: process.env.PINGONE_CLIENT_ID,
                apiSecret: process.env.PINGONE_CLIENT_SECRET,
                environmentId: process.env.PINGONE_ENVIRONMENT_ID,
                region: process.env.PINGONE_REGION || 'NorthAmerica'
            });
            headers['Authorization'] = `Bearer ${token}`;
        } catch (error) {
            console.error('Error obtaining access token from workerTokenManager:', error);
            return res.status(401).json({ error: 'Failed to authenticate with PingOne API', details: error.message });
        }
        
        // Make the request to PingOne API
        const response = await fetch(targetUrl, options);
        const responseTime = Date.now() - startTime;
        
        // Get response headers
        const responseHeaders = Object.fromEntries([...response.headers.entries()]);
        
        // Handle response based on content type
        const contentType = response.headers.get('content-type') || '';
        let responseData;
        
        if (contentType.includes('application/json')) {
            responseData = await response.json().catch(() => ({}));
        } else {
            responseData = await response.text();
        }
        
        console.log(`[${requestId}] Response status: ${response.status} (${responseTime}ms)`);
        
        // Set CORS headers
        res.set({
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'access-control-allow-headers': 'Content-Type, Authorization, X-Requested-With',
            ...responseHeaders
        });
        
        // Remove problematic headers
        res.removeHeader('content-encoding');
        res.removeHeader('transfer-encoding');
        
        // Send response
        if (typeof responseData === 'string') {
            res.status(response.status).send(responseData);
        } else {
            res.status(response.status).json(responseData);
        }
        
    } catch (error) {
        console.error(`[${requestId}] Error:`, error);
        res.status(500).json({
            error: 'Proxy Error',
            message: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }
};

// Convenience endpoint for getting users
const getUsers = async (req, res) => {
    try {
        // Use settings from middleware
        const { environmentId, region } = req.settings || {};
        if (!environmentId) {
            return res.status(400).json({ error: 'Environment ID is required' });
        }
        
        const baseUrl = PINGONE_API_BASE_URLS[region || 'NorthAmerica'];
        const { filter, limit = 100, offset = 0 } = req.query;
        
        let url = `${baseUrl}/v1/environments/${environmentId}/users?limit=${limit}&offset=${offset}`;
        if (filter) {
            url += `&filter=${encodeURIComponent(filter)}`;
        }
        
        req.query.url = url;
        return proxyRequest(req, res);
    } catch (error) {
        console.error('Error in getUsers:', error);
        res.status(500).json({ error: 'Failed to get users', details: error.message });
    }
};

// Convenience endpoint for getting populations
const getPopulations = async (req, res) => {
    try {
        // Use settings from middleware
        const { environmentId, region } = req.settings || {};
        if (!environmentId) {
            return res.status(400).json({ error: 'Environment ID is required' });
        }
        
        // Use the correct region-specific base URL
        const baseUrl = PINGONE_API_BASE_URLS[region || 'NorthAmerica'];
        const { limit = 100, offset = 0 } = req.query;
        
        // Log the request for debugging
        console.log(`Getting populations for environment ${environmentId} in region ${region || 'NorthAmerica'}`);
        
        const url = `${baseUrl}/v1/environments/${environmentId}/populations?limit=${limit}&offset=${offset}`;
        req.query.url = url;
        
        // Add direct fetch with better error handling as a fallback
        try {
            // First try the proxy request
            return proxyRequest(req, res);
        } catch (proxyError) {
            console.error('Proxy request for populations failed, trying direct fetch:', proxyError);
            
            // If proxy fails, try direct fetch
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No authorization token provided' });
            }
            
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Failed to fetch populations: ${response.status}`, errorText);
                    return res.status(response.status).json({ 
                        error: `Failed to fetch populations: ${response.status}`,
                        details: errorText
                    });
                }
                
                const data = await response.json();
                return res.json(data);
            } catch (fetchError) {
                console.error('Direct fetch for populations failed:', fetchError);
                throw fetchError; // Let the outer catch handle it
            }
        }
    } catch (error) {
        console.error('Error in getPopulations:', error);
        res.status(500).json({ error: 'Failed to get populations', details: error.message });
    }
};

// Apply middleware and routes
router.use(express.json());

// Only apply settings validation to non-auth requests
router.use((req, res, next) => {
    if (req.path !== '/as/token' && !req.query.url?.includes('/as/token')) {
        injectSettings(req, res, () => {
            validateSettings(req, res, next);
        });
    } else {
        next();
    }
});

// Convenience endpoints (must come before catch-all)
router.get('/users', getUsers);
router.get('/populations', getPopulations);

// Test connection endpoint
// CRITICAL: This MUST be a GET endpoint to match client-side expectations
// Client-side files making GET requests: population-dropdown-fix.js, app.js, bundle files
// DO NOT change to POST without updating ALL client-side calls
// Last fixed: 2025-07-21 - HTTP method mismatch caused 400 Bad Request errors
router.get('/test-connection', async (req, res) => {
    const requestId = uuidv4();
    
    // DEBUG: Log HTTP method to catch future mismatches
    console.log(`[${requestId}] Testing PingOne connection... (Method: ${req.method})`);
    
    // VALIDATION: Ensure this is a GET request (defensive programming)
    if (!validateHttpMethod(req, res, 'GET', '/api/pingone/test-connection')) {
        return; // validateHttpMethod already sent the error response
    }
    
    // Helper function to send error response
    const sendError = (status, code, message, details = {}) => {
        console.error(`[${requestId}] Connection test failed: ${message}`, details);
        return res.status(status).json({
            success: false,
            error: {
                code,
                message,
                ...details
            },
            timestamp: new Date().toISOString(),
            requestId
        });
    };
    
    try {
        // Get settings from multiple sources with fallback priority:
        // 1. Environment variables (for production/server deployment)
        // 2. Request settings (injected by middleware from user settings)
        // 3. Fallback to settings file/database
        let settings = {
            environmentId: process.env.PINGONE_ENVIRONMENT_ID,
            apiClientId: process.env.PINGONE_CLIENT_ID,
            apiSecret: process.env.PINGONE_CLIENT_SECRET,
            region: process.env.PINGONE_REGION || 'NorthAmerica'
        };
        
        console.log(`[${requestId}] Initial settings from environment:`, {
            hasEnvId: !!settings.environmentId,
            hasClientId: !!settings.apiClientId,
            hasSecret: !!settings.apiSecret,
            region: settings.region
        });
        
        // If environment variables are missing, try to get from request settings (user configuration)
        if (!settings.environmentId || !settings.apiClientId || !settings.apiSecret) {
            console.log(`[${requestId}] Environment variables missing, checking user settings...`);
            
            if (req.settings && req.settings.environmentId && req.settings.apiClientId && req.settings.apiSecret) {
                settings = {
                    environmentId: req.settings.environmentId,
                    apiClientId: req.settings.apiClientId,
                    apiSecret: req.settings.apiSecret,
                    region: req.settings.region || 'NorthAmerica'
                };
                console.log(`[${requestId}] Using user-configured settings from request`);
            } else {
                // Try to load from settings file as last resort
                try {
                    const fs = await import('fs/promises');
                    const path = await import('path');
                    const settingsPath = path.resolve(process.cwd(), 'data/settings.json');
                    const settingsFile = await fs.readFile(settingsPath, 'utf8');
                    const fileSettings = JSON.parse(settingsFile);
                    
                    if (fileSettings.environmentId && fileSettings.apiClientId && fileSettings.apiSecret) {
                        settings = {
                            environmentId: fileSettings.environmentId,
                            apiClientId: fileSettings.apiClientId,
                            apiSecret: fileSettings.apiSecret,
                            region: fileSettings.region || 'NorthAmerica'
                        };
                        console.log(`[${requestId}] Using settings from file:`, {
                            settingsPath,
                            hasEnvId: !!settings.environmentId,
                            hasClientId: !!settings.apiClientId,
                            hasSecret: !!settings.apiSecret,
                            region: settings.region
                        });
                    } else {
                        console.error(`[${requestId}] Incomplete settings in file:`, {
                            hasEnvId: !!fileSettings.environmentId,
                            hasClientId: !!fileSettings.apiClientId,
                            hasSecret: !!fileSettings.apiSecret,
                            region: fileSettings.region
                        });
                    }
                } catch (fileError) {
                    console.error(`[${requestId}] Could not load settings from file:`, fileError);
                    return sendError(400, 'MISSING_CREDENTIALS', 'Missing required PingOne API credentials', {
                        details: 'Could not load credentials from any source (env, request, or file)',
                        fileError: fileError.message
                    });
                }
            }
        }
        
        // Validate we have all required settings
        if (!settings.environmentId || !settings.apiClientId || !settings.apiSecret) {
            console.error(`[${requestId}] Missing required credentials:`, {
                hasEnvId: !!settings.environmentId,
                hasClientId: !!settings.apiClientId,
                hasSecret: !!settings.apiSecret,
                region: settings.region
            });
            return sendError(400, 'MISSING_CREDENTIALS', 'Missing required PingOne API credentials', {
                details: 'One or more required credentials are missing',
                hasEnvironmentId: !!settings.environmentId,
                hasClientId: !!settings.apiClientId,
                hasClientSecret: !!settings.apiSecret
            });
        } else {
            console.log(`[${requestId}] Using environment variables`);
        }
        
        // Final validation - if still no credentials, return helpful error
        if (!settings.environmentId || !settings.apiClientId || !settings.apiSecret) {
            console.log(`[${requestId}] No valid credentials found in any source`);
            return res.status(400).json({
                success: false,
                error: 'Missing required credentials. Please configure your PingOne settings in the Settings page.',
                debug: {
                    hasEnvVars: !!(process.env.PINGONE_ENVIRONMENT_ID && process.env.PINGONE_CLIENT_ID && process.env.PINGONE_CLIENT_SECRET),
                    hasReqSettings: !!(req.settings && req.settings.environmentId && req.settings.apiClientId && req.settings.apiSecret),
                    message: 'Configure credentials in Settings page or set environment variables'
                }
            });
        }
        
        // Get region-specific auth domain for token URL
        const getAuthDomain = (region) => {
            const domainMap = {
                'NorthAmerica': 'auth.pingone.com',
                'Europe': 'auth.eu.pingone.com', 
                'Canada': 'auth.ca.pingone.com',
                'Asia': 'auth.apsoutheast.pingone.com',
                'Australia': 'auth.aus.pingone.com',
                'US': 'auth.pingone.com',
                'EU': 'auth.eu.pingone.com',
                'AP': 'auth.apsoutheast.pingone.com'
            };
            return domainMap[region] || 'auth.pingone.com';
        };
        
        // Try to get a token to test the connection using region-specific URL
        const authDomain = getAuthDomain(settings.region);
        const tokenUrl = `https://${authDomain}/${settings.environmentId}/as/token.oauth2`;
        console.log(`[${requestId}] Using token URL: ${tokenUrl}`);
        
        const tokenData = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: settings.apiClientId,
            client_secret: settings.apiSecret
        });
        
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: tokenData
        });
        
        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error(`[${requestId}] Token request failed:`, errorText);
            return res.status(400).json({
                success: false,
                error: 'Authentication failed. Please check your credentials.'
            });
        }
        
        const tokenResult = await tokenResponse.json();
        
        if (!tokenResult.access_token) {
            return res.status(400).json({
                success: false,
                error: 'Failed to obtain access token. Please check your credentials.'
            });
        }
        
        // Test API access with the token
        const apiBaseUrl = PINGONE_API_BASE_URLS[settings.region] || PINGONE_API_BASE_URLS.default;
        const testUrl = `${apiBaseUrl}/v1/environments/${settings.environmentId}`;
        
        const testResponse = await fetch(testUrl, {
            headers: {
                'Authorization': `Bearer ${tokenResult.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!testResponse.ok) {
            const errorText = await testResponse.text();
            console.error(`[${requestId}] API test failed:`, errorText);
            return res.status(400).json({
                success: false,
                error: 'API access failed. Please check your environment ID and permissions.'
            });
        }
        
        console.log(`[${requestId}] Connection test successful`);
        res.json({
            success: true,
            message: 'Connection test successful',
            environmentId: settings.environmentId,
            region: settings.region
        });
        
    } catch (error) {
        console.error(`[${requestId}] Connection test error:`, error);
        res.status(500).json({
            success: false,
            error: 'Connection test failed: ' + error.message
        });
    }
});

// Get token endpoint
router.post('/token', async (req, res) => {
    const requestId = uuidv4();
    console.log(`[${requestId}] Getting PingOne token...`);
    
    try {
        // First try to get settings from the settings file
        let settings = null;
        try {
            const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
            const fs = await import('fs');
            const settingsData = await fs.promises.readFile(settingsPath, 'utf8');
            const parsedSettings = JSON.parse(settingsData);
            settings = {
                environmentId: parsedSettings.environmentId,
                apiClientId: parsedSettings.apiClientId,
                apiSecret: parsedSettings.apiSecret,
                region: parsedSettings.region || 'NorthAmerica'
            };
            console.log(`[${requestId}] Loaded settings from file`);
        } catch (fileError) {
            console.log(`[${requestId}] Could not load settings from file, using environment variables`);
        }
        
        // Fallback to environment variables or request settings
        if (!settings || !settings.apiClientId || !settings.apiSecret) {
            settings = req.settings || {
                environmentId: process.env.PINGONE_ENVIRONMENT_ID,
                apiClientId: process.env.PINGONE_CLIENT_ID,
                apiSecret: process.env.PINGONE_CLIENT_SECRET,
                region: process.env.PINGONE_REGION || 'NorthAmerica'
            };
        }
        
        if (!settings.apiClientId || !settings.apiSecret) {
            console.log(`[${requestId}] Missing credentials - clientId: ${!!settings.apiClientId}, secret: ${!!settings.apiSecret}, envId: ${!!settings.environmentId}`);
            return res.status(400).json({
                success: false,
                error: 'Missing API credentials. Please configure your PingOne settings.'
            });
        }
        
        // Log what we're using (safely)
        console.log(`[${requestId}] Using credentials - clientId: ${settings.apiClientId?.substring(0, 8)}..., secret: ${settings.apiSecret?.substring(0, 5)}***, envId: ${settings.environmentId?.substring(0, 8)}..., region: ${settings.region}`);
        
        // Get access token using the correct PingOne endpoint for the environment
        // Get region-specific auth domain
        const getAuthDomain = (region) => {
            const domainMap = {
                'NorthAmerica': 'auth.pingone.com',
                'Europe': 'auth.eu.pingone.com',
                'Canada': 'auth.ca.pingone.com',
                'Asia': 'auth.apsoutheast.pingone.com',
                'Australia': 'auth.aus.pingone.com',
                'US': 'auth.pingone.com',
                'EU': 'auth.eu.pingone.com',
                'AP': 'auth.apsoutheast.pingone.com'
            };
            return domainMap[region] || 'auth.pingone.com';
        };
        
        const authDomain = getAuthDomain(settings.region || 'NorthAmerica');
        const tokenUrl = `https://${authDomain}/${settings.environmentId}/as/token`;
        console.log(`[${requestId}] Token URL: ${tokenUrl} (region: ${settings.region})`);
        
        const tokenData = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: settings.apiClientId,
            client_secret: settings.apiSecret
        });
        
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: tokenData
        });
        
        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error(`[${requestId}] Token request failed (${tokenResponse.status}):`, errorText);
            
            let errorMessage = 'Failed to get token. Please check your credentials.';
            if (tokenResponse.status === 401) {
                errorMessage = 'Invalid credentials. Please verify your Client ID and Secret.';
            } else if (tokenResponse.status === 404) {
                errorMessage = 'PingOne environment not found. Please verify your Environment ID.';
            }
            
            return res.status(400).json({
                success: false,
                error: errorMessage,
                details: process.env.NODE_ENV !== 'production' ? errorText : undefined
            });
        }
        
        const tokenResult = await tokenResponse.json();
        
        if (!tokenResult.access_token) {
            return res.status(400).json({
                success: false,
                error: 'No access token received. Please check your credentials.'
            });
        }
        
        console.log(`[${requestId}] Token acquired successfully`);
        res.json({
            success: true,
            access_token: tokenResult.access_token,
            token_type: tokenResult.token_type || 'Bearer',
            expires_in: tokenResult.expires_in || 3600
        });
        
    } catch (error) {
        console.error(`[${requestId}] Token request error:`, error);
        res.status(500).json({
            success: false,
            error: 'Token request failed: ' + error.message
        });
    }
});

// All other requests go through the proxy handler (catch-all)
// Skip the get-token endpoint as it's handled by the main API router
router.all('*', (req, res, next) => {
    if (req.path === '/get-token') {
        // Let the main API router handle this
        return next();
    }
    return proxyRequest(req, res);
});

export default router;
