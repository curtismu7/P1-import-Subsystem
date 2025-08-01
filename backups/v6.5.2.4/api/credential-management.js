/**
 * Credential Management API Routes
 * 
 * Provides REST API endpoints for managing PingOne credentials including:
 * - Credential validation and testing
 * - Multi-location credential storage (env, settings.json)
 * - Current credential retrieval
 * - Authentication status monitoring
 * - Credential clearing and management
 */

import express from 'express';
import { apiLogger, apiLogHelpers } from '../../server/winston-config.js';
import EnhancedServerAuth from '../../auth-subsystem/server/enhanced-server-auth.js';

const router = express.Router();

// API Request/Response Logging Middleware for Credential Management
router.use((req, res, next) => {
    const startTime = Date.now();
    
    // Log incoming request with credential management context
    const requestId = apiLogHelpers.logApiRequest(req, {
        subsystem: 'credential-management',
        endpoint: req.path
    });
    req.requestId = requestId;
    req.startTime = startTime;
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        
        // Log API response with credential management context
        apiLogHelpers.logApiResponse(req, res, requestId, duration, {
            subsystem: 'credential-management',
            endpoint: req.path
        });
        
        // Call original end method
        originalEnd.call(res, chunk, encoding);
    };
    
    next();
});

// Initialize enhanced authentication (will be set by server startup)
let enhancedAuth = null;

/**
 * Initialize the credential management routes with enhanced auth instance
 * @param {EnhancedServerAuth} authInstance - The enhanced authentication instance
 */
export function initializeCredentialRoutes(authInstance) {
    enhancedAuth = authInstance;
}

/**
 * Middleware to ensure authentication system is available
 */
function requireAuth(req, res, next) {
    if (!enhancedAuth) {
        return res.status(503).json({
            success: false,
            error: 'Authentication system not initialized',
            message: 'Server authentication system is not available'
        });
    }
    next();
}

/**
 * GET /api/auth/status
 * Get current authentication status
 */
router.get('/status', requireAuth, async (req, res) => {
    try {
        const status = enhancedAuth.getAuthenticationStatus();
        
        res.json({
            success: true,
            ...status,
            serverTime: new Date().toISOString()
        });
    } catch (error) {
        apiLogger.error('Error getting auth status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get authentication status',
            message: error.message
        });
    }
});

/**
 * GET /api/auth/current-credentials
 * Get current credentials (sanitized for client)
 */
router.get('/current-credentials', requireAuth, async (req, res) => {
    try {
        const credentials = await enhancedAuth.getCredentials();
        
        if (!credentials) {
            return res.json({
                success: false,
                message: 'No credentials currently configured'
            });
        }

        // Return sanitized credentials (no secrets)
        const sanitizedCredentials = {
            clientId: credentials.clientId,
            environmentId: credentials.environmentId,
            region: credentials.region,
            hasClientSecret: !!credentials.clientSecret
        };

        res.json({
            success: true,
            credentials: sanitizedCredentials
        });
    } catch (error) {
        apiLogger.error('Error getting current credentials:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get current credentials',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/validate-credentials
 * Validate provided credentials by testing them with PingOne
 */
router.post('/validate-credentials', requireAuth, async (req, res) => {
    try {
        const { clientId, clientSecret, environmentId, region } = req.body;

        // Validate input
        if (!clientId || !clientSecret || !environmentId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required credentials',
                message: 'Client ID, Client Secret, and Environment ID are required'
            });
        }

        // Test credentials
        const validation = await enhancedAuth.validateCredentials({
            apiClientId: clientId,
            apiSecret: clientSecret,
            environmentId: environmentId,
            region: region || 'NorthAmerica'
        });

        res.json({
            success: validation.success,
            message: validation.message,
            details: validation.success ? {
                clientId: clientId,
                environmentId: environmentId,
                region: region || 'NorthAmerica',
                testedAt: new Date().toISOString()
            } : null
        });
    } catch (error) {
        apiLogger.error('Error validating credentials:', error);
        res.status(500).json({
            success: false,
            error: 'Credential validation failed',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/save-credentials
 * Save credentials to specified storage locations
 */
router.post('/save-credentials', requireAuth, async (req, res) => {
    try {
        const { credentials, targets } = req.body;

        // Validate input
        if (!credentials || !credentials.clientId || !credentials.clientSecret || !credentials.environmentId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid credentials',
                message: 'Client ID, Client Secret, and Environment ID are required'
            });
        }

        if (!targets || !Array.isArray(targets) || targets.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid targets',
                message: 'At least one storage target must be specified'
            });
        }

        // Validate credentials before saving
        const validation = await enhancedAuth.validateCredentials({
            apiClientId: credentials.clientId,
            apiSecret: credentials.clientSecret,
            environmentId: credentials.environmentId,
            region: credentials.region || 'NorthAmerica'
        });

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid credentials',
                message: `Credentials failed validation: ${validation.message}`
            });
        }

        // Save to specified locations
        const saveResults = await enhancedAuth.saveCredentialsToMultipleLocations(
            credentials,
            targets.filter(target => target !== 'localStorage') // localStorage handled client-side
        );

        // Check if any saves were successful
        const hasSuccess = Object.values(saveResults).some(result => result.success);
        const hasFailures = Object.values(saveResults).some(result => !result.success);

        res.json({
            success: hasSuccess,
            message: hasSuccess ? 
                (hasFailures ? 'Credentials saved with some failures' : 'Credentials saved successfully') :
                'Failed to save credentials to any location',
            results: saveResults
        });
    } catch (error) {
        apiLogger.error('Error saving credentials:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save credentials',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/clear-credentials
 * Clear credentials from all storage locations
 */
router.post('/clear-credentials', requireAuth, async (req, res) => {
    try {
        // Clear token first
        enhancedAuth.clearToken();

        // Clear from multiple locations
        const clearResults = await enhancedAuth.saveCredentialsToMultipleLocations(
            {
                clientId: '',
                clientSecret: '',
                environmentId: '',
                region: 'NorthAmerica'
            },
            ['env', 'settings']
        );

        res.json({
            success: true,
            message: 'Credentials cleared from server storage',
            results: clearResults,
            note: 'Client-side localStorage must be cleared separately'
        });
    } catch (error) {
        apiLogger.error('Error clearing credentials:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear credentials',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/refresh-token
 * Force refresh of the current access token
 */
router.post('/refresh-token', requireAuth, async (req, res) => {
    try {
        if (!enhancedAuth.isInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Authentication not initialized',
                message: 'Server authentication must be initialized before refreshing tokens'
            });
        }

        const token = await enhancedAuth.refreshStartupToken();
        const tokenInfo = enhancedAuth.getTokenInfo();

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            tokenInfo: {
                expiresAt: tokenInfo.expiresAt,
                expiresIn: tokenInfo.expiresIn,
                isValid: tokenInfo.isValid,
                lastRefresh: tokenInfo.lastRefresh
            }
        });
    } catch (error) {
        apiLogger.error('Error refreshing token:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh token',
            message: error.message
        });
    }
});

/**
 * GET /api/auth/token-info
 * Get current token information
 */
router.get('/token-info', requireAuth, async (req, res) => {
    try {
        const tokenInfo = enhancedAuth.getTokenInfo();
        
        if (!tokenInfo) {
            return res.json({
                success: false,
                message: 'No token available'
            });
        }

        res.json({
            success: true,
            tokenInfo: {
                expiresAt: tokenInfo.expiresAt,
                expiresIn: tokenInfo.expiresIn,
                isValid: tokenInfo.isValid,
                lastRefresh: tokenInfo.lastRefresh,
                tokenType: tokenInfo.tokenType
            }
        });
    } catch (error) {
        apiLogger.error('Error getting token info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get token information',
            message: error.message
        });
    }
});

/**
 * GET /api/auth/setup-recommendations
 * Get setup recommendations for configuration
 */
router.get('/setup-recommendations', (req, res) => {
    try {
        const recommendations = enhancedAuth ? 
            enhancedAuth.getSetupRecommendations() : 
            [
                '1. Server authentication system is not initialized',
                '2. Check server logs for initialization errors',
                '3. Ensure all required environment variables are set',
                '4. Restart the server after configuration changes'
            ];

        res.json({
            success: true,
            recommendations: recommendations
        });
    } catch (error) {
        apiLogger.error('Error getting setup recommendations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get setup recommendations',
            message: error.message
        });
    }
});

/**
 * POST /api/auth/test-connection
 * Test connection to PingOne APIs with current credentials
 */
router.post('/test-connection', requireAuth, async (req, res) => {
    try {
        if (!enhancedAuth.isInitialized) {
            return res.status(400).json({
                success: false,
                error: 'Authentication not initialized',
                message: 'Server authentication must be initialized before testing connection'
            });
        }

        // Get current token to test connection
        const token = await enhancedAuth.getAccessToken();
        const environmentId = await enhancedAuth.getEnvironmentId();
        
        if (!token || !environmentId) {
            return res.status(400).json({
                success: false,
                error: 'No valid credentials',
                message: 'Valid credentials are required to test connection'
            });
        }

        // Test API connectivity by making a simple API call
        const apiBaseUrl = enhancedAuth.getApiBaseUrl();
        const testUrl = `${apiBaseUrl}/environments/${environmentId}`;
        
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            res.json({
                success: true,
                message: 'Connection test successful',
                details: {
                    environmentId: environmentId,
                    environmentName: data.name || 'Unknown',
                    region: enhancedAuth.currentRegion,
                    responseTime: Date.now() - Date.now(), // Simplified for demo
                    testedAt: new Date().toISOString()
                }
            });
        } else {
            res.status(response.status).json({
                success: false,
                error: 'Connection test failed',
                message: `API returned ${response.status}: ${response.statusText}`
            });
        }
    } catch (error) {
        apiLogger.error('Error testing connection:', error);
        res.status(500).json({
            success: false,
            error: 'Connection test failed',
            message: error.message
        });
    }
});

export default router;
