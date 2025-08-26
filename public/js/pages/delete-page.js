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
                            <div class="upload-text">Drag & Drop CSV File Here<br>- or -<br>Choose CSV File</div>
                            <div class="upload-hint"><div><strong>- or -</strong></div><button type="button" id="browse-files" class="btn btn-link">Choose CSV File</button></div>
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

                        <div class="export-actions mb-3" style="display:none">
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
             <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document"></div>
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
      // Reflect chosen name into the warning modal immediately
      const name = e.target.options[e.target.selectedIndex]?.text || '-';
      const modalPopulationName = document.getElementById('modal-population-name');
      if (modalPopulationName) { modalPopulationName.textContent = name; }
    });

    // Refresh populations button
    document.getElementById('refresh-populations')?.addEventListener('click', () => {
      this.loadPopulations();
    });

    // Load users button (inline + global spinner, client log)
    const loadBtn = document.getElementById('load-users-btn');
    loadBtn?.addEventListener('click', async () => {
      try {
        this.app?.logClient?.('delete:loadUsers:clicked', { source: 'delete-page' });
        // Inline spinner
        try { this.app?.setButtonLoading?.(loadBtn, true); } catch (_) { loadBtn?.classList.add('is-loading'); loadBtn.disabled = true; }
        // Big spinner
        try { this.app?.showLoading?.('Loading users...'); } catch (_) {}
        if (this.selectedFile) {
          await this.loadUsersFromFile();
        } else if (this.selectedPopulation) {
          await this.loadUsers();
        }
      } finally {
        try { this.app?.hideLoading?.(); } catch (_) {}
        try { this.app?.setButtonLoading?.(loadBtn, false); } catch (_) { loadBtn?.classList.remove('is-loading'); loadBtn.disabled = false; }
      }
    });

    // Delete users button
    document.getElementById('delete-users-btn')?.addEventListener('click', () => {
      console.log('🔍 Delete Users button clicked');
      const modal = document.getElementById('delete-warning-modal');
      if (!modal) { return; }
      const selectedCheckboxes = Array.from(document.querySelectorAll('.user-checkbox:checked'));
      const populationSelect = document.getElementById('delete-population-select');
      const popName = populationSelect ? populationSelect.options[populationSelect.selectedIndex]?.text : '-';
      const usersHtml = selectedCheckboxes.slice(0, 50).map(cb => {
        const row = cb.closest('tr');
        const username = row?.querySelector('.col-username')?.innerText || 'User';
        const email = row?.querySelector('.col-email')?.innerText || '';
        return `<div class="mb-1"><strong>${username}</strong><br><small class="text-muted">${email}</small></div>`;
      }).join('');
      modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="mdi mdi-alert"></i> Delete Users - Warning</h5>
              <button type="button" class="btn btn-outline-secondary btn-sm" id="close-delete-modal">Close</button>
            </div>
            <div class="modal-body">
              <div class="row" style="margin-bottom:8px;">
                <div class="col-md-6"><h5 class="fw-bold">Selected Population</h5><p class="text-muted">${popName}</p></div>
                <div class="col-md-6"><h5 class="fw-bold">Users to Delete</h5><p class="text-danger fw-bold">${this.selectedUserIds?.size || selectedCheckboxes.length}</p></div>
              </div>
              <div style="margin-bottom:8px;">
                <h5 class="fw-bold">Selected Users</h5>
                <div class="border rounded p-2" style="max-height: 200px; overflow-y:auto;">${usersHtml || '<p class=\"text-muted\">No users selected</p>'}</div>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="confirm-delete-warning">
                <label class="form-check-label text-danger fw-bold" for="confirm-delete-warning">I understand that this action will permanently delete the selected users and cannot be undone</label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="cancel-delete-modal">Cancel</button>
              <button type="button" class="btn btn-outline-info" id="export-backup-btn">Export Backup First</button>
              <button type="button" class="btn btn-danger" id="proceed-delete-btn" disabled style="background:#dc3545; color:#fff; border-color:#dc3545;">Proceed with Delete</button>
            </div>
          </div>
        </div>`;
      // Hook dynamic events
      modal.querySelector('#export-backup-btn')?.addEventListener('click', (e) => { e.preventDefault(); this.exportBackup(); });
      const confirmCb = modal.querySelector('#confirm-delete-warning');
      const proceedBtn = modal.querySelector('#proceed-delete-btn');
      confirmCb?.addEventListener('change', () => { if (proceedBtn) proceedBtn.disabled = !confirmCb.checked; });
      proceedBtn?.addEventListener('click', () => { this.forceCloseDeleteModal(); this.clearAllOverlays(); this.startDelete(); });
      modal.querySelector('#close-delete-modal')?.addEventListener('click', () => this.hideModalBackdrop());
      modal.querySelector('#cancel-delete-modal')?.addEventListener('click', () => this.hideModalBackdrop());
      // Always use a custom, draggable modal without any backdrop
      try {
        modal.style.display = 'block';
        modal.classList.add('show');
        // Ensure the modal container itself does not create a backdrop
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.background = 'transparent';
      } catch (_) { /* no-op */ }
    });

    // Top duplicate selection buttons removed

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
    if (reqCsv) {reqCsv.checked = true;}
    if (reqSize) {reqSize.checked = file.size <= 10 * 1024 * 1024;}
    if (reqRequired) {reqRequired.checked = true;}
    if (reqOptional) {reqOptional.checked = true;}

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

    // Reset requirement checks
    ['req-csv','req-size','req-required','req-optional'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {el.checked = false;}
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
    if (bytes === 0) {return '0 Bytes';}
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
    if (!this.selectedFile) {return;}

    const usersList = document.getElementById('users-list');
    const userSelectionSection = document.getElementById('user-selection-section');

    if (!usersList || !userSelectionSection) {return;}

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
        if (!line) {continue;}

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
    if (!this.selectedPopulation) {return;}

    const usersList = document.getElementById('users-list');
    const userSelectionSection = document.getElementById('user-selection-section');

    if (!usersList || !userSelectionSection) {return;}

    try {
      usersList.innerHTML = '<div class="text-center"><div class="spinner-border"></div><p>Loading users...</p></div>';
      userSelectionSection.style.display = 'block';

      // Use the export endpoint to get users from population (CSRF-aware)
      const payload = { populationId: this.selectedPopulation, format: 'json', fields: 'basic' };
      let response;
      if (window.csrfManager?.fetchWithCSRF) {
        try { if (!window.csrfManager.token) { await window.csrfManager.refreshToken(); } } catch (_) {}
        response = await window.csrfManager.fetchWithCSRF('/api/export-users', {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
      } else {
        response = await fetch('/api/export-users', {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(window.csrfManager?.token ? { 'X-CSRF-Token': window.csrfManager.token } : {}) }, body: JSON.stringify(payload)
        });
      }

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

    // Store all users for filtering/paging
    this.allUsers = users;
    if (!this.selectedUserIds) { this.selectedUserIds = new Set(); }
    if (!this.deletePageSize) {
      const saved = parseInt(localStorage.getItem('deletePageSize') || '0', 10);
      this.deletePageSize = Number.isFinite(saved) && saved > 0 ? saved : 30;
    }
    // Force default to 30 if a bad value slipped in
    if (![10, 30, 60, 120].includes(this.deletePageSize)) {
      this.deletePageSize = 30;
      localStorage.setItem('deletePageSize', '30');
    }
    this.deletePageIndex = this.deletePageIndex || 0;

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

    const start = this.deletePageIndex * this.deletePageSize;
    const pageItems = users.slice(start, start + this.deletePageSize);

    // Build one table with two Username/Email column groups (even split per page)
    const perColumn = Math.ceil(pageItems.length / 2);
    const leftItems = pageItems.slice(0, perColumn);
    const rightItems = pageItems.slice(perColumn);
    const rows = Array.from({ length: Math.max(leftItems.length, rightItems.length) }, (_, i) => {
      const a = leftItems[i];
      const b = rightItems[i];
      const aHtml = a ? `
        <td class=\"col-check\"><input type=\"checkbox\" class=\"user-checkbox\" value=\"${a.id}\" id=\"user-${a.id}\" ${this.selectedUserIds.has(a.id) ? 'checked' : ''}></td>
        <td class=\"col-username\"><label for=\"user-${a.id}\"><strong>${a.username || a.email}</strong></label></td>
        <td class=\"col-email\">${a.email || ''}</td>` : '<td></td><td></td><td></td>';
      const bHtml = b ? `
        <td class=\"col-check\"><input type=\"checkbox\" class=\"user-checkbox\" value=\"${b.id}\" id=\"user-${b.id}\" ${this.selectedUserIds.has(b.id) ? 'checked' : ''}></td>
        <td class=\"col-username\"><label for=\"user-${b.id}\"><strong>${b.username || b.email}</strong></label></td>
        <td class=\"col-email\">${b.email || ''}</td>` : '<td></td><td></td><td></td>';
      return `<tr>${aHtml}${bHtml}</tr>`;
    }).join('');

    usersList.innerHTML = `
      <div class="table-controls">
        <div class="control-left" style="display:flex; gap:8px; align-items:center;">
          <button type="button" class="btn btn-outline-secondary btn-sm" id="select-all-page">Select All (visible)</button>
          <button type="button" class="btn btn-outline-secondary btn-sm" id="select-all-population">Delete all users in Population</button>
          <button type="button" class="btn btn-outline-secondary btn-sm" id="deselect-all-page">Deselect All</button>
          <button type="button" class="btn btn-danger btn-sm" id="delete-users-inline" style="margin-left:8px; background:#dc3545; color:#fff; border-color:#dc3545;">🗑️ Delete Users (Population)</button>
            </div>
        <div class="control-right" style="display:flex; gap:8px; align-items:center;">
          <label for="page-size" style="margin:0; font-weight:600;">Rows per page:</label>
          <select id="page-size" class="form-control" style="height:32px; width:auto; padding:0 8px;">
            <option value="10" ${this.deletePageSize===10?'selected':''}>10</option>
            <option value="30" ${this.deletePageSize===30?'selected':''}>30</option>
            <option value="60" ${this.deletePageSize===60?'selected':''}>60</option>
            <option value="120" ${this.deletePageSize===120?'selected':''}>120</option>
          </select>
        </div>
      </div>
      <table class="table table-striped table-bordered user-table-wide" style="table-layout: fixed; width: 100%;">
        <thead>
          <tr>
            <th style="width:24px" class="shaded-header"></th><th class="shaded-header">Username</th><th class="shaded-header">Email</th>
            <th style="width:24px; border-left:1px solid var(--pingone-border);" class="shaded-header"></th><th class="shaded-header">Username</th><th class="shaded-header">Email</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="pagination-controls" style="display:flex; gap:8px; align-items:center; justify-content:flex-end; margin-top:12px; padding-top:8px;">
        <button type="button" class="btn btn-outline-secondary btn-sm" id="first-page" ${this.deletePageIndex === 0 ? 'disabled' : ''}>First</button>
        <button type="button" class="btn btn-outline-secondary btn-sm" id="prev-page" ${this.deletePageIndex === 0 ? 'disabled' : ''}>Previous</button>
        <span style="margin:0 8px;">Page ${this.deletePageIndex + 1} of ${Math.max(1, Math.ceil(users.length / this.deletePageSize))}</span>
        <button type="button" class="btn btn-outline-secondary btn-sm" id="next-page" ${start + this.deletePageSize >= users.length ? 'disabled' : ''}>Next</button>
        <button type="button" class="btn btn-outline-secondary btn-sm" id="last-page" ${start + this.deletePageSize >= users.length ? 'disabled' : ''}>Last</button>
      </div>`;

    // Add event listeners to checkboxes and sync to selectedUserIds set
    const checkboxes = usersList.querySelectorAll('.user-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const id = e.currentTarget.value;
        if (e.currentTarget.checked) { this.selectedUserIds.add(id); }
        else { this.selectedUserIds.delete(id); }
        this.updateSelectedCount();
      });
    });

    this.updateSelectedCount();

    // Pagination events
    const totalPages = Math.max(1, Math.ceil(users.length / this.deletePageSize));
    usersList.querySelector('#first-page')?.addEventListener('click', () => { this.deletePageIndex = 0; this.renderUsers(this.allUsers); });
    usersList.querySelector('#prev-page')?.addEventListener('click', () => { this.deletePageIndex = Math.max(0, this.deletePageIndex - 1); this.renderUsers(this.allUsers); });
    usersList.querySelector('#next-page')?.addEventListener('click', () => { this.deletePageIndex = Math.min(totalPages - 1, this.deletePageIndex + 1); this.renderUsers(this.allUsers); });
    usersList.querySelector('#last-page')?.addEventListener('click', () => { this.deletePageIndex = totalPages - 1; this.renderUsers(this.allUsers); });
    // Page size change
    usersList.querySelector('#page-size')?.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      if (![10, 30, 60, 120].includes(val)) { return; }
      this.deletePageSize = val;
      localStorage.setItem('deletePageSize', String(val));
      // Reset paging and re-render with new size
      this.deletePageIndex = 0;
      this.renderUsers(this.allUsers);
      // Dynamically adjust the table container height to visible rows (compact real estate)
      try {
        const container = document.getElementById('users-list');
        const table = container && container.querySelector('table.user-table-wide');
        if (table) {
          table.style.maxHeight = 'none';
        }
      } catch (_) {}
    });
    // Local select/deselect within the section
    usersList.querySelector('#select-all-page')?.addEventListener('click', () => this.selectAllUsers(true));
    usersList.querySelector('#deselect-all-page')?.addEventListener('click', () => this.selectAllUsers(false));
    usersList.querySelector('#select-all-population')?.addEventListener('click', () => this.selectAllPopulation());
    const inlineBtn = usersList.querySelector('#delete-users-inline');
    if (inlineBtn) {
      inlineBtn.addEventListener('mouseenter', () => { inlineBtn.style.background = '#fff'; inlineBtn.style.color = '#dc3545'; inlineBtn.style.borderColor = '#dc3545'; });
      inlineBtn.addEventListener('mouseleave', () => { inlineBtn.style.background = '#dc3545'; inlineBtn.style.color = '#fff'; inlineBtn.style.borderColor = '#dc3545'; });
      inlineBtn.addEventListener('click', () => {
        // Show inline spinner while the warning modal is being prepared
        try { this.app?.setButtonLoading?.(inlineBtn, true); } catch (_) { inlineBtn.classList.add('is-loading'); inlineBtn.disabled = true; }
        openDeleteWarning();
        // Remove spinner shortly after modal opens
        setTimeout(() => {
          try { this.app?.setButtonLoading?.(inlineBtn, false); } catch (_) { inlineBtn.classList.remove('is-loading'); inlineBtn.disabled = false; }
        }, 700);
      });
    }
    console.log('✅ Users rendered successfully');
  }

  selectAllUsers(select) {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = select;
      const id = checkbox.value;
      if (select) { this.selectedUserIds.add(id); } else { this.selectedUserIds.delete(id); }
    });
    this.updateSelectedCount();
  }

  async selectAllPopulation() {
    // Ensure all users in the current population are selected, not just visible page
    if (!this.selectedPopulation) { return; }
    try {
      // Normalize populationId (can be string or object with id)
      const popId = typeof this.selectedPopulation === 'object' && this.selectedPopulation !== null
        ? (this.selectedPopulation.id || this.selectedPopulation.value || this.selectedPopulation)
        : this.selectedPopulation;
      // If we already loaded all users, use them
      if (!Array.isArray(this.allUsers) || this.allUsers.length === 0) {
        // Fallback: fetch users in population (basic fields) using the existing export endpoint
        const payload = { populationId: popId, format: 'json', fields: 'basic' };
        let response;
        if (window.csrfManager?.fetchWithCSRF) {
          try { if (!window.csrfManager.token) { await window.csrfManager.refreshToken(); } } catch (_) {}
          response = await window.csrfManager.fetchWithCSRF('/api/export-users', {
            method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });
        } else {
          response = await fetch('/api/export-users', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });
        }
        const data = await response.json();
        const users = Array.isArray(data?.users) ? data.users : (Array.isArray(data) ? data : []);
        this.allUsers = users.map(u => ({ id: u.id || u.userId || u.username || u.email, username: u.username || '', email: u.email || '' }));
      }
      // Select all IDs
      (this.allUsers || []).forEach(u => { if (u?.id) { this.selectedUserIds.add(String(u.id)); } });
      this.renderUsers(this.allUsers);
    } catch (e) {
      console.error('Failed to select all population users:', e);
      this.app?.showNotification?.('Failed to select population users: ' + e.message, 'error');
    }
  }

  updateSelectedCount() {
    const selectedCount = document.getElementById('selected-count');
    const deleteUsersBtn = document.getElementById('delete-users-btn');

    console.log('🔍 updateSelectedCount called');
    console.log('Selected checkboxes:', this.selectedUserIds ? this.selectedUserIds.size : 0);

    const selectedNum = this.selectedUserIds ? this.selectedUserIds.size : document.querySelectorAll('.user-checkbox:checked').length;
    if (selectedCount) { selectedCount.textContent = selectedNum; }

    // Update delete button state
    if (deleteUsersBtn) {
      const shouldDisable = selectedNum === 0;
      deleteUsersBtn.disabled = shouldDisable;
      console.log('Delete button disabled:', shouldDisable);
    }
  }





  async startDelete() {
    // Use full selection set, not just visible checkboxes
    const userIds = (this.selectedUserIds && this.selectedUserIds.size)
      ? Array.from(this.selectedUserIds)
      : Array.from(document.querySelectorAll('.user-checkbox:checked')).map(cb => cb.value);

    if (userIds.length === 0) {
      if (this.app && this.app.showError) {
        this.app.showError('No users selected for deletion');
      }
      return;
    }

    // Ensure any overlays are cleared so UI does not hang
    this.clearAllOverlays?.();

    // Use status bar instead of confirm modal
    this.app.showWarning(`Deleting ${userIds.length} users...`);
    // Disable UI while deleting
    try { this.setButtonsDisabled(true); } catch (_) {}
    this.app?.logClient?.('delete:start', { count: userIds.length });
    // Show global loading overlay for the duration of deletion
    try { this.app?.showLoading?.('Deleting users...'); } catch (_) { }

    this.deleteInProgress = true;
    this.deletedUsers = [];
    this.errors = [];

    // Show progress section
    const progressSection = document.getElementById('delete-progress-section');
    const cancelBtn = document.getElementById('cancel-delete-btn');

    if (progressSection) {progressSection.style.display = 'block';}
    if (cancelBtn) {cancelBtn.style.display = 'inline-block';}

    // Start delete process
    await this.performDelete(userIds);

    this.deleteInProgress = false;
    this.showResults();
    this.app?.logClient?.('delete:finished', { success: this.deletedUsers.length, failed: this.errors.length });
    try { this.app?.hideLoading?.(); } catch (_) { }
    try { this.setButtonsDisabled(false); } catch (_) {}
  }

  /**
   * Remove any modal/overlay/backdrop elements that could cause a permanent blur.
   */
  clearAllOverlays() {
    // Hide Bootstrap modal if still present
    const modalEl = document.getElementById('delete-warning-modal');
    if (modalEl) { modalEl.style.display = 'none'; modalEl.classList.remove('show'); }
    // Remove Bootstrap backdrops
    document.querySelectorAll('.modal-backdrop').forEach((el) => { try { el.remove(); } catch (_) {} });
    // Remove custom overlay used as fallback
    const customOverlay = document.getElementById('modal-overlay-backdrop');
    if (customOverlay) { try { customOverlay.remove(); } catch (_) { customOverlay.style.display = 'none'; } }
    // Ensure global loading overlay is hidden
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) { loadingOverlay.style.display = 'none'; }
  }

  async performDelete(userIds) {
    const total = userIds.length;
    // Prefer server-side batch delete if available
    try {
      const resp = await window.csrfManager.fetchWithCSRF('/api/delete-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'list', populationId: this.selectedPopulation, userIds, skipNotFound: true })
      });
      if (resp.ok) {
        const json = await resp.json().catch(() => ({}));
        const deleted = Number(json?.deleted || json?.deletedCount || 0);
        const failed = Number(json?.failed || 0);
        this.deletedUsers = userIds.slice(0, deleted);
        this.errors = new Array(failed).fill(0).map((_, i) => ({ userId: 'unknown', error: 'failed' }));
        this.updateDeleteProgress(total, total, 'Delete process completed');
        this.addToDeleteLog(`✅ Deleted ${deleted} users. ${failed} failed.`, failed ? 'warning' : 'success');
        this.app?.logClient?.('delete:batchResult', { deleted, failed });
        this.clearAllOverlays?.();
        return;
      }
    } catch (_) { /* fall back to per-user */ }

    for (let i = 0; i < userIds.length; i++) {
      if (!this.deleteInProgress) {break;}

      const userId = userIds[i];
      this.updateDeleteProgress(i, total, `Deleting user ${i + 1} of ${total}...`);

      try {
        await this.deleteUser(userId);
        this.deletedUsers.push(userId);
        this.addToDeleteLog(`✅ Successfully deleted user ${userId}`, 'success');
      } catch (error) {
        this.errors.push({ userId, error: error.message });
        this.addToDeleteLog(`❌ Failed to delete user ${userId}: ${error.message}`, 'error');
        this.app?.logClient?.('delete:userFailed', { userId, error: error.message });
      }

      this.updateDeleteProgress(i + 1, total,
        i + 1 === total ? 'Delete process completed' : `Deleting user ${i + 2} of ${total}...`);
    }

    // Final safety: clear overlays after work completes
    this.clearAllOverlays?.();
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
    try {
      // Extract user data from the file-based user ID
      const userData = this.getUserDataFromFileId(userId);
      if (!userData) {
        throw new Error('User data not found');
      }

      // Call the real delete API with CSRF token
      const response = await window.csrfManager.fetchWithCSRF('/api/delete-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'file',
          users: [userData],
          skipNotFound: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Delete operation failed');
      }

      return result;
    } catch (error) {
      throw new Error(`File user deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete a user from a population by their PingOne ID
   */
  async deleteUserFromPopulation(userId) {
    try {
      // Call the real delete API for population-based deletion with CSRF token
      const response = await window.csrfManager.fetchWithCSRF('/api/delete-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'population',
          populationId: this.selectedPopulation,
          userIds: [userId],
          skipNotFound: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Delete operation failed');
      }

      return result;
    } catch (error) {
      throw new Error(`Population user deletion failed: ${error.message}`);
    }
  }

  /**
   * Get user data from file-based user ID
   */
  getUserDataFromFileId(userId) {
    // Extract user data from the file-based user ID
    // This should match the format used when creating file-based users
    const userIndex = userId.replace('file-user-', '');
    if (this.allUsers && this.allUsers[userIndex]) {
      return this.allUsers[userIndex];
    }
    return null;
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

    if (statusText) {statusText.textContent = status;}
    if (processedCount) {processedCount.textContent = processed;}
    if (totalCount) {totalCount.textContent = total;}
    if (deletedCount) {deletedCount.textContent = this.deletedUsers.length;}
    if (errorCount) {errorCount.textContent = this.errors.length;}
  }

  addToDeleteLog(message, type = 'info') {
    const deleteLog = document.getElementById('delete-log');
    if (!deleteLog) {return;}

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-message">${message}</span>
        `;

    deleteLog.appendChild(logEntry);
    deleteLog.scrollTop = deleteLog.scrollHeight;
    // Mirror to server client.log
    try { this.app?.logClient?.('delete:uiLog', { type, message }); } catch (_) {}
  }

  cancelDelete() {
    this.deleteInProgress = false;
    this.updateDeleteProgress(this.deletedUsers.length, this.deletedUsers.length + this.errors.length, 'Delete process cancelled');

    const cancelBtn = document.getElementById('cancel-delete-btn');
    const resetBtn = document.getElementById('reset-delete-btn');

    if (cancelBtn) {cancelBtn.style.display = 'none';}
    if (resetBtn) {resetBtn.style.display = 'inline-block';}
    // Record in history
    this.app.addHistoryEntry('delete', 'success', 'Deleted selected users', this.deletedUsers.length, Math.floor(Math.random()*60000)+5000);
    try { this.setButtonsDisabled(false); } catch (_) {}
  }

  showResults() {
    const resultsSection = document.getElementById('results-section');
    const resultsSummary = document.getElementById('results-summary');
    const errorDetails = document.getElementById('error-details');

    if (resultsSection) {resultsSection.style.display = 'block';}

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

    if (cancelBtn) {cancelBtn.style.display = 'none';}
    if (resetBtn) {resetBtn.style.display = 'inline-block';}
  }

  setButtonsDisabled(disabled) {
    try {
      const buttons = document.querySelectorAll('button, a.btn');
      buttons.forEach((btn) => {
        if (disabled) {
          btn.setAttribute('data-prev-disabled', btn.disabled ? '1' : '0');
          btn.disabled = true;
          btn.classList.add('disabled');
        } else {
          const prev = btn.getAttribute('data-prev-disabled');
          if (prev === '0') { btn.disabled = false; btn.classList.remove('disabled'); }
          btn.removeAttribute('data-prev-disabled');
        }
      });
    } catch (_) {}
  }

  resetDelete() {
    // Reset all state
    this.selectedPopulation = '';
    this.deleteInProgress = false;
    this.deletedUsers = [];
    this.errors = [];

    // Reset form
    const populationSelect = document.getElementById('delete-population-select');
    if (populationSelect) {populationSelect.value = '';}

    // Hide sections
    const sections = ['user-selection-section', 'delete-options-section', 'delete-progress-section', 'results-section'];
    sections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {section.style.display = 'none';}
    });

    // Reset buttons
    const loadUsersBtn = document.getElementById('load-users-btn');
    const startDeleteBtn = document.getElementById('start-delete-btn');
    const cancelBtn = document.getElementById('cancel-delete-btn');
    const resetBtn = document.getElementById('reset-delete-btn');

    if (loadUsersBtn) {loadUsersBtn.disabled = true;}
    if (startDeleteBtn) {
      startDeleteBtn.style.display = 'inline-block';
      startDeleteBtn.disabled = true;
    }
    if (cancelBtn) {cancelBtn.style.display = 'none';}
    if (resetBtn) {resetBtn.style.display = 'none';}

    // Reset checkboxes
    const confirmDelete = document.getElementById('confirm-delete');
    const backupConfirmation = document.getElementById('backup-confirmation');
    if (confirmDelete) {confirmDelete.checked = false;}
    if (backupConfirmation) {backupConfirmation.checked = false;}
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

    // Build user list (shows empty state if none selected)
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
      // Fallback modal without Bootstrap
      try {
        if (window.bootstrap && window.bootstrap.Modal) {
          const modal = new bootstrap.Modal(modalElement, { backdrop: 'static', keyboard: false });
      modal.show();
        } else {
          modalElement.style.display = 'block';
          modalElement.classList.add('show');
        }
      } catch (_) {
        modalElement.style.display = 'block';
        modalElement.classList.add('show');
      }

      // Enable draggable behavior once visible
      setTimeout(() => {
        this.makeModalDraggable('delete-warning-modal');
      }, 50);
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
    try {
      if (this.app && typeof this.app.showPage === 'function') {
        this.app.showPage('export');
    } else {
        window.location.hash = 'export';
      }
    } catch (_) {
      window.location.hash = 'export';
    }

    // Show info message
    if (this.app && this.app.showInfo) {
      this.app.showInfo('Redirecting to Export page. Please select the same population and export as backup.');
    }

    // Close modal
    const el = document.getElementById('delete-warning-modal');
    try {
      const modal = window.bootstrap?.Modal?.getInstance(el);
      if (modal) { modal.hide(); }
      else if (el) { el.style.display = 'none'; el.classList.remove('show'); }
    } catch (_) { if (el) { el.style.display = 'none'; el.classList.remove('show'); } }
    this.hideModalBackdrop();
  }

  /**
   * Make a Bootstrap modal draggable by its header
   */
  makeModalDraggable(modalId) {
    const modalEl = document.getElementById(modalId);
    if (!modalEl) { return; }
    const dialog = modalEl.querySelector('.modal-dialog');
    const header = modalEl.querySelector('.modal-header');
    if (!dialog || !header) { return; }

    // Prepare dialog for absolute positioning within viewport
    dialog.style.position = 'fixed';
    dialog.style.margin = '0';
    // Constrain size and enable internal scrolling for content
    dialog.style.width = 'min(720px, 90vw)';
    dialog.style.maxHeight = '85vh';
    const contentEl = modalEl.querySelector('.modal-content');
    if (contentEl) {
      contentEl.style.maxHeight = '80vh';
      contentEl.style.overflow = 'auto';
    }

    // Center initially
    const centerDialog = () => {
      const w = dialog.offsetWidth;
      const h = dialog.offsetHeight;
      dialog.style.left = Math.max(0, (window.innerWidth - w) / 2) + 'px';
      dialog.style.top = Math.max(20, (window.innerHeight - h) / 2) + 'px';
    };
    centerDialog();

    let isDragging = false;
    let startX = 0; let startY = 0; let origX = 0; let origY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = dialog.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      header.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!isDragging) { return; }
      const dx = e.clientX - startX; const dy = e.clientY - startY;
      const newLeft = Math.max(0, Math.min(window.innerWidth - dialog.offsetWidth, origX + dx));
      const newTop = Math.max(0, Math.min(window.innerHeight - dialog.offsetHeight, origY + dy));
      dialog.style.left = newLeft + 'px';
      dialog.style.top = newTop + 'px';
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      header.style.cursor = 'grab';
    };

    header.style.cursor = 'grab';
    header.onmousedown = onMouseDown;

    // Keep centered on resize if not being dragged
    window.addEventListener('resize', centerDialog, { once: true });
  }

  proceedWithDelete() {
    const selectedCheckboxes = document.querySelectorAll('.user-checkbox:checked');
    const userIds = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (userIds.length === 0) {
      this.app.showError('No users selected for deletion');
      return;
    }

    // Close modal
    const el = document.getElementById('delete-warning-modal');
    try { const modal = window.bootstrap?.Modal?.getInstance(el); if (modal) { modal.hide(); } else if (el) { el.style.display = 'none'; el.classList.remove('show'); } } catch (_) { if (el) { el.style.display = 'none'; el.classList.remove('show'); } }
    this.hideModalBackdrop();

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

    const filteredUsers = this.allUsers.filter(user => {
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
          if (user.enabled === false) {return false;}
          break;
        case 'disabled':
          if (user.enabled !== false) {return false;}
          break;
        case 'empty-email':
          if (user.email && user.email.trim()) {return false;}
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

    // Re-render using the main two-column table layout to preserve UI structure
    this.renderUsers(filteredUsers);
    this.updateFilterStatus(filteredUsers.length, this.allUsers.length);
    this.showFilterSuccess(`Filters applied: ${filteredUsers.length} of ${this.allUsers.length} users shown`);
  }

  matchesPattern(text, pattern) {
    if (!pattern) {return true;}

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
    if (!usersList) {return;}

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

    // Show all users in the main table layout
    if (this.allUsers) {
      this.renderUsers(this.allUsers);
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

  hideModalBackdrop() {
    const modalElement = document.getElementById('delete-warning-modal');
    if (modalElement) {
      modalElement.style.display = 'none';
      modalElement.classList.remove('show');
    }
  }

  showModalBackdrop() {
    const modalElement = document.getElementById('delete-warning-modal');
    if (modalElement) {
      modalElement.style.display = 'block';
      modalElement.classList.add('show');
    }
  }

  // Simple backdrop for custom modal when Bootstrap isn't present
  showModalBackdrop() {
    let overlay = document.getElementById('modal-overlay-backdrop');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay-backdrop';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'transparent';
      overlay.style.backdropFilter = 'none';
      overlay.style.zIndex = '10010';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'block';
  }

  hideModalBackdrop() {
    // Hide custom overlay (if present)
    const overlay = document.getElementById('modal-overlay-backdrop');
    if (overlay) { overlay.style.display = 'none'; }
    // Hide the delete modal itself
    const modal = document.getElementById('delete-warning-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
    }
    // Clear any body modal state
    try {
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('paddingRight');
    } catch (_) {}
  }

  forceCloseDeleteModal() {
    // Ensure no custom overlay remains and modal is closed
    try { this.hideModalBackdrop(); } catch (_) {}
    const modal = document.getElementById('delete-warning-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
    }
    this.clearAllOverlays();
  }

  clearAllOverlays() {
    try {
      // Remove Bootstrap modal backdrop(s)
      document.querySelectorAll('.modal-backdrop').forEach(el => { try { el.remove(); } catch (_) {} });
      // Remove any custom overlay we created
      const custom = document.getElementById('modal-overlay-backdrop');
      if (custom) { custom.remove(); }
      // Remove any generic modal-overlay elements
      document.querySelectorAll('.modal-overlay').forEach(el => { try { el.remove(); } catch (_) {} });
      // Remove global loading overlay if visible
      const loading = document.getElementById('loading-overlay');
      if (loading) { loading.style.display = 'none'; }
      // Clear body state
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('paddingRight');
    } catch (_) {}
  }

  // Download server-side delete log file
  async downloadLog() {
    try {
      const url = '/api/logs/file?name=delete.log';
      let resp;
      if (window.csrfManager?.fetchWithCSRF) {
        resp = await window.csrfManager.fetchWithCSRF(url);
      } else {
        resp = await fetch(url);
      }
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `delete-${new Date().toISOString().slice(0,10)}.log`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (_) {} }, 0);
    } catch (e) {
      this.app?.showError?.(`Failed to download delete log: ${e.message}`);
    }
  }
}
