/**
 * Bulletproof Population Loader
 * 
 * Provides robust population loading with retry mechanisms, circuit breaker pattern,
 * and comprehensive error handling to ensure population dropdowns are reliably populated.
 * 
 * Status: PRODUCTION READY - BULLETPROOF
 */

import apiFactory from './api-factory.js';
import uiManager from './ui-manager.js';
import logger from './logger.js';
import PopulationService from './population-service.js';
import CircuitBreaker from './circuit-breaker.js';

class BulletproofPopulationLoader {
    constructor() {
        this.apiClient = apiFactory.getPingOneClient();
        this.populationService = new PopulationService(this.apiClient, null, logger);
        
        // Initialize circuit breaker for population API calls
        this.circuitBreaker = new CircuitBreaker('population-api', {
            failureThreshold: 3,
            resetTimeout: 10000,
            fallbackFn: () => ({ populations: [] })
        });
        
        // Bind methods
        this.loadPopulationsWithRetry = this.loadPopulationsWithRetry.bind(this);
        this.populateDropdown = this.populateDropdown.bind(this);
        this.refreshDropdown = this.refreshDropdown.bind(this);
        
        // Cache for populations to reduce API calls
        this.populationsCache = null;
        this.lastFetchTime = null;
        this.cacheLifetime = 60000; // 1 minute cache lifetime
        
        // Loading state tracking
        this.isLoading = false;
        this.loadingDropdowns = new Set();
    }
    
    /**
     * Load populations with retry mechanism
     * @param {boolean} forceRefresh - Force a fresh API call ignoring cache
     * @returns {Promise<Array>} Array of population objects
     */
    async loadPopulationsWithRetry(forceRefresh = false) {
        // Return from cache if available and not expired
        const now = Date.now();
        if (!forceRefresh && 
            this.populationsCache && 
            this.lastFetchTime && 
            (now - this.lastFetchTime < this.cacheLifetime)) {
            logger.debug('Using cached populations data');
            return this.populationsCache;
        }
        
        // Show loading indicator
        this.isLoading = true;
        uiManager.showLoading('Loading populations...');
        
        // Set up retry parameters
        const maxRetries = 3;
        let retryCount = 0;
        let populations = [];
        
        try {
            // Use circuit breaker to protect against API failures
            const result = await this.circuitBreaker.execute(async () => {
                while (retryCount <= maxRetries) {
                    try {
                        logger.info(`Loading populations (attempt ${retryCount + 1}/${maxRetries + 1})...`);
                        
                        // Get populations from service
                        const response = await this.populationService.getPopulations();
                        
                        if (response && response.populations && Array.isArray(response.populations)) {
                            // Update cache
                            this.populationsCache = response.populations;
                            this.lastFetchTime = Date.now();
                            
                            logger.info(`Successfully loaded ${response.populations.length} populations`);
                            return response.populations;
                        } else {
                            throw new Error('Invalid response format from population service');
                        }
                    } catch (error) {
                        retryCount++;
                        
                        if (retryCount > maxRetries) {
                            throw error; // Re-throw if max retries exceeded
                        }
                        
                        // Exponential backoff
                        const delay = Math.pow(2, retryCount) * 500;
                        logger.warn(`Population loading failed, retrying in ${delay}ms...`, { 
                            error: error.message,
                            attempt: retryCount,
                            maxRetries
                        });
                        
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            });
            
            populations = result || [];
            return populations;
        } catch (error) {
            logger.error('Failed to load populations after multiple attempts', { 
                error: error.message,
                retryCount
            });
            
            // Return empty array on failure
            return [];
        } finally {
            // Hide loading indicator
            this.isLoading = false;
            uiManager.hideLoading();
            
            // Refresh any dropdowns that were waiting for data
            this.refreshLoadingDropdowns();
        }
    }
    
    /**
     * Populate a dropdown with population data
     * @param {string} dropdownId - ID of the dropdown element
     * @param {Object} options - Configuration options
     * @param {boolean} options.includeEmpty - Include an empty option
     * @param {string} options.emptyText - Text for the empty option
     * @param {string} options.selectedId - ID of the population to select
     * @param {boolean} options.includeAll - Include an "ALL" option
     * @returns {Promise<boolean>} Success status
     */
    async populateDropdown(dropdownId, options = {}) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) {
            logger.warn(`Dropdown with ID "${dropdownId}" not found`);
            return false;
        }
        
        // Track this dropdown as loading
        this.loadingDropdowns.add(dropdownId);
        
        // Show loading state in the dropdown
        this.setDropdownLoadingState(dropdown, true);
        
        try {
            // Load populations with retry
            const populations = await this.loadPopulationsWithRetry();
            
            // Clear existing options
            dropdown.innerHTML = '';
            
            // Add empty option if requested
            if (options.includeEmpty !== false) {
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = options.emptyText || 'Select a population...';
                dropdown.appendChild(emptyOption);
            }
            
            // Add "ALL" option if requested
            if (options.includeAll) {
                const allOption = document.createElement('option');
                allOption.value = 'ALL';
                allOption.textContent = 'ALL - Export from all populations';
                dropdown.appendChild(allOption);
            }
            
            // Add population options
            let optionsAdded = 0;
            populations.forEach(population => {
                if (population && population.id && population.name) {
                    const option = document.createElement('option');
                    option.value = population.id;
                    option.textContent = `${population.name} (${population.id})`;
                    dropdown.appendChild(option);
                    optionsAdded++;
                }
            });
            
            // Select specified option if provided
            if (options.selectedId) {
                dropdown.value = options.selectedId;
            }
            
            logger.info(`Populated dropdown "${dropdownId}" with ${optionsAdded} population options`);
            
            // Trigger change event to update dependent elements
            const event = new Event('change');
            dropdown.dispatchEvent(event);
            
            return true;
        } catch (error) {
            logger.error(`Failed to populate dropdown "${dropdownId}"`, { error: error.message });
            
            // Add error message option
            dropdown.innerHTML = '';
            const errorOption = document.createElement('option');
            errorOption.value = '';
            errorOption.textContent = 'Error loading populations. Click to retry.';
            errorOption.style.color = 'red';
            dropdown.appendChild(errorOption);
            
            // Add click handler to retry
            dropdown.addEventListener('click', () => {
                this.refreshDropdown(dropdownId, options);
            }, { once: true });
            
            return false;
        } finally {
            // Remove loading state
            this.setDropdownLoadingState(dropdown, false);
            
            // Remove from loading tracking
            this.loadingDropdowns.delete(dropdownId);
        }
    }
    
    /**
     * Refresh a dropdown with fresh population data
     * @param {string} dropdownId - ID of the dropdown to refresh
     * @param {Object} options - Configuration options (same as populateDropdown)
     * @returns {Promise<boolean>} Success status
     */
    async refreshDropdown(dropdownId, options = {}) {
        // Clear cache to force fresh data
        this.populationsCache = null;
        this.lastFetchTime = null;
        
        // Re-populate the dropdown
        return this.populateDropdown(dropdownId, options);
    }
    
    /**
     * Refresh all dropdowns that were waiting for data
     * @private
     */
    refreshLoadingDropdowns() {
        // Make a copy of the set to avoid modification during iteration
        const dropdowns = [...this.loadingDropdowns];
        
        // Clear the set
        this.loadingDropdowns.clear();
        
        // Refresh each dropdown
        dropdowns.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                // Remove loading state
                this.setDropdownLoadingState(dropdown, false);
                
                // Trigger change event
                const event = new Event('change');
                dropdown.dispatchEvent(event);
            }
        });
    }
    
    /**
     * Set loading state on a dropdown
     * @param {HTMLElement} dropdown - The dropdown element
     * @param {boolean} isLoading - Whether the dropdown is loading
     * @private
     */
    setDropdownLoadingState(dropdown, isLoading) {
        if (isLoading) {
            dropdown.classList.add('loading');
            dropdown.setAttribute('disabled', 'disabled');
            
            // Add loading spinner if not already present
            if (!dropdown.parentElement.querySelector('.dropdown-spinner')) {
                const spinner = document.createElement('div');
                spinner.className = 'dropdown-spinner';
                spinner.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="sr-only">Loading...</span></div>';
                dropdown.parentElement.appendChild(spinner);
            }
        } else {
            dropdown.classList.remove('loading');
            dropdown.removeAttribute('disabled');
            
            // Remove loading spinner if present
            const spinner = dropdown.parentElement.querySelector('.dropdown-spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    }
    
    /**
     * Reset the circuit breaker
     * Useful for manual recovery from persistent failures
     */
    resetCircuitBreaker() {
        this.circuitBreaker.reset();
        logger.info('Population API circuit breaker has been reset');
    }
    
    /**
     * Get circuit breaker status
     * @returns {Object} Circuit breaker status
     */
    getCircuitBreakerStatus() {
        return this.circuitBreaker.getState();
    }
}

// Create and export singleton instance
const bulletproofPopulationLoader = new BulletproofPopulationLoader();
export default bulletproofPopulationLoader;
