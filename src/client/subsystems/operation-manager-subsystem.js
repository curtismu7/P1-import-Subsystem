/**
 * Operation Manager Subsystem
 * 
 * Manages all CRUD operations (Import, Export, Delete, Modify) with centralized
 * orchestration, validation, progress tracking, and error handling.
 * 
 * Features:
 * - Unified operation lifecycle management
 * - Operation validation and pre-checks
 * - Progress tracking and status updates
 * - Error handling and recovery
 * - Operation queuing and concurrency control
 * - Operation history and logging
 */

import { createLogger } from '../utils/browser-logging-service.js';
import { showOperationSummary } from '../../public/js/modules/operation-summary.js';

export class OperationManagerSubsystem {
    constructor(logger, uiManager, settingsManager, apiClient) {
        this.logger = logger || createLogger({
            serviceName: 'operation-manager-subsystem',
            environment: 'development'
        });
        
        this.uiManager = uiManager;
        this.settingsManager = settingsManager;
        this.apiClient = apiClient;
        
        // Operation state
        this.currentOperation = null;
        this.operationQueue = [];
        this.operationHistory = [];
        this.isOperationRunning = false;
        
        // Operation types
        this.operationTypes = {
            IMPORT: 'import',
            EXPORT: 'export',
            DELETE: 'delete',
            MODIFY: 'modify'
        };
        
        // Operation validators
        this.validators = new Map();
        this.preChecks = new Map();
        this.postChecks = new Map();
        
        this.logger.info('Operation Manager subsystem initialized');
    }
    
    /**
     * Initialize the operation manager subsystem
     */
    async init() {
        try {
            this.logger.info('Initializing operation manager subsystem...');
            
            // Register default validators and checks
            this.registerDefaultValidators();
            this.registerDefaultPreChecks();
            this.registerDefaultPostChecks();
            
            this.logger.info('Operation Manager subsystem initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize operation manager subsystem', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Start an operation
     * @param {string} type - Operation type (import, export, delete, modify)
     * @param {Object} options - Operation options
     * @returns {Promise<Object>} - Operation result
     */
    async startOperation(type, options = {}) {
        try {
            this.logger.info('Starting operation', { type, options });
            
            // Check if operation is already running
            if (this.isOperationRunning) {
                throw new Error('Another operation is already running');
            }
            
            // Validate operation type
            if (!Object.values(this.operationTypes).includes(type)) {
                throw new Error(`Invalid operation type: ${type}`);
            }
            
            // Create operation context
            const operation = {
                id: this.generateOperationId(),
                type,
                options,
                status: 'initializing',
                startTime: Date.now(),
                endTime: null,
                progress: {
                    current: 0,
                    total: 0,
                    percentage: 0,
                    message: 'Initializing...'
                },
                result: null,
                error: null
            };
            
            this.currentOperation = operation;
            this.isOperationRunning = true;
            
            // Run pre-checks
            await this.runPreChecks(operation);
            
            // Validate operation
            await this.validateOperation(operation);
            
            // Execute operation
            const result = await this.executeOperation(operation);
            
            // Run post-checks
            await this.runPostChecks(operation);
            
            // Complete operation
            operation.status = 'completed';
            operation.endTime = Date.now();
            operation.result = result;
            
            this.logger.info('Operation completed successfully', { 
                type, 
                duration: operation.endTime - operation.startTime 
            });
            
            return result;
            
        } catch (error) {
            this.logger.error('Operation failed', { type, error: error.message });
            
            if (this.currentOperation) {
                this.currentOperation.status = 'failed';
                this.currentOperation.endTime = Date.now();
                this.currentOperation.error = error.message;
            }
            
            throw error;
        } finally {
            // Clean up
            this.finalizeOperation();
        }
    }
    
    /**
     * Execute the actual operation
     * @param {Object} operation - Operation context
     * @returns {Promise<Object>} - Operation result
     */
    async executeOperation(operation) {
        const { type, options } = operation;
        
        this.logger.debug('Executing operation', { type });
        
        switch (type) {
            case this.operationTypes.IMPORT:
                return await this.executeImport(operation);
            case this.operationTypes.EXPORT:
                return await this.executeExport(operation);
            case this.operationTypes.DELETE:
                return await this.executeDelete(operation);
            case this.operationTypes.MODIFY:
                return await this.executeModify(operation);
            default:
                throw new Error(`Unknown operation type: ${type}`);
        }
    }
    
    /**
     * Execute import operation
     * @param {Object} operation - Operation context
     * @returns {Promise<Object>} - Import result
     */
    async executeImport(operation) {
        const { options } = operation;
        
        this.logger.info('Executing import operation', { options });
        
        // Update progress
        this.updateOperationProgress(operation, 0, 100, 'Starting import...');
        
        // Prepare import data
        const importData = {
            file: options.file,
            populationId: options.populationId,
            populationName: options.populationName,
            skipDuplicates: options.skipDuplicates || false,
            updateExisting: options.updateExisting || false
        };
        
        // Start import via API
        const response = await this.apiClient.post('/api/import', importData);
        
        if (!response.success) {
            throw new Error(response.error || 'Import failed');
        }
        
        // Track progress via SSE or polling
        await this.trackOperationProgress(operation, response.sessionId);
        
        return {
            success: true,
            sessionId: response.sessionId,
            message: 'Import completed successfully'
        };
    }
    
    /**
     * Execute export operation
     * @param {Object} operation - Operation context
     * @returns {Promise<Object>} - Export result
     */
    async executeExport(operation) {
        const { options } = operation;
        
        this.logger.info('Executing export operation', { options });
        
        // Update progress
        this.updateOperationProgress(operation, 0, 100, 'Starting export...');
        
        // Prepare export data
        const exportData = {
            populationId: options.populationId,
            populationName: options.populationName,
            includeDisabled: options.includeDisabled || false,
            format: options.format || 'csv'
        };
        
        // Start export via API
        const response = await this.apiClient.post('/api/export', exportData);
        
        if (!response.success) {
            throw new Error(response.error || 'Export failed');
        }
        
        // Track progress
        await this.trackOperationProgress(operation, response.sessionId);
        
        return {
            success: true,
            sessionId: response.sessionId,
            downloadUrl: response.downloadUrl,
            message: 'Export completed successfully'
        };
    }
    
    /**
     * Execute delete operation
     * @param {Object} operation - Operation context
     * @returns {Promise<Object>} - Delete result
     */
    async executeDelete(operation) {
        const { options } = operation;
        
        this.logger.info('Executing delete operation', { options });
        
        // Update progress
        this.updateOperationProgress(operation, 0, 100, 'Starting delete...');
        
        // Prepare delete data
        const deleteData = {
            file: options.file,
            populationId: options.populationId,
            populationName: options.populationName,
            confirmDelete: true
        };
        
        // Start delete via API
        const response = await this.apiClient.post('/api/delete', deleteData);
        
        if (!response.success) {
            throw new Error(response.error || 'Delete failed');
        }
        
        // Track progress
        await this.trackOperationProgress(operation, response.sessionId);
        
        return {
            success: true,
            sessionId: response.sessionId,
            message: 'Delete completed successfully'
        };
    }
    
    /**
     * Execute modify operation
     * @param {Object} operation - Operation context
     * @returns {Promise<Object>} - Modify result
     */
    async executeModify(operation) {
        const { options } = operation;
        
        this.logger.info('Executing modify operation', { options });
        
        // Update progress
        this.updateOperationProgress(operation, 0, 100, 'Starting modify...');
        
        // Prepare modify data
        const modifyData = {
            file: options.file,
            populationId: options.populationId,
            populationName: options.populationName,
            updateFields: options.updateFields || []
        };
        
        // Start modify via API
        const response = await this.apiClient.post('/api/modify', modifyData);
        
        if (!response.success) {
            throw new Error(response.error || 'Modify failed');
        }
        
        // Track progress
        await this.trackOperationProgress(operation, response.sessionId);
        
        return {
            success: true,
            sessionId: response.sessionId,
            message: 'Modify completed successfully'
        };
    }
    
    /**
     * Track operation progress via SSE or polling
     * @param {Object} operation - Operation context
     * @param {string} sessionId - Session ID for tracking
     */
    async trackOperationProgress(operation, sessionId) {
        return new Promise((resolve, reject) => {
            // Try SSE first
            if (typeof EventSource !== 'undefined') {
                this.trackProgressViaSSE(operation, sessionId, resolve, reject);
            } else {
                // Fallback to polling
                this.trackProgressViaPolling(operation, sessionId, resolve, reject);
            }
        });
    }
    
    /**
     * Track progress via Server-Sent Events
     * @param {Object} operation - Operation context
     * @param {string} sessionId - Session ID
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    trackProgressViaSSE(operation, sessionId, resolve, reject) {
        const eventSource = new EventSource(`/api/progress/${sessionId}`);
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleProgressUpdate(operation, data);
                
                if (data.status === 'completed') {
                    eventSource.close();
                    // Display operation summary
                    if (typeof showOperationSummary === 'function') {
                        showOperationSummary(data, operation.type);
                    }
                    resolve(data);
                } else if (data.status === 'failed') {
                    eventSource.close();
                    reject(new Error(data.error || 'Operation failed'));
                }
            } catch (error) {
                this.logger.error('Error parsing SSE data', { error: error.message });
            }
        };
        
        eventSource.onerror = (error) => {
            this.logger.error('SSE connection error', { error });
            eventSource.close();
            // Fallback to polling
            this.trackProgressViaPolling(operation, sessionId, resolve, reject);
        };
    }
    
    /**
     * Track progress via polling
     * @param {Object} operation - Operation context
     * @param {string} sessionId - Session ID
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    async trackProgressViaPolling(operation, sessionId, resolve, reject) {
        const pollInterval = 1000; // 1 second
        
        const poll = async () => {
            try {
                const response = await this.apiClient.get(`/api/progress/${sessionId}`);
                
                if (response.success) {
                    this.handleProgressUpdate(operation, response.data);
                    
                    if (response.data.status === 'completed') {
                        // Display operation summary
                        if (typeof showOperationSummary === 'function') {
                            showOperationSummary(response.data, operation.type);
                        }
                        resolve(response.data);
                    } else if (response.data.status === 'failed') {
                        reject(new Error(response.data.error || 'Operation failed'));
                    } else {
                        setTimeout(poll, pollInterval);
                    }
                } else {
                    reject(new Error(response.error || 'Failed to get progress'));
                }
            } catch (error) {
                reject(error);
            }
        };
        
        poll();
    }
    
    /**
     * Handle progress update
     * @param {Object} operation - Operation context
     * @param {Object} progressData - Progress data from server
     */
    handleProgressUpdate(operation, progressData) {
        // Update operation progress
        operation.progress = {
            current: progressData.current || 0,
            total: progressData.total || 0,
            percentage: progressData.percentage || 0,
            message: progressData.message || 'Processing...'
        };
        
        // Update UI
        if (this.uiManager) {
            this.uiManager.updateProgress(
                operation.progress.current,
                operation.progress.total,
                operation.progress.message
            );
        }
        
        this.logger.debug('Progress updated', { 
            type: operation.type,
            progress: operation.progress 
        });
    }
    
    /**
     * Update operation progress
     * @param {Object} operation - Operation context
     * @param {number} current - Current progress
     * @param {number} total - Total progress
     * @param {string} message - Progress message
     */
    updateOperationProgress(operation, current, total, message) {
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        
        operation.progress = {
            current,
            total,
            percentage,
            message
        };
        
        // Update UI
        if (this.uiManager) {
            this.uiManager.updateProgress(current, total, message);
        }
        
        this.logger.debug('Operation progress updated', { 
            type: operation.type,
            progress: operation.progress 
        });
    }
    
    /**
     * Run pre-checks for operation
     * @param {Object} operation - Operation context
     */
    async runPreChecks(operation) {
        const preCheck = this.preChecks.get(operation.type);
        if (preCheck) {
            this.logger.debug('Running pre-checks', { type: operation.type });
            await preCheck(operation);
        }
    }
    
    /**
     * Validate operation
     * @param {Object} operation - Operation context
     */
    async validateOperation(operation) {
        const validator = this.validators.get(operation.type);
        if (validator) {
            this.logger.debug('Validating operation', { type: operation.type });
            await validator(operation);
        }
    }
    
    /**
     * Run post-checks for operation
     * @param {Object} operation - Operation context
     */
    async runPostChecks(operation) {
        const postCheck = this.postChecks.get(operation.type);
        if (postCheck) {
            this.logger.debug('Running post-checks', { type: operation.type });
            await postCheck(operation);
        }
    }
    
    /**
     * Finalize operation
     */
    finalizeOperation() {
        if (this.currentOperation) {
            // Add to history
            this.operationHistory.push({...this.currentOperation});
            
            // Limit history size
            if (this.operationHistory.length > 100) {
                this.operationHistory = this.operationHistory.slice(-100);
            }
            
            // Clear current operation
            this.currentOperation = null;
        }
        
        this.isOperationRunning = false;
        
        this.logger.debug('Operation finalized');
    }
    
    /**
     * Register default validators
     */
    registerDefaultValidators() {
        // Import validator
        this.validators.set(this.operationTypes.IMPORT, async (operation) => {
            const { options } = operation;
            
            if (!options.file) {
                throw new Error('No file selected for import');
            }
            
            if (!options.populationId) {
                throw new Error('No population selected for import');
            }
        });
        
        // Export validator
        this.validators.set(this.operationTypes.EXPORT, async (operation) => {
            const { options } = operation;
            
            if (!options.populationId) {
                throw new Error('No population selected for export');
            }
        });
        
        // Delete validator
        this.validators.set(this.operationTypes.DELETE, async (operation) => {
            const { options } = operation;
            
            if (!options.file) {
                throw new Error('No file selected for delete');
            }
            
            if (!options.populationId) {
                throw new Error('No population selected for delete');
            }
        });
        
        // Modify validator
        this.validators.set(this.operationTypes.MODIFY, async (operation) => {
            const { options } = operation;
            
            if (!options.file) {
                throw new Error('No file selected for modify');
            }
            
            if (!options.populationId) {
                throw new Error('No population selected for modify');
            }
        });
    }
    
    /**
     * Register default pre-checks
     */
    registerDefaultPreChecks() {
        // Common pre-check for all operations
        const commonPreCheck = async (operation) => {
            // Check token validity
            if (window.app && typeof window.app.checkTokenAndRedirect === 'function') {
                const hasValidToken = await window.app.checkTokenAndRedirect(operation.type);
                if (!hasValidToken) {
                    throw new Error('Invalid or expired token');
                }
            }
        };
        
        // Register for all operation types
        Object.values(this.operationTypes).forEach(type => {
            this.preChecks.set(type, commonPreCheck);
        });
    }
    
    /**
     * Register default post-checks
     */
    registerDefaultPostChecks() {
        // Common post-check for all operations
        const commonPostCheck = async (operation) => {
            // Log operation completion
            this.logger.info('Operation completed', {
                type: operation.type,
                duration: operation.endTime - operation.startTime,
                status: operation.status
            });
        };
        
        // Register for all operation types
        Object.values(this.operationTypes).forEach(type => {
            this.postChecks.set(type, commonPostCheck);
        });
    }
    
    /**
     * Generate unique operation ID
     * @returns {string} - Unique operation ID
     */
    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Cancel current operation
     */
    async cancelOperation() {
        if (this.currentOperation && this.isOperationRunning) {
            this.logger.info('Cancelling operation', { type: this.currentOperation.type });
            
            try {
                // Try to cancel via API
                if (this.currentOperation.sessionId) {
                    await this.apiClient.post(`/api/cancel/${this.currentOperation.sessionId}`);
                }
                
                this.currentOperation.status = 'cancelled';
                this.currentOperation.endTime = Date.now();
                
                this.logger.info('Operation cancelled successfully');
            } catch (error) {
                this.logger.error('Failed to cancel operation', { error: error.message });
            } finally {
                this.finalizeOperation();
            }
        }
    }
    
    /**
     * Get current operation status
     * @returns {Object|null} - Current operation or null
     */
    getCurrentOperation() {
        return this.currentOperation ? {...this.currentOperation} : null;
    }
    
    /**
     * Get operation history
     * @returns {Array} - Operation history
     */
    getOperationHistory() {
        return [...this.operationHistory];
    }
    
    /**
     * Check if operation is running
     * @returns {boolean} - Whether operation is running
     */
    isRunning() {
        return this.isOperationRunning;
    }
    
    /**
     * Get operation statistics
     * @returns {Object} - Operation statistics
     */
    getOperationStats() {
        const stats = {
            total: this.operationHistory.length,
            byType: {},
            byStatus: {},
            averageDuration: 0
        };
        
        let totalDuration = 0;
        
        this.operationHistory.forEach(op => {
            // By type
            if (!stats.byType[op.type]) {
                stats.byType[op.type] = 0;
            }
            stats.byType[op.type]++;
            
            // By status
            if (!stats.byStatus[op.status]) {
                stats.byStatus[op.status] = 0;
            }
            stats.byStatus[op.status]++;
            
            // Duration
            if (op.endTime && op.startTime) {
                totalDuration += (op.endTime - op.startTime);
            }
        });
        
        if (this.operationHistory.length > 0) {
            stats.averageDuration = Math.round(totalDuration / this.operationHistory.length);
        }
        
        return stats;
    }
}