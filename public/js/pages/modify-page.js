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
        this.selectedPopulation = '';
        this.lastTokenValidity = null; // Track token validity changes
        this.selectedUsers = [];
        this.modifyInProgress = false;
        this.modifiedUsers = [];
        this.errors = [];
    }

    async load() {
        console.log('📄 Loading Modify page...');
        
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
                <!-- Population Selection -->
                <section class="modify-section">
                    <div class="modify-box">
                        <h3 class="section-title">Select Population</h3>
                        <p>Choose the population containing users you want to modify</p>
                        
                        <div class="config-grid">
                            <div class="form-group">
                                <label for="modify-population-select">Population *</label>
                                <div class="input-group">
                                    <select id="modify-population-select" class="form-control">
                                        <option value="">Select a population...</option>
                                    </select>
                                    <button type="button" id="refresh-populations" class="btn btn-outline-secondary">
                                        <i class="icon-refresh"></i>
                                    </button>
                                </div>
                                <div class="form-help">Select the population containing users to modify</div>
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button id="load-users-btn" class="btn btn-primary" disabled>
                                <i class="fas fa-users"></i> Load Users
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
                                <i class="icon-check-square"></i> Select All
                            </button>
                            <button id="deselect-all-btn" class="btn btn-outline-secondary">
                                <i class="icon-square"></i> Deselect All
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
                            <i class="fas fa-info-circle"></i>
                            Only fill in the fields you want to modify. Empty fields will be ignored.
                        </div>
                        
                        <div class="export-actions">
                            <button id="start-modify-btn" class="btn btn-primary" disabled>
                                <i class="fas fa-edit"></i> Start Modification
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
                            <div class="progress-bar">
                                <div id="modify-progress-bar" class="progress-fill" style="width: 0%;"></div>
                            </div>
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
                                <i class="fas fa-stop"></i> Cancel Modification
                            </button>
                            <button id="reset-modify-btn" class="btn btn-secondary" style="display: none;">
                                <i class="fas fa-redo"></i> Start Over
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
                                <i class="icon-download"></i> Download Log
                            </button>
                            <button type="button" id="new-modification" class="btn btn-outline-primary">
                                <i class="icon-refresh"></i> New Modification
                            </button>
                        </div>
                    </div>
                </section>
        `;

        this.setupEventListeners();
        this.loadPopulations();
    }

    setupEventListeners() {
        // Population selection
        document.getElementById('modify-population-select')?.addEventListener('change', (e) => {
            this.handlePopulationChange(e.target.value);
        });

        document.getElementById('load-users-btn')?.addEventListener('click', () => {
            this.loadUsers();
        });

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

    handlePopulationChange(populationId) {
        this.selectedPopulation = populationId;
        document.getElementById('load-users-btn').disabled = !populationId;

        // Hide subsequent sections
        this.hideSection('user-selection-section');
        this.hideSection('modify-options-section');
        this.hideSection('modify-progress-section');
        this.hideSection('results-section');
    }

    async loadUsers() {
        if (!this.selectedPopulation) return;

        const usersLoading = document.getElementById('users-loading');
        const usersList = document.getElementById('users-list');

        try {
            this.showSection('user-selection-section');
            usersLoading.style.display = 'block';
            usersList.innerHTML = '';

            // Simulate loading users
            const users = [
                { id: '1', name: 'John Doe', email: 'john@example.com' },
                { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
                { id: '3', name: 'Bob Johnson', email: 'bob@example.com' }
            ];
            
            usersLoading.style.display = 'none';
            this.renderUsers(users);
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
        if (modifications.length === 0) return;

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
            if (!this.modifyInProgress) break;

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
        const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.textContent = `${percentage}%`;
        }

        document.getElementById('status-text').textContent = status;
        document.getElementById('processed-count').textContent = processed;
        document.getElementById('total-count').textContent = total;
        document.getElementById('modified-count').textContent = this.modifiedUsers.length;
        document.getElementById('error-count').textContent = this.errors.length;
    }

    addToModifyLog(message, type = 'info') {
        const modifyLog = document.getElementById('modify-log');
        if (!modifyLog) return;

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
            if (element) element.value = '';
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
        if (section) section.style.display = 'block';
    }

    hideSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) section.style.display = 'none';
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
