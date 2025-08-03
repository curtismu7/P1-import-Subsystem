/**
 * Token Service
 * 
 * Centralized service for managing PingOne API tokens with caching and automatic refresh.
 * Implements bulletproof error handling and retry logic.
 */

import fetch from 'node-fetch';
import { serverLogger as logger } from '../winston-config.js';

class TokenService {
    constructor() {
        this.tokenCache = {
            accessToken: null,
            expiresAt: 0,
            refreshToken: null,
            environmentId: null,
            region: null
        };
        
        this.refreshTimeout = null;
        this.pendingTokenRequest = null;
        this.isRefreshing = false;
    }

    /**
     * Get a valid access token
     * @param {Object} credentials - Optional credentials to use instead of environment variables
     * @returns {Promise<string>} - Resolves with a valid access token
     */
    async getToken(credentials = null) {
        // If we have a valid cached token, return it
        if (this.tokenCache.accessToken && Date.now() < this.tokenCache.expiresAt - 30000) {
            return this.tokenCache.accessToken;
        }

        // If we're already refreshing the token, return the pending promise
        if (this.pendingTokenRequest) {
            return this.pendingTokenRequest;
        }

        try {
            this.pendingTokenRequest = this.acquireToken(credentials);
            const token = await this.pendingTokenRequest;
            return token;
        } finally {
            this.pendingTokenRequest = null;
        }
    }

    /**
     * Acquire a new access token
     * @private
     */
    async acquireToken(credentials = null) {
        const env = credentials || {
            environmentId: process.env.PINGONE_ENVIRONMENT_ID,
            clientId: process.env.PINGONE_CLIENT_ID,
            clientSecret: process.env.PINGONE_CLIENT_SECRET,
            region: process.env.PINGONE_REGION || 'NorthAmerica'
        };

        // Validate required credentials
        const missingFields = [];
        if (!env.environmentId) missingFields.push('PINGONE_ENVIRONMENT_ID');
        if (!env.clientId) missingFields.push('PINGONE_CLIENT_ID');
        if (!env.clientSecret) missingFields.push('PINGONE_CLIENT_SECRET');
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required credentials: ${missingFields.join(', ')}`);
        }

        const authDomain = this.getAuthDomain(env.region);
        const tokenUrl = `https://${authDomain}/${env.environmentId}/as/token`;
        const authHeader = `Basic ${Buffer.from(`${env.clientId}:${env.clientSecret}`).toString('base64')}`;

        try {
            logger.info('Requesting new access token', { environmentId: env.environmentId, region: env.region });
            
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': authHeader
                },
                body: 'grant_type=client_credentials'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Token request failed with status ${response.status}: ${errorText}`);
            }

            const tokenData = await response.json();
            
            if (!tokenData.access_token) {
                throw new Error('No access token in response');
            }

            // Update token cache
            this.tokenCache = {
                accessToken: tokenData.access_token,
                expiresAt: Date.now() + (tokenData.expires_in * 1000),
                refreshToken: tokenData.refresh_token,
                environmentId: env.environmentId,
                region: env.region
            };

            // Schedule token refresh
            this.scheduleTokenRefresh(tokenData.expires_in);

            logger.info('Successfully acquired access token', {
                environmentId: env.environmentId,
                expiresIn: tokenData.expires_in,
                tokenType: tokenData.token_type
            });

            return tokenData.access_token;
            
        } catch (error) {
            logger.error('Failed to acquire access token', {
                error: error.message,
                environmentId: env.environmentId,
                region: env.region
            });
            throw error;
        }
    }

    /**
     * Schedule automatic token refresh
     * @private
     */
    scheduleTokenRefresh(expiresIn) {
        // Clear any existing timeout
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
            this.refreshTimeout = null;
        }

        // Refresh token 1 minute before it expires
        const refreshTime = Math.max(0, (expiresIn - 60) * 1000);
        
        this.refreshTimeout = setTimeout(async () => {
            try {
                logger.info('Refreshing access token before expiration');
                await this.getToken();
            } catch (error) {
                logger.error('Failed to refresh access token', { error: error.message });
                // Retry after a delay
                this.scheduleTokenRefresh(60); // Retry in 1 minute
            }
        }, refreshTime);
    }

    /**
     * Get the auth domain for a given region
     * @private
     */
    getAuthDomain(region) {
        const regionDomains = {
            'NA': 'auth.pingone.com',
            'EU': 'auth.pingone.eu',
            'APAC': 'auth.pingone.asia',
            'US': 'auth.pingone.com',
            'NorthAmerica': 'auth.pingone.com',
            'Europe': 'auth.pingone.eu',
            'Asia': 'auth.pingone.asia',
            'Canada': 'auth.pingone.ca',
            'Australia': 'auth.pingone.com.au'
        };

        return regionDomains[region] || 'auth.pingone.com';
    }

    /**
     * Clear the current token and cancel any pending refresh
     */
    clearToken() {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
            this.refreshTimeout = null;
        }
        
        this.tokenCache = {
            accessToken: null,
            expiresAt: 0,
            refreshToken: null,
            environmentId: null,
            region: null
        };
        
        this.pendingTokenRequest = null;
    }

    /**
     * Get the current token status
     */
    getTokenStatus() {
        const now = Date.now();
        const expiresIn = Math.max(0, (this.tokenCache.expiresAt - now) / 1000);
        
        return {
            hasToken: !!this.tokenCache.accessToken,
            isValid: now < this.tokenCache.expiresAt,
            expiresIn: Math.floor(expiresIn),
            environmentId: this.tokenCache.environmentId,
            region: this.tokenCache.region,
            lastUpdated: this.tokenCache.expiresAt ? new Date(this.tokenCache.expiresAt - (this.tokenCache.expiresIn * 1000)).toISOString() : null
        };
    }
}

// Export a singleton instance
export const tokenService = new TokenService();

export default tokenService;
