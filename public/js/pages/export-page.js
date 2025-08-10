/**
 * Export Page Module
 * Handles user export functionality from PingOne populations
 */

export class ExportPage {
    constructor(app) {
        this.app = app;
        this.selectedPopulation = null;
        this.lastTokenValidity = null; // Track token validity changes
        this.exportInterval = null; // Track export progress interval
        this.exportOptions = {
            format: 'csv',
            profile: 'none',
            includeHeaders: true,
            includeDisabledUsers: false,
            attributes: []
        };
    }

    // Read the first line of a CSV file to extract headers
    readCsvHeaders(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = String(e.target.result || '');
                    const firstLine = text.split(/\r?\n/).find(l => l.trim()) || '';
                    const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                    resolve(headers.filter(Boolean));
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // Render dynamic attribute checkboxes from headers
    renderDynamicAttributes(headers) {
        const container = document.getElementById('attributes-selection');
        if (!container) return;

        // Normalize
        const normalized = Array.from(new Set(headers.map(h => h.trim()).filter(Boolean)));
        const preferred = [
            { id: 'attr-username', label: 'Username (Required)', disabled: true, checked: true, match: ['username','userName','login','Username','User Name'] },
            { id: 'attr-email', label: 'Email', checked: true, match: ['email','Email','E-mail'] }
        ];

        // Build items: preferred first (if present), then all remaining headers
        const items = [];
        const used = new Set();
        for (const pref of preferred) {
            const hit = normalized.find(h => pref.match.some(m => m.toLowerCase() === h.toLowerCase()));
            if (hit) { items.push({ id: pref.id, label: pref.label, disabled: !!pref.disabled, checked: !!pref.checked }); used.add(hit); }
        }
        for (const h of normalized) {
            if (used.has(h)) continue;
            const safeId = 'attr-' + h.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            items.push({ id: safeId, label: h, disabled: false, checked: true });
        }

        container.innerHTML = items.map(it => `
            <div class="form-check">
                <input type="checkbox" id="${it.id}" class="form-check-input" ${it.checked ? 'checked' : ''} ${it.disabled ? 'disabled' : ''}>
                <label for="${it.id}" class="form-check-label">${it.label}</label>
            </div>
        `).join('');
    }

    // Bind change listeners after dynamic render
    bindAttributeSelectionHandlers() {
        document.querySelectorAll('#attributes-selection input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => this.updateExportOptions());
        });
    }

    async load() {
        console.log('📄 Loading Export page...');
        
        const content = `
            <div class="page-header">
                <h1>Export Users</h1>
                <p>Download user data from PingOne populations</p>
            </div>
            <div class="export-container">
                <!-- Population Selection -->
                <section class="export-section">
                    <div class="export-box">
                        <h3 class="section-title">Select Population</h3>
                        <p>Choose the population to export users from</p>
                        
                        <div class="config-grid">
                            <div class="form-group">
                                <label for="export-population-select">Population *</label>
                                <div class="input-group">
                                    <select id="export-population-select" class="form-control" required style="height:44px; min-height:44px; line-height:44px; min-width:220px; max-width:300px; padding-top:8px; padding-bottom:8px;">
                                        <option value="">Select a population...</option>
                                    </select>
                                    <button type="button" id="refresh-populations" class="btn btn-outline-secondary" title="Refresh populations" aria-label="Refresh populations" style="height:44px; min-height:44px; line-height:44px;">
                                        <i class="mdi mdi-refresh" style="color:#1565c0;"></i>
                                    </button>
                                </div>
                                <div class="form-help">Select the population containing the users you want to export</div>
                            </div>
                        </div>
                        
                        <div id="population-info" class="info-grid" style="display: none;">
                            <div class="info-item">
                                <span class="label">Population Name:</span>
                                <span id="population-name" class="value">-</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Total Users:</span>
                                <span id="population-user-count" class="value">-</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Description:</span>
                                <span id="population-description" class="value">-</span>
                            </div>
                        </div>
                    </div>
                </section>
                
                <!-- Export Options -->
                <section class="export-section">
                    <div class="export-box">
                        <h3 class="section-title">Export Options</h3>
                        <p>Configure export settings and data format</p>
                        <div class="config-grid">
                            <div class="form-group">
                                <label for="export-format">Export Format</label>
                                <select id="export-format" class="form-control" style="height:44px; min-height:44px; line-height:44px; min-width:220px; max-width:320px; padding-top:8px; padding-bottom:8px;">
                                    <option value="csv">CSV (Comma Separated Values)</option>
                                    <option value="json">JSON (JavaScript Object Notation)</option>
                                     <option value="ndjson">NDJSON (JSON Lines)</option>
                                    <option value="xlsx">Excel (XLSX)</option>
                                     <option value="xml">XML</option>
                                     <option value="ldif">LDIF</option>
                                     <option value="scim">SCIM 2.0 Bulk JSON</option>
                                </select>
                            </div>
                             <div class="form-group">
                                 <label for="export-profile">Export Preset</label>
                                 <select id="export-profile" class="form-control" style="height:44px; min-height:44px; line-height:44px; min-width:220px; max-width:320px; padding-top:8px; padding-bottom:8px;">
                                     <option value="none">None (default)</option>
                                     <option value="pingone">PingOne re-import template</option>
                                     <option value="ad">AD/LDAP-friendly (sAMAccountName, DN)</option>
                                     <option value="okta">Okta/AzureAD-style headers</option>
                                     <option value="siem">SIEM profile (flattened)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="export-encoding">Character Encoding</label>
                                <select id="export-encoding" class="form-control" style="height:44px; min-height:44px; line-height:44px; min-width:220px; max-width:320px; padding-top:8px; padding-bottom:8px;">
                                    <option value="utf-8">UTF-8 (Recommended)</option>
                                    <option value="utf-16">UTF-16</option>
                                    <option value="ascii">ASCII</option>
                                </select>
                            </div>
                        </div>

                        <div class="options-group">
                            <h4>Export Options</h4>
                            <div class="mb-2" style="display:flex; gap:12px; align-items:center;">
                                <div class="form-check">
                                    <input type="checkbox" id="options-select-all" class="form-check-input">
                                    <label for="options-select-all" class="form-check-label">Select All</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="options-unselect-all" class="form-check-input">
                                    <label for="options-unselect-all" class="form-check-label">Unselect All</label>
                                </div>
                            </div>
                            <div class="checkbox-grid">
                                <div class="form-check">
                                    <input type="checkbox" id="include-headers" class="form-check-input" checked>
                                    <label for="include-headers" class="form-check-label">Include column headers</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="include-disabled" class="form-check-input">
                                    <label for="include-disabled" class="form-check-label">Include disabled users</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="include-metadata" class="form-check-input">
                                    <label for="include-metadata" class="form-check-label">Include metadata (created date, last updated, etc.)</label>
                                </div>
                            </div>
                        </div>

                        <div class="attributes-group shaded">
                            <div class="attributes-header" style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px;">
                                <h4 style="margin:0;">User Attributes to Export</h4>
                                </div>
                            <div class="attr-tools" style="display:flex; gap:8px; align-items:center; margin: 6px 0 10px 0;">
                                <button type="button" id="load-attr-schema" class="btn btn-danger btn-sm" title="Load fields from PingOne SCIM schema">
                                    <i class="mdi mdi-database-search"></i> Load From PingOne
                                </button>
                                </div>
                            <div class="mb-2" style="display:flex; gap:12px; align-items:center;">
                                <div class="form-check">
                                    <input type="checkbox" id="attrs-select-all" class="form-check-input">
                                    <label for="attrs-select-all" class="form-check-label">Select All</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="attrs-unselect-all" class="form-check-input">
                                    <label for="attrs-unselect-all" class="form-check-label">Unselect All</label>
                                </div>
                                </div>
                            <div id="attributes-selection" class="attributes-grid"></div>
                        </div>
                    </div>
                </section>

                <!-- Export Actions Section -->
                <section class="export-section">
                    <div class="export-box">
                        <div class="export-actions">
                            <button type="button" id="start-export" class="btn btn-primary" disabled>
                                <i class="mdi mdi-download"></i> Start Export
                            </button>
                            <button type="button" id="preview-export" class="btn btn-outline-info">
                                <i class="mdi mdi-eye"></i> Preview Export
                            </button>
                        </div>
                    </div>
                </section>

                <!-- Export Progress -->
                <section id="export-progress" class="export-section" style="display: none;">
                    <div class="export-box">
                        <h3 class="section-title">Export Progress</h3>
                        <p>Exporting users from your PingOne environment</p>
                        
                        <div class="progress-container">
                            <div id="export-progress-text-left" class="progress-text">0%</div>
                            <div class="progress-bar">
                                <div id="export-progress-bar" class="progress-fill" style="width: 0%;"></div>
                            </div>
                            <!-- Animated beer mug icon that fills with progress -->
                            <svg id="beer-mug-svg" class="beer-mug" width="56" height="56" viewBox="0 0 36 36" aria-label="Beer mug progress icon" focusable="false">
                                <defs>
                                    <clipPath id="beer-clip">
                                        <!-- Inner mug shape used to clip the fill -->
                                        <path d="M9 8 h16 a2 2 0 0 1 2 2 v18 a2 2 0 0 1-2 2 h-16 a2 2 0 0 1-2-2 v-18 a2 2 0 0 1 2-2 z" />
                                    </clipPath>
                                </defs>
                                <!-- Mug outline -->
                                <path d="M9 8 h16 a2 2 0 0 1 2 2 v18 a2 2 0 0 1-2 2 h-16 a2 2 0 0 1-2-2 v-18 a2 2 0 0 1 2-2 z"
                                      fill="none" stroke="#1f2937" stroke-width="1.5"/>
                                <!-- Handle -->
                                <path d="M27 12 h2 a3 3 0 0 1 3 3 v6 a3 3 0 0 1-3 3 h-2" fill="none" stroke="#1f2937" stroke-width="1.5"/>
                                <!-- Beer fill rectangle (position updated by JS) -->
                                <rect id="beer-fill" x="9" y="26" width="16" height="0" fill="#f59e0b" clip-path="url(#beer-clip)"/>
                                <!-- Foam cap sits on top of beer fill (position updated by JS) -->
                                <rect id="beer-foam" x="9" y="26" width="16" height="3" fill="#ffffff" opacity="0.95" clip-path="url(#beer-clip)"/>
                            </svg>
                            <div id="export-progress-text" class="progress-text">0%</div>
                        </div>
                        
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="label">Status:</span>
                                <span id="export-status" class="value">Preparing export...</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Users Processed:</span>
                                <span id="users-processed" class="value">0</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Total Users:</span>
                                <span id="total-users" class="value">0</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Estimated Time:</span>
                                <span id="estimated-time" class="value">Calculating...</span>
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button type="button" id="cancel-export" class="btn btn-danger" style="display: none;">
                                <i class="mdi mdi-close"></i> Cancel Export
                            </button>
                        </div>
                    </div>
                </section>
                
                <!-- Results Section -->
                <section class="export-section" id="export-results" style="display: none;">
                    <div class="export-box">
                        <h3 class="section-title">Export Complete</h3>
                        <p>Your export has been completed successfully</p>

                        <!-- Consistent summary block -->
                        <div id="export-summary" class="results-container" style="margin-bottom: 16px;"></div>
                        
                        <div class="export-actions">
                            <button type="button" id="download-export" class="btn btn-success">
                                <i class="mdi mdi-download"></i> Download Export File
                            </button>
                            <button type="button" id="new-export" class="btn btn-outline-primary">
                                <i class="mdi mdi-refresh"></i> Start New Export
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        `;

        const exportPage = document.getElementById('export-page');
        console.log('📝 Export page element found:', !!exportPage);
        if (exportPage) {
            exportPage.innerHTML = content;
            console.log('📝 Content set, setting up event listeners...');
            await this.setupEventListeners();
            console.log('📝 Event listeners set up, loading populations...');
            await this.loadPopulations();
            console.log('📝 Populations loading completed');
        } else {
            console.error('❌ Export page element not found!');
        }
    }

    async setupEventListeners() {
        // Population selection
        const populationSelect = document.getElementById('export-population-select');
        if (populationSelect) {
            populationSelect.addEventListener('change', (e) => this.handlePopulationChange(e.target.value));
        }

        // Refresh populations button
        const refreshPopulationsBtn = document.getElementById('refresh-populations');
        if (refreshPopulationsBtn) {
            refreshPopulationsBtn.addEventListener('click', async () => {
                const { populationLoader } = await import('../services/population-loader.js');
                populationLoader.clearCache();
                // Yellow status while refreshing
                this.app?.showWarning?.('Refreshing populations…');
                await this.loadPopulations();
                this.app?.showSuccess?.('Populations refreshed');
            });
        }

        // Export format change
        const exportFormat = document.getElementById('export-format');
        if (exportFormat) {
            exportFormat.addEventListener('change', (e) => this.handleFormatChange(e.target.value));
        }

        // Export profile change
        const exportProfile = document.getElementById('export-profile');
        if (exportProfile) {
            exportProfile.addEventListener('change', (e) => {
                this.exportOptions.profile = e.target.value || 'none';
                // Refresh options dependent UI if needed
                this.updateExportOptions();
            });
        }

        // Export options
        const includeHeaders = document.getElementById('include-headers');
        const includeDisabled = document.getElementById('include-disabled');
        const includeMetadata = document.getElementById('include-metadata');
        
        if (includeHeaders) includeHeaders.addEventListener('change', () => this.updateExportOptions());
        if (includeDisabled) includeDisabled.addEventListener('change', () => this.updateExportOptions());
        if (includeMetadata) includeMetadata.addEventListener('change', () => this.updateExportOptions());

        // Select All / Unselect All for options
        const optionIds = ['include-headers','include-disabled','include-metadata'];
        const toggleGroup = (ids, checked) => ids.forEach(id => { const el = document.getElementById(id); if (el) el.checked = checked; });
        const optionsSelectAll = document.getElementById('options-select-all');
        const optionsUnselectAll = document.getElementById('options-unselect-all');
        if (optionsSelectAll) optionsSelectAll.addEventListener('change', (e) => { if (e.target.checked) { toggleGroup(optionIds, true); if (optionsUnselectAll) optionsUnselectAll.checked = false; this.updateExportOptions(); } });
        if (optionsUnselectAll) optionsUnselectAll.addEventListener('change', (e) => { if (e.target.checked) { toggleGroup(optionIds, false); if (optionsSelectAll) optionsSelectAll.checked = false; this.updateExportOptions(); } });

        // Attribute selection
        this.bindAttributeSelectionHandlers();

        // Select All / Unselect All for attributes (exclude required username)
        const attrsSelectAll = document.getElementById('attrs-select-all');
        const attrsUnselectAll = document.getElementById('attrs-unselect-all');
        if (attrsSelectAll) attrsSelectAll.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.querySelectorAll('#attributes-selection input[type="checkbox"]:not(#attr-username)')
                    .forEach(cb => { cb.checked = true; });
                if (attrsUnselectAll) attrsUnselectAll.checked = false;
                this.updateExportOptions();
            }
        });
        if (attrsUnselectAll) attrsUnselectAll.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.querySelectorAll('#attributes-selection input[type="checkbox"]:not(#attr-username)')
                    .forEach(cb => { cb.checked = false; });
                if (attrsSelectAll) attrsSelectAll.checked = false;
                this.updateExportOptions();
            }
        });

        // Dynamic: load attributes from PingOne SCIM schema
        const loadSchemaBtn = document.getElementById('load-attr-schema');
        if (loadSchemaBtn) {
            loadSchemaBtn.addEventListener('click', async () => {
                try {
                    this.app?.showWarning?.('Loading attributes from PingOne…');
                    const resp = await fetch('/api/user-schema', { cache: 'no-store' });
                    let headers = [];
                    if (resp.ok) {
                        const json = await resp.json().catch(() => ({}));
                        const payload = json && (json.data || json.message || json);
                        headers = payload?.headers || payload?.items || [];
                    }
                    if (!Array.isArray(headers) || headers.length === 0) {
                        // Fallback minimal set so user can proceed
                        headers = ['username','emails.value','name.given','name.family','enabled','status'];
                        this.app?.showWarning?.('Using default attribute list (schema not available)');
                    }
                    this.renderDynamicAttributes(headers);
                    this.bindAttributeSelectionHandlers();
                    this.app?.showSuccess?.(`Loaded ${headers.length} attributes`);
                } catch (err) {
                    console.error('Failed to load attributes from PingOne:', err);
                    const fallback = ['username','emails.value','name.given','name.family','enabled','status'];
                    this.renderDynamicAttributes(fallback);
                    this.bindAttributeSelectionHandlers();
                    this.app?.showWarning?.('Loaded default attributes (schema request failed)');
                }
            });
        }

        // Action buttons
        const previewBtn = document.getElementById('preview-export');
        const startBtn = document.getElementById('start-export');
        const downloadBtn = document.getElementById('download-export');
        const newExportBtn = document.getElementById('new-export');
        const cancelBtn = document.getElementById('cancel-export');

        console.log('🔍 Setting up export page event listeners:');
        console.log('  - Preview button:', !!previewBtn);
        console.log('  - Start button:', !!startBtn);
        console.log('  - Download button:', !!downloadBtn);
        console.log('  - New export button:', !!newExportBtn);
        console.log('  - Cancel button:', !!cancelBtn);

        if (previewBtn) previewBtn.addEventListener('click', () => this.handlePreviewExport());
        if (startBtn) startBtn.addEventListener('click', () => this.handleStartExport());
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                console.log('📥 Download button clicked!');
                this.handleDownloadExport();
            });
        } else {
            console.warn('⚠️ Download button not found during initial setup');
        }
        if (newExportBtn) newExportBtn.addEventListener('click', () => this.handleNewExport());
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                console.log('❌ Cancel export button clicked!');
                this.handleCancelExport();
            });
        } else {
            console.warn('⚠️ Cancel button not found during initial setup');
        }
    }

    async loadPopulations() {
        // Import the population loader service
        const { populationLoader } = await import('../services/population-loader.js');
        
        // Use the unified service to load populations
        await populationLoader.loadPopulations('export-population-select', {
            onError: (error) => {
                this.app.showNotification('Failed to load populations: ' + error.message, 'error');
            }
        });
    }

    handlePopulationChange(populationId) {
        const populationSelect = document.getElementById('export-population-select');
        const populationInfo = document.getElementById('population-info');
        const previewBtn = document.getElementById('preview-export');
        const startBtn = document.getElementById('start-export');

        if (!populationId) {
            if (populationInfo) populationInfo.style.display = 'none';
            if (previewBtn) previewBtn.disabled = true;
            if (startBtn) startBtn.disabled = true;
            this.selectedPopulation = null;
            return;
        }

        // Get population data from selected option
        const selectedOption = populationSelect.querySelector(`option[value="${populationId}"]`);
        if (selectedOption && selectedOption.dataset.population) {
            this.selectedPopulation = JSON.parse(selectedOption.dataset.population);
            
            // Update population info display with correct element IDs
            if (populationInfo) {
                const populationName = document.getElementById('population-name');
                const populationUserCount = document.getElementById('population-user-count');
                const populationDescription = document.getElementById('population-description');
                
                if (populationName) populationName.textContent = this.selectedPopulation.name || '-';
                if (populationUserCount) populationUserCount.textContent = this.selectedPopulation.userCount || '0';
                if (populationDescription) populationDescription.textContent = this.selectedPopulation.description || 'No description';
                
                populationInfo.style.display = 'block';
            }

            // Enable action buttons
            if (previewBtn) previewBtn.disabled = false;
            if (startBtn) startBtn.disabled = false;
        }
    }

    handleFormatChange(format) {
        this.exportOptions.format = format;
        console.log('Export format changed to:', format);
    }

    updateExportOptions() {
        // Update export options based on form inputs
        const includeHeaders = document.getElementById('include-headers');
        const includeDisabled = document.getElementById('include-disabled');
        const includeMetadata = document.getElementById('include-metadata');

        this.exportOptions.includeHeaders = includeHeaders?.checked || false;
        this.exportOptions.includeDisabledUsers = includeDisabled?.checked || false;
        this.exportOptions.includeMetadata = includeMetadata?.checked || false;

        // Update selected attributes
        const attributeCheckboxes = document.querySelectorAll('#attributes-selection input[type="checkbox"]:checked');
        this.exportOptions.attributes = Array.from(attributeCheckboxes).map(cb => cb.id.replace('attr-', ''));

        console.log('Export options updated:', this.exportOptions);
    }

    async handlePreviewExport() {
        if (!this.selectedPopulation) {
            this.app.showNotification('Please select a population first', 'warning');
            return;
        }

        try {
            this.updateExportOptions();
            
            // Create preview modal
            this.showPreviewModal();
            
        } catch (error) {
            console.error('Error previewing export:', error);
            this.app.showNotification('Failed to preview export: ' + error.message, 'error');
        }
    }

    showPreviewModal() {
        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay" id="preview-modal" style="display: flex;">
                <div class="modal preview-modal" style="max-width: 800px; width: 90%;">
                    <div class="modal-header">
                        <h2><i class="mdi mdi-eye"></i> Export Preview</h2>
                        <button type="button" class="btn-close" id="close-preview">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="preview-info">
                            <div class="preview-summary">
                                <h4>Export Summary</h4>
                                <div class="summary-grid">
                                    <div class="summary-item">
                                        <span class="label">Population:</span>
                                        <span class="value">${this.selectedPopulation.name}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="label">Total Users:</span>
                                        <span class="value">${this.selectedPopulation.userCount || 0}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="label">Format:</span>
                                        <span class="value">${this.exportOptions.format.toUpperCase()}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="label">Include Headers:</span>
                                        <span class="value">${this.exportOptions.includeHeaders ? 'Yes' : 'No'}</span>
                                    </div>
                                    <div class="summary-item">
                                        <span class="label">Include Disabled:</span>
                                        <span class="value">${this.exportOptions.includeDisabledUsers ? 'Yes' : 'No'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="preview-sample">
                                <h4>Sample Data (First 5 rows)</h4>
                                <div class="sample-container">
                                    <pre class="sample-data">${this.generateSampleData()}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="close-preview">Close</button>
                        <button type="button" class="btn btn-primary" id="start-export-from-preview">
                            <i class="mdi mdi-download"></i> Start Export
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        const closeButtons = document.querySelectorAll('#close-preview');
        const startExportButton = document.getElementById('start-export-from-preview');

        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closePreviewModal());
        });

        if (startExportButton) {
            startExportButton.addEventListener('click', () => {
                this.closePreviewModal();
                this.handleStartExport();
            });
        }

        // Add escape key listener
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePreviewModal();
            }
        });
    }

    closePreviewModal() {
        const modal = document.getElementById('preview-modal');
        if (modal) {
            modal.remove();
        }
    }

    generateSampleData() {
        const format = this.exportOptions.format;
        
        // Get checkbox states
        const includeHeaders = document.getElementById('include-headers')?.checked ?? true;
        const includeDisabled = document.getElementById('include-disabled')?.checked ?? false;
        const includeMetadata = document.getElementById('include-metadata')?.checked ?? false;
        
        // Get selected attributes from checkboxes
        const selectedAttributes = this.getSelectedAttributes();
        
        // Add metadata attributes if selected
        if (includeMetadata) {
            selectedAttributes.push('created_date', 'last_updated', 'last_login');
        }
        
        if (format === 'csv' || format === 'xlsx') {
            let csv = '';
            if (includeHeaders) {
                const headers = this.getProfileHeaders(selectedAttributes);
                csv += headers.join(',') + '\n';
            }
            
            // Generate sample rows
            const sampleUsers = [
                { index: 1, status: 'Active' },
                { index: 2, status: 'Active' },
                { index: 3, status: 'Active' },
                { index: 4, status: 'Disabled' },
                { index: 5, status: 'Active' }
            ];
            
            sampleUsers.forEach(user => {
                // Skip disabled users if not included
                if (!includeDisabled && user.status === 'Disabled') {
                    return;
                }
                
                const transformed = this.applyProfileTransform(selectedAttributes, user.index, user.status);
                const row = Object.values(transformed);
                csv += row.join(format === 'xlsx' ? '\t' : ',') + '\n';
            });
            
            return csv;
        } else if (format === 'json') {
            const sampleUsers = [
                { index: 1, status: 'Active' },
                { index: 2, status: 'Active' },
                { index: 3, status: 'Active' },
                { index: 4, status: 'Disabled' },
                { index: 5, status: 'Active' }
            ];
            
            const users = sampleUsers
                .filter(user => includeDisabled || user.status !== 'Disabled')
                .map(user => {
                    return this.applyProfileTransform(selectedAttributes, user.index, user.status);
                });
            
            return JSON.stringify(users, null, 2);
        } else if (format === 'ndjson') {
            const sampleUsers = [1,2,3,4,5]
                .map(i => this.applyProfileTransform(selectedAttributes, i, i % 10 === 0 ? 'Disabled' : 'Active'))
                .filter(u => includeDisabled || u.status !== 'Disabled')
                .map(u => JSON.stringify(u))
                .join('\n');
            return sampleUsers;
        } else if (format === 'xml') {
            const sampleUsers = [1,2,3,4,5]
                .map(i => this.applyProfileTransform(selectedAttributes, i, i % 10 === 0 ? 'Disabled' : 'Active'))
                .filter(u => includeDisabled || u.status !== 'Disabled');
            return this.convertUsersToXML(sampleUsers);
        } else if (format === 'ldif') {
            const sampleUsers = [1,2,3,4,5]
                .map(i => this.applyProfileTransform(selectedAttributes, i, i % 10 === 0 ? 'Disabled' : 'Active'))
                .filter(u => includeDisabled || u.status !== 'Disabled');
            return this.convertUsersToLDIF(sampleUsers);
        } else if (format === 'scim') {
            const sampleUsers = [1,2,3,4,5]
                .map(i => this.applyProfileTransform(selectedAttributes, i, i % 10 === 0 ? 'Disabled' : 'Active'))
                .filter(u => includeDisabled || u.status !== 'Disabled');
            return JSON.stringify(this.convertUsersToSCIMBulk(sampleUsers), null, 2);
        }
        
        return 'Preview not available for this format.';
    }

    async handleStartExport() {
        if (!this.selectedPopulation) return;

        try {
            this.updateExportOptions();
            const progressSection = document.getElementById('export-progress');
            const resultsSection = document.getElementById('export-results');
            const cancelBtn = document.getElementById('cancel-export');
            if (progressSection) progressSection.style.display = 'block';
            if (resultsSection) resultsSection.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'inline-block';
            this.scrollToSection(progressSection);

            // Call backend to fetch real users from PingOne and then build the file client-side
            await this.executeExport();
        } catch (error) {
            console.error('Error starting export:', error);
            this.app.showNotification('Failed to start export: ' + error.message, 'error');
        }
    }

    scrollToSection(section) {
        if (section) {
            section.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
            });
        }
    }

    async simulateExport() {
        const progressBar = document.getElementById('export-progress-bar');
        const progressText = document.getElementById('export-progress-text');
                const progressTextLeft = document.getElementById('export-progress-text-left');
        const statusText = document.getElementById('export-status');
        const usersProcessed = document.getElementById('users-processed');
        const totalUsers = document.getElementById('total-users');

        const total = this.selectedPopulation.userCount || 100;
        if (totalUsers) totalUsers.textContent = total;

        let currentProgress = 0;
        
        return new Promise((resolve) => {
            this.exportInterval = setInterval(() => {
                if (currentProgress >= total) {
                    clearInterval(this.exportInterval);
                    this.exportInterval = null;
                    
                    // Show results
                    setTimeout(() => this.showExportResults(), 1000);
                    // Record in history
                    this.app.addHistoryEntry('export', 'success', `Exported users from ${this.selectedPopulation.name}`, total, Math.floor(Math.random()*90000)+5000);
                    resolve();
                    return;
                }

                currentProgress += 10;
                const progress = Math.min((currentProgress / total) * 100, 100);
                
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                    // Force repaint to ensure CSS animations remain visible as width changes
                    // eslint-disable-next-line no-unused-expressions
                    progressBar.offsetHeight;
                }

                // Update beer mug fill height based on progress (0–16px height)
                const beerFill = document.getElementById('beer-fill');
                const beerFoam = document.getElementById('beer-foam');
                if (beerFill) {
                    const maxHeight = 16; // SVG mug inner height
                    const height = Math.max(0, Math.min(maxHeight, (progress / 100) * maxHeight));
                    const y = 26 - height;
                    beerFill.setAttribute('y', String(y));
                    beerFill.setAttribute('height', String(height));
                }
                if (beerFoam) {
                    const foamHeight = progress > 0 ? 4 : 0.001;
                    const yFoam = 26 - Math.max(0, Math.min(16, (progress / 100) * 16)) - foamHeight;
                    beerFoam.setAttribute('y', String(yFoam));
                    beerFoam.setAttribute('height', String(foamHeight));
                }
                if (progressText) progressText.textContent = `${Math.round(progress)}%`;
                if (progressTextLeft) progressTextLeft.textContent = `${Math.round(progress)}%`;
                if (statusText) statusText.textContent = currentProgress >= total ? 'Export complete!' : 'Exporting users...';
                if (usersProcessed) usersProcessed.textContent = Math.min(currentProgress, total);
            }, 200);
        });
    }

    // Execute real export via backend then build the file
    async executeExport() {
        const includeDisabled = document.getElementById('include-disabled')?.checked ?? false;
        const selectedPopulationId = this.selectedPopulation?.id || this.selectedPopulation?.populationId || '';
        const resp = await fetch('/api/export-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedPopulationId, fields: 'all', format: 'json', ignoreDisabledUsers: !includeDisabled })
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.message || 'Export request failed');
        }
        const data = await resp.json().catch(() => ({}));
        const payload = (data && (data.data || data.message || data)) || {};
        const users = Array.isArray(payload) ? payload : (payload.users || payload.items || payload.list || []);
        const total = Array.isArray(users) ? users.length : 0;

        // Update progress display to complete
        const totalUsers = document.getElementById('total-users');
        const usersProcessed = document.getElementById('users-processed');
        const progressBar = document.getElementById('export-progress-bar');
        const progressText = document.getElementById('export-progress-text');
        const progressTextLeft = document.getElementById('export-progress-text-left');
        if (totalUsers) totalUsers.textContent = String(total);
        if (usersProcessed) usersProcessed.textContent = String(total);
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = '100%';
        if (progressTextLeft) progressTextLeft.textContent = '100%';

        // Build CSV with selected attributes
        const selectedAttributes = this.getSelectedAttributes();
        const headers = this.getProfileHeaders(selectedAttributes);
        const rows = [headers.join(',')];
        for (const u of users) {
            const row = selectedAttributes.map(attr => this.extractUserAttribute(u, attr));
            rows.push(row.map(v => this.csvEscape(v)).join(','));
        }
        const csvContent = rows.join('\n');

        // Present results and trigger download
        setTimeout(() => this.showExportResults(), 300);
        const blob = new Blob([csvContent], { type: this.getMimeType('csv') });
        const fileName = this.generateFileName();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
        this.app?.showSuccess?.(`Exported ${total} users`);
    }

    // Extract attribute from real user object using common mappings and dot-paths
    extractUserAttribute(user, attr) {
        // Special cases
        if (attr === 'status') return user.enabled === false ? 'Disabled' : 'Active';
        if (attr === 'username') return user.username || user.userName || user.login || (Array.isArray(user.emails) && user.emails[0]?.value) || '';
        if (attr === 'emails.value') return Array.isArray(user.emails) ? (user.emails[0]?.value || '') : '';
        if (attr === 'name.given') return user.name?.given || '';
        if (attr === 'name.family') return user.name?.family || '';
        // Generic dot-path
        const parts = String(attr).split('.');
        let cur = user;
        for (const p of parts) {
            if (cur == null) return '';
            if (Array.isArray(cur)) {
                cur = cur[0];
            }
            cur = cur?.[p];
        }
        return (typeof cur === 'string' || typeof cur === 'number') ? String(cur) : cur ? JSON.stringify(cur) : '';
    }

    csvEscape(value) {
        const s = value == null ? '' : String(value);
        if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    showExportResults() {
        const progressSection = document.getElementById('export-progress');
        const resultsSection = document.getElementById('export-results');
        const summaryDiv = document.getElementById('export-summary');

        if (progressSection) progressSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'block';

        // Scroll to results section
        this.scrollToSection(resultsSection);

        // Set up event listeners for the results section buttons
        this.setupResultsEventListeners();

        if (summaryDiv) {
            const total = Number(document.getElementById('total-users')?.textContent || this.selectedPopulation.userCount || 0);
            const processed = Number(document.getElementById('users-processed')?.textContent || total);
            const success = processed; // for now assume all processed succeeded
            const failed = 0;
            const skipped = 0;
            const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';

            summaryDiv.innerHTML = `
                <div class="results-grid">
                    <div class="result-card success">
                        <i class="mdi mdi-check-circle"></i>
                        <div>
                            <h3>Export Summary</h3>
                            <div class="result-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Total Users:</span>
                                    <span class="stat-value">${total}</span>
                </div>
                    <div class="stat-item">
                                    <span class="stat-label">Exported:</span>
                                    <span class="stat-value success">${success}</span>
                    </div>
                    <div class="stat-item">
                                    <span class="stat-label">Skipped:</span>
                                    <span class="stat-value warning">${skipped}</span>
                    </div>
                    <div class="stat-item">
                                    <span class="stat-label">Failed:</span>
                                    <span class="stat-value error">${failed}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Success Rate:</span>
                                    <span class="stat-value">${successRate}%</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Format:</span>
                                    <span class="stat-value">${this.exportOptions.format.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="result-details shaded compact">
                        <h4>Export Details</h4>
                        <div class="kv-grid">
                            <div class="kv-item"><span class="kv-label">Target Population:</span><span class="kv-value">${this.selectedPopulation.name}</span></div>
                            <div class="kv-item"><span class="kv-label">File:</span><span class="kv-value">${this.generateFileName()}</span></div>
                            <div class="kv-item"><span class="kv-label">Completed:</span><span class="kv-value">${new Date().toLocaleString()}</span></div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    setupResultsEventListeners() {
        const downloadBtn = document.getElementById('download-export');
        const newExportBtn = document.getElementById('new-export');

        console.log('🔍 Setting up results event listeners:');
        console.log('  - Download button:', !!downloadBtn);
        console.log('  - New export button:', !!newExportBtn);

        if (downloadBtn) {
            // Remove any existing event listeners
            downloadBtn.replaceWith(downloadBtn.cloneNode(true));
            const newDownloadBtn = document.getElementById('download-export');
            
            newDownloadBtn.addEventListener('click', () => {
                console.log('📥 Download button clicked!');
                this.handleDownloadExport();
            });
        } else {
            console.warn('⚠️ Download button not found in results section');
        }

        if (newExportBtn) {
            // Remove any existing event listeners
            newExportBtn.replaceWith(newExportBtn.cloneNode(true));
            const newNewExportBtn = document.getElementById('new-export');
            
            newNewExportBtn.addEventListener('click', () => {
                console.log('🔄 New export button clicked!');
                this.handleNewExport();
            });
        } else {
            console.warn('⚠️ New export button not found in results section');
        }
    }

    handleDownloadExport() {
        if (!this.selectedPopulation) {
            this.app.showNotification('No export data available. Please run an export first.', 'warning');
            return;
        }

        try {
            // Generate the export data
            const exportData = this.generateExportData();
            const fileName = this.generateFileName();
            
            // Create a Blob with the export data
            const blob = new Blob([exportData.content], { 
                type: this.getMimeType(this.exportOptions.format) 
            });
            
            // Create a download link
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = fileName;
            downloadLink.style.display = 'none';
            
            // Add to DOM, click, and remove
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Clean up the URL object
            URL.revokeObjectURL(downloadLink.href);
            
            this.app.showNotification(`Export file "${fileName}" downloaded successfully!`, 'success');
            
        } catch (error) {
            console.error('Error downloading export:', error);
            this.app.showNotification('Failed to download export file: ' + error.message, 'error');
        }
    }

    generateExportData() {
        const format = this.exportOptions.format;
        
        // Get checkbox states
        const includeHeaders = document.getElementById('include-headers')?.checked ?? true;
        const includeDisabled = document.getElementById('include-disabled')?.checked ?? false;
        const includeMetadata = document.getElementById('include-metadata')?.checked ?? false;
        
        // Get selected attributes from checkboxes
        const selectedAttributes = this.getSelectedAttributes();
        
        // Add metadata attributes if selected
        if (includeMetadata) {
            selectedAttributes.push('created_date', 'last_updated', 'last_login');
        }
        
        if (format === 'csv' || format === 'xlsx') {
            let csv = '';
            if (includeHeaders) {
                const headers = this.getProfileHeaders(selectedAttributes);
                csv += headers.join(format === 'xlsx' ? '\t' : ',') + '\n';
            }
            
            // Generate sample data based on population size
            const userCount = this.selectedPopulation.userCount || 100;
            for (let i = 1; i <= userCount; i++) {
                // Skip disabled users if not included
                const userStatus = this.getAttributeValue('status', i);
                if (!includeDisabled && userStatus === 'Disabled') {
                    continue;
                }
                
                const transformed = this.applyProfileTransform(selectedAttributes, i, userStatus);
                const row = Object.values(transformed);
                csv += row.join(format === 'xlsx' ? '\t' : ',') + '\n';
            }
            
            return { content: csv, type: format };
            
        } else if (format === 'json') {
            const userCount = this.selectedPopulation.userCount || 100;
            const users = [];
            
            for (let i = 1; i <= userCount; i++) {
                // Skip disabled users if not included
                const userStatus = this.getAttributeValue('status', i);
                if (!includeDisabled && userStatus === 'Disabled') {
                    continue;
                }
                
                users.push(this.applyProfileTransform(selectedAttributes, i, userStatus));
            }
            
            return { content: JSON.stringify(users, null, 2), type: 'json' };
        } else if (format === 'ndjson') {
            const userCount = this.selectedPopulation.userCount || 100;
            const lines = [];
            for (let i = 1; i <= userCount; i++) {
                const userStatus = this.getAttributeValue('status', i);
                if (!includeDisabled && userStatus === 'Disabled') continue;
                lines.push(JSON.stringify(this.applyProfileTransform(selectedAttributes, i, userStatus)));
            }
            return { content: lines.join('\n'), type: 'ndjson' };
        } else if (format === 'xml') {
            const userCount = this.selectedPopulation.userCount || 100;
            const users = [];
            for (let i = 1; i <= userCount; i++) {
                const userStatus = this.getAttributeValue('status', i);
                if (!includeDisabled && userStatus === 'Disabled') continue;
                users.push(this.applyProfileTransform(selectedAttributes, i, userStatus));
            }
            return { content: this.convertUsersToXML(users), type: 'xml' };
        } else if (format === 'ldif') {
            const userCount = this.selectedPopulation.userCount || 100;
            const users = [];
            for (let i = 1; i <= userCount; i++) {
                const userStatus = this.getAttributeValue('status', i);
                if (!includeDisabled && userStatus === 'Disabled') continue;
                users.push(this.applyProfileTransform(selectedAttributes, i, userStatus));
            }
            return { content: this.convertUsersToLDIF(users), type: 'ldif' };
        } else if (format === 'scim') {
            const userCount = this.selectedPopulation.userCount || 100;
            const users = [];
            for (let i = 1; i <= userCount; i++) {
                const userStatus = this.getAttributeValue('status', i);
                if (!includeDisabled && userStatus === 'Disabled') continue;
                users.push(this.applyProfileTransform(selectedAttributes, i, userStatus));
            }
            return { content: JSON.stringify(this.convertUsersToSCIMBulk(users), null, 2), type: 'scim' };
        }
        
        return { content: 'Export data not available', type: 'txt' };
    }

    getProfileHeaders(selectedAttributes) {
        const profile = this.exportOptions.profile || 'none';
        if (profile === 'pingone') {
            return ['username','email','givenName','familyName','enabled','groups'];
        }
        if (profile === 'ad') {
            return ['sAMAccountName','mail','givenName','sn','distinguishedName'];
        }
        if (profile === 'okta') {
            return ['login','email','firstName','lastName','status','groups'];
        }
        if (profile === 'siem') {
            return ['id','username','email','enabled','createdDate','lastLogin'];
        }
        // default: use attribute display names
        return selectedAttributes.map(attr => this.getAttributeDisplayName(attr));
    }

    applyProfileTransform(selectedAttributes, index, status) {
        const profile = this.exportOptions.profile || 'none';
        const base = {};
        // Build from selected attributes first (default mapping)
        selectedAttributes.forEach(attr => {
            const key = this.getAttributeKey(attr);
            base[key] = attr === 'status' ? status : this.getAttributeValue(attr, index);
        });
        if (profile === 'pingone') {
            return {
                username: base.username,
                email: base.email,
                givenName: base.first_name || 'User',
                familyName: base.last_name || String(index),
                enabled: (status || base.status) !== 'Disabled',
                groups: base.groups || ''
            };
        }
        if (profile === 'ad') {
            const username = (base.username || `user${index}`);
            const sam = String(username).includes('@') ? username.split('@')[0] : username;
            const dn = `uid=${sam},ou=Users,dc=example,dc=com`;
            return {
                sAMAccountName: sam,
                mail: base.email || `${sam}@example.com`,
                givenName: base.first_name || 'User',
                sn: base.last_name || String(index),
                distinguishedName: dn
            };
        }
        if (profile === 'okta') {
            return {
                login: base.email || `${base.username || `user${index}`}@example.com`,
                email: base.email || `${base.username || `user${index}`}@example.com`,
                firstName: base.first_name || 'User',
                lastName: base.last_name || String(index),
                status: status || base.status || 'ACTIVE',
                groups: base.groups || ''
            };
        }
        if (profile === 'siem') {
            return {
                id: `u-${index}`,
                username: base.username || `user${index}`,
                email: base.email || `${base.username || `user${index}`}@example.com`,
                enabled: (status || base.status) !== 'Disabled',
                createdDate: base.created_date || new Date().toISOString(),
                lastLogin: base.last_login || new Date().toISOString()
            };
        }
        return base;
    }

    convertUsersToXML(users) {
        const escape = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
        const rows = users.map(u => {
            const fields = Object.entries(u).map(([k,v]) => `    <${k}>${escape(v)}</${k}>`).join('\n');
            return `  <user>\n${fields}\n  </user>`;
        }).join('\n');
        return `<users>\n${rows}\n</users>`;
    }

    convertUsersToLDIF(users) {
        const lines = users.map(u => {
            const uid = (u.username || u.login || u.sAMAccountName || 'user').toString();
            const cn = `${u.givenName || u.firstName || 'User'} ${u.familyName || u.lastName || ''}`.trim();
            const sam = uid.includes('@') ? uid.split('@')[0] : uid;
            const dn = `uid=${sam},ou=Users,dc=example,dc=com`;
            const block = [
                `dn: ${dn}`,
                'objectClass: inetOrgPerson',
                `uid: ${sam}`,
                `cn: ${cn}`,
                `sn: ${u.familyName || u.lastName || 'User'}`,
                `givenName: ${u.givenName || u.firstName || 'User'}`,
                `mail: ${u.email || `${sam}@example.com`}`
            ].join('\n');
            return block + '\n';
        });
        return lines.join('\n');
    }

    convertUsersToSCIMBulk(users) {
        const Operations = users.map((u, idx) => ({
            method: 'POST',
            path: '/Users',
            bulkId: `user${idx+1}`,
            data: {
                userName: u.username || u.login || u.email,
                name: {
                    givenName: u.givenName || u.firstName || 'User',
                    familyName: u.familyName || u.lastName || String(idx+1)
                },
                active: u.enabled !== false,
                emails: [{ value: u.email, primary: true }]
            }
        }));
        return {
            schemas: ['urn:ietf:params:scim:api:messages:2.0:BulkRequest'],
            Operations
        };
    }
    
    /**
     * Get selected attributes from checkboxes
     */
    getSelectedAttributes() {
        const attributes = [];
        
        // Always include username (required)
        attributes.push('username');
        
        // Check other attribute checkboxes
        const attributeCheckboxes = [
            { id: 'attr-email', key: 'email' },
            { id: 'attr-firstname', key: 'firstname' },
            { id: 'attr-lastname', key: 'lastname' },
            { id: 'attr-status', key: 'status' },
            { id: 'attr-groups', key: 'groups' },
            { id: 'attr-roles', key: 'roles' },
            { id: 'attr-custom', key: 'custom' }
        ];
        
        attributeCheckboxes.forEach(({ id, key }) => {
            const checkbox = document.getElementById(id);
            if (checkbox && checkbox.checked) {
                attributes.push(key);
            }
        });
        
        return attributes;
    }
    
    /**
     * Get display name for attribute
     */
    getAttributeDisplayName(attr) {
        const displayNames = {
            'username': 'Username',
            'email': 'Email',
            'firstname': 'First Name',
            'lastname': 'Last Name',
            'status': 'Status',
            'groups': 'Groups',
            'roles': 'Roles',
            'custom': 'Custom Attributes',
            'created_date': 'Created Date',
            'last_updated': 'Last Updated',
            'last_login': 'Last Login'
        };
        return displayNames[attr] || attr;
    }
    
    /**
     * Get attribute key for JSON
     */
    getAttributeKey(attr) {
        const keys = {
            'username': 'username',
            'email': 'email',
            'firstname': 'first_name',
            'lastname': 'last_name',
            'status': 'status',
            'groups': 'groups',
            'roles': 'roles',
            'custom': 'custom_attributes',
            'created_date': 'created_date',
            'last_updated': 'last_updated',
            'last_login': 'last_login'
        };
        return keys[attr] || attr;
    }
    
    /**
     * Get sample value for attribute
     */
    getAttributeValue(attr, index) {
        const now = new Date();
        const createdDate = new Date(now.getTime() - (Math.random() * 365 * 24 * 60 * 60 * 1000));
        const lastUpdated = new Date(createdDate.getTime() + (Math.random() * 30 * 24 * 60 * 60 * 1000));
        const lastLogin = new Date(lastUpdated.getTime() + (Math.random() * 7 * 24 * 60 * 60 * 1000));
        
        const values = {
            'username': `user${index}`,
            'email': `user${index}@example.com`,
            'firstname': 'User',
            'lastname': index.toString(),
            'status': index % 10 === 0 ? 'Disabled' : 'Active', // 10% disabled
            'groups': 'Default Group',
            'roles': 'User',
            'custom': 'Custom Value',
            'created_date': createdDate.toISOString().split('T')[0],
            'last_updated': lastUpdated.toISOString().split('T')[0],
            'last_login': lastLogin.toISOString().split('T')[0]
        };
        return values[attr] || '';
    }

    generateFileName() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const populationName = this.selectedPopulation.name.replace(/[^a-zA-Z0-9]/g, '_');
        const format = this.exportOptions.format;
        
        return `pingone_export_${populationName}_${timestamp}.${format}`;
    }

    getMimeType(format) {
        switch (format) {
            case 'csv':
                return 'text/csv';
            case 'json':
                return 'application/json';
            case 'ndjson':
                return 'application/x-ndjson';
            case 'xlsx':
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case 'xml':
                return 'application/xml';
            case 'ldif':
                return 'text/plain';
            case 'scim':
                return 'application/scim+json';
            default:
                return 'text/plain';
        }
    }

    handleNewExport() {
        // Reset the form
        const progressSection = document.getElementById('export-progress');
        const resultsSection = document.getElementById('export-results');
        const populationSelect = document.getElementById('export-population-select');

        if (progressSection) progressSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
        if (populationSelect) populationSelect.value = '';

        this.selectedPopulation = null;
        this.handlePopulationChange('');
    }

    handleCancelExport() {
        console.log('🛑 Canceling export process...');
        
        // Stop the export simulation
        if (this.exportInterval) {
            clearInterval(this.exportInterval);
            this.exportInterval = null;
        }
        
        // Hide progress section
        const progressSection = document.getElementById('export-progress');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
        
        // Hide cancel button
        const cancelBtn = document.getElementById('cancel-export');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
        
        // Show notification
        this.app.showNotification('Export cancelled successfully', 'info');
        
        // Reset progress
        const progressBar = document.getElementById('export-progress-bar');
        const progressText = document.getElementById('export-progress-text');
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
        
        console.log('✅ Export cancellation completed');
    }

    // Called when token status changes
    onTokenStatusChange(tokenStatus) {
        // Only reload populations if page is loaded and token validity actually changed
        if (this.isLoaded) {
            const currentValidity = tokenStatus?.isValid;
            if (this.lastTokenValidity !== currentValidity) {
                console.log(`🔄 Export page - Token validity changed: ${this.lastTokenValidity} -> ${currentValidity}`);
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
