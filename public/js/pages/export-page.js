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
                                <select id="export-format" class="form-control">
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
                                 <select id="export-profile" class="form-control">
                                     <option value="none">None (default)</option>
                                     <option value="pingone">PingOne re-import template</option>
                                     <option value="ad">AD/LDAP-friendly (sAMAccountName, DN)</option>
                                     <option value="okta">Okta/AzureAD-style headers</option>
                                     <option value="siem">SIEM profile (flattened)</option>
                                 </select>
                             </div>
                            <div class="form-group">
                                <label for="export-encoding">Character Encoding</label>
                                <select id="export-encoding" class="form-control">
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
                            </div>
                            <div id="attributes-selection" class="attributes-grid">
                                <div class="form-check">
                                    <input type="checkbox" id="attr-username" class="form-check-input" checked disabled>
                                    <label for="attr-username" class="form-check-label">Username (Required)</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="attr-email" class="form-check-input" checked>
                                    <label for="attr-email" class="form-check-label">Email</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="attr-firstname" class="form-check-input" checked>
                                    <label for="attr-firstname" class="form-check-label">First Name</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="attr-lastname" class="form-check-input" checked>
                                    <label for="attr-lastname" class="form-check-label">Last Name</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="attr-status" class="form-check-input">
                                    <label for="attr-status" class="form-check-label">Status</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="attr-groups" class="form-check-input">
                                    <label for="attr-groups" class="form-check-label">Groups</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="attr-roles" class="form-check-input">
                                    <label for="attr-roles" class="form-check-label">Roles</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="attr-custom" class="form-check-input">
                                    <label for="attr-custom" class="form-check-label">Custom Attributes</label>
                                </div>
                            </div>
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
        const attributeCheckboxes = document.querySelectorAll('#attributes-selection input[type="checkbox"]');
        attributeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateExportOptions());
        });

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
            
            // Show progress section
            const progressSection = document.getElementById('export-progress');
            const resultsSection = document.getElementById('export-results');
            const cancelBtn = document.getElementById('cancel-export');
            
            if (progressSection) progressSection.style.display = 'block';
            if (resultsSection) resultsSection.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'inline-block';

            // Scroll to progress section
            this.scrollToSection(progressSection);

            // Simulate export process (replace with actual API call)
            await this.simulateExport();
            
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

                    <div class="result-details">
                        <h4>Export Details</h4>
                        <ul>
                            <li><strong>Target Population:</strong> ${this.selectedPopulation.name}</li>
                            <li><strong>File:</strong> ${this.generateFileName()}</li>
                            <li><strong>Completed:</strong> ${new Date().toLocaleString()}</li>
                        </ul>
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
