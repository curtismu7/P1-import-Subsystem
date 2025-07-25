// File: file-handler.js
// Description: CSV file processing and validation for PingOne user import
// 
// This module handles all file-related operations including:
// - CSV file reading and parsing
// - User data validation and error checking
// - File preview generation
// - File information display and management
// - Folder path tracking for better UX
// - Validation summary and error reporting
// 
// Provides comprehensive CSV processing with detailed validation feedback.

import { ElementRegistry } from './element-registry.js';

/**
 * File Handler Class
 * 
 * Manages CSV file processing, validation, and user data preparation
 * for the PingOne import tool. Handles file selection, parsing,
 * validation, and preview generation.
 * 
 * @param {Object} logger - Logger instance for debugging
 * @param {Object} uiManager - UI manager for status updates
 */
class FileHandler {
    /**
     * Create a new FileHandler instance
     * @param {Object} logger - Logger instance for debugging
     * @param {Object} uiManager - UI manager for status updates
     */
    constructor(logger, uiManager) {
        if (!logger) {
            throw new Error('Logger is required for FileHandler');
        }
        
        this.logger = logger;
        this.uiManager = uiManager;
        
        // Required fields for user validation
        this.requiredFields = ['username'];
        
        // Validation tracking for processed files
        this.validationResults = {
            total: 0,
            valid: 0,
            errors: 0,
            warnings: 0
        };
        
        // File processing state
        this.lastParsedUsers = [];
        this.currentFile = null;
        
        // Initialize UI elements for file handling
        this.fileInput = ElementRegistry.fileInput ? ElementRegistry.fileInput() : null;
        this.fileInfo = ElementRegistry.fileInfo ? ElementRegistry.fileInfo() : null;
        this.previewContainer = ElementRegistry.previewContainer ? ElementRegistry.previewContainer() : null;
        
        // Load last file info from localStorage for better UX
        this.lastFileInfo = this.loadLastFileInfo();
        
        // Initialize event listeners for file input
        this.initializeFileInput();
    }

    // ======================
    // File Info Management
    // ======================
    
    /**
     * Load last file info from localStorage
     * @returns {Object|null} Last file info or null if not found
     */
    loadLastFileInfo() {
        try {
            const savedFile = localStorage.getItem('lastSelectedFile');
            return savedFile ? JSON.parse(savedFile) : null;
        } catch (error) {
            this.logger.error('Error loading last file info:', error);
            return null;
        }
    }
    
    /**
     * Get the current file being processed
     * 
     * Returns the File object that is currently loaded and ready for processing.
     * Used by other modules to access the file for upload operations.
     * 
     * @returns {File|null} The current file or null if none is loaded
     */
    getCurrentFile() {
        return this.currentFile;
    }
    
    /**
     * Set a file and process it for import
     * 
     * Validates the file, processes its contents, and prepares it for
     * import operations. Updates UI with file information and validation results.
     * 
     * @param {File} file - The file to set and process
     * @param {string} operationType - The operation type ('import', 'delete', 'modify')
     * @returns {Promise<Object>} Promise that resolves with processing result
     */
    async setFile(file, operationType = 'import') {
        if (!file) {
            throw new Error('File is required for setFile operation');
        }
        
        try {
            this.logger.info('Setting file', { fileName: file.name, fileSize: file.size, operationType });
            
            // Store the current file reference for later use
            this.currentFile = file;
            
            // Process the file using the existing internal method
            // This includes validation, parsing, and UI updates
            await this._handleFileInternal(file, null, operationType);
            
            return { success: true, file };
        } catch (error) {
            this.logger.error('Failed to set file', { error: error.message, fileName: file.name, operationType });
            throw error;
        }
    }
    
    /**
     * Get the list of parsed users from the current file
     * 
     * Returns the array of user objects that were successfully parsed
     * from the CSV file. Each user object contains validated data.
     * 
     * @returns {Array} Array of user objects with validated data
     */
    getUsers() {
        return this.lastParsedUsers || [];
    }

    /**
     * Get the total number of users parsed from the CSV file
     * 
     * Returns the total count of users found in the processed CSV file.
     * This count includes all rows, regardless of validation status.
     * 
     * @returns {number} Total number of users in the CSV file
     */
    getTotalUsers() {
        const totalUsers = this.validationResults.total || 0;
        console.log('[CSV] getTotalUsers() called, returning:', totalUsers, 'validationResults:', this.validationResults);
        return totalUsers;
    }

    /**
     * Read file as text using FileReader API
     * 
     * Asynchronously reads a file and returns its contents as a string.
     * Used for processing CSV files and other text-based formats.
     * 
     * @param {File} file - The file to read
     * @returns {Promise<string>} Promise that resolves with file content as string
     */
    readFileAsText(file) {
        if (!file) {
            throw new Error('File is required for reading');
        }
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Save the last folder path that was used
     * @param {File} file - The selected file
     * @param {string} operationType - The operation type ('import', 'delete', 'modify')
     */
    saveLastFolderPath(file, operationType = 'import') {
        if (!file) {
            return;
        }
        
        try {
            let folderPath = null;
            
            // Try to extract folder path from different sources
            if (file.webkitRelativePath) {
                // For webkitRelativePath, get the directory part
                const pathParts = file.webkitRelativePath.split('/');
                if (pathParts.length > 1) {
                    folderPath = pathParts.slice(0, -1).join('/');
                }
            } else if (file.name) {
                // For regular files, try to extract from the file name
                // This is a fallback since we can't get the full path due to security restrictions
                const fileName = file.name;
                const lastSlashIndex = fileName.lastIndexOf('/');
                if (lastSlashIndex !== -1) {
                    folderPath = fileName.substring(0, lastSlashIndex);
                }
            }
            
            if (folderPath) {
                // Save with operation-specific key
                const storageKey = `lastFolderPath_${operationType}`;
                localStorage.setItem(storageKey, folderPath);
                this.logger.info(`Saved last folder path for ${operationType}:`, folderPath);
            }
            
            // Also save a general last folder path
            if (folderPath) {
                localStorage.setItem('lastFolderPath', folderPath);
            }
            
        } catch (error) {
            this.logger.warn('Could not save folder path:', error.message);
        }
    }

    /**
     * Get the last folder path that was used
     * @param {string} operationType - The operation type ('import', 'delete', 'modify')
     * @returns {string|null} The last folder path or null if not available
     */
    getLastFolderPath(operationType = 'import') {
        try {
            // First try to get operation-specific folder path
            const operationKey = `lastFolderPath_${operationType}`;
            let folderPath = localStorage.getItem(operationKey);
            
            // Fall back to general last folder path
            if (!folderPath) {
                folderPath = localStorage.getItem('lastFolderPath');
            }
            
            return folderPath;
        } catch (error) {
            this.logger.warn('Could not get last folder path:', error.message);
            return null;
        }
    }

    /**
     * Update the file input label to show last folder path
     * @param {string} operationType - The operation type ('import', 'delete', 'modify')
     */
    updateFileLabel(operationType = 'import') {
        try {
            // Find the appropriate file label based on operation type
            let fileLabel = null;
            let fileInput = null;
            
            switch (operationType) {
                case 'import':
                    fileLabel = ElementRegistry.fileInputLabel ? ElementRegistry.fileInputLabel() : null;
                    fileInput = ElementRegistry.fileInput ? ElementRegistry.fileInput() : null;
                    break;
                case 'delete':
                    fileLabel = ElementRegistry.deleteFileInputLabel ? ElementRegistry.deleteFileInputLabel() : null;
                    fileInput = ElementRegistry.deleteFileInput ? ElementRegistry.deleteFileInput() : null;
                    break;
                case 'modify':
                    fileLabel = ElementRegistry.modifyFileInputLabel ? ElementRegistry.modifyFileInputLabel() : null;
                    fileInput = ElementRegistry.modifyFileInput ? ElementRegistry.modifyFileInput() : null;
                    break;
                default:
                    fileLabel = ElementRegistry.fileInputLabel ? ElementRegistry.fileInputLabel() : null;
                    break;
            }
            
            if (fileLabel) {
                const lastFolderPath = this.getLastFolderPath(operationType);
                if (lastFolderPath) {
                    // Show a shortened version of the path for better UI
                    const shortPath = this.shortenPath(lastFolderPath);
                    fileLabel.textContent = `Choose CSV File (Last: ${shortPath})`;
                    fileLabel.title = `Last used folder: ${lastFolderPath}`;
                } else {
                    fileLabel.textContent = 'Choose CSV File';
                    fileLabel.title = 'Select a CSV file to process';
                }
            }
        } catch (error) {
            this.logger.warn('Could not update file label:', error.message);
        }
    }
    
    /**
     * Shorten a file path for display in the UI
     * @param {string} path - The full path
     * @returns {string} The shortened path
     */
    shortenPath(path) {
        if (!path) {
            return '';
        }
        
        const maxLength = 30;
        if (path.length <= maxLength) {
            return path;
        }
        
        // Try to keep the most relevant parts
        const parts = path.split('/');
        if (parts.length <= 2) {
            return path.length > maxLength ? '...' + path.slice(-maxLength + 3) : path;
        }
        
        // Keep first and last parts, add ellipsis in middle
        const firstPart = parts[0];
        const lastPart = parts[parts.length - 1];
        const middleParts = parts.slice(1, -1);
        
        let result = firstPart;
        if (middleParts.length > 0) {
            result += '/.../' + lastPart;
        } else {
            result += '/' + lastPart;
        }
        
        return result.length > maxLength ? '...' + result.slice(-maxLength + 3) : result;
    }
    
    /**
     * Save file info to localStorage
     * @param {Object} fileInfo - File information object
     */
    saveFileInfo(fileInfo) {
        if (!fileInfo) {
            return;
        }
        
        try {
            const fileData = {
                name: fileInfo.name,
                size: fileInfo.size,
                lastModified: fileInfo.lastModified,
                type: fileInfo.type
            };
            localStorage.setItem('lastSelectedFile', JSON.stringify(fileData));
            this.lastFileInfo = fileData;
        } catch (error) {
            this.logger.error('Error saving file info:', error);
        }
    }
    
    /**
     * Clear file info from localStorage
     */
    clearFileInfo() {
        try {
            localStorage.removeItem('lastSelectedFile');
            this.lastFileInfo = null;
            if (this.fileInfo) {
                this.fileInfo.innerHTML = 'No file selected';
            }
        } catch (error) {
            this.logger.error('Error clearing file info:', error);
        }
    }

    /**
     * Clear the last folder path
     */
    clearLastFolderPath() {
        try {
            localStorage.removeItem('lastFolderPath');
            this.updateFileLabel();
            this.logger.info('Cleared last folder path');
        } catch (error) {
            this.logger.warn('Could not clear last folder path:', error.message);
        }
    }

    // ======================
    // File Handling
    // ======================
    
    /**
     * Initialize file input event listeners
     */
    initializeFileInput() {
        if (!this.fileInput) {
            return;
        }
        
        // Remove existing event listeners
        const newFileInput = this.fileInput.cloneNode(true);
        this.fileInput.parentNode.replaceChild(newFileInput, this.fileInput);
        this.fileInput = newFileInput;
        
        // Add new event listener
        this.fileInput.addEventListener('change', (event) => this.handleFileSelect(event));
        
        // Update file label to show last folder path if available
        this.updateFileLabel();
    }
    
    /**
     * Handle a File object directly (not an event)
     * @param {File} file - The file to handle
     */
    async handleFileObject(file) {
        if (!file) {
            throw new Error('File is required for handleFileObject');
        }
        
        await this._handleFileInternal(file);
    }

    /**
     * Handle file selection from an input event
     * @param {Event} event - The file selection event
     */
    async handleFileSelect(event) {
        if (!event || !event.target) {
            this.logger.warn('Invalid file selection event');
            return;
        }
        
        const file = event.target.files[0];
        if (!file) {
            this.logger.warn('No file selected');
            return;
        }
        
        // Save the folder path for next time
        this.saveLastFolderPath(file, 'import');
        
        await this._handleFileInternal(file, event);
    }

    /**
     * Shared internal file handling logic
     * @param {File} file - The file to process
     * @param {Event} [event] - The file selection event (optional)
     * @param {string} operationType - The operation type ('import', 'delete', 'modify')
     * @private
     */
    async _handleFileInternal(file, event, operationType = 'import') {
        if (!file) {
            throw new Error('File is required for internal file handling');
        }
        
        console.log('[CSV] _handleFileInternal called with file:', file.name, 'size:', file.size, 'operationType:', operationType);
        try {
            this.logger.info('Processing file', { fileName: file.name, fileSize: file.size, operationType });
            
            // Validate file type - allow files without extensions or with any extension except known bad ones
            const fileName = file.name || '';
            const fileExt = this.getFileExtension(fileName).toLowerCase();
            const knownBadExts = ['exe', 'js', 'png', 'jpg', 'jpeg', 'gif', 'pdf', 'zip', 'tar', 'gz'];
            if (fileExt && knownBadExts.includes(fileExt)) {
                const errorMsg = `Unsupported file type: ${fileExt}. Please upload a CSV or text file.`;
                this.logger.error(errorMsg, { fileName, fileExt });
                throw new Error(errorMsg);
            }
            // Accept all other extensions and blank/unknown types (including files with no extension)
            
            // Validate file size (10MB limit)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                throw new Error('File too large. Please select a file smaller than 10MB.');
            }
            
            // Read file content
            const content = await this.readFileAsText(file);
            
            console.log('[CSV] _handleFileInternal: About to parse CSV content, length:', content.length);
            // Parse CSV with enhanced validation
            const parseResults = this.parseCSV(content);
            console.log('[CSV] _handleFileInternal: parseCSV completed, parseResults:', parseResults);
            
            // Store parsed users
            this.parsedUsers = parseResults.users;
            this.lastParsedUsers = [...parseResults.users];
            
            // Update validation results for getTotalUsers() method
            this.validationResults = {
                total: parseResults.users.length,
                valid: parseResults.validUsers || parseResults.users.length,
                errors: parseResults.errors.length,
                warnings: parseResults.warnings.length
            };
            
            // Add debug logging
            console.log('[CSV] File parsed successfully:', {
                totalUsers: this.validationResults.total,
                validUsers: this.validationResults.valid,
                errors: this.validationResults.errors,
                warnings: this.validationResults.warnings
            });
            
            // Update UI with results
            const message = `File processed: ${parseResults.validUsers} valid users, ${parseResults.invalidRows} invalid rows`;
            this.uiManager.showNotification(message, parseResults.invalidRows > 0 ? 'warning' : 'success');

            // Update UI with enhanced file info display based on operation type
            const fileInfoContainerId = operationType === 'modify' ? 'modify-file-info' : 'file-info';
            this.updateFileInfoForElement(file, fileInfoContainerId, parseResults.validUsers);
            
            // Update file label to show last folder path
            this.updateFileLabel(operationType);

            // Log detailed errors for debugging
            if (parseResults.errors.length > 0) {
                this.logger.warn('CSV parsing errors', {
                    errorCount: parseResults.errors.length,
                    errors: parseResults.errors.slice(0, 10) // Log first 10 errors
                });
            }

            // Update button state based on operation type
            if (window.app) {
                if (operationType === 'modify' && window.app.updateModifyButtonState) {
                    window.app.updateModifyButtonState();
                } else if (operationType === 'import' && window.app.updateImportButtonState) {
                    window.app.updateImportButtonState();
                }
            }

        } catch (error) {
            this.logger.error('Failed to process CSV file', {
                error: error.message,
                fileName: file.name,
                operationType
            });
            console.error('Error in _handleFileInternal:', error);

            let errorMessage = 'Failed to process CSV file. ';
            if (error.message.includes('Missing required headers')) {
                errorMessage = `CSV file is missing required columns. ${error.message} Please ensure your CSV file has a 'username' column.`;
            } else if (error.message.includes('Invalid file type')) {
                errorMessage += 'Please select a valid CSV file.';
            } else if (error.message.includes('File too large')) {
                errorMessage += 'Please select a smaller file (max 10MB).';
            } else {
                errorMessage += error.message;
            }

            this.uiManager.showNotification(errorMessage, 'error');
            
            // Clear file input
            if (event && event.target && event.target.value) {
                event.target.value = '';
            }
        }
    }
    
    /**
     * Process a CSV file for user import
     * 
     * Validates the file format, reads its contents, parses CSV data,
     * and prepares user objects for import. Handles file validation,
     * CSV parsing, and error reporting.
     * 
     * @param {File} file - The CSV file to process
     * @returns {Promise<Object>} Promise that resolves with parsing results
     */
    async processCSV(file) {
        // Log file object for debugging
        this.logger.log('Processing file object:', 'debug', file);
        
        // Validate file exists and is not empty
        if (!file) {
            this.logger.error('No file provided to processCSV');
            throw new Error('No file selected');
        }
        
        if (file.size === 0) {
            this.logger.error('Empty file provided', { fileName: file.name, size: file.size });
            throw new Error('File is empty');
        }
        
        // Only block known bad extensions, allow all others
        const fileName = file.name || '';
        const fileExt = this.getFileExtension(fileName).toLowerCase();
        const knownBadExts = ['exe', 'js', 'png', 'jpg', 'jpeg', 'gif', 'pdf', 'zip', 'tar', 'gz'];
        if (fileExt && knownBadExts.includes(fileExt)) {
            const errorMsg = `Unsupported file type: ${fileExt}. Please upload a CSV or text file.`;
            this.logger.error(errorMsg, { fileName, fileExt });
            throw new Error(errorMsg);
        }
        // Accept all other extensions and blank/unknown types
        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            throw new Error(`File is too large. Maximum size is ${this.formatFileSize(maxSize)}`);
        }
        
        // Update UI
        this.saveFileInfo(file);
        this.updateFileInfo(file);
        
        // Store the current file reference
        this.currentFile = file;
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const text = event.target.result;
                    if (!text || text.trim() === '') {
                        throw new Error('File is empty or contains no text');
                    }
                    
                    console.log('[CSV] About to parse CSV text, length:', text.length);
                    const { headers, rows } = this.parseCSV(text);
                    console.log('[CSV] parseCSV completed, headers:', headers, 'rows count:', rows.length);
                    
                    // Validate required fields
                    const missingHeaders = this.requiredFields.filter(field => !headers.includes(field));
                    if (missingHeaders.length > 0) {
                        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
                    }
                    
                    // Convert rows to user objects and store them
                    this.lastParsedUsers = rows.map(row => {
                        const user = {};
                        headers.forEach((header, index) => {
                            user[header] = row[header] || '';
                        });
                        return user;
                    });
                    
                    // Also store in parsedUsers for compatibility with getParsedUsers
                    this.parsedUsers = this.lastParsedUsers;
                    
                    // Update validation results for getTotalUsers() method
                    this.validationResults = {
                        total: this.lastParsedUsers.length,
                        valid: this.lastParsedUsers.length,
                        errors: 0,
                        warnings: 0
                    };
                    
                    // Add debug logging
                    console.log('[CSV] File parsed successfully (processCSV):', {
                        totalUsers: this.validationResults.total,
                        validUsers: this.validationResults.valid,
                        errors: this.validationResults.errors,
                        warnings: this.validationResults.warnings
                    });
                    
                    resolve({ 
                        success: true, 
                        headers, 
                        rows: this.lastParsedUsers,
                        userCount: this.lastParsedUsers.length
                    });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };
            
            reader.readAsText(file);
        });
    }
    
    // ======================
    // CSV Parsing Methods
    // ======================
    
    /**
     * Parse CSV content into headers and data rows
     * 
     * Splits CSV content into lines, extracts headers, and validates
     * required and recommended columns. Handles header mapping for
     * different naming conventions.
     * 
     * @param {string} content - Raw CSV content as string
     * @returns {Object} Object containing headers and parsed rows
     */
    parseCSV(content) {
        // Split content into lines and filter out empty lines
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV file must have at least a header row and one data row');
        }

        // Parse headers from first line
        const headers = this.parseCSVLine(lines[0]);
        
        // Define required and recommended headers for validation
        const requiredHeaders = ['username'];
        const recommendedHeaders = ['firstName', 'lastName', 'email'];
        
        // Log all headers for debugging
        console.log('[CSV] All headers:', headers);
        console.log('[CSV] Required headers:', requiredHeaders);
        console.log('[CSV] Recommended headers:', recommendedHeaders);
        
        // Validate headers
        const missingRequired = requiredHeaders.filter(h => {
            const hasHeader = headers.some(header => {
                const headerLower = header.toLowerCase();
                const mappedHeader = this.getHeaderMapping(headerLower);
                const matches = headerLower === h.toLowerCase() || mappedHeader === h;
                console.log(`[CSV] Checking header "${header}" (${headerLower}) -> "${mappedHeader}" for required "${h}": ${matches}`);
                return matches;
            });
            console.log(`[CSV] Required header "${h}" found: ${hasHeader}`);
            return !hasHeader;
        });
        
        const missingRecommended = recommendedHeaders.filter(h => {
            const hasHeader = headers.some(header => {
                const headerLower = header.toLowerCase();
                const mappedHeader = this.getHeaderMapping(headerLower);
                const matches = headerLower === h.toLowerCase() || mappedHeader === h;
                console.log(`[CSV] Checking header "${header}" (${headerLower}) -> "${mappedHeader}" for recommended "${h}": ${matches}`);
                return matches;
            });
            console.log(`[CSV] Recommended header "${h}" found: ${hasHeader}`);
            return !hasHeader;
        });

        if (missingRequired.length > 0) {
            const errorMsg = `Missing required headers: ${missingRequired.join(', ')}. At minimum, you need a 'username' column.`;
            this.logger.error('CSV validation failed - missing required headers', {
                missingRequired,
                availableHeaders: headers,
                errorMsg
            });
            throw new Error(errorMsg);
        }

        if (missingRecommended.length > 0) {
            const warningMsg = `Missing recommended headers: ${missingRecommended.join(', ')}. These are not required but recommended for better user data.`;
            this.logger.warn('CSV validation warning - missing recommended headers', {
                missingRecommended,
                availableHeaders: headers,
                warningMsg
            });
            // Show warning but don't throw error
            if (window.app && window.app.uiManager) {
                window.app.uiManager.showNotification(warningMsg, 'warning');
            }
        }

        const users = [];
        const errors = [];
        const warnings = [];
        let rowNumber = 1; // Start from 1 since 0 is header

        for (let i = 1; i < lines.length; i++) {
            rowNumber = i + 1; // +1 because we start from header row
            const line = lines[i].trim();
            
            if (!line) continue; // Skip empty lines
            
            try {
                const user = this.parseUserRow(line, headers, rowNumber);
                
                // Validate user data
                const validationResult = this.validateUserData(user, rowNumber);
                if (validationResult.isValid) {
                    users.push(user);
                } else {
                    errors.push({
                        row: rowNumber,
                        user: user,
                        errors: validationResult.errors,
                        warnings: validationResult.warnings
                    });
                    
                    // Add warnings to warnings array
                    warnings.push(...validationResult.warnings.map(w => ({ row: rowNumber, ...w })));
                }
            } catch (error) {
                errors.push({
                    row: rowNumber,
                    error: error.message,
                    line: line
                });
            }
        }

        // Log comprehensive validation results
        const validationSummary = {
            totalRows: lines.length - 1,
            validUsers: users.length,
            invalidRows: errors.length,
            warnings: warnings.length,
            missingRequiredHeaders: missingRequired,
            missingRecommendedHeaders: missingRecommended,
            availableHeaders: headers
        };

        this.logger.info('CSV parsing completed', validationSummary);

        if (errors.length > 0) {
            const errorDetails = errors.map(e => ({
                row: e.row,
                errors: e.errors || [e.error],
                warnings: e.warnings || []
            }));
            
            this.logger.warn('CSV validation issues found', {
                totalErrors: errors.length,
                errorDetails: errorDetails.slice(0, 10) // Log first 10 errors
            });
        }

        // Show user-friendly summary
        this.showValidationSummary(validationSummary, errors, warnings);

        return {
            users,
            errors,
            warnings,
            totalRows: lines.length - 1,
            validUsers: users.length,
            invalidRows: errors.length,
            headerCount: headers.length,
            availableHeaders: headers
        };
    }

    /**
     * Parse a single CSV line
     * @param {string} line - CSV line to parse
     * @param {string} delimiter - Delimiter character
     * @returns {Array<string>} Array of field values
     */
    parseCSVLine(line, delimiter = ',') {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result.map(field => field.trim());
    }

    /**
     * Parse a user row from CSV
     * @param {string} line - CSV line to parse
     * @param {Array<string>} headers - Header row
     * @param {number} rowNumber - Row number for error reporting
     * @returns {Object} Parsed user object
     */
    parseUserRow(line, headers, rowNumber) {
        const values = this.parseCSVLine(line);
        
        if (values.length !== headers.length) {
            throw new Error(`Row ${rowNumber}: Number of columns (${values.length}) doesn't match headers (${headers.length})`);
        }
        
        const user = {};
        
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i].toLowerCase().trim();
            let value = values[i].trim();
            
            // Handle boolean values
            if (header === 'enabled') {
                const valueLower = value.toLowerCase();
                if (valueLower === 'true' || value === '1') {
                    value = true;
                } else if (valueLower === 'false' || value === '0') {
                    value = false;
                } else if (value === '') {
                    value = true; // Default to enabled
                } else {
                    throw new Error(`Row ${rowNumber}: Invalid enabled value '${value}'. Must be true/false or 1/0`);
                }
            }
            
            // Map common header variations
            const mappedHeader = this.getHeaderMapping(header);
            console.log(`[CSV] Mapping header: "${header}" -> "${mappedHeader}"`);
            user[mappedHeader] = value;
        }
        
        // Set default username if not provided
        if (!user.username && user.email) {
            user.username = user.email;
        }
        
        return user;
    }

    /**
     * Validate user data for a specific row
     * @param {Object} user - User object to validate
     * @param {number} rowNumber - Row number for error reporting
     * @returns {Object} Validation result with isValid, errors, and warnings
     */
    validateUserData(user, rowNumber) {
        const errors = [];
        const warnings = [];

        // Check required fields
        if (!user.username || user.username.trim() === '') {
            errors.push('Username is required and cannot be empty');
        }

        // Check recommended fields
        if (!user.firstName || user.firstName.trim() === '') {
            warnings.push('firstName is recommended for better user data');
        }

        if (!user.lastName || user.lastName.trim() === '') {
            warnings.push('lastName is recommended for better user data');
        }

        if (!user.email || user.email.trim() === '') {
            warnings.push('email is recommended for better user data');
        }

        // Validate email format if provided
        if (user.email && user.email.trim() !== '' && !this.isValidEmail(user.email)) {
            errors.push('Invalid email format');
        }

        // Validate username format if provided
        if (user.username && !this.isValidUsername(user.username)) {
            errors.push('Username contains invalid characters (no spaces or special characters allowed)');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Show validation summary to user
     * @param {Object} summary - Validation summary
     * @param {Array} errors - Array of errors
     * @param {Array} warnings - Array of warnings
     */
    showValidationSummary(summary, errors, warnings) {
        let message = '';
        let type = 'success';

        if (summary.invalidRows > 0) {
            type = 'error';
            message = `File validation failed!\n\n`;
            message += `• Total rows: ${summary.totalRows}\n`;
            message += `• Valid users: ${summary.validUsers}\n`;
            message += `• Invalid rows: ${summary.invalidRows}\n`;
            message += `• Warnings: ${warnings.length}\n\n`;
            
            if (summary.missingRequiredHeaders.length > 0) {
                message += `❌ Missing required headers: ${summary.missingRequiredHeaders.join(', ')}\n`;
            }
            
            if (errors.length > 0) {
                message += `❌ Data errors found in ${errors.length} row(s)\n`;
                // Show first few specific errors
                const firstErrors = errors.slice(0, 3);
                firstErrors.forEach(error => {
                    if (error.errors) {
                        message += `  Row ${error.row}: ${error.errors.join(', ')}\n`;
                    } else if (error.error) {
                        message += `  Row ${error.row}: ${error.error}\n`;
                    }
                });
                if (errors.length > 3) {
                    message += `  ... and ${errors.length - 3} more errors\n`;
                }
            }
        } else if (warnings.length > 0) {
            type = 'warning';
            message = `File loaded with warnings:\n\n`;
            message += `• Total rows: ${summary.totalRows}\n`;
            message += `• Valid users: ${summary.validUsers}\n`;
            message += `• Warnings: ${warnings.length}\n\n`;
            
            if (summary.missingRecommendedHeaders.length > 0) {
                message += `⚠️ Missing recommended headers: ${summary.missingRecommendedHeaders.join(', ')}\n`;
            }
            
            // Show first few warnings
            const firstWarnings = warnings.slice(0, 3);
            firstWarnings.forEach(warning => {
                message += `  Row ${warning.row}: ${warning.message || warning}\n`;
            });
            if (warnings.length > 3) {
                message += `  ... and ${warnings.length - 3} more warnings\n`;
            }
        } else {
            message = `File loaded successfully!\n\n`;
            message += `• Total rows: ${summary.totalRows}\n`;
            message += `• Valid users: ${summary.validUsers}\n`;
            message += `• Headers found: ${summary.availableHeaders.join(', ')}`;
        }

        // Show notification to user
        if (window.app && window.app.uiManager) {
            window.app.uiManager.showNotification(message, type);
        }

        // Log to server
        this.logger.info('CSV validation summary shown to user', {
            summary,
            message,
            type
        });
    }

    /**
     * Get header mapping for common variations
     * @param {string} header - Header to map
     * @returns {string} Mapped header name
     */
    getHeaderMapping(header) {
        const headerMap = {
            'firstname': 'firstName',
            'first_name': 'firstName',
            'givenname': 'firstName',
            'given_name': 'firstName',
            'lastname': 'lastName',
            'last_name': 'lastName',
            'familyname': 'lastName',
            'family_name': 'lastName',
            'surname': 'lastName',
            'emailaddress': 'email',
            'email_address': 'email',
            'userid': 'username',
            'user_id': 'username',
            'login': 'username',
            'user': 'username',
            'populationid': 'populationId',
            'population_id': 'populationId',
            'popid': 'populationId',
            'pop_id': 'populationId'
        };
        
        return headerMap[header] || header;
    }

    /**
     * Check if email is valid
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Check if username is valid
     * @param {string} username - Username to validate
     * @returns {boolean} True if valid
     */
    isValidUsername(username) {
        // Username should not contain spaces or special characters
        const usernameRegex = /^[a-zA-Z0-9._-]+$/;
        return usernameRegex.test(username);
    }
    
    // ======================
    // UI Updates
    // ======================
    
    /**
     * Update file info for any file info container element
     * @param {File} file - The file object
     * @param {string} containerId - The ID of the container element to update
     */
    updateFileInfoForElement(file, containerId, recordCount = null) {
        const container = document.getElementById(containerId);
        console.log('updateFileInfoForElement called:', { containerId, container: !!container, file: !!file, recordCount });
        if (!container || !file) {
            console.warn('updateFileInfoForElement: container or file is null', { containerId, hasContainer: !!container, hasFile: !!file });
            return;
        }
        
        const fileSize = this.formatFileSize(file.size);
        const lastModified = new Date(file.lastModified).toLocaleString();
        const fileType = file.type || this.getFileExtension(file.name);
        const fileExtension = this.getFileExtension(file.name);
        
        // Get file path information (if available)
        let filePath = 'Unknown';
        if (file.webkitRelativePath) {
            filePath = file.webkitRelativePath;
        } else if (file.name) {
            // Try to extract directory from file name if it contains path separators
            const pathParts = file.name.split(/[\/\\]/);
            if (pathParts.length > 1) {
                filePath = pathParts.slice(0, -1).join('/');
            } else {
                filePath = 'Current Directory';
            }
        }
        
        // Calculate additional file properties
        const isCSV = fileExtension === 'csv';
        const isText = fileExtension === 'txt';
        const isValidType = isCSV || isText || fileType === 'text/csv' || fileType === 'text/plain';
        const fileSizeInKB = Math.round(file.size / 1024);
        const fileSizeInMB = Math.round((file.size / 1024 / 1024) * 100) / 100;

        // Determine record count display
        let recordCountHTML = '';
        if (isValidType && recordCount !== null) {
            if (typeof recordCount === 'number') {
                if (recordCount > 0) {
                    recordCountHTML = `<div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;"><strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">🧾 Records</strong><span style="color: #0073C8; font-size: 0.8rem; font-weight: bold;">${recordCount}</span></div>`;
                } else {
                    recordCountHTML = `<div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;"><strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">🧾 Records</strong><span style="color: #dc3545; font-size: 0.8rem; font-weight: bold;">No user records found</span></div>`;
                }
            }
        }
        
        // Create compact file info display with reduced footprint
        const fileInfoHTML = `
            <div class="file-info-details" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 12px; margin: 8px 0; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
                
                <!-- Compact File Name Section -->
                <div class="file-name-section" style="text-align: center; margin-bottom: 12px; padding: 8px; background: #e6f4ff; border-radius: 4px; color: #1a237e; font-weight: bold; font-size: 1.1rem;">
                    <div style="font-size: 1.3rem; font-weight: 600; margin-bottom: 3px; color: #1a237e; text-shadow: none; word-break: break-word; overflow-wrap: break-word;">
                        <i class="fas fa-file-csv" style="margin-right: 6px; font-size: 1.2rem; color: #1976d2;"></i>
                        ${file.name}
                    </div>
                    <div style="font-size: 0.85rem; opacity: 0.9; font-weight: 500; color: #1976d2;">
                        File Selected Successfully
                    </div>
                </div>
                
                <!-- Compact File Information Grid -->
                <div class="file-info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 0.8em; margin-bottom: 10px;">
                    <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">📊 File Size</strong>
                        <span style="color: #6c757d; font-size: 0.8rem;">${fileSize} (${fileSizeInKB} KB, ${fileSizeInMB} MB)</span>
                    </div>
                    
                    <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">📂 Directory</strong>
                        <span style="color: #6c757d; word-break: break-all; font-size: 0.8rem;">${filePath}</span>
                    </div>
                    
                    <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">📅 Last Modified</strong>
                        <span style="color: #6c757d; font-size: 0.8rem;">${lastModified}</span>
                    </div>
                    
                    <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">🔤 File Type</strong>
                        <span style="color: #6c757d; font-size: 0.8rem;">${fileType || 'Unknown'}</span>
                    </div>
                    
                    <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">📄 Extension</strong>
                        <span style="color: ${isValidType ? '#28a745' : '#dc3545'}; font-weight: bold; font-size: 0.8rem;">
                            ${fileExtension ? '.' + fileExtension : 'None'}
                        </span>
                    </div>
                    ${recordCountHTML}
                </div>
                
                <!-- Compact File Status Section -->
                <div class="file-info-status" style="margin-top: 8px; padding: 8px; border-radius: 4px; background: ${isValidType ? '#d4edda' : '#f8d7da'}; border: 1px solid ${isValidType ? '#c3e6cb' : '#f5c6cb'}; display: flex; align-items: center; gap: 6px;">
                    <i class="fas ${isValidType ? 'fa-check-circle' : 'fa-exclamation-triangle'}" style="color: ${isValidType ? '#155724' : '#721c24'}; font-size: 1rem;"></i>
                    <span style="color: ${isValidType ? '#155724' : '#721c24'}; font-weight: bold; font-size: 0.85rem;">
                        ${isValidType ? '✅ File type is supported and ready for processing' : '⚠️ Warning: File type may not be optimal for import'}
                    </span>
                </div>
                
                ${file.size > 5 * 1024 * 1024 ? `
                <div class="file-info-warning" style="margin-top: 8px; padding: 8px; border-radius: 4px; background: #fff3cd; border: 1px solid #ffeaa7; display: flex; align-items: center; gap: 6px;">
                    <i class="fas fa-exclamation-triangle" style="color: #856404; font-size: 1rem;"></i>
                    <span style="color: #856404; font-weight: bold; font-size: 0.85rem;">Large file detected - processing may take longer than usual</span>
                </div>
                ` : ''}
                
                <!-- Responsive Design -->
                <style>
                    @media (max-width: 768px) {
                        .file-info-details .file-name-section div:first-child {
                            font-size: 1.1rem !important;
                        }
                        .file-info-grid {
                            grid-template-columns: 1fr !important;
                            gap: 6px !important;
                        }
                        .file-info-item {
                            padding: 6px !important;
                        }
                    }
                    @media (max-width: 480px) {
                        .file-info-details .file-name-section div:first-child {
                            font-size: 0.95rem !important;
                        }
                        .file-info-details {
                            padding: 8px !important;
                        }
                    }
                </style>
            </div>
        `;
        
        container.innerHTML = fileInfoHTML;
    }

    updateFileInfo(file, recordCount = null) {
        this.updateFileInfoForElement(file, 'file-info', recordCount);
    }
    
    showPreview(rows) {
        if (!this.previewContainer) return;
        
        if (!rows || rows.length === 0) {
            this.previewContainer.innerHTML = '<div class="alert alert-info">No data to display</div>';
                    // Disable import button if no rows
        const importBtnBottom = ElementRegistry.startImportBtnBottom ? ElementRegistry.startImportBtnBottom() : null;
        if (importBtnBottom) {
            importBtnBottom.disabled = true;
        }
            return;
        }
        
        const headers = Object.keys(rows[0]);
        const previewRows = rows.slice(0, 5); // Show first 5 rows
        
        let html = `
            <div class="table-responsive">
                <table class="table table-sm table-striped">
                    <thead>
                        <tr>
                            ${headers.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${previewRows.map(row => `
                            <tr>
                                ${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${rows.length > 5 ? `<small class="text-muted">Showing 5 of ${rows.length} rows</small>` : ''}
            </div>
        `;
        
        this.previewContainer.innerHTML = html;
        
        // Check if population choice has been made
        const hasPopulationChoice = this.checkPopulationChoice();
        
        // Enable import button after showing preview (only if population choice is made)
        const importBtnBottom = ElementRegistry.startImportBtnBottom ? ElementRegistry.startImportBtnBottom() : null;
        if (importBtnBottom) {
            importBtnBottom.disabled = !hasPopulationChoice;
            this.logger.log(`Import button ${hasPopulationChoice ? 'enabled' : 'disabled'}`, 'debug');
        } else {
            this.logger.warn('Could not find import button to enable', 'warn');
        }
    }
    
    /**
     * Check if user has made a population choice
     * @returns {boolean} True if a population choice has been made
     */
    checkPopulationChoice() {
        const selectedPopulationId = ElementRegistry.importPopulationSelect ? ElementRegistry.importPopulationSelect().value || '' : '';
        const useDefaultPopulation = ElementRegistry.useDefaultPopulationCheckbox ? ElementRegistry.useDefaultPopulationCheckbox().checked || false : false;
        const useCsvPopulationId = ElementRegistry.useCsvPopulationIdCheckbox ? ElementRegistry.useCsvPopulationIdCheckbox().checked || false : false;
        
        const hasSelectedPopulation = selectedPopulationId && selectedPopulationId.trim() !== '';
        
        return hasSelectedPopulation || useDefaultPopulation || useCsvPopulationId;
    }
    
    // ======================
    // Utility Methods
    // ======================
    
    getFileExtension(filename) {
        if (!filename || typeof filename !== 'string') return '';
        
        // Handle cases where filename might be a path
        const lastDot = filename.lastIndexOf('.');
        const lastSlash = Math.max(
            filename.lastIndexOf('/'),
            filename.lastIndexOf('\\')
        );
        
        // If there's no dot, or the dot is before the last slash, return empty string
        if (lastDot === -1 || lastSlash > lastDot) return '';
        
        // Extract and return the extension (without the dot)
        return filename.slice(lastDot + 1).toLowerCase().trim();
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    generateTemporaryPassword() {
        const length = 16;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]\\:;?><,./-';
        let password = '';
        
        // Ensure at least one of each character type
        password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
        password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
        password += '0123456789'[Math.floor(Math.random() * 10)];
        password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
        
        // Fill the rest of the password
        for (let i = password.length; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }
        
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    /**
     * Get parsed users for import
     * @returns {Array<Object>} Array of validated user objects
     */
    getParsedUsers() {
        this.logger.info('getParsedUsers called', {
            hasParsedUsers: !!this.parsedUsers,
            parsedUsersType: typeof this.parsedUsers,
            parsedUsersLength: this.parsedUsers ? this.parsedUsers.length : 0,
            hasLastParsedUsers: !!this.lastParsedUsers,
            lastParsedUsersType: typeof this.lastParsedUsers,
            lastParsedUsersLength: this.lastParsedUsers ? this.lastParsedUsers.length : 0
        });
        
        if (!this.parsedUsers || !Array.isArray(this.parsedUsers)) {
            this.logger.warn('No parsed users available');
            
            // Show user-friendly notification
            if (this.uiManager && this.uiManager.showNotification) {
                this.uiManager.showNotification(
                    'No CSV file has been uploaded yet. Please upload a CSV file first.',
                    'info'
                );
            }
            
            return [];
        }
        
        this.logger.info('Retrieving parsed users for import', {
            userCount: this.parsedUsers.length,
            hasUsers: this.parsedUsers.length > 0
        });
        
        return this.parsedUsers;
    }

    /**
     * Get parsing results for debugging
     * @returns {Object|null} Parsing results or null if not available
     */
    getParseResults() {
        return this.parseResults || null;
    }

    /**
     * Initialize drag-and-drop support for a drop zone element
     * @param {HTMLElement} dropZone - The drop zone element
     */
    initializeDropZone(dropZone) {
        if (!dropZone) return;
        
        // Remove any previous listeners
        dropZone.removeEventListener('dragenter', this._onDragEnter);
        dropZone.removeEventListener('dragover', this._onDragOver);
        dropZone.removeEventListener('dragleave', this._onDragLeave);
        dropZone.removeEventListener('drop', this._onDrop);

        // Bind event handlers to this instance
        this._onDragEnter = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        };
        this._onDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        };
        this._onDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
        };
        this._onDrop = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                try {
                    await this.setFile(files[0]);
                } catch (error) {
                    this.logger.error('Drag-and-drop file error', { error: error.message });
                    this.uiManager.showNotification('Failed to process dropped file: ' + error.message, 'error');
                }
            }
        };
        
        // Attach listeners
        dropZone.addEventListener('dragenter', this._onDragEnter);
        dropZone.addEventListener('dragover', this._onDragOver);
        dropZone.addEventListener('dragleave', this._onDragLeave);
        dropZone.addEventListener('drop', this._onDrop);
    }

    /**
     * Initialize global drag-and-drop prevention and routing
     * This prevents the browser from trying to open files and routes them to the app
     */
    initializeGlobalDragAndDrop() {
        // Prevent browser default behavior for file drops anywhere on the page
        const preventDefaultDragEvents = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        // Handle file drops anywhere on the document
        const handleGlobalDrop = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Remove body drag-over class
            document.body.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                const file = files[0];
                
                // Check if it's a supported file type
                const fileName = file.name || '';
                const fileExt = this.getFileExtension(fileName).toLowerCase();
                const supportedExts = ['csv', 'txt'];
                const knownBadExts = ['exe', 'js', 'png', 'jpg', 'jpeg', 'gif', 'pdf', 'zip', 'tar', 'gz'];
                
                if (fileExt && knownBadExts.includes(fileExt)) {
                    this.uiManager.showNotification(`Unsupported file type: ${fileExt}. Please upload a CSV or text file.`, 'error');
                    return;
                }
                
                // Route to appropriate handler based on current view
                const currentView = this.getCurrentView();
                let targetDropZone = null;
                
                switch (currentView) {
                    case 'import':
                        targetDropZone = document.getElementById('import-drop-zone');
                        break;
                    case 'modify':
                        targetDropZone = document.getElementById('modify-drop-zone');
                        break;
                    case 'import-dashboard':
                        targetDropZone = document.getElementById('upload-zone');
                        break;
                    default:
                        // Default to import view if no specific view is active
                        targetDropZone = document.getElementById('import-drop-zone');
                        break;
                }
                
                // Show visual feedback on the target drop zone
                if (targetDropZone) {
                    targetDropZone.classList.add('drag-over');
                    setTimeout(() => {
                        targetDropZone.classList.remove('drag-over');
                    }, 2000);
                }
                
                try {
                    await this.setFile(file);
                    this.uiManager.showNotification(`File "${file.name}" processed successfully`, 'success');
                } catch (error) {
                    this.logger.error('Global drag-and-drop file error', { error: error.message });
                    this.uiManager.showNotification('Failed to process dropped file: ' + error.message, 'error');
                }
            }
        };

        // Add visual feedback when dragging files over the document
        const handleGlobalDragEnter = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Only add visual feedback if dragging files
            if (e.dataTransfer.types.includes('Files')) {
                document.body.classList.add('drag-over');
            }
        };

        const handleGlobalDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Only remove visual feedback if leaving the document entirely
            if (e.target === document || e.target === document.body) {
                document.body.classList.remove('drag-over');
            }
        };

        // Add global event listeners
        document.addEventListener('dragover', preventDefaultDragEvents);
        document.addEventListener('dragenter', handleGlobalDragEnter);
        document.addEventListener('dragleave', handleGlobalDragLeave);
        document.addEventListener('drop', handleGlobalDrop);
        
        // Store references for cleanup
        this._globalDragHandlers = {
            preventDefaultDragEvents,
            handleGlobalDragEnter,
            handleGlobalDragLeave,
            handleGlobalDrop
        };
        
        this.logger.info('Global drag-and-drop prevention initialized');
    }

    /**
     * Clean up global drag-and-drop event listeners
     */
    cleanupGlobalDragAndDrop() {
        if (this._globalDragHandlers) {
            document.removeEventListener('dragover', this._globalDragHandlers.preventDefaultDragEvents);
            document.removeEventListener('dragenter', this._globalDragHandlers.handleGlobalDragEnter);
            document.removeEventListener('dragleave', this._globalDragHandlers.handleGlobalDragLeave);
            document.removeEventListener('drop', this._globalDragHandlers.handleGlobalDrop);
            this._globalDragHandlers = null;
        }
        
        // Remove any remaining visual feedback
        document.body.classList.remove('drag-over');
    }

    /**
     * Get the current active view
     * @returns {string} The current view name
     */
    getCurrentView() {
        const activeView = document.querySelector('.view[style*="block"]') || document.querySelector('.view:not([style*="none"])');
        if (!activeView) return 'import';
        
        const viewId = activeView.id;
        if (viewId === 'import-dashboard-view') return 'import-dashboard';
        if (viewId === 'modify-csv-view') return 'modify';
        if (viewId === 'delete-csv-view') return 'delete';
        if (viewId === 'export-view') return 'export';
        if (viewId === 'settings-view') return 'settings';
        if (viewId === 'logs-view') return 'logs';
        
        return 'import'; // Default to import view
    }
}

export { FileHandler };
