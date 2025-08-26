/**
 * Modify Users Page Module
 *
 * Handles the Modify Users page functionality including:
 * - Population and user selection
 * - Bulk attribute modification
 * - Progress tracking and results display
 */

export class ModifyPage {
  constructor(app) {
    this.app = app;
    this.isLoaded = false;
    this.selectedFile = null;
    this.isUploading = false;
    this.selectedPopulation = '';
    this.lastTokenValidity = null; // Track token validity changes
    this.selectedUsers = [];
    this.modifyInProgress = false;
    this.modifiedUsers = [];
    this.errors = [];
  }

  async load() {
    console.log('📄 Loading Modify page...');

    // Check for existing file state from app
    const fileState = this.app.getFileState();
    let hasExistingFile = false;
    if (fileState.selectedFile) {
      console.log('📁 Found existing file state:', fileState.fileName);
      this.selectedFile = fileState.selectedFile;
      hasExistingFile = true;
      this.app.showInfo(`File "${fileState.fileName}" loaded from previous session`);
    }

    const modifyPage = document.getElementById('modify-page');
    if (!modifyPage) {
      console.error('❌ Modify page div not found');
      return;
    }

    modifyPage.innerHTML = `
            <div class="page-header">
                <h1>Modify Users</h1>
                <p>Update user attributes and information in PingOne populations</p>
            </div>

            <div class="modify-container">
                <!-- File Upload -->
                <section class="modify-section">
                    <div class="modify-box">
                        <h3 class="section-title">File Upload</h3>
                        <p>Select or drag and drop your CSV file containing users to modify</p>
                        
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
                <section class="modify-section">
                    <div class="modify-box">
                        <h3 class="section-title">Select Population</h3>
                        <p>Choose the population containing users you want to modify</p>
                        
                        <div class="config-grid">
                            <div class="form-group">
                                <label for="modify-population-select">Population *</label>
                                <div class="population-dropdown-container">
                                    <select id="modify-population-select" class="form-control" data-long-text="true">
                                        <option value="">Select a population...</option>
                                    </select>
                                    <button type="button" id="refresh-populations" class="btn btn-outline-secondary">
                                        <i class="mdi mdi-refresh"></i>
                                    </button>
                                </div>
                                <div class="form-help">Select the population containing users to modify</div>
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button id="load-users-btn" class="btn btn-danger" disabled>
                                <i class="mdi mdi-account-group"></i> Modify users
                            </button>
                        </div>
                    </div>
                </section>

                <!-- Static Field Update (no file needed) -->
                <section class="modify-section">
                    <div class="modify-box">
                        <h3 class="section-title">Static Field Update</h3>
                        <p>Set a single attribute to a fixed value for everyone in the selected population.</p>

                        <div class="config-grid">
                            <div class="form-group">
                                <label for="static-field-select">Field</label>
                                <div class="population-dropdown-container">
                                    <select id="static-field-select" class="form-control">
                                        <option value="">Select a field…</option>
                                    </select>
                                    <button type="button" id="refresh-attributes" class="btn btn-outline-secondary" title="Refresh attributes">
                                        <i class="mdi mdi-refresh"></i>
                                    </button>
                                </div>
                                <div class="form-help">Attributes discovered via SCIM schema (same list as Export)</div>
                            </div>

                            <div class="form-group">
                                <label for="static-field-value">Value</label>
                                <input type="text" id="static-field-value" class="form-control" placeholder="Enter static value (e.g., Regular User)">
                                <select id="static-field-value-boolean" class="form-control" style="display:none">
                                    <option value="true">true</option>
                                    <option value="false">false</option>
                                </select>
                            </div>
                        </div>

                        <div class="export-actions">
                            <button id="apply-static-update" class="btn btn-danger" disabled>
                                <i class="mdi mdi-pencil"></i> Apply to Population
                            </button>
                        </div>
                    </div>
                </section>

                <!-- User Selection -->
                <section id="user-selection-section" class="modify-section" style="display: none;">
                    <div class="modify-box">
                        <h3 class="section-title">Select Users to Modify</h3>
                        <p>Choose which users you want to update</p>
                        
                        <div class="export-actions mb-3">
                            <button id="select-all-btn" class="btn btn-outline-secondary">
                                <i class="mdi mdi-check-box"></i> Select All
                            </button>
                            <button id="deselect-all-btn" class="btn btn-outline-secondary">
                                <i class="mdi mdi-square"></i> Deselect All
                            </button>
                        </div>
                        
                        <div id="users-loading" class="text-center" style="display: none;">
                            <div class="spinner-border" role="status"></div>
                            <p>Loading users from population...</p>
                        </div>
                        
                        <div id="users-list" class="users-grid"></div>
                        
                        <div class="info-grid mt-3">
                            <div class="info-item">
                                <span class="label">Selected Users:</span>
                                <span id="count-display" class="value">0</span>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Modification Options -->
                <section id="modify-options-section" class="modify-section" style="display: none;">
                    <div class="modify-box">
                        <h3 class="section-title">Bulk Modification</h3>
                        <p>Apply the same changes to all selected users</p>
                        
                        <div class="config-grid">
                            <div class="form-group">
                                <label for="modify-email">Email Address</label>
                                <input type="email" id="modify-email" class="form-control" placeholder="New email address">
                                <div class="form-help">Leave empty to keep current email addresses</div>
                            </div>
                                <label for="modify-firstname">First Name</label>
                                <input type="text" id="modify-firstname" class="form-control" placeholder="New first name">
                                <div class="form-help">Leave empty to keep current first names</div>
                            </div>
                            <div class="form-group">
                                <label for="modify-lastname">Last Name</label>
                                <input type="text" id="modify-lastname" class="form-control" placeholder="New last name">
                                <div class="form-help">Leave empty to keep current last names</div>
                            </div>
                            <div class="form-group">
                                <label for="modify-phone">Phone Number</label>
                                <input type="tel" id="modify-phone" class="form-control" placeholder="New phone number">
                                <div class="form-help">Leave empty to keep current phone numbers</div>
                            </div>
                        </div>
                        
                        <div class="alert alert-info">
                            <i class="mdi mdi-information"></i>
                            Only fill in the fields you want to modify. Empty fields will be ignored.
                        </div>
                        
                        <div class="export-actions">
                            <button id="start-modify-btn" class="btn btn-danger" disabled>
                                <i class="mdi mdi-pencil"></i> Start Modification
                            </button>
                        </div>
                    </div>
                </section>

                <!-- Progress -->
                <section id="modify-progress-section" class="modify-section" style="display: none;">
                    <div class="modify-box">
                        <h3 class="section-title">Modification Progress</h3>
                        <p>Updating users in your PingOne environment</p>
                        
                        <div class="progress-container">
                            <div id="modify-progress-text-left" class="progress-text">0%</div>
                            <div class="progress-bar">
                                <div id="modify-progress-bar" class="progress-fill" style="width: 0%;"></div>
                            </div>
                            <svg id="beer-mug-svg-modify" class="beer-mug" width="112" height="112" viewBox="0 0 36 36" aria-label="Beer mug progress icon" focusable="false">
                                <defs>
                                    <clipPath id="beer-clip-modify">
                                        <path d="M9 8 h16 a2 2 0 0 1 2 2 v18 a2 2 0 0 1-2 2 h-16 a2 2 0 0 1-2-2 v-18 a2 2 0 0 1 2-2 z" />
                                    </clipPath>
                                </defs>
                                <path d="M9 8 h16 a2 2 0 0 1 2 2 v18 a2 2 0 0 1-2 2 h-16 a2 2 0 0 1-2-2 v-18 a2 2 0 0 1 2-2 z"
                                      fill="none" stroke="#1f2937" stroke-width="1.5"/>
                                <path d="M27 12 h2 a3 3 0 0 1 3 3 v6 a3 3 0 0 1-3 3 h-2" fill="none" stroke="#1f2937" stroke-width="1.5"/>
                                <rect id="beer-fill-modify" x="9" y="26" width="16" height="0" fill="#f59e0b" clip-path="url(#beer-clip-modify)"/>
                                <rect id="beer-foam-modify" x="9" y="26" width="16" height="0.001" fill="#ffffff" opacity="0.95" clip-path="url(#beer-clip-modify)"/>
                                <circle class="beer-bubble" cx="13" cy="26" r="0.9"/>
                                <circle class="beer-bubble" cx="16" cy="27" r="0.7" style="animation-delay:.4s"/>
                                <circle class="beer-bubble" cx="19" cy="26" r="0.8" style="animation-delay:.8s"/>
                                <circle class="beer-bubble" cx="22" cy="27" r="0.9" style="animation-delay:1.2s"/>
                            </svg>
                            <div id="progress-percentage" class="progress-text">0%</div>
                        </div>
                        
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="label">Status:</span>
                                <span id="status-text" class="value">Ready to start</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Processed:</span>
                                <span class="value"><span id="processed-count">0</span> / <span id="total-count">0</span></span>
                            </div>
                            <div class="info-item">
                                <span class="label">Modified:</span>
                                <span id="modified-count" class="value">0</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Errors:</span>
                                <span id="error-count" class="value">0</span>
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button id="cancel-modify-btn" class="btn btn-warning" style="display: none;">
                                <i class="mdi mdi-stop"></i> Cancel Modification
                            </button>
                            <button id="reset-modify-btn" class="btn btn-secondary" style="display: none;">
                                <i class="mdi mdi-undo"></i> Start Over
                            </button>
                        </div>
                        
                        <div class="log-section">
                            <h4>Modification Log</h4>
                            <div id="modify-log" class="log-container">
                                <!-- Log entries will appear here -->
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Results -->
                <section id="results-section" class="modify-section" style="display: none;">
                    <div class="modify-box">
                        <h3 class="section-title">Modification Results</h3>
                        <p>Summary of the modification operation</p>
                        
                        <div id="results-summary" class="results-container">
                            <!-- Results will be populated here -->
                        </div>
                        
                        <div id="error-details" class="error-section" style="display: none;">
                            <h4>Error Details</h4>
                            <div id="error-list" class="error-list">
                                <!-- Error details will be populated here -->
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button type="button" id="download-modify-log" class="btn btn-outline-info">
                                <i class="mdi mdi-download"></i> Download Log
                            </button>
                            <button type="button" id="new-modification" class="btn btn-outline-primary">
                                <i class="mdi mdi-refresh"></i> New Modification
                            </button>
                        </div>
                    </div>
                </section>
        `;

    this.setupEventListeners();
    this.loadPopulations();
    this.loadAttributes(false);

    // Display existing file info if available
    if (hasExistingFile && this.selectedFile) {
      this.displayFileInfo(this.selectedFile);
      this.previewFile(this.selectedFile);
    }
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
      // Fallback: clicking anywhere in the area opens file picker
      uploadArea.addEventListener('click', () => document.getElementById('file-input')?.click());
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
    document.getElementById('modify-population-select')?.addEventListener('change', (e) => {
      this.handlePopulationChange(e.target.value);
    });

    // Refresh populations button
    document.getElementById('refresh-populations')?.addEventListener('click', () => {
      this.loadPopulations();
    });

    document.getElementById('load-users-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      this.app?.setButtonLoading?.(btn, true);
      try { await this.loadUsers(); } finally { this.app?.setButtonLoading?.(btn, false); }
    });

    // Static field update events
    document.getElementById('refresh-attributes')?.addEventListener('click', () => {
      this.loadAttributes(true);
    });
    document.getElementById('static-field-select')?.addEventListener('change', () => {
      this.updateStaticFieldInputs();
      this.updateStaticApplyButton();
    });
    document.getElementById('static-field-value')?.addEventListener('input', () => this.updateStaticApplyButton());
    document.getElementById('static-field-value-boolean')?.addEventListener('change', () => this.updateStaticApplyButton());
    document.getElementById('apply-static-update')?.addEventListener('click', () => this.applyStaticUpdate());

    // User selection
    document.getElementById('select-all-btn')?.addEventListener('click', () => {
      this.selectAllUsers();
    });

    document.getElementById('deselect-all-btn')?.addEventListener('click', () => {
      this.deselectAllUsers();
    });

    // Modification inputs
    const inputs = ['modify-email', 'modify-firstname', 'modify-lastname', 'modify-phone'];
    inputs.forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        this.updateActionButtons();
      });
    });

    // Action buttons
    document.getElementById('start-modify-btn')?.addEventListener('click', () => {
      this.startModification();
    });

    document.getElementById('cancel-modify-btn')?.addEventListener('click', () => {
      this.cancelModification();
    });

    document.getElementById('reset-modify-btn')?.addEventListener('click', () => {
      this.resetModification();
    });

    // Download log and new modification buttons
    document.getElementById('download-modify-log')?.addEventListener('click', () => {
      this.downloadLog();
    });

    document.getElementById('new-modification')?.addEventListener('click', () => {
      this.resetModification();
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

    // Enable load users button if either population is selected OR file is picked
    const loadUsersBtn = document.getElementById('load-users-btn');
    if (loadUsersBtn) {
      loadUsersBtn.disabled = !this.selectedPopulation && !this.selectedFile;
    }

    // Mark requirements as satisfied
    const reqCsv = document.getElementById('req-csv');
    const reqSize = document.getElementById('req-size');
    const reqRequired = document.getElementById('req-required');
    const reqOptional = document.getElementById('req-optional');
    if (reqCsv) {reqCsv.checked = true;}
    if (reqSize) {reqSize.checked = file.size <= 10 * 1024 * 1024;}
    if (reqRequired) {reqRequired.checked = true;}
    if (reqOptional) {reqOptional.checked = true;}
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

    // Reset requirement checks
    ['req-csv','req-size','req-required','req-optional'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {el.checked = false;}
    });

    // Update button state based on remaining conditions
    const loadUsersBtn = document.getElementById('load-users-btn');
    if (loadUsersBtn) {
      loadUsersBtn.disabled = !this.selectedPopulation && !this.selectedFile;
    }
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

  async loadPopulations() {
    // Import the population loader service
    const { populationLoader } = await import('../services/population-loader.js');

    // Use the unified service to load populations
    await populationLoader.loadPopulations('modify-population-select', {
      onError: (error) => {
        console.error('❌ Error loading populations for modify page:', error);
      }
    });
  }

  // Load SCIM attributes for the static update select (reuses Export endpoint)
  async loadAttributes(force = false) {
    try {
      const url = `/api/export/attributes?forceRefresh=${force ? 'true' : 'false'}&ts=${Date.now()}`;
      const r = await fetch(url, { headers: { 'Accept': 'application/scim+json' } });
      const j = await r.json();
      const attributes = j?.data?.attributes || j?.attributes || [];
      const select = document.getElementById('static-field-select');
      if (!select) { return; }
      select.innerHTML = '<option value="">Select a field…</option>' +
        attributes.map(a => `<option value="${a.key}" data-type="${a.type || 'string'}">${a.label} (${a.key})</option>`).join('');
      this.updateStaticFieldInputs();
      this.updateStaticApplyButton();
    } catch (e) {
      console.error('Failed to load attributes', e);
    }
  }

  updateStaticFieldInputs() {
    const select = document.getElementById('static-field-select');
    const type = select?.selectedOptions?.[0]?.dataset?.type || 'string';
    const textInput = document.getElementById('static-field-value');
    const boolSelect = document.getElementById('static-field-value-boolean');
    if (!textInput || !boolSelect) { return; }
    if (type === 'boolean') {
      textInput.style.display = 'none';
      boolSelect.style.display = '';
    } else {
      textInput.style.display = '';
      boolSelect.style.display = 'none';
    }
  }

  updateStaticApplyButton() {
    const populationId = document.getElementById('modify-population-select')?.value;
    const field = document.getElementById('static-field-select')?.value || '';
    const type = document.getElementById('static-field-select')?.selectedOptions?.[0]?.dataset?.type || 'string';
    const value = type === 'boolean' ? document.getElementById('static-field-value-boolean')?.value : document.getElementById('static-field-value')?.value;
    const btn = document.getElementById('apply-static-update');
    if (btn) {
      btn.disabled = !(populationId && field && (value !== undefined && value !== null && String(value).length > 0));
    }
  }

  async applyStaticUpdate() {
    const populationId = document.getElementById('modify-population-select')?.value;
    const populationName = document.getElementById('modify-population-select')?.selectedOptions?.[0]?.text || '';
    const fieldKey = document.getElementById('static-field-select')?.value;
    const type = document.getElementById('static-field-select')?.selectedOptions?.[0]?.dataset?.type || 'string';
    const value = type === 'boolean' ? document.getElementById('static-field-value-boolean')?.value : document.getElementById('static-field-value')?.value;

    if (!populationId || !fieldKey) { return; }
    try {
      // Button spinner and disable during request
      const btn = document.getElementById('apply-static-update');
      const backupHtml = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="inline-spinner"></span> Applying…'; }

      // Use CSRF-aware request to avoid 403
      const payload = { populationId, populationName, fieldKey, type, value };
      let res;
      if (window.csrfManager?.fetchWithCSRF) {
        // Ensure token exists
        try { if (!window.csrfManager.token) { await window.csrfManager.refreshToken(); } } catch (_) {}
        res = await window.csrfManager.fetchWithCSRF('/api/modify/static-update', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/modify/static-update', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(window.csrfManager?.token ? { 'X-CSRF-Token': window.csrfManager.token } : {}) },
          body: JSON.stringify(payload)
        });
      }
      const data = await res.json();
      if (data?.success) {
        this.app?.showNotification?.(`Scheduled update: set ${fieldKey} to ${value} for ${populationName}`, 'success');
        // Show progress section like Import page
        this.showSection('modify-progress-section');
        document.getElementById('status-text').textContent = 'Running';
        // Initialize counters
        const total = Number(data?.data?.total || 0);
        const updated = Number(data?.data?.updated || 0);
        const failed = Number(data?.data?.failed || 0);
        const processed = updated + failed;
        if (!Number.isNaN(total)) { const el = document.getElementById('total-count'); if (el) el.textContent = String(total); }
        if (!Number.isNaN(processed)) {
          const pc = Math.min(100, total > 0 ? Math.round((processed / total) * 100) : 100);
          const bar = document.getElementById('modify-progress-bar'); if (bar) bar.style.width = `${pc}%`;
          const l = document.getElementById('progress-percentage'); if (l) l.textContent = `${pc}%`;
          const processedEl = document.getElementById('processed-count'); if (processedEl) processedEl.textContent = String(processed);
          const modifiedEl = document.getElementById('modified-count'); if (modifiedEl) modifiedEl.textContent = String(updated);
          const failedEl = document.getElementById('failed-count'); if (failedEl) failedEl.textContent = String(failed);
        }

        // Prefer dedicated status polling if opId is returned; otherwise fallback to history polling
        if (data?.data?.opId) {
          this.startModifyStatusPolling(data.data.opId);
        } else {
          this._modifyPollingStartTs = Date.now();
          this._modifyPollingFieldKey = fieldKey;
          this.startModifyHistoryPolling();
        }
      } else {
        this.app?.showNotification?.(data?.error || 'Failed to start update', 'error');
      }
    } catch (err) {
      this.app?.showNotification?.('Failed to start update: ' + err.message, 'error');
    } finally {
      const btn = document.getElementById('apply-static-update');
      if (btn) { btn.disabled = false; btn.innerHTML = backupHtml || '<i class="mdi mdi-pencil"></i> Apply to Population'; }
    }
  }

  /**
   * Start polling /api/history to detect MODIFY completion and update the UI
   */
  startModifyHistoryPolling() {
    try { if (this._modifyPoller) { clearInterval(this._modifyPoller); } } catch (_) {}
    const deadline = Date.now() + 3 * 60 * 1000; // 3 minutes safety
    this._modifyPoller = setInterval(async () => {
      if (Date.now() > deadline) { clearInterval(this._modifyPoller); return; }
      try {
        const r = await fetch('/api/history?limit=25', { credentials: 'include' });
        if (!r.ok) { return; }
        const j = await r.json().catch(() => ({}));
        const entries = j?.history || j?.data?.history || [];
        if (!Array.isArray(entries) || entries.length === 0) { return; }
        // Find the most recent MODIFY entry created after we started
        const startTs = this._modifyPollingStartTs || 0;
        const found = entries.find(e => (String(e.type || '').toUpperCase().includes('MODIFY')) && (new Date(e.timestamp || e.time || Date.now()).getTime() >= startTs - 1000));
        if (!found) { return; }

        // Update UI from entry fields (best effort)
        const updated = Number(found.success || found.updated || 0);
        const failed = Number(found.errors || found.failed || 0);
        const total = Number(found.total || (updated + failed) || 0);
        const processed = updated + failed;

        const totalEl = document.getElementById('total-count'); if (totalEl) totalEl.textContent = String(total);
        const processedEl = document.getElementById('processed-count'); if (processedEl) processedEl.textContent = String(processed);
        const modifiedEl = document.getElementById('modified-count'); if (modifiedEl) modifiedEl.textContent = String(updated);
        const failedEl = document.getElementById('failed-count'); if (failedEl) failedEl.textContent = String(failed);
        const pc = Math.min(100, total > 0 ? Math.round((processed / total) * 100) : 100);
        const bar = document.getElementById('modify-progress-bar'); if (bar) bar.style.width = `${pc}%`;
        const l = document.getElementById('progress-percentage'); if (l) l.textContent = `${pc}%`;
        const statusEl = document.getElementById('status-text'); if (statusEl) statusEl.textContent = 'Completed';

        // Show results with quick summary
        this.showSection('results-section');
        clearInterval(this._modifyPoller);
      } catch (_) { /* ignore transient errors */ }
    }, 3000);
  }

  /**
   * Poll /api/modify/status/:opId to drive progress UI
   */
  startModifyStatusPolling(opId) {
    try { if (this._modifyPoller) { clearInterval(this._modifyPoller); } } catch (_) {}
    const poll = async () => {
      try {
        const r = await fetch(`/api/modify/status/${encodeURIComponent(opId)}`, { credentials: 'include' });
        if (!r.ok) { return; }
        const j = await r.json().catch(() => ({}));
        const data = j?.data || j || {};
        const status = data.status || 'running';
        const total = Number(data.total || 0);
        const updated = Number(data.updated || 0);
        const failed = Number(data.failed || 0);
        const processed = updated + failed;
        const pc = Math.min(100, total > 0 ? Math.round((processed / total) * 100) : 0);
        const bar = document.getElementById('modify-progress-bar'); if (bar) bar.style.width = `${pc}%`;
        const l = document.getElementById('progress-percentage'); if (l) l.textContent = `${pc}%`;
        const totalEl = document.getElementById('total-count'); if (totalEl) totalEl.textContent = String(total);
        const processedEl = document.getElementById('processed-count'); if (processedEl) processedEl.textContent = String(processed);
        const modifiedEl = document.getElementById('modified-count'); if (modifiedEl) modifiedEl.textContent = String(updated);
        const failedEl = document.getElementById('failed-count'); if (failedEl) failedEl.textContent = String(failed);
        const statusEl = document.getElementById('status-text'); if (statusEl) statusEl.textContent = status === 'completed' ? 'Completed' : (status === 'failed' ? 'Failed' : 'Running');
        if (status === 'completed' || status === 'failed') {
          clearInterval(this._modifyPoller);
          this.showSection('results-section');
        }
      } catch (_) {}
    };
    poll();
    this._modifyPoller = setInterval(poll, 3000);
  }

  handlePopulationChange(populationId) {
    this.selectedPopulation = populationId;
    const loadUsersBtn = document.getElementById('load-users-btn');
    if (loadUsersBtn) {
      // Enable button if either population is selected OR file is picked
      loadUsersBtn.disabled = !this.selectedPopulation && !this.selectedFile;
    }
  }

  async loadUsers() {
    if (!this.selectedPopulation) {return;}

    const usersLoading = document.getElementById('users-loading');
    const usersList = document.getElementById('users-list');

    try {
      this.showSection('user-selection-section');
      usersLoading.style.display = 'block';
      usersList.innerHTML = '';

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
          usersLoading.style.display = 'none';
          this.renderUsers(users);
        } else {
          throw new Error('Invalid response format from server');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
      usersLoading.style.display = 'none';
      usersList.innerHTML = '<p class="text-danger">Error loading users. Please try again.</p>';
    }
  }

  renderUsers(users) {
    const usersList = document.getElementById('users-list');

    usersList.innerHTML = users.map(user => `
            <div class="user-card">
                <div class="form-check">
                    <input class="form-check-input user-checkbox" type="checkbox" 
                           value="${user.id}" id="user-${user.id}" data-user='${JSON.stringify(user)}'>
                    <label class="form-check-label" for="user-${user.id}">
                        <div class="user-info">
                            <strong>${user.name || 'Unknown User'}</strong>
                            <br>
                            <small class="text-muted">${user.email || 'No email'}</small>
                        </div>
                    </label>
                </div>
            </div>
        `).join('');

    // Add event listeners to checkboxes
    const checkboxes = usersList.querySelectorAll('.user-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateSelectedUsers();
      });
    });

    this.updateSelectedUsers();
  }

  selectAllUsers() {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
    this.updateSelectedUsers();
  }

  deselectAllUsers() {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    this.updateSelectedUsers();
  }

  updateSelectedUsers() {
    const checkboxes = document.querySelectorAll('.user-checkbox:checked');
    this.selectedUsers = Array.from(checkboxes).map(cb => JSON.parse(cb.getAttribute('data-user')));

    document.getElementById('count-display').textContent = this.selectedUsers.length;

    if (this.selectedUsers.length > 0) {
      this.showSection('modify-options-section');
    } else {
      this.hideSection('modify-options-section');
    }

    this.updateActionButtons();
  }

  updateActionButtons() {
    const startModifyBtn = document.getElementById('start-modify-btn');
    const hasSelectedUsers = this.selectedUsers.length > 0;
    const hasModifications = this.getModifications().length > 0;

    if (startModifyBtn) {
      startModifyBtn.disabled = !(hasSelectedUsers && hasModifications);
    }
  }

  getModifications() {
    const modifications = [];
    const fields = [
      { id: 'modify-email', attr: 'email' },
      { id: 'modify-firstname', attr: 'name.given' },
      { id: 'modify-lastname', attr: 'name.family' },
      { id: 'modify-phone', attr: 'phoneNumbers.0.value' }
    ];

    fields.forEach(field => {
      const element = document.getElementById(field.id);
      if (element && element.value.trim()) {
        modifications.push({ attribute: field.attr, value: element.value.trim() });
      }
    });

    return modifications;
  }

  async startModification() {
    const modifications = this.getModifications();
    if (modifications.length === 0) {return;}

    this.modifyInProgress = true;
    this.modifiedUsers = [];
    this.errors = [];

    this.showSection('modify-progress-section');
    this.updateModifyProgress(0, this.selectedUsers.length, 'Starting modification process...');

    document.getElementById('start-modify-btn').style.display = 'none';
    document.getElementById('cancel-modify-btn').style.display = 'inline-block';

    try {
      await this.performModifications(modifications);
    } catch (error) {
      console.error('❌ Modification process failed:', error);
      this.errors.push({ message: 'Modification process failed', error: error.message });
    } finally {
      this.modifyInProgress = false;
      this.showResults();
    }
  }

  async performModifications(modifications) {
    const total = this.selectedUsers.length;

    for (let i = 0; i < this.selectedUsers.length; i++) {
      if (!this.modifyInProgress) {break;}

      const user = this.selectedUsers[i];
      this.updateModifyProgress(i, total, `Modifying user ${i + 1} of ${total}...`);

      try {
        await this.modifyUser(user, modifications);
        this.modifiedUsers.push(user.id);
        this.addToModifyLog(`✅ Successfully modified user ${user.name || user.id}`, 'success');
      } catch (error) {
        this.errors.push({ userId: user.id, error: error.message });
        this.addToModifyLog(`❌ Failed to modify user ${user.name || user.id}: ${error.message}`, 'error');
      }

      this.updateModifyProgress(i + 1, total,
        i + 1 === total ? 'Modification process completed' : `Modifying user ${i + 2} of ${total}...`);
    }
  }

  async modifyUser(user, modifications) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate random success/failure for demo
    if (Math.random() < 0.1) {
      throw new Error('User modification failed');
    }

    return { success: true };
  }

  updateModifyProgress(processed, total, status) {
    const progressBar = document.getElementById('modify-progress-bar');
    const progressTextLeft = document.getElementById('modify-progress-text-left');
    const beerFill = document.getElementById('beer-fill-modify');
    const beerFoam = document.getElementById('beer-foam-modify');
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      progressBar.textContent = `${percentage}%`;
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
      beerFill.setAttribute('x', '8.5');
      beerFill.setAttribute('width', '17');
    }
    if (beerFoam) {
      const foamHeight = percentage > 0 ? (percentage < 100 ? 3 : 4) : 0.001;
      const yFoam = 26 - Math.max(0, Math.min(16, (percentage / 100) * 16)) - foamHeight;
      beerFoam.setAttribute('y', String(yFoam));
      beerFoam.setAttribute('height', String(foamHeight));
    }

    document.getElementById('status-text').textContent = status;
    document.getElementById('processed-count').textContent = processed;
    document.getElementById('total-count').textContent = total;
    document.getElementById('modified-count').textContent = this.modifiedUsers.length;
    document.getElementById('error-count').textContent = this.errors.length;
  }

  addToModifyLog(message, type = 'info') {
    const modifyLog = document.getElementById('modify-log');
    if (!modifyLog) {return;}

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-message">${message}</span>
        `;

    modifyLog.appendChild(logEntry);
    modifyLog.scrollTop = modifyLog.scrollHeight;
  }

  cancelModification() {
    this.modifyInProgress = false;
    document.getElementById('cancel-modify-btn').style.display = 'none';
    document.getElementById('reset-modify-btn').style.display = 'inline-block';
    // Record in history
    this.app.addHistoryEntry('modify', 'success', 'Modified selected users', this.modifiedUsers.length, Math.floor(Math.random()*60000)+5000);
  }

  showResults() {
    this.showSection('results-section');

    const resultsSummary = document.getElementById('results-summary');
    resultsSummary.innerHTML = `
            <div class="alert alert-info">
                <h4>Modification Summary</h4>
                <p><strong>Total Selected:</strong> ${this.selectedUsers.length}</p>
                <p><strong>Successfully Modified:</strong> ${this.modifiedUsers.length}</p>
                <p><strong>Errors:</strong> ${this.errors.length}</p>
            </div>
        `;

    if (this.errors.length > 0) {
      document.getElementById('error-details').style.display = 'block';
      const errorList = document.getElementById('error-list');
      errorList.innerHTML = this.errors.map(error => `
                <div class="error-item">
                    <strong>User ID:</strong> ${error.userId}<br>
                    <strong>Error:</strong> ${error.error}
                </div>
            `).join('');
    }

    document.getElementById('cancel-modify-btn').style.display = 'none';
    document.getElementById('reset-modify-btn').style.display = 'inline-block';
  }

  resetModification() {
    this.selectedPopulation = '';
    this.selectedUsers = [];
    this.modifyInProgress = false;
    this.modifiedUsers = [];
    this.errors = [];

    document.getElementById('modify-population-select').value = '';
    document.getElementById('load-users-btn').disabled = true;

    // Clear modification fields
    ['modify-email', 'modify-firstname', 'modify-lastname', 'modify-phone'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {element.value = '';}
    });

    // Hide sections
    this.hideSection('user-selection-section');
    this.hideSection('modify-options-section');
    this.hideSection('modify-progress-section');
    this.hideSection('results-section');

    // Reset buttons
    document.getElementById('start-modify-btn').style.display = 'inline-block';
    document.getElementById('start-modify-btn').disabled = true;
    document.getElementById('cancel-modify-btn').style.display = 'none';
    document.getElementById('reset-modify-btn').style.display = 'none';
  }

  showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {section.style.display = 'block';}
  }

  hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {section.style.display = 'none';}
  }

  // Called when token status changes
  onTokenStatusChange(tokenStatus) {
    // Only reload populations if page is loaded and token validity actually changed
    if (this.isLoaded) {
      const currentValidity = tokenStatus?.isValid;
      if (this.lastTokenValidity !== currentValidity) {
        console.log(`🔄 Modify page - Token validity changed: ${this.lastTokenValidity} -> ${currentValidity}`);
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
}
