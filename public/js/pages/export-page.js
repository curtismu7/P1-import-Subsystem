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
                                    <option value="xlsx">Excel (XLSX)</option>
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
                            <button type="button" id="preview-export" class="btn btn-outline-info">
                                <i class="mdi mdi-eye"></i> Preview Export
                            </button>
                            <button type="button" id="start-export" class="btn btn-primary" disabled>
                                <i class="mdi mdi-download"></i> Start Export
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
                            <div class="progress-bar">
                                <div id="export-progress-bar" class="progress-fill" style="width: 0%;"></div>
                            </div>
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
        
        if (format === 'csv') {
            let csv = '';
            if (includeHeaders) {
                const headers = selectedAttributes.map(attr => this.getAttributeDisplayName(attr));
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
                
                const row = selectedAttributes.map(attr => {
                    if (attr === 'status') return user.status;
                    const value = this.getAttributeValue(attr, user.index);
                    if (attr === 'custom' && (value === undefined || value === null || value === '' || value === '{}' || value === '[]')) {
                        return '';
                    }
                    return value;
                });
                csv += row.join(',') + '\n';
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
                    const userObj = {};
                selectedAttributes.forEach(attr => {
                    const key = this.getAttributeKey(attr);
                    if (attr === 'status') {
                        userObj[key] = user.status;
                        return;
                    }
                    const value = this.getAttributeValue(attr, user.index);
                    if (attr === 'custom' && (value === undefined || value === null || value === '' || value === '{}' || value === '[]')) {
                        userObj[key] = '';
                    } else {
                        userObj[key] = value;
                    }
                });
                    return userObj;
                });
            
            return JSON.stringify(users, null, 2);
        } else if (format === 'xlsx') {
            return 'Excel file preview not available in browser.\nFile would contain the same data as CSV format.';
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
                
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `${Math.round(progress)}%`;
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
            summaryDiv.innerHTML = `
                <div class="alert alert-success">
                    <h4>Export Successful!</h4>
                    <p>Successfully exported ${this.selectedPopulation.userCount || 0} users from population "${this.selectedPopulation.name}"</p>
                </div>
                <div class="export-stats">
                    <div class="stat-item">
                        <span class="label">File Format:</span>
                        <span class="value">${this.exportOptions.format.toUpperCase()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">File Size:</span>
                        <span class="value">~${Math.round((this.selectedPopulation.userCount || 0) * 0.5)}KB</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">Export Time:</span>
                        <span class="value">${new Date().toLocaleTimeString()}</span>
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
        
        if (format === 'csv') {
            let csv = '';
            if (includeHeaders) {
                // Build header row based on selected attributes
                const headers = selectedAttributes.map(attr => this.getAttributeDisplayName(attr));
                csv += headers.join(',') + '\n';
            }
            
            // Generate sample data based on population size
            const userCount = this.selectedPopulation.userCount || 100;
            for (let i = 1; i <= userCount; i++) {
                // Skip disabled users if not included
                const userStatus = this.getAttributeValue('status', i);
                if (!includeDisabled && userStatus === 'Disabled') {
                    continue;
                }
                
                const row = selectedAttributes.map(attr => {
                    const value = this.getAttributeValue(attr, i);
                    if (attr === 'custom' && (value === undefined || value === null || value === '' || value === '{}' || value === '[]')) {
                        return '';
                    }
                    return value;
                });
                csv += row.join(',') + '\n';
            }
            
            return { content: csv, type: 'csv' };
            
        } else if (format === 'json') {
            const userCount = this.selectedPopulation.userCount || 100;
            const users = [];
            
            for (let i = 1; i <= userCount; i++) {
                // Skip disabled users if not included
                const userStatus = this.getAttributeValue('status', i);
                if (!includeDisabled && userStatus === 'Disabled') {
                    continue;
                }
                
                const user = {};
                selectedAttributes.forEach(attr => {
                    user[this.getAttributeKey(attr)] = this.getAttributeValue(attr, i);
                });
                users.push(user);
            }
            
            return { content: JSON.stringify(users, null, 2), type: 'json' };
            
        } else if (format === 'xlsx') {
            // For XLSX, we'll create a CSV-like format that Excel can open
            let xlsxContent = '';
            if (includeHeaders) {
                const headers = selectedAttributes.map(attr => this.getAttributeDisplayName(attr));
                xlsxContent += headers.join('\t') + '\n';
            }
            
            const userCount = this.selectedPopulation.userCount || 100;
            for (let i = 1; i <= userCount; i++) {
                // Skip disabled users if not included
                const userStatus = this.getAttributeValue('status', i);
                if (!includeDisabled && userStatus === 'Disabled') {
                    continue;
                }
                
                const row = selectedAttributes.map(attr => {
                    const value = this.getAttributeValue(attr, i);
                    if (attr === 'custom' && (value === undefined || value === null || value === '' || value === '{}' || value === '[]')) {
                        return '';
                    }
                    return value;
                });
                xlsxContent += row.join('\t') + '\n';
            }
            
            return { content: xlsxContent, type: 'xlsx' };
        }
        
        return { content: 'Export data not available', type: 'txt' };
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
            case 'xlsx':
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
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
