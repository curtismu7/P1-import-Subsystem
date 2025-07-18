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
        
        const baseUrl = PINGONE_API_BASE_URLS[region || 'NorthAmerica'];
        const { limit = 100, offset = 0 } = req.query;
        
        const url = `${baseUrl}/v1/environments/${environmentId}/populations?limit=${limit}&offset=${offset}`;
        req.query.url = url;
        return proxyRequest(req, res);
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
