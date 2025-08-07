/**
 * PingOne API Routes
 * 
 * Handles PingOne API operations including connection testing, token management,
 * and user data operations.
 */

import express from 'express';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import { apiLogger } from '../../server/winston-config.js';

const router = express.Router();

/**
 * Test PingOne API connection
 * POST /api/pingone/test-connection
 */
router.post('/test-connection', async (req, res) => {
    const functionName = 'POST /api/pingone/test-connection';
    const startTime = Date.now();
    
    try {
        // Log the incoming request body for debugging
        apiLogger.info(`${functionName} - Incoming request body`, { body: req.body });
        const { environmentId, clientId, clientSecret, region } = req.body;
        
        // Validate required fields
        const missingFields = [];
        if (!environmentId) missingFields.push('environmentId');
        if (!clientId) missingFields.push('clientId');
        if (!clientSecret) missingFields.push('clientSecret');
        if (!region) missingFields.push('region');
        if (missingFields.length > 0) {
            apiLogger.warn(`${functionName} - Missing required fields`, { missingFields });
            return res.status(400).json({
                success: false,
                error: 'Missing required credentials',
                details: `Missing fields: ${missingFields.join(', ')}`
            });
        }
        
        // Determine the correct PingOne domain based on region
        const regionDomains = {
            'NA': 'auth.pingone.com',
            'EU': 'auth.pingone.eu',
            'APAC': 'auth.pingone.asia'
        };
        
        const domain = regionDomains[region.toUpperCase()];
        if (!domain) {
            apiLogger.warn(`${functionName} - Invalid region`, { region });
            return res.status(400).json({
                success: false,
                error: 'Invalid region',
                details: 'Region must be one of: NA, EU, APAC'
            });
        }
        
        // Test connection by getting an access token
        const tokenUrl = `https://${domain}/${environmentId}/as/token`;
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            body: 'grant_type=client_credentials'
        });
        
        const responseTime = Date.now() - startTime;
        
        if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            
            apiLogger.info(`${functionName} - Connection test successful`, {
                requestId: req.requestId,
                environmentId,
                region,
                responseTime: `${responseTime}ms`
            });
            
            res.json({
                success: true,
                message: 'Connection successful',
                data: {
                    environmentId,
                    region,
                    tokenType: tokenData.token_type,
                    expiresIn: tokenData.expires_in,
                    connectionTime: responseTime
                }
            });
        } else {
            const errorData = await tokenResponse.text();
            apiLogger.warn(`${functionName} - Connection test failed`, {
                requestId: req.requestId,
                environmentId,
                region,
                status: tokenResponse.status,
                error: errorData,
                responseTime: `${responseTime}ms`,
                tokenUrl
            });
            res.status(400).json({
                success: false,
                error: 'Authentication failed',
                details: `HTTP ${tokenResponse.status}: ${errorData}`,
                data: {
                    environmentId,
                    region,
                    status: tokenResponse.status,
                    tokenUrl,
                    errorData
                }
            });
        }
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        apiLogger.error(`${functionName} - Connection test error`, {
            requestId: req.requestId,
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`
        });
        
        res.status(500).json({
            success: false,
            error: 'Connection test failed',
            details: error.message
        });
    }
});

/**
 * Get PingOne access token
 * POST /api/pingone/token
 */
router.post('/token', async (req, res) => {
    const functionName = 'POST /api/pingone/token';
    const startTime = Date.now();
    
    try {
        // Read credentials from settings file
        const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
        let credentials;
        
        try {
            const settingsContent = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(settingsContent);
            
            credentials = {
                environmentId: settings.environmentId || settings.pingone_environment_id || settings['environment-id'],
                clientId: settings.apiClientId || settings.pingone_client_id || settings['api-client-id'],
                clientSecret: settings.apiSecret || settings.pingone_client_secret || settings['api-secret'],
                region: settings.region || settings.pingone_region || 'NorthAmerica'
            };
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to load credentials from settings'
            });
        }
        
        const { environmentId, clientId, clientSecret, region } = credentials;
        
        // Validate required fields
        if (!environmentId || !clientId || !clientSecret || !region) {
            return res.status(400).json({
                success: false,
                error: 'Missing required credentials in settings'
            });
        }
        
        // Determine the correct PingOne domain
        const regionDomains = {
            'NA': 'auth.pingone.com',
            'NORTHAMERICA': 'auth.pingone.com',
            'EU': 'auth.pingone.eu',
            'EUROPE': 'auth.pingone.eu',
            'APAC': 'auth.pingone.asia',
            'ASIAPACIFIC': 'auth.pingone.asia'
        };
        
        const domain = regionDomains[region.toUpperCase()];
        if (!domain) {
            return res.status(400).json({
                success: false,
                error: 'Invalid region'
            });
        }
        
        // Get access token
        const tokenUrl = `https://${domain}/${environmentId}/as/token`;
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            body: 'grant_type=client_credentials'
        });
        
        const responseTime = Date.now() - startTime;
        
        if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            
            apiLogger.info(`${functionName} - Token obtained successfully`, {
                requestId: req.requestId,
                environmentId,
                region,
                responseTime: `${responseTime}ms`
            });
            
            return res.success('Access token retrieved successfully', {
                access_token: tokenData.access_token,
                token_type: tokenData.token_type,
                expires_in: tokenData.expires_in,
                scope: tokenData.scope
            });
        } else {
            const errorData = await tokenResponse.text();
            
            apiLogger.warn(`${functionName} - Token request failed`, {
                requestId: req.requestId,
                environmentId,
                region,
                status: tokenResponse.status,
                error: errorData,
                responseTime: `${responseTime}ms`
            });
            
            return res.error('Token request failed', { code: 'TOKEN_REQUEST_FAILED', message: errorData }, tokenResponse.status);
        }
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        apiLogger.error(`${functionName} - Token request error`, {
            requestId: req.requestId,
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`
        });
        
        return res.error('Failed to get access token', { code: 'TOKEN_ERROR', message: error.message }, 500);
    }
});

/**
 * Get PingOne populations
 * GET /api/pingone/populations
 */
router.get('/populations', async (req, res) => {
    const functionName = 'GET /api/pingone/populations';
    const startTime = Date.now();
    
    try {
        const { environmentId, region } = req.query;
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.error('Authorization header required', { code: 'AUTHORIZATION_REQUIRED', message: 'Authorization header required' }, 401);
        }
        
        if (!environmentId || !region) {
            return res.error('Environment ID and region are required', { code: 'MISSING_FIELDS', message: 'Environment ID and region are required' }, 400);
        }
        
        // Determine the correct PingOne domain
        const regionDomains = {
            'NA': 'api.pingone.com',
            'EU': 'api.pingone.eu',
            'APAC': 'api.pingone.asia'
        };
        
        const domain = regionDomains[region.toUpperCase()];
        if (!domain) {
            return res.error('Invalid region', { code: 'INVALID_REGION', message: 'Region must be one of: NA, EU, APAC' }, 400);
        }
        
        // Get populations
        const populationsUrl = `https://${domain}/v1/environments/${environmentId}/populations`;
        const populationsResponse = await fetch(populationsUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
        
        const responseTime = Date.now() - startTime;
        
        if (populationsResponse.ok) {
            const populationsData = await populationsResponse.json();
            
            apiLogger.info(`${functionName} - Populations retrieved successfully`, {
                requestId: req.requestId,
                environmentId,
                region,
                count: populationsData._embedded?.populations?.length || 0,
                responseTime: `${responseTime}ms`
            });
            
            return res.success('Populations retrieved successfully', {
                populations: populationsData._embedded?.populations || [],
                count: populationsData._embedded?.populations?.length || 0
            });
        } else {
            const errorData = await populationsResponse.text();
            
            apiLogger.warn(`${functionName} - Populations request failed`, {
                requestId: req.requestId,
                environmentId,
                region,
                status: populationsResponse.status,
                error: errorData,
                responseTime: `${responseTime}ms`
            });
            
            return res.error('Failed to retrieve populations', { code: 'POPULATIONS_REQUEST_FAILED', message: errorData }, populationsResponse.status);
        }
        
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        apiLogger.error(`${functionName} - Populations request error`, {
            requestId: req.requestId,
            error: error.message,
            stack: error.stack,
            responseTime: `${responseTime}ms`
        });
        
        return res.error('Failed to retrieve populations', { code: 'POPULATIONS_REQUEST_ERROR', message: error.message }, 500);
    }
});

export default router;
