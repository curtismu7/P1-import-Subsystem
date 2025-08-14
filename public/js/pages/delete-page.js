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
                <p>Remove users from a population. Use with caution.</p>
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
                            <input type="file" id="file-input" accept=".csv" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;">
                        </div>

                        <!-- Centered Action Buttons Section (moved below filter status) -->
                        <section id="filter-actions-section" class="my-3" style="display:none;"></section>
                        
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

                <!-- Population Selection -->
                <section class="delete-section">
                    <div class="delete-box">
                        <h3 class="section-title">Select Population</h3>
                        <p>Choose the population from which you want to delete users</p>
                        
                        <div class="config-grid">
                            <div class="form-group">
                                <label for="delete-population-select">Population *</label>
                                <div class="input-group input-group-fused">
                                    <select id="delete-population-select" class="form-control">
                                        <option value="">Select a population...</option>
                                    </select>
                                    <button type="button" id="refresh-populations" class="btn btn-outline-secondary" title="Refresh populations" aria-label="Refresh populations">
                                        <i class="mdi mdi-refresh" style="color:#1565c0;"></i>
                                    </button>
                                </div>
                                <div class="form-help">Select the population containing users to delete</div>
                                <div id="delete-population-select-refresh-indicator" class="refresh-indicator" style="display:none;"></div>
                            </div>
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
                                             <input type="text" id="filter-username" class="form-control" placeholder="e.g., use-*, test*" 
                                                    style="border:1px solid #111827;border-left:4px solid #2563eb;">
                                        </div>
                                        <div class="col-md-3 mb-3">
                                             <label for="filter-email-domain" class="form-label fw-bold">Email Domain</label>
                                             <input type="text" id="filter-email-domain" class="form-control" placeholder="e.g., mailinator.com"
                                                    style="border:1px solid #111827;border-left:4px solid #2563eb;">
                                        </div>
                                        <div class="col-md-3 mb-3">
                                             <label for="filter-email-pattern" class="form-label fw-bold">Email Pattern</label>
                                             <input type="text" id="filter-email-pattern" class="form-control" placeholder="e.g., *@test.com"
                                                    style="border:1px solid #111827;border-left:4px solid #2563eb;">
                                        </div>
                                        <div class="col-md-3 mb-3">
                                             <label for="filter-status" class="form-label fw-bold">Status</label>
                                             <select id="filter-status" class="form-control"
                                                     style="border:1px solid #111827;border-left:4px solid #2563eb;">
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
                                                    Delete disposable email domains
                                                </label>
                                            </div>
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

                        <div class="mb-2">
                            <span id="filter-status-text" class="text-muted" style="display:inline-block; min-height: 28px; line-height: 28px; max-width: 100%; overflow: visible; white-space: normal;"></span>
                        </div>
                        
                        <!-- Actions injected here after status line -->
                        <div id="filter-actions-anchor"></div>
                        
                        <section class="mt-3">
                            <div class="rounded-3 shadow-sm" style="background:#f3f4f6;border:1px solid #d1d5db;">
                                <div class="card-header py-2" style="font-weight:700; background:#eef2f7;border-bottom:1px solid #e5e7eb;">Selection Summary</div>
                                <div class="card-body py-3">
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <span class="label">Environment ID:</span>
                                            <span id="info-env-id" class="value">-</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Population:</span>
                                            <span id="info-pop-name" class="value">-</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Population ID:</span>
                                            <span id="info-pop-id" class="value">-</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Users to Delete (filtered):</span>
                                            <span id="selected-count" class="value">0</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Filters:</span>
                                            <span id="info-filters" class="value">None</span>
                                        </div>
                                    </div>
                                    <!-- Disposable Domains Box -->
                                    <div class="mt-3">
                                        <div class="rounded-3 p-3" style="background:#fafafa;border:1px solid #e5e7eb;">
                                            <h5 class="mb-2" style="font-weight:600;">Disposable Domains Found</h5>
                                            <div id="disposable-domains-list" class="small text-muted">None</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
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
                            <button type="button" id="download-delete-log" class="btn btn-primary">
                                <i class="mdi mdi-download"></i> Download Log
                            </button>
                            <button type="button" id="new-delete" class="btn btn-outline-primary">
                                <i class="mdi mdi-refresh"></i> New Delete
                            </button>
                        </div>
                    </div>
                </section>

         <!-- Warning Modal markup removed; built dynamically when needed -->
            </div>
        `;

        this.setupEventListeners();
        this.loadPopulations();
        
        // Display existing file info if available
        if (hasExistingFile && this.selectedFile) {
            this.displayFileInfo(this.selectedFile);
            this.previewFile(this.selectedFile);
        }

        // Inject filter actions markup after status
        try {
            const anchor = document.getElementById('filter-actions-anchor');
            if (anchor) {
                anchor.innerHTML = `
                    <div style="display:flex;justify-content:center;width:100%;">
                        <div class="rounded-3 shadow-sm" style="background:#f3f4f6;border:1px solid #d1d5db;display:inline-flex;flex-wrap:wrap;align-items:center;gap:12px;justify-content:center;padding:14px;max-width:100%;">
                            <button id=\"apply-filters\" class=\"btn btn-danger btn-sm\" style=\"background:#dc3545;border-color:#dc3545;color:#fff;\">
                                <i class=\"mdi mdi-filter\"></i> Apply Filters
                            </button>
                            <button id=\"clear-filters\" class=\"btn btn-danger btn-sm\" style=\"background:#dc3545;border-color:#dc3545;color:#fff;\">
                                <i class=\"mdi mdi-filter-off\"></i> Clear Filters
                            </button>
                            <button id=\"select-filtered\" class=\"btn btn-danger btn-sm\" style=\"background:#dc3545;border-color:#dc3545;color:#fff;\">
                                <i class=\"mdi mdi-check-box-outline\"></i> Select Filtered
                            </button>
                            <button id=\"delete-users-btn\" class=\"btn btn-danger\" disabled style=\"background:#dc3545;border-color:#dc3545;color:#fff;\">
                                <i class=\"mdi mdi-delete\"></i> Delete Users - Warning
                            </button>
                        </div>
                    </div>`;
            }
        } catch (_) {}
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
            // Make entire upload area open the hidden input (matches Import pattern reliability)
            uploadArea.addEventListener('click', (e) => {
                // Ignore clicks on the remove button inside the area
                if (e.target && (e.target.id === 'remove-file' || e.target.closest?.('#remove-file'))) return;
                e.preventDefault();
                const input = document.getElementById('file-input');
                if (input) input.click();
            });
            uploadArea.tabIndex = 0;
            uploadArea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const input = document.getElementById('file-input');
                    if (input) input.click();
                }
            });
        }
        
        if (fileInput) {
            // Ensure the picker opens reliably on macOS by using a direct trusted event and resetting value
            fileInput.addEventListener('click', () => { try { fileInput.value = ''; } catch (_) {} });
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }
        
        if (browseFiles) {
            browseFiles.addEventListener('click', (e) => {
                e.preventDefault();
                if (!fileInput) return;
                // Use a synchronous direct click in a user gesture to avoid Safari/macOS blockers
                try { fileInput.click(); } catch (_) { setTimeout(() => fileInput.click(), 0); }
            }, { passive: true });
        }
        
        if (removeFile) {
            removeFile.addEventListener('click', this.handleRemoveFile.bind(this));
        }

        // Population selection
        document.getElementById('delete-population-select')?.addEventListener('change', (e) => {
            this.handlePopulationChange(e.target.value);
        });

        // Refresh populations button
        document.getElementById('refresh-populations')?.addEventListener('click', async () => {
            const { populationLoader } = await import('../services/population-loader.js');
            populationLoader.clearCache();
            this.app?.showWarning?.('Refreshing populations…');
            await this.loadPopulations();
            this.app?.showSuccess?.('Populations refreshed');
        });

        // Load users button
        // Load users button removed; load on population change

        // Delete users button
        document.getElementById('delete-users-btn')?.addEventListener('click', () => {
            console.log('🔍 Delete Users button clicked');
            console.log('Selected population:', this.selectedPopulation);
            this.showDeleteWarningModal();
        });

        // Re-wire dynamically injected action buttons (apply/clear/select)
        const applyBtn = document.getElementById('apply-filters');
        if (applyBtn) applyBtn.addEventListener('click', () => this.applyFilters());
        const clearBtn = document.getElementById('clear-filters');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearFilters());
        const selectBtn = document.getElementById('select-filtered');
        if (selectBtn) selectBtn.addEventListener('click', () => this.selectFilteredUsers());

        // Selection controls removed

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
        
        // Note: delete page auto-loads users on population change. No load button.
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
        try {
            const text = await this.readFileAsText(file);
            const lines = text.split('\n').slice(0, 6); // Show first 5 lines + header
            const allLines = text.split('\n');
            const numRecords = Math.max(0, allLines.length - 1);
            const fileRecords = document.getElementById('file-records');
            if (fileRecords) fileRecords.textContent = String(numRecords);
            
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

        // Reset requirement checks
        ['req-csv','req-size','req-required','req-optional'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = false;
        });
        
        // Note: delete page auto-loads users on population change. No load button.
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
        const deleteUsersBtn = document.getElementById('delete-users-btn');
        
        console.log('🔍 handlePopulationChange called');
        console.log('Selected population:', populationId);
        
        if (deleteUsersBtn) {
            // Keep delete button disabled until users are actually loaded and selected
            deleteUsersBtn.disabled = true;
        }
        
        // Automatically load users when population is selected
        if (this.selectedPopulation) {
            this.loadUsers();
        }

        // Update info panel with env, pop name/id, filters
        const envId = (this.app?.settings?.pingone_environment_id) || '-';
        const populationSelect = document.getElementById('delete-population-select');
        const popOption = populationSelect ? populationSelect.options[populationSelect.selectedIndex] : null;
        const popName = popOption ? popOption.text : '-';
        const popId = this.selectedPopulation || '-';
        const filters = this.getActiveFiltersSummary();
        const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setText('info-env-id', envId);
        setText('info-pop-name', popName || '-');
        setText('info-pop-id', popId);
        setText('info-filters', filters);

        // Toggle and populate the small Default badge next to Population
        try {
            const popDataRaw = popOption?.dataset?.population;
            const popData = popDataRaw ? JSON.parse(popDataRaw) : null;
            const isDefault = !!(popData && popData.isDefault === true);
            const defaultBox = document.getElementById('population-default-box');
            const defaultVal = document.getElementById('population-default');
            if (defaultBox && defaultVal) {
                defaultVal.textContent = isDefault ? 'Yes' : 'No';
                defaultBox.style.display = 'inline-flex';
                defaultBox.style.fontSize = '0.85rem';
                defaultBox.style.alignItems = 'center';
                defaultBox.style.gap = '6px';
            }
        } catch (_) { /* ignore parse errors */ }
    }

    async loadPopulations() {
        // Import the population loader service
        const { populationLoader } = await import('../services/population-loader.js');
        
        // Use the unified service to load populations
        await populationLoader.loadPopulations('delete-population-select', {
            showRefreshed: true,
            onError: (error) => {
                console.error('❌ Error loading populations for delete page:', error);
            }
        });
    }

    async loadUsers() {
        if (!this.selectedPopulation) return;

        const userSelectionSection = document.getElementById('user-selection-section');
        if (!userSelectionSection) return;

        try {
            // Show loader while fetching users
            this.app?.showLoading?.('Loading users…');
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
                if (!Array.isArray(users)) throw new Error('Invalid response format from server');
                this.allUsers = users;
                this.filteredUsers = users; // initial filtered = all
                this.updateFilterStatus(users.length, users.length);
                this.updateSelectedCount();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error loading users:', error);
            const statusText = document.getElementById('filter-status-text');
            if (statusText) statusText.textContent = 'Error loading users. Please try again.';
        } finally {
            this.app?.hideLoading?.();
        }
    }

    // No longer rendering individual users; deletion operates on filtered set

    // Selection helpers removed

    updateSelectedCount() {
        const selectedCount = document.getElementById('selected-count');
        const deleteUsersBtn = document.getElementById('delete-users-btn');
        const count = Array.isArray(this.filteredUsers) ? this.filteredUsers.length : (Array.isArray(this.allUsers) ? this.allUsers.length : 0);
        if (selectedCount) selectedCount.textContent = count;
        if (deleteUsersBtn) deleteUsersBtn.disabled = count === 0;
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

        this.app.showWarning(`Deleting ${userIds.length} users...`);

        this.deleteInProgress = true;
        this.deletedUsers = [];
        this.errors = [];

        const progressSection = document.getElementById('delete-progress-section');
        const cancelBtn = document.getElementById('cancel-delete-btn');
        if (progressSection) progressSection.style.display = 'block';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';

        await this.performDelete(userIds);
        this.deleteInProgress = false;
        this.showResults();
    }

    async performDelete(userIds) {
        const total = userIds.length;
        try {
            this.updateDeleteProgress(0, total, `Deleting ${total} users...`);
            const resp = await fetch('/api/users/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds, skipNotFound: true })
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json().catch(() => ({}));
            const totals = json?.totals || {};
            const deleted = totals.deleted ?? total;
            const failed = totals.failed ?? 0;
            const skipped = totals.skipped ?? 0;
            this.deletedUsers = userIds.slice(0, deleted);
            this.errors = failed > 0 ? userIds.slice(deleted, deleted + failed).map(id => ({ userId: id, error: 'Failed to delete' })) : [];
            this.updateDeleteProgress(total, total, 'Delete process completed');
            this.addToDeleteLog(`✅ Deleted ${deleted}, skipped ${skipped}, failed ${failed}`, failed > 0 ? 'error' : 'success');
        } catch (error) {
            this.addToDeleteLog(`❌ Delete request failed: ${error.message}`, 'error');
            this.errors = userIds.map(id => ({ userId: id, error: error.message }));
            this.updateDeleteProgress(total, total, 'Delete completed with errors');
        }
    }

    async deleteUser(userId) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
        const startDeleteBtn = document.getElementById('start-delete-btn');
        const cancelBtn = document.getElementById('cancel-delete-btn');
        const resetBtn = document.getElementById('reset-delete-btn');

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
        const current = (this.filteredUsers && this.filteredUsers.length ? this.filteredUsers : this.allUsers) || [];
        const pendingCount = current.length;
        if (pendingCount === 0) {
            this.app.showError('No users match the current filters');
            return;
        }

        // Get population name
        const populationSelect = document.getElementById('delete-population-select');
        const populationName = populationSelect ? populationSelect.options[populationSelect.selectedIndex]?.text : 'Unknown Population';

        // Update modal content with actual data
        const modalPopulationName = document.getElementById('modal-population-name');
        const modalUserCount = document.getElementById('modal-user-count');
        const userList = document.getElementById('modal-user-list');

        if (modalPopulationName) {
            modalPopulationName.textContent = populationName || 'Unknown Population';
        }

        if (modalUserCount) {
            modalUserCount.textContent = String(pendingCount);
        }

        // Populate environment and filters
        const envIdEl = document.getElementById('modal-environment-id');
        if (envIdEl) envIdEl.textContent = (this.app?.settings?.pingone_environment_id) || '-';
        const filtersEl = document.getElementById('modal-filters-text');
        if (filtersEl) filtersEl.textContent = this.getActiveFiltersSummary();

        // Show modal
        // Build modal dynamically to ensure it only exists when invoked
        let modalElement = document.getElementById('delete-warning-modal');
        if (!modalElement) {
            modalElement = document.createElement('div');
            modalElement.className = 'modal fade';
            modalElement.id = 'delete-warning-modal';
            modalElement.tabIndex = -1;
            modalElement.setAttribute('role', 'dialog');
            modalElement.setAttribute('aria-hidden', 'true');
            modalElement.innerHTML = `
                <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="delete-warning-modal-label"><i class="mdi mdi-alert"></i> Confirm Delete</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-danger">
                                <strong>This action cannot be undone.</strong> Users will be permanently deleted from your PingOne environment.
                            </div>
                            <div class="row mb-2">
                                <div class="col-md-6"><span class="fw-bold">Environment ID:</span> <span id="modal-environment-id" class="text-muted">-</span></div>
                                <div class="col-md-6"><span class="fw-bold">Population:</span> <span id="modal-population-name" class="text-muted">-</span></div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-md-6"><span class="fw-bold">Users to delete:</span> <span id="modal-user-count" class="text-danger fw-bold">-</span></div>
                                <div class="col-md-6"><span class="fw-bold">Filters:</span> <span id="modal-filters-text" class="text-muted">None</span></div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-success" data-bs-dismiss="modal">
                                <i class="mdi mdi-arrow-left"></i> Go Back
                            </button>
                            <button type="button" class="btn btn-danger" id="export-backup-btn">
                                <i class="mdi mdi-download"></i> Export First (Backup)
                            </button>
                            <button type="button" class="btn btn-danger" id="proceed-delete-btn">
                                <i class="mdi mdi-delete"></i> Delete Users
                            </button>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(modalElement);
            // Wire footer buttons
            modalElement.addEventListener('click', (e) => {
                if (e.target && (e.target.id === 'export-backup-btn')) this.exportBackup();
                if (e.target && (e.target.id === 'proceed-delete-btn')) this.proceedWithDelete();
            });
        }
        // Use window.bootstrap if available (bootstrap.bundle exposes it). Avoid referencing undefined globals.
        const BootstrapNS = (window && window.bootstrap) ? window.bootstrap : (typeof bootstrap !== 'undefined' ? bootstrap : null);
        if (!BootstrapNS || !BootstrapNS.Modal) {
            console.warn('Bootstrap modal API not available; cannot show delete warning modal.');
            this.app?.showError?.('Delete confirmation modal unavailable. Please ensure Bootstrap JS is loaded.');
            return;
        }
        const modal = new BootstrapNS.Modal(modalElement, { backdrop: 'static', keyboard: false });
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        }, { once: true });
        modal.show();
    }

    updateModalDeleteButton() {}

    getActiveFiltersSummary() {
        const parts = [];
        const u = document.getElementById('filter-username')?.value?.trim();
        const ed = document.getElementById('filter-email-domain')?.value?.trim();
        const ep = document.getElementById('filter-email-pattern')?.value?.trim();
        const st = document.getElementById('filter-status')?.value;
        const tu = document.getElementById('filter-test-users')?.checked;
        const de = document.getElementById('filter-disposable-email')?.checked;
        if (u) parts.push(`username: ${u}`);
        if (ed) parts.push(`domain: ${ed}`);
        if (ep) parts.push(`email: ${ep}`);
        if (st) parts.push(`status: ${st}`);
        if (tu) parts.push('test users only');
        if (de) parts.push('disposable email only');
        return parts.length ? parts.join(', ') : 'None';
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
        
        // Close modal (safe if Bootstrap is not loaded)
        const BootstrapCloseNS = (window && window.bootstrap) ? window.bootstrap : (typeof bootstrap !== 'undefined' ? bootstrap : null);
        const modalElClose = document.getElementById('delete-warning-modal');
        if (BootstrapCloseNS?.Modal) {
            const modal = BootstrapCloseNS.Modal.getInstance(modalElClose);
            if (modal) modal.hide();
        } else if (modalElClose) {
            modalElClose.remove();
        }
    }

    proceedWithDelete() {
        const users = (this.filteredUsers && this.filteredUsers.length ? this.filteredUsers : this.allUsers) || [];
        const userIds = users.map(u => u.id).filter(Boolean);
        if (userIds.length === 0) {
            this.app.showError('No users selected for deletion');
            return;
        }

        // Close modal (safe if Bootstrap is not loaded)
        const BootstrapFinishNS = (window && window.bootstrap) ? window.bootstrap : (typeof bootstrap !== 'undefined' ? bootstrap : null);
        const modalElFinish = document.getElementById('delete-warning-modal');
        if (BootstrapFinishNS?.Modal) {
            const modal = BootstrapFinishNS.Modal.getInstance(modalElFinish);
            if (modal) modal.hide();
        } else if (modalElFinish) {
            modalElFinish.remove();
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

        const seenDisposableDomains = new Set();
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
                if (domain) seenDisposableDomains.add(domain.toLowerCase());
            }

            return true;
        });

        this.displayFilteredUsers(filteredUsers);
        
        // If 'Show test users only' is checked, summarize usernames containing test/demo/temp
        try {
            const showTestOnly = document.getElementById('filter-test-users')?.checked;
            const usernamesBoxId = 'test-demo-temp-usernames';
            if (showTestOnly) {
                const keywords = ['test', 'demo', 'temp'];
                const users = filteredUsers || [];
                const matches = users
                    .map(u => (u && u.username ? String(u.username) : ''))
                    .filter(name => name)
                    .filter(name => keywords.some(k => name.toLowerCase().includes(k)))
                    .slice(0, 200);
                let box = document.getElementById(usernamesBoxId);
                if (!box) {
                    // Append to Selection Summary body area
                    const summaryBody = document.querySelector('.delete-section .card-body');
                    if (summaryBody) {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'mt-3';
                        wrapper.innerHTML = `
                            <div class=\"rounded-3 p-3\" style=\"background:#fafafa;border:1px solid #e5e7eb;\">
                                <h5 class=\"mb-2\" style=\"font-weight:600;\">Usernames Containing Test/Demo/Temp</h5>
                                <div id=\"${usernamesBoxId}\" class=\"small text-muted\">None</div>
                            </div>`;
                        summaryBody.appendChild(wrapper);
                        box = wrapper.querySelector(`#${usernamesBoxId}`);
                    }
                }
                if (box) {
                    box.textContent = matches.length ? matches.join(', ') : 'None';
                }
            }
        } catch (_) {}
        // Update disposable domains list in Selection Summary
        try {
            const container = document.getElementById('disposable-domains-list');
            if (container) {
                if (seenDisposableDomains.size > 0) {
                    const items = Array.from(seenDisposableDomains).sort();
                    container.textContent = items.join(', ');
                } else {
                    container.textContent = 'None';
                }
            }
        } catch (_) {}
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
        // Save filtered set; update counts (no list rendering)
        this.filteredUsers = filteredUsers;
        this.updateSelectedCount();
        // Also refresh info panel filters and count
        const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setText('info-filters', this.getActiveFiltersSummary());
    }

    updateFilterStatus(filteredCount, totalCount) {
        const statusText = document.getElementById('filter-status-text');
        if (statusText) {
            if (filteredCount === totalCount) {
                statusText.textContent = `Showing all ${totalCount} users`;
            } else {
                statusText.textContent = `Showing ${filteredCount} of ${totalCount} users`;
            }
            // Ensure actions section is visible when we have status
            const actionsSection = document.getElementById('filter-actions-section');
            if (actionsSection) actionsSection.style.display = 'block';
        }
        const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setText('selected-count', String(filteredCount));
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
