/**
 * Population Service
 * 
 * Provides functionality for managing PingOne populations.
 * Handles CRUD operations, caching, and data transformation.
 * 
 * Features:
 * - Population CRUD operations
 * - Caching for performance
 * - Data validation
 * - Event notifications
 */

import Population from '../models/population.js';

/**
 * Population Service
 * 
 * Service for managing PingOne populations.
 */
class PopulationService {
    /**
     * Create a new PopulationService
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.apiClient - API client instance
     * @param {boolean} options.enableCache - Whether to enable caching
     * @param {number} options.cacheTTL - Cache time-to-live in milliseconds
     */
    constructor(options = {}) {
        const { 
            logger, 
            apiClient, 
            enableCache = true, 
            cacheTTL = 60000 // 1 minute
        } = options;
        
        // Initialize dependencies
        this.logger = logger || console;
        this.apiClient = apiClient;
        
        if (!this.apiClient) {
            throw new Error('API client is required');
        }
        
        // Cache configuration
        this.enableCache = enableCache;
        this.cacheTTL = cacheTTL;
        
        // Cache storage
        this.cache = {
            populations: null,
            populationsById: new Map(),
            lastFetch: 0
        };
        
        // Event listeners
        this.listeners = new Map();
    }

    /**
     * Get all populations
     * @param {boolean} forceRefresh - Whether to force a refresh from API
     * @returns {Promise<Array<Population>>} Array of Population instances
     */
    async getPopulations(forceRefresh = false) {
        // Check cache if enabled and not forcing refresh
        if (this.enableCache && !forceRefresh && this.cache.populations) {
            const now = Date.now();
            if (now - this.cache.lastFetch < this.cacheTTL) {
                this.logger.debug('Using cached populations');
                return this.cache.populations;
            }
        }
        
        try {
            this.logger.debug('Fetching populations from API');
            
            const response = await this.apiClient.getPopulations();
            
            // Transform API data to Population instances
            const populations = response._embedded?.populations 
                ? Population.fromApiDataArray(response._embedded.populations)
                : [];
            
            // Update cache
            this._updateCache(populations);
            
            return populations;
        } catch (error) {
            this.logger.error('Failed to get populations:', error.message);
            throw error;
        }
    }

    /**
     * Get a population by ID
     * @param {string} id - Population ID
     * @param {boolean} forceRefresh - Whether to force a refresh from API
     * @returns {Promise<Population|null>} Population instance or null if not found
     */
    async getPopulation(id, forceRefresh = false) {
        // Check cache if enabled and not forcing refresh
        if (this.enableCache && !forceRefresh && this.cache.populationsById.has(id)) {
            const now = Date.now();
            if (now - this.cache.lastFetch < this.cacheTTL) {
                this.logger.debug(`Using cached population: ${id}`);
                return this.cache.populationsById.get(id);
            }
        }
        
        try {
            this.logger.debug(`Fetching population from API: ${id}`);
            
            const response = await this.apiClient.getPopulation(id);
            
            // Transform API data to Population instance
            const population = Population.fromApiData(response);
            
            // Update cache
            this._updateCacheItem(population);
            
            return population;
        } catch (error) {
            this.logger.error(`Failed to get population ${id}:`, error.message);
            
            // Return null if not found
            if (error.message.includes('404')) {
                return null;
            }
            
            throw error;
        }
    }

    /**
     * Create a new population
     * @param {Population|Object} populationData - Population data
     * @returns {Promise<Population>} Created Population instance
     */
    async createPopulation(populationData) {
        try {
            // Convert to Population instance if not already
            const population = populationData instanceof Population 
                ? populationData 
                : new Population(populationData);
            
            // Validate population data
            const validation = population.validate();
            if (!validation.valid) {
                throw new Error(`Invalid population data: ${validation.errors.join(', ')}`);
            }
            
            this.logger.debug('Creating population:', population.name);
            
            // Convert to API format
            const apiData = population.toApiFormat();
            
            // Create population
            const response = await this.apiClient.createPopulation(apiData);
            
            // Transform API response to Population instance
            const createdPopulation = Population.fromApiData(response);
            
            // Update cache
            this._updateCacheItem(createdPopulation);
            
            // Notify listeners
            this._notifyListeners('create', createdPopulation);
            
            return createdPopulation;
        } catch (error) {
            this.logger.error('Failed to create population:', error.message);
            throw error;
        }
    }

    /**
     * Update a population
     * @param {string} id - Population ID
     * @param {Population|Object} populationData - Updated population data
     * @returns {Promise<Population>} Updated Population instance
     */
    async updatePopulation(id, populationData) {
        try {
            // Convert to Population instance if not already
            const population = populationData instanceof Population 
                ? populationData 
                : new Population({ id, ...populationData });
            
            // Validate population data
            const validation = population.validate();
            if (!validation.valid) {
                throw new Error(`Invalid population data: ${validation.errors.join(', ')}`);
            }
            
            this.logger.debug(`Updating population: ${id}`);
            
            // Convert to API format
            const apiData = population.toApiFormat();
            
            // Update population
            const response = await this.apiClient.updatePopulation(id, apiData);
            
            // Transform API response to Population instance
            const updatedPopulation = Population.fromApiData(response);
            
            // Update cache
            this._updateCacheItem(updatedPopulation);
            
            // Notify listeners
            this._notifyListeners('update', updatedPopulation);
            
            return updatedPopulation;
        } catch (error) {
            this.logger.error(`Failed to update population ${id}:`, error.message);
            throw error;
        }
    }

    /**
     * Delete a population
     * @param {string} id - Population ID
     * @returns {Promise<boolean>} Success status
     */
    async deletePopulation(id) {
        try {
            this.logger.debug(`Deleting population: ${id}`);
            
            // Delete population
            await this.apiClient.deletePopulation(id);
            
            // Remove from cache
            this._removeFromCache(id);
            
            // Notify listeners
            this._notifyListeners('delete', { id });
            
            return true;
        } catch (error) {
            this.logger.error(`Failed to delete population ${id}:`, error.message);
            throw error;
        }
    }

    /**
     * Get users for a population
     * @param {string} populationId - Population ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Users response
     */
    async getUsers(populationId, options = {}) {
        try {
            this.logger.debug(`Fetching users for population: ${populationId}`);
            
            const { limit = 100, filter, sortKey, sortOrder } = options;
            
            // Prepare query parameters
            const queryParams = {
                limit
            };
            
            if (filter) {
                queryParams.filter = filter;
            }
            
            if (sortKey) {
                queryParams.sortKey = sortKey;
                if (sortOrder) {
                    queryParams.sortOrder = sortOrder;
                }
            }
            
            // Get users
            return await this.apiClient.getUsers(populationId, queryParams);
        } catch (error) {
            this.logger.error(`Failed to get users for population ${populationId}:`, error.message);
            throw error;
        }
    }

    /**
     * Clear the population cache
     */
    clearCache() {
        this.cache.populations = null;
        this.cache.populationsById.clear();
        this.cache.lastFetch = 0;
        
        this.logger.debug('Population cache cleared');
    }

    /**
     * Add an event listener
     * @param {string} event - Event name ('create', 'update', 'delete', or '*' for all)
     * @param {Function} listener - Listener function
     * @returns {Function} Function to remove the listener
     */
    addEventListener(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event).add(listener);
        
        // Return function to remove listener
        return () => {
            if (this.listeners.has(event)) {
                this.listeners.get(event).delete(listener);
            }
        };
    }

    /**
     * Remove all listeners for an event
     * @param {string} event - Event name
     */
    removeEventListeners(event) {
        if (this.listeners.has(event)) {
            this.listeners.delete(event);
        }
    }

    /**
     * Remove all listeners
     */
    removeAllEventListeners() {
        this.listeners.clear();
    }

    /**
     * Update the cache with populations
     * @param {Array<Population>} populations - Array of Population instances
     * @private
     */
    _updateCache(populations) {
        this.cache.populations = populations;
        this.cache.lastFetch = Date.now();
        
        // Update by-ID cache
        for (const population of populations) {
            this.cache.populationsById.set(population.id, population);
        }
    }

    /**
     * Update a single item in the cache
     * @param {Population} population - Population instance
     * @private
     */
    _updateCacheItem(population) {
        this.cache.populationsById.set(population.id, population);
        
        // Update populations array if it exists
        if (this.cache.populations) {
            const index = this.cache.populations.findIndex(p => p.id === population.id);
            
            if (index >= 0) {
                this.cache.populations[index] = population;
            } else {
                this.cache.populations.push(population);
            }
        }
    }

    /**
     * Remove a population from the cache
     * @param {string} id - Population ID
     * @private
     */
    _removeFromCache(id) {
        this.cache.populationsById.delete(id);
        
        // Update populations array if it exists
        if (this.cache.populations) {
            this.cache.populations = this.cache.populations.filter(p => p.id !== id);
        }
    }

    /**
     * Notify listeners of an event
     * @param {string} event - Event name
     * @param {Population|Object} data - Event data
     * @private
     */
    _notifyListeners(event, data) {
        // Notify specific event listeners
        if (this.listeners.has(event)) {
            for (const listener of this.listeners.get(event)) {
                try {
                    listener(data);
                } catch (error) {
                    this.logger.warn(`Error in population listener for ${event}:`, error.message);
                }
            }
        }
        
        // Notify global listeners
        if (this.listeners.has('*')) {
            for (const listener of this.listeners.get('*')) {
                try {
                    listener(event, data);
                } catch (error) {
                    this.logger.warn('Error in global population listener:', error.message);
                }
            }
        }
    }
}

export default PopulationService;