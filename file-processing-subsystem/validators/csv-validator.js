/**
 * CSV Validator
 * 
 * Provides functionality for validating CSV files based on structure and content.
 * 
 * Features:
 * - Header validation
 * - Required column validation
 * - Data type validation
 * - Custom validation rules
 */

import CSVParser from '../parsers/csv-parser.js';

/**
 * CSV Validator
 * 
 * Validates CSV files based on configurable rules.
 */
class CSVValidator {
    /**
     * Create a new CSVValidator
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Array<string>} options.requiredColumns - Required column names
     * @param {Object} options.columnTypes - Column data types
     * @param {Function} options.customValidator - Custom validation function
     */
    constructor(options = {}) {
        const { 
            logger, 
            requiredColumns = [], 
            columnTypes = {},
            customValidator = null
        } = options;
        
        // Initialize dependencies
        this.logger = logger || console;
        
        // Configuration
        this.requiredColumns = requiredColumns;
        this.columnTypes = columnTypes;
        this.customValidator = customValidator;
        
        // Create CSV parser
        this.parser = new CSVParser({ logger });
    }

    /**
     * Validate CSV content
     * @param {string} csvContent - CSV content to validate
     * @returns {Object} Validation result
     */
    validate(csvContent) {
        try {
            // Parse CSV
            const { headers, data } = this.parser.parse(csvContent);
            
            // Validate headers
            const headerValidation = this._validateHeaders(headers);
            
            if (!headerValidation.valid) {
                return headerValidation;
            }
            
            // Validate data
            return this._validateData(data, headers);
        } catch (error) {
            this.logger.error('CSV validation error:', error.message);
            
            return {
                valid: false,
                errors: [`CSV validation error: ${error.message}`]
            };
        }
    }

    /**
     * Validate CSV file
     * @param {File|Blob} file - CSV file to validate
     * @returns {Promise<Object>} Validation result
     */
    async validateFile(file) {
        try {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    try {
                        const csvContent = event.target.result;
                        const result = this.validate(csvContent);
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
            this.logger.error('CSV file validation error:', error.message);
            
            return {
                valid: false,
                errors: [`CSV file validation error: ${error.message}`]
            };
        }
    }

    /**
     * Validate CSV headers
     * @param {Array<string>} headers - CSV headers
     * @returns {Object} Validation result
     * @private
     */
    _validateHeaders(headers) {
        const errors = [];
        
        // Check if headers exist
        if (!headers || headers.length === 0) {
            errors.push('CSV has no headers');
            return { valid: false, errors };
        }
        
        // Check for required columns
        for (const requiredColumn of this.requiredColumns) {
            if (!headers.includes(requiredColumn)) {
                errors.push(`Required column missing: ${requiredColumn}`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate CSV data
     * @param {Array<Object>} data - CSV data
     * @param {Array<string>} headers - CSV headers
     * @returns {Object} Validation result
     * @private
     */
    _validateData(data, headers) {
        const errors = [];
        
        // Check if data exists
        if (!data || data.length === 0) {
            errors.push('CSV has no data rows');
            return { valid: false, errors };
        }
        
        // Validate data types
        if (Object.keys(this.columnTypes).length > 0) {
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const rowIndex = i + 2; // Add 2 for 1-based index and header row
                
                for (const [column, type] of Object.entries(this.columnTypes)) {
                    if (headers.includes(column)) {
                        const value = row[column];
                        
                        if (!this._validateDataType(value, type)) {
                            errors.push(`Invalid data type in row ${rowIndex}, column "${column}": expected ${type}`);
                        }
                    }
                }
            }
        }
        
        // Apply custom validator if provided
        if (this.customValidator) {
            try {
                const customValidation = this.customValidator(data, headers);
                
                if (!customValidation.valid) {
                    errors.push(...customValidation.errors);
                }
            } catch (error) {
                this.logger.error('Custom validation error:', error.message);
                errors.push(`Custom validation error: ${error.message}`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            data,
            headers
        };
    }

    /**
     * Validate data type
     * @param {*} value - Value to validate
     * @param {string} type - Expected type
     * @returns {boolean} Whether value matches expected type
     * @private
     */
    _validateDataType(value, type) {
        // Handle null/empty values
        if (value === null || value === undefined || value === '') {
            return true; // Allow empty values
        }
        
        switch (type) {
            case 'string':
                return typeof value === 'string';
                
            case 'number':
                return !isNaN(Number(value));
                
            case 'boolean':
                return value === 'true' || value === 'false' || value === true || value === false;
                
            case 'date':
                return !isNaN(Date.parse(value));
                
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                
            default:
                return true; // Unknown type, assume valid
        }
    }
}

export default CSVValidator;