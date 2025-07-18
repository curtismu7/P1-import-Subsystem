/**
 * Population Management Subsystem
 * 
 * Provides a unified API for managing PingOne populations.
 * This subsystem encapsulates all population-related functionality,
 * providing a clean interface for the rest of the application.
 * 
 * Key features:
 * - Population CRUD operations
 * - User-to-population mapping
 * - Population caching
 * - Data validation
 * - Event notifications
 * 
 * Usage:
 * ```javascript
 * import { createPopulationService, Population } from 'population-subsystem';
 * import { createPingOneClient } from 'api-client-subsystem';
 * 
 * // Create API client
 * const apiClient = createPingOneClient({ logger });
 * 
 * // Create population service
 * const populationService = createPopulationService({
 *   logger,
 *   apiClient
 * });
 * 
 * // Get all populations
 * const populations = await populationService.getPopulations();
 * 
 * // Create a new population
 * const newPopulation = new Population({
 *   name: 'Test Population',
 *   description: 'A test population'
 * });
 * 
 * const createdPopulation = await populationService.createPopulation(newPopulation);
 * ```
 */

import Population from './models/population.js';
import PopulationService from './services/population-service.js';

/**
 * Create a population service with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {PopulationService} Configured population service
 */
function createPopulationService(options = {}) {
    return new PopulationService(options);
}

// Export factory function
export { createPopulationService };

// Export classes for direct instantiation
export { Population, PopulationService };

// Export default factory function
export default createPopulationService;