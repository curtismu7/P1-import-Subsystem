/**
 * Modify Operation Support Methods
 * Comprehensive methods for modify operations including safety checks, conflict detection,
 * preview generation, and data integrity validation
 */

/**
 * Perform comprehensive safety checks before modify operation
 */
async function performModifySafetyChecks(options) {
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
        checks.push(`Cannot modify users in protected population: ${options.populationName}`);
    }
    
    // Check file format and content if provided
    if (options.file) {
        const fileValidation = await this.validateModifyFile(options.file);
        if (!fileValidation.valid) {
            checks.push(`File validation failed: ${fileValidation.error}`);
        }
    }
    
    // Check for bulk modify limits
    if (options.userCount && options.userCount > 5000) {
        checks.push(`Bulk modify limit exceeded. Maximum 5000 users per operation, requested: ${options.userCount}`);
    }
    
    // Validate update fields
    if (!options.updateFields || options.updateFields.length === 0) {
        checks.push('No update fields specified for modify operation');
    }
    
    // Check for protected fields
    const protectedFields = ['id', 'username', 'email', 'createdAt'];
    const attemptingProtectedFields = options.updateFields?.filter(field => 
        protectedFields.includes(field.name?.toLowerCase())
    );
    
    if (attemptingProtectedFields && attemptingProtectedFields.length > 0) {
        checks.push(`Cannot modify protected fields: ${attemptingProtectedFields.map(f => f.name).join(', ')}`);
    }
    
    if (checks.length > 0) {
        const errorMessage = 'Modify safety checks failed:\n' + checks.join('\n');
        this.logger.error('Modify safety checks failed', { checks, options });
        throw new Error(errorMessage);
    }
    
    this.logger.info('Modify safety checks passed', { options });
}

/**
 * Validate modify data and detect potential issues
 */
async function validateModifyData(options) {
    const validationResult = {
        valid: true,
        errors: [],
        warnings: [],
        fieldValidation: {},
        dataQuality: {}
    };
    
    // Validate update fields structure
    if (options.updateFields) {
        for (const field of options.updateFields) {
            const fieldValidation = await this.validateUpdateField(field);
            validationResult.fieldValidation[field.name] = fieldValidation;
            
            if (!fieldValidation.valid) {
                validationResult.errors.push(`Field ${field.name}: ${fieldValidation.error}`);
                validationResult.valid = false;
            }
            
            if (fieldValidation.warnings && fieldValidation.warnings.length > 0) {
                validationResult.warnings.push(...fieldValidation.warnings.map(w => `Field ${field.name}: ${w}`));
            }
        }
    }
    
    // Validate file data if provided
    if (options.file) {
        const fileValidation = await this.validateModifyFileData(options.file);
        validationResult.dataQuality = fileValidation;
        
        if (!fileValidation.valid) {
            validationResult.errors.push(`File data validation failed: ${fileValidation.error}`);
            validationResult.valid = false;
        }
    }
    
    // Check for data consistency
    const consistencyCheck = await this.checkDataConsistency(options);
    if (!consistencyCheck.consistent) {
        validationResult.warnings.push(...consistencyCheck.issues);
    }
    
    this.logger.info('Modify data validation completed', {
        valid: validationResult.valid,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length
    });
    
    return validationResult;
}

/**
 * Generate modify preview with conflict analysis
 */
async function generateModifyPreview(options, validationResult) {
    const previewResult = {
        affectedCount: 0,
        hasConflicts: false,
        conflicts: [],
        changes: [],
        estimatedDuration: 0,
        riskLevel: 'low'
    };
    
    try {
        // Get preview from API
        const previewRequest = {
            populationId: options.populationId,
            updateFields: options.updateFields,
            file: options.file,
            previewOnly: true
        };
        
        const response = await this.apiClient.post('/api/modify/preview', previewRequest);
        
        if (response.success && response.preview) {
            previewResult.affectedCount = response.preview.affectedCount || 0;
            previewResult.changes = response.preview.changes || [];
            previewResult.estimatedDuration = response.preview.estimatedDuration || 0;
            
            // Analyze conflicts
            if (response.preview.conflicts && response.preview.conflicts.length > 0) {
                previewResult.hasConflicts = true;
                previewResult.conflicts = response.preview.conflicts;
                previewResult.riskLevel = 'high';
            } else if (previewResult.affectedCount > 1000) {
                previewResult.riskLevel = 'medium';
            }
        }
        
        // Add validation warnings to conflicts
        if (validationResult.warnings && validationResult.warnings.length > 0) {
            previewResult.conflicts.push(...validationResult.warnings.map(warning => ({
                type: 'validation_warning',
                message: warning,
                severity: 'warning'
            })));
        }
        
        this.logger.info('Modify preview generated', {
            affectedCount: previewResult.affectedCount,
            hasConflicts: previewResult.hasConflicts,
            conflictCount: previewResult.conflicts.length,
            riskLevel: previewResult.riskLevel
        });
        
    } catch (error) {
        this.logger.error('Failed to generate modify preview', error);
        // Continue with basic preview
        previewResult.conflicts.push({
            type: 'preview_error',
            message: `Failed to generate preview: ${error.message}`,
            severity: 'error'
        });
        previewResult.hasConflicts = true;
        previewResult.riskLevel = 'high';
    }
    
    return previewResult;
}

/**
 * Request user confirmation for modify operation
 */
async function requestModifyConfirmation(options, previewResult) {
    return new Promise((resolve) => {
        const affectedCount = previewResult.affectedCount || 'unknown number of';
        const populationName = options.populationName || 'selected population';
        const conflictCount = previewResult.conflicts.length;
        
        let confirmationMessage = `Are you sure you want to modify ${affectedCount} users in ${populationName}?\n\n`;
        
        if (previewResult.hasConflicts) {
            confirmationMessage += `⚠️ ${conflictCount} potential conflicts detected:\n`;
            previewResult.conflicts.slice(0, 3).forEach(conflict => {
                confirmationMessage += `• ${conflict.message}\n`;
            });
            if (conflictCount > 3) {
                confirmationMessage += `• ... and ${conflictCount - 3} more conflicts\n`;
            }
            confirmationMessage += '\n';
        }
        
        confirmationMessage += `Risk Level: ${previewResult.riskLevel.toUpperCase()}\n`;
        confirmationMessage += `Estimated Duration: ${Math.ceil(previewResult.estimatedDuration / 60)} minutes\n\n`;
        confirmationMessage += 'A backup will be created before proceeding.';
        
        // Use UIManager for confirmation dialog if available
        if (this.uiManager && typeof this.uiManager.showConfirmation === 'function') {
            this.uiManager.showConfirmation(
                'Confirm Modify Operation',
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
 * Create rollback point for modify operation
 */
async function createModifyRollbackPoint(options, previewResult) {
    try {
        const rollbackId = this.generateSessionId('modify_rollback');
        
        // Create rollback metadata
        const rollbackInfo = {
            id: rollbackId,
            timestamp: new Date().toISOString(),
            operation: 'modify',
            populationId: options.populationId,
            populationName: options.populationName,
            affectedCount: previewResult.affectedCount,
            updateFields: options.updateFields,
            createdBy: 'operation-manager-subsystem'
        };
        
        // Store rollback info in local storage for recovery
        const rollbackHistory = JSON.parse(localStorage.getItem('modifyRollbackHistory') || '[]');
        rollbackHistory.unshift(rollbackInfo);
        
        // Keep only last 10 rollback points
        if (rollbackHistory.length > 10) {
            rollbackHistory.splice(10);
        }
        
        localStorage.setItem('modifyRollbackHistory', JSON.stringify(rollbackHistory));
        
        this.logger.info('Modify rollback point created', rollbackInfo);
        return rollbackInfo;
        
    } catch (error) {
        this.logger.error('Failed to create modify rollback point', error);
        // Don't fail the operation for rollback creation failure
        return { id: 'fallback', timestamp: new Date().toISOString(), error: error.message };
    }
}

/**
 * Validate modify prerequisites
 */
async function validateModifyPrerequisites(options) {
    // Check authentication status
    try {
        const authStatus = await this.apiClient.get('/api/auth/status');
        if (!authStatus.success || !authStatus.authenticated) {
            throw new Error('Authentication required for modify operation');
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
    
    // Verify modify permissions
    try {
        const permissionCheck = await this.apiClient.get('/api/permissions/modify');
        if (!permissionCheck.success || !permissionCheck.hasPermission) {
            throw new Error('Insufficient permissions for modify operation');
        }
    } catch (error) {
        this.logger.warn('Could not verify modify permissions', error);
        // Continue with operation but log warning
    }
    
    this.logger.info('Modify prerequisites validated successfully');
}

/**
 * Prepare enhanced modify data
 */
async function prepareModifyData(options, sessionId, rollbackInfo, previewResult) {
    const modifyData = {
        sessionId,
        populationId: options.populationId,
        populationName: options.populationName,
        updateFields: options.updateFields,
        rollbackId: rollbackInfo.id,
        previewId: previewResult.previewId,
        clientInfo: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        safetyChecks: {
            performed: true,
            timestamp: new Date().toISOString()
        },
        conflictResolution: {
            strategy: options.conflictStrategy || 'skip',
            overrideConflicts: options.overrideConflicts || false
        }
    };
    
    // Add file data if provided
    if (options.file) {
        modifyData.file = options.file;
        modifyData.fileName = options.fileName;
    }
    
    // Add user identifiers if provided
    if (options.userIds) {
        modifyData.userIds = options.userIds;
    }
    
    // Add filters if provided
    if (options.filters) {
        modifyData.filters = options.filters;
    }
    
    this.logger.debug('Modify data prepared', { sessionId, dataKeys: Object.keys(modifyData) });
    return modifyData;
}

// Export all methods for use in OperationManagerSubsystem
export {
    performModifySafetyChecks,
    validateModifyData,
    generateModifyPreview,
    requestModifyConfirmation,
    createModifyRollbackPoint,
    validateModifyPrerequisites,
    prepareModifyData
};
