/**
 * Token Service
 * 
 * Centralized service for managing PingOne API tokens with caching and automatic refresh.
 * Implements bulletproof error handling and retry logic.
 */

import fetch from 'node-fetch';
import { serverLogger as logger } from '../winston-config.js';
import { loadSettings } from './settings-loader.js';

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
        this.defaultTimeoutMs = 10000; // 10s timeout for network calls
        this.maxRetries = 3;
        this.retryBackoffMs = [500, 1500, 3000];
    }

    /**
     * Get a valid access token
     * @param {Object} credentials - Optional credentials to use instead of environment variables
     * @returns {Promise<string>} - Resolves with a valid access token
     */
    async getToken(credentials = null) {
        // If we have a valid cached token, return it
        if (this.tokenCache.accessToken && Date.now() < this.tokenCache.expiresAt - 300000) {
            try {
                const now = Date.now();
                const expiresInMs = Math.max(0, (this.tokenCache.expiresAt || 0) - now);
                logger.info('Using cached access token', {
                    expiresInSec: Math.floor(expiresInMs / 1000),
                    environmentId: this.tokenCache.environmentId,
                    region: this.tokenCache.region
                });
            } catch (_) { /* no-op */ }
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
        let env;
        if (credentials) {
            env = credentials;
        } else {
            const s = await loadSettings(logger);
            env = {
                environmentId: s.environmentId,
                clientId: s.clientId,
                clientSecret: s.clientSecret,
                region: s.region || 'NorthAmerica'
            };
        }

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
            logger.info('Requesting new access token', { environmentId: env.environmentId, region: env.region, authDomain });
            logger.debug('Token endpoint URL', { tokenUrl });

            const response = await this.fetchWithRetry(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': authHeader
                },
                body: 'grant_type=client_credentials'
            });

            if (!response.ok) {
                const errorText = await response.text();
                const preview = errorText && errorText.length > 800 ? errorText.slice(0, 800) + '…(truncated)' : errorText;
                const masked = {
                    environmentId: (env.environmentId || '').slice(0, 6) + '...' + (env.environmentId || '').slice(-4),
                    clientId: (env.clientId || '').slice(0, 6) + '...' + (env.clientId || '').slice(-4),
                    region: env.region,
                    tokenUrl
                };
                logger.error('Token endpoint error', {
                    status: response.status,
                    statusText: response.statusText,
                    bodyPreview: preview,
                    context: masked
                });
                throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
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
                region: env.region,
                lastUpdated: Date.now()
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
                region: env.region,
                authDomain,
                url: tokenUrl,
                name: error.name,
                code: error.code
            });
            throw error;
        }
    }

    /**
     * Fetch with timeout and retry/backoff for transient network errors
     * @private
     */
    async fetchWithRetry(url, options = {}) {
        const controller = new AbortController();
        const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
        const transientErrorRegex = /(ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|NetworkError|network|fetch failed|socket hang up)/i;
        let attempt = 0;

        while (true) {
            attempt += 1;
            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const resp = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(timeout);
                return resp;
            } catch (err) {
                clearTimeout(timeout);
                const isTransient = transientErrorRegex.test(String(err && (err.code || err.message || err.name)));
                const canRetry = attempt < this.maxRetries && isTransient;
                logger.warn('Token fetch attempt failed', {
                    attempt,
                    maxRetries: this.maxRetries,
                    transient: isTransient,
                    error: err.message,
                    code: err.code,
                    name: err.name
                });
                if (!canRetry) throw err;
                const backoff = this.retryBackoffMs[Math.min(attempt - 1, this.retryBackoffMs.length - 1)] || 1000;
                await new Promise(res => setTimeout(res, backoff));
                // Reset controller for next attempt
                try { controller.abort(); } catch {}
                // Create a new controller for the next loop
                // eslint-disable-next-line no-param-reassign
                options.signal = undefined;
                continue;
            }
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

        // Refresh token 5 minutes before it expires
        const refreshTime = Math.max(0, (expiresIn - 300) * 1000);
        
        this.refreshTimeout = setTimeout(async () => {
            try {
                logger.info('Refreshing access token before expiration');
                await this.getToken();
            } catch (error) {
                logger.error('Failed to refresh access token', { error: error.message });
                // Retry after a delay
                this.scheduleTokenRefresh(300); // Retry in 5 minutes
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
            'CA': 'auth.pingone.ca',
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
        try {
            const now = Date.now();
            const expiresAt = this.tokenCache.expiresAt || 0;
            const expiresIn = Math.max(0, (expiresAt - now) / 1000);
            
            // Safe date handling
            let lastUpdated = null;
            if (this.tokenCache.lastUpdated) {
                try {
                    const date = new Date(this.tokenCache.lastUpdated);
                    if (!isNaN(date.getTime())) {
                        lastUpdated = date.toISOString();
                    }
                } catch (dateError) {
                    // Ignore date conversion errors
                }
            }
            
            return {
                hasToken: !!this.tokenCache.accessToken,
                isValid: now < expiresAt,
                expiresIn: Math.floor(expiresIn),
                environmentId: this.tokenCache.environmentId || null,
                region: this.tokenCache.region || null,
                lastUpdated
            };
        } catch (error) {
            // Return safe defaults if anything goes wrong
            return {
                hasToken: false,
                isValid: false,
                expiresIn: 0,
                environmentId: null,
                region: null,
                lastUpdated: null
            };
        }
    }
}

// Export a singleton instance
export const tokenService = new TokenService();

export default tokenService;
