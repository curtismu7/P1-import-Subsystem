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

import { createWinstonLogger } from './winston-logger.js';

export class OperationManagerSubsystem {
    constructor(logger, uiManager, settingsSubsystem, apiClient, eventBus) {
        this.logger = logger || createWinstonLogger({
            service: 'operation-manager-subsystem',
            environment: process.env.NODE_ENV || 'development'
        });
        
        this.uiManager = uiManager;
        this.settingsSubsystem = settingsSubsystem;
        this.apiClient = apiClient;
        this.eventBus = eventBus;
        
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
     * Execute delete operation with comprehensive safety checks and audit logging
     * @param {Object} operation - Operation context
     * @returns {Promise<Object>} - Delete result
     */
    async executeDelete(operation) {
        const { options } = operation;
        const sessionId = this.generateSessionId('delete');
        
        try {
            this.logger.info('Starting delete operation with enhanced safety checks', { 
                sessionId, 
                options: this.sanitizeOptionsForLogging(options) 
            });
            
            // Emit delete started event
            this.eventBus?.emit('deleteOperationStarted', { sessionId, options });
            
            // Phase 1: Pre-delete validation and safety checks
            this.updateOperationProgress(operation, 5, 100, 'Performing safety checks...');
            await this.performDeleteSafetyChecks(options);
            
            // Phase 2: User confirmation for critical operations
            this.updateOperationProgress(operation, 10, 100, 'Validating delete permissions...');
            const confirmationResult = await this.requestDeleteConfirmation(options);
            if (!confirmationResult.confirmed) {
                throw new Error('Delete operation cancelled by user');
            }
            
            // Phase 3: Create backup/rollback point
            this.updateOperationProgress(operation, 20, 100, 'Creating rollback checkpoint...');
            const rollbackInfo = await this.createDeleteRollbackPoint(options);
            
            // Phase 4: Validate prerequisites
            this.updateOperationProgress(operation, 30, 100, 'Validating prerequisites...');
            await this.validateDeletePrerequisites(options);
            
            // Phase 5: Prepare enhanced delete data
            this.updateOperationProgress(operation, 40, 100, 'Preparing delete request...');
            const deleteData = await this.prepareDeleteData(options, sessionId, rollbackInfo);
            
            // Phase 6: Execute delete operation
            this.updateOperationProgress(operation, 50, 100, 'Executing delete operation...');
            const response = await this.apiClient.post('/api/delete', deleteData);
            
            if (!response.success) {
                // Record failure and attempt rollback if needed
                await this.recordDeleteAuditLog(sessionId, options, 'failed', response.error);
                throw new Error(response.error || 'Delete operation failed');
            }
            
            // Phase 7: Track progress with enhanced monitoring
            this.updateOperationProgress(operation, 60, 100, 'Monitoring delete progress...');
            const result = await this.trackDeleteProgress(operation, response.sessionId || sessionId, rollbackInfo);
            
            // Phase 8: Post-delete validation
            this.updateOperationProgress(operation, 90, 100, 'Validating delete completion...');
            await this.validateDeleteCompletion(result, options);
            
            // Phase 9: Record success audit log
            await this.recordDeleteAuditLog(sessionId, options, 'completed', null, result);
            
            // Phase 10: Cleanup and finalization
            this.updateOperationProgress(operation, 100, 100, 'Delete completed successfully');
            
            // Emit delete completed event
            this.eventBus?.emit('deleteOperationCompleted', { sessionId, options, result });
            
            this.logger.info('Delete operation completed successfully', { 
                sessionId, 
                deletedCount: result.deletedCount || 0,
                duration: Date.now() - operation.startTime 
            });
            
            return {
                success: true,
                sessionId,
                deletedCount: result.deletedCount || 0,
                rollbackInfo,
                message: `Delete completed successfully. ${result.deletedCount || 0} users deleted.`,
                auditTrail: result.auditTrail
            };
            
        } catch (error) {
            this.logger.error('Delete operation failed', { 
                sessionId, 
                error: error.message, 
                options: this.sanitizeOptionsForLogging(options) 
            });
            
            // Record failure audit log
            await this.recordDeleteAuditLog(sessionId, options, 'failed', error.message);
            
            // Emit delete failed event
            this.eventBus?.emit('deleteOperationFailed', { sessionId, options, error: error.message });
            
            // Enhanced error handling
            await this.handleDeleteError(error, options, sessionId);
            
            throw error;
        }
    }
    
    /**
     * Perform comprehensive safety checks before delete operation
     */
    async performDeleteSafetyChecks(options) {
        const checks = [];
        
        // Check if population exists and is accessible
        if (options.populationId && options.populationId !== 'ALL') {
            try {
                const populationCheck = await this.apiClient.get(`/api/populations/${options.populationId}`);
                if (!populationCheck.success) {
                    checks.push(`Population ${options.populationId} not found or inaccessible`);
                }
            } catch (error) {
                checks.push(`Failed to validate population: ${error.message}`);
            }
        }
        
        // Check for protected populations
        const protectedPopulations = ['default', 'admin', 'system'];
        if (protectedPopulations.includes(options.populationName?.toLowerCase())) {
            checks.push(`Cannot delete users from protected population: ${options.populationName}`);
        }
        
        // Check file format and content if provided
        if (options.file) {
            const fileValidation = await this.validateDeleteFile(options.file);
            if (!fileValidation.valid) {
                checks.push(`File validation failed: ${fileValidation.error}`);
            }
        }
        
        // Check for bulk delete limits
        if (options.userCount && options.userCount > 1000) {
            checks.push(`Bulk delete limit exceeded. Maximum 1000 users per operation, requested: ${options.userCount}`);
        }
        
        if (checks.length > 0) {
            const errorMessage = 'Delete safety checks failed:\n' + checks.join('\n');
            this.logger.error('Delete safety checks failed', { checks, options });
            throw new Error(errorMessage);
        }
        
        this.logger.info('Delete safety checks passed', { options });
    }
    
    /**
     * Request user confirmation for delete operation
     */
    async requestDeleteConfirmation(options) {
        return new Promise((resolve) => {
            const userCount = options.userCount || 'unknown number of';
            const populationName = options.populationName || 'selected population';
            
            const confirmationMessage = `Are you sure you want to delete ${userCount} users from ${populationName}?\n\nThis action cannot be undone. A rollback checkpoint will be created for recovery purposes.`;
            
            // Use UIManager for confirmation dialog if available
            if (this.uiManager && typeof this.uiManager.showConfirmation === 'function') {
                this.uiManager.showConfirmation(
                    'Confirm Delete Operation',
                    confirmationMessage,
                    (confirmed) => {
                        resolve({ confirmed, timestamp: new Date().toISOString() });
                    }
                );
            } else {
                // Fallback to browser confirm
                const confirmed = confirm(confirmationMessage);
                resolve({ confirmed, timestamp: new Date().toISOString() });
            }
        });
    }
    
    /**
     * Create rollback point for delete operation
     */
    async createDeleteRollbackPoint(options) {
        try {
            const rollbackId = this.generateSessionId('rollback');
            
            // Create rollback metadata
            const rollbackInfo = {
                id: rollbackId,
                timestamp: new Date().toISOString(),
                operation: 'delete',
                populationId: options.populationId,
                populationName: options.populationName,
                userCount: options.userCount,
                createdBy: 'operation-manager-subsystem'
            };
            
            // Store rollback info in local storage for recovery
            const rollbackHistory = JSON.parse(localStorage.getItem('deleteRollbackHistory') || '[]');
            rollbackHistory.unshift(rollbackInfo);
            
            // Keep only last 10 rollback points
            if (rollbackHistory.length > 10) {
                rollbackHistory.splice(10);
            }
            
            localStorage.setItem('deleteRollbackHistory', JSON.stringify(rollbackHistory));
            
            this.logger.info('Delete rollback point created', rollbackInfo);
            return rollbackInfo;
            
        } catch (error) {
            this.logger.error('Failed to create rollback point', error);
            // Don't fail the operation for rollback creation failure
            return { id: 'fallback', timestamp: new Date().toISOString(), error: error.message };
        }
    }
    
    /**
     * Validate delete prerequisites
     */
    async validateDeletePrerequisites(options) {
        // Check authentication status
        try {
            const authStatus = await this.apiClient.get('/api/auth/status');
            if (!authStatus.success || !authStatus.authenticated) {
                throw new Error('Authentication required for delete operation');
            }
        } catch (error) {
            throw new Error(`Authentication validation failed: ${error.message}`);
        }
        
        // Check API connectivity
        try {
            const healthCheck = await this.apiClient.get('/api/health');
            if (!healthCheck.success) {
                throw new Error('API service unavailable');
            }
        } catch (error) {
            throw new Error(`API connectivity check failed: ${error.message}`);
        }
        
        this.logger.info('Delete prerequisites validated successfully');
    }
    
    /**
     * Prepare enhanced delete data
     */
    async prepareDeleteData(options, sessionId, rollbackInfo) {
        const deleteData = {
            sessionId,
            populationId: options.populationId,
            populationName: options.populationName,
            confirmDelete: true,
            rollbackId: rollbackInfo.id,
            clientInfo: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            safetyChecks: {
                performed: true,
                timestamp: new Date().toISOString()
            }
        };
        
        // Add file data if provided
        if (options.file) {
            deleteData.file = options.file;
            deleteData.fileName = options.fileName;
        }
        
        // Add user identifiers if provided
        if (options.userIds) {
            deleteData.userIds = options.userIds;
        }
        
        // Add filters if provided
        if (options.filters) {
            deleteData.filters = options.filters;
        }
        
        this.logger.debug('Delete data prepared', { sessionId, dataKeys: Object.keys(deleteData) });
        return deleteData;
    }
    
    /**
     * Track delete progress with enhanced monitoring
     */
    async trackDeleteProgress(operation, sessionId, rollbackInfo) {
        try {
            // Use enhanced progress tracking with delete-specific monitoring
            const result = await this.trackOperationProgress(operation, sessionId);
            
            // Add delete-specific result processing
            if (result && typeof result === 'object') {
                result.rollbackInfo = rollbackInfo;
                result.auditTrail = result.auditTrail || [];
                result.deletedCount = result.deletedCount || result.processedCount || 0;
            }
            
            return result;
        } catch (error) {
            this.logger.error('Delete progress tracking failed', { sessionId, error: error.message });
            throw error;
        }
    }
    
    /**
     * Validate delete completion
     */
    async validateDeleteCompletion(result, options) {
        // Verify result structure
        if (!result || typeof result !== 'object') {
            throw new Error('Invalid delete result received');
        }
        
        // Check for expected deletion count
        if (options.userCount && result.deletedCount !== undefined) {
            if (result.deletedCount < options.userCount) {
                this.logger.warn('Delete count mismatch', {
                    expected: options.userCount,
                    actual: result.deletedCount
                });
            }
        }
        
        // Verify no critical errors in audit trail
        if (result.auditTrail && Array.isArray(result.auditTrail)) {
            const criticalErrors = result.auditTrail.filter(entry => 
                entry.level === 'error' && entry.critical === true
            );
            
            if (criticalErrors.length > 0) {
                throw new Error(`Delete completed with critical errors: ${criticalErrors.map(e => e.message).join(', ')}`);
            }
        }
        
        this.logger.info('Delete completion validated successfully', {
            deletedCount: result.deletedCount,
            auditEntries: result.auditTrail?.length || 0
        });
    }
    
    /**
     * Record comprehensive audit log for delete operation
     */
    async recordDeleteAuditLog(sessionId, options, status, errorMessage = null, result = null) {
        try {
            const auditEntry = {
                sessionId,
                timestamp: new Date().toISOString(),
                operation: 'delete',
                status, // 'started', 'completed', 'failed'
                populationId: options.populationId,
                populationName: options.populationName,
                userCount: options.userCount,
                deletedCount: result?.deletedCount,
                errorMessage,
                duration: result?.duration,
                userAgent: navigator.userAgent,
                ipAddress: 'client-side', // Would be filled by server
                rollbackId: result?.rollbackInfo?.id
            };
            
            // Store in local audit log
            const auditLog = JSON.parse(localStorage.getItem('deleteAuditLog') || '[]');
            auditLog.unshift(auditEntry);
            
            // Keep only last 100 audit entries
            if (auditLog.length > 100) {
                auditLog.splice(100);
            }
            
            localStorage.setItem('deleteAuditLog', JSON.stringify(auditLog));
            
            // Send to server for centralized audit logging
            try {
                await this.apiClient.post('/api/audit/delete', auditEntry);
            } catch (serverError) {
                this.logger.warn('Failed to send audit log to server', serverError);
                // Don't fail the operation for audit logging failure
            }
            
            this.logger.info('Delete audit log recorded', { sessionId, status });
            
        } catch (error) {
            this.logger.error('Failed to record delete audit log', error);
            // Don't fail the operation for audit logging failure
        }
    }
    
    /**
     * Handle delete operation errors with recovery options
     */
    async handleDeleteError(error, options, sessionId) {
        const errorType = this.categorizeDeleteError(error);
        
        switch (errorType) {
            case 'network':
                if (this.uiManager) {
                    this.uiManager.showError('Network Error', 
                        'Delete failed due to network issues. The operation may have been partially completed. Check the audit log for details.');
                }
                break;
            case 'authentication':
                if (this.uiManager) {
                    this.uiManager.showError('Authentication Error', 
                        'Your session has expired. Please re-authenticate and check if the delete operation completed.');
                }
                // Emit token refresh request
                this.eventBus?.emit('tokenRefreshRequired', { source: 'delete', sessionId });
                break;
            case 'validation':
                if (this.uiManager) {
                    this.uiManager.showError('Validation Error', 
                        `Delete operation failed validation: ${error.message}`);
                }
                break;
            case 'safety':
                if (this.uiManager) {
                    this.uiManager.showError('Safety Check Failed', 
                        `Delete operation blocked by safety checks: ${error.message}`);
                }
                break;
            case 'server':
                if (this.uiManager) {
                    this.uiManager.showError('Server Error', 
                        'Delete failed due to a server error. Check the audit log and consider using rollback if needed.');
                }
                break;
            default:
                if (this.uiManager) {
                    this.uiManager.showError('Delete Error', 
                        `Delete operation failed: ${error.message}`);
                }
        }
        
        // Offer rollback option for certain error types
        if (['network', 'server'].includes(errorType)) {
            this.offerRollbackOption(sessionId, options);
        }
    }
    
    /**
     * Categorize delete errors for appropriate handling
     */
    categorizeDeleteError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
            return 'network';
        } else if (message.includes('unauthorized') || message.includes('token') || message.includes('expired')) {
            return 'authentication';
        } else if (message.includes('validation') || message.includes('invalid') || message.includes('format')) {
            return 'validation';
        } else if (message.includes('safety') || message.includes('protected') || message.includes('limit')) {
            return 'safety';
        } else if (message.includes('server') || message.includes('internal') || message.includes('500')) {
            return 'server';
        }
        
        return 'unknown';
    }
    
    /**
     * Offer rollback option to user
     */
    offerRollbackOption(sessionId, options) {
        if (this.uiManager && typeof this.uiManager.showConfirmation === 'function') {
            this.uiManager.showConfirmation(
                'Rollback Available',
                'The delete operation may have been partially completed. Would you like to attempt a rollback?',
                (confirmed) => {
                    if (confirmed) {
                        this.initiateDeleteRollback(sessionId, options);
                    }
                }
            );
        }
    }
    
    /**
     * Initiate delete rollback operation
     */
    async initiateDeleteRollback(sessionId, options) {
        try {
            this.logger.info('Initiating delete rollback', { sessionId });
            
            // This would typically call a rollback API endpoint
            const rollbackResponse = await this.apiClient.post('/api/delete/rollback', {
                sessionId,
                timestamp: new Date().toISOString()
            });
            
            if (rollbackResponse.success) {
                if (this.uiManager) {
                    this.uiManager.showSuccess('Rollback Initiated', 
                        'Delete rollback has been initiated. Check the audit log for progress.');
                }
            } else {
                throw new Error(rollbackResponse.error || 'Rollback failed');
            }
            
        } catch (error) {
            this.logger.error('Delete rollback failed', error);
            if (this.uiManager) {
                this.uiManager.showError('Rollback Failed', 
                    `Failed to initiate rollback: ${error.message}`);
            }
        }
    }
    
    /**
     * Validate delete file format and content
     */
    async validateDeleteFile(file) {
        try {
            // Check file type
            const allowedTypes = ['text/csv', 'application/csv', 'text/plain'];
            if (!allowedTypes.includes(file.type)) {
                return { valid: false, error: `Invalid file type: ${file.type}. Only CSV files are allowed.` };
            }
            
            // Check file size (max 10MB)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                return { valid: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 10MB.` };
            }
            
            // Basic content validation
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length === 0) {
                return { valid: false, error: 'File is empty' };
            }
            
            if (lines.length > 10000) {
                return { valid: false, error: `Too many entries: ${lines.length}. Maximum 10,000 entries per file.` };
            }
            
            // Check for required headers (basic validation)
            const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
            const requiredHeaders = ['email', 'username', 'id'];
            const hasRequiredHeader = requiredHeaders.some(header => 
                headers.some(h => h.includes(header))
            );
            
            if (!hasRequiredHeader) {
                return { valid: false, error: 'File must contain at least one of: email, username, or id column' };
            }
            
            return { valid: true, lineCount: lines.length - 1 }; // Subtract header
            
        } catch (error) {
            return { valid: false, error: `File validation error: ${error.message}` };
        }
    }
    
    /**
     * Generate session ID for operations
     */
    generateSessionId(prefix = 'op') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Sanitize options for logging (remove sensitive data)
     */
    sanitizeOptionsForLogging(options) {
        const sanitized = { ...options };
        
        // Remove or mask sensitive fields
        if (sanitized.file) {
            sanitized.file = '[FILE_OBJECT]';
        }
        
        if (sanitized.userIds && Array.isArray(sanitized.userIds)) {
            sanitized.userIds = `[${sanitized.userIds.length} user IDs]`;
        }
        
        return sanitized;
    }
    
    /**
     * Execute modify operation with comprehensive conflict detection and data integrity validation
     * @param {Object} operation - Operation context
     * @returns {Promise<Object>} - Modify result
     */
    async executeModify(operation) {
        const { options } = operation;
        const sessionId = this.generateSessionId('modify');
        
        try {
            this.logger.info('Starting modify operation with enhanced validation', { 
                sessionId, 
                options: this.sanitizeOptionsForLogging(options) 
            });
            
            // Emit modify started event
            this.eventBus?.emit('modifyOperationStarted', { sessionId, options });
            
            // Phase 1: Pre-modify validation and safety checks
            this.updateOperationProgress(operation, 5, 100, 'Performing modify safety checks...');
            await this.performModifySafetyChecks(options);
            
            // Phase 2: Data validation and conflict detection
            this.updateOperationProgress(operation, 15, 100, 'Validating modification data...');
            const validationResult = await this.validateModifyData(options);
            
            // Phase 3: Preview generation and conflict analysis
            this.updateOperationProgress(operation, 25, 100, 'Analyzing potential conflicts...');
            const previewResult = await this.generateModifyPreview(options, validationResult);
            
            // Phase 4: User confirmation for modifications with conflicts
            if (previewResult.hasConflicts || previewResult.affectedCount > 100) {
                this.updateOperationProgress(operation, 30, 100, 'Requesting user confirmation...');
                const confirmationResult = await this.requestModifyConfirmation(options, previewResult);
                if (!confirmationResult.confirmed) {
                    throw new Error('Modify operation cancelled by user');
                }
            }
            
            // Phase 5: Create backup/rollback point
            this.updateOperationProgress(operation, 35, 100, 'Creating data backup...');
            const rollbackInfo = await this.createModifyRollbackPoint(options, previewResult);
            
            // Phase 6: Validate prerequisites
            this.updateOperationProgress(operation, 45, 100, 'Validating prerequisites...');
            await this.validateModifyPrerequisites(options);
            
            // Phase 7: Prepare enhanced modify data
            this.updateOperationProgress(operation, 50, 100, 'Preparing modification request...');
            const modifyData = await this.prepareModifyData(options, sessionId, rollbackInfo, previewResult);
            
            // Phase 8: Execute modify operation
            this.updateOperationProgress(operation, 60, 100, 'Executing modifications...');
            const response = await this.apiClient.post('/api/modify', modifyData);
            
            if (!response.success) {
                // Record failure and attempt rollback if needed
                await this.recordModifyAuditLog(sessionId, options, 'failed', response.error);
                throw new Error(response.error || 'Modify operation failed');
            }
        
        // Phase 9: Track progress with enhanced monitoring
        this.updateOperationProgress(operation, 70, 100, 'Monitoring modification progress...');
        const result = await this.trackModifyProgress(operation, response.sessionId || sessionId, rollbackInfo);
        
        // Phase 10: Post-modify validation and integrity checks
        this.updateOperationProgress(operation, 90, 100, 'Validating modification completion...');
        await this.validateModifyCompletion(result, options, previewResult);
        
        // Phase 11: Record success audit log
        await this.recordModifyAuditLog(sessionId, options, 'completed', null, result);
        
        // Phase 12: Cleanup and finalization
        this.updateOperationProgress(operation, 100, 100, 'Modify completed successfully');
        
        // Emit modify completed event
        this.eventBus?.emit('modifyOperationCompleted', { sessionId, options, result });
        
        this.logger.info('Modify operation completed successfully', { 
            sessionId, 
            modifiedCount: result.modifiedCount || 0,
            conflictsResolved: result.conflictsResolved || 0,
            duration: Date.now() - operation.startTime 
        });
        
        return {
            success: true,
            sessionId,
            modifiedCount: result.modifiedCount || 0,
            conflictsResolved: result.conflictsResolved || 0,
            rollbackInfo,
            previewResult,
            message: `Modify completed successfully. ${result.modifiedCount || 0} users modified.`,
            auditTrail: result.auditTrail
        };
        
    } catch (error) {
        this.logger.error('Modify operation failed', { 
            sessionId, 
            error: error.message, 
            options: this.sanitizeOptionsForLogging(options) 
        });
        
        // Record failure audit log
        await this.recordModifyAuditLog(sessionId, options, 'failed', error.message);
        
        // Emit modify failed event
        this.eventBus?.emit('modifyOperationFailed', { sessionId, options, error: error.message });
        
        // Enhanced error handling
        await this.handleModifyError(error, options, sessionId);
        
        throw error;
    }
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