/**
 * Population Model
 * 
 * Defines the data structure and validation for PingOne populations.
 * Provides methods for working with population data.
 */

/**
 * Population class
 * 
 * Represents a PingOne population with validation and utility methods.
 */
class Population {
    /**
     * Create a new Population instance
     * @param {Object} data - Population data
     */
    constructor(data = {}) {
        // Required properties
        this.id = data.id || null;
        this.name = data.name || '';
        this.description = data.description || '';
        
        // Optional properties with defaults
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
        this.userCount = data.userCount || 0;
        
        // Additional properties
        this.environmentId = data.environmentId || null;
        this.default = data.default || false;
        
        // Raw data for access to additional properties
        this._raw = { ...data };
    }

    /**
     * Validate the population data
     * @returns {Object} Validation result with success flag and errors
     */
    validate() {
        const errors = [];
        
        // Name is required
        if (!this.name) {
            errors.push('Name is required');
        }
        
        // Name must be at least 1 character
        if (this.name && this.name.length < 1) {
            errors.push('Name must be at least 1 character');
        }
        
        // Name must be at most 128 characters
        if (this.name && this.name.length > 128) {
            errors.push('Name must be at most 128 characters');
        }
        
        // Description must be at most 1024 characters
        if (this.description && this.description.length > 1024) {
            errors.push('Description must be at most 1024 characters');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Convert to API format for creating/updating
     * @returns {Object} API-formatted population data
     */
    toApiFormat() {
        const result = {
            name: this.name
        };
        
        // Add optional properties if set
        if (this.description) {
            result.description = this.description;
        }
        
        return result;
    }

    /**
     * Convert to display format for UI
     * @returns {Object} Display-formatted population data
     */
    toDisplayFormat() {
        return {
            id: this.id,
            name: this.name,
            description: this.description || 'No description',
            userCount: this.userCount,
            default: this.default,
            createdAt: this.createdAt ? new Date(this.createdAt).toLocaleString() : 'Unknown',
            updatedAt: this.updatedAt ? new Date(this.updatedAt).toLocaleString() : 'Unknown'
        };
    }

    /**
     * Create a Population instance from API data
     * @param {Object} apiData - API population data
     * @returns {Population} Population instance
     * @static
     */
    static fromApiData(apiData) {
        return new Population({
            id: apiData.id,
            name: apiData.name,
            description: apiData.description,
            createdAt: apiData.createdAt || apiData.created || null,
            updatedAt: apiData.updatedAt || apiData.updated || null,
            environmentId: apiData.environment?.id || null,
            default: apiData.default || false,
            userCount: apiData._embedded?.userCount || 0,
            ...apiData
        });
    }

    /**
     * Create multiple Population instances from API data
     * @param {Array} apiDataArray - Array of API population data
     * @returns {Array<Population>} Array of Population instances
     * @static
     */
    static fromApiDataArray(apiDataArray) {
        if (!Array.isArray(apiDataArray)) {
            return [];
        }
        
        return apiDataArray.map(apiData => Population.fromApiData(apiData));
    }
}

export default Population;