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
    // Live import statistics (processed/total/errors/skipped)
    this.importStats = null;
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
                             <input type="file" id="file-input" accept=".csv" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;">
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
                            <h4>Import Behavior</h4>
                            <div class="checkbox-grid">
                                <div class="form-check">
                                    <input type="radio" id="mode-create" name="importBehavior" value="create" class="form-check-input" checked>
                                    <label class="form-check-label" for="mode-create">Create new users only</label>
                                </div>
                                <div class="form-check">
                                    <input type="radio" id="mode-upsert" name="importBehavior" value="upsert" class="form-check-input">
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
                                     <input type="checkbox" id="skip-duplicates" name="skipDuplicates" class="form-check-input">
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
                                     <input type="checkbox" id="validate-emails" name="validateEmails" class="form-check-input">
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
                
                <!-- Populations Live Lookup -->
                <section class="import-section">
                    <div class="import-box" style="background:#f8f9fa;border:1px solid #e5e7eb;">
                        <h3 class="section-title">Live Populations</h3>
                        <p>Fetch the latest populations directly from PingOne (bypasses local settings and cache).</p>
                        <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px;">
                            <button type="button" id="fetch-live-populations" class="btn btn-danger">
                                <i class="mdi mdi-refresh"></i> Get Populations (PingOne)
                            </button>
                            <span id="live-pop-status" style="font-size:0.9rem;color:#374151;"></span>
                        </div>
                        <div id="live-populations" class="card" style="max-height:240px;overflow:auto;border:1px solid #e5e7eb;border-radius:6px;padding:8px;background:#fff;"></div>
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
                                <rect id="beer-fill-import" x="9" y="26" width="16" height="0" fill="#f59e0b" clip-path="url(#beer-clip-import)"/>
                                <rect id="beer-foam-import" x="9" y="26" width="16" height="0.001" fill="#ffffff" opacity="0.95" clip-path="url(#beer-clip-import)"/>
                            </svg>
                            <div id="progress-percentage" class="progress-text">0%</div>
                        </div>
                        
                        <!-- Progress Speed Control -->
                        <div class="progress-controls" style="margin: 16px 0; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <label for="progress-speed" style="font-weight: 600; color: #374151; font-size: 0.875rem;">
                                    <i class="mdi mdi-speedometer" style="margin-right: 6px;"></i>
                                    Progress Bar Speed:
                                </label>
                                <select id="progress-speed" style="padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.875rem;">
                                    <option value="slow">Slow (Realistic)</option>
                                    <option value="medium" selected>Medium (Balanced)</option>
                                    <option value="fast">Fast (Quick Preview)</option>
                                </select>
                                <button type="button" id="test-progress" class="btn btn-sm btn-outline-info" title="Test progress bar with current speed setting">
                                    <i class="mdi mdi-play-circle"></i> Test Progress
                                </button>
                            </div>
                            <div style="font-size: 0.75rem; color: #6b7280;">
                                <strong>Slow:</strong> Progress bar moves realistically with actual processing speed<br>
                                <strong>Medium:</strong> Balanced speed for good user experience<br>
                                <strong>Fast:</strong> Quick preview for testing
                            </div>
                        </div>
                        
                        <!-- Smart Import Mode Selector -->
                        <div class="import-mode-selector" style="margin: 16px 0; padding: 16px; background: #f0f9ff; border-radius: 8px; border: 1px solid #0ea5e9; border-left: 4px solid #0ea5e9;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                <i class="mdi mdi-brain" style="font-size: 1.2rem; color: #0ea5e9;"></i>
                                <h4 style="margin: 0; color: #0c4a6e; font-size: 1rem;">
                                    Smart Import Mode
                                </h4>
                                <div class="mode-badge" id="current-mode-badge" style="padding: 4px 8px; background: #0ea5e9; color: white; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                                    Auto
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <input type="radio" id="mode-auto" name="importMode" value="auto" checked style="margin: 0;">
                                    <label for="mode-auto" style="margin: 0; font-weight: 600; color: #0c4a6e;">
                                        🧠 Auto (Recommended)
                                    </label>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <input type="radio" id="mode-realtime" name="importMode" value="realtime">
                                    <label for="mode-realtime" style="margin: 0; font-weight: 600; color: #0c4a6e;">
                                        📊 Real-time Updates
                                    </label>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <input type="radio" id="mode-batch" name="importMode" value="batch">
                                    <label for="mode-batch" style="margin: 0; font-weight: 600; color: #0c4a6e;">
                                        📋 Batch Summary Only
                                    </label>
                                </div>
                            </div>
                            
                            <div style="font-size: 0.75rem; color: #0369a1; line-height: 1.4;">
                                <strong>Auto:</strong> Automatically chooses best mode based on record count<br>
                                <strong>Real-time:</strong> Live updates for each user (best for ≤100 records)<br>
                                <strong>Batch:</strong> Summary only for large imports (best for >100 records)
                            </div>
                            
                            <div id="mode-recommendation" style="margin-top: 12px; padding: 8px 12px; background: #e0f2fe; border-radius: 6px; border-left: 3px solid #0284c7; font-size: 0.8rem; color: #0c4a6e;">
                                <i class="mdi mdi-lightbulb" style="margin-right: 6px;"></i>
                                <strong>Recommendation:</strong> <span id="recommendation-text">Auto mode will choose the best option for your data</span>
                            </div>
                        </div>
                        
                        <!-- Status Log Section -->
                        <div class="status-log-container" style="margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
                            <div class="status-log-header" style="padding: 12px 16px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center;">
                                <h4 style="margin: 0; font-size: 1rem; color: #374151;">
                                    <i class="mdi mdi-format-list-bulleted" style="margin-right: 8px;"></i>
                                    Live Status Log
                                </h4>
                                <div class="status-log-controls">
                                    <button type="button" id="test-status-log" class="btn btn-sm btn-outline-info" title="Test status log (dev only)">
                                        <i class="mdi mdi-flask"></i> Test
                                    </button>
                                    <button type="button" id="clear-status-log" class="btn btn-sm btn-outline-secondary" title="Clear log">
                                        <i class="mdi mdi-delete-sweep"></i> Clear
                                    </button>
                                    <button type="button" id="pause-status-log" class="btn btn-sm btn-outline-warning" title="Pause updates">
                                        <i class="mdi mdi-pause"></i> Pause
                                    </button>
                                </div>
                            </div>
                            <div id="status-log-content" class="status-log-content" style="max-height: 300px; overflow-y: auto; padding: 12px 16px; background: #ffffff;">
                                <div class="status-log-placeholder" style="text-align: center; color: #9ca3af; font-style: italic; padding: 20px;">
                                    <i class="mdi mdi-clock-outline" style="font-size: 2rem; display: block; margin-bottom: 8px;"></i>
                                    Waiting for import to start...
                                </div>
                            </div>
                            <div class="status-log-footer" style="padding: 8px 16px; background: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; font-size: 0.875rem; color: #6b7280;">
                                <span id="status-log-count">0</span> operations logged
                            </div>
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
                            <button type="button" id="download-log" class="btn btn-primary">
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
            // Cross-OS reliability: reset value on click so same-file reselect triggers change
            fileInput.addEventListener('click', () => { try { fileInput.value = ''; } catch (_) {} });
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }
        
        if (browseFiles) {
            browseFiles.addEventListener('click', (e) => {
                e.preventDefault();
                if (!fileInput) return;
                try { fileInput.click(); } catch (_) { setTimeout(() => fileInput.click(), 0); }
            });
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

        // Live populations fetch (bypass cache/settings)
        const fetchLive = document.getElementById('fetch-live-populations');
        const liveList = document.getElementById('live-populations');
        const liveStatus = document.getElementById('live-pop-status');
        if (fetchLive && liveList) {
            fetchLive.addEventListener('click', async () => {
                try {
                    liveStatus.textContent = 'Fetching…';
                    const r = await fetch(`/api/populations?refresh=1&_=${Date.now()}`, { cache: 'no-store' });
                    const j = await r.json().catch(()=>({}));
                    if (!r.ok) throw new Error(j?.error || r.statusText);
                    const pops = j?.data?.populations || j?.populations || [];
                    if (!Array.isArray(pops) || pops.length === 0) {
                        liveList.innerHTML = '<div style="color:#6b7280;">No populations returned.</div>';
                        liveStatus.textContent = 'No results';
                        return;
                    }
                    liveList.innerHTML = pops.map(p => `
                        <div style="padding:6px 4px;border-bottom:1px solid #eef2f7;display:flex;justify-content:space-between;gap:8px;align-items:center;">
                            <div>
                                <div style="font-weight:600;color:#111827;">${this.escapeHtml(p.name || '')}</div>
                                <div style="font-size:12px;color:#6b7280;">${this.escapeHtml(p.id || '')}${p.isDefault ? ' — Default' : ''}${p.userCount ? ` • ${p.userCount} users` : ''}</div>
                            </div>
                            <button type="button" data-pop-id="${p.id}" class="btn btn-outline-secondary btn-sm select-pop-btn">Use</button>
                        </div>`).join('');
                    liveStatus.textContent = `Loaded ${pops.length}`;
                } catch (e) {
                    liveList.innerHTML = `<div style="color:#b91c1c;">Failed: ${this.escapeHtml(e.message)}</div>`;
                    liveStatus.textContent = 'Error';
                }
            });
            // Delegate click for Use buttons
            liveList.addEventListener('click', (ev) => {
                const btn = ev.target.closest('.select-pop-btn');
                if (!btn) return;
                const id = btn.getAttribute('data-pop-id');
                const select = document.getElementById('target-population');
                if (select && id) {
                    select.value = id;
                    select.dispatchEvent(new Event('change'));
                    this.app?.showSuccess?.('Population selected');
                }
            });
        }
        
        // Population selection change
        const targetPopulation = document.getElementById('target-population');
        if (targetPopulation) {
            targetPopulation.addEventListener('change', () => {
                this.updateButtonStates();
                // Update refresh indicator on change
                try {
                    let indicator = document.getElementById('target-population-refresh-indicator');
                    if (!indicator) {
                        indicator = document.createElement('div');
                        indicator.id = 'target-population-refresh-indicator';
                        indicator.className = 'refresh-indicator';
                        indicator.style.display = 'inline-block';
                        indicator.style.fontSize = '0.85rem';
                        indicator.style.padding = '2px 6px';
                        const help = targetPopulation.closest('.form-group')?.querySelector('.form-help');
                        if (help && help.parentElement) help.parentElement.insertBefore(indicator, help.nextSibling);
                    }
                    const opt = targetPopulation.options[targetPopulation.selectedIndex];
                    const pop = opt && opt.dataset && opt.dataset.population ? JSON.parse(opt.dataset.population) : null;
                    const name = pop?.name || opt?.text || 'Population';
                    const count = pop?.userCount ?? pop?.users ?? '';
                    const isDefault = pop?.isDefault === true;
                    const now = new Date();
                    const time = now.toLocaleTimeString();
                    const date = now.toLocaleDateString();
                    indicator.textContent = `${name}${count ? ` (${count} users)` : ''}${isDefault ? ' — Default' : ''} · Loaded at ${time} on ${date}`;
                } catch (_) {}
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
        
        // Status Log Controls
        const clearStatusLog = document.getElementById('clear-status-log');
        const pauseStatusLog = document.getElementById('pause-status-log');
        const testStatusLog = document.getElementById('test-status-log');
        
        if (clearStatusLog) {
            clearStatusLog.addEventListener('click', this.clearStatusLog.bind(this));
        }
        
        if (pauseStatusLog) {
            pauseStatusLog.addEventListener('click', this.toggleStatusLogPause.bind(this));
        }
        
        if (testStatusLog) {
            testStatusLog.addEventListener('click', this.testStatusLog.bind(this));
        }
        
        // Progress Bar Test
        const testProgress = document.getElementById('test-progress');
        if (testProgress) {
            testProgress.addEventListener('click', () => {
                // Reset progress bar
                this.updateProgressBar(0, 10, 'Starting progress simulation...');
                
                // Start simulation with current speed setting
                setTimeout(() => {
                    this.simulateRealisticProgress(10);
                }, 500);
            });
        }
        
        // Import Behavior Selector
        const behaviorRadios = document.querySelectorAll('input[name="importBehavior"]');
        behaviorRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                // Log behavior change
                console.log(`🔄 Import behavior changed to: ${radio.value}`);
            });
        });
        
        // Import Mode Selector
        const modeRadios = document.querySelectorAll('input[name="importMode"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                // Update recommendation when mode changes
                this.updateModeRecommendation(this.selectedRecordCount || 0);
                
                // Log mode change
                console.log(`🔄 Import mode changed to: ${radio.value}`);
            });
        });
        
        // Smart Progress Event Listener
        if (window.io) {
            window.io.on('smart-progress', (data) => {
                console.log('📊 Smart progress event received:', data);
                this.handleProgressUpdate(data);
            });
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
        
        if (reqCsv) {
            reqCsv.disabled = false;
            reqCsv.checked = true;
        }
        if (reqSize) {
            reqSize.disabled = false;
            reqSize.checked = file.size <= 10 * 1024 * 1024;
        }
        if (reqRequired) {
            reqRequired.disabled = false;
            // Validate required columns exist in the file
            this.validateRequiredColumns(file).then(hasRequiredColumns => {
                reqRequired.checked = hasRequiredColumns;
            });
        }
        if (reqOptional) {
            reqOptional.disabled = false;
            // Check if optional columns exist
            this.checkOptionalColumns(file).then(hasOptionalColumns => {
                reqOptional.checked = hasOptionalColumns;
            });
        }
    }
    
    async validateRequiredColumns(file) {
        try {
            const text = await this.readFileAsText(file);
            const lines = text.split('\n');
            if (lines.length === 0) return false;
            
            const headerLine = lines[0].toLowerCase();
            const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
            
            const requiredColumns = ['email', 'username'];
            const hasRequiredColumns = requiredColumns.every(col => 
                headers.includes(col) || headers.includes(col.toLowerCase())
            );
            
            return hasRequiredColumns;
        } catch (error) {
            console.error('Error validating required columns:', error);
            return false;
        }
    }
    
    async checkOptionalColumns(file) {
        try {
            const text = await this.readFileAsText(file);
            const lines = text.split('\n');
            if (lines.length === 0) return false;
            
            const headerLine = lines[0].toLowerCase();
            const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
            
            const optionalColumns = ['name.given', 'name.family', 'givenname', 'familyname', 'firstname', 'lastname'];
            const hasOptionalColumns = optionalColumns.some(col => 
                headers.includes(col) || headers.includes(col.toLowerCase())
            );
            
            return hasOptionalColumns;
        } catch (error) {
            console.error('Error checking optional columns:', error);
            return false;
        }
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
            if (el) {
                el.checked = false;
                el.disabled = true;
            }
        });
    }
    
    async loadPopulations() {
        // Import the population loader service
        const { populationLoader } = await import('../services/population-loader.js');
        
        // Use the unified service to load populations
        await populationLoader.loadPopulations('target-population', {
            showRefreshed: true,
            onError: (error) => {
                console.error('❌ Error loading populations for import page:', error);
                this.app.showError('Failed to load populations: ' + error.message);
            },
            onSuccess: (populations) => {
                // Prefer server-provided default (auto-selected by population-loader)
                // If app has an explicit default and nothing is selected yet, apply it
                const select = document.getElementById('target-population');
                if (select) {
                    // Auto-select app default if none selected yet
                    if (!select.value && this.app.settings.pingone_population_id) {
                        select.value = this.app.settings.pingone_population_id;
                        select.dispatchEvent(new Event('change'));
                    }
                    // Update refresh indicator with current selection
                    let indicator = document.getElementById('target-population-refresh-indicator');
                    if (!indicator) {
                        indicator = document.createElement('div');
                        indicator.id = 'target-population-refresh-indicator';
                        indicator.className = 'refresh-indicator';
                        indicator.style.display = 'inline-block';
                        indicator.style.fontSize = '0.85rem';
                        indicator.style.padding = '2px 6px';
                        const help = select.closest('.form-group')?.querySelector('.form-help');
                        if (help && help.parentElement) help.parentElement.insertBefore(indicator, help.nextSibling);
                    }
                    try {
                        const opt = select.options[select.selectedIndex] || select.options[0];
                        const pop = opt && opt.dataset && opt.dataset.population ? JSON.parse(opt.dataset.population) : null;
                        const name = pop?.name || opt?.text || 'Population';
                        const count = pop?.userCount ?? pop?.users ?? '';
                        const isDefault = pop?.isDefault === true;
                        const now = new Date();
                        const time = now.toLocaleTimeString();
                        const date = now.toLocaleDateString();
                        indicator.textContent = `${name}${count ? ` (${count} users)` : ''}${isDefault ? ' — Default' : ''} · Loaded at ${time} on ${date}`;
                    } catch (_) { /* ignore */ }
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
                // Show a small confirmation modal with record count
                const count = Number(result.total || this.selectedRecordCount || 0);
                this.showSmallModal(`File valid, ${count} users`);
                // Turn Validate File button green to indicate success
                const validateBtn = document.getElementById('validate-file');
                if (validateBtn) {
                    validateBtn.classList.remove('btn-primary');
                    validateBtn.classList.add('btn-success');
                }
                // Very small modal popup with record count
                const total = Number(result?.total ?? result?.data?.total ?? this.selectedRecordCount ?? 0);
                this.showMiniValidateModal(`file valid, ${total} number of users`);
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
            
            // Initialize status log for this import
            this.initializeStatusLog();
            
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
            const importBehavior = document.querySelector('input[name="importBehavior"]:checked');
            const importMode = document.querySelector('input[name="importMode"]:checked');
            
            if (importBehavior) {
                formData.append('importBehavior', importBehavior.value);
            }
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
            
            // Get the effective import mode
            const effectiveMode = this.getEffectiveImportMode(this.selectedRecordCount || 0);
            console.log(`🎯 Using import mode: ${effectiveMode} for ${this.selectedRecordCount} records`);
            
            // Add mode to form data
            formData.append('importMode', effectiveMode);
            formData.append('enableRealTimeUpdates', effectiveMode === 'realtime');
            
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
        if (progressSection) {
            progressSection.style.display = 'block';
            
            // Initialize progress bar
            this.updateProgressBar(0, this.selectedRecordCount || 0, 'Import started...');
            
            // Show status log section
            const statusLogContainer = document.querySelector('.status-log-container');
            if (statusLogContainer) {
                statusLogContainer.style.display = 'block';
            }
            
            // Ensure progress section stays visible
            progressSection.style.visibility = 'visible';
            progressSection.style.opacity = '1';
            
            console.log('📊 Progress section displayed');
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
                const failed = payload.statistics?.errors ?? payload.failed ?? 0;
                const skipped = payload.statistics?.skipped ?? payload.skipped ?? 0;
                this.importStats = { processed, total, failed, skipped };
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

        // Summarize outcome prominently in status bar
        const failed = this.importStats?.failed ?? 0;
        const processed = this.importStats?.processed ?? 0;
        const total = this.importStats?.total ?? this.selectedRecordCount ?? 0;
        if (failed > 0) {
            this.app.showWarning(`Import completed with errors: ${failed} failed, ${processed} succeeded out of ${total}`);
        } else {
            this.app.showSuccess('Import completed successfully!');
        }
        
        // Show file upload section for new imports
        const fileUploadSection = document.querySelector('.import-section:first-child');
        if (fileUploadSection) {
            fileUploadSection.style.display = 'block';
        }
        
        // Record in history with proper status
        const status = failed > 0 ? 'warning' : 'success';
        this.app.addHistoryEntry('import', status, 'CSV import completed', processed, Math.floor(Math.random()*150000)+10000);
    }
    
    showResultsSection() {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) resultsSection.style.display = 'block';
        
        // Get actual import options for display
        const importBehavior = document.querySelector('input[name="importBehavior"]:checked');
        const importMode = document.querySelector('input[name="importMode"]:checked');
        const skipExistingUsername = document.getElementById('skip-existing-username');
        const skipExistingUserid = document.getElementById('skip-existing-userid');
        
        const importBehaviorText = importBehavior ? importBehavior.value : 'create';
        const importModeText = importMode ? importMode.value : 'auto';
        const skipOptions = [];
        if (skipExistingUsername && skipExistingUsername.checked) skipOptions.push('Username exists');
        if (skipExistingUserid && skipExistingUserid.checked) skipOptions.push('User ID exists');
        const skipOptionsText = skipOptions.length > 0 ? skipOptions.join(', ') : 'None';
        
        // Populate with runtime values
        const summary = document.getElementById('results-summary');
        const total = Number(document.getElementById('total-users')?.textContent || this.selectedRecordCount || 0);
        // Prefer live stats from polling if available
        const processed = this.importStats?.processed ?? Number(document.getElementById('users-processed')?.textContent || total);
        const failed = this.importStats?.failed ?? 0;
        const skipped = this.importStats?.skipped ?? 0;
        const success = Math.max(0, processed);
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
                            <li><strong>Import Behavior:</strong> ${importBehaviorText === 'create' ? 'Create new users only' : importBehaviorText === 'upsert' ? 'Create or update users' : 'Unknown'}</li>
                            <li><strong>Smart Import Mode:</strong> ${importModeText === 'auto' ? 'Auto (Recommended)' : importModeText === 'realtime' ? 'Real-time Updates' : importModeText === 'batch' ? 'Batch Summary Only' : 'Unknown'}</li>
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
            // Turn button green after successful download
            const btn = document.getElementById('download-log');
            if (btn) {
                btn.classList.remove('btn-danger');
                btn.classList.remove('btn-outline-info');
                btn.classList.add('btn-success');
            }
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

    // Show a tiny modal centered on screen, auto-dismiss after 2.5s
    showSmallModal(message = '') {
        try {
            const existing = document.getElementById('import-mini-modal');
            if (existing) existing.remove();
            const overlay = document.createElement('div');
            overlay.id = 'import-mini-modal';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-live', 'polite');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.right = '0';
            overlay.style.bottom = '0';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.background = 'rgba(0,0,0,0.15)';
            overlay.style.zIndex = '10000';
            const box = document.createElement('div');
            box.style.background = '#ffffff';
            box.style.border = '1px solid #e5e7eb';
            box.style.borderRadius = '8px';
            box.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
            box.style.padding = '12px 16px';
            box.style.fontSize = '14px';
            box.style.minWidth = '220px';
            box.style.textAlign = 'center';
            box.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:8px;">
                    <i class="mdi mdi-check-circle" style="color:#16a34a;"></i>
                    <strong>Validation</strong>
                </div>
                <div>${this.escapeHtml(message)}</div>
                <div style="margin-top:10px;display:flex;justify-content:center;">
                    <button type="button" id="import-mini-ok" class="btn btn-primary btn-sm">OK</button>
                </div>
            `;
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            const close = () => { try { overlay.remove(); } catch(_){} };
            document.getElementById('import-mini-ok')?.addEventListener('click', close);
            setTimeout(close, 2500);
        } catch (_) {}
    }

    // Minimal HTML escaper used by showSmallModal
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
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

    // Show a tiny non-blocking modal toast near top-center for validate success
    showMiniValidateModal(message, timeoutMs = 2200) {
        try {
            let modal = document.getElementById('mini-validate-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'mini-validate-modal';
                modal.style.position = 'fixed';
                modal.style.top = '16px';
                modal.style.left = '50%';
                modal.style.transform = 'translateX(-50%)';
                modal.style.zIndex = '9999';
                modal.style.pointerEvents = 'none';
                document.body.appendChild(modal);
            }
            modal.innerHTML = `
                <div style="display:inline-flex;align-items:center;gap:8px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;box-shadow:0 6px 20px rgba(0,0,0,0.12);font-weight:600;color:#111827;pointer-events:auto;">
                    <i class="mdi mdi-check-circle" style="color:#16a34a;"></i>
                    <span>${message}</span>
                </div>`;
            modal.style.display = 'block';
            clearTimeout(this._miniValidateTimer);
            this._miniValidateTimer = setTimeout(() => {
                modal.style.display = 'none';
            }, timeoutMs);
        } catch (_) { /* ignore */ }
    }
    
    // ============================================================================
    // Status Log Management
    // ============================================================================
    
    /**
     * Initialize the status log for a new import
     */
    initializeStatusLog() {
        // Clear any existing entries
        this.clearStatusLog();
        
        // Add initial import start entry
        this.addStatusLogEntry(
            'System', 
            'processing', 
            `Starting import of ${this.selectedRecordCount || 'unknown'} users...`,
            new Date().toLocaleTimeString()
        );
        
        // Reset pause state
        this.statusLogPaused = false;
        const pauseBtn = document.getElementById('pause-status-log');
        if (pauseBtn) {
            pauseBtn.innerHTML = '<i class="mdi mdi-pause"></i> Pause';
            pauseBtn.className = 'btn btn-sm btn-outline-warning';
            pauseBtn.title = 'Pause updates';
        }
    }
    
    /**
     * Add a new status log entry
     * @param {string} username - The username being processed
     * @param {string} status - Status of the operation (success, error, skipped, processing)
     * @param {string} message - Additional details about the operation
     * @param {string} timestamp - Timestamp of the operation
     */
    addStatusLogEntry(username, status, message, timestamp = null) {
        const statusLogContent = document.getElementById('status-log-content');
        if (!statusLogContent) return;
        
        // Remove placeholder if it exists
        const placeholder = statusLogContent.querySelector('.status-log-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        // Create timestamp if not provided
        const ts = timestamp || new Date().toLocaleTimeString();
        
        // Determine status icon and color
        const statusConfig = this.getStatusConfig(status);
        
        // Create log entry element
        const logEntry = document.createElement('div');
        logEntry.className = 'status-log-entry';
        logEntry.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 12px;
            margin: 4px 0;
            border-radius: 6px;
            background: ${statusConfig.background};
            border-left: 4px solid ${statusConfig.borderColor};
            font-size: 0.875rem;
            opacity: 0;
            transform: translateY(-10px);
            transition: opacity 0.3s ease-out, transform 0.3s ease-out;
        `;
        
        // Force a reflow to ensure the transition works
        logEntry.offsetHeight;
        
        // Animate in
        logEntry.style.opacity = '1';
        logEntry.style.transform = 'translateY(0)';
        
        logEntry.innerHTML = `
            <div class="status-icon" style="color: ${statusConfig.iconColor}; font-size: 1.1rem;">
                <i class="mdi ${statusConfig.icon}"></i>
            </div>
            <div class="status-content" style="flex: 1; min-width: 0;">
                <div class="status-username" style="font-weight: 600; color: #111827; margin-bottom: 2px;">
                    ${this.escapeHtml(username || 'Unknown User')}
                </div>
                <div class="status-message" style="color: #6b7280; font-size: 0.8rem;">
                    ${this.escapeHtml(message || '')}
                </div>
            </div>
            <div class="status-timestamp" style="color: #9ca3af; font-size: 0.75rem; white-space: nowrap;">
                ${ts}
            </div>
        `;
        
        // Add to the top of the log (newest first)
        statusLogContent.insertBefore(logEntry, statusLogContent.firstChild);
        
        // Update log count
        this.updateStatusLogCount();
        
        // Auto-scroll to top to show latest entry
        statusLogContent.scrollTop = 0;
        
        // Limit log entries to prevent memory issues (keep last 100)
        this.limitStatusLogEntries();
    }
    
    /**
     * Get status configuration for different operation states
     * @param {string} status - Status type
     * @returns {Object} Status configuration with colors and icons
     */
    getStatusConfig(status) {
        const configs = {
            'processing': {
                icon: 'mdi-clock-outline',
                iconColor: '#3b82f6',
                background: '#eff6ff',
                borderColor: '#3b82f6'
            },
            'success': {
                icon: 'mdi-check-circle',
                iconColor: '#10b981',
                background: '#ecfdf5',
                borderColor: '#10b981'
            },
            'error': {
                icon: 'mdi-alert-circle',
                iconColor: '#ef4444',
                background: '#fef2f2',
                borderColor: '#ef4444'
            },
            'skipped': {
                icon: 'mdi-skip-forward',
                iconColor: '#f59e0b',
                background: '#fffbeb',
                borderColor: '#f59e0b'
            },
            'warning': {
                icon: 'mdi-alert',
                iconColor: '#f59e0b',
                background: '#fffbeb',
                borderColor: '#f59e0b'
            }
        };
        
        return configs[status] || configs['processing'];
    }
    
    /**
     * Update the status log count display
     */
    updateStatusLogCount() {
        const countElement = document.getElementById('status-log-count');
        if (!countElement) return;
        
        const entries = document.querySelectorAll('.status-log-entry');
        countElement.textContent = entries.length;
    }
    
    /**
     * Limit the number of status log entries to prevent memory issues
     */
    limitStatusLogEntries() {
        const statusLogContent = document.getElementById('status-log-content');
        if (!statusLogContent) return;
        
        const entries = statusLogContent.querySelectorAll('.status-log-entry');
        const maxEntries = 100;
        
        if (entries.length > maxEntries) {
            // Remove oldest entries (they're at the bottom since we insert at top)
            for (let i = entries.length - 1; i >= maxEntries; i--) {
                entries[i].remove();
            }
            this.updateStatusLogCount();
        }
    }
    
    /**
     * Clear all status log entries
     */
    clearStatusLog() {
        const statusLogContent = document.getElementById('status-log-content');
        if (!statusLogContent) return;
        
        // Clear all entries
        statusLogContent.innerHTML = `
            <div class="status-log-placeholder" style="text-align: center; color: #9ca3af; font-style: italic; padding: 20px;">
                <i class="mdi mdi-clock-outline" style="font-size: 2rem; display: block; margin-bottom: 8px;"></i>
                Status log cleared
            </div>
        `;
        
        // Reset count
        this.updateStatusLogCount();
    }
    
    /**
     * Toggle pause state of status log updates
     */
    toggleStatusLogPause() {
        const pauseBtn = document.getElementById('pause-status-log');
        if (!pauseBtn) return;
        
        this.statusLogPaused = !this.statusLogPaused;
        
        if (this.statusLogPaused) {
            pauseBtn.innerHTML = '<i class="mdi mdi-play"></i> Resume';
            pauseBtn.className = 'btn btn-sm btn-outline-success';
            pauseBtn.title = 'Resume updates';
        } else {
            pauseBtn.innerHTML = '<i class="mdi mdi-pause"></i> Pause';
            pauseBtn.className = 'btn btn-sm btn-outline-warning';
            pauseBtn.title = 'Pause updates';
        }
    }
    
    /**
     * Add status log entry only if not paused
     */
    addStatusLogEntryIfNotPaused(username, status, message, timestamp) {
        if (!this.statusLogPaused) {
            this.addStatusLogEntry(username, status, message, timestamp);
        }
    }
    
    /**
     * Test method to simulate status log updates (for testing purposes)
     */
    testStatusLog() {
        console.log('🧪 Testing status log functionality...');
        
        // Initialize the log
        this.initializeStatusLog();
        
        // Simulate some user processing
        setTimeout(() => {
            this.addStatusLogEntry('john.doe@example.com', 'processing', 'Creating user in PingOne...');
        }, 1000);
        
        setTimeout(() => {
            this.addStatusLogEntry('john.doe@example.com', 'success', 'User created successfully');
        }, 2000);
        
        setTimeout(() => {
            this.addStatusLogEntry('jane.smith@example.com', 'processing', 'Creating user in PingOne...');
        }, 3000);
        
        setTimeout(() => {
            this.addStatusLogEntry('jane.smith@example.com', 'error', 'Email already exists in system');
        }, 4000);
        
        setTimeout(() => {
            this.addStatusLogEntry('bob.wilson@example.com', 'processing', 'Creating user in PingOne...');
        }, 5000);
        
        setTimeout(() => {
            this.addStatusLogEntry('bob.wilson@example.com', 'skipped', 'User already exists, skipping...');
        }, 6000);
        
        setTimeout(() => {
            this.addStatusLogEntry('System', 'success', 'Import completed! 1 created, 1 error, 1 skipped');
        }, 7000);
    }
    
    // ============================================================================
    // Progress Bar Management
    // ============================================================================
    
    /**
     * Get the current progress speed setting
     * @returns {string} Progress speed setting
     */
    getProgressSpeed() {
        const speedSelect = document.getElementById('progress-speed');
        return speedSelect ? speedSelect.value : 'medium';
    }
    
    /**
     * Get progress update delay based on speed setting
     * @returns {number} Delay in milliseconds
     */
    getProgressUpdateDelay() {
        const speed = this.getProgressSpeed();
        const delays = {
            'slow': 2000,      // 2 seconds - realistic speed
            'medium': 1000,    // 1 second - balanced
            'fast': 300        // 0.3 seconds - quick preview
        };
        return delays[speed] || delays.medium;
    }
    
    /**
     * Update progress bar with smooth animation
     * @param {number} current - Current progress value
     * @param {number} total - Total value
     * @param {string} message - Status message
     */
    updateProgressBar(current, total, message = '') {
        if (total === 0) return;
        
        const percentage = Math.round((current / total) * 100);
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-percentage');
        const beerFill = document.getElementById('beer-fill-import');
        const beerFoam = document.getElementById('beer-foam-import');
        
        if (!progressFill || !progressText) return;
        
        // Get current progress speed
        const speed = this.getProgressSpeed();
        
        // Calculate target width
        const targetWidth = `${percentage}%`;
        
        // Get current width
        const currentWidth = progressFill.style.width || '0%';
        const currentPercent = parseInt(currentWidth) || 0;
        
        // Only update if there's a meaningful change
        if (Math.abs(percentage - currentPercent) < 1) return;
        
        // Smooth animation based on speed
        const animationDuration = this.getProgressUpdateDelay();
        
        // Update progress bar with smooth transition
        progressFill.style.transition = `width ${animationDuration}ms ease-in-out`;
        progressFill.style.width = targetWidth;
        
        // Update percentage text
        progressText.textContent = `${percentage}%`;
        
        // Update beer mug fill (proportional to progress)
        if (beerFill && beerFoam) {
            const beerHeight = Math.max(0, Math.min(18, (percentage / 100) * 18));
            beerFill.style.height = `${beerHeight}`;
            beerFoam.style.height = `${Math.max(0.001, beerHeight * 0.1)}`;
        }
        
        // Update status message if provided
        if (message) {
            const statusMessage = document.getElementById('import-status-message');
            if (statusMessage) {
                statusMessage.textContent = message;
            }
        }
        
        // Log progress update
        console.log(`📊 Progress: ${current}/${total} (${percentage}%) - Speed: ${speed}`);
    }
    
    /**
     * Simulate realistic progress updates for testing
     * @param {number} totalUsers - Total number of users to simulate
     */
    simulateRealisticProgress(totalUsers = 10) {
        console.log('🧪 Simulating realistic progress updates...');
        
        let current = 0;
        const interval = setInterval(() => {
            current++;
            
            if (current > totalUsers) {
                clearInterval(interval);
                this.updateProgressBar(totalUsers, totalUsers, 'Simulation completed!');
                return;
            }
            
            // Simulate different processing times
            const processingTime = Math.random() * 2000 + 500; // 0.5 to 2.5 seconds
            
            // Update progress bar
            this.updateProgressBar(current, totalUsers, `Processing user ${current} of ${totalUsers}...`);
            
            // Add status log entry
            this.addStatusLogEntry(
                `user${current}@example.com`, 
                'processing', 
                `Simulating user creation (${processingTime.toFixed(0)}ms)`
            );
            
            // Simulate completion after processing time
            setTimeout(() => {
                this.addStatusLogEntry(
                    `user${current}@example.com`, 
                    'success', 
                    'User created successfully'
                );
            }, processingTime);
            
        }, this.getProgressUpdateDelay());
    }
    
    // ============================================================================
    // Import Behavior Management
    // ============================================================================
    
    /**
     * Get the current import behavior setting
     * @returns {string} Import behavior (create, upsert)
     */
    getImportBehavior() {
        const selectedBehavior = document.querySelector('input[name="importBehavior"]:checked');
        return selectedBehavior ? selectedBehavior.value : 'create';
    }
    
    // ============================================================================
    // Smart Import Mode Management
    // ============================================================================
    
    /**
     * Get the current import mode setting
     * @returns {string} Import mode (auto, realtime, batch)
     */
    getImportMode() {
        const selectedMode = document.querySelector('input[name="importMode"]:checked');
        return selectedMode ? selectedMode.value : 'auto';
    }
    
    /**
     * Determine the effective import mode based on record count and user selection
     * @param {number} recordCount - Number of records to import
     * @returns {string} Effective mode (realtime or batch)
     */
    getEffectiveImportMode(recordCount) {
        const userMode = this.getImportMode();
        
        if (userMode === 'realtime') return 'realtime';
        if (userMode === 'batch') return 'batch';
        
        // Auto mode logic
        if (recordCount <= 100) {
            return 'realtime'; // Small imports get real-time updates
        } else if (recordCount <= 1000) {
            return 'realtime'; // Medium imports get real-time updates
        } else {
            return 'batch'; // Large imports get batch summary only
        }
    }
    
    /**
     * Update the mode recommendation based on record count
     * @param {number} recordCount - Number of records to import
     */
    updateModeRecommendation(recordCount) {
        const recommendationText = document.getElementById('recommendation-text');
        const modeBadge = document.getElementById('current-mode-badge');
        
        if (!recommendationText || !modeBadge) return;
        
        const effectiveMode = this.getEffectiveImportMode(recordCount);
        const userMode = this.getImportMode();
        
        let recommendation = '';
        let badgeText = '';
        let badgeColor = '';
        
        if (userMode === 'auto') {
            if (effectiveMode === 'realtime') {
                recommendation = `Auto mode recommends real-time updates for ${recordCount} records (≤1000 records)`;
                badgeText = 'Auto → Real-time';
                badgeColor = '#10b981'; // Green
            } else {
                recommendation = `Auto mode recommends batch summary for ${recordCount} records (>1000 records)`;
                badgeText = 'Auto → Batch';
                badgeColor = '#f59e0b'; // Orange
            }
        } else if (userMode === 'realtime') {
            recommendation = `Manual mode: Real-time updates enabled for ${recordCount} records`;
            badgeText = 'Real-time';
            badgeColor = '#3b82f6'; // Blue
        } else {
            recommendation = `Manual mode: Batch summary enabled for ${recordCount} records`;
            badgeText = 'Batch';
            badgeColor = '#8b5cf6'; // Purple
        }
        
        recommendationText.textContent = recommendation;
        modeBadge.textContent = badgeText;
        modeBadge.style.background = badgeColor;
        
        console.log(`🎯 Import mode: ${userMode} → ${effectiveMode} for ${recordCount} records`);
    }
    
    /**
     * Handle file selection and update mode recommendation
     * @param {File} file - Selected file
     */
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
        
        // Update mode recommendation based on file size/record count
        this.updateModeRecommendation(this.selectedRecordCount || 0);
    }

    // ============================================================================
    // Real-time vs Batch Progress Handling
    // ============================================================================

    /**
     * Handle progress update based on import mode
     * @param {Object} progressData - Progress data from backend
     */
    handleProgressUpdate(progressData) {
        const { processed, total, stats, mode, message } = progressData;
        const effectiveMode = this.getEffectiveImportMode(total);
        
        if (effectiveMode === 'realtime') {
            this.handleRealTimeProgress(progressData);
        } else {
            this.handleBatchProgress(progressData);
        }
    }

    /**
     * Handle real-time progress updates (individual user processing)
     * @param {Object} progressData - Progress data from backend
     */
    handleRealTimeProgress(progressData) {
        const { processed, total, username, status, message, timestamp } = progressData;
        
        // Update progress bar smoothly
        this.updateProgressBar(processed, total, message);
        
        // Add detailed status log entry
        if (username && status) {
            this.addStatusLogEntry(username, status, message, timestamp);
        }
        
        // Update counters in real-time
        this.updateProgressCounters(progressData);
    }

    /**
     * Handle batch progress updates (summary only)
     * @param {Object} progressData - Progress data from backend
     */
    handleBatchProgress(progressData) {
        const { processed, total, batchSize, stats, message } = progressData;
        
        // Update progress bar in larger chunks
        this.updateProgressBar(processed, total, message);
        
        // Only log batch summaries, not individual users
        if (processed % batchSize === 0 || processed === total) {
            this.addStatusLogEntry(
                'System', 
                'processing', 
                `Batch processed: ${processed}/${total} users (${Math.round((processed/total)*100)}%)`
            );
        }
        
        // Update counters
        this.updateProgressCounters(progressData);
    }

    /**
     * Update progress counters based on import mode
     * @param {Object} progressData - Progress data from backend
     */
    updateProgressCounters(progressData) {
        const { processed, total, stats } = progressData;
        const effectiveMode = this.getEffectiveImportMode(total);
        
        // Update basic counters
        const processedEl = document.getElementById('users-processed');
        if (processedEl) processedEl.textContent = processed;
        
        const totalEl = document.getElementById('total-users');
        if (totalEl) totalEl.textContent = total;
        
        // Update detailed stats if available
        if (stats) {
            const createdEl = document.getElementById('created-users');
            const skippedEl = document.getElementById('skipped-users');
            const failedEl = document.getElementById('failed-users');
            const successRateEl = document.getElementById('success-rate');
            
            if (createdEl && stats.created !== undefined) createdEl.textContent = stats.created;
            if (skippedEl && stats.skipped !== undefined) skippedEl.textContent = stats.skipped;
            if (failedEl && stats.failed !== undefined) failedEl.textContent = stats.failed;
            
            if (successRateEl && processed > 0) {
                const successRate = Math.round((stats.created / processed) * 100);
                successRateEl.textContent = `${successRate}%`;
                successRateEl.className = successRate >= 80 ? 'text-success' : 
                                        successRate >= 60 ? 'text-warning' : 'text-danger';
            }
        }
        
        // Show different UI based on mode
        if (effectiveMode === 'batch') {
            this.showBatchModeUI(progressData);
        } else {
            this.showRealTimeModeUI(progressData);
        }
    }

    /**
     * Show batch mode UI elements
     * @param {Object} progressData - Progress data from backend
     */
    showBatchModeUI(progressData) {
        // Hide detailed status log for batch mode
        const statusLogContainer = document.querySelector('.status-log-container');
        if (statusLogContainer) {
            statusLogContainer.style.opacity = '0.6';
        }
        
        // Show batch summary message
        const batchMessage = document.getElementById('batch-summary-message');
        if (!batchMessage) {
            const messageEl = document.createElement('div');
            messageEl.id = 'batch-summary-message';
            messageEl.style.cssText = `
                padding: 12px; 
                background: #fef3c7; 
                border: 1px solid #f59e0b; 
                border-radius: 6px; 
                margin: 12px 0; 
                color: #92400e;
                font-size: 0.875rem;
            `;
            messageEl.innerHTML = `
                <i class="mdi mdi-information" style="margin-right: 6px;"></i>
                <strong>Batch Mode:</strong> Large import detected. Showing summary updates only. 
                Check the status log for detailed information after completion.
            `;
            
            const progressSection = document.getElementById('progress-section');
            if (progressSection) {
                progressSection.insertBefore(messageEl, progressSection.querySelector('.status-log-container'));
            }
        }
    }

    /**
     * Show real-time mode UI elements
     * @param {Object} progressData - Progress data from backend
     */
    showRealTimeModeUI(progressData) {
        // Show detailed status log for real-time mode
        const statusLogContainer = document.querySelector('.status-log-container');
        if (statusLogContainer) {
            statusLogContainer.style.opacity = '1';
        }
        
        // Remove batch summary message if it exists
        const batchMessage = document.getElementById('batch-summary-message');
        if (batchMessage) {
            batchMessage.remove();
        }
    }
}