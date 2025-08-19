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
        this.lastExport = null; // Cache last export artifact and metadata
        this.exportOptions = {
            format: 'csv',
            profile: 'pingone',
            includeHeaders: true,
            includeDisabledUsers: false,
            attributes: []
        };
    }

    /**
     * Transform a single user's attributes based on the selected export profile.
     * Returns an object whose property insertion order matches the headers.
     * @param {string[]} selectedAttributes
     * @param {number} index
     * @param {string} userStatus
     */
    applyProfileTransform(selectedAttributes, index, userStatus) {
        const profile = this.exportOptions.profile || 'pingone';
        const headers = this.getProfileHeaders(selectedAttributes);
        const out = {};
        const v = (key) => this.getAttributeValue(key, index);

        if (profile === 'pingone') {
            headers.forEach(h => {
                // Direct mapping for PingOne style fields
                if (h === 'enabled') out[h] = v('enabled');
                else if (h === 'groups') out[h] = v('groups');
                else out[h] = v(h);
            });
            return out;
        }

        if (profile === 'ad') {
            // Ensure order matches headers
            headers.forEach(h => {
                switch (h) {
                    case 'sAMAccountName':
                        out[h] = v('sAMAccountName') || v('username');
                        break;
                    case 'mail':
                        out[h] = v('mail') || v('email');
                        break;
                    case 'givenName':
                        out[h] = v('givenName') || v('firstName');
                        break;
                    case 'sn':
                        out[h] = v('sn') || v('familyName') || v('lastName');
                        break;
                    case 'distinguishedName': {
                        const sam = (v('sAMAccountName') || v('username') || 'user').toString();
                        out[h] = v('distinguishedName') || `CN=${sam},OU=Users,DC=example,DC=com`;
                        break;
                    }
                    default:
                        out[h] = v(h);
                }
            });
            return out;
        }

        if (profile === 'okta') {
            headers.forEach(h => {
                switch (h) {
                    case 'login':
                        out[h] = v('login') || v('username') || v('email');
                        break;
                    case 'email':
                        out[h] = v('email');
                        break;
                    case 'firstName':
                        out[h] = v('firstName') || v('givenName');
                        break;
                    case 'lastName':
                        out[h] = v('lastName') || v('familyName');
                        break;
                    case 'status':
                        out[h] = userStatus || v('status');
                        break;
                    case 'groups':
                        out[h] = v('groups');
                        break;
                    default:
                        out[h] = v(h);
                }
            });
            return out;
        }

        if (profile === 'siem') {
            headers.forEach(h => {
                switch (h) {
                    case 'id':
                        out[h] = v('id');
                        break;
                    case 'username':
                        out[h] = v('username');
                        break;
                    case 'email':
                        out[h] = v('email');
                        break;
                    case 'enabled':
                        out[h] = v('enabled');
                        break;
                    case 'createdDate':
                        out[h] = v('createdDate');
                        break;
                    case 'lastLogin':
                        out[h] = v('lastLogin');
                        break;
                    default:
                        out[h] = v(h);
                }
            });
            return out;
        }

        // Fallback: map selected/deduced headers directly
        headers.forEach(h => { out[h] = v(h); });
        return out;
    }

    // Format bytes to human readable string
    formatBytes(bytes) {
        try {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            const value = (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2);
            return `${value} ${sizes[i]}`;
        } catch {
            return `${bytes} B`;
        }
    }

    // Format date/time consistently
    formatDateTime(date) {
        try {
            return new Intl.DateTimeFormat(undefined, {
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).format(date);
        } catch {
            return new Date(date).toLocaleString();
        }
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
                                <div class="population-dropdown-container">
                                    <select id="export-population-select" class="form-control" required>
                                        <option value="">Select a population...</option>
                                    </select>
                                    <button type="button" id="refresh-populations" class="btn btn-outline-secondary">
                                        <i class="mdi mdi-refresh"></i>
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
                                <select id="export-format" class="form-control" data-long-text="true">
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
                                 <select id="export-profile" class="form-control" data-long-text="true">
                                     <option value="none">None</option>
                                     <option value="pingone" selected>PingOne re-import template (default)</option>
                                     <option value="ad">AD/LDAP-friendly (sAMAccountName, DN)</option>
                                     <option value="okta">Okta/AzureAD-style headers</option>
                                     <option value="siem">SIEM profile (flattened)</option>
                                 </select>
                             </div>
                            <div class="form-group">
                                <label for="export-encoding">Character Encoding</label>
                                <select id="export-encoding" class="form-control" data-long-text="true">
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

                        <div class="attributes-group">
                            <h4>User Attributes to Export</h4>
                            <div class="mb-2" style="display:flex; gap:12px; align-items:center;">
                                <div class="form-check">
                                    <input type="checkbox" id="attrs-select-all" class="form-check-input">
                                    <label for="attrs-select-all" class="form-check-label">Select All</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="attrs-unselect-all" class="form-check-input">
                                    <label for="attrs-unselect-all" class="form-check-label">Unselect All</label>
                                </div>
                                <div class="form-check">
                                    <button type="button" id="attrs-refresh" class="btn btn-outline-secondary btn-sm">
                                        <i class="mdi mdi-refresh"></i> Refresh Attributes
                                    </button>
                                </div>
                            </div>
                            <div id="attributes-selection" class="attributes-grid">
                                <!-- Dynamically populated -->
                                <div class="form-check">
                                    <input type="checkbox" id="attr-username" class="form-check-input" checked disabled data-key="username">
                                    <label for="attr-username" class="form-check-label">Username (Required)</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Export Actions Section -->
                <section class="export-section">
                    <div class="export-box">
                        <div class="export-actions">
                            <button type="button" id="start-export" class="btn btn-danger" disabled>
                                <i class="mdi mdi-download"></i> Start Export
                            </button>
                            <button type="button" id="preview-export" class="btn btn-danger">
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
                                <span class="label">Ignored Users:</span>
                                <span id="ignored-users" class="value">0</span>
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
            // Load attributes dynamically
            await this.loadAttributes();
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
            refreshPopulationsBtn.addEventListener('click', () => this.loadPopulations());
        }

        // Export format change
        const exportFormat = document.getElementById('export-format');
        if (exportFormat) {
            exportFormat.addEventListener('change', (e) => this.handleFormatChange(e.target.value));
        }

        // Export profile change
        const exportProfile = document.getElementById('export-profile');
        if (exportProfile) {
            // Set the initial value to match the default profile
            exportProfile.value = this.exportOptions.profile;
            
            exportProfile.addEventListener('change', (e) => {
                this.exportOptions.profile = e.target.value || 'pingone';
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
        const bindAttributeCheckboxListeners = () => {
            const attributeCheckboxes = document.querySelectorAll('#attributes-selection input[type="checkbox"]');
            attributeCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => this.updateExportOptions());
            });
        };
        bindAttributeCheckboxListeners();

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

        // Refresh attributes button
        const attrsRefresh = document.getElementById('attrs-refresh');
        if (attrsRefresh) {
            attrsRefresh.addEventListener('click', async () => {
                await this.loadAttributes(true);
                // Re-bind listeners after DOM update
                bindAttributeCheckboxListeners();
                this.updateExportOptions();
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
                this.app?.showNotification?.('Failed to load populations: ' + error.message, 'error');
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

        // Update selected attributes using data-key to support dotted keys (e.g., custom.foo)
        const attributeCheckboxes = document.querySelectorAll('#attributes-selection input[type="checkbox"]:checked');
        this.exportOptions.attributes = Array.from(attributeCheckboxes)
            .map(cb => cb.dataset.key)
            .filter(Boolean);

        console.log('Export options updated:', this.exportOptions);
    }

    async handlePreviewExport() {
        if (!this.selectedPopulation) {
            this.app?.showNotification?.('Please select a population first', 'warning');
            return;
        }

        try {
            this.updateExportOptions();
            
            // Create preview modal
            this.showPreviewModal();
            
        } catch (error) {
            console.error('Error previewing export:', error);
            this.app?.showNotification?.('Failed to preview export: ' + error.message, 'error');
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
            // Guard: prevent export when selected population has 0 users
            const rawCount = this.selectedPopulation?.userCount;
            const totalCount = Number(rawCount ?? 0);
            if (!Number.isFinite(totalCount) || totalCount <= 0) {
                this.app?.showNotification?.('No records to export: the selected population has 0 users.', 'warning');
                return;
            }
            
            // Show progress section
            const progressSection = document.getElementById('export-progress');
            const resultsSection = document.getElementById('export-results');
            const cancelBtn = document.getElementById('cancel-export');
            
            if (progressSection) progressSection.style.display = 'block';
            if (resultsSection) resultsSection.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'inline-block';

            // Scroll to progress section
            this.scrollToSection(progressSection);

            // Start backend export session
            const outputFileName = this.generateFileName();
            const startResp = await fetch('/api/export/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    sessionId: `export_${Date.now()}`,
                    totalRecords: totalCount,
                    populationId: this.selectedPopulation.id,
                    populationName: this.selectedPopulation.name,
                    outputFileName
                })
            });
            const startJson = await startResp.json();
            if (!startResp.ok || startJson.success === false) {
                throw new Error(startJson.error || startJson.message || 'Failed to start export');
            }

            // Drive progress and keep backend status updated (including ignoredUsers)
            await this.driveBackendExportProgress(totalCount);
            
        } catch (error) {
            console.error('Error starting export:', error);
            this.app?.showNotification?.('Failed to start export: ' + error.message, 'error');
        }
    }

    async driveBackendExportProgress(total) {
        // Cache UI elements
        const progressBar = document.getElementById('export-progress-bar');
        const progressText = document.getElementById('export-progress-text');
        const progressTextLeft = document.getElementById('export-progress-text-left');
        const statusText = document.getElementById('export-status');
        const usersProcessed = document.getElementById('users-processed');
        const totalUsers = document.getElementById('total-users');
        const ignoredUsersEl = document.getElementById('ignored-users');
        const cancelBtn = document.getElementById('cancel-export');

        if (typeof total === 'number' && totalUsers) {
            totalUsers.textContent = total;
        }

        // Clear any existing interval first
        if (this.exportInterval) {
            clearInterval(this.exportInterval);
            this.exportInterval = null;
        }

        const updateUIFromStatus = (data) => {
            try {
                const pct = Math.max(0, Math.min(100, Number(data?.progress?.percentage ?? 0)));
                const processed = Number(data?.progress?.current ?? data?.statistics?.processed ?? 0);
                const totalCount = Number(data?.progress?.total ?? total ?? 0);
                const ignored = Number(data?.statistics?.ignoredUsers ?? 0);

                if (totalUsers && Number.isFinite(totalCount)) totalUsers.textContent = totalCount;
                if (usersProcessed) usersProcessed.textContent = processed;
                if (ignoredUsersEl) ignoredUsersEl.textContent = ignored;

                if (progressBar) {
                    progressBar.style.width = `${pct}%`;
                    // Force repaint to keep CSS animation
                    // eslint-disable-next-line no-unused-expressions
                    progressBar.offsetHeight;
                }
                if (progressText) progressText.textContent = `${pct}%`;
                if (progressTextLeft) progressTextLeft.textContent = `${pct}%`;
                if (statusText) statusText.textContent = data?.status ? `Status: ${data.status}` : 'Export in progress...';

                // Beer mug visual
                const beerFill = document.getElementById('beer-fill');
                const beerFoam = document.getElementById('beer-foam');
                if (beerFill) beerFill.style.height = `${(pct / 100) * 16}px`;
                if (beerFoam) beerFoam.style.top = `${16 - ((pct / 100) * 16)}px`;

                return { pct, processed, totalCount, ignored, status: data?.status };
            } catch (e) {
                console.warn('Failed updating export UI from status:', e);
                return { pct: 0, processed: 0, totalCount: total ?? 0, ignored: 0, status: 'running' };
            }
        };

        // Poll backend status periodically
        this.exportInterval = setInterval(async () => {
            try {
                const resp = await fetch('/api/export/status', { headers: { 'Accept': 'application/json' } });
                const json = await resp.json();
                if (!resp.ok || json.success === false) {
                    throw new Error(json.error || json.message || 'Failed to get export status');
                }

                const data = json.data || json; // some middleware wraps in {success,data}
                const { pct, processed, totalCount, status } = updateUIFromStatus(data);

                const done = (status && ['completed','failed','cancelled','canceled'].includes(String(status)))
                    || (totalCount > 0 && processed >= totalCount) || pct >= 100;
                if (done) {
                    clearInterval(this.exportInterval);
                    this.exportInterval = null;
                    if (cancelBtn) cancelBtn.style.display = 'none';
                    // Slight delay for UX polish
                    setTimeout(() => this.showExportResults(), 300);
                }
            } catch (err) {
                console.error('Polling export status failed:', err);
                // Stop polling on persistent error
                clearInterval(this.exportInterval);
                this.exportInterval = null;
                if (statusText) statusText.textContent = 'Export status error';
                this.app?.showNotification?.('Failed to poll export status: ' + err.message, 'error');
            }
        }, 800);
    }

    async simulateExport() {
        const progressBar = document.getElementById('export-progress-bar');
                const progressText = document.getElementById('export-progress-text');
                const progressTextLeft = document.getElementById('export-progress-text-left');
        const statusText = document.getElementById('export-status');
        const usersProcessed = document.getElementById('users-processed');
        const totalUsers = document.getElementById('total-users');
        const ignoredUsersEl = document.getElementById('ignored-users');

        const total = Number(this.selectedPopulation?.userCount ?? 0);
        if (totalUsers) totalUsers.textContent = total;

        // Determine how many will be ignored based on includeDisabledUsers option.
        // Our preview/sample logic marks every 5th user as Disabled.
        const includeDisabled = !!this.exportOptions.includeDisabledUsers;
        const totalDisabled = includeDisabled ? 0 : Math.floor(total / 5);

        let currentProgress = 0;
        
        return new Promise((resolve) => {
            // If no users to export, exit gracefully
            if (total <= 0) {
                if (statusText) statusText.textContent = 'No users to export';
                if (usersProcessed) usersProcessed.textContent = '0';
                if (progressBar) progressBar.style.width = '0%';
                if (progressText) progressText.textContent = '0%';
                if (progressTextLeft) progressTextLeft.textContent = '0%';
                const cancelBtn = document.getElementById('cancel-export');
                if (cancelBtn) cancelBtn.style.display = 'none';
                const progressSection = document.getElementById('export-progress');
                if (progressSection) progressSection.style.display = 'none';
                this.app?.showNotification?.('No records to export: the selected population has 0 users.', 'info');
                resolve();
                return;
            }
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

                // Update ignored users gradually in proportion to progress
                if (ignoredUsersEl) {
                    const processedNow = Math.min(currentProgress, total);
                    const ignoredSoFar = Math.min(Math.floor(processedNow / 5), totalDisabled);
                    ignoredUsersEl.textContent = ignoredSoFar;
                }
            }, 200);
        });
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
            const ignored = Number(document.getElementById('ignored-users')?.textContent || 0);
            const success = processed; // for now assume all processed succeeded
            const failed = 0;
            const skipped = 0;
            const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';

            // Prepare file metadata safely
            const fileName = this.lastExport?.fileName || this.generateFileName();
            const fileSizeBytes = this.lastExport?.size ?? this.lastExport?.blob?.size ?? 0;
            const sizeText = fileSizeBytes > 0 ? this.formatBytes(fileSizeBytes) : 'N/A';
            const createdDate = this.lastExport?.createdAt || new Date();
            const modifiedDate = this.lastExport?.modifiedAt || createdDate;
            const createdText = this.formatDateTime(createdDate);
            const modifiedText = this.formatDateTime(modifiedDate);

            summaryDiv.innerHTML = `
                <div class="results-grid">
                    <div class="result-card success">
                        <i class="mdi mdi-check-circle"></i>
                        <div>
                            </div>
                            <div class="metric">
                                <div class="metric-label">Format</div>
                                <div class="metric-value">${this.exportOptions.format.toUpperCase()}</div>
                            </div>
                            <div class="metric">
                                <div class="metric-label">Headers</div>
                                <div class="metric-value">${this.exportOptions.includeHeaders ? 'Included' : 'Excluded'}</div>
                            </div>
                            <div class="metric">
                                <div class="metric-label">Ignored Users</div>
                                <div class="metric-value">${ignored}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="file-details-section" style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; margin-top: 12px;">
                    <div class="file-details" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <i class="mdi mdi-file-document" style="font-size:22px; color:#374151;"></i>
                            <div class="file-meta">
                                <div class="file-name" id="file-name" style="font-weight:600; color:#111827;">${fileName}</div>
                                <div class="file-extra" style="font-size:12px; color:#4b5563;">
                                    <span id="file-size">${sizeText}</span>
                                    <span style="padding:0 6px; color:#9ca3af;">|</span>
                                    <span id="file-created">Created: ${createdText}</span>
                                    <span style="padding:0 6px; color:#9ca3af;">|</span>
                                    <span id="file-modified">Last Modified: ${modifiedText}</span>
                                </div>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button type="button" id="download-export" class="btn btn-success" style="border-radius: 4px; padding: 8px 14px; display:inline-flex; align-items:center; gap:6px;">
                                <i class="mdi mdi-download"></i> <span>Download</span>
                            </button>
                            <button type="button" id="remove-file" class="btn btn-danger btn-sm" style="border-radius: 4px; padding: 8px 12px; display:inline-flex; align-items:center; gap:6px;">
                                <i class="mdi mdi-delete"></i> <span>Remove</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="result-details">
                    <h4>Export Details</h4>
                    <ul>
                        <li><strong>Target Population:</strong> ${this.selectedPopulation.name}</li>
                        <li><strong>Completed:</strong> ${this.formatDateTime(new Date())}</li>
                        <li><strong>Total Users:</strong> ${total}</li>
                        <li><strong>Processed Users:</strong> ${processed}</li>
                        <li><strong>Ignored Users:</strong> ${ignored}</li>
                    </ul>
                </div>
            `;

            // Wire up Remove button to clear cached export
            const removeBtn = document.getElementById('remove-file');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    this.lastExport = null;
                    const details = document.querySelector('.file-details-section');
                    if (details) details.remove();
                    this.app?.showNotification?.('Export file removed from session.', 'info');
                });
            }
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
            this.app?.showNotification?.('No export data available. Please run an export first.', 'warning');
            return;
        }

        try {
            // Generate the export data
            const exportData = this.generateExportData();
            const fileName = this.generateFileName();
            const blob = this.lastExport?.blob || new Blob([exportData.content], { type: this.getMimeType(this.exportOptions.format) });
            const size = blob.size;
            const createdAt = new Date();
            const modifiedAt = createdAt;
            this.lastExport = { blob, fileName, size, createdAt, modifiedAt, type: exportData.type };
            
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
        
        this.app?.showNotification?.(`Export file "${fileName}" downloaded successfully!`, 'success');
        
    } catch (error) {
        console.error('Error downloading export:', error);
        this.app?.showNotification?.('Failed to download export file: ' + error.message, 'error');
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
        const profile = this.exportOptions.profile || 'pingone';
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
        const attributes = ['username'];
        const checked = document.querySelectorAll('#attributes-selection input[type="checkbox"]:checked');
        checked.forEach(cb => {
            const key = cb.dataset.key;
            if (key && key !== 'username') attributes.push(key);
        });
        return attributes;
    }

    /**
     * Fetch and render attributes dynamically from backend
     * @param {boolean} forceRefresh
     */
    async loadAttributes(forceRefresh = false) {
        try {
            const url = `/api/export/attributes${forceRefresh ? '?forceRefresh=true' : ''}`;
            const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
            const json = await resp.json();
            if (!resp.ok || json.success === false) {
                throw new Error(json.error || json.message || 'Failed fetching attributes');
            }
            const attributes = json.data?.attributes || json.attributes || [];
            this.renderAttributes(attributes);
            this.updateExportOptions();
        } catch (err) {
            console.error('Failed to load attributes:', err);
            this.app?.showNotification?.(`Failed to load attributes: ${err.message}`, 'error');
        }
    }

    /**
     * Render attribute checkboxes into #attributes-selection
     * @param {Array<{key:string,label:string,group?:string,required?:boolean}>} attributes
     */
    renderAttributes(attributes) {
        const container = document.getElementById('attributes-selection');
        if (!container) return;

        // Preserve the required username checkbox
        container.innerHTML = '';
        const usernameId = 'attr-username';
        container.insertAdjacentHTML('beforeend', `
            <div class="form-check">
                <input type="checkbox" id="${usernameId}" class="form-check-input" checked disabled data-key="username">
                <label for="${usernameId}" class="form-check-label">Username (Required)</label>
            </div>
        `);

        // Sort attributes: standard/name/relations/metadata/custom; username first already added
        const order = { standard: 1, name: 2, relations: 3, metadata: 4, custom: 5 };
        const items = attributes
            .filter(a => a.key !== 'username')
            .slice()
            .sort((a, b) => (order[a.group || 'standard'] - order[b.group || 'standard']) || a.label.localeCompare(b.label));

        // Defaults to check
        const defaultChecked = new Set(['email','givenName','familyName','enabled','groups']);

        for (const attr of items) {
            const id = `attr-${this.sanitizeId(attr.key)}`;
            const label = attr.label || attr.key;
            const required = !!attr.required;
            const checked = required || defaultChecked.has(attr.key);
            container.insertAdjacentHTML('beforeend', `
                <div class="form-check">
                    <input type="checkbox" id="${id}" class="form-check-input" ${checked ? 'checked' : ''} ${required ? 'disabled' : ''} data-key="${attr.key}">
                    <label for="${id}" class="form-check-label">${label}</label>
                </div>
            `);
        }
    }

    sanitizeId(key) {
        return String(key).replace(/[^a-zA-Z0-9_-]/g, '_');
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
        const isDisabled = index % 5 === 0; // ~20% disabled for preview richness

        const map = {
            // core identifiers
            'id': `u-${index}`,
            'username': `user${index}`,
            'userName': `user${index}`,
            'email': `user${index}@example.com`,

            // legacy simple names
            'firstname': 'User',
            'lastname': String(index),

            // SCIM name object and synonyms
            'givenName': 'User',
            'familyName': String(index),
            'name.givenName': 'User',
            'name.familyName': String(index),

            // enable/active/status
            'status': isDisabled ? 'Disabled' : 'Active',
            'enabled': !isDisabled,
            'active': !isDisabled,

            // relations and groups
            'groups': 'Default Group',
            'roles': 'User',

            // dates
            'created_date': createdDate.toISOString().split('T')[0],
            'last_updated': lastUpdated.toISOString().split('T')[0],
            'last_login': lastLogin.toISOString().split('T')[0],
            'created': createdDate.toISOString(),
            'lastModified': lastUpdated.toISOString(),
            'meta.created': createdDate.toISOString(),
            'meta.lastModified': lastUpdated.toISOString()
        };

        // Support custom dotted attributes like custom.foo, x-... or urn:...:extension
        if (attr && typeof attr === 'string') {
            if (attr.startsWith('custom.')) {
                const key = attr.split('.').slice(1).join('_') || 'attr';
                return `custom_${key}_${index}`;
            }
            if (attr.includes('.')) {
                // generic dotted key fallback e.g., addresses.workStreet
                const baseKey = attr.split('.').pop();
                if (baseKey && map[baseKey] !== undefined) return map[baseKey];
            }
        }

        return map[attr] !== undefined ? map[attr] : '';
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

    async handleCancelExport() {
        console.log('🛑 Canceling export process...');

        // Ask backend to cancel
        try {
            const resp = await fetch('/api/export/cancel', { method: 'POST', headers: { 'Accept': 'application/json' } });
            // Best-effort: don't block on cancel errors
            if (!resp.ok) {
                const t = await resp.text();
                console.warn('Backend cancel returned non-OK:', t);
            }
        } catch (e) {
            console.warn('Cancel request failed (continuing UI cleanup):', e);
        }

        // Stop polling
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
        this.app?.showNotification?.('Export cancelled successfully', 'info');

        // Reset progress
        const progressBar = document.getElementById('export-progress-bar');
        const progressText = document.getElementById('export-progress-text');
        const progressTextLeft = document.getElementById('export-progress-text-left');
        const usersProcessed = document.getElementById('users-processed');
        const ignoredUsersEl = document.getElementById('ignored-users');
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
        if (progressTextLeft) progressTextLeft.textContent = '0%';
        if (usersProcessed) usersProcessed.textContent = '0';
        if (ignoredUsersEl) ignoredUsersEl.textContent = '0';

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
