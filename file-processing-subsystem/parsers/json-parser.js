/**
 * JSON Parser
 * 
 * Provides functionality for parsing JSON files with validation and transformation.
 * 
 * Features:
 * - JSON validation
 * - Data transformation
 * - Error handling
 * - Schema validation
 */

/**
 * JSON Parser
 * 
 * Parses JSON data with configurable options.
 */
class JSONParser {
    /**
     * Create a new JSONParser
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Function} options.transform - Transform function for data
     * @param {Object} options.schema - JSON schema for validation
     */
    constructor(options = {}) {
        const { 
            logger, 
            transform = null,
            schema = null
        } = options;
        
        // Initialize dependencies
        this.logger = logger || console;
        
        // Configuration
        this.transform = transform;
        this.schema = schema;
    }

    /**
     * Parse JSON string
     * @param {string} jsonString - JSON string to parse
     * @returns {Object} Parsing result with data
     */
    parse(jsonString) {
        try {
            if (!jsonString) {
                return { data: null };
            }
            
            // Parse JSON
            let data = JSON.parse(jsonString);
            
            // Validate schema if provided
            if (this.schema) {
                const validation = this._validateSchema(data);
                if (!validation.valid) {
                    throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`);
                }
            }
            
            // Apply transform if provided
            if (this.transform) {
                try {
                    data = this.transform(data);
                } catch (error) {
                    this.logger.warn('Error transforming JSON data:', error.message);
                    throw error;
                }
            }
            
            return { data };
        } catch (error) {
            this.logger.error('Failed to parse JSON:', error.message);
            throw error;
        }
    }

    /**
     * Parse JSON file
     * @param {File|Blob} file - JSON file to parse
     * @returns {Promise<Object>} Parsing result with data
     */
    async parseFile(file) {
        try {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    try {
                        const jsonString = event.target.result;
                        const result = this.parse(jsonString);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                };
                
                reader.onerror = () => {
                    reject(new Error('Failed to read file'));
                };
                
                reader.readAsText(file);
            });
        } catch (error) {
            this.logger.error('Failed to parse JSON file:', error.message);
            throw error;
        }
    }

    /**
     * Generate JSON string from data
     * @param {*} data - Data to convert to JSON
     * @param {boolean} pretty - Whether to format JSON prettily
     * @returns {string} JSON string
     */
    generateJSON(data, pretty = false) {
        try {
            return pretty 
                ? JSON.stringify(data, null, 2)
                : JSON.stringify(data);
        } catch (error) {
            this.logger.error('Failed to generate JSON:', error.message);
            throw error;
        }
    }

    /**
     * Validate data against schema
     * @param {*} data - Data to validate
     * @returns {Object} Validation result
     * @private
     */
    _validateSchema(data) {
        if (!this.schema) {
            return { valid: true, errors: [] };
        }
        
        const errors = [];
        
        // Simple schema validation - in production, use a proper JSON schema validator
        if (this.schema.type) {
            const actualType = Array.isArray(data) ? 'array' : typeof data;
            if (actualType !== this.schema.type) {
                errors.push(`Expected type ${this.schema.type}, got ${actualType}`);
            }
        }
        
        if (this.schema.required && Array.isArray(this.schema.required)) {
            for (const field of this.schema.required) {
                if (data && typeof data === 'object' && !(field in data)) {
                    errors.push(`Required field missing: ${field}`);
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

export default JSONParser;