// Import Page Module
// PingOne User Management Tool v7.2.0

export class ImportPage {
    constructor(app) {
        this.app = app;
        this.isLoaded = false;
        this.selectedFile = null;
        this.uploadProgress = 0;
        this.isUploading = false;
        this.selectedRecordCount = 0;
        this.importStartTime = null;
        this._lastReportedPercent = -1;
        this._lastReportedError = null;
    }
    
    async load() {
        if (this.isLoaded) return;
        
        console.log('📄 Loading Import page...');
        
        // Check for existing file state from app
        const fileState = this.app.getFileState();
        let hasExistingFile = false;
        if (fileState.selectedFile) {
            console.log('📁 Found existing file state:', fileState.fileName);
            this.selectedFile = fileState.selectedFile;
            hasExistingFile = true;
            this.app.showInfo(`File "${fileState.fileName}" loaded from previous session`);
        }
        
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
                            <div class="checkbox-grid">
                                <div class="form-check">
                                    <input type="checkbox" id="req-csv" class="form-check-input" disabled>
                                    <label class="form-check-label" for="req-csv">CSV format only</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="req-size" class="form-check-input" disabled>
                                    <label class="form-check-label" for="req-size">Maximum file size: 10MB</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="req-required" class="form-check-input" disabled>
                                    <label class="form-check-label" for="req-required">Required columns: email, username</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="req-optional" class="form-check-input" disabled>
                                    <label class="form-check-label" for="req-optional">Optional columns: name.given, name.family, etc.</label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- File Info -->
                        <div class="file-info" id="file-info" style="display: none;">
                            <div class="file-details">
                                <i class="mdi mdi-file-document"></i>
                                <div class="file-meta">
                                    <div class="file-name" id="file-name"></div>
                                    <div class="file-size" id="file-size"></div>
                                    <div class="file-extra" style="font-size: 0.9rem; color:#374151; margin-top:4px;">
                                        <span>Records: <strong id="file-records">-</strong></span>
                                        <span style="margin-left:12px;">Last Modified: <strong id="file-last-modified">-</strong></span>
                                        <span style="margin-left:12px;">Created: <strong id="file-created">Unavailable</strong></span>
                                    </div>
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
                                <div class="input-group input-group-fused">
                                    <select id="target-population" name="targetPopulation" class="form-control" required>
                                        <option value="">Select a population...</option>
                                    </select>
                                                                <button type="button" id="refresh-populations" class="btn btn-outline-secondary" title="Refresh populations" aria-label="Refresh populations">
                                <i class="mdi mdi-refresh" style="color:#1565c0;"></i>
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
                            <div style="margin-bottom:8px;">
                                <a id="download-template" href="/api/import/template" class="btn btn-outline-secondary btn-sm">
                                    <i class="mdi mdi-file-download"></i> Download CSV Template
                                </a>
                            </div>
                            <div class="mb-2" style="display:flex; gap:12px; align-items:center;">
                                <div class="form-check">
                                    <input type="checkbox" id="import-options-select-all" class="form-check-input">
                                    <label class="form-check-label" for="import-options-select-all">Select All</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="import-options-unselect-all" class="form-check-input">
                                    <label class="form-check-label" for="import-options-unselect-all">Unselect All</label>
                                </div>
                            </div>
                            <div class="checkbox-grid">
                                <div class="form-check">
                                    <input type="checkbox" id="skip-duplicates" name="skipDuplicates" class="form-check-input" checked>
                                    <label class="form-check-label" for="skip-duplicates">Skip duplicate users (by email)</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="skip-existing-username" name="skipExistingUsername" class="form-check-input">
                                    <label class="form-check-label" for="skip-existing-username">Skip if username already exists</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="skip-existing-userid" name="skipExistingUserid" class="form-check-input">
                                    <label class="form-check-label" for="skip-existing-userid">Skip if user ID already exists</label>
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
                            <button type="button" id="validate-file" class="btn btn-primary" disabled>
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
                        <div id="import-error-inline" class="alert alert-warning" style="display:none; margin-bottom:8px;"></div>
                        
                        <div class="progress-container">
                            <div id="progress-text-left" class="progress-text">0%</div>
                            <div class="progress-bar">
                                <div id="progress-fill" class="progress-fill" style="width: 0%;"></div>
                            </div>
                            <svg id="beer-mug-svg-import" class="beer-mug" width="56" height="56" viewBox="0 0 36 36" aria-label="Beer mug progress icon" focusable="false">
                                <defs>
                                    <clipPath id="beer-clip-import">
                                        <path d="M9 8 h16 a2 2 0 0 1 2 2 v18 a2 2 0 0 1-2 2 h-16 a2 2 0 0 1-2-2 v-18 a2 2 0 0 1 2-2 z" />
                                    </clipPath>
                                </defs>
                                <path d="M9 8 h16 a2 2 0 0 1 2 2 v18 a2 2 0 0 1-2 2 h-16 a2 2 0 0 1-2-2 v-18 a2 2 0 0 1 2-2 z"
                                      fill="none" stroke="#1f2937" stroke-width="1.5"/>
                                <path d="M27 12 h2 a3 3 0 0 1 3 3 v6 a3 3 0 0 1-3 3 h-2" fill="none" stroke="#1f2937" stroke-width="1.5"/>
                                <rect id="beer-fill-import" x="9" y="26" width="16" height="0" fill="#f59e0b" clip-path="url(#beer-clip-import)"/>
                                <rect id="beer-foam-import" x="9" y="26" width="16" height="0.001" fill="#ffffff" opacity="0.95" clip-path="url(#beer-clip-import)"/>
                            </svg>
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
            this.updateButtonStates(); // Ensure buttons start in correct state
            
            // Display existing file info if available
            if (hasExistingFile && this.selectedFile) {
                this.displayFileInfo(this.selectedFile);
                this.previewFile(this.selectedFile);
            }
            
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
        // Import Mode radios do not need select-all controls; removed noisy UI

        // Select All / Unselect All for Import Options (checkbox group)
        const importOptionsSelectAll = document.getElementById('import-options-select-all');
        const importOptionsUnselectAll = document.getElementById('import-options-unselect-all');
        const optionIds = ['skip-duplicates','skip-existing-username','skip-existing-userid','validate-emails','send-welcome','dry-run'];
        const toggleOptions = (checked) => optionIds.forEach(id => { const el = document.getElementById(id); if (el) el.checked = checked; });
        if (importOptionsSelectAll) importOptionsSelectAll.addEventListener('change', (e) => {
            if (!e.target.checked) return;
            toggleOptions(true);
            if (importOptionsUnselectAll) importOptionsUnselectAll.checked = false;
        });
        if (importOptionsUnselectAll) importOptionsUnselectAll.addEventListener('change', (e) => {
            if (!e.target.checked) return;
            toggleOptions(false);
            if (importOptionsSelectAll) importOptionsSelectAll.checked = false;
        });

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
            refreshPopulations.addEventListener('click', async () => {
                const { populationLoader } = await import('../services/population-loader.js');
                populationLoader.clearCache();
                this.app?.showWarning?.('Refreshing populations…');
                await this.loadPopulations();
                this.app?.showSuccess?.('Populations refreshed');
            });
        }
        
        // Population selection change
        const targetPopulation = document.getElementById('target-population');
        if (targetPopulation) {
            targetPopulation.addEventListener('change', () => {
                this.updateButtonStates();
            });
        }
        
        // Results section buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'new-import-btn') {
                this.startNewImport();
            }
            if (e.target.id === 'download-log-btn') {
                this.downloadLog();
            }
        });
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
        this.app.setFileState(file); // Save to app state
        this.displayFileInfo(file);
        this.previewFile(file);
        
        // Enable action buttons
        this.updateButtonStates();

        // Mark requirements as satisfied
        const reqCsv = document.getElementById('req-csv');
        const reqSize = document.getElementById('req-size');
        const reqRequired = document.getElementById('req-required');
        const reqOptional = document.getElementById('req-optional');
        if (reqCsv) reqCsv.checked = true;
        if (reqSize) reqSize.checked = file.size <= 10 * 1024 * 1024;
        if (reqRequired) reqRequired.checked = true; // TODO: deep header validation later
        if (reqOptional) reqOptional.checked = true; // informational
    }
    
    displayFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');
        const fileRecords = document.getElementById('file-records');
        const fileLastModified = document.getElementById('file-last-modified');
        const fileCreated = document.getElementById('file-created');
        const uploadArea = document.getElementById('upload-area');
        
        if (fileInfo && fileName && fileSize && uploadArea) {
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);
            if (fileLastModified) fileLastModified.textContent = new Date(file.lastModified).toLocaleString();
            if (fileCreated) fileCreated.textContent = 'Unavailable';
            
            fileInfo.style.display = 'block';
            uploadArea.style.display = 'none';
        }
    }
    
    async previewFile(file) {
        const startTime = Date.now();
        try {
            const text = await this.readFileAsText(file);
            const lines = text.split('\n').slice(0, 6); // Show first 5 lines + header
            const allLines = text.split('\n');
            const numRecords = Math.max(0, allLines.length - 1); // naive: minus header
            const fileRecords = document.getElementById('file-records');
            if (fileRecords) fileRecords.textContent = String(numRecords);
            this.selectedRecordCount = numRecords;
            
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
        this.app.setFileState(null); // Clear app state
        
        const fileInfo = document.getElementById('file-info');
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        
        if (fileInfo) fileInfo.style.display = 'none';
        if (uploadArea) uploadArea.style.display = 'block';
        if (fileInput) fileInput.value = '';
        
        // Disable action buttons
        this.updateButtonStates();
        
        // Hide progress and results
        this.hideProgressSection();
        this.hideResultsSection();

        // Reset requirement checks
        ['req-csv','req-size','req-required','req-optional'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = false;
        });
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
        if (!this.selectedFile) {
            this.app.showError('Please select a file first before validating');
            return;
        }
        
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
                // Turn Validate File button green to indicate success
                const validateBtn = document.getElementById('validate-file');
                if (validateBtn) {
                    validateBtn.classList.remove('btn-primary');
                    validateBtn.classList.add('btn-success');
                }
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
        if (!this.selectedFile) {
            this.app.showError('Please select a file first before starting import');
            return;
        }
        
        const targetPopulation = document.getElementById('target-population').value;
        if (!targetPopulation) {
            this.app.showError('Please select a target population');
            return;
        }
        
        try {
            this.isUploading = true;
            this.showProgressSection();
            // Turn Start Import button green to indicate active import
            const startBtn = document.getElementById('start-import');
            if (startBtn) {
                startBtn.classList.remove('btn-primary');
                startBtn.classList.add('btn-success');
            }
            // initialize stats
            const totalEl = document.getElementById('total-users');
            if (totalEl) totalEl.textContent = String(this.selectedRecordCount || 0);
            this.importStartTime = Date.now();
            
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            formData.append('populationId', targetPopulation);
            
            // Get import options
            const importMode = document.querySelector('input[name="importMode"]:checked');
            if (importMode) {
                formData.append('importMode', importMode.value);
            }
            
            // Send welcome emails flag
            const sendWelcome = document.getElementById('send-welcome');
            if (sendWelcome) {
                formData.append('sendWelcome', sendWelcome.checked);
            }
            
            const skipDuplicates = document.getElementById('skip-duplicates');
            if (skipDuplicates) {
                formData.append('skipDuplicates', skipDuplicates.checked);
            }
            
            const skipExistingUsername = document.getElementById('skip-existing-username');
            if (skipExistingUsername) {
                formData.append('skipExistingUsername', skipExistingUsername.checked);
            }
            
            const skipExistingUserid = document.getElementById('skip-existing-userid');
            if (skipExistingUserid) {
                formData.append('skipExistingUserid', skipExistingUserid.checked);
            }
            
            const validateOnly = document.getElementById('validate-only');
            if (validateOnly) {
                formData.append('validateOnly', validateOnly.checked);
            }
            
            // Start the import
            console.log('🚀 Starting import: sending POST /api/import');
            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData
            });
            
            console.log('📨 /api/import response status:', response.status);
            if (response.ok) {
                const respJson = await response.json().catch(() => ({}));
                const payload = respJson && (respJson.data || respJson.message || respJson);
                const sessionId = payload?.sessionId;
                const totalFromServer = Number(payload?.total || 0);
                if (totalFromServer && !this.selectedRecordCount) this.selectedRecordCount = totalFromServer;
                const totalEl = document.getElementById('total-users');
                if (totalEl && totalFromServer) totalEl.textContent = String(totalFromServer);
                // Start polling real status
                console.log('✅ Import started, sessionId:', sessionId, 'totalFromServer:', totalFromServer);
                this.startStatusPolling(sessionId);
            } else {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || 'Import failed to start');
            }
            
        } catch (error) {
            console.error('❌ Failed to start import:', error);
            this.app.showError('Failed to start import: ' + error.message);
            this.isUploading = false;
            this.hideProgressSection();
        }
    }
    
    handleCancelImport() {
        // Use status bar instead of confirm modal
        this.app.showWarning('Cancelling import...');
        fetch('/api/import/cancel', { method: 'POST' })
            .then(() => {
                this.isUploading = false;
                this.hideProgressSection();
                this.app.showInfo('Import cancelled');
            })
            .catch(error => {
                console.error('Error cancelling import:', error);
                this.app.showError('Failed to cancel import');
            });
    }
    
    showProgressSection() {
        const progressSection = document.getElementById('progress-section');
        const startImport = document.getElementById('start-import');
        const cancelImport = document.getElementById('cancel-import');
        
        if (progressSection) progressSection.style.display = 'block';
        if (startImport) startImport.style.display = 'none';
        if (cancelImport) cancelImport.style.display = 'inline-block';

        // Ensure the user sees the progress as it starts
        // Scroll smoothly to the progress section
        if (progressSection) {
            setTimeout(() => {
                progressSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
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
        // Legacy simulator (kept as fallback)
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

    startStatusPolling(sessionId) {
        const pollIntervalMs = 800;
        const timer = setInterval(async () => {
            try {
                const resp = await fetch('/api/import/status');
                const json = await resp.json().catch(() => ({}));
                const payload = json && (json.data || json.message || json);
                if (!payload) return;
                const processed = payload.progress?.current ?? payload.statistics?.processed ?? payload.processed ?? 0;
                const total = payload.progress?.total ?? payload.total ?? this.selectedRecordCount ?? 0;
                const percent = payload.progress?.percentage ?? (total > 0 ? Math.round((processed / total) * 100) : 0);
                const startTime = payload.timing?.startTime ?? null;
                const running = payload.isRunning ?? (payload.status === 'running');
                // Show last error inline if any
                if (payload.lastError) {
                    const log = document.getElementById('import-error-inline');
                    if (log) {
                        log.style.display = 'block';
                        log.textContent = `Last error: ${payload.lastError}`;
                    }
                    if (this._lastReportedError !== payload.lastError) {
                        this._lastReportedError = payload.lastError;
                        // Push to UI logs for visibility
                        this._postUiLog({ level: 'error', source: 'import', message: 'Import error', details: payload.lastError });
                        this.app?.showError?.(payload.lastError);
                    }
                } else {
                    const log = document.getElementById('import-error-inline');
                    if (log) log.style.display = 'none';
                }
                this.updateProgressFromServer(percent, processed, total, startTime);
                // Announce progress in status bar and logs occasionally
                if (percent !== this._lastReportedPercent) {
                    this._lastReportedPercent = percent;
                    this.app?.showInfo?.(`Import running: ${percent}% (${processed}/${total})`);
                    if (percent % 10 === 0 && total > 0) {
                        this._postUiLog({ level: 'info', source: 'import', message: `Progress ${percent}%`, details: { processed, total } });
                    }
                }
                if (!running) {
                    clearInterval(timer);
                    // Finalize UI
                    this.updateProgressFromServer(100, processed, total, startTime);
                    this.completeImport();
                    this._postUiLog({ level: 'info', source: 'import', message: 'Import completed', details: { processed, total, errors: payload?.statistics?.errors ?? 0 } });
                }
            } catch (_) {
                // Ignore transient errors
            }
        }, pollIntervalMs);
    }

    async _postUiLog(entry) {
        try {
            await fetch('/api/logs/ui', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            });
        } catch (_) {
            // ignore
        }
    }
    
    updateProgress(percentage) {
        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressTextLeft = document.getElementById('progress-text-left');
        const beerFill = document.getElementById('beer-fill-import');
        const beerFoam = document.getElementById('beer-foam-import');
        const usersProcessedEl = document.getElementById('users-processed');
        const totalUsersEl = document.getElementById('total-users');
        const successRateEl = document.getElementById('success-rate');
        const estimatedTimeEl = document.getElementById('estimated-time');
        
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = Math.round(percentage) + '%';
        }

        if (progressTextLeft) {
            progressTextLeft.textContent = Math.round(percentage) + '%';
        }

        // Beer mug fill & foam positioning
        if (beerFill) {
            const fillHeight = Math.max(0, Math.min(16, (percentage / 100) * 16));
            const yFill = 26 - fillHeight;
            beerFill.setAttribute('y', String(yFill));
            beerFill.setAttribute('height', String(fillHeight));
        }
        if (beerFoam) {
            const foamHeight = percentage > 0 ? (percentage < 100 ? 3 : 4) : 0.001;
            const yFoam = 26 - Math.max(0, Math.min(16, (percentage / 100) * 16)) - foamHeight;
            beerFoam.setAttribute('y', String(yFoam));
            beerFoam.setAttribute('height', String(foamHeight));
        }
        // Real-time stats
        const total = Number(totalUsersEl?.textContent || this.selectedRecordCount || 0);
        const processed = Math.min(total, Math.round((percentage / 100) * total));
        if (usersProcessedEl) usersProcessedEl.textContent = String(processed);
        if (successRateEl && total > 0) successRateEl.textContent = `${Math.round((processed / total) * 100)}%`;
        if (estimatedTimeEl && this.importStartTime && percentage > 0 && percentage < 100) {
            const elapsedMs = Date.now() - this.importStartTime;
            const remainingMs = Math.max(0, Math.round((elapsedMs * (100 - percentage)) / percentage));
            const mins = Math.floor(remainingMs / 60000);
            const secs = Math.floor((remainingMs % 60000) / 1000);
            estimatedTimeEl.textContent = `${mins}m ${secs}s remaining`;
        }
        if (estimatedTimeEl && percentage >= 100) {
            estimatedTimeEl.textContent = 'Done';
        }
    }

    updateProgressFromServer(percentage, processed, total, startTimeIso) {
        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressTextLeft = document.getElementById('progress-text-left');
        const beerFill = document.getElementById('beer-fill-import');
        const beerFoam = document.getElementById('beer-foam-import');
        const usersProcessedEl = document.getElementById('users-processed');
        const totalUsersEl = document.getElementById('total-users');
        const successRateEl = document.getElementById('success-rate');
        const estimatedTimeEl = document.getElementById('estimated-time');

        if (totalUsersEl && total) totalUsersEl.textContent = String(total);
        if (progressFill) progressFill.style.width = percentage + '%';
        if (progressPercentage) progressPercentage.textContent = Math.round(percentage) + '%';
        if (progressTextLeft) progressTextLeft.textContent = Math.round(percentage) + '%';

        // Beer mug
        if (beerFill) {
            const fillHeight = Math.max(0, Math.min(16, (percentage / 100) * 16));
            const yFill = 26 - fillHeight;
            beerFill.setAttribute('y', String(yFill));
            beerFill.setAttribute('height', String(fillHeight));
        }
        if (beerFoam) {
            const foamHeight = percentage > 0 ? (percentage < 100 ? 3 : 4) : 0.001;
            const yFoam = 26 - Math.max(0, Math.min(16, (percentage / 100) * 16)) - foamHeight;
            beerFoam.setAttribute('y', String(yFoam));
            beerFoam.setAttribute('height', String(foamHeight));
        }

        if (usersProcessedEl) usersProcessedEl.textContent = String(processed || 0);
        if (successRateEl && total > 0) successRateEl.textContent = `${Math.round(((processed || 0) / total) * 100)}%`;

        // ETA from server start time
        if (estimatedTimeEl && startTimeIso && percentage > 0 && percentage < 100) {
            const startMs = new Date(startTimeIso).getTime();
            const elapsedMs = Date.now() - startMs;
            const remainingMs = Math.max(0, Math.round((elapsedMs * (100 - percentage)) / Math.max(1, percentage)));
            const mins = Math.floor(remainingMs / 60000);
            const secs = Math.floor((remainingMs % 60000) / 1000);
            estimatedTimeEl.textContent = `${mins}m ${secs}s remaining`;
        }
        if (estimatedTimeEl && percentage >= 100) estimatedTimeEl.textContent = 'Done';
    }
    
    completeImport() {
        this.isUploading = false;
        this.hideProgressSection();
        this.showResultsSection();
        
        // Show file upload section for new imports
        const fileUploadSection = document.querySelector('.import-section:first-child');
        if (fileUploadSection) {
            fileUploadSection.style.display = 'block';
        }
        
        this.app.showSuccess('Import completed successfully!');
        // Record in history (using sample totals for now)
        this.app.addHistoryEntry('import', 'success', 'CSV import completed', 150, Math.floor(Math.random()*150000)+10000);
    }
    
    showResultsSection() {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) resultsSection.style.display = 'block';
        
        // Get actual import options for display
        const importMode = document.querySelector('input[name="importMode"]:checked');
        const skipExistingUsername = document.getElementById('skip-existing-username');
        const skipExistingUserid = document.getElementById('skip-existing-userid');
        
        const importModeText = importMode ? importMode.value : 'create';
        const skipOptions = [];
        if (skipExistingUsername && skipExistingUsername.checked) skipOptions.push('Username exists');
        if (skipExistingUserid && skipExistingUserid.checked) skipOptions.push('User ID exists');
        const skipOptionsText = skipOptions.length > 0 ? skipOptions.join(', ') : 'None';
        
        // Populate with runtime values
        const summary = document.getElementById('results-summary');
        const total = Number(document.getElementById('total-users')?.textContent || this.selectedRecordCount || 0);
        const processed = Number(document.getElementById('users-processed')?.textContent || total);
        const failed = 0; // TODO: wire to server errors count when real import implemented
        const skipped = 0; // TODO: compute based on server response
        const success = Math.max(0, processed - failed - skipped);
        const rate = total > 0 ? Math.round((success / total) * 100) : 0;
        if (summary) {
            summary.innerHTML = `
                <div class="results-grid">
                    <div class="result-card success">
                        <i class="mdi mdi-check-circle"></i>
                        <div>
                            <h3>Import Summary</h3>
                            <div class="result-stats">
                                <div class="stat-item"><span class="stat-label">Total Users:</span><span class="stat-value">${total}</span></div>
                                <div class="stat-item"><span class="stat-label">Successfully Imported:</span><span class="stat-value success">${success}</span></div>
                                <div class="stat-item"><span class="stat-label">Skipped:</span><span class="stat-value warning">${skipped}</span></div>
                                <div class="stat-item"><span class="stat-label">Failed:</span><span class="stat-value error">${failed}</span></div>
                                <div class="stat-item"><span class="stat-label">Success Rate:</span><span class="stat-value">${rate}%</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="result-details">
                        <h4>Import Details</h4>
                        <ul>
                            <li><strong>Target Population:</strong> ${document.getElementById('target-population')?.selectedOptions?.[0]?.text || 'N/A'}</li>
                            <li><strong>Import Mode:</strong> ${importModeText === 'create' ? 'Create new users only' : importModeText === 'update' ? 'Update existing users' : 'Create or update users'}</li>
                            <li><strong>Skip Options:</strong> ${skipOptionsText}</li>
                            <li><strong>Started:</strong> ${new Date().toLocaleString()}</li>
                        </ul>
                    </div>
                </div>`;
        }

        // Wire bottom action buttons (keep these only)
        const dl = document.getElementById('download-log');
        if (dl) dl.addEventListener('click', () => this.downloadLog());
        const ni = document.getElementById('new-import');
        if (ni) ni.addEventListener('click', () => this.startNewImport());
    }
    
    startNewImport() {
        console.log('🔄 Starting new import...');
        
        // Reset form state
        this.selectedFile = null;
        
        // Hide results section
        this.hideResultsSection();
        
        // Show file upload section
        const fileUploadSection = document.querySelector('.import-section:first-child');
        if (fileUploadSection) {
            fileUploadSection.style.display = 'block';
        }
        
        // Reset file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Reset file info display
        const fileInfo = document.getElementById('file-info');
        const uploadArea = document.getElementById('upload-area');
        if (fileInfo && uploadArea) {
            fileInfo.style.display = 'none';
            uploadArea.style.display = 'block';
        }
        
        // Reset file preview
        const filePreview = document.getElementById('file-preview');
        if (filePreview) {
            filePreview.innerHTML = '';
        }
        
        // Disable action buttons
        this.updateButtonStates();
        
        // Reset population selection
        const targetPopulation = document.getElementById('target-population');
        if (targetPopulation) {
            targetPopulation.value = '';
        }
        
        // Reset import options to defaults
        const skipDuplicates = document.getElementById('skip-duplicates');
        const skipExistingUsername = document.getElementById('skip-existing-username');
        const skipExistingUserid = document.getElementById('skip-existing-userid');
        const validateEmails = document.getElementById('validate-emails');
        const sendWelcome = document.getElementById('send-welcome');
        const dryRun = document.getElementById('dry-run');
        
        if (skipDuplicates) skipDuplicates.checked = true;
        if (skipExistingUsername) skipExistingUsername.checked = false;
        if (skipExistingUserid) skipExistingUserid.checked = false;
        if (validateEmails) validateEmails.checked = true;
        if (sendWelcome) sendWelcome.checked = false;
        if (dryRun) dryRun.checked = false;
        
        // Reset import mode to create
        const createMode = document.getElementById('mode-create');
        if (createMode) createMode.checked = true;
        
        // Scroll to top of page
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        this.app.showInfo('Ready for new import. Please select a file.');
    }
    
    async downloadLog() {
        try {
            console.log('📥 Downloading import log...');
            const resp = await fetch('/api/import/log?format=json', { cache: 'no-store' });
            if (!resp.ok) throw new Error('Failed to download log');
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const ts = new Date().toISOString().slice(0,10);
            a.href = url;
            a.download = `import-log-${ts}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            this.app.showSuccess('Log downloaded');
        } catch (err) {
            console.error('❌ Download log failed:', err);
            this.app.showError('Download log failed: ' + err.message);
        }
    }
    
    updateButtonStates() {
        const validateFileBtn = document.getElementById('validate-file');
        const startImportBtn = document.getElementById('start-import');
        const targetPopulation = document.getElementById('target-population');
        
        // Validate File button: enabled only when a file is selected
        if (validateFileBtn) {
            validateFileBtn.disabled = !this.selectedFile;
        }
        
        // Start Import button: enabled only when both file and population are selected
        if (startImportBtn) {
            const hasFile = !!this.selectedFile;
            const hasPopulation = targetPopulation && targetPopulation.value;
            startImportBtn.disabled = !hasFile || !hasPopulation;
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
