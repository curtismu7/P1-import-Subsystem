/**
 * Delete Manager - Enhanced delete functionality with full environment deletion, confirmation, and logging
 * Handles file-based, population-based, and full environment user deletion
 */

class DeleteManager {
    constructor() {
        this.currentDeleteType = 'file';
        this.selectedFile = null;
        this.selectedPopulation = null;
        this.isEnvironmentDeleteConfirmed = false;
        this.isStandardDeleteConfirmed = false;
        this.deleteTextConfirmation = '';
        this.logger = console;
        
        // Only initialize if we're on a page with delete functionality
        if (document.getElementById('delete-file-section') || 
            document.getElementById('delete-population-section') || 
            document.getElementById('delete-environment-section') ||
            document.getElementById('start-delete')) {
            try {
                this.initializeEventListeners();
                this.loadPopulations();
            } catch (error) {
                console.warn('DeleteManager initialization warning:', error);
            }
        }
    }

    initializeEventListeners() {
        // Delete type selection
        document.querySelectorAll('input[name="delete-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentDeleteType = e.target.value;
                this.updateDeleteSections();
                this.updateConfirmationSections();
                this.validateDeleteButton();
                this.logDeleteTypeChange();
            });
        });

        // File upload for delete
        const deleteFileInput = document.getElementById('delete-csv-file');
        const deleteDropZone = document.getElementById('delete-drop-zone');
        
        if (deleteFileInput) {
            deleteFileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files[0]);
            });
        }

        if (deleteDropZone) {
            this.setupDragAndDrop(deleteDropZone, deleteFileInput);
        }

        // Population selection
        const populationSelect = document.getElementById('delete-population-select');
        const apiUrlDisplay = document.getElementById('delete-population-api-url');
        if (populationSelect) {
            populationSelect.addEventListener('change', (e) => {
                this.selectedPopulation = e.target.value;
                this.validateDeleteButton();
                this.logPopulationSelection();
                // Show API URL
                if (apiUrlDisplay) {
                    const envId = window.globalTokenManager?.getEnvironmentId?.() || window.environmentId || '';
                    if (this.selectedPopulation && envId) {
                        apiUrlDisplay.innerHTML = `<span>PingOne API URL: <code>https://api.pingone.com/v1/environments/${envId}/populations/${this.selectedPopulation}</code></span>`;
                    } else {
                        apiUrlDisplay.innerHTML = '';
                    }
                }
            });
        }

        // Standard confirmation
        const confirmDeleteCheckbox = document.getElementById('confirm-delete');
        if (confirmDeleteCheckbox) {
            confirmDeleteCheckbox.addEventListener('change', (e) => {
                this.isStandardDeleteConfirmed = e.target.checked;
                this.validateDeleteButton();
                this.logConfirmationChange('standard', e.target.checked);
            });
        }

        // Environment confirmation
        const confirmEnvironmentCheckbox = document.getElementById('confirm-environment-delete');
        const environmentDeleteText = document.getElementById('environment-delete-text');
        
        if (confirmEnvironmentCheckbox) {
            confirmEnvironmentCheckbox.addEventListener('change', (e) => {
                this.isEnvironmentDeleteConfirmed = e.target.checked;
                this.validateDeleteButton();
                this.logConfirmationChange('environment', e.target.checked);
            });
        }

        if (environmentDeleteText) {
            environmentDeleteText.addEventListener('input', (e) => {
                this.deleteTextConfirmation = e.target.value;
                this.validateDeleteButton();
                this.logTextConfirmationChange();
            });
        }

        // Start delete button
        const startDeleteBtn = document.getElementById('start-delete');
        if (startDeleteBtn) {
            startDeleteBtn.addEventListener('click', () => {
                this.startDelete();
            });
        }
    }

    setupDragAndDrop(dropZone, fileInput) {
        // Prevent default browser behavior for all drag events
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Add visual feedback for drag events
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('dragover');
                this.logDragEvent('dragenter');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('dragover');
                if (eventName === 'drop') {
                    this.logDragEvent('drop');
                }
            });
        });

        // Handle file drop
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
                if (fileInput) {
                    fileInput.files = files;
                }
            }
        });

        // Handle click to browse
        dropZone.addEventListener('click', () => {
            if (fileInput) {
                fileInput.click();
            }
        });

        // Add keyboard accessibility
        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (fileInput) {
                    fileInput.click();
                }
            }
        });
    }

    handleFileSelection(file) {
        if (!file) return;

        this.logFileSelection(file);
        this.selectedFile = file;
        this.displayFileInfo(file);
        this.validateDeleteButton();
    }

    displayFileInfo(file) {
        const fileInfo = document.getElementById('delete-file-info');
        if (!fileInfo) return;

        const fileSize = (file.size / 1024).toFixed(2);
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (fileExtension !== 'csv' && fileExtension !== 'txt') {
            fileInfo.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Invalid file type:</strong> Please select a CSV or TXT file.
                </div>
            `;
            this.selectedFile = null;
            this.logFileValidationError('Invalid file type', fileExtension);
            return;
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            fileInfo.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>File too large:</strong> Please select a file smaller than 10MB.
                </div>
            `;
            this.selectedFile = null;
            this.logFileValidationError('File too large', file.size);
            return;
        }

        fileInfo.innerHTML = `
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">
                    <span>Size: ${fileSize} KB</span>
                    <span>Type: ${fileExtension.toUpperCase()}</span>
                </div>
            </div>
        `;
        
        this.logFileValidationSuccess(file);
    }

    async loadPopulations() {
        try {
            // Check if population select element exists before loading
            const populationSelect = document.getElementById('delete-population-select');
            if (!populationSelect) {
                console.log('Delete population select not found, skipping population load');
                return;
            }
            
            this.logPopulationLoadStart();
            
            // Try to use the modern PopulationSubsystem first
            if (window.app && window.app.populationSubsystem) {
                try {
                    const populations = await window.app.populationSubsystem.loadPopulations();
                    if (Array.isArray(populations) && populations.length > 0) {
                        this.populatePopulationSelect(populations);
                        this.logPopulationLoadSuccess(populations.length);
                        return;
                    }
                } catch (error) {
                    console.warn('Failed to load populations via PopulationSubsystem, falling back to direct API:', error);
                }
            }
            
            // Fallback to direct API call if PopulationSubsystem is not available
            const response = await fetch('/api/populations');
            if (response.ok) {
                const data = await response.json();
                // Handle the API response structure: { success: true, populations: [...], total: 123 }
                const populations = data.populations || data;
                if (Array.isArray(populations)) {
                    this.populatePopulationSelect(populations);
                    this.logPopulationLoadSuccess(populations.length);
                } else {
                    console.error('Invalid populations data format:', populations);
                    this.logPopulationLoadError('Invalid populations data format');
                }
            } else {
                console.error('Failed to load populations');
                this.logPopulationLoadError('Failed to load populations');
            }
        } catch (error) {
            console.error('Error loading populations:', error);
            this.logPopulationLoadError(error.message);
        }
    }

    populatePopulationSelect(populations) {
        const select = document.getElementById('delete-population-select');
        if (!select) return;

        select.innerHTML = '<option value="">Select a population...</option>';
        
        populations.forEach(population => {
            const option = document.createElement('option');
            option.value = population.id;
            option.textContent = population.name;
            select.appendChild(option);
        });
    }

    updateDeleteSections() {
        const sections = {
            'file': document.getElementById('delete-file-section'),
            'population': document.getElementById('delete-population-section'),
            'environment': document.getElementById('delete-environment-section')
        };

        Object.keys(sections).forEach(type => {
            if (sections[type]) {
                sections[type].style.display = type === this.currentDeleteType ? 'block' : 'none';
            }
        });
    }

    updateConfirmationSections() {
        const standardConfirmation = document.getElementById('standard-confirmation');
        const environmentConfirmation = document.getElementById('environment-confirmation');

        if (standardConfirmation) {
            standardConfirmation.style.display = this.currentDeleteType === 'environment' ? 'none' : 'block';
        }

        if (environmentConfirmation) {
            environmentConfirmation.style.display = this.currentDeleteType === 'environment' ? 'block' : 'none';
        }
    }

    validateDeleteButton() {
        const startDeleteBtn = document.getElementById('start-delete');
        if (!startDeleteBtn) return;

        let isValid = false;

        switch (this.currentDeleteType) {
            case 'file':
                isValid = this.selectedFile && this.isStandardDeleteConfirmed;
                break;
            case 'population':
                isValid = this.selectedPopulation && this.isStandardDeleteConfirmed;
                break;
            case 'environment':
                isValid = this.isEnvironmentDeleteConfirmed && 
                         this.deleteTextConfirmation === 'DELETE ALL';
                break;
        }

        startDeleteBtn.disabled = !isValid;
        this.logButtonValidation(isValid);
    }

    async startDelete() {
        const startDeleteBtn = document.getElementById('start-delete');
        if (startDeleteBtn) {
            startDeleteBtn.disabled = true;
            startDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting Delete...';
        }

        try {
            let deleteData = {
                type: this.currentDeleteType,
                skipNotFound: document.getElementById('delete-skip-not-found')?.checked || false
            };

            switch (this.currentDeleteType) {
                case 'file':
                    deleteData.file = this.selectedFile;
                    break;
                case 'population':
                    deleteData.populationId = this.selectedPopulation;
                    break;
                case 'environment':
                    deleteData.confirmation = this.deleteTextConfirmation;
                    break;
            }

            this.logDeleteStart(deleteData);
            await this.performDelete(deleteData);
        } catch (error) {
            console.error('Delete failed:', error);
            this.showError('Delete operation failed. Please try again.');
            this.logDeleteError(error);
        } finally {
            if (startDeleteBtn) {
                startDeleteBtn.disabled = false;
                startDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Start Delete';
            }
        }
    }

    async performDelete(deleteData) {
        // Validate delete data
        if (!deleteData || !deleteData.type) {
            throw new Error('Invalid delete data: type is required');
        }

        // Validate based on delete type
        switch (deleteData.type) {
            case 'file':
                if (!deleteData.file) {
                    throw new Error('File is required for file-based deletion');
                }
                break;
            case 'population':
                if (!deleteData.populationId) {
                    throw new Error('Population ID is required for population-based deletion');
                }
                break;
            case 'environment':
                if (deleteData.confirmation !== 'DELETE ALL') {
                    throw new Error('Environment deletion requires "DELETE ALL" confirmation');
                }
                break;
            default:
                throw new Error('Invalid delete type');
        }

        const formData = new FormData();
        formData.append('type', deleteData.type);
        formData.append('skipNotFound', deleteData.skipNotFound);

        if (deleteData.file) {
            formData.append('file', deleteData.file);
        }

        if (deleteData.populationId) {
            formData.append('populationId', deleteData.populationId);
        }

        if (deleteData.confirmation) {
            formData.append('confirmation', deleteData.confirmation);
        }

        const response = await fetch('/api/delete-users', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorMessage = 'Delete operation failed';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
                console.error('Delete API error:', errorData);
            } catch (parseError) {
                console.error('Failed to parse error response:', parseError);
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        this.showSuccess(`Delete operation completed successfully. ${result.deletedCount} users deleted.`);
        
        // Log the delete operation
        this.logDeleteOperation(deleteData, result);
    }

    logDeleteOperation(deleteData, result) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: 'DELETE_USERS',
            type: deleteData.type,
            scope: this.getDeleteScope(deleteData),
            metadata: this.getDeleteMetadata(deleteData),
            result: {
                deletedCount: result.deletedCount,
                skippedCount: result.skippedCount || 0,
                errors: result.errors || []
            }
        };

        // Send to logging system with proper error handling
        try {
            if (window.logManager && typeof window.logManager.log === 'function') {
                window.logManager.log('DELETE', 'User deletion completed', logEntry);
            } else {
                // Fallback logging if logManager is not available
                console.log('Delete operation logged:', logEntry);
            }
        } catch (error) {
            // Graceful fallback if logging fails
            console.log('Delete operation logged (fallback):', logEntry);
        }
    }

    getDeleteScope(deleteData) {
        switch (deleteData.type) {
            case 'file':
                return 'FILE_BASED';
            case 'population':
                return 'POPULATION_BASED';
            case 'environment':
                return 'FULL_ENVIRONMENT';
            default:
                return 'UNKNOWN';
        }
    }

    getDeleteMetadata(deleteData) {
        const metadata = {
            skipNotFound: deleteData.skipNotFound
        };

        switch (deleteData.type) {
            case 'file':
                metadata.fileName = deleteData.file?.name;
                metadata.fileSize = deleteData.file?.size;
                break;
            case 'population':
                metadata.populationId = deleteData.populationId;
                break;
            case 'environment':
                metadata.confirmationProvided = !!deleteData.confirmation;
                break;
        }

        return metadata;
    }

    // Enhanced logging methods
    logDeleteTypeChange() {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'Delete type changed', {
                type: this.currentDeleteType,
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('Delete type changed:', { type: this.currentDeleteType, timestamp: new Date().toISOString() });
        }
    }

    logFileSelection(file) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'File selected for deletion', {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('File selected for deletion:', { fileName: file.name, fileSize: file.size, fileType: file.type });
        }
    }

    logFileValidationError(error, details) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('warn', 'File validation failed', {
                error: error,
                details: details,
                timestamp: new Date().toISOString()
            });
        } else {
            console.warn('File validation failed:', { error, details, timestamp: new Date().toISOString() });
        }
    }

    logFileValidationSuccess(file) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'File validation successful', {
                fileName: file.name,
                fileSize: file.size,
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('File validation successful:', { fileName: file.name, fileSize: file.size, timestamp: new Date().toISOString() });
        }
    }

    logDragEvent(eventType) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('debug', 'Drag event', {
                eventType: eventType,
                timestamp: new Date().toISOString()
            });
        } else {
            console.debug('Drag event:', { eventType, timestamp: new Date().toISOString() });
        }
    }

    logPopulationLoadStart() {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'Loading populations for delete', {
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('Loading populations for delete:', { timestamp: new Date().toISOString() });
        }
    }

    logPopulationLoadSuccess(count) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'Populations loaded successfully', {
                count: count,
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('Populations loaded successfully:', { count, timestamp: new Date().toISOString() });
        }
    }

    logPopulationLoadError(error) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('error', 'Failed to load populations', {
                error: error,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error('Failed to load populations:', { error, timestamp: new Date().toISOString() });
        }
    }

    logPopulationSelection() {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'Population selected for deletion', {
                populationId: this.selectedPopulation,
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('Population selected for deletion:', { populationId: this.selectedPopulation, timestamp: new Date().toISOString() });
        }
    }

    logConfirmationChange(type, confirmed) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'Delete confirmation changed', {
                type: type,
                confirmed: confirmed,
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('Delete confirmation changed:', { type, confirmed, timestamp: new Date().toISOString() });
        }
    }

    logTextConfirmationChange() {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('debug', 'Environment delete text confirmation changed', {
                textLength: this.deleteTextConfirmation.length,
                timestamp: new Date().toISOString()
            });
        } else {
            console.debug('Environment delete text confirmation changed:', { textLength: this.deleteTextConfirmation.length, timestamp: new Date().toISOString() });
        }
    }

    logButtonValidation(isValid) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('debug', 'Delete button validation', {
                isValid: isValid,
                deleteType: this.currentDeleteType,
                timestamp: new Date().toISOString()
            });
        } else {
            console.debug('Delete button validation:', { isValid, deleteType: this.currentDeleteType, timestamp: new Date().toISOString() });
        }
    }

    logDeleteStart(deleteData) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'Delete operation started', {
                type: deleteData.type,
                scope: this.getDeleteScope(deleteData),
                metadata: this.getDeleteMetadata(deleteData),
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('Delete operation started:', { type: deleteData.type, scope: this.getDeleteScope(deleteData), metadata: this.getDeleteMetadata(deleteData), timestamp: new Date().toISOString() });
        }
    }

    logDeleteError(error) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('error', 'Delete operation failed', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error('Delete operation failed:', { error: error.message, timestamp: new Date().toISOString() });
        }
    }

    showSuccess(message) {
        if (window.app && window.app.uiManager) {
            window.app.uiManager.showNotification(message, 'success');
        } else if (window.uiManager) {
            window.uiManager.showStatusMessage('success', 'Delete Complete', message);
        } else {
            // Create a modern notification instead of alert
            this.showModernNotification(message, 'success');
        }
    }

    showError(message) {
        if (window.app && window.app.uiManager) {
            window.app.uiManager.showNotification('Error: ' + message, 'error');
        } else if (window.uiManager) {
            window.uiManager.showStatusMessage('error', 'Delete Failed', message);
        } else {
            // Create a modern notification instead of alert
            this.showModernNotification('Error: ' + message, 'error');
        }
    }

    showModernNotification(message, type = 'info') {
        // Create a modern notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        // Set background color based on type
        if (type === 'success') {
            notification.style.backgroundColor = '#28a745';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#dc3545';
        } else {
            notification.style.backgroundColor = '#17a2b8';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Initialize delete manager when DOM is loaded
// Only initialize if delete UI elements exist
function hasDeleteUI() {
    return document.getElementById('delete-file-section') ||
           document.getElementById('delete-population-section') ||
           document.getElementById('delete-environment-section');
}
document.addEventListener('DOMContentLoaded', () => {
    if (hasDeleteUI()) {
        try {
            window.deleteManager = new DeleteManager();
        } catch (error) {
            console.error('Failed to initialize DeleteManager:', error);
        }
    } else {
        window.deleteManager = null;
    }
});

// Export for ES6 module system
export { DeleteManager }; 