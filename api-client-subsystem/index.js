/**
 * API Client Subsystem
 * 
 * Provides a unified API for making HTTP requests with consistent error handling,
 * retry logic, and authentication. This subsystem encapsulates all external API
 * communication, providing a clean interface for the rest of the application.
 * 
 * Key features:
 * - Automatic token management
 * - Configurable retry logic
 * - Request/response interceptors
 * - Error normalization
 * - Rate limiting
 * - Request cancellation
 * - Response caching
 * 
 * Usage:
 * ```javascript
 * import { createApiClient, PingOneClient } from 'api-client-subsystem';
 * 
 * // Create a client with default configuration
 * const apiClient = createApiClient();
 * 
 * // Make a request
 * const response = await apiClient.get('/api/data');
 * 
 * // Create a specialized PingOne client
 * const pingOneClient = new PingOneClient({
 *   logger,
 *   tokenManager
 * });
 * 
 * // Use specialized methods
 * const populations = await pingOneClient.getPopulations();
 * ```
 */

import BaseApiClient from './base-client.js';
import PingOneClient from './endpoints/pingone-client.js';
import TokenManager from '../server/token-manager.js';

/**
 * Create an API client with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {BaseApiClient} Configured API client
 */
function createApiClient(options = {}) {
    const { logger, tokenManager, config } = options;
    
    // Create token manager if not provided
    const tokenManagerInstance = tokenManager || new TokenManager(logger);
    
    return new BaseApiClient({
        logger,
        tokenManager: tokenManagerInstance,
        config
    });
}

/**
 * Create a PingOne API client with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {PingOneClient} Configured PingOne client
 */
function createPingOneClient(options = {}) {
    const { logger, tokenManager, config } = options;
    
    // Create token manager if not provided
    const tokenManagerInstance = tokenManager || new TokenManager(logger);
    
    return new PingOneClient({
        logger,
        tokenManager: tokenManagerInstance,
        config
    });
}

// Export factory functions
export { createApiClient, createPingOneClient };

// Export classes for direct instantiation
export { BaseApiClient, PingOneClient };

// Create and export default instance
const defaultClient = createApiClient();
export default defaultClient;