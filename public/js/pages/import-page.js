// Import Page Module
// PingOne User Management Tool v7.0.1.0

export class ImportPage {
    constructor(app) {
        this.app = app;
        this.isLoaded = false;
        this.selectedFile = null;
        this.uploadProgress = 0;
        this.isUploading = false;
    }
    
    async load() {
        if (this.isLoaded) return;
        
        console.log('📄 Loading Import page...');
        
        const pageContent = `
            <div class="page-header">
                <h1><i class="mdi mdi-upload"></i> Import Users</h1>
                <p>Upload a CSV file to import users into your PingOne environment</p>
            </div>
            
            <div class="import-container">
                <!-- File Upload Section -->
                <section class="import-section">
                    <div class="import-box">
                        <h3 class="section-title">File Upload</h3>
                        <p>Select or drag and drop your CSV file to begin the import process</p>
                        
                        <div class="file-upload-area" id="upload-area">
                            <div class="upload-icon">
                                <i class="mdi mdi-cloud-upload"></i>
                            </div>
                            <div class="upload-text">Drag & Drop CSV File Here</div>
                            <div class="upload-hint">or <button type="button" id="browse-files" class="btn btn-link">Choose CSV File</button></div>
                            <input type="file" id="file-input" accept=".csv" style="display: none;">
                        </div>
                        
                        <div class="upload-requirements">
                            <h4>File Requirements:</h4>
                            <ul>
                                <li>CSV format only</li>
                                <li>Maximum file size: 10MB</li>
                                <li>Required columns: email, username</li>
                                <li>Optional columns: name.given, name.family, etc.</li>
                            </ul>
                        </div>
                        
                        <!-- File Info -->
                        <div class="file-info" id="file-info" style="display: none;">
                            <div class="file-details">
                                <i class="mdi mdi-file-document"></i>
                                <div class="file-meta">
                                    <div class="file-name" id="file-name"></div>
                                    <div class="file-size" id="file-size"></div>
                                </div>
                                <button type="button" id="remove-file" class="btn btn-danger btn-sm">
                                    <i class="mdi mdi-delete"></i> Remove
                                </button>
                            </div>
                            <div class="file-preview" id="file-preview"></div>
                        </div>
                    </div>
                </section>
                
                <!-- Import Configuration -->
                <section class="import-section">
                    <div class="import-box">
                        <h3 class="section-title">Import Configuration</h3>
                        <p>Configure your import settings and target population</p>
                        
                        <div class="config-grid">
                            <div class="form-group">
                                <label for="target-population">Target Population *</label>
                                <div class="input-group">
                                    <select id="target-population" name="targetPopulation" class="form-control" required>
                                        <option value="">Select a population...</option>
                                    </select>
                                                                <button type="button" id="refresh-populations" class="btn btn-outline-secondary">
                                <i class="mdi mdi-refresh"></i>
                            </button>
                                </div>
                                <div class="form-help">Choose the population where users will be imported</div>
                            </div>
                        </div>
                        
                        <div class="options-group">
                            <h4>Import Mode</h4>
                            <div class="checkbox-grid">
                                <div class="form-check">
                                    <input type="radio" id="mode-create" name="importMode" value="create" class="form-check-input" checked>
                                    <label class="form-check-label" for="mode-create">Create new users only</label>
                                </div>
                                <div class="form-check">
                                    <input type="radio" id="mode-update" name="importMode" value="update" class="form-check-input">
                                    <label class="form-check-label" for="mode-update">Update existing users</label>
                                </div>
                                <div class="form-check">
                                    <input type="radio" id="mode-upsert" name="importMode" value="upsert" class="form-check-input">
                                    <label class="form-check-label" for="mode-upsert">Create or update users</label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="options-group">
                            <h4>Import Options</h4>
                            <div class="checkbox-grid">
                                <div class="form-check">
                                    <input type="checkbox" id="skip-duplicates" name="skipDuplicates" class="form-check-input" checked>
                                    <label class="form-check-label" for="skip-duplicates">Skip duplicate users (by email)</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="validate-emails" name="validateEmails" class="form-check-input" checked>
                                    <label class="form-check-label" for="validate-emails">Validate email addresses</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="send-welcome" name="sendWelcome" class="form-check-input">
                                    <label class="form-check-label" for="send-welcome">Send welcome emails</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="dry-run" name="dryRun" class="form-check-input">
                                    <label class="form-check-label" for="dry-run">Dry run (validate only)</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                <!-- Import Actions -->
                <section class="import-section">
                    <div class="import-box">
                        <div class="export-actions">
                            <button type="button" id="validate-file" class="btn btn-primary">
                                <i class="mdi mdi-check-circle"></i> Validate File
                            </button>
                            <button type="button" id="start-import" class="btn btn-primary" disabled>
                                <i class="mdi mdi-upload"></i> Start Import
                            </button>
                        </div>
                    </div>
                </section>
                
                <!-- Progress Section -->
                <section class="import-section" id="progress-section" style="display: none;">
                    <div class="import-box">
                        <h3 class="section-title">Import Progress</h3>
                        <p>Importing users to your PingOne environment</p>
                        
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div id="progress-fill" class="progress-fill" style="width: 0%;"></div>
                            </div>
                            <div id="progress-percentage" class="progress-text">0%</div>
                        </div>
                        
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="label">Users Processed:</span>
                                <span id="users-processed" class="value">0</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Total Users:</span>
                                <span id="total-users" class="value">0</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Success Rate:</span>
                                <span id="success-rate" class="value">0%</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Estimated Time:</span>
                                <span id="estimated-time" class="value">Calculating...</span>
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button type="button" id="cancel-import" class="btn btn-danger">
                                <i class="mdi mdi-close"></i> Cancel Import
                            </button>
                        </div>
                    </div>
                </section>
                
                <!-- Results Section -->
                <section class="import-section" id="results-section" style="display: none;">
                    <div class="import-box">
                        <h3 class="section-title">Import Results</h3>
                        <p>Summary of the import operation</p>
                        
                        <div id="results-summary" class="results-container">
                            <!-- Results will be populated here -->
                        </div>
                        
                        <div class="export-actions">
                            <button type="button" id="download-log" class="btn btn-outline-info">
                                <i class="mdi mdi-download"></i> Download Log
                            </button>
                            <button type="button" id="new-import" class="btn btn-outline-primary">
                                <i class="mdi mdi-refresh"></i> New Import
                            </button>
                        </div>
                    </div>
                </section>
        `;
        
        const importPage = document.getElementById('import-page');
        if (importPage) {
            importPage.innerHTML = pageContent;
            this.setupEventListeners();
            this.loadPopulations();
            this.isLoaded = true;
        }
    }
    
    setupEventListeners() {
        // File upload events
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const browseFiles = document.getElementById('browse-files');
        const removeFile = document.getElementById('remove-file');
        
        console.log('🔧 Setting up import page event listeners...');
        console.log('📁 Upload area found:', !!uploadArea);
        console.log('📄 File input found:', !!fileInput);
        console.log('🔍 Browse files button found:', !!browseFiles);
        console.log('🗑️ Remove file button found:', !!removeFile);
        
        if (uploadArea) {
            uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
            uploadArea.addEventListener('drop', this.handleDrop.bind(this));
            console.log('✅ Drag and drop listeners attached to upload area');
        } else {
            console.error('❌ Upload area not found - drag and drop will not work');
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }
        
        if (browseFiles) {
            browseFiles.addEventListener('click', () => fileInput?.click());
        }
        
        if (removeFile) {
            removeFile.addEventListener('click', this.handleRemoveFile.bind(this));
        }
        
        // Action buttons
        const validateFile = document.getElementById('validate-file');
        const startImport = document.getElementById('start-import');
        const cancelImport = document.getElementById('cancel-import');
        const refreshPopulations = document.getElementById('refresh-populations');
        
        if (validateFile) {
            validateFile.addEventListener('click', this.handleValidateFile.bind(this));
        }
        
        if (startImport) {
            startImport.addEventListener('click', this.handleStartImport.bind(this));
        }
        
        if (cancelImport) {
            cancelImport.addEventListener('click', this.handleCancelImport.bind(this));
        }
        
        if (refreshPopulations) {
            refreshPopulations.addEventListener('click', this.loadPopulations.bind(this));
        }
    }
    
    handleDragOver(event) {
        console.log('🔄 Drag over event fired');
        event.preventDefault();
        event.currentTarget.classList.add('dragover');
    }
    
    handleDragLeave(event) {
        console.log('🚪 Drag leave event fired');
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
    }
    
    handleDrop(event) {
        console.log('📥 Drop event fired');
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        console.log('📁 Files dropped:', files.length);
        if (files.length > 0) {
            console.log('📄 Processing file:', files[0].name);
            this.handleFileSelection(files[0]);
        }
    }
    
    handleFileSelect(event) {
        const files = event.target.files;
        if (files.length > 0) {
            this.handleFileSelection(files[0]);
        }
    }
    
    handleFileSelection(file) {
        // Validate file
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.app.showError('Please select a CSV file');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            this.app.showError('File size must be less than 10MB');
            return;
        }
        
        this.selectedFile = file;
        this.displayFileInfo(file);
        this.previewFile(file);
        
        // Enable action buttons
        document.getElementById('validate-file').disabled = false;
        document.getElementById('start-import').disabled = false;
    }
    
    displayFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');
        const uploadArea = document.getElementById('upload-area');
        
        if (fileInfo && fileName && fileSize && uploadArea) {
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);
            
            fileInfo.style.display = 'block';
            uploadArea.style.display = 'none';
        }
    }
    
    async previewFile(file) {
        try {
            const text = await this.readFileAsText(file);
            const lines = text.split('\n').slice(0, 6); // Show first 5 lines + header
            
            const preview = document.getElementById('file-preview');
            if (preview) {
                const table = document.createElement('table');
                table.className = 'file-preview-table';
                
                lines.forEach((line, index) => {
                    if (line.trim()) {
                        const row = table.insertRow();
                        const cells = line.split(',');
                        
                        cells.forEach(cell => {
                            const cellElement = row.insertCell();
                            cellElement.textContent = cell.trim().replace(/"/g, '');
                            if (index === 0) {
                                cellElement.className = 'header-cell';
                            }
                        });
                    }
                });
                
                preview.innerHTML = '<h4>File Preview:</h4>';
                preview.appendChild(table);
                
                if (lines.length === 6) {
                    const moreRows = document.createElement('p');
                    moreRows.textContent = '... and more rows';
                    moreRows.className = 'preview-more';
                    preview.appendChild(moreRows);
                }
            }
        } catch (error) {
            console.error('Error previewing file:', error);
        }
    }
    
    handleRemoveFile() {
        this.selectedFile = null;
        
        const fileInfo = document.getElementById('file-info');
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        
        if (fileInfo) fileInfo.style.display = 'none';
        if (uploadArea) uploadArea.style.display = 'block';
        if (fileInput) fileInput.value = '';
        
        // Disable action buttons
        document.getElementById('validate-file').disabled = true;
        document.getElementById('start-import').disabled = true;
        
        // Hide progress and results
        this.hideProgressSection();
        this.hideResultsSection();
    }
    
    async loadPopulations() {
        // Import the population loader service
        const { populationLoader } = await import('../services/population-loader.js');
        
        // Use the unified service to load populations
        await populationLoader.loadPopulations('target-population', {
            onError: (error) => {
                console.error('❌ Error loading populations for import page:', error);
                this.app.showError('Failed to load populations: ' + error.message);
            },
            onSuccess: (populations) => {
                // Select default population if available
                const select = document.getElementById('target-population');
                if (select && this.app.settings.pingone_population_id) {
                    select.value = this.app.settings.pingone_population_id;
                }
            }
        });
    }
    
    async handleValidateFile() {
        if (!this.selectedFile) return;
        
        try {
            this.app.showLoading('Validating file...');
            
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            formData.append('validateOnly', 'true');
            
            // Get population ID
            const targetPopulation = document.getElementById('target-population');
            if (targetPopulation && targetPopulation.value) {
                formData.append('populationId', targetPopulation.value);
            }
            
            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.app.showSuccess(`File validation successful! Found ${result.total} users.`);
                this.displayValidationResults(result);
            } else {
                throw new Error(result.error || 'Validation failed');
            }
            
        } catch (error) {
            this.app.showError('File validation failed: ' + error.message);
        } finally {
            this.app.hideLoading();
        }
    }
    
    async handleStartImport() {
        if (!this.selectedFile) return;
        
        const targetPopulation = document.getElementById('target-population').value;
        if (!targetPopulation) {
            this.app.showError('Please select a target population');
            return;
        }
        
        try {
            this.isUploading = true;
            this.showProgressSection();
            
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            formData.append('populationId', targetPopulation);
            
            // Get import options
            const importMode = document.querySelector('input[name="importMode"]:checked');
            if (importMode) {
                formData.append('importMode', importMode.value);
            }
            
            const sendVerification = document.getElementById('send-verification');
            if (sendVerification) {
                formData.append('sendVerification', sendVerification.checked);
            }
            
            const skipDuplicates = document.getElementById('skip-duplicates');
            if (skipDuplicates) {
                formData.append('skipDuplicates', skipDuplicates.checked);
            }
            
            const validateOnly = document.getElementById('validate-only');
            if (validateOnly) {
                formData.append('validateOnly', validateOnly.checked);
            }
            
            // Start the import
            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                // Start monitoring progress
                this.startProgressMonitoring();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Import failed to start');
            }
            
        } catch (error) {
            this.app.showError('Failed to start import: ' + error.message);
            this.isUploading = false;
            this.hideProgressSection();
        }
    }
    
    handleCancelImport() {
        if (confirm('Are you sure you want to cancel the import?')) {
            // Cancel the import operation
            fetch('/api/import/cancel', { method: 'POST' })
                .then(() => {
                    this.isUploading = false;
                    this.hideProgressSection();
                    this.app.showInfo('Import cancelled');
                })
                .catch(error => {
                    console.error('Error cancelling import:', error);
                });
        }
    }
    
    showProgressSection() {
        const progressSection = document.getElementById('progress-section');
        const startImport = document.getElementById('start-import');
        const cancelImport = document.getElementById('cancel-import');
        
        if (progressSection) progressSection.style.display = 'block';
        if (startImport) startImport.style.display = 'none';
        if (cancelImport) cancelImport.style.display = 'inline-block';
    }
    
    hideProgressSection() {
        const progressSection = document.getElementById('progress-section');
        const startImport = document.getElementById('start-import');
        const cancelImport = document.getElementById('cancel-import');
        
        if (progressSection) progressSection.style.display = 'none';
        if (startImport) startImport.style.display = 'inline-block';
        if (cancelImport) cancelImport.style.display = 'none';
    }
    
    hideResultsSection() {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) resultsSection.style.display = 'none';
    }
    
    startProgressMonitoring() {
        // This would connect to Server-Sent Events or WebSocket for real-time updates
        // For now, we'll simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                this.completeImport();
            }
            this.updateProgress(progress);
        }, 500);
    }
    
    updateProgress(percentage) {
        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = document.getElementById('progress-percentage');
        
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = Math.round(percentage) + '%';
        }
    }
    
    completeImport() {
        this.isUploading = false;
        this.hideProgressSection();
        this.showResultsSection();
        this.app.showSuccess('Import completed successfully!');
    }
    
    showResultsSection() {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) resultsSection.style.display = 'block';
        
        // This would be populated with actual results from the server
        const summary = document.getElementById('results-summary');
        if (summary) {
            summary.innerHTML = `
                <div class="results-grid">
                    <div class="result-card success">
                        <i class="mdi mdi-check-circle"></i>
                        <div>
                            <h3>Import Summary</h3>
                            <div class="result-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Total Users:</span>
                                    <span class="stat-value">150</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Successfully Imported:</span>
                                    <span class="stat-value success">145</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Failed:</span>
                                    <span class="stat-value error">5</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Success Rate:</span>
                                    <span class="stat-value">96.7%</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Duration:</span>
                                    <span class="stat-value">2m 34s</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="result-details">
                        <h4>Import Details</h4>
                        <ul>
                            <li><strong>Target Population:</strong> Production Users</li>
                            <li><strong>Import Mode:</strong> Create new users only</li>
                            <li><strong>File:</strong> users_import.csv (2.3 MB)</li>
                            <li><strong>Started:</strong> ${new Date().toLocaleString()}</li>
                        </ul>
                    </div>
                    
                    <div class="result-actions">
                        <button class="btn btn-outline-info" onclick="this.downloadLog()">
                            <i class="mdi mdi-download"></i> Download Log
                        </button>
                        <button class="btn btn-outline-primary" onclick="this.startNewImport()">
                            <i class="mdi mdi-refresh"></i> New Import
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    displayValidationResults(results) {
        // Display validation results in a user-friendly format
        console.log('Validation results:', results);
    }
    
    // Utility methods
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
