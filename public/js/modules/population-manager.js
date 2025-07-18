/**
 * PopulationManager - Manages population selection and interaction
 * 
 * This class provides a higher-level interface for working with populations
 * and delegates the actual API interactions to the PopulationService.
 * 
 * Features:
 * - Population dropdown initialization
 * - Population selection
 * - Population refresh
 * 
 * Usage:
 * ```javascript
 * // Get the singleton instance
 * import populationManager from './modules/population-manager.js';
 * 
 * // Initialize a population dropdown
 * await populationManager.initPopulationDropdown('population-dropdown', {
 *   includeEmpty: true,
 *   emptyText: 'Select a population',
 *   selectedId: 'existing-population-id'
 * });
 * 
 * // Select a population
 * const population = await populationManager.selectPopulation('population-id');
 * 
 * // Refresh populations
 * await populationManager.refreshPopulations('population-dropdown');
 * ```
 */

import apiFactory from './api-factory.js';
import uiManager from './ui-manager.js';
import logger from './logger.js';
import PopulationService from './population-service.js';

class PopulationManager {
    constructor() {
        this.selectedPopulation = null;
        this.apiClient = apiFactory.getPingOneClient();
        this.populationService = new PopulationService(this.apiClient, null, logger);
        
        // Bind methods to ensure correct 'this' context
        this.initPopulationDropdown = this.initPopulationDropdown.bind(this);
        this.selectPopulation = this.selectPopulation.bind(this);
        this.refreshPopulations = this.refreshPopulations.bind(this);
    }

    /**
     * Initialize a dropdown element with population data
     * @param {string} dropdownId - ID of the dropdown element to populate
     * @param {Object} options - Options for populating the dropdown
     * @param {boolean} options.includeEmpty - Whether to include an empty option
     * @param {string} options.emptyText - Text for the empty option
     * @param {string} options.selectedId - ID of the population to select
     * @returns {Promise<boolean>} True if successful, false otherwise
     */
    async initPopulationDropdown(dropdownId, options = {}) {
        try {
            // Use the PopulationService to populate the dropdown
            const success = await this.populationService.populateDropdown(dropdownId, options);
            
            // Update the selected population if specified
            if (success && options.selectedId) {
                try {
                    const selectedPop = await this.populationService.getPopulationById(options.selectedId);
                    if (selectedPop) {
                        this.selectedPopulation = selectedPop;
                    }
                } catch (error) {
                    logger.warn(`Could not get details for selected population ${options.selectedId}: ${error.message}`);
                }
            }
            
            return success;
        } catch (error) {
            logger.error(`Error populating dropdown ${dropdownId}: ${error.message}`, { error });
            uiManager.showError(`Failed to load populations: ${error.message}`);
            return false;
        }
    }

    /**
     * Select a population by ID
     * @param {string} populationId - ID of the population to select
     * @returns {Promise<Object>} The selected population object, or null if not found
     */
    async selectPopulation(populationId) {
        try {
            if (!populationId) {
                this.selectedPopulation = null;
                return null;
            }
            
            // Use the PopulationService to get the population by ID
            const population = await this.populationService.getPopulationById(populationId);
            
            // Update selected population
            this.selectedPopulation = population;
            
            logger.info(`Selected population: ${population.name} (${population.id})`);
            
            return population;
        } catch (error) {
            logger.error(`Error selecting population ${populationId}: ${error.message}`, { error });
            uiManager.showError(`Failed to select population: ${error.message}`);
            return null;
        }
    }

    /**
     * Refresh the populations in a dropdown element
     * @param {string} dropdownId - ID of the dropdown element to refresh
     * @param {Object} options - Options for populating the dropdown (same as initPopulationDropdown)
     * @returns {Promise<boolean>} True if successful, false otherwise
     */
    async refreshPopulations(dropdownId, options = {}) {
        // Clear the cache to force a fresh API call
        this.populationService.clearCache();
        
        // Re-initialize the dropdown
        return this.initPopulationDropdown(dropdownId, options);
    }

    /**
     * Get the currently selected population
     * @returns {Object} The currently selected population, or null if none selected
     */
    getSelectedPopulation() {
        return this.selectedPopulation;
    }
}

// Create and export a singleton instance
const populationManager = new PopulationManager();
export default populationManager;