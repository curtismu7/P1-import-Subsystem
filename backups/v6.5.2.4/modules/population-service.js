/**
 * PopulationService - Centralized service for all population-related API interactions
 * 
 * This service provides a unified interface for fetching populations, retrieving individual
 * populations by ID, populating UI dropdowns, and managing population data caching.
 * 
 * Features:
 * - In-memory caching of population data for improved performance
 * - Automatic population sorting by name for consistent UI display
 * - Graceful error handling with meaningful messages
 * - Integration with existing authentication and API client systems
 * 
 * Usage:
 * ```javascript
 * // Create an instance with dependencies
 * const populationService = new PopulationService(
 *   apiFactory.getPingOneClient(),
 *   tokenManager,
 *   logger
 * );
 * 
 * // Get all populations (uses cache if available)
 * const populations = await populationService.getPopulations();
 * 
 * // Get a specific population by ID
 * const population = await populationService.getPopulationById('populationId');
 * 
 * // Populate a dropdown with population data
 * await populationService.populateDropdown('dropdown-element-id');
 * 
 * // Clear the cache to force fresh data on next request
 * populationService.clearCache();
 * ```
 */

class PopulationService {
    /**
     * Create a new PopulationService instance
     * @param {Object} apiClient - API client for making requests to PingOne API
     * @param {Object} tokenManager - Token manager for authentication
     * @param {Object} logger - Logger for logging messages
     */
    constructor(apiClient, tokenManager, logger, eventBus) {
        // Validate required dependencies
        if (!apiClient) {
            throw new Error('API client is required for PopulationService');
        }

        this.apiClient = apiClient;
        this.tokenManager = tokenManager || null;
        this.logger = logger || console;
        this.eventBus = eventBus;
        
        // Initialize cache
        this.cache = {
            populations: {
                all: null,
                byId: {}
            },
            lastFetched: 0
        };
        
        // Cache expiration time (15 minutes)
        this.cacheExpirationTime = 15 * 60 * 1000;
        
        // Bind methods to ensure correct 'this' context
        this.getPopulations = this.getPopulations.bind(this);
        this.getPopulationById = this.getPopulationById.bind(this);
        this.populateDropdown = this.populateDropdown.bind(this);
        this.clearCache = this.clearCache.bind(this);
        
        this.logger.info('PopulationService initialized');
    }

    /**
     * Get all populations from PingOne API
     * @param {Object} options - Query options for the API call
     * @param {boolean} forceRefresh - Whether to bypass cache and force a fresh API call
     * @returns {Promise<Array>} Array of population objects
     */
    async getPopulations(options = {}, forceRefresh = false) {
        try {
            // Check if we have cached data and it's not expired
            const now = Date.now();
            const cacheIsValid = this.cache.populations.all && 
                                (now - this.cache.lastFetched) < this.cacheExpirationTime;
            
            // Use cache if available and not forcing refresh
            if (cacheIsValid && !forceRefresh) {
                this.logger.debug('Using cached populations data');
                return this.cache.populations.all;
            }
            
            // Log API call
            this.logger.info('Fetching populations from API', { forceRefresh });
            
            // Make API call to get populations
            const response = await this.apiClient.getPopulations(options);
            
            // Check if response is valid
            if (!response || !response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Failed to fetch populations: ${response.status} ${errorText}`);
            }
            
            // Parse response
            const data = await response.json();
            
            // Check if data has expected structure
            if (!data || !data._embedded || !Array.isArray(data._embedded.populations)) {
                throw new Error('Invalid response format from populations API');
            }
            
            // Extract populations from response
            const populations = data._embedded.populations.map(pop => ({
                id: pop.id,
                name: pop.name,
                description: pop.description || '',
                userCount: pop.userCount || 0,
                createdAt: pop.createdAt,
                updatedAt: pop.updatedAt
            }));
            
            // Sort populations by name
            const sortedPopulations = this._sortPopulations(populations);
            
            // Update cache
            this.cache.populations.all = sortedPopulations;
            this.cache.lastFetched = now;
            
            // Also update the byId cache
            sortedPopulations.forEach(pop => {
                this.cache.populations.byId[pop.id] = pop;
            });
            
            // Emit population change event
            if (this.eventBus) {
                this.eventBus.emit('populationsChanged', {
                    populations: sortedPopulations,
                    count: sortedPopulations.length
                });
            }
            
            this.logger.info(`Successfully fetched ${sortedPopulations.length} populations`);
            
            return sortedPopulations;
        } catch (error) {
            return this._handleApiError(error, 'fetching populations');
        }
    }

    /**
     * Get a specific population by ID
     * @param {string} populationId - ID of the population to fetch
     * @param {boolean} forceRefresh - Whether to bypass cache and force a fresh API call
     * @returns {Promise<Object>} Population object
     */
    async getPopulationById(populationId, forceRefresh = false) {
        try {
            if (!populationId) {
                throw new Error('Population ID is required');
            }
            
            // Check if we have this population in cache
            if (!forceRefresh && this.cache.populations.byId[populationId]) {
                this.logger.debug(`Using cached population data for ID: ${populationId}`);
                return this.cache.populations.byId[populationId];
            }
            
            // If we have all populations cached and not forcing refresh, find in cache
            const now = Date.now();
            const cacheIsValid = this.cache.populations.all && 
                                (now - this.cache.lastFetched) < this.cacheExpirationTime;
            
            if (cacheIsValid && !forceRefresh) {
                const population = this.cache.populations.all.find(p => p.id === populationId);
                if (population) {
                    // Update the byId cache
                    this.cache.populations.byId[populationId] = population;
                    return population;
                }
            }
            
            // If not in cache or forcing refresh, fetch from API
            this.logger.info(`Fetching population with ID: ${populationId}`);
            
            // Make API call to get specific population
            const environmentId = this.apiClient.settings?.environmentId;
            if (!environmentId) {
                throw new Error('Environment ID is not configured');
            }
            
            const endpoint = `/environments/${environmentId}/populations/${populationId}`;
            const response = await this.apiClient.request(endpoint, { method: 'GET' });
            
            // Check if response is valid
            if (!response || !response.ok) {
                if (response.status === 404) {
                    throw new Error(`Population with ID ${populationId} not found`);
                }
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Failed to fetch population: ${response.status} ${errorText}`);
            }
            
            // Parse response
            const population = await response.json();
            
            // Format population data
            const formattedPopulation = {
                id: population.id,
                name: population.name,
                description: population.description || '',
                userCount: population.userCount || 0,
                createdAt: population.createdAt,
                updatedAt: population.updatedAt
            };
            
            // Update cache
            this.cache.populations.byId[populationId] = formattedPopulation;
            
            // If we have all populations cached, update that entry too
            if (this.cache.populations.all) {
                const index = this.cache.populations.all.findIndex(p => p.id === populationId);
                if (index >= 0) {
                    this.cache.populations.all[index] = formattedPopulation;
                } else {
                    this.cache.populations.all.push(formattedPopulation);
                    this.cache.populations.all = this._sortPopulations(this.cache.populations.all);
                }
            }
            
            this.logger.info(`Successfully fetched population with ID: ${populationId}`);
            
            return formattedPopulation;
        } catch (error) {
            return this._handleApiError(error, `fetching population with ID ${populationId}`);
        }
    }

    /**
     * Populate a dropdown element with population data
     * @param {string} dropdownId - ID of the dropdown element to populate
     * @param {Object} options - Options for populating the dropdown
     * @param {boolean} options.includeEmpty - Whether to include an empty option
     * @param {string} options.emptyText - Text for the empty option
     * @param {string} options.selectedId - ID of the population to select
     * @returns {Promise<boolean>} True if successful, false otherwise
     */
    async populateDropdown(dropdownId, options = {}) {
        try {
            if (!dropdownId) {
                throw new Error('Dropdown ID is required');
            }
            
            // Get the dropdown element
            const dropdown = document.getElementById(dropdownId);
            if (!dropdown) {
                throw new Error(`Dropdown element with ID "${dropdownId}" not found`);
            }
            
            // Set dropdown to disabled while loading
            dropdown.disabled = true;
            dropdown.innerHTML = '<option value="">Loading populations...</option>';
            
            // Get populations
            const populations = await this.getPopulations();
            
            // Clear dropdown
            dropdown.innerHTML = '';
            
            // Add empty option if requested
            if (options.includeEmpty !== false) {
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = options.emptyText || 'Select a population';
                dropdown.appendChild(emptyOption);
            }
            
            // Add population options
            populations.forEach(population => {
                const option = document.createElement('option');
                option.value = population.id;
                option.textContent = this._formatPopulationForDisplay(population);
                dropdown.appendChild(option);
            });
            
            // Select population if specified
            if (options.selectedId) {
                dropdown.value = options.selectedId;
            }
            
            // Enable dropdown
            dropdown.disabled = false;
            
            this.logger.info(`Successfully populated dropdown ${dropdownId} with ${populations.length} populations`);
            
            return true;
        } catch (error) {
            // Try to re-enable the dropdown if it exists
            try {
                const dropdown = document.getElementById(dropdownId);
                if (dropdown) {
                    dropdown.disabled = false;
                    dropdown.innerHTML = '<option value="">Error loading populations</option>';
                }
            } catch (e) {
                // Ignore errors in error handling
            }
            
            return this._handleApiError(error, `populating dropdown ${dropdownId}`);
        }
    }

    /**
     * Clear the population cache
     * @param {string} populationId - Optional ID of specific population to clear from cache
     */
    clearCache(populationId = null) {
        if (populationId) {
            // Clear specific population from cache
            if (this.cache.populations.byId[populationId]) {
                delete this.cache.populations.byId[populationId];
                this.logger.debug(`Cleared population ${populationId} from cache`);
            }
            
            // Also remove from all populations if present
            if (this.cache.populations.all) {
                this.cache.populations.all = this.cache.populations.all.filter(p => p.id !== populationId);
            }
        } else {
            // Clear entire cache
            this.cache = {
                populations: {
                    all: null,
                    byId: {}
                },
                lastFetched: 0
            };
            this.logger.debug('Cleared entire population cache');
        }
    }

    /**
     * Handle API errors with consistent formatting
     * @param {Error} error - The error object
     * @param {string} operation - Description of the operation that failed
     * @returns {Promise<never>} Rejected promise with formatted error
     * @private
     */
    _handleApiError(error, operation) {
        const errorMessage = `Error ${operation}: ${error.message}`;
        this.logger.error(errorMessage, { error });
        
        // Create a new error with the formatted message
        const formattedError = new Error(errorMessage);
        formattedError.originalError = error;
        formattedError.operation = operation;
        
        // Reject with the formatted error
        return Promise.reject(formattedError);
    }

    /**
     * Format a population object for display in a dropdown
     * @param {Object} population - Population object
     * @returns {string} Formatted population name
     * @private
     */
    _formatPopulationForDisplay(population) {
        if (!population) return '';
        
        // If population has a user count, include it in the display
        if (population.userCount !== undefined) {
            return `${population.name} (${population.userCount} users)`;
        }
        
        return population.name;
    }

    /**
     * Sort populations by name
     * @param {Array} populations - Array of population objects
     * @returns {Array} Sorted array of population objects
     * @private
     */
    _sortPopulations(populations) {
        if (!Array.isArray(populations)) return [];
        
        return [...populations].sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }
}

// Export the PopulationService class
export default PopulationService;