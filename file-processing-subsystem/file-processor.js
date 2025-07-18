/**
 * File Processor
 * 
 * Provides functionality for processing files with validation, parsing, and transformation.
 * 
 * Features:
 * - File validation
 * - File parsing
 * - Data transformation
 * - Progress tracking
 * - Error handling
 */

import FileValidator from './validators/file-validator.js';
import CSVParser from './parsers/csv-parser.js';
import StreamingCSVParser from './parsers/streaming-csv-parser.js';
import JSONParser from './parsers/json-parser.js';
import CSVValidator from './validators/csv-validator.js';

/**
 * File Processor
 * 
 * Processes files with validation, parsing, and transformation.
 */
class FileProcessor {
    /**
     * Create a new FileProcessor
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.progressTracker - Progress tracker instance
     */
    constructor(options = {}) {
        const { logger, progressTracker } = options;
        
        // Initialize dependencies
        this.logger = logger || console;
        this.progressTracker = progressTracker;
        
        // Default validators and parsers
        this.fileValidator = new FileValidator({ logger });
        this.csvParser = new CSVParser({ logger });
        this.streamingCsvParser = new StreamingCSVParser({ logger });
        this.jsonParser = new JSONParser({ logger });
        this.csvValidator = new CSVValidator({ logger });
    }

    /**
     * Process a file
     * @param {File|Blob} file - File to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing result
     */
    async processFile(file, options = {}) {
        const {
            validateFile = true,
            validateContent = true,
            transform = null,
            fileType = 'auto',
            progressId = 'file-processing'
        } = options;
        
        try {
            // Start progress tracking
            if (this.progressTracker) {
                this.progressTracker.start(progressId, {
                    total: 100,
                    message: 'Processing file...'
                });
            }
            
            // Update progress
            this._updateProgress(progressId, 10, 'Validating file...');
            
            // Validate file if requested
            if (validateFile) {
                const fileValidation = await this.fileValidator.validate(file);
                
                if (!fileValidation.valid) {
                    this._updateProgress(progressId, 100, 'File validation failed');
                    return {
                        success: false,
                        errors: fileValidation.errors,
                        data: null
                    };
                }
            }
            
            // Determine file type
            const actualFileType = fileType === 'auto' 
                ? this._determineFileType(file) 
                : fileType;
            
            // Update progress
            this._updateProgress(progressId, 30, 'Parsing file...');
            
            // Parse file based on type
            let parseResult;
            
            switch (actualFileType) {
                case 'csv':
                    // Use streaming parser for large files
                    if (file.size > 1024 * 1024) { // 1MB threshold
                        parseResult = await this.streamingCsvParser.parseFile(file);
                    } else {
                        parseResult = await this.csvParser.parseFile(file);
                    }
                    break;
                    
                case 'json':
                    parseResult = await this.jsonParser.parseFile(file);
                    break;
                    
                default:
                    throw new Error(`Unsupported file type: ${actualFileType}`);
            }
            
            // Update progress
            this._updateProgress(progressId, 50, 'Validating content...');
            
            // Validate content if requested
            if (validateContent) {
                let contentValidation;
                
                switch (actualFileType) {
                    case 'csv':
                        contentValidation = {
                            valid: true,
                            data: parseResult.data,
                            headers: parseResult.headers
                        };
                        break;
                        
                    default:
                        contentValidation = { valid: true };
                }
                
                if (!contentValidation.valid) {
                    this._updateProgress(progressId, 100, 'Content validation failed');
                    return {
                        success: false,
                        errors: contentValidation.errors,
                        data: null
                    };
                }
            }
            
            // Update progress
            this._updateProgress(progressId, 70, 'Transforming data...');
            
            // Transform data if transform function provided
            let transformedData = parseResult.data;
            
            if (transform) {
                try {
                    transformedData = await transform(parseResult.data, parseResult.headers);
                } catch (error) {
                    this.logger.error('Data transformation error:', error.message);
                    
                    this._updateProgress(progressId, 100, 'Data transformation failed');
                    return {
                        success: false,
                        errors: [`Data transformation error: ${error.message}`],
                        data: null
                    };
                }
            }
            
            // Update progress
            this._updateProgress(progressId, 100, 'File processing complete');
            
            // Return success result
            return {
                success: true,
                data: transformedData,
                headers: parseResult.headers,
                fileType: actualFileType
            };
        } catch (error) {
            this.logger.error('File processing error:', error.message);
            
            // Update progress
            this._updateProgress(progressId, 100, 'File processing failed');
            
            return {
                success: false,
                errors: [`File processing error: ${error.message}`],
                data: null
            };
        }
    }

    /**
     * Configure file validator
     * @param {Object} options - Validator options
     */
    configureFileValidator(options) {
        this.fileValidator = new FileValidator({
            logger: this.logger,
            ...options
        });
    }

    /**
     * Configure CSV parser
     * @param {Object} options - Parser options
     */
    configureCSVParser(options) {
        this.csvParser = new CSVParser({
            logger: this.logger,
            ...options
        });
    }

    /**
     * Configure CSV validator
     * @param {Object} options - Validator options
     */
    configureCSVValidator(options) {
        this.csvValidator = new CSVValidator({
            logger: this.logger,
            ...options
        });
    }

    /**
     * Determine file type from file object
     * @param {File|Blob} file - File to check
     * @returns {string} File type
     * @private
     */
    _determineFileType(file) {
        // Check MIME type
        if (file.type) {
            if (file.type === 'text/csv' || file.type === 'application/csv') {
                return 'csv';
            }
            if (file.type === 'application/json' || file.type === 'text/json') {
                return 'json';
            }
        }
        
        // Check file extension
        if (file.name) {
            const extension = file.name.split('.').pop().toLowerCase();
            
            if (extension === 'csv') {
                return 'csv';
            }
            if (extension === 'json') {
                return 'json';
            }
        }
        
        // Default to CSV for text files
        if (file.type && file.type.startsWith('text/')) {
            return 'csv';
        }
        
        throw new Error('Could not determine file type');
    }

    /**
     * Update progress
     * @param {string} progressId - Progress ID
     * @param {number} percent - Progress percentage
     * @param {string} message - Progress message
     * @private
     */
    _updateProgress(progressId, percent, message) {
        if (this.progressTracker) {
            this.progressTracker.update(progressId, {
                progress: percent,
                message
            });
        }
    }
}

export default FileProcessor;