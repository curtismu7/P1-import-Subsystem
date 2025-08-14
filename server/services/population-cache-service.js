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
        
        if (this.logger && this.logger.info) {
            this.logger.info('🗃️ Population Cache Service initialized');
        } else {
            console.log('🗃️ Population Cache Service initialized (using console fallback)');
        }
    }

    /**
     * Cache populations during server startup
     * @returns {Promise<boolean>} Success status
     */
    async cachePopulationsOnStartup() {
        if (!this.tokenManager) {
            if (this.logger && this.logger.warn) {
                this.logger.warn('⚠️ Token manager not available, skipping population caching');
            } else {
                console.warn('⚠️ Token manager not available, skipping population caching');
            }
            return false;
        }

        try {
            if (this.logger && this.logger.info) {
                this.logger.info('🚀 Caching populations during startup...');
            } else {
                console.log('🚀 Caching populations during startup...');
            }
            
            // Check if we have valid credentials
            const environmentId = await this.tokenManager.getEnvironmentId();
            if (!environmentId) {
                if (this.logger && this.logger.warn) {
                    this.logger.warn('⚠️ No environment ID configured, skipping population caching');
                } else {
                    console.warn('⚠️ No environment ID configured, skipping population caching');
                }
                return false;
            }

            // Get access token
            const token = await this.tokenManager.getAccessToken();
            if (!token) {
                if (this.logger && this.logger.warn) {
                    this.logger.warn('⚠️ No valid token available, skipping population caching');
                } else {
                    console.warn('⚠️ No valid token available, skipping population caching');
                }
                return false;
            }

            // Fetch populations from PingOne API
            const populations = await this.fetchPopulationsFromAPI();
            if (!populations) {
                if (this.logger && this.logger.warn) {
                    this.logger.warn('⚠️ Failed to fetch populations from API');
                } else {
                    console.warn('⚠️ Failed to fetch populations from API');
                }
                return false;
            }

            // Cache populations in settings.json
            await this.savePopulationsToCache(populations);
            
            if (this.logger && this.logger.info) {
                this.logger.info(`✅ Successfully cached ${populations.length} populations during startup`);
            } else {
                console.log(`✅ Successfully cached ${populations.length} populations during startup`);
            }
            
            // Start background refresh timer
            this.startBackgroundRefresh();
            
            return true;

        } catch (error) {
            if (this.logger && this.logger.error) {
                this.logger.error('❌ Error caching populations during startup:', error);
            } else {
                console.error('❌ Error caching populations during startup:', error);
            }
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
            
            if (this.logger && this.logger.debug) {
                this.logger.debug('🔄 Fetching populations from PingOne API', { url: populationsUrl });
            } else {
                console.log('🔄 Fetching populations from PingOne API:', populationsUrl);
            }

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

            if (this.logger && this.logger.debug) {
                this.logger.debug(`📦 Fetched ${formattedPopulations.length} populations from API`);
            } else {
                console.log(`📦 Fetched ${formattedPopulations.length} populations from API`);
            }
            
            return formattedPopulations;

        } catch (error) {
            if (this.logger && this.logger.error) {
                this.logger.error('❌ Error fetching populations from API:', error);
            } else {
                console.error('❌ Error fetching populations from API:', error);
            }
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
                if (this.logger && this.logger.warn) {
                    this.logger.warn('⚠️ Could not read existing settings, creating new cache');
                } else {
                    console.warn('⚠️ Could not read existing settings, creating new cache');
                }
            }

            // Add population cache data (only populationCache, remove duplicate populations array)
            settings.populationCache = {
                populations: populations,
                cachedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + CACHE_EXPIRY_MS).toISOString(),
                count: populations.length
            };

            // Remove duplicate populations array if it exists
            if (settings.populations) {
                delete settings.populations;
            }

            // Update last updated timestamp
            settings.lastUpdated = new Date().toISOString();

            // Write updated settings back to file
            await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            
            if (this.logger && this.logger.debug) {
                this.logger.debug('💾 Populations cached in settings.json', {
                    count: populations.length,
                    expiresAt: settings.populationCache.expiresAt
                });
            } else {
                console.log('💾 Populations cached in settings.json:', {
                    count: populations.length,
                    expiresAt: settings.populationCache.expiresAt
                });
            }

        } catch (error) {
            if (this.logger && this.logger.error) {
                this.logger.error('❌ Error saving populations to cache:', error);
            } else {
                console.error('❌ Error saving populations to cache:', error);
            }
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
                if (this.logger && this.logger.debug) {
                    this.logger.debug('📭 No population cache found');
                } else {
                    console.log('📭 No population cache found');
                }
                return null;
            }

            // Check if cache is expired
            const now = new Date();
            const expiresAt = new Date(cache.expiresAt);
            
            if (now > expiresAt) {
                if (this.logger && this.logger.debug) {
                    this.logger.debug('⏰ Population cache expired', {
                        cachedAt: cache.cachedAt,
                        expiresAt: cache.expiresAt,
                        now: now.toISOString()
                    });
                } else {
                    console.log('⏰ Population cache expired:', {
                        cachedAt: cache.cachedAt,
                        expiresAt: cache.expiresAt,
                        now: now.toISOString()
                    });
                }
                return null;
            }

            if (this.logger && this.logger.debug) {
                this.logger.debug('✅ Retrieved cached populations', {
                    count: cache.count,
                    cachedAt: cache.cachedAt,
                    expiresAt: cache.expiresAt
                });
            } else {
                console.log('✅ Retrieved cached populations:', {
                    count: cache.count,
                    cachedAt: cache.cachedAt,
                    expiresAt: cache.expiresAt
                });
            }

            return {
                populations: cache.populations,
                cachedAt: cache.cachedAt,
                expiresAt: cache.expiresAt,
                count: cache.count,
                isFromCache: true
            };

        } catch (error) {
            if (this.logger && this.logger.debug) {
                this.logger.debug('📭 Could not retrieve cached populations:', error.message);
            } else {
                console.log('📭 Could not retrieve cached populations:', error.message);
            }
            return null;
        }
    }

    /**
     * Refresh population cache in background
     * @returns {Promise<boolean>} Success status
     */
    async refreshCache() {
        if (this.isRefreshing) {
            if (this.logger && this.logger.debug) {
                this.logger.debug('🔄 Cache refresh already in progress, skipping');
            } else {
                console.log('🔄 Cache refresh already in progress, skipping');
            }
            return false;
        }

        try {
            this.isRefreshing = true;
            if (this.logger && this.logger.debug) {
                this.logger.debug('🔄 Starting background population cache refresh...');
            } else {
                console.log('🔄 Starting background population cache refresh...');
            }

            const populations = await this.fetchPopulationsFromAPI();
            if (populations) {
                await this.savePopulationsToCache(populations);
                if (this.logger && this.logger.info) {
                    this.logger.info(`✅ Background cache refresh completed: ${populations.length} populations`);
                } else {
                    console.log(`✅ Background cache refresh completed: ${populations.length} populations`);
                }
                return true;
            } else {
                if (this.logger && this.logger.warn) {
                    this.logger.warn('⚠️ Background cache refresh failed: could not fetch populations');
                } else {
                    console.warn('⚠️ Background cache refresh failed: could not fetch populations');
                }
                return false;
            }

        } catch (error) {
            if (this.logger && this.logger.error) {
                this.logger.error('❌ Error during background cache refresh:', error);
            } else {
                console.error('❌ Error during background cache refresh:', error);
            }
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

                    if (this.logger) {
                this.logger.info(`🔄 Background population cache refresh started (every ${BACKGROUND_REFRESH_INTERVAL / 60000} minutes)`);
            } else {
                console.log(`🔄 Background population cache refresh started (every ${BACKGROUND_REFRESH_INTERVAL / 60000} minutes) (no logger)`);
            }
    }

    /**
     * Stop background refresh timer
     */
    stopBackgroundRefresh() {
        if (this.backgroundRefreshTimer) {
            clearInterval(this.backgroundRefreshTimer);
            this.backgroundRefreshTimer = null;
            if (this.logger) {
                this.logger.info('⏹️ Background population cache refresh stopped');
            } else {
                console.log('⏹️ Background population cache refresh stopped (no logger)');
            }
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
            // Also remove duplicate populations array if it exists
            if (settings.populations) {
                delete settings.populations;
            }
            settings.lastUpdated = new Date().toISOString();

            await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            
            if (this.logger) {
                this.logger.info('🗑️ Population cache cleared');
            } else {
                console.log('🗑️ Population cache cleared (no logger)');
            }

        } catch (error) {
            if (this.logger) {
                this.logger.error('❌ Error clearing population cache:', error);
            } else {
                console.error('❌ Error clearing population cache:', error);
            }
            throw error;
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
            if (this.logger) {
                this.logger.error('❌ Error getting cache status:', error);
            } else {
                console.error('❌ Error getting cache status:', error);
            }
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
        if (this.logger) {
            this.logger.info('🧽 Population Cache Service cleaned up');
        } else {
            console.log('🧽 Population Cache Service cleaned up (no logger)');
        }
    }
}

// Create singleton instance
const populationCacheService = new PopulationCacheService();

export { populationCacheService, PopulationCacheService };
