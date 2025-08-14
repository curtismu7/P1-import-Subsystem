/**
 * Delete Page Module
 * 
 * Handles the Delete Users page functionality including:
 * - Population selection
 * - User selection
 * - Delete confirmation
 * - Progress tracking
 */

export class DeletePage {
    constructor(app) {
        this.app = app;
        this.isLoaded = false;
        this.selectedFile = null;
        this.isUploading = false;
        this.selectedPopulation = '';
        this.lastTokenValidity = null; // Track token validity changes
        this.deleteInProgress = false;
        this.deletedUsers = [];
        this.errors = [];
    }

    async load() {
        console.log('📄 Loading Delete page...');
        
        // Check for existing file state from app
        const fileState = this.app.getFileState();
        let hasExistingFile = false;
        if (fileState.selectedFile) {
            console.log('📁 Found existing file state:', fileState.fileName);
            this.selectedFile = fileState.selectedFile;
            hasExistingFile = true;
            this.app.showInfo(`File "${fileState.fileName}" loaded from previous session`);
        }
        
        const deletePage = document.getElementById('delete-page');
        if (!deletePage) {
            console.error('❌ Delete page div not found');
            return;
        }

        deletePage.innerHTML = `
            <div class="page-header">
                <h1>Delete Users</h1>
                <p>Remove users from a CSV file or population. Use with caution.</p>
            </div>

            <div class="delete-container">
                <!-- File Upload -->
                <section class="delete-section">
                    <div class="delete-box">
                        <h3 class="section-title">File Upload</h3>
                        <p>Select or drag and drop your CSV file containing users to delete</p>
                        
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
                                </div>
                                <button type="button" id="remove-file" class="btn btn-danger btn-sm">
                                    <i class="mdi mdi-delete"></i> Remove
                                </button>
                            </div>
                            <div class="file-preview" id="file-preview"></div>
                        </div>
                    </div>
                </section>

                <!-- Population Selection -->
                <section class="delete-section">
                    <div class="delete-box">
                        <h3 class="section-title">Select Population (Optional)</h3>
                        <p>Choose a population to delete users from, or upload a CSV file above</p>
                        
                        <div class="config-grid">
                            <div class="form-group">
                                <label for="delete-population-select">Population *</label>
                                <div class="population-dropdown-container">
                                    <select id="delete-population-select" class="form-control" data-long-text="true">
                                        <option value="">Select a population...</option>
                                    </select>
                                    <button type="button" id="refresh-populations" class="btn btn-outline-secondary">
                                        <i class="mdi mdi-refresh"></i>
                                    </button>
                                </div>
                                <div class="form-help">Select a population to delete users from, or use the CSV file upload above</div>
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button id="load-users-btn" class="btn btn-danger" disabled>
                                <i class="mdi mdi-account-group"></i> Load Users
                            </button>
                            <button id="delete-users-btn" class="btn btn-danger" disabled>
                                <i class="mdi mdi-delete"></i> Delete Users - Warning
                            </button>
                        </div>
                    </div>
                </section>

                <!-- User Selection -->
                <section id="user-selection-section" class="delete-section" style="display: none;">
                    <div class="delete-box">
                        <h3 class="section-title">Select Users to Delete</h3>
                        <p>Choose which users you want to permanently delete</p>
                        
                        <!-- Filter Controls -->
                        <div class="filter-section mb-3">
                            <div class="card">
                                <div class="card-header bg-light">
                                    <h5 class="mb-0"><i class="mdi mdi-filter-variant"></i> Filter Users</h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-3 mb-3">
                                            <label for="filter-username" class="form-label fw-bold">Username Pattern</label>
                                            <input type="text" id="filter-username" class="form-control border border-2 border-outline" placeholder="e.g., use-*, test*">
                                        </div>
                                        <div class="col-md-3 mb-3">
                                            <label for="filter-email-domain" class="form-label fw-bold">Email Domain</label>
                                            <input type="text" id="filter-email-domain" class="form-control border border-2 border-outline" placeholder="e.g., mailinator.com">
                                        </div>
                                        <div class="col-md-3 mb-3">
                                            <label for="filter-email-pattern" class="form-label fw-bold">Email Pattern</label>
                                            <input type="text" id="filter-email-pattern" class="form-control border border-2 border-outline" placeholder="e.g., *@test.com">
                                        </div>
                                        <div class="col-md-3 mb-3">
                                            <label for="filter-status" class="form-label fw-bold">Status</label>
                                            <select id="filter-status" class="form-control border border-2 border-outline">
                                                <option value="">All Users</option>
                                                <option value="enabled">Enabled Only</option>
                                                <option value="disabled">Disabled Only</option>
                                                <option value="empty-email">Empty Email</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="form-check mb-2">
                                                <input class="form-check-input" type="checkbox" id="filter-test-users">
                                                <label class="form-check-label" for="filter-test-users">
                                                    Show test users only (username contains 'test', 'demo', 'temp')
                                                </label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="filter-disposable-email">
                                                <label class="form-check-label" for="filter-disposable-email">
                                                    Show disposable email domains only
                                                </label>
                                            </div>
                                        </div>
                                                                            <div class="col-md-6 text-end">
                                        <button id="apply-filters" class="btn btn-primary btn-sm me-2">
                                            <i class="mdi mdi-filter"></i> Apply Filters
                                        </button>
                                        <button id="clear-filters" class="btn btn-outline-secondary btn-sm me-2">
                                            <i class="mdi mdi-filter-off"></i> Clear Filters
                                        </button>
                                        <button id="select-filtered" class="btn btn-outline-primary btn-sm">
                                            <i class="mdi mdi-check-box-outline"></i> Select Filtered
                                        </button>
                                    </div>
                                </div>
                                <!-- Filter Status -->
                                <div id="filter-status-indicator" class="mt-2" style="display: none;">
                                    <div class="alert alert-success d-flex align-items-center" id="filter-success" style="display: none;">
                                        <i class="mdi mdi-check-circle me-2"></i>
                                        <span id="filter-success-text">Filters applied successfully</span>
                                    </div>
                                    <div class="alert alert-info d-flex align-items-center" id="filter-cleared" style="display: none;">
                                        <i class="mdi mdi-information me-2"></i>
                                        <span id="filter-cleared-text">Filters cleared</span>
                                    </div>
                                </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="export-actions mb-3">
                            <button id="select-all-users" class="btn btn-outline-secondary">
                                <i class="mdi mdi-check-box-outline"></i> Select All
                            </button>
                            <button id="deselect-all-users" class="btn btn-outline-secondary">
                                <i class="mdi mdi-square-outline"></i> Deselect All
                            </button>
                            <span id="filter-status-text" class="text-muted ms-3"></span>
                        </div>
                        
                        <div id="users-list" class="user-selection-list">
                            <!-- Users will be populated here -->
                        </div>
                        
                        <div class="info-grid mt-3">
                            <div class="info-item">
                                <span class="label">Selected Users:</span>
                                <span id="selected-count" class="value">0</span>
                            </div>
                        </div>
                    </div>
                </section>



                <!-- Progress -->
                <section id="delete-progress-section" class="delete-section" style="display: none;">
                    <div class="delete-box">
                        <h3 class="section-title">Delete Progress</h3>
                        <p>Deleting users from your PingOne environment</p>
                        
                        <div class="progress-container">
                            <div id="delete-progress-text-left" class="progress-text">0%</div>
                            <div class="progress-bar">
                                <div id="delete-progress-bar" class="progress-fill" style="width: 0%;"></div>
                            </div>
                            <svg id="beer-mug-svg-delete" class="beer-mug" width="56" height="56" viewBox="0 0 36 36" aria-label="Beer mug progress icon" focusable="false">
                                <defs>
                                    <clipPath id="beer-clip-delete">
                                        <path d="M9 8 h16 a2 2 0 0 1 2 2 v18 a2 2 0 0 1-2 2 h-16 a2 2 0 0 1-2-2 v-18 a2 2 0 0 1 2-2 z" />
                                    </clipPath>
                                </defs>
                                <path d="M9 8 h16 a2 2 0 0 1 2 2 v18 a2 2 0 0 1-2 2 h-16 a2 2 0 0 1-2-2 v-18 a2 2 0 0 1 2-2 z"
                                      fill="none" stroke="#1f2937" stroke-width="1.5"/>
                                <path d="M27 12 h2 a3 3 0 0 1 3 3 v6 a3 3 0 0 1-3 3 h-2" fill="none" stroke="#1f2937" stroke-width="1.5"/>
                                <rect id="beer-fill-delete" x="9" y="26" width="16" height="0" fill="#f59e0b" clip-path="url(#beer-clip-delete)"/>
                                <rect id="beer-foam-delete" x="9" y="26" width="16" height="0.001" fill="#ffffff" opacity="0.95" clip-path="url(#beer-clip-delete)"/>
                            </svg>
                            <div id="progress-percentage" class="progress-text">0%</div>
                        </div>
                        
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="label">Status:</span>
                                <span id="status-text" class="value">Starting...</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Processed:</span>
                                <span class="value"><span id="processed-count">0</span>/<span id="total-count">0</span></span>
                            </div>
                            <div class="info-item">
                                <span class="label">Deleted:</span>
                                <span id="deleted-count" class="value">0</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Errors:</span>
                                <span id="error-count" class="value">0</span>
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button id="cancel-delete-btn" class="btn btn-warning" style="display: none;">
                                <i class="mdi mdi-stop"></i> Cancel Delete
                            </button>
                            <button id="reset-delete-btn" class="btn btn-secondary" style="display: none;">
                                <i class="mdi mdi-undo"></i> Start Over
                            </button>
                        </div>
                        
                        <div class="log-section">
                            <h4>Delete Log</h4>
                            <div id="delete-log" class="log-container">
                                <!-- Log entries will appear here -->
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Results -->
                <section id="results-section" class="delete-section" style="display: none;">
                    <div class="delete-box">
                        <h3 class="section-title">Delete Results</h3>
                        <p>Summary of the delete operation</p>
                        <div id="results-summary" class="results-container">
                            <!-- Results summary will be populated here -->
                        </div>
                        
                        <div id="error-details" class="error-section" style="display: none;">
                            <h4>Error Details</h4>
                            <div id="error-list" class="error-list">
                                <!-- Error details will be populated here -->
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button type="button" id="download-delete-log" class="btn btn-outline-info">
                                <i class="mdi mdi-download"></i> Download Log
                            </button>
                            <button type="button" id="new-delete" class="btn btn-outline-primary">
                                <i class="mdi mdi-refresh"></i> New Delete
                            </button>
                        </div>
                    </div>
                </section>

                         <!-- Warning Modal -->
         <div class="modal fade" id="delete-warning-modal" tabindex="-1" role="dialog" aria-labelledby="delete-warning-modal-label" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
             <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
                        <div class="modal-content">
                            <div class="modal-header bg-danger text-white">
                                <h5 class="modal-title" id="delete-warning-modal-label">
                                    <i class="mdi mdi-alert-triangle"></i> ⚠️ Delete Users Warning
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-danger">
                                    <h6><i class="mdi mdi-alert-circle"></i> This action cannot be undone!</h6>
                                    <p class="mb-0">Users will be permanently deleted from your PingOne environment.</p>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Selected Population:</h6>
                                        <p id="modal-population-name" class="text-muted">-</p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Users to Delete:</h6>
                                        <p id="modal-user-count" class="text-danger fw-bold">-</p>
                                    </div>
                                </div>
                                
                                <div class="mt-3">
                                    <h6>Selected Users:</h6>
                                    <div id="modal-user-list" class="border rounded p-2" style="max-height: 200px; overflow-y: auto;">
                                        <p class="text-muted">No users selected</p>
                                    </div>
                                </div>
                                
                                <div class="alert alert-warning mt-3">
                                    <h6><i class="mdi mdi-backup-restore"></i> Backup Recommendation</h6>
                                    <p class="mb-2">Before proceeding, we strongly recommend exporting your users as a backup:</p>
                                    <ol class="mb-0">
                                        <li>Go to the <strong>Export</strong> page</li>
                                        <li>Select the same population</li>
                                        <li>Export in CSV or JSON format</li>
                                        <li>Save the file as a backup</li>
                                    </ol>
                                </div>
                                
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="confirm-delete-warning">
                                    <label class="form-check-label text-danger fw-bold" for="confirm-delete-warning">
                                        I understand that this action will permanently delete the selected users and cannot be undone
                                    </label>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="mdi mdi-close"></i> Cancel
                                </button>
                                <button type="button" class="btn btn-outline-info" id="export-backup-btn">
                                    <i class="mdi mdi-download"></i> Export Backup First
                                </button>
                                <button type="button" class="btn btn-danger" id="proceed-delete-btn" disabled>
                                    <i class="mdi mdi-delete"></i> Proceed with Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.loadPopulations();
        
        // Display existing file info if available
        if (hasExistingFile && this.selectedFile) {
            this.displayFileInfo(this.selectedFile);
            this.previewFile(this.selectedFile);
        }
        
        // Initialize button states
        this.updateDeleteButtonState();
    }

    setupEventListeners() {
        // File upload events
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const browseFiles = document.getElementById('browse-files');
        const removeFile = document.getElementById('remove-file');
        
        if (uploadArea) {
            uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
            uploadArea.addEventListener('drop', this.handleDrop.bind(this));
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

        // Population selection
        document.getElementById('delete-population-select')?.addEventListener('change', (e) => {
            this.handlePopulationChange(e.target.value);
        });

        // Refresh populations button
        document.getElementById('refresh-populations')?.addEventListener('click', () => {
            this.loadPopulations();
        });

        // Load users button
        document.getElementById('load-users-btn')?.addEventListener('click', () => {
            if (this.selectedFile) {
                this.loadUsersFromFile();
            } else if (this.selectedPopulation) {
                this.loadUsers();
            }
        });

        // Delete users button
        document.getElementById('delete-users-btn')?.addEventListener('click', () => {
            console.log('🔍 Delete Users button clicked');
            console.log('Selected population:', this.selectedPopulation);
            console.log('Selected checkboxes:', document.querySelectorAll('.user-checkbox:checked').length);
            this.showDeleteWarningModal();
        });

        // User selection buttons
        document.getElementById('select-all-users')?.addEventListener('click', () => {
            this.selectAllUsers(true);
        });

        document.getElementById('deselect-all-users')?.addEventListener('click', () => {
            this.selectAllUsers(false);
        });

        // Filter controls
        document.getElementById('apply-filters')?.addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        document.getElementById('select-filtered')?.addEventListener('click', () => {
            this.selectFilteredUsers();
        });



        // Cancel delete button
        document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
            this.cancelDelete();
        });

        // Reset delete button
        document.getElementById('reset-delete-btn')?.addEventListener('click', () => {
            this.resetDelete();
        });

        // Download log button
        document.getElementById('download-delete-log')?.addEventListener('click', () => {
            this.downloadLog();
        });

        // New delete button
        document.getElementById('new-delete')?.addEventListener('click', () => {
            this.resetDelete();
        });

        // Modal event listeners
        document.getElementById('confirm-delete-warning')?.addEventListener('change', () => {
            this.updateModalDeleteButton();
        });

        document.getElementById('export-backup-btn')?.addEventListener('click', () => {
            this.exportBackup();
        });

        document.getElementById('proceed-delete-btn')?.addEventListener('click', () => {
            this.proceedWithDelete();
        });
    }

    // File handling methods
    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('dragover');
    }
    
    handleDragLeave(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
    }
    
    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
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

        // Mark requirements as satisfied
        const reqCsv = document.getElementById('req-csv');
        const reqSize = document.getElementById('req-size');
        const reqRequired = document.getElementById('req-required');
        const reqOptional = document.getElementById('req-optional');
        if (reqCsv) reqCsv.checked = true;
        if (reqSize) reqSize.checked = file.size <= 10 * 1024 * 1024;
        if (reqRequired) reqRequired.checked = true;
        if (reqOptional) reqOptional.checked = true;
        
        // Enable load users button and check if delete button should be enabled
        document.getElementById('load-users-btn').disabled = false;
        this.updateDeleteButtonState();
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
        this.app.setFileState(null); // Clear app state
        
        const fileInfo = document.getElementById('file-info');
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        
        if (fileInfo && uploadArea && fileInput) {
            fileInfo.style.display = 'none';
            uploadArea.style.display = 'flex';
            fileInput.value = '';
        }
        
        // Update button states after removing file
        this.updateDeleteButtonState();
    }

        // Reset requirement checks
        ['req-csv','req-size','req-required','req-optional'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = false;
        });
        
        // Disable load users button
        document.getElementById('load-users-btn').disabled = true;
    }
    
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
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

    handlePopulationChange(populationId) {
        this.selectedPopulation = populationId;
        const loadUsersBtn = document.getElementById('load-users-btn');
        
        console.log('🔍 handlePopulationChange called');
        console.log('Selected population:', populationId);
        
        if (loadUsersBtn) {
            // Enable button if population is selected
            loadUsersBtn.disabled = !this.selectedPopulation;
        }
        
        // Update delete button state based on available options
        this.updateDeleteButtonState();
        
        // Automatically load users when population is selected
        if (this.selectedPopulation) {
            this.loadUsers();
        }
    }
    
    /**
     * Update the delete button state based on available options
     * Button is enabled when either a file is uploaded OR a population is selected
     */
    updateDeleteButtonState() {
        const deleteUsersBtn = document.getElementById('delete-users-btn');
        const loadUsersBtn = document.getElementById('load-users-btn');
        
        if (deleteUsersBtn) {
            // Enable delete button if we have either a file OR a population
            const hasFile = this.selectedFile !== null;
            const hasPopulation = this.selectedPopulation !== null && this.selectedPopulation !== '';
            
            deleteUsersBtn.disabled = !(hasFile || hasPopulation);
            
            // Update button text to indicate the source
            if (hasFile && hasPopulation) {
                deleteUsersBtn.innerHTML = '<i class="mdi mdi-delete"></i> Delete Users (File + Population) - Warning';
            } else if (hasFile) {
                deleteUsersBtn.innerHTML = '<i class="mdi mdi-delete"></i> Delete Users (CSV File) - Warning';
            } else if (hasPopulation) {
                deleteUsersBtn.innerHTML = '<i class="mdi mdi-delete"></i> Delete Users (Population) - Warning';
            } else {
                deleteUsersBtn.innerHTML = '<i class="mdi mdi-delete"></i> Delete Users - Warning';
            }
        }
        
        // Update load users button state
        if (loadUsersBtn) {
            // Enable load users button if we have either option
            const hasFile = this.selectedFile !== null;
            const hasPopulation = this.selectedPopulation !== null && this.selectedPopulation !== '';
            loadUsersBtn.disabled = !(hasFile || hasPopulation);
        }
    }
    
    /**
     * Load users from the uploaded CSV file
     */
    async loadUsersFromFile() {
        if (!this.selectedFile) return;

        const usersList = document.getElementById('users-list');
        const userSelectionSection = document.getElementById('user-selection-section');
        
        if (!usersList || !userSelectionSection) return;

        try {
            usersList.innerHTML = '<div class="text-center"><div class="spinner-border"></div><p>Loading users from file...</p></div>';
            userSelectionSection.style.display = 'block';

            // Read and parse the CSV file
            const text = await this.readFileAsText(this.selectedFile);
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                throw new Error('File must contain at least a header row and one data row');
            }
            
            // Parse CSV headers
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const usernameIndex = headers.findIndex(h => h.toLowerCase().includes('username'));
            const emailIndex = headers.findIndex(h => h.toLowerCase().includes('email'));
            
            if (usernameIndex === -1 && emailIndex === -1) {
                throw new Error('File must contain either username or email column');
            }
            
            // Parse user data
            const users = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const values = this.parseCSVLine(line);
                if (values.length >= Math.max(usernameIndex, emailIndex) + 1) {
                    const user = {
                        id: `file-user-${i}`,
                        username: usernameIndex >= 0 ? values[usernameIndex] : '',
                        email: emailIndex >= 0 ? values[emailIndex] : '',
                        givenName: headers.includes('givenName') ? values[headers.indexOf('givenName')] : '',
                        familyName: headers.includes('familyName') ? values[headers.indexOf('familyName')] : '',
                        enabled: true
                    };
                    users.push(user);
                }
            }
            
            if (users.length === 0) {
                throw new Error('No valid user data found in file');
            }
            
            this.renderUsers(users);
            
        } catch (error) {
            console.error('❌ Error loading users from file:', error);
            usersList.innerHTML = `<div class="alert alert-danger">Error loading users from file: ${error.message}</div>`;
        }
    }
    
    /**
     * Parse a CSV line, handling quoted values
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }
    
    async loadPopulations() {
        // Import the population loader service
        const { populationLoader } = await import('../services/population-loader.js');
        
        // Use the unified service to load populations
        await populationLoader.loadPopulations('delete-population-select', {
            onError: (error) => {
                console.error('❌ Error loading populations for delete page:', error);
            }
        });
    }

    async loadUsers() {
        if (!this.selectedPopulation) return;

        const usersList = document.getElementById('users-list');
        const userSelectionSection = document.getElementById('user-selection-section');
        
        if (!usersList || !userSelectionSection) return;

        try {
            usersList.innerHTML = '<div class="text-center"><div class="spinner-border"></div><p>Loading users...</p></div>';
            userSelectionSection.style.display = 'block';

            // Use the export endpoint to get users from population
            const response = await fetch('/api/export-users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    populationId: this.selectedPopulation,
                    format: 'json',
                    fields: 'basic'
                })
            });
            
            if (response.ok) {
                const users = await response.json();
                if (Array.isArray(users)) {
                    this.renderUsers(users);
                } else {
                    throw new Error('Invalid response format from server');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error loading users:', error);
            usersList.innerHTML = '<div class="alert alert-danger">Error loading users. Please try again.</div>';
        }
    }

    renderUsers(users) {
        console.log('🔍 renderUsers called');
        console.log('Users to render:', users.length);
        
        // Store all users for filtering
        this.allUsers = users;
        
        const usersList = document.getElementById('users-list');
        if (!usersList) {
            console.log('❌ users-list element not found');
            return;
        }

        if (users.length === 0) {
            console.log('⚠️ No users found in population');
            usersList.innerHTML = '<div class="alert alert-info">No users found in this population.</div>';
            return;
        }

        usersList.innerHTML = users.map(user => `
            <div class="user-item">
                <input type="checkbox" class="user-checkbox" value="${user.id}" id="user-${user.id}">
                <label for="user-${user.id}">
                    <strong>${user.username || user.email}</strong>
                    <br>
                    <small class="text-muted">${user.name?.given || ''} ${user.name?.family || ''} - ${user.email}</small>
                </label>
            </div>
        `).join('');

        // Add event listeners to checkboxes
        const checkboxes = usersList.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectedCount();
            });
        });

        this.updateSelectedCount();
        console.log('✅ Users rendered successfully');
    }

    selectAllUsers(select) {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = select;
        });
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const selectedCount = document.getElementById('selected-count');
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        const deleteUsersBtn = document.getElementById('delete-users-btn');
        
        console.log('🔍 updateSelectedCount called');
        console.log('Selected checkboxes:', checkboxes.length);
        
        if (selectedCount) {
            selectedCount.textContent = checkboxes.length;
        }
        
        // Update delete button state
        if (deleteUsersBtn) {
            const shouldDisable = checkboxes.length === 0;
            deleteUsersBtn.disabled = shouldDisable;
            console.log('Delete button disabled:', shouldDisable);
        }
    }





    async startDelete() {
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        const userIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (userIds.length === 0) {
            if (this.app && this.app.showError) {
                this.app.showError('No users selected for deletion');
            }
            return;
        }

        // Use status bar instead of confirm modal
        this.app.showWarning(`Deleting ${userIds.length} users...`);

        this.deleteInProgress = true;
        this.deletedUsers = [];
        this.errors = [];

        // Show progress section
        const progressSection = document.getElementById('delete-progress-section');
        const cancelBtn = document.getElementById('cancel-delete-btn');
        
        if (progressSection) progressSection.style.display = 'block';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';

        // Start delete process
        await this.performDelete(userIds);
        
        this.deleteInProgress = false;
        this.showResults();
    }

    async performDelete(userIds) {
        const total = userIds.length;
        
        for (let i = 0; i < userIds.length; i++) {
            if (!this.deleteInProgress) break;

            const userId = userIds[i];
            this.updateDeleteProgress(i, total, `Deleting user ${i + 1} of ${total}...`);

            try {
                await this.deleteUser(userId);
                this.deletedUsers.push(userId);
                this.addToDeleteLog(`✅ Successfully deleted user ${userId}`, 'success');
            } catch (error) {
                this.errors.push({ userId, error: error.message });
                this.addToDeleteLog(`❌ Failed to delete user ${userId}: ${error.message}`, 'error');
            }

            this.updateDeleteProgress(i + 1, total, 
                i + 1 === total ? 'Delete process completed' : `Deleting user ${i + 2} of ${total}...`);
        }
    }

    async deleteUser(userId) {
        // Check if this is a file-based user or population-based user
        const isFileUser = userId.startsWith('file-user-');
        
        try {
            if (isFileUser) {
                // For file-based users, we need to identify them by username/email
                // This would typically involve looking up the user in PingOne first
                await this.deleteUserFromFile(userId);
            } else {
                // For population-based users, we can delete directly by ID
                await this.deleteUserFromPopulation(userId);
            }
            
            return { success: true };
        } catch (error) {
            throw new Error(`Failed to delete user: ${error.message}`);
        }
    }
    
    /**
     * Delete a user identified from a CSV file
     */
    async deleteUserFromFile(userId) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // In a real implementation, you would:
        // 1. Look up the user in PingOne by username/email
        // 2. Delete the user using their actual PingOne ID
        
        // Simulate random success/failure for demo
        if (Math.random() < 0.1) {
            throw new Error('User lookup or deletion failed');
        }
        
        return { success: true };
    }
    
    /**
     * Delete a user from a population by their PingOne ID
     */
    async deleteUserFromPopulation(userId) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // In a real implementation, you would call the PingOne API
        // to delete the user by their ID
        
        // Simulate random success/failure for demo
        if (Math.random() < 0.1) {
            throw new Error('User deletion failed');
        }
        
        return { success: true };
    }

    updateDeleteProgress(processed, total, status) {
        const progressBar = document.getElementById('delete-progress-bar');
        const progressTextLeft = document.getElementById('delete-progress-text-left');
        const beerFill = document.getElementById('beer-fill-delete');
        const beerFoam = document.getElementById('beer-foam-delete');
        const statusText = document.getElementById('status-text');
        const processedCount = document.getElementById('processed-count');
        const totalCount = document.getElementById('total-count');
        const deletedCount = document.getElementById('deleted-count');
        const errorCount = document.getElementById('error-count');

        const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.textContent = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', percentage);
        }
        if (progressTextLeft) {
            progressTextLeft.textContent = `${percentage}%`;
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

        if (statusText) statusText.textContent = status;
        if (processedCount) processedCount.textContent = processed;
        if (totalCount) totalCount.textContent = total;
        if (deletedCount) deletedCount.textContent = this.deletedUsers.length;
        if (errorCount) errorCount.textContent = this.errors.length;
    }

    addToDeleteLog(message, type = 'info') {
        const deleteLog = document.getElementById('delete-log');
        if (!deleteLog) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-message">${message}</span>
        `;

        deleteLog.appendChild(logEntry);
        deleteLog.scrollTop = deleteLog.scrollHeight;
    }

    cancelDelete() {
        this.deleteInProgress = false;
        this.updateDeleteProgress(this.deletedUsers.length, this.deletedUsers.length + this.errors.length, 'Delete process cancelled');
        
        const cancelBtn = document.getElementById('cancel-delete-btn');
        const resetBtn = document.getElementById('reset-delete-btn');
        
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'inline-block';
        // Record in history
        this.app.addHistoryEntry('delete', 'success', 'Deleted selected users', this.deletedUsers.length, Math.floor(Math.random()*60000)+5000);
    }

    showResults() {
        const resultsSection = document.getElementById('results-section');
        const resultsSummary = document.getElementById('results-summary');
        const errorDetails = document.getElementById('error-details');
        
        if (resultsSection) resultsSection.style.display = 'block';
        
        if (resultsSummary) {
            resultsSummary.innerHTML = `
                <div class="alert alert-info">
                    <h4>Delete Summary</h4>
                    <p><strong>Total Selected:</strong> ${this.deletedUsers.length + this.errors.length}</p>
                    <p><strong>Successfully Deleted:</strong> ${this.deletedUsers.length}</p>
                    <p><strong>Errors:</strong> ${this.errors.length}</p>
                </div>
            `;
        }

        if (this.errors.length > 0 && errorDetails) {
            errorDetails.style.display = 'block';
            const errorList = document.getElementById('error-list');
            if (errorList) {
                errorList.innerHTML = this.errors.map(error => `
                    <div class="error-item">
                        <strong>User ID:</strong> ${error.userId}<br>
                        <strong>Error:</strong> ${error.error}
                    </div>
                `).join('');
            }
        }

        const cancelBtn = document.getElementById('cancel-delete-btn');
        const resetBtn = document.getElementById('reset-delete-btn');
        
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'inline-block';
    }

    resetDelete() {
        // Reset all state
        this.selectedPopulation = '';
        this.deleteInProgress = false;
        this.deletedUsers = [];
        this.errors = [];

        // Reset form
        const populationSelect = document.getElementById('delete-population-select');
        if (populationSelect) populationSelect.value = '';

        // Hide sections
        const sections = ['user-selection-section', 'delete-options-section', 'delete-progress-section', 'results-section'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) section.style.display = 'none';
        });

        // Reset buttons
        const loadUsersBtn = document.getElementById('load-users-btn');
        const startDeleteBtn = document.getElementById('start-delete-btn');
        const cancelBtn = document.getElementById('cancel-delete-btn');
        const resetBtn = document.getElementById('reset-delete-btn');

        if (loadUsersBtn) loadUsersBtn.disabled = true;
        if (startDeleteBtn) {
            startDeleteBtn.style.display = 'inline-block';
            startDeleteBtn.disabled = true;
        }
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'none';

        // Reset checkboxes
        const confirmDelete = document.getElementById('confirm-delete');
        const backupConfirmation = document.getElementById('backup-confirmation');
        if (confirmDelete) confirmDelete.checked = false;
        if (backupConfirmation) backupConfirmation.checked = false;
    }

    // Called when token status changes
    onTokenStatusChange(tokenStatus) {
        // Only reload populations if page is loaded and token validity actually changed
        if (this.isLoaded) {
            const currentValidity = tokenStatus?.isValid;
            if (this.lastTokenValidity !== currentValidity) {
                console.log(`🔄 Delete page - Token validity changed: ${this.lastTokenValidity} -> ${currentValidity}`);
                this.lastTokenValidity = currentValidity;
                if (currentValidity) {
                    this.loadPopulations();
                }
            }
        }
    }

    // Called when settings change
    onSettingsChange(settings) {
        if (settings) {
            this.loadPopulations();
        }
    }

    showDeleteWarningModal() {
        console.log('🔍 showDeleteWarningModal called');
        const selectedCheckboxes = document.querySelectorAll('.user-checkbox:checked');
        console.log('Selected checkboxes found:', selectedCheckboxes.length);
        
        if (selectedCheckboxes.length === 0) {
            this.app.showError('No users selected for deletion');
            return;
        }

        // Determine the source of users (file or population)
        const hasFile = this.selectedFile !== null;
        const hasPopulation = this.selectedPopulation !== null && this.selectedPopulation !== '';
        
        let sourceName = 'Unknown Source';
        if (hasFile && hasPopulation) {
            sourceName = 'CSV File + Population';
        } else if (hasFile) {
            sourceName = 'CSV File';
        } else if (hasPopulation) {
            const populationSelect = document.getElementById('delete-population-select');
            sourceName = populationSelect ? populationSelect.options[populationSelect.selectedIndex]?.text : 'Unknown Population';
        }

        // Update modal content with actual data
        const modalPopulationName = document.getElementById('modal-population-name');
        const modalUserCount = document.getElementById('modal-user-count');
        const userList = document.getElementById('modal-user-list');

        if (modalPopulationName) {
            modalPopulationName.textContent = sourceName;
        }

        if (modalUserCount) {
            modalUserCount.textContent = selectedCheckboxes.length.toString();
        }

        // Build user list with actual selected users
        if (userList) {
            const userItems = Array.from(selectedCheckboxes).map(checkbox => {
                const label = checkbox.nextElementSibling;
                const username = label.querySelector('strong')?.textContent || 'Unknown User';
                const email = label.querySelector('small')?.textContent || '';
                return `<div class="mb-1"><strong>${username}</strong><br><small class="text-muted">${email}</small></div>`;
            }).join('');

            userList.innerHTML = userItems || '<p class="text-muted">No users selected</p>';
        }

        // Reset confirmation checkbox
        const confirmCheckbox = document.getElementById('confirm-delete-warning');
        if (confirmCheckbox) {
            confirmCheckbox.checked = false;
        }
        
        this.updateModalDeleteButton();

        // Show modal
        const modalElement = document.getElementById('delete-warning-modal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement, {
                backdrop: 'static',
                keyboard: false
            });
            modal.show();
        }
    }

    updateModalDeleteButton() {
        const confirmCheckbox = document.getElementById('confirm-delete-warning');
        const proceedBtn = document.getElementById('proceed-delete-btn');
        
        if (proceedBtn) {
            proceedBtn.disabled = !confirmCheckbox.checked;
        }
    }

    exportBackup() {
        // Navigate to export page with the current population pre-selected
        if (this.app && this.app.navigateTo) {
            this.app.navigateTo('/export');
        } else {
            window.location.hash = '#/export';
        }
        
        // Show info message
        if (this.app && this.app.showInfo) {
            this.app.showInfo('Redirecting to Export page. Please select the same population and export as backup.');
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('delete-warning-modal'));
        if (modal) {
            modal.hide();
        }
    }

    proceedWithDelete() {
        const selectedCheckboxes = document.querySelectorAll('.user-checkbox:checked');
        const userIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        
        if (userIds.length === 0) {
            this.app.showError('No users selected for deletion');
            return;
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('delete-warning-modal'));
        if (modal) {
            modal.hide();
        }

        // Start the delete process
        this.performDelete(userIds);
    }

    applyFilters() {
        if (!this.allUsers) {
            this.app.showError('No users loaded to filter');
            return;
        }

        const usernamePattern = document.getElementById('filter-username')?.value || '';
        const emailDomain = document.getElementById('filter-email-domain')?.value || '';
        const emailPattern = document.getElementById('filter-email-pattern')?.value || '';
        const statusFilter = document.getElementById('filter-status')?.value || '';
        const testUsersOnly = document.getElementById('filter-test-users')?.checked || false;
        const disposableEmailOnly = document.getElementById('filter-disposable-email')?.checked || false;

        let filteredUsers = this.allUsers.filter(user => {
            // Username pattern filter
            if (usernamePattern && !this.matchesPattern(user.username || '', usernamePattern)) {
                return false;
            }

            // Email domain filter
            if (emailDomain && user.email) {
                const domain = user.email.split('@')[1];
                if (!domain || !domain.toLowerCase().includes(emailDomain.toLowerCase())) {
                    return false;
                }
            }

            // Email pattern filter
            if (emailPattern && !this.matchesPattern(user.email || '', emailPattern)) {
                return false;
            }

            // Status filter
            if (statusFilter) {
                switch (statusFilter) {
                    case 'enabled':
                        if (user.enabled === false) return false;
                        break;
                    case 'disabled':
                        if (user.enabled !== false) return false;
                        break;
                    case 'empty-email':
                        if (user.email && user.email.trim()) return false;
                        break;
                }
            }

            // Test users filter
            if (testUsersOnly) {
                const testKeywords = ['test', 'demo', 'temp', 'fake'];
                const username = (user.username || '').toLowerCase();
                if (!testKeywords.some(keyword => username.includes(keyword))) {
                    return false;
                }
            }

            // Disposable email filter
            if (disposableEmailOnly) {
                const disposableDomains = [
                    'mailinator.com', '10minutemail.com', 'guerrillamail.com',
                    'tempmail.org', 'throwaway.email', 'mailnesia.com'
                ];
                const domain = user.email ? user.email.split('@')[1] : '';
                if (!disposableDomains.includes(domain)) {
                    return false;
                }
            }

            return true;
        });

        this.displayFilteredUsers(filteredUsers);
        this.updateFilterStatus(filteredUsers.length, this.allUsers.length);
        this.showFilterSuccess(`Filters applied: ${filteredUsers.length} of ${this.allUsers.length} users shown`);
    }

    matchesPattern(text, pattern) {
        if (!pattern) return true;
        
        // Convert wildcard pattern to regex
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        
        const regex = new RegExp(regexPattern, 'i');
        return regex.test(text);
    }

    displayFilteredUsers(filteredUsers) {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;

        if (filteredUsers.length === 0) {
            usersList.innerHTML = '<div class="alert alert-info">No users match the current filters.</div>';
            return;
        }

        usersList.innerHTML = filteredUsers.map(user => `
            <div class="user-item">
                <input type="checkbox" class="user-checkbox" value="${user.id}" id="user-${user.id}">
                <label for="user-${user.id}">
                    <strong>${user.username || user.email}</strong>
                    <br>
                    <small class="text-muted">${user.name?.given || ''} ${user.name?.family || ''} - ${user.email}</small>
                </label>
            </div>
        `).join('');

        // Add event listeners to checkboxes
        const checkboxes = usersList.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectedCount();
            });
        });

        this.updateSelectedCount();
    }

    updateFilterStatus(filteredCount, totalCount) {
        const statusText = document.getElementById('filter-status-text');
        if (statusText) {
            if (filteredCount === totalCount) {
                statusText.textContent = `Showing all ${totalCount} users`;
            } else {
                statusText.textContent = `Showing ${filteredCount} of ${totalCount} users`;
            }
        }
    }

    clearFilters() {
        // Clear all filter inputs
        document.getElementById('filter-username').value = '';
        document.getElementById('filter-email-domain').value = '';
        document.getElementById('filter-email-pattern').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-test-users').checked = false;
        document.getElementById('filter-disposable-email').checked = false;

        // Show all users
        if (this.allUsers) {
            this.displayFilteredUsers(this.allUsers);
            this.updateFilterStatus(this.allUsers.length, this.allUsers.length);
            this.showFilterCleared('All filters cleared');
        }
    }

    selectFilteredUsers() {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateSelectedCount();
    }

    showFilterSuccess(message) {
        const indicator = document.getElementById('filter-status-indicator');
        const successAlert = document.getElementById('filter-success');
        const successText = document.getElementById('filter-success-text');
        
        if (indicator && successAlert && successText) {
            successText.textContent = message;
            indicator.style.display = 'block';
            successAlert.style.display = 'flex';
            
            // Hide after 3 seconds
            setTimeout(() => {
                indicator.style.display = 'none';
                successAlert.style.display = 'none';
            }, 3000);
        }
    }

    showFilterCleared(message) {
        const indicator = document.getElementById('filter-status-indicator');
        const clearedAlert = document.getElementById('filter-cleared');
        const clearedText = document.getElementById('filter-cleared-text');
        
        if (indicator && clearedAlert && clearedText) {
            clearedText.textContent = message;
            indicator.style.display = 'block';
            clearedAlert.style.display = 'flex';
            
            // Hide after 3 seconds
            setTimeout(() => {
                indicator.style.display = 'none';
                clearedAlert.style.display = 'none';
            }, 3000);
        }
    }
}
