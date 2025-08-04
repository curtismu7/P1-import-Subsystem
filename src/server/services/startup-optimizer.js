/**
 * Startup Optimizer Service
 * 
 * Handles critical startup operations including:
 * - Worker token acquisition and caching
 * - Population data pre-fetching and caching
 * - Health check initialization
 * - Performance monitoring setup
 * 
 * This service ensures the application starts with all necessary data
 * cached and ready, preventing frontend loading delays and API failures.
 */

import { createWinstonLogger } from '../../../server/winston-config.js';
import fs from 'fs/promises';
import path from 'path';

class StartupOptimizer {
    constructor() {
        this.logger = createWinstonLogger({
            service: 'startup-optimizer',
            env: process.env.NODE_ENV || 'development'
        });
        
        this.cache = {
            workerToken: null,
            tokenExpiry: null,
            populations: null,
            populationsLastFetched: null,
            healthStatus: 'initializing'
        };
        
        // Cache expiration times
        this.TOKEN_CACHE_DURATION = 55 * 60 * 1000; // 55 minutes (tokens expire in 60)
        this.POPULATION_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
        
        this.isInitialized = false;
        this.initializationPromise = null;
    }
    
    /**
     * Initialize all startup optimizations
     * This should be called during server startup
     * 
     * @returns {Promise<Object>} Initialization result with success status and metrics
     * @throws {Error} If initialization fails critically
     * 
     * DEBUG: Enhanced with detailed logging and performance metrics
     * TODO: Add retry logic for transient failures
     * TODO: Confirm usage of initializationPromise pattern for concurrency control
     * VERIFY: Ensure this is called only once during server startup
     */
    async initialize() {
        const functionName = 'StartupOptimizer.initialize';
        
        // DEBUG: Log initialization attempt
        this.logger.info(`${functionName} - Starting initialization`, {
            isInitialized: this.isInitialized,
            hasExistingPromise: !!this.initializationPromise,
            timestamp: new Date().toISOString()
        });
        
        // Prevent multiple concurrent initializations
        if (this.initializationPromise) {
            this.logger.debug(`${functionName} - Returning existing initialization promise`);
            return this.initializationPromise;
        }
        
        // Create and store the initialization promise
        this.initializationPromise = this._performInitialization();
        
        try {
            const result = await this.initializationPromise;
            
            // DEBUG: Log successful initialization
            this.logger.info(`${functionName} - Initialization completed successfully`, {
                result,
                duration: result.duration,
                timestamp: new Date().toISOString()
            });
            
            return result;
        } catch (error) {
            // DEBUG: Log initialization failure
            this.logger.error(`${functionName} - Initialization failed`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            
            // Reset the promise so initialization can be retried
            this.initializationPromise = null;
            throw error;
        }
    }
    
    /**
     * Perform the actual initialization process
     * Internal method with comprehensive error handling and logging
     * 
     * @returns {Promise<Object>} Detailed initialization result
     * @private
     * 
     * DEBUG: Enhanced with step-by-step logging and error recovery
     * TODO: Add configuration validation before attempting operations
     * VERIFY: Each step handles failures gracefully without breaking subsequent steps
     */
    async _performInitialization() {
        const functionName = 'StartupOptimizer._performInitialization';
        const startTime = Date.now();
        const initializationSteps = [];
        
        this.logger.info(`${functionName} - Starting application optimization`, {
            startTime: new Date(startTime).toISOString(),
            cacheStatus: this.cache.healthStatus
        });
        
        try {
            // Step 1: Load settings and validate configuration
            this.logger.debug(`${functionName} - Step 1: Loading settings`);
            const settingsStartTime = Date.now();
            
            const settings = await this._loadSettings();
            const settingsDuration = Date.now() - settingsStartTime;
            
            initializationSteps.push({
                step: 'load_settings',
                success: !!settings,
                duration: settingsDuration,
                details: settings ? 'Settings loaded successfully' : 'No settings found'
            });
            
            if (!settings) {
                this.logger.warn(`${functionName} - No settings found, skipping optimizations`, {
                    step: 'load_settings',
                    duration: settingsDuration
                });
                this.cache.healthStatus = 'degraded';
                
                return { 
                    success: false, 
                    reason: 'no_settings',
                    duration: Date.now() - startTime,
                    steps: initializationSteps
                };
            }
            
            // Step 2: Acquire and cache worker token
            this.logger.debug(`${functionName} - Step 2: Caching worker token`);
            const tokenStartTime = Date.now();
            
            try {
                await this._cacheWorkerToken(settings);
                const tokenDuration = Date.now() - tokenStartTime;
                
                initializationSteps.push({
                    step: 'cache_token',
                    success: true,
                    duration: tokenDuration,
                    details: 'Worker token cached successfully'
                });
                
                this.logger.debug(`${functionName} - Worker token cached`, {
                    duration: tokenDuration,
                    hasToken: !!this.cache.workerToken
                });
            } catch (error) {
                const tokenDuration = Date.now() - tokenStartTime;
                
                initializationSteps.push({
                    step: 'cache_token',
                    success: false,
                    duration: tokenDuration,
                    error: error.message,
                    details: 'Failed to cache worker token'
                });
                
                this.logger.warn(`${functionName} - Failed to cache worker token`, {
                    error: error.message,
                    duration: tokenDuration,
                    settings: {
                        hasEnvironmentId: !!settings.environmentId,
                        hasClientId: !!settings.apiClientId,
                        hasSecret: !!settings.apiSecret
                    }
                });
                // Continue with initialization even if token caching fails
            }
            
            // Step 3: Pre-fetch and cache population data
            this.logger.debug(`${functionName} - Step 3: Caching population data`);
            const populationStartTime = Date.now();
            
            try {
                await this._cachePopulations(settings);
                const populationDuration = Date.now() - populationStartTime;
                
                initializationSteps.push({
                    step: 'cache_populations',
                    success: true,
                    duration: populationDuration,
                    details: `Cached ${this.cache.populations?.length || 0} populations`
                });
                
                this.logger.debug(`${functionName} - Population data cached`, {
                    duration: populationDuration,
                    populationCount: this.cache.populations?.length || 0
                });
            } catch (error) {
                const populationDuration = Date.now() - populationStartTime;
                
                initializationSteps.push({
                    step: 'cache_populations',
                    success: false,
                    duration: populationDuration,
                    error: error.message,
                    details: 'Failed to cache population data'
                });
                
                this.logger.warn(`${functionName} - Failed to cache population data`, {
                    error: error.message,
                    duration: populationDuration,
                    hasToken: !!this.cache.workerToken
                });
                // Continue with initialization even if population caching fails
            }
            
            // Step 4: Initialize health monitoring
            this.logger.debug(`${functionName} - Step 4: Initializing health monitoring`);
            const healthStartTime = Date.now();
            
            try {
                this._initializeHealthMonitoring();
                const healthDuration = Date.now() - healthStartTime;
                
                initializationSteps.push({
                    step: 'health_monitoring',
                    success: true,
                    duration: healthDuration,
                    details: 'Health monitoring initialized'
                });
                
                this.logger.debug(`${functionName} - Health monitoring initialized`, {
                    duration: healthDuration
                });
            } catch (error) {
                const healthDuration = Date.now() - healthStartTime;
                
                initializationSteps.push({
                    step: 'health_monitoring',
                    success: false,
                    duration: healthDuration,
                    error: error.message,
                    details: 'Failed to initialize health monitoring'
                });
                
                this.logger.error(`${functionName} - Failed to initialize health monitoring`, {
                    error: error.message,
                    stack: error.stack,
                    duration: healthDuration
                });
                // Continue with initialization even if health monitoring fails
            }
            
            // Finalize initialization
            const totalDuration = Date.now() - startTime;
            this.cache.healthStatus = 'healthy';
            this.isInitialized = true;
            
            const result = {
                success: true,
                duration: totalDuration,
                tokenCached: !!this.cache.workerToken,
                populationsCached: !!this.cache.populations,
                steps: initializationSteps,
                summary: {
                    totalSteps: initializationSteps.length,
                    successfulSteps: initializationSteps.filter(s => s.success).length,
                    failedSteps: initializationSteps.filter(s => !s.success).length
                }
            };
            
            this.logger.info(`${functionName} - Application optimization completed successfully`, {
                ...result,
                endTime: new Date().toISOString()
            });
            
            return result;
            
        } catch (error) {
            const totalDuration = Date.now() - startTime;
            this.cache.healthStatus = 'error';
            
            const result = {
                success: false,
                error: error.message,
                duration: totalDuration,
                steps: initializationSteps,
                stack: error.stack
            };
            
            this.logger.error(`${functionName} - Application optimization failed critically`, {
                ...result,
                endTime: new Date().toISOString()
            });
            
            return result;
        }
    }
    
    /**
     * Load application settings from file
     */
    async _loadSettings() {
        try {
            const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
            const data = await fs.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(data);
            
            // Validate required settings - support both legacy and standardized keys
            const environmentId = settings.pingone_environment_id || settings.environmentId;
            const clientId = settings.pingone_client_id || settings.apiClientId;
            const clientSecret = settings.pingone_client_secret || settings.apiSecret;
            const region = settings.pingone_region || settings.region || 'NorthAmerica';
            
            if (!environmentId || !clientId || !clientSecret) {
                this.logger.warn('⚠️ Incomplete settings - missing required PingOne credentials', {
                    hasEnvironmentId: !!environmentId,
                    hasClientId: !!clientId,
                    hasClientSecret: !!clientSecret,
                    standardizedKeys: {
                        pingone_environment_id: !!settings.pingone_environment_id,
                        pingone_client_id: !!settings.pingone_client_id,
                        pingone_client_secret: !!settings.pingone_client_secret
                    },
                    legacyKeys: {
                        environmentId: !!settings.environmentId,
                        apiClientId: !!settings.apiClientId,
                        apiSecret: !!settings.apiSecret
                    }
                });
                return null;
            }
            
            // Return normalized settings object
            const normalizedSettings = {
                environmentId,
                apiClientId: clientId,
                apiSecret: clientSecret,
                region,
                // Keep original settings for backward compatibility
                ...settings
            };
            
            this.logger.info('📋 Settings loaded and normalized successfully', {
                hasEnvironmentId: !!normalizedSettings.environmentId,
                hasClientId: !!normalizedSettings.apiClientId,
                hasSecret: !!normalizedSettings.apiSecret,
                region: normalizedSettings.region,
                usingStandardizedKeys: !!(settings.pingone_environment_id && settings.pingone_client_id && settings.pingone_client_secret)
            });
            
            return normalizedSettings;
            
        } catch (error) {
            this.logger.warn('⚠️ Could not load settings file', { error: error.message });
            return null;
        }
    }

    /**
     * Acquire and cache worker token for immediate availability
     */
    async _cacheWorkerToken(settings) {
        try {
            this.logger.info('🔑 Acquiring worker token...');
            
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
            this.logger.debug('Using token URL:', { tokenUrl, region: settings.region });
            
            const tokenData = new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: settings.apiClientId,
                client_secret: settings.apiSecret
            });
            
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: tokenData
            });
            
            if (!response.ok) {
                throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
            }
            
            const tokenResult = await response.json();
            
            if (!tokenResult.access_token) {
                throw new Error('No access token received from PingOne');
            }
            
            // Cache token with expiry
            this.cache.workerToken = tokenResult.access_token;
            this.cache.tokenExpiry = Date.now() + (tokenResult.expires_in * 1000) - 60000; // 1 minute buffer
            
            this.logger.info('✅ Worker token cached successfully and stored in server-side memory.', {
                expiresIn: `${tokenResult.expires_in} seconds`,
                timeLeft: `${Math.round(tokenResult.expires_in / 60)} minutes`,
                storageLocation: 'Server-side cache (in-memory)'
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to cache worker token', {
                error: error.message,
                settings: {
                    hasEnvironmentId: !!settings.environmentId,
                    hasClientId: !!settings.apiClientId,
                    hasSecret: !!settings.apiSecret
                }
            });
            // Don't throw - allow app to start without cached token
        }
    }
    
    /**
     * Pre-fetch and cache population data
     */
    async _cachePopulations(settings) {
        try {
            if (!this.cache.workerToken) {
                this.logger.warn('⚠️ No worker token available - skipping population caching');
                return;
            }
            
            this.logger.info('👥 Pre-fetching population data...');
            
            // Get region-specific API domain
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
            
            const apiDomain = getApiDomain(settings.region || 'NorthAmerica');
            const populationsUrl = `https://${apiDomain}/v1/environments/${settings.environmentId}/populations?limit=100`;
            this.logger.debug('Using populations URL:', { populationsUrl, region: settings.region });
            
            const response = await fetch(populationsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.cache.workerToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Populations request failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data._embedded || !Array.isArray(data._embedded.populations)) {
                throw new Error('Invalid populations response format');
            }
            
            // Process and cache populations
            this.cache.populations = data._embedded.populations.map(pop => ({
                id: pop.id,
                name: pop.name,
                description: pop.description || '',
                userCount: pop.userCount || 0,
                createdAt: pop.createdAt,
                updatedAt: pop.updatedAt
            })).sort((a, b) => a.name.localeCompare(b.name));
            
            this.cache.populationsLastFetched = Date.now();
            
            this.logger.info('✅ Population data cached successfully', {
                count: this.cache.populations.length,
                populations: this.cache.populations.map(p => p.name)
            });
            
        } catch (error) {
            this.logger.error('❌ Failed to cache population data', {
                error: error.message,
                hasToken: !!this.cache.workerToken
            });
            // Don't throw - allow app to start without cached populations
        }
    }
    
    /**
     * Initialize health monitoring
     */
    _initializeHealthMonitoring() {
        // Set up periodic health checks
        setInterval(() => {
            this._performHealthCheck();
        }, 60000); // Every minute
        
        // Set up token refresh monitoring
        setInterval(() => {
            this._checkTokenExpiry();
        }, 300000); // Every 5 minutes
        
        this.logger.info('💓 Health monitoring initialized');
    }
    
    /**
     * Perform periodic health check
     */
    async _performHealthCheck() {
        try {
            const health = {
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                tokenValid: this._isTokenValid(),
                populationsCached: !!this.cache.populations,
                status: 'healthy'
            };
            
            // Check if token needs refresh
            if (!health.tokenValid && this.cache.workerToken) {
                health.status = 'degraded';
                this.logger.warn('⚠️ Worker token expired or expiring soon');
            }
            
            // Check if populations need refresh
            if (this.cache.populationsLastFetched && 
                Date.now() - this.cache.populationsLastFetched > this.POPULATION_CACHE_DURATION) {
                health.status = 'degraded';
                this.logger.warn('⚠️ Population cache is stale');
            }
            
            this.cache.healthStatus = health.status;
            
        } catch (error) {
            this.logger.error('❌ Health check failed', { error: error.message });
            this.cache.healthStatus = 'error';
        }
    }
    
    /**
     * Check if cached token is still valid
     */
    _isTokenValid() {
        return this.cache.workerToken && 
               this.cache.tokenExpiry && 
               Date.now() < this.cache.tokenExpiry;
    }
    
    /**
     * Check token expiry and refresh if needed
     */
    async _checkTokenExpiry() {
        if (!this._isTokenValid() && this.cache.workerToken) {
            this.logger.info('🔄 Token expired, attempting refresh...');
            
            try {
                const settings = await this._loadSettings();
                if (settings) {
                    await this._cacheWorkerToken(settings);
                }
            } catch (error) {
                this.logger.error('❌ Token refresh failed', { error: error.message });
            }
        }
    }
    
    /**
     * Get cached worker token
     */
    getCachedToken() {
        if (this._isTokenValid()) {
            return this.cache.workerToken;
        }
        return null;
    }
    
    /**
     * Get cached populations
     */
    getCachedPopulations() {
        if (this.cache.populations && 
            this.cache.populationsLastFetched &&
            Date.now() - this.cache.populationsLastFetched < this.POPULATION_CACHE_DURATION) {
            return this.cache.populations;
        }
        return null;
    }
    
    /**
     * Get health status
     */
    getHealthStatus() {
        return {
            status: this.cache.healthStatus,
            isInitialized: this.isInitialized,
            tokenValid: this._isTokenValid(),
            populationsCached: !!this.cache.populations,
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
    }
    
    /**
     * Force refresh of cached data
     */
    async refreshCache() {
        this.logger.info('🔄 Manual cache refresh requested');
        
        try {
            const settings = await this._loadSettings();
            if (settings) {
                await this._cacheWorkerToken(settings);
                await this._cachePopulations(settings);
            }
            
            return { success: true };
            
        } catch (error) {
            this.logger.error('❌ Cache refresh failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const startupOptimizer = new StartupOptimizer();

export default startupOptimizer;
export { StartupOptimizer };