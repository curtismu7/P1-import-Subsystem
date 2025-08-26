// Import Page Module
// PingOne User Management Tool v7.3.0

import { realtimeClient } from '../services/realtime-client.js';
import csrfManager from '../utils/csrf-utils.js';

export class ImportPage {
  constructor(app) {
    this.app = app;
    this.isLoaded = false;
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.isUploading = false;
    this.sessionId = null;
    this._progressHandler = null;
    this._completionHandler = null;
    this._errorHandler = null;
    this._lastProcessedSample = null; // { t, processed }
    // Watchdog/fallback tracking
    this._watchdogInterval = null;
    this._lastMessageAt = 0;
    this._lastProgress = null; // last payload received
    this._completed = false;
    // Token status cache for gating UI actions
    this.tokenStatus = { hasToken: false, isValid: false, expiresIn: 0, environmentId: null, region: null };
  }

  async load() {
    if (this.isLoaded) {return;}

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
                <!-- Token Status Banner -->
                <section class="import-section" id="token-status-section">
                    <div id="token-status" class="alert alert-warning" role="status" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                        <div id="token-status-text">Checking token status…</div>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <span id="token-env" class="badge bg-secondary" style="display:none;"></span>
                            <span id="token-expires" class="badge bg-secondary" style="display:none;"></span>
                            <button type="button" id="token-refresh-btn" class="btn btn-outline-secondary btn-sm">
                                <i class="mdi mdi-refresh"></i> Refresh Token
                            </button>
                        </div>
                    </div>
                </section>
                <!-- File Upload Section -->
                <section class="import-section">
                    <div class="import-box">
                        <h3 class="section-title">File Upload</h3>
                        <p>Select or drag and drop your CSV file to begin the import process</p>
                        
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
                        <div class="file-info file-details-panel" id="file-info" style="display: none;">
                            <div class="file-details">
                                <i class="mdi mdi-file-document"></i>
                                <div class="file-meta">
                                    <div class="file-name" id="file-name"></div>
                                    <div class="file-size" id="file-size"></div>
                                    <div class="file-dates">
                                        <div class="file-date"><strong>Modified:</strong> <span id="file-modified">—</span></div>
                                        <div class="file-date"><strong>Created:</strong> <span id="file-created">—</span></div>
                                    </div>
                                </div>
                                <button type="button" id="remove-file" class="btn btn-danger btn-sm file-remove-btn" style="display:inline-flex;align-items:center;gap:6px;">
                                    <i class="mdi mdi-delete"></i> <span>Remove</span>
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
                                <div class="population-dropdown-container">
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
                                    <input type="radio" id="mode-upsert" name="importMode" value="upsert" class="form-check-input">
                                    <label class="form-check-label" for="mode-upsert">Create or update users</label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="options-group">
                            <h4>Import Options</h4>
                            <div class="mb-2" style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                                <div class="form-group" style="display:flex; align-items:center; gap:8px;">
                                    <label for="username-prefix" class="form-label" style="margin:0; font-weight:600;">Username prefix</label>
                                    <input type="text" id="username-prefix" class="form-control" placeholder="Optional (e.g., dev_)" style="height:32px; width:200px; padding:0 8px;">
                                    <span id="username-prefix-help" class="text-muted" title="If set, this text is prepended to every username before import." style="margin-left:8px; font-size:.9rem;">Adds a short prefix to each username.</span>
                                </div>
                            </div>
                            <div style="height:8px;"></div>
                            <div class="checkbox-grid">
                                <div class="form-check">
                                    <input type="checkbox" id="skip-duplicates" name="skipDuplicates" class="form-check-input" checked>
                                    <label class="form-check-label" for="skip-duplicates">Skip duplicate users (by email)</label>
                                </div>
                                
                                <div class="form-check">
                                    <input type="checkbox" id="validate-emails" name="validateEmails" class="form-check-input" checked>
                                    <label class="form-check-label" for="validate-emails">Validate email addresses</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                <!-- Import Actions -->
                <section class="import-section">
                    <div class="import-box">
                        <div class="export-actions">
                            <button type="button" id="validate-file" class="btn btn-danger" disabled>
                                <i class="mdi mdi-check-circle"></i> Validate File
                            </button>
                            <button type="button" id="start-import" class="btn btn-danger" disabled>
                                <i class="mdi mdi-upload"></i> Start Import
                            </button>
                        </div>
                        <div id="validation-status" class="validation-status" style="display:none;margin-top:12px;padding:10px 12px;border:1px solid var(--pingone-border,#e5e7eb);border-radius:8px;background:#fff;">
                            <span class="validation-icon" style="margin-right:8px;">✅</span>
                            <span id="validation-text">File valid.</span>
                        </div>
                    </div>
                </section>
                
                <!-- Progress Section -->
                <section class="import-section" id="progress-section" style="display: none;">
                    <div class="import-box">
                        <h3 class="section-title">Import Progress</h3>
                        <p>Importing users to your PingOne environment</p>
                        
                        <div class="progress-container">
                            <div id="progress-text-left" class="progress-text">0%</div>
                            <div class="progress-bar">
                                <div id="progress-fill" class="progress-fill" style="width: 0%;"></div>
                            </div>
                            <div class="beer-stage"><svg id="beer-mug-svg-import" class="beer-mug" width="112" height="112" viewBox="0 0 36 36" aria-label="Beer mug progress icon" focusable="false">
                                <defs>
                                    <clipPath id="beer-clip-import">
                                        <path d="M9 8 h16 a2 2 0 0 1 2 2 v18 a2 2 0 0 1-2 2 h-16 a2 2 0 0 1-2-2 v-18 a2 2 0 0 1 2-2 z" />
                                    </clipPath>
                                </defs>
                                <defs>
                                    <linearGradient id="beer-grad-import" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stop-color="#ffb31a"/>
                                        <stop offset="60%" stop-color="#f59e0b"/>
                                        <stop offset="100%" stop-color="#e08a00"/>
                                    </linearGradient>
                                </defs>
                                <path d="M9 8 h16 a2 2 0 0 1 2 2 v18 a2 2 0 0 1-2 2 h-16 a2 2 0 0 1-2-2 v-18 a2 2 0 0 1 2-2 z"
                                      fill="none" stroke="#1f2937" stroke-width="1.5"/>
                                <path d="M27 12 h2 a3 3 0 0 1 3 3 v6 a3 3 0 0 1-3 3 h-2" fill="none" stroke="#1f2937" stroke-width="1.5"/>
                                <rect id="beer-fill-import" x="9" y="26" width="16" height="0" fill="url(#beer-grad-import)" clip-path="url(#beer-clip-import)"/>
                                <!-- Wavy foam: path updated in JS for rounded crest -->
                                <path id="beer-foam-import" d="M9 26 L25 26 L25 26 L9 26 Z" fill="#ffffff" opacity="0.95" clip-path="url(#beer-clip-import)"/>
                                <!-- overflow foam (outside clip) -->
                                <rect id="beer-foam-overflow" x="25" y="8" width="4" height="0" rx="1" ry="1" fill="#ffffff" opacity="0.95" style="display:none"/>
                                <!-- falling foam droplet -->
                                <circle id="beer-foam-drop" cx="27" cy="10" r="0.8" fill="#ffffff" opacity="0.95" style="display:none"/>
                                <circle class="beer-bubble" cx="13" cy="26" r="0.9"/>
                                <circle class="beer-bubble" cx="16" cy="27" r="0.7" style="animation-delay:.4s"/>
                                <circle class="beer-bubble" cx="19" cy="26" r="0.8" style="animation-delay:.8s"/>
                                <circle class="beer-bubble" cx="22" cy="27" r="0.9" style="animation-delay:1.2s"/>
                            </svg></div>
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
                        <div id="import-messages" class="results-container" style="margin-bottom:12px;display:none"></div>
                        
                                                <div id="results-summary" class="results-container">
                            <!-- Results will be populated here -->
                        </div>
                        
                        <div class="export-actions">
                            <button type="button" id="download-log-btn" class="btn btn-danger">
                                <i class="mdi mdi-download"></i> Download Log
                            </button>
                            <button type="button" id="new-import-btn" class="btn btn-outline-primary">
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
      // Initialize token status and banner
      this.refreshTokenStatus().catch(() => {});

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
    const optionIds = ['skip-duplicates','validate-emails'];
    const toggleOptions = (checked) => optionIds.forEach(id => { const el = document.getElementById(id); if (el) {el.checked = checked;} });
    if (importOptionsSelectAll) {importOptionsSelectAll.addEventListener('change', (e) => {
      if (!e.target.checked) {return;}
      toggleOptions(true);
      if (importOptionsUnselectAll) {importOptionsUnselectAll.checked = false;}
    });}
    if (importOptionsUnselectAll) {importOptionsUnselectAll.addEventListener('change', (e) => {
      if (!e.target.checked) {return;}
      toggleOptions(false);
      if (importOptionsSelectAll) {importOptionsSelectAll.checked = false;}
    });}

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
    const tokenRefreshBtn = document.getElementById('token-refresh-btn');

    if (validateFile) {
      validateFile.addEventListener('click', async () => { this.app.setButtonLoading(validateFile, true); try { await this.handleValidateFile(); } finally { this.app.setButtonLoading(validateFile, false); } });
    }

    if (startImport) {
      startImport.addEventListener('click', async () => { this.app.setButtonLoading(startImport, true); try { await this.handleStartImport(); } finally { this.app.setButtonLoading(startImport, false); } });
    }

    if (cancelImport) {
      cancelImport.addEventListener('click', this.handleCancelImport.bind(this));
    }

    if (refreshPopulations) {
      refreshPopulations.addEventListener('click', this.loadPopulations.bind(this));
    }
    if (tokenRefreshBtn) {
      tokenRefreshBtn.addEventListener('click', async () => {
        try {
          tokenRefreshBtn.disabled = true;
          tokenRefreshBtn.classList.remove('success');
          this.app.showLoading('Refreshing token…');
          await csrfManager.fetchWithCSRF('/api/token/refresh', { method: 'POST', credentials: 'include' }).then(r => r.json());
        } catch (e) {
          console.warn('Token refresh request failed', e);
        } finally {
          this.app.hideLoading();
        }
        await this.refreshTokenStatus();
        // Visual state: green if valid
        if (this.tokenStatus?.isValid) {
          tokenRefreshBtn.classList.add('success');
        } else {
          tokenRefreshBtn.classList.remove('success');
        }
        setTimeout(() => { tokenRefreshBtn.disabled = false; }, 600);
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

  async refreshTokenStatus() {
    try {
      let res = await fetch('/api/token/status', { credentials: 'include' });
      let json = await res.json().catch(() => ({}));
      let data = json?.data || json || {};
      // Some endpoints standardize as {success, message, data:{...}}
      if (data && typeof data === 'object' && data.data && data.hasToken === undefined && (data.data.hasToken !== undefined || data.data.isValid !== undefined)) {
        data = data.data;
      }
      const hasToken = !!data.hasToken;
      const isValid = !!data.isValid;

      // Proactively refresh if missing/invalid, then re-check
      if (!hasToken || !isValid) {
        try {
          await csrfManager.fetchWithCSRF('/api/token/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
          res = await fetch('/api/token/status', { credentials: 'include' });
          json = await res.json().catch(() => ({}));
          data = json?.data || json || {};
          if (data && typeof data === 'object' && data.data && data.hasToken === undefined && (data.data.hasToken !== undefined || data.data.isValid !== undefined)) {
            data = data.data;
          }
        } catch (_) {}
      }

      this.tokenStatus = {
        hasToken: !!data.hasToken,
        isValid: !!data.isValid,
        expiresIn: Number.isFinite(Number(data.expiresIn)) ? Number(data.expiresIn) : 0,
        environmentId: data.environmentId || null,
        region: data.region || null
      };
    } catch (e) {
      this.tokenStatus = { hasToken: false, isValid: false, expiresIn: 0, environmentId: null, region: null };
    }
    this.renderTokenBanner();
    this.updateButtonStates();
  }

  renderTokenBanner() {
    const banner = document.getElementById('token-status');
    const text = document.getElementById('token-status-text');
    const env = document.getElementById('token-env');
    const exp = document.getElementById('token-expires');
    if (!banner || !text) {return;}

    const { hasToken, isValid, expiresIn, environmentId, region } = this.tokenStatus || {};
    let expText = '';
    if (expiresIn > 0) {
      const m = Math.floor(expiresIn / 60);
      const s = Math.floor(expiresIn % 60);
      expText = `${m}m ${s}s`;
    }

    const setAlertClass = (cls) => {
      banner.classList.remove('alert-success','alert-warning','alert-danger');
      banner.classList.add(cls);
    };

    if (isValid) {
      setAlertClass('alert-success');
      text.textContent = 'Token valid';
    } else if (hasToken) {
      setAlertClass('alert-warning');
      text.textContent = 'Token expired or invalid. Please refresh before starting an import.';
    } else {
      setAlertClass('alert-danger');
      text.textContent = 'No token available. Please refresh to obtain a token.';
    }

    if (env) {
      if (environmentId) {
        env.style.display = 'inline-block';
        env.textContent = `Env: ${environmentId}${region ? ` (${region})` : ''}`;
      } else {
        env.style.display = 'none';
      }
    }
    if (exp) {
      if (expiresIn > 0) {
        exp.style.display = 'inline-block';
        exp.textContent = `Expires in: ${expText}`;
      } else {
        exp.style.display = 'none';
      }
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
    if (reqCsv) {reqCsv.checked = true;}
    if (reqSize) {reqSize.checked = file.size <= 10 * 1024 * 1024;}
    if (reqRequired) {reqRequired.checked = true;} // TODO: deep header validation later
    if (reqOptional) {reqOptional.checked = true;} // informational
  }

  displayFileInfo(file) {
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const uploadArea = document.getElementById('upload-area');
    const fileModified = document.getElementById('file-modified');
    const fileCreated = document.getElementById('file-created');

    if (fileInfo && fileName && fileSize && uploadArea) {
      fileName.textContent = file.name;
      fileSize.textContent = this.formatFileSize(file.size);
      // File API exposes lastModified; creation date is typically unavailable in browsers
      const modified = file.lastModified ? this.formatDate(file.lastModified) : '—';
      if (fileModified) {fileModified.textContent = modified;}
      if (fileCreated) {fileCreated.textContent = modified;} // best-effort (same as modified)

      fileInfo.style.display = 'block';
      uploadArea.style.display = 'none';
    }
  }

  formatDate(input) {
    try {
      const d = new Date(input);
      if (isNaN(d.getTime())) {return '—';}
      // Example: 2025-08-16 14:05
      const pad = (n) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const mi = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
    } catch {
      return '—';
    }
  }

  async previewFile(file) {
    const startTime = Date.now();
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

    if (fileInfo) {fileInfo.style.display = 'none';}
    if (uploadArea) {uploadArea.style.display = 'block';}
    if (fileInput) {fileInput.value = '';}

    // Disable action buttons
    this.updateButtonStates();

    // Hide progress and results
    this.hideProgressSection();
    this.hideResultsSection();
    // Clear validation status when file is removed
    const statusBox = document.getElementById('validation-status');
    if (statusBox) { statusBox.style.display = 'none'; }

    // Reset requirement checks
    ['req-csv','req-size','req-required','req-optional'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {el.checked = false;}
    });
  }

  async loadPopulations() {
    // Import the population loader service
    const { populationLoader } = await import('../services/population-loader.js');

    // Use the unified service to load populations
    const selectEl = document.getElementById('target-population');
    const previousValue = selectEl ? selectEl.value : '';
    await populationLoader.loadPopulations('target-population', {
      onError: (error) => {
        console.error('❌ Error loading populations for import page:', error);
        this.app.showError('Failed to load populations: ' + error.message);
      },
      onSuccess: (populations) => {
        // Preserve previous selection if it still exists; otherwise apply default once
        const select = document.getElementById('target-population');
        if (!select) { return; }
        const hasPrev = previousValue && Array.from(select.options).some(o => o.value === previousValue);
        if (hasPrev) {
          select.value = previousValue;
        } else if (this.app?.settings?.pingone_population_id) {
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

      const response = await csrfManager.fetchWithCSRF('/api/import', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();
      // Support standardized { success, message, data } or direct shape
      const payload = (result && typeof result === 'object' && 'data' in result)
        ? (result.data || {})
        : result;
      const total = Number(payload?.total ?? 0);

      if (response.ok) {
        this.app.showSuccess(`File validation successful! Found ${total} records. Running preflight duplicate scan...`);
        // Preflight duplicate scan (global) using server helper endpoint
        try {
          const pf = await csrfManager.fetchWithCSRF('/api/import/preflight', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sample: Math.min(200, total) })
          });
          const pj = await pf.json().catch(() => ({}));
          const dupCount = Number(pj?.data?.duplicates || 0);
          if (dupCount > 0) { this.app.showWarning(`Preflight: Detected ${dupCount} potential duplicates across the environment.`); }
          else { this.app.showInfo('Preflight: No duplicates detected in sample.'); }
        } catch (_) { /* non-blocking */ }
        this.displayValidationResults(payload);
        // Show persistent validation status
        const statusBox = document.getElementById('validation-status');
        const statusText = document.getElementById('validation-text');
        if (statusBox && statusText) {
          statusText.textContent = `File valid. ${total} users detected.`;
          statusBox.style.display = 'block';
        }
        // Turn Validate File button green to indicate success
        const validateBtn = document.getElementById('validate-file');
        if (validateBtn) {
          validateBtn.classList.remove('btn-primary');
          validateBtn.classList.add('btn-success');
        }
      } else {
        throw new Error(payload?.error || 'Validation failed');
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

    const targetPopulationSelect = document.getElementById('target-population');
    const targetPopulation = targetPopulationSelect?.value;
    if (!targetPopulation) {
      this.app.showError('Please select a target population');
      // Hide any stale validation status to prompt user to select population
      const statusBox = document.getElementById('validation-status');
      if (statusBox) { statusBox.style.display = 'none'; }
      return;
    }
    // Ensure token is valid before starting
    try {
      if (!this.tokenStatus?.isValid) {
        // Try a quick refresh, then re-check
        await csrfManager.fetchWithCSRF('/api/token/refresh', { method: 'POST', credentials: 'include' }).catch(() => {});
        await this.refreshTokenStatus();
      }
    } catch {}
    if (!this.tokenStatus?.isValid) {
      this.app.showError('Token is missing or invalid. Please refresh token and try again.');
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

      // Ensure real-time connection is established before starting the import
      try {
        if (!realtimeClient.isConnected && !realtimeClient.isConnecting) {
          console.debug('[ImportPage] Establishing real-time connection before starting import');
          await realtimeClient.connect();
          console.debug('[ImportPage] Real-time connection status after connect:', realtimeClient.getStatus());
        }
      } catch (connErr) {
        console.warn('[ImportPage] Proceeding despite real-time connection issue:', connErr?.message);
      }

      const formData = new FormData();
      formData.append('file', this.selectedFile);
      formData.append('populationId', targetPopulation);
      // Also send populationName for server-side logging/verification
      try {
        const opt = targetPopulationSelect && targetPopulationSelect.options && targetPopulationSelect.selectedIndex >= 0
          ? targetPopulationSelect.options[targetPopulationSelect.selectedIndex]
          : null;
        let populationName = opt ? opt.text.trim() : '';
        // If we have a full object cached in data attribute, prefer its name
        if (opt && opt.dataset && opt.dataset.population) {
          try {
            const p = JSON.parse(opt.dataset.population);
            if (p && p.name) { populationName = p.name; }
          } catch (_) { /* ignore parse errors */ }
        }
        if (populationName) { formData.append('populationName', populationName); }
      } catch (_) { /* non-blocking */ }

      // Get import options
      const importMode = document.querySelector('input[name="importMode"]:checked');
      if (importMode) {
        formData.append('importMode', importMode.value);
      }

      // sendWelcome option removed

      const skipDuplicates = document.getElementById('skip-duplicates');
      if (skipDuplicates) {
        formData.append('skipDuplicates', skipDuplicates.checked);
      }

      // skipExistingUsername option removed

      // skipExistingUserid option removed

      // validateOnly/dry-run option removed

      // Start the import
      const response = await csrfManager.fetchWithCSRF('/api/import', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        // API responses may be standardized as { success, message, data }
        const payload = (result && typeof result === 'object' && 'data' in result) ? (result.data || {}) : result;
        const respSessionId = payload?.sessionId;
        const respTotal = Number(payload?.total ?? 0);

        // Capture session info and begin real-time monitoring
        this.sessionId = respSessionId || this.sessionId;
        // IMPORTANT: Register handlers BEFORE associating session to avoid missing
        // immediate delivery of queued messages on association.
        // Decide polling vs realtime by threshold from server config exposed via settings
        const pollingThreshold = Number(this.app?.settings?.import_polling_threshold) || Number(this.app?.settings?.importPollingThreshold) || 400;
        const usePollingOnly = respTotal <= pollingThreshold;
        this.startProgressMonitoring(this.sessionId, respTotal);
        if (this.sessionId) {
          try {
            // Slight microtask delay to ensure handlers are fully registered
            await Promise.resolve();
            realtimeClient.associateSession(this.sessionId);
            console.debug('[ImportPage] Associated realtime session. Status:', realtimeClient.getStatus());
          } catch (e) {
            console.warn('Could not associate realtime session:', e.message);
          }
        }
      } else {
        throw new Error(result.error || 'Import failed to start');
      }

    } catch (error) {
      this.app.showError('Failed to start import: ' + error.message);
      this.isUploading = false;
      this.hideProgressSection();
    }
  }

  handleCancelImport() {
    // Use status bar instead of confirm modal
    this.app.showWarning('Cancelling import...');
    csrfManager.fetchWithCSRF('/api/import/cancel', { method: 'POST', credentials: 'include' })
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

    if (progressSection) {progressSection.style.display = 'block';}
    if (startImport) {startImport.style.display = 'none';}
    if (cancelImport) {cancelImport.style.display = 'inline-block';}

    // Keep nav visible: avoid auto-scrolling away from header/left nav
    // If needed, we can highlight the section without scrolling.
  }

  hideProgressSection() {
    const progressSection = document.getElementById('progress-section');
    const startImport = document.getElementById('start-import');
    const cancelImport = document.getElementById('cancel-import');

    if (progressSection) {progressSection.style.display = 'none';}
    if (startImport) {startImport.style.display = 'inline-block';}
    if (cancelImport) {cancelImport.style.display = 'none';}
  }

  hideResultsSection() {
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {resultsSection.style.display = 'none';}
  }

  showResultsSection() {
    const resultsSection = document.getElementById('results-section');
    const progressSection = document.getElementById('progress-section');
    const fileUploadSection = document.querySelector('.import-section:first-child');
    const startImport = document.getElementById('start-import');
    const cancelImport = document.getElementById('cancel-import');

    // Hide non-result sections
    if (progressSection) {progressSection.style.display = 'none';}
    if (fileUploadSection) {fileUploadSection.style.display = 'none';}

    // Update action buttons
    if (startImport) {startImport.style.display = 'inline-block';}
    if (cancelImport) {cancelImport.style.display = 'none';}

    // Show results and bring into view
    if (resultsSection) {
      resultsSection.style.display = 'block';
      setTimeout(() => {
        try { resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
      }, 50);
    }
  }

  startProgressMonitoring(sessionId, totalFromStart) {
    // Clear any previous handlers to avoid duplicates
    if (this._progressHandler) {realtimeClient.offMessage('progress');}
    if (this._completionHandler) {realtimeClient.offMessage('completion');}
    if (this._errorHandler) {realtimeClient.offMessage('error');}

    // Reset tracking
    this._completed = false;
    this._lastMessageAt = Date.now();
    this._lastProgress = null;

    console.log('[ImportPage] Initializing progress monitoring', {
      sessionId,
      totalFromStart
    });

    // Helper to update the UI from a progress payload
    const applyProgress = (payload) => {
      if (!payload) {return;}
      const processed = Number(payload.processed ?? payload.stats?.processed ?? 0);
      const total = Number(payload.total ?? totalFromStart ?? 0);
      const created = Number(payload.stats?.created ?? 0);
      const skipped = Number(payload.stats?.skipped ?? 0);
      const failed = Number(payload.stats?.failed ?? 0);

      const percentage = total > 0 ? Math.min(100, Math.max(0, (processed / total) * 100)) : 0;
      this.updateProgress(percentage);
      this.updateProgressStats({ processed, total, created, skipped, failed });

      // Update last message/progress
      this._lastMessageAt = Date.now();
      this._lastProgress = { processed, total, stats: { created, skipped, failed }, raw: payload };
    };

    // Register real-time handlers
    this._progressHandler = (data/*, message*/) => {
      console.debug('[ImportPage] progress message received', {
        processed: Number(data?.processed ?? data?.stats?.processed ?? 0),
        total: Number(data?.total ?? totalFromStart ?? 0)
      });
      applyProgress(data);
    };

    this._completionHandler = (data/*, message*/) => {
      console.debug('[ImportPage] completion message received');
      // Ensure final UI reflects completion stats
      applyProgress(data);
      this._completed = true;
      this.completeImport(data);
    };

    this._errorHandler = (data/*, message*/) => {
      const msg = data?.message || 'Import error';
      console.warn('[ImportPage] error message received', msg);
      this.app.showError(msg);
    };

    // Attach handlers to realtime client
    try {
      realtimeClient.onMessage('progress', this._progressHandler);
      realtimeClient.onMessage('completion', this._completionHandler);
      realtimeClient.onMessage('error', this._errorHandler);
      console.debug('[ImportPage] Real-time handlers registered', {
        hasProgress: !!this._progressHandler,
        hasCompletion: !!this._completionHandler,
        hasError: !!this._errorHandler,
        sessionId: this.sessionId
      });
    } catch (e) {
      console.error('[ImportPage] Failed to register realtime handlers:', e);
    }

    // Proactively (re)associate the session a few times until first message arrives
    // to avoid any timing gaps between association and handler readiness.
    if (sessionId) {
      let attempts = 0;
      const maxAttempts = 5;
      const tickMs = 1000;
      if (this._associateRetry) {clearInterval(this._associateRetry);}
      this._associateRetry = setInterval(() => {
        // Stop retrying once we start receiving messages or finish
        if (this._completed || (Date.now() - (this._lastMessageAt || 0)) < tickMs) {
          clearInterval(this._associateRetry);
          this._associateRetry = null;
          return;
        }
        attempts++;
        try {
          if (realtimeClient.isConnected) {
            realtimeClient.associateSession(sessionId);
            console.debug('[ImportPage] Re-associate attempt', { attempts, sessionId });
          }
        } catch (e) {
          console.warn('[ImportPage] Re-associate failed', e?.message);
        }
        if (attempts >= maxAttempts) {
          clearInterval(this._associateRetry);
          this._associateRetry = null;
        }
      }, tickMs);
    }

    // Start a watchdog to detect stalls or missing completion events; also poll REST continuously as a fallback
    if (this._watchdogInterval) {clearInterval(this._watchdogInterval);}
    this._watchdogInterval = setInterval(async () => {
      const now = Date.now();
      const sinceLast = now - (this._lastMessageAt || now);

      // Always poll lightweight status to keep UI moving even if realtime is flaky
      if (!this._completed) {
        try {
          const resp = await fetch('/api/import/status', { credentials: 'include' });
          const payload = await resp.json().catch(() => ({}));
          const d = payload && (payload.data || payload);
          if (d) {
            const prog = d.progress || {};
            const total = Number(prog.total ?? this._lastProgress?.total ?? 0);
            const processed = Number(prog.current ?? this._lastProgress?.processed ?? 0);
            const statsSrc = d.statistics || {};
            const failed = Number(statsSrc.failed ?? statsSrc.errors ?? 0);
            const skipped = Number(statsSrc.skipped ?? 0);
            const created = Math.max(0, processed - failed - skipped);
            applyProgress({ processed, total, stats: { created, failed, skipped } });

            if (d.status === 'completed' || d.status === 'failed' || d.status === 'cancelled') {
              this._completed = true;
              this.completeImport({
                processed,
                total,
                stats: { created, failed, skipped },
                durationMs: (d.timing && d.timing.duration) || undefined,
                fileName: (d.currentFile || undefined)
              });
              if (this._watchdogInterval) { clearInterval(this._watchdogInterval); this._watchdogInterval = null; }
              return;
            }
          }
        } catch (_) { /* ignore poll errors */ }
      }

      // If we've processed all records but didn't get completion in time, finalize
      if (!this._completed && this._lastProgress && this._lastProgress.total > 0) {
        const { processed, total } = this._lastProgress;
        if (processed >= total && sinceLast > 10000) { // 10s after last progress
          console.warn('[ImportPage] Progress indicates completion but no completion event received. Finalizing import (fallback).', { processed, total, sinceLast });
          this._completed = true;
          try {
            this.completeImport({ processed, total, stats: this._lastProgress.stats || {} });
          } finally {
            if (this._watchdogInterval) { clearInterval(this._watchdogInterval); this._watchdogInterval = null; }
          }
        }
      }
    }, 2000);
  }

  updateProgress(percentage) {
    const progressFill = document.getElementById('progress-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressTextLeft = document.getElementById('progress-text-left');
    const beerFill = document.getElementById('beer-fill-import');
    const beerFoam = document.getElementById('beer-foam-import');

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
      // Make beer appear edge-to-edge by slightly widening and shifting fill
      beerFill.setAttribute('x', '8.5');
      beerFill.setAttribute('width', '17');
    }
    if (beerFoam) {
      const fillH = Math.max(0, Math.min(16, (percentage / 100) * 16));
      const crest = 26 - fillH; // top of liquid
      const amplitude = percentage < 100 ? 0.6 : 0.2; // smaller ripple at the end
      const wave = `M9 ${crest} C 13 ${crest - amplitude}, 21 ${crest + amplitude}, 25 ${crest} L25 ${crest + 3} L9 ${crest + 3} Z`;
      beerFoam.setAttribute('d', wave);
    }

    // Foam overflow near completion
    try {
      const overflow = document.getElementById('beer-foam-overflow');
      const drop = document.getElementById('beer-foam-drop');
      if (overflow && drop) {
        if (percentage >= 92) {
          const extra = Math.min(4, (percentage - 92) / 8 * 4); // up to 4px overflow
          overflow.style.display = 'block';
          overflow.setAttribute('height', String(extra));
          overflow.setAttribute('y', String(8));
          // occasional falling drop
          if (percentage >= 98) {
            drop.style.display = 'block';
            drop.classList.add('foam-drop-anim');
            // reset animation so multiple passes can occur
            setTimeout(() => { drop.classList.remove('foam-drop-anim'); }, 1300);
          } else {
            drop.style.display = 'none';
          }
        } else {
          overflow.style.display = 'none';
          drop.style.display = 'none';
        }
      }
    } catch (_) { /* non-blocking */ }
  }

  completeImport(finalData) {
    // Prevent duplicate completion
    if (this._completed !== true) {
      this._completed = true;
    }

    // Cleanup handlers and watchdog
    try { realtimeClient.offMessage('progress'); } catch {}
    try { realtimeClient.offMessage('completion'); } catch {}
    try { realtimeClient.offMessage('error'); } catch {}
    if (this._watchdogInterval) {
      clearInterval(this._watchdogInterval);
      this._watchdogInterval = null;
    }

    this.isUploading = false;
    this.hideProgressSection();
    this.showResultsSection();

    // Log final payload for diagnostics
    try {
      console.debug('[ImportPage] Final completion payload:', finalData);
    } catch {}

    // Extract stats from final payload with sensible fallbacks
    const processed = Number(finalData?.processed ?? finalData?.stats?.processed ?? this._lastProgress?.processed ?? 0);
    const total = Number(finalData?.total ?? this._lastProgress?.total ?? 0);
    const created = Number(finalData?.stats?.created ?? 0);
    const skipped = Number(finalData?.stats?.skipped ?? 0);
    const failed = Number(finalData?.stats?.failed ?? 0);
    const warnings = Array.isArray(finalData?.stats?.warnings) ? finalData.stats.warnings : [];
    const errors = Array.isArray(finalData?.stats?.errors) ? finalData.stats.errors : [];

    const successBase = processed > 0 ? processed : total;
    const successRate = successBase > 0 ? Math.round(((created) / successBase) * 1000) / 10 : 0; // one decimal place

    // Duration formatting
    const durationMs = Number(finalData?.durationMs ?? 0);
    const formatDuration = (ms) => {
      if (!Number.isFinite(ms) || ms <= 0) {return '—';}
      const s = Math.round(ms / 1000);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
    };

    // File name and population display
    const fileName = finalData?.fileName || this.selectedFile?.name || '—';
    const popSelect = document.getElementById('target-population');
    const populationLabel = popSelect && popSelect.options && popSelect.selectedIndex >= 0
      ? popSelect.options[popSelect.selectedIndex].text
      : '—';

    // Import options chosen
    const importMode = document.querySelector('input[name="importMode"]:checked');
    const importModeValue = importMode ? importMode.value : 'create';
    const skipOptionsText = 'None';

    // Populate results UI
    const summary = document.getElementById('results-summary');
    const messagesBox = document.getElementById('import-messages');
    if (summary) {
      summary.innerHTML = `
            <div class="results-grid">
                <div class="result-card success">
                    <div>
                        <h3>Import Summary</h3>
                        <div class="result-stats">
                            <div class="stat-item">
                                <span class="stat-label">Total Users:</span>
                                <span class="stat-value" style="font-weight:700;">${total || processed}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Successfully Imported:</span>
                                <span class="stat-value success" style="font-weight:700;">${created}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Skipped:</span>
                                <span class="stat-value warning" style="font-weight:700;">${skipped}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Failed:</span>
                                <span class="stat-value error" style="font-weight:700;">${failed}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Success Rate:</span>
                                <span class="stat-value" style="font-weight:700;">${successRate}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Duration:</span>
                                <span class="stat-value" style="font-weight:700;">${formatDuration(durationMs)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="result-details">
                    <h4>Import Details</h4>
                    <ul>
                        <li>Target Population: <strong>${populationLabel}</strong></li>
                        <li>Import Mode: <strong>${importModeValue === 'create' ? 'Create new users only' : 'Create or update users'}</strong></li>
                        <li>Skip Options: <strong>${skipOptionsText}</strong></li>
                        <li>File: <strong>${fileName}</strong></li>
                    </ul>
                    <div style="margin-top:10px">
                        <small>
                            ${warnings.length ? `Warnings: ${warnings.length}` : ''}
                            ${warnings.length && errors.length ? ' | ' : ''}
                            ${errors.length ? `Errors: ${errors.length}` : ''}
                        </small>
                    </div>
                </div>
            </div>
        `;
    }

    // Persistent messages: sample errors and skip reasons
    if (messagesBox) {
      const skips = Array.isArray(finalData?.stats?.skipSamples) ? finalData.stats.skipSamples : [];
      const errs = Array.isArray(finalData?.stats?.errorSamples) ? finalData.stats.errorSamples : [];
      // Prefer unique error messages up to 5 lines
      const uniqueErrs = [];
      const seen = new Set();
      for (const e of errs) {
        const msg = (e?.message || '').trim();
        if (!msg) continue;
        if (msg.toLowerCase().includes('uniqueness_violation')) continue; // keep it in skips section instead
        if (!seen.has(msg)) { seen.add(msg); uniqueErrs.push(msg); }
        if (uniqueErrs.length >= 5) break;
      }
      const skipItems = skips.slice(0, 12).map(s => `<li>UNIQUENESS_VIOLATION — ${s.username || ''} ${s.email ? '('+s.email+')' : ''}</li>`).join('');
      const errItems = uniqueErrs.map(m => `<li>${m}</li>`).join('');
      messagesBox.innerHTML = `
        <div class="results-grid">
          ${skipItems ? `<div class="result-card warning"><h4>Skipped (duplicates)</h4><ul>${skipItems}</ul></div>` : ''}
          ${errItems ? `<div class="result-card error"><h4>Errors (samples)</h4><ul>${errItems}</ul></div>` : ''}
        </div>`;
      messagesBox.style.display = (skipItems || errItems) ? 'block' : 'none';
    }
  }

  startNewImport() {
    console.log('🔄 Starting new import...');

    // Reset form state
    this.selectedFile = null;

    // Hide results section
    this.hideResultsSection();
    // Clear persistent messages
    const messagesBox = document.getElementById('import-messages');
    if (messagesBox) { messagesBox.innerHTML = ''; messagesBox.style.display = 'none'; }

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
    const validateEmails = document.getElementById('validate-emails');

    if (skipDuplicates) {skipDuplicates.checked = true;}
    if (validateEmails) {validateEmails.checked = true;}

    // Reset import mode to create
    const createMode = document.getElementById('mode-create');
    if (createMode) {createMode.checked = true;}

    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.app.showInfo('Ready for new import. Please select a file.');
  }

  downloadLog() {
    console.log('📥 Downloading import log...');
    // Fetch recent debug log lines and trigger browser download
    const params = new URLSearchParams({ lines: '2000' });
    fetch(`/api/debug-log/file?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        if (!json || (json.success === false && !json.entries)) {
          throw new Error(json?.error || 'Failed to fetch log');
        }
        const entries = json.data?.entries || json.entries || [];
        const content = Array.isArray(entries) ? entries.join('\n') : String(entries || '');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `import-debug-${ts}.log`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.app.showSuccess('Log downloaded');
      })
      .catch(err => {
        console.error('Log download failed:', err);
        this.app.showError('Failed to download log: ' + err.message);
      });
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
      startImportBtn.title = '';
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
    if (bytes === 0) {return '0 Bytes';}
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Non-export helper methods added to prototype to keep class concise
ImportPage.prototype.updateProgressStats = function(stats) {
  const { processed = 0, total = 0, created = 0, skipped = 0, failed = 0 } = stats || {};

  // Update textual stats
  const elProcessed = document.getElementById('users-processed');
  const elTotal = document.getElementById('total-users');
  const elSuccessRate = document.getElementById('success-rate');
  const elEta = document.getElementById('estimated-time');

  if (elProcessed) {elProcessed.textContent = String(processed);}
  if (elTotal) {elTotal.textContent = String(total || '0');}

  const successRate = processed > 0 ? Math.round(((created) / processed) * 100) : 0;
  if (elSuccessRate) {elSuccessRate.textContent = `${successRate}%`;}

  // Estimate remaining time using simple moving sample
  const now = Date.now();
  const last = this._lastProcessedSample;
  this._lastProcessedSample = { t: now, processed };

  let etaText = 'Calculating...';
  if (total > 0 && last && processed > last.processed) {
    const dt = (now - last.t) / 1000; // seconds
    const dp = processed - last.processed;
    const rate = dp / Math.max(dt, 0.001); // items/sec
    const remaining = Math.max(total - processed, 0);
    const secondsLeft = rate > 0 ? Math.round(remaining / rate) : null;
    if (Number.isFinite(secondsLeft)) {
      const m = Math.floor(secondsLeft / 60);
      const s = secondsLeft % 60;
      etaText = m > 0 ? `${m}m ${s}s` : `${s}s`;
    }
  }
  if (elEta) {elEta.textContent = etaText;}
};
