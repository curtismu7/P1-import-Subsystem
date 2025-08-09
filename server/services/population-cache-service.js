/**
 * Population Cache Service
 * 
 * This service manages caching of PingOne populations in settings.json during startup
 * to provide fast loading for the home page and other components.
 * 
 * Features:
 * - Startup population caching
 * - Background refresh mechanism
 * - Cache invalidation and refresh
 * - Fast retrieval for UI components
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to settings file
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

// Cache configuration
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const BACKGROUND_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

class PopulationCacheService {
    constructor() {
        this.logger = null;
        this.tokenManager = null;
        this.backgroundRefreshTimer = null;
        this.isRefreshing = false;
    }

    /**
     * Initialize the population cache service
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.tokenManager - Token manager instance
     */
    initialize(options = {}) {
        this.logger = options.logger || console;
        this.tokenManager = options.tokenManager;
        
        this.logger.info('🗃️ Population Cache Service initialized');
    }

    /**
     * Cache populations during server startup
     * @returns {Promise<boolean>} Success status
     */
    async cachePopulationsOnStartup() {
        if (!this.tokenManager) {
            this.logger.warn('⚠️ Token manager not available, skipping population caching');
            return false;
        }

        try {
            this.logger.info('🚀 Caching populations during startup...');
            
            // Check if we have valid credentials
            const environmentId = await this.tokenManager.getEnvironmentId();
            if (!environmentId) {
                this.logger.warn('⚠️ No environment ID configured, skipping population caching');
                return false;
            }

            // Get access token
            const token = await this.tokenManager.getAccessToken();
            if (!token) {
                this.logger.warn('⚠️ No valid token available, skipping population caching');
                return false;
            }

            // Fetch populations from PingOne API
            const populations = await this.fetchPopulationsFromAPI();
            if (!populations) {
                this.logger.warn('⚠️ Failed to fetch populations from API');
                return false;
            }

            // Cache populations in settings.json
            await this.savePopulationsToCache(populations);
            
            this.logger.info(`✅ Successfully cached ${populations.length} populations during startup`);
            
            // Start background refresh timer
            this.startBackgroundRefresh();
            
            return true;

        } catch (error) {
            this.logger.error('❌ Error caching populations during startup:', error);
            return false;
        }
    }

    /**
     * Fetch populations from PingOne API
     * @returns {Promise<Array|null>} Populations array or null on error
     */
    async fetchPopulationsFromAPI() {
        try {
            if (!this.tokenManager) {
                throw new Error('Token manager not available');
            }

            // Get required data from token manager
            const environmentId = await this.tokenManager.getEnvironmentId();
            const apiBaseUrl = this.tokenManager.getApiBaseUrl();
            const token = await this.tokenManager.getAccessToken();

            if (!environmentId || !apiBaseUrl || !token) {
                throw new Error('Missing required credentials or token');
            }

            // Fetch populations from PingOne API
            const populationsUrl = `${apiBaseUrl}/environments/${environmentId}/populations`;
            
            this.logger.debug('🔄 Fetching populations from PingOne API', { url: populationsUrl });

            const response = await fetch(populationsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const populations = data._embedded?.populations || [];

            // Format populations for caching
            const formattedPopulations = populations.map(population => ({
                id: population.id,
                name: population.name,
                description: population.description || '',
                userCount: population.userCount || 0
            }));

            this.logger.debug(`📦 Fetched ${formattedPopulations.length} populations from API`);
            
            return formattedPopulations;

        } catch (error) {
            this.logger.error('❌ Error fetching populations from API:', error);
            return null;
        }
    }

    /**
     * Save populations to cache in settings.json
     * @param {Array} populations - Populations to cache
     */
    async savePopulationsToCache(populations) {
        try {
            // Read current settings
            let settings = {};
            try {
                const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf8');
                settings = JSON.parse(settingsContent);
            } catch (error) {
                this.logger.warn('⚠️ Could not read existing settings, creating new cache');
            }

            // Add population cache data
            settings.populationCache = {
                populations: populations,
                cachedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + CACHE_EXPIRY_MS).toISOString(),
                count: populations.length
            };

            // Also write a flattened copy for easy client consumption
            settings.populations = populations;

            // Update last updated timestamp
            settings.lastUpdated = new Date().toISOString();

            // Write updated settings back to file
            await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            
            this.logger.debug('💾 Populations cached in settings.json', {
                count: populations.length,
                expiresAt: settings.populationCache.expiresAt
            });

        } catch (error) {
            this.logger.error('❌ Error saving populations to cache:', error);
            throw error;
        }
    }

    /**
     * Get cached populations from settings.json
     * @returns {Promise<Object|null>} Cache data or null if not available/expired
     */
    async getCachedPopulations() {
        try {
            const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf8');
            const settings = JSON.parse(settingsContent);

            const cache = settings.populationCache;
            if (!cache || !cache.populations) {
                this.logger.debug('📭 No population cache found');
                return null;
            }

            // Check if cache is expired
            const now = new Date();
            const expiresAt = new Date(cache.expiresAt);
            
            if (now > expiresAt) {
                this.logger.debug('⏰ Population cache expired', {
                    cachedAt: cache.cachedAt,
                    expiresAt: cache.expiresAt,
                    now: now.toISOString()
                });
                return null;
            }

            this.logger.debug('✅ Retrieved cached populations', {
                count: cache.count,
                cachedAt: cache.cachedAt,
                expiresAt: cache.expiresAt
            });

            return {
                populations: cache.populations,
                cachedAt: cache.cachedAt,
                expiresAt: cache.expiresAt,
                count: cache.count,
                isFromCache: true
            };

        } catch (error) {
            this.logger.debug('📭 Could not retrieve cached populations:', error.message);
            return null;
        }
    }

    /**
     * Refresh population cache in background
     * @returns {Promise<boolean>} Success status
     */
    async refreshCache() {
        if (this.isRefreshing) {
            this.logger.debug('🔄 Cache refresh already in progress, skipping');
            return false;
        }

        try {
            this.isRefreshing = true;
            this.logger.debug('🔄 Starting background population cache refresh...');

            const populations = await this.fetchPopulationsFromAPI();
            if (populations) {
                await this.savePopulationsToCache(populations);
                this.logger.info(`✅ Background cache refresh completed: ${populations.length} populations`);
                return true;
            } else {
                this.logger.warn('⚠️ Background cache refresh failed: could not fetch populations');
                return false;
            }

        } catch (error) {
            this.logger.error('❌ Error during background cache refresh:', error);
            return false;
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Start background refresh timer
     */
    startBackgroundRefresh() {
        if (this.backgroundRefreshTimer) {
            clearInterval(this.backgroundRefreshTimer);
        }

        this.backgroundRefreshTimer = setInterval(async () => {
            await this.refreshCache();
        }, BACKGROUND_REFRESH_INTERVAL);

        this.logger.info(`🔄 Background population cache refresh started (every ${BACKGROUND_REFRESH_INTERVAL / 60000} minutes)`);
    }

    /**
     * Stop background refresh timer
     */
    stopBackgroundRefresh() {
        if (this.backgroundRefreshTimer) {
            clearInterval(this.backgroundRefreshTimer);
            this.backgroundRefreshTimer = null;
            this.logger.info('⏹️ Background population cache refresh stopped');
        }
    }

    /**
     * Clear population cache
     */
    async clearCache() {
        try {
            const settingsContent = await fs.readFile(SETTINGS_FILE, 'utf8');
            const settings = JSON.parse(settingsContent);

            delete settings.populationCache;
            settings.lastUpdated = new Date().toISOString();

            await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            
            this.logger.info('🗑️ Population cache cleared');

        } catch (error) {
            this.logger.error('❌ Error clearing population cache:', error);
        }
    }

    /**
     * Get cache status and statistics
     * @returns {Promise<Object>} Cache status information
     */
    async getCacheStatus() {
        try {
            const cache = await this.getCachedPopulations();
            
            if (!cache) {
                return {
                    hasCachedData: false,
                    isExpired: true,
                    count: 0,
                    cachedAt: null,
                    expiresAt: null,
                    backgroundRefreshActive: !!this.backgroundRefreshTimer
                };
            }

            return {
                hasCachedData: true,
                isExpired: false,
                count: cache.count,
                cachedAt: cache.cachedAt,
                expiresAt: cache.expiresAt,
                backgroundRefreshActive: !!this.backgroundRefreshTimer,
                isRefreshing: this.isRefreshing
            };

        } catch (error) {
            this.logger.error('❌ Error getting cache status:', error);
            return {
                hasCachedData: false,
                isExpired: true,
                count: 0,
                cachedAt: null,
                expiresAt: null,
                backgroundRefreshActive: !!this.backgroundRefreshTimer,
                error: error.message
            };
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopBackgroundRefresh();
        this.logger.info('🧽 Population Cache Service cleaned up');
    }
}

// Create singleton instance
const populationCacheService = new PopulationCacheService();

export { populationCacheService, PopulationCacheService };
