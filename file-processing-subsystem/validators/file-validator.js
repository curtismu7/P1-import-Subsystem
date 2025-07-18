/**
 * File Validator
 * 
 * Provides functionality for validating files based on type, size, and content.
 * 
 * Features:
 * - File type validation
 * - File size validation
 * - Content validation
 * - Custom validation rules
 */

/**
 * File Validator
 * 
 * Validates files based on configurable rules.
 */
class FileValidator {
    /**
     * Create a new FileValidator
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Array<string>} options.allowedTypes - Allowed MIME types
     * @param {number} options.maxSize - Maximum file size in bytes
     * @param {Function} options.contentValidator - Custom content validator function
     */
    constructor(options = {}) {
        const { 
            logger, 
            allowedTypes = [], 
            maxSize = 10 * 1024 * 1024, // 10MB default
            contentValidator = null
        } = options;
        
        // Initialize dependencies
        this.logger = logger || console;
        
        // Configuration
        this.allowedTypes = allowedTypes;
        this.maxSize = maxSize;
        this.contentValidator = contentValidator;
    }

    /**
     * Validate a file
     * @param {File|Blob} file - File to validate
     * @returns {Promise<Object>} Validation result
     */
    async validate(file) {
        const errors = [];
        
        // Validate file type
        if (this.allowedTypes.length > 0) {
            if (!this._validateType(file)) {
                errors.push(`Invalid file type: ${file.type}. Allowed types: ${this.allowedTypes.join(', ')}`);
            }
        }
        
        // Validate file size
        if (!this._validateSize(file)) {
            errors.push(`File size exceeds maximum allowed size of ${this._formatSize(this.maxSize)}`);
        }
        
        // Validate content if validator provided
        if (this.contentValidator) {
            try {
                const contentValidation = await this._validateContent(file);
                
                if (!contentValidation.valid) {
                    errors.push(...contentValidation.errors);
                }
            } catch (error) {
                this.logger.error('Content validation error:', error.message);
                errors.push(`Content validation error: ${error.message}`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate file type
     * @param {File|Blob} file - File to validate
     * @returns {boolean} Whether file type is valid
     * @private
     */
    _validateType(file) {
        // If no allowed types specified, allow all
        if (this.allowedTypes.length === 0) {
            return true;
        }
        
        // Check if file type is in allowed types
        return this.allowedTypes.some(type => {
            // Handle wildcards like 'text/*'
            if (type.endsWith('/*')) {
                const prefix = type.slice(0, -1);
                return file.type.startsWith(prefix);
            }
            
            return file.type === type;
        });
    }

    /**
     * Validate file size
     * @param {File|Blob} file - File to validate
     * @returns {boolean} Whether file size is valid
     * @private
     */
    _validateSize(file) {
        return file.size <= this.maxSize;
    }

    /**
     * Validate file content
     * @param {File|Blob} file - File to validate
     * @returns {Promise<Object>} Validation result
     * @private
     */
    async _validateContent(file) {
        if (!this.contentValidator) {
            return { valid: true, errors: [] };
        }
        
        try {
            return await this.contentValidator(file);
        } catch (error) {
            this.logger.error('Content validation error:', error.message);
            return {
                valid: false,
                errors: [`Content validation error: ${error.message}`]
            };
        }
    }

    /**
     * Format file size for display
     * @param {number} size - Size in bytes
     * @returns {string} Formatted size
     * @private
     */
    _formatSize(size) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let formattedSize = size;
        let unitIndex = 0;
        
        while (formattedSize >= 1024 && unitIndex < units.length - 1) {
            formattedSize /= 1024;
            unitIndex++;
        }
        
        return `${formattedSize.toFixed(2)} ${units[unitIndex]}`;
    }
}

export default FileValidator;