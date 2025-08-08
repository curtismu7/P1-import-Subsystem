/**
 * Export Page Module
 * Handles user export functionality from PingOne populations
 */

export class ExportPage {
    constructor(app) {
        this.app = app;
        this.selectedPopulation = null;
        this.lastTokenValidity = null; // Track token validity changes
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
                                        <option value="">Loading populations...</option>
                                    </select>
                                    <button type="button" id="refresh-populations" class="btn btn-outline-secondary">
                                        <i class="icon-refresh"></i>
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
                            <button id="preview-export" class="btn btn-outline-primary" disabled>
                                <i class="icon-eye"></i> Preview Export
                            </button>
                            <button id="start-export" class="btn btn-primary" disabled>
                                <i class="icon-download"></i> Start Export
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
                            <button id="cancel-export" class="btn btn-warning" style="display: none;">
                                <i class="icon-x"></i> Cancel Export
                            </button>
                        </div>
                    </div>
                </section>

                <!-- Export Results -->
                <section id="export-results" class="export-section" style="display: none;">
                    <div class="export-box">
                        <h3 class="section-title">Export Complete</h3>
                        <p>Your export has been completed successfully</p>
                        
                        <div id="export-summary" class="results-container">
                            <!-- Results will be populated here -->
                        </div>
                        
                        <div class="export-actions">
                            <button id="download-export" class="btn btn-success">
                                <i class="icon-download"></i> Download Export File
                            </button>
                            <button id="new-export" class="btn btn-outline-primary">
                                <i class="icon-refresh"></i> Start New Export
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

        // Attribute selection
        const attributeCheckboxes = document.querySelectorAll('#attributes-selection input[type="checkbox"]');
        attributeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateExportOptions());
        });

        // Action buttons
        const previewBtn = document.getElementById('preview-export');
        const startBtn = document.getElementById('start-export');
        const downloadBtn = document.getElementById('download-export');
        const newExportBtn = document.getElementById('new-export');

        if (previewBtn) previewBtn.addEventListener('click', () => this.handlePreviewExport());
        if (startBtn) startBtn.addEventListener('click', () => this.handleStartExport());
        if (downloadBtn) downloadBtn.addEventListener('click', () => this.handleDownloadExport());
        if (newExportBtn) newExportBtn.addEventListener('click', () => this.handleNewExport());
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
            
            // Update population info display
            if (populationInfo) {
                document.getElementById('pop-name').textContent = this.selectedPopulation.name || '-';
                document.getElementById('pop-count').textContent = this.selectedPopulation.userCount || '0';
                document.getElementById('pop-description').textContent = this.selectedPopulation.description || 'No description';
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
        if (!this.selectedPopulation) return;

        try {
            this.updateExportOptions();
            
            // Show preview modal or section
            this.app.showNotification('Export preview functionality will be implemented soon', 'info');
            
        } catch (error) {
            console.error('Error previewing export:', error);
            this.app.showNotification('Failed to preview export: ' + error.message, 'error');
        }
    }

    async handleStartExport() {
        if (!this.selectedPopulation) return;

        try {
            this.updateExportOptions();
            
            // Show progress section
            const progressSection = document.getElementById('export-progress');
            const resultsSection = document.getElementById('export-results');
            
            if (progressSection) progressSection.style.display = 'block';
            if (resultsSection) resultsSection.style.display = 'none';

            // Simulate export process (replace with actual API call)
            await this.simulateExport();
            
        } catch (error) {
            console.error('Error starting export:', error);
            this.app.showNotification('Failed to start export: ' + error.message, 'error');
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

        for (let i = 0; i <= total; i += 10) {
            const progress = Math.min((i / total) * 100, 100);
            
            if (progressBar) progressBar.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `${Math.round(progress)}%`;
            if (statusText) statusText.textContent = i === total ? 'Export complete!' : 'Exporting users...';
            if (usersProcessed) usersProcessed.textContent = Math.min(i, total);

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Show results
        setTimeout(() => this.showExportResults(), 1000);
    }

    showExportResults() {
        const progressSection = document.getElementById('export-progress');
        const resultsSection = document.getElementById('export-results');
        const summaryDiv = document.getElementById('export-summary');

        if (progressSection) progressSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'block';

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

    handleDownloadExport() {
        // Simulate file download
        this.app.showNotification('File download functionality will be implemented soon', 'info');
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
