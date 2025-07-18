/**
 * PingOne API Client
 * 
 * Specialized client for interacting with PingOne APIs.
 * Provides methods for common PingOne operations with proper error handling.
 */

import BaseApiClient from '../base-client.js';

/**
 * PingOne API Client
 * 
 * Client for interacting with PingOne APIs with specialized methods
 * for population and user management.
 */
class PingOneClient extends BaseApiClient {
    /**
     * Create a new PingOneClient
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.tokenManager - Token manager instance
     * @param {Object} options.config - Client configuration
     */
    constructor(options = {}) {
        // Set PingOne-specific defaults
        const config = {
            retries: 2,
            timeout: 60000, // 60 seconds for potentially long operations
            ...options.config
        };
        
        super({ ...options, config });
        
        // Track current region and environment
        this.currentRegion = null;
        this.currentEnvironmentId = null;
        
        // Initialize API base URL
        this._updateApiBaseUrl();
    }

    /**
     * Update the API base URL based on region
     * @private
     */
    _updateApiBaseUrl() {
        if (this.tokenManager) {
            this.currentRegion = this.tokenManager.currentRegion || 'NorthAmerica';
            this.config.baseUrl = this.tokenManager.getApiBaseUrl(this.currentRegion);
        }
    }

    /**
     * Set the current environment ID
     * @param {string} environmentId - PingOne environment ID
     */
    setEnvironmentId(environmentId) {
        this.currentEnvironmentId = environmentId;
    }

    /**
     * Set the current region
     * @param {string} region - PingOne region
     */
    setRegion(region) {
        this.currentRegion = region;
        this._updateApiBaseUrl();
    }

    /**
     * Get all populations for the current environment
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Populations response
     */
    async getPopulations(options = {}) {
        if (!this.currentEnvironmentId) {
            this.currentEnvironmentId = await this.tokenManager.getEnvironmentId();
        }
        
        const url = `/environments/${this.currentEnvironmentId}/populations`;
        const response = await this.get(url, options);
        
        if (!response.ok) {
            throw new Error(`Failed to get populations: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Get a specific population by ID
     * @param {string} populationId - Population ID
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Population data
     */
    async getPopulation(populationId, options = {}) {
        if (!this.currentEnvironmentId) {
            this.currentEnvironmentId = await this.tokenManager.getEnvironmentId();
        }
        
        const url = `/environments/${this.currentEnvironmentId}/populations/${populationId}`;
        const response = await this.get(url, options);
        
        if (!response.ok) {
            throw new Error(`Failed to get population: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Create a new population
     * @param {Object} populationData - Population data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Created population
     */
    async createPopulation(populationData, options = {}) {
        if (!this.currentEnvironmentId) {
            this.currentEnvironmentId = await this.tokenManager.getEnvironmentId();
        }
        
        const url = `/environments/${this.currentEnvironmentId}/populations`;
        const response = await this.post(url, populationData, options);
        
        if (!response.ok) {
            throw new Error(`Failed to create population: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Update a population
     * @param {string} populationId - Population ID
     * @param {Object} populationData - Updated population data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Updated population
     */
    async updatePopulation(populationId, populationData, options = {}) {
        if (!this.currentEnvironmentId) {
            this.currentEnvironmentId = await this.tokenManager.getEnvironmentId();
        }
        
        const url = `/environments/${this.currentEnvironmentId}/populations/${populationId}`;
        const response = await this.put(url, populationData, options);
        
        if (!response.ok) {
            throw new Error(`Failed to update population: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Delete a population
     * @param {string} populationId - Population ID
     * @param {Object} options - Request options
     * @returns {Promise<boolean>} Success status
     */
    async deletePopulation(populationId, options = {}) {
        if (!this.currentEnvironmentId) {
            this.currentEnvironmentId = await this.tokenManager.getEnvironmentId();
        }
        
        const url = `/environments/${this.currentEnvironmentId}/populations/${populationId}`;
        const response = await this.delete(url, options);
        
        if (!response.ok) {
            throw new Error(`Failed to delete population: ${response.status} ${response.statusText}`);
        }
        
        return true;
    }

    /**
     * Get users for a population
     * @param {string} populationId - Population ID
     * @param {Object} queryParams - Query parameters
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Users response
     */
    async getUsers(populationId, queryParams = {}, options = {}) {
        if (!this.currentEnvironmentId) {
            this.currentEnvironmentId = await this.tokenManager.getEnvironmentId();
        }
        
        // Build query string
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(queryParams)) {
            params.append(key, value);
        }
        
        const queryString = params.toString() ? `?${params.toString()}` : '';
        const url = `/environments/${this.currentEnvironmentId}/populations/${populationId}/users${queryString}`;
        
        const response = await this.get(url, options);
        
        if (!response.ok) {
            throw new Error(`Failed to get users: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Create a user in a population
     * @param {string} populationId - Population ID
     * @param {Object} userData - User data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Created user
     */
    async createUser(populationId, userData, options = {}) {
        if (!this.currentEnvironmentId) {
            this.currentEnvironmentId = await this.tokenManager.getEnvironmentId();
        }
        
        const url = `/environments/${this.currentEnvironmentId}/populations/${populationId}/users`;
        const response = await this.post(url, userData, options);
        
        if (!response.ok) {
            throw new Error(`Failed to create user: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Update a user
     * @param {string} userId - User ID
     * @param {Object} userData - Updated user data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Updated user
     */
    async updateUser(userId, userData, options = {}) {
        if (!this.currentEnvironmentId) {
            this.currentEnvironmentId = await this.tokenManager.getEnvironmentId();
        }
        
        const url = `/environments/${this.currentEnvironmentId}/users/${userId}`;
        const response = await this.patch(url, userData, options);
        
        if (!response.ok) {
            throw new Error(`Failed to update user: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Delete a user
     * @param {string} userId - User ID
     * @param {Object} options - Request options
     * @returns {Promise<boolean>} Success status
     */
    async deleteUser(userId, options = {}) {
        if (!this.currentEnvironmentId) {
            this.currentEnvironmentId = await this.tokenManager.getEnvironmentId();
        }
        
        const url = `/environments/${this.currentEnvironmentId}/users/${userId}`;
        const response = await this.delete(url, options);
        
        if (!response.ok) {
            throw new Error(`Failed to delete user: ${response.status} ${response.statusText}`);
        }
        
        return true;
    }

    /**
     * Bulk create users
     * @param {string} populationId - Population ID
     * @param {Array} users - Array of user data objects
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Bulk operation result
     */
    async bulkCreateUsers(populationId, users, options = {}) {
        if (!this.currentEnvironmentId) {
            this.currentEnvironmentId = await this.tokenManager.getEnvironmentId();
        }
        
        const url = `/environments/${this.currentEnvironmentId}/populations/${populationId}/users/bulk`;
        const response = await this.post(url, { users }, {
            ...options,
            timeout: 120000 // 2 minutes for bulk operations
        });
        
        if (!response.ok) {
            throw new Error(`Failed to bulk create users: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }
}

export default PingOneClient;