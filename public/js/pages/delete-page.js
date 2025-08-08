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
        this.selectedPopulation = '';
        this.lastTokenValidity = null; // Track token validity changes
        this.deleteInProgress = false;
        this.deletedUsers = [];
        this.errors = [];
    }

    async load() {
        console.log('📄 Loading Delete page...');
        
        const deletePage = document.getElementById('delete-page');
        if (!deletePage) {
            console.error('❌ Delete page div not found');
            return;
        }

        deletePage.innerHTML = `
            <div class="page-header">
                <h1>Delete Users</h1>
                <p>Remove users from a population. Use with caution.</p>
            </div>

            <div class="delete-container">
                <!-- Population Selection -->
                <section class="delete-section">
                    <div class="delete-box">
                        <h3 class="section-title">Select Population</h3>
                        <p>Choose the population from which you want to delete users</p>
                        
                        <div class="config-grid">
                            <div class="form-group">
                                <label for="delete-population-select">Population *</label>
                                <div class="input-group">
                                    <select id="delete-population-select" class="form-control">
                                        <option value="">Select a population...</option>
                                    </select>
                                    <button type="button" id="refresh-populations" class="btn btn-outline-secondary">
                                        <i class="icon-refresh"></i>
                                    </button>
                                </div>
                                <div class="form-help">Select the population containing users to delete</div>
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
                <section id="user-selection-section" class="delete-section" style="display: none;">
                    <div class="delete-box">
                        <h3 class="section-title">Select Users to Delete</h3>
                        <p>Choose which users you want to permanently delete</p>
                        
                        <div class="export-actions mb-3">
                            <button id="select-all-users" class="btn btn-outline-secondary">
                                <i class="icon-check-square"></i> Select All
                            </button>
                            <button id="deselect-all-users" class="btn btn-outline-secondary">
                                <i class="icon-square"></i> Deselect All
                            </button>
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

                <!-- Delete Options -->
                <section id="delete-options-section" class="delete-section" style="display: none;">
                    <div class="delete-box">
                        <h3 class="section-title">Delete Confirmation</h3>
                        <p class="text-danger">⚠️ This action cannot be undone. Please confirm your understanding.</p>
                        
                        <div class="options-group">
                            <h4>Safety Confirmations</h4>
                            <div class="checkbox-grid">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="confirm-delete">
                                    <label class="form-check-label text-danger" for="confirm-delete">
                                        I understand that this action will permanently delete the selected users
                                    </label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="backup-confirmation">
                                    <label class="form-check-label text-danger" for="backup-confirmation">
                                        I have backed up any important data
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="export-actions">
                            <button id="start-delete-btn" class="btn btn-danger" disabled>
                                <i class="fas fa-trash"></i> Delete Selected Users
                            </button>
                        </div>
                    </div>
                </section>

                <!-- Progress -->
                <section id="delete-progress-section" class="delete-section" style="display: none;">
                    <div class="delete-box">
                        <h3 class="section-title">Delete Progress</h3>
                        <p>Deleting users from your PingOne environment</p>
                        
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div id="delete-progress-bar" class="progress-fill" style="width: 0%;"></div>
                            </div>
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
                                <i class="fas fa-stop"></i> Cancel Delete
                            </button>
                            <button id="reset-delete-btn" class="btn btn-secondary" style="display: none;">
                                <i class="fas fa-redo"></i> Start Over
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
                                <i class="icon-download"></i> Download Log
                            </button>
                            <button type="button" id="new-delete" class="btn btn-outline-primary">
                                <i class="icon-refresh"></i> New Delete
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        `;

        this.setupEventListeners();
        this.loadPopulations();
    }

    setupEventListeners() {
        // Population selection
        document.getElementById('delete-population-select')?.addEventListener('change', (e) => {
            this.selectedPopulation = e.target.value;
            const loadUsersBtn = document.getElementById('load-users-btn');
            if (loadUsersBtn) {
                loadUsersBtn.disabled = !this.selectedPopulation;
            }
        });

        // Load users button
        document.getElementById('load-users-btn')?.addEventListener('click', () => {
            this.loadUsers();
        });

        // User selection buttons
        document.getElementById('select-all-users')?.addEventListener('click', () => {
            this.selectAllUsers(true);
        });

        document.getElementById('deselect-all-users')?.addEventListener('click', () => {
            this.selectAllUsers(false);
        });

        // Confirmation checkboxes
        document.getElementById('confirm-delete')?.addEventListener('change', () => {
            this.updateDeleteButton();
        });

        document.getElementById('backup-confirmation')?.addEventListener('change', () => {
            this.updateDeleteButton();
        });

        // Delete actions
        document.getElementById('start-delete-btn')?.addEventListener('click', () => {
            this.startDelete();
        });

        document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
            this.cancelDelete();
        });

        document.getElementById('reset-delete-btn')?.addEventListener('click', () => {
            this.resetDelete();
        });
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
        if (!this.selectedPopulation) return;

        const usersList = document.getElementById('users-list');
        const userSelectionSection = document.getElementById('user-selection-section');
        
        if (!usersList || !userSelectionSection) return;

        try {
            usersList.innerHTML = '<div class="text-center"><div class="spinner-border"></div><p>Loading users...</p></div>';
            userSelectionSection.style.display = 'block';

            const response = await fetch(`/api/pingone/populations/${this.selectedPopulation}/users`);
            if (response.ok) {
                const users = await response.json();
                this.renderUsers(users);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error loading users:', error);
            usersList.innerHTML = '<div class="alert alert-danger">Error loading users. Please try again.</div>';
        }
    }

    renderUsers(users) {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;

        if (users.length === 0) {
            usersList.innerHTML = '<div class="alert alert-info">No users found in this population.</div>';
            return;
        }

        usersList.innerHTML = users.map(user => `
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
                this.updateDeleteOptionsVisibility();
            });
        });

        this.updateSelectedCount();
    }

    selectAllUsers(select) {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = select;
        });
        this.updateSelectedCount();
        this.updateDeleteOptionsVisibility();
    }

    updateSelectedCount() {
        const selectedCount = document.getElementById('selected-count');
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        if (selectedCount) {
            selectedCount.textContent = checkboxes.length;
        }
    }

    updateDeleteOptionsVisibility() {
        const deleteOptionsSection = document.getElementById('delete-options-section');
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        
        if (deleteOptionsSection) {
            deleteOptionsSection.style.display = checkboxes.length > 0 ? 'block' : 'none';
        }
    }

    updateDeleteButton() {
        const startDeleteBtn = document.getElementById('start-delete-btn');
        const confirmDelete = document.getElementById('confirm-delete');
        const backupConfirmation = document.getElementById('backup-confirmation');
        
        if (startDeleteBtn && confirmDelete && backupConfirmation) {
            startDeleteBtn.disabled = !(confirmDelete.checked && backupConfirmation.checked);
        }
    }

    async startDelete() {
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        const userIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (userIds.length === 0) {
            alert('No users selected for deletion');
            return;
        }

        const confirmed = confirm(`Are you absolutely sure you want to delete ${userIds.length} users? This action cannot be undone.`);
        if (!confirmed) return;

        this.deleteInProgress = true;
        this.deletedUsers = [];
        this.errors = [];

        // Show progress section
        const progressSection = document.getElementById('delete-progress-section');
        const cancelBtn = document.getElementById('cancel-delete-btn');
        
        if (progressSection) progressSection.style.display = 'block';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';

        // Start delete process
        await this.performDelete(userIds);
        
        this.deleteInProgress = false;
        this.showResults();
    }

    async performDelete(userIds) {
        const total = userIds.length;
        
        for (let i = 0; i < userIds.length; i++) {
            if (!this.deleteInProgress) break;

            const userId = userIds[i];
            this.updateDeleteProgress(i, total, `Deleting user ${i + 1} of ${total}...`);

            try {
                await this.deleteUser(userId);
                this.deletedUsers.push(userId);
                this.addToDeleteLog(`✅ Successfully deleted user ${userId}`, 'success');
            } catch (error) {
                this.errors.push({ userId, error: error.message });
                this.addToDeleteLog(`❌ Failed to delete user ${userId}: ${error.message}`, 'error');
            }

            this.updateDeleteProgress(i + 1, total, 
                i + 1 === total ? 'Delete process completed' : `Deleting user ${i + 2} of ${total}...`);
        }
    }

    async deleteUser(userId) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simulate random success/failure for demo
        if (Math.random() < 0.1) {
            throw new Error('User deletion failed');
        }
        
        return { success: true };
    }

    updateDeleteProgress(processed, total, status) {
        const progressBar = document.getElementById('delete-progress-bar');
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

        if (statusText) statusText.textContent = status;
        if (processedCount) processedCount.textContent = processed;
        if (totalCount) totalCount.textContent = total;
        if (deletedCount) deletedCount.textContent = this.deletedUsers.length;
        if (errorCount) errorCount.textContent = this.errors.length;
    }

    addToDeleteLog(message, type = 'info') {
        const deleteLog = document.getElementById('delete-log');
        if (!deleteLog) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-message">${message}</span>
        `;

        deleteLog.appendChild(logEntry);
        deleteLog.scrollTop = deleteLog.scrollHeight;
    }

    cancelDelete() {
        this.deleteInProgress = false;
        this.updateDeleteProgress(this.deletedUsers.length, this.deletedUsers.length + this.errors.length, 'Delete process cancelled');
        
        const cancelBtn = document.getElementById('cancel-delete-btn');
        const resetBtn = document.getElementById('reset-delete-btn');
        
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'inline-block';
    }

    showResults() {
        const resultsSection = document.getElementById('results-section');
        const resultsSummary = document.getElementById('results-summary');
        const errorDetails = document.getElementById('error-details');
        
        if (resultsSection) resultsSection.style.display = 'block';
        
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
        
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'inline-block';
    }

    resetDelete() {
        // Reset all state
        this.selectedPopulation = '';
        this.deleteInProgress = false;
        this.deletedUsers = [];
        this.errors = [];

        // Reset form
        const populationSelect = document.getElementById('delete-population-select');
        if (populationSelect) populationSelect.value = '';

        // Hide sections
        const sections = ['user-selection-section', 'delete-options-section', 'delete-progress-section', 'results-section'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) section.style.display = 'none';
        });

        // Reset buttons
        const loadUsersBtn = document.getElementById('load-users-btn');
        const startDeleteBtn = document.getElementById('start-delete-btn');
        const cancelBtn = document.getElementById('cancel-delete-btn');
        const resetBtn = document.getElementById('reset-delete-btn');

        if (loadUsersBtn) loadUsersBtn.disabled = true;
        if (startDeleteBtn) {
            startDeleteBtn.style.display = 'inline-block';
            startDeleteBtn.disabled = true;
        }
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'none';

        // Reset checkboxes
        const confirmDelete = document.getElementById('confirm-delete');
        const backupConfirmation = document.getElementById('backup-confirmation');
        if (confirmDelete) confirmDelete.checked = false;
        if (backupConfirmation) backupConfirmation.checked = false;
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
}
