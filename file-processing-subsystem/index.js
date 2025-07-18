/**
 * File Processing Subsystem
 * 
 * Provides a unified API for processing files with validation, parsing, and transformation.
 * This subsystem encapsulates all file-related functionality, providing a clean
 * interface for the rest of the application.
 * 
 * Key features:
 * - File validation
 * - CSV parsing and validation
 * - Data transformation
 * - Progress tracking
 * - Error handling
 * 
 * Usage:
 * ```javascript
 * import { createFileProcessor, CSVParser } from 'file-processing-subsystem';
 * 
 * // Create file processor
 * const fileProcessor = createFileProcessor({
 *   logger,
 *   progressTracker
 * });
 * 
 * // Configure for CSV processing
 * fileProcessor.configureFileValidator({
 *   allowedTypes: ['text/csv', 'application/csv'],
 *   maxSize: 10 * 1024 * 1024 // 10MB
 * });
 * 
 * // Process a file
 * const result = await fileProcessor.processFile(file, {
 *   transform: (data) => {
 *     // Transform data
 *     return data.map(row => ({
 *       ...row,
 *       email: row.email.toLowerCase()
 *     }));
 *   }
 * });
 * 
 * if (result.success) {
 *   console.log('Processed data:', result.data);
 * } else {
 *   console.error('Processing failed:', result.errors);
 * }
 * ```
 */

import FileProcessor from './file-processor.js';
import CSVParser from './parsers/csv-parser.js';
import StreamingCSVParser from './parsers/streaming-csv-parser.js';
import JSONParser from './parsers/json-parser.js';
import FileValidator from './validators/file-validator.js';
import CSVValidator from './validators/csv-validator.js';

/**
 * Create a file processor with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {FileProcessor} Configured file processor
 */
function createFileProcessor(options = {}) {
    return new FileProcessor(options);
}

/**
 * Create a CSV parser with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {CSVParser} Configured CSV parser
 */
function createCSVParser(options = {}) {
    return new CSVParser(options);
}

/**
 * Create a streaming CSV parser with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {StreamingCSVParser} Configured streaming CSV parser
 */
function createStreamingCSVParser(options = {}) {
    return new StreamingCSVParser(options);
}

/**
 * Create a JSON parser with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {JSONParser} Configured JSON parser
 */
function createJSONParser(options = {}) {
    return new JSONParser(options);
}

/**
 * Create a file validator with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {FileValidator} Configured file validator
 */
function createFileValidator(options = {}) {
    return new FileValidator(options);
}

/**
 * Create a CSV validator with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {CSVValidator} Configured CSV validator
 */
function createCSVValidator(options = {}) {
    return new CSVValidator(options);
}

// Export factory functions
export { 
    createFileProcessor, 
    createCSVParser, 
    createStreamingCSVParser, 
    createJSONParser, 
    createFileValidator, 
    createCSVValidator 
};

// Export classes for direct instantiation
export { 
    FileProcessor, 
    CSVParser, 
    StreamingCSVParser, 
    JSONParser, 
    FileValidator, 
    CSVValidator 
};

// Export default factory function
export default createFileProcessor;