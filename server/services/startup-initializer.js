/**
 * Startup Initializer Service
 * 
 * This service ensures that on server startup:
 * 1. A valid PingOne access token is obtained
 * 2. All populations are fetched and cached
 * 3. Data is saved to app-config.json for UI use
 * 
 * This eliminates 500 errors and ensures the UI has the data it needs.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to app-config.json
const APP_CONFIG_FILE = path.join(__dirname, '../../data/app-config.json');

class StartupInitializer {
    constructor() {
        this.logger = console;
        this.tokenManager = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the startup service
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.tokenManager - Token manager instance
     */
    initialize(options = {}) {
        this.logger = options.logger || console;
        this.tokenManager = options.tokenManager || this.tokenManager;
        
        this.logger.info('🚀 Startup Initializer Service initialized');
    }

    /**
     * Run startup initialization sequence
     * @returns {Promise<Object>} Initialization results
     */
    async runStartupInitialization() {
        if (this.isInitialized) {
            this.logger.info('✅ Startup initialization already completed');
            return { success: true, message: 'Already initialized' };
        }

        try {
            this.logger.info('🚀 Starting server startup initialization...');
            
            // Step 1: Ensure valid token
            const tokenResult = await this.ensureValidToken();
            if (!tokenResult.success) {
                this.logger.warn('⚠️ Token initialization failed, continuing with limited functionality');
            }

            // Step 2: Fetch and cache populations
            const populationsResult = await this.fetchAndCachePopulations();
            if (!populationsResult.success) {
                this.logger.warn('⚠️ Population initialization failed, continuing with limited functionality');
            }

            // Step 3: Save data to app-config.json
            await this.saveToAppConfig({
                token: tokenResult,
                populations: populationsResult
            });

            this.isInitialized = true;
            
            this.logger.info('✅ Startup initialization completed successfully', {
                tokenSuccess: tokenResult.success,
                populationsSuccess: populationsResult.success,
                populationsCount: populationsResult.populations?.length || 0
            });

            return {
                success: true,
                token: tokenResult,
                populations: populationsResult
            };

        } catch (error) {
            this.logger.error('❌ Startup initialization failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Ensure a valid token is available
     * @returns {Promise<Object>} Token result
     */
    async ensureValidToken() {
        try {
            if (!this.tokenManager) {
                this.logger.warn('⚠️ Token manager not available, skipping token initialization');
                return { success: false, message: 'Token manager not available' };
            }

            this.logger.info('🔑 Ensuring valid token is available...');
            
            // Try to get a valid token
            const token = await this.tokenManager.getAccessToken();
            if (token) {
                this.logger.info('✅ Valid token available');
                return { success: true, token: token };
            } else {
                this.logger.warn('⚠️ No valid token available');
                return { success: false, message: 'No valid token available' };
            }

        } catch (error) {
            this.logger.error('❌ Error ensuring valid token:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Fetch and cache populations
     * @returns {Promise<Object>} Populations result
     */
    async fetchAndCachePopulations() {
        try {
            if (!this.tokenManager) {
                this.logger.warn('⚠️ Token manager not available, skipping population fetching');
                return { success: false, message: 'Token manager not available' };
            }

            this.logger.info('🏘️ Fetching populations from PingOne API...');
            
            // Get access token for API calls
            const token = await this.tokenManager.getAccessToken();
            if (!token) {
                this.logger.warn('⚠️ No valid token available for population fetching');
                return { success: false, message: 'No valid token available' };
            }

            // Get environment ID and region
            const environmentId = await this.tokenManager.getEnvironmentId();
            const region = await this.tokenManager.getRegion() || 'NA';
            
            if (!environmentId) {
                this.logger.warn('⚠️ No environment ID available for population fetching');
                return { success: false, message: 'No environment ID available' };
            }

            // Determine API base URL by region
            const apiCode = this.normalizeRegion(region);
            const baseByRegion = {
                NA: 'https://api.pingone.com/v1',
                EU: 'https://api.eu.pingone.com/v1',
                CA: 'https://api.ca.pingone.com/v1',
                AP: 'https://api.apsoutheast.pingone.com/v1'
            };
            const baseUrl = baseByRegion[apiCode] || baseByRegion.NA;
            const url = `${baseUrl}/environments/${environmentId}/populations`;

            // Fetch populations from PingOne API
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error('❌ Failed to fetch populations from PingOne API:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                return { 
                    success: false, 
                    error: `HTTP ${response.status}: ${response.statusText}`,
                    details: errorText
                };
            }

            const data = await response.json();
            const populations = data._embedded?.populations || [];

            this.logger.info(`✅ Successfully fetched ${populations.length} populations from PingOne API`);

            return {
                success: true,
                populations: populations,
                total: populations.length,
                fetchedAt: new Date().toISOString(),
                region: apiCode
            };

        } catch (error) {
            this.logger.error('❌ Error fetching populations:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Save data to app-config.json
     * @param {Object} data - Data to save
     */
    async saveToAppConfig(data) {
        try {
            this.logger.info('💾 Saving startup data to app-config.json...');
            
            // Read existing config
            let config = {};
            try {
                const existingConfig = await fs.readFile(APP_CONFIG_FILE, 'utf8');
                config = JSON.parse(existingConfig);
            } catch (error) {
                this.logger.info('📄 No existing app-config.json found, creating new one');
            }

            // Update config with new data
            const updatedConfig = {
                ...config,
                lastUpdated: new Date().toISOString(),
                startupData: {
                    token: data.token,
                    populations: data.populations,
                    initializedAt: new Date().toISOString()
                }
            };

            // Save updated config
            await fs.writeFile(APP_CONFIG_FILE, JSON.stringify(updatedConfig, null, 2));
            
            this.logger.info('✅ Startup data saved to app-config.json successfully');

        } catch (error) {
            this.logger.error('❌ Error saving to app-config.json:', error);
        }
    }

    /**
     * Normalize region to two-letter codes
     * @param {string} region - Region string
     * @returns {string} Normalized region code
     */
    normalizeRegion(region) {
        if (!region) return 'NA';
        const map = {
            NA: 'NA', EU: 'EU', AP: 'AP', CA: 'CA',
            NorthAmerica: 'NA', 'North America': 'NA', US: 'NA', USA: 'NA',
            Europe: 'EU', 'EU Region': 'EU',
            AsiaPacific: 'AP', 'Asia Pacific': 'AP', APAC: 'AP', 'AP Region': 'AP',
            Canada: 'CA'
        };
        
        // Direct match
        if (map[region]) return map[region];
        
        // Case-insensitive, strip non-letters
        const key = String(region).toLowerCase().replace(/[^a-z]/g, '');
        const alt = {
            na: 'NA', northamerica: 'NA', us: 'NA', usa: 'NA',
            eu: 'EU', europe: 'EU', euregion: 'EU',
            ap: 'AP', apac: 'AP', asiapacific: 'AP', apregion: 'AP',
            ca: 'CA', canada: 'CA'
        };
        return alt[key] || 'NA';
    }
}

export default StartupInitializer;
