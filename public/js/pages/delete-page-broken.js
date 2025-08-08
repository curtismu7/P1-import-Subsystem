/**
 * Delete Users Page Module
 * 
 * Handles the Delete Users page functionality including:
 * - Population selection for user deletion
 * - Bulk user deletion with confirmation
 * - Progress tracking and results display
 * - Safety confirmations and warnings
 */

export class DeletePage {
    constructor(app) {
        this.app = app;
        this.selectedPopulation = '';
        this.deleteInProgress = false;
        this.deletedUsers = [];
        this.errors = [];
    }

    async load() {
        console.log('📄 Loading Delete page...');
        
        const contentBody = document.getElementById('content-body');
        if (!contentBody) {
            console.error('❌ Content body not found');
            return;
        }

        contentBody.innerHTML = `
            <div class="page-header">
                <h1>Delete Users</h1>
                <p>Remove users from PingOne populations</p>
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Warning:</strong> User deletion is permanent and cannot be undone. Please proceed with caution.
                </div>
            </div>

            <div class="delete-container">
                <!-- Population Selection -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h3>Select Population</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label for="population-select">Choose a population to delete users from:</label>
                            <select id="population-select" class="form-control">
                                <option value="">Select a population...</option>
                            </select>
                            <small class="form-text text-muted">
                                Only populations with users will be shown.
                            </small>
                        </div>
                        <button id="load-users-btn" class="btn btn-primary" disabled>
                            <i class="fas fa-users"></i> Load Users
                        </button>
                    </div>
                </div>

                <!-- User Selection -->
                <div id="user-selection-section" class="card mb-4" style="display: none;">
                    <div class="card-header">
                        <h3>Select Users to Delete</h3>
                        <div class="float-right">
                            <button id="select-all-btn" class="btn btn-sm btn-outline-secondary">
                                Select All
                            </button>
                            <button id="deselect-all-btn" class="btn btn-sm btn-outline-secondary">
                                Deselect All
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div id="users-loading" class="text-center" style="display: none;">
                            <div class="spinner-border" role="status">
                                <span class="sr-only">Loading users...</span>
                            </div>
                            <p>Loading users from population...</p>
                        </div>
                        
                        <div id="users-list" class="users-grid">
                            <!-- Users will be populated here -->
                        </div>
                        
                        <div id="selected-count" class="mt-3">
                            <strong>Selected: <span id="count-display">0</span> users</strong>
                        </div>
                    </div>
                </div>

                <!-- Delete Options -->
                <div id="delete-options-section" class="card mb-4" style="display: none;">
                    <div class="card-header">
                        <h3>Delete Options</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="confirm-delete">
                                <label class="form-check-label" for="confirm-delete">
                                    <strong>I understand that this action cannot be undone</strong>
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="backup-confirmation">
                                <label class="form-check-label" for="backup-confirmation">
                                    I have backed up any important user data
                                </label>
                            </div>
                        </div>

                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Final Warning:</strong> Once deleted, users cannot be recovered. 
                            Make sure you have exported any necessary data before proceeding.
                        </div>
                    </div>
                </div>

                <!-- Delete Progress -->
                <div id="delete-progress-section" class="card mb-4" style="display: none;">
                    <div class="card-header">
                        <h3>Delete Progress</h3>
                    </div>
                    <div class="card-body">
                        <div class="progress mb-3">
                            <div id="delete-progress-bar" class="progress-bar" role="progressbar" 
                                 style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                                0%
                            </div>
                        </div>
                        
                        <div id="delete-status" class="mb-3">
                            <p><strong>Status:</strong> <span id="status-text">Ready to start</span></p>
                            <p><strong>Processed:</strong> <span id="processed-count">0</span> / <span id="total-count">0</span></p>
                            <p><strong>Deleted:</strong> <span id="deleted-count">0</span></p>
                            <p><strong>Errors:</strong> <span id="error-count">0</span></p>
                        </div>

                        <div id="delete-log" class="delete-log">
                            <!-- Delete log entries will appear here -->
                        </div>
                    </div>
                </div>

                <!-- Results -->
                <div id="results-section" class="card" style="display: none;">
                    <div class="card-header">
                        <h3>Delete Results</h3>
                    </div>
                    <div class="card-body">
                        <div id="results-summary" class="mb-3">
                            <!-- Results summary will be populated here -->
                        </div>
                        
                        <div id="error-details" style="display: none;">
                            <h4>Errors:</h4>
                            <div id="error-list" class="error-list">
                                <!-- Error details will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="action-buttons mt-4">
                    <button id="start-delete-btn" class="btn btn-danger" disabled>
                        <i class="fas fa-trash"></i> Delete Selected Users
                    </button>
                    <button id="cancel-delete-btn" class="btn btn-secondary" style="display: none;">
                        <i class="fas fa-stop"></i> Cancel Delete
                    </button>
                    <button id="reset-delete-btn" class="btn btn-outline-secondary" style="display: none;">
                        <i class="fas fa-redo"></i> Start Over
                    </button>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.loadPopulations();
    }

    setupEventListeners() {
        // Population selection
        const populationSelect = document.getElementById('population-select');
        const loadUsersBtn = document.getElementById('load-users-btn');
        
        populationSelect?.addEventListener('change', (e) => {
            this.handlePopulationChange(e.target.value);
        });

        loadUsersBtn?.addEventListener('click', () => {
            this.loadUsers();
        });

        // User selection
        const selectAllBtn = document.getElementById('select-all-btn');
        const deselectAllBtn = document.getElementById('deselect-all-btn');
        
        selectAllBtn?.addEventListener('click', () => {
            this.selectAllUsers();
        });

        deselectAllBtn?.addEventListener('click', () => {
            this.deselectAllUsers();
        });

        // Delete options
        const confirmDelete = document.getElementById('confirm-delete');
        const backupConfirmation = document.getElementById('backup-confirmation');
        
        confirmDelete?.addEventListener('change', () => {
            this.updateDeleteButton();
        });

        backupConfirmation?.addEventListener('change', () => {
            this.updateDeleteButton();
        });

        // Action buttons
        const startDeleteBtn = document.getElementById('start-delete-btn');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        const resetDeleteBtn = document.getElementById('reset-delete-btn');

        startDeleteBtn?.addEventListener('click', () => {
            this.startDelete();
        });

        cancelDeleteBtn?.addEventListener('click', () => {
            this.cancelDelete();
        });

        resetDeleteBtn?.addEventListener('click', () => {
            this.resetDelete();
        });
    }

    async loadPopulations() {
        const populationSelect = document.getElementById('population-select');
        if (!populationSelect) return;

        try {
            // Check if we have a valid token
            const tokenStatus = this.app.tokenStatus;
            if (!tokenStatus || !tokenStatus.isValid) {
                populationSelect.innerHTML = '<option value="">Please configure PingOne settings and obtain a valid token first</option>';
                return;
            }

            populationSelect.innerHTML = '<option value="">Loading populations...</option>';

            const response = await fetch('/api/pingone/populations');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const populations = await response.json();
            
            populationSelect.innerHTML = '<option value="">Select a population...</option>';
            
            if (populations && populations.length > 0) {
                populations.forEach(pop => {
                    const option = document.createElement('option');
                    option.value = pop.id;
                    option.textContent = `${pop.name} (${pop.userCount || 0} users)`;
                    populationSelect.appendChild(option);
                });
            } else {
                populationSelect.innerHTML = '<option value="">No populations found</option>';
            }
        } catch (error) {
            console.error('❌ Error loading populations:', error);
            populationSelect.innerHTML = '<option value="">Error loading populations</option>';
        }
    }

    handlePopulationChange(populationId) {
        this.selectedPopulation = populationId;
        const loadUsersBtn = document.getElementById('load-users-btn');
        
        if (loadUsersBtn) {
            loadUsersBtn.disabled = !populationId;
        }

        // Hide subsequent sections
        this.hideSection('user-selection-section');
        this.hideSection('delete-options-section');
        this.hideSection('delete-progress-section');
        this.hideSection('results-section');
    }

    async loadUsers() {
        if (!this.selectedPopulation) return;

        const usersLoading = document.getElementById('users-loading');
        const usersList = document.getElementById('users-list');
        const userSelectionSection = document.getElementById('user-selection-section');

        try {
            this.showSection('user-selection-section');
            usersLoading.style.display = 'block';
            usersList.innerHTML = '';

            // Simulate loading users (replace with actual API call)
            const response = await fetch(`/api/pingone/populations/${this.selectedPopulation}/users`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const users = await response.json();
            
            usersLoading.style.display = 'none';
            
            if (users && users.length > 0) {
                this.renderUsers(users);
            } else {
                usersList.innerHTML = '<p class="text-muted">No users found in this population.</p>';
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
                           value="${user.id}" id="user-${user.id}">
                    <label class="form-check-label" for="user-${user.id}">
                        <div class="user-info">
                            <strong>${user.name || user.username || 'Unknown User'}</strong>
                            <br>
                            <small class="text-muted">${user.email || 'No email'}</small>
                            <br>
                            <small class="text-muted">ID: ${user.id}</small>
                        </div>
                    </label>
                </div>
            </div>
        `).join('');

        // Add event listeners to checkboxes
        const checkboxes = usersList.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectedCount();
            });
        });

        this.updateSelectedCount();
    }

    selectAllUsers() {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateSelectedCount();
    }

    deselectAllUsers() {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.user-checkbox:checked');
        const countDisplay = document.getElementById('count-display');
        
        if (countDisplay) {
            countDisplay.textContent = checkboxes.length;
        }

        // Show delete options if users are selected
        if (checkboxes.length > 0) {
            this.showSection('delete-options-section');
        } else {
            this.hideSection('delete-options-section');
        }

        this.updateDeleteButton();
    }

    updateDeleteButton() {
        const startDeleteBtn = document.getElementById('start-delete-btn');
        const confirmDelete = document.getElementById('confirm-delete');
        const backupConfirmation = document.getElementById('backup-confirmation');
        const selectedUsers = document.querySelectorAll('.user-checkbox:checked');

        if (startDeleteBtn) {
            startDeleteBtn.disabled = !(
                selectedUsers.length > 0 &&
                confirmDelete?.checked &&
                backupConfirmation?.checked
            );
        }
    }

    async startDelete() {
        const selectedUsers = document.querySelectorAll('.user-checkbox:checked');
        const userIds = Array.from(selectedUsers).map(cb => cb.value);

        if (userIds.length === 0) return;

        // Final confirmation
        const confirmed = confirm(`Are you absolutely sure you want to delete ${userIds.length} users? This action cannot be undone.`);
        if (!confirmed) return;

        this.deleteInProgress = true;
        this.deletedUsers = [];
        this.errors = [];

        this.showSection('delete-progress-section');
        this.updateDeleteProgress(0, userIds.length, 'Starting delete process...');

        const startDeleteBtn = document.getElementById('start-delete-btn');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        
        if (startDeleteBtn) startDeleteBtn.style.display = 'none';
        if (cancelDeleteBtn) cancelDeleteBtn.style.display = 'inline-block';

        try {
            await this.performDelete(userIds);
        } catch (error) {
            console.error('❌ Delete process failed:', error);
            this.errors.push({ message: 'Delete process failed', error: error.message });
        } finally {
            this.deleteInProgress = false;
            this.showResults();
        }
    }

    async performDelete(userIds) {
        const total = userIds.length;
        
        for (let i = 0; i < userIds.length; i++) {
            if (!this.deleteInProgress) break; // Check if cancelled

            const userId = userIds[i];
            this.updateDeleteProgress(i, total, `Deleting user ${i + 1} of ${total}...`);

            try {
                // Simulate delete operation (replace with actual API call)
                await this.deleteUser(userId);
                this.deletedUsers.push(userId);
                this.addToDeleteLog(`✅ Successfully deleted user ${userId}`, 'success');
            } catch (error) {
                this.errors.push({ userId, error: error.message });
                this.addToDeleteLog(`❌ Failed to delete user ${userId}: ${error.message}`, 'error');
            }

            // Update progress
            this.updateDeleteProgress(i + 1, total, 
                i + 1 === total ? 'Delete process completed' : `Deleting user ${i + 2} of ${total}...`);
        }
    }

    async deleteUser(userId) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simulate random success/failure for demo
        if (Math.random() < 0.1) { // 10% failure rate for demo
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
        
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        const resetDeleteBtn = document.getElementById('reset-delete-btn');
        
        if (cancelDeleteBtn) cancelDeleteBtn.style.display = 'none';
        if (resetDeleteBtn) resetDeleteBtn.style.display = 'inline-block';
    }

    showResults() {
        this.showSection('results-section');
        
        const resultsSummary = document.getElementById('results-summary');
        const errorDetails = document.getElementById('error-details');
        
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

        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        const resetDeleteBtn = document.getElementById('reset-delete-btn');
        
        if (cancelDeleteBtn) cancelDeleteBtn.style.display = 'none';
        if (resetDeleteBtn) resetDeleteBtn.style.display = 'inline-block';
    }

    resetDelete() {
        // Reset all state
        this.selectedPopulation = '';
        this.deleteInProgress = false;
        this.deletedUsers = [];
        this.errors = [];

        // Reset form
        const populationSelect = document.getElementById('population-select');
        if (populationSelect) populationSelect.value = '';

        // Hide all sections except the first one
        this.hideSection('user-selection-section');
        this.hideSection('delete-options-section');
        this.hideSection('delete-progress-section');
        this.hideSection('results-section');

        // Reset buttons
        const startDeleteBtn = document.getElementById('start-delete-btn');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        const resetDeleteBtn = document.getElementById('reset-delete-btn');
        const loadUsersBtn = document.getElementById('load-users-btn');

        if (startDeleteBtn) {
            startDeleteBtn.style.display = 'inline-block';
            startDeleteBtn.disabled = true;
        }
        if (cancelDeleteBtn) cancelDeleteBtn.style.display = 'none';
        if (resetDeleteBtn) resetDeleteBtn.style.display = 'none';
        if (loadUsersBtn) loadUsersBtn.disabled = true;

        // Reset checkboxes
        const confirmDelete = document.getElementById('confirm-delete');
        const backupConfirmation = document.getElementById('backup-confirmation');
        if (confirmDelete) confirmDelete.checked = false;
        if (backupConfirmation) backupConfirmation.checked = false;
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
        // Check if page is loaded before trying to access DOM elements
        const populationSelect = document.getElementById('population-select');
        if (!populationSelect) {
            return; // Page not loaded yet, skip update
        }
        
        if (tokenStatus && tokenStatus.isValid) {
            this.loadPopulations();
        }
    }

    async performDelete(userIds) {
        const total = userIds.length;
        
        for (let i = 0; i < userIds.length; i++) {
            if (!this.deleteInProgress) break; // Check if cancelled

            const userId = userIds[i];
            this.updateDeleteProgress(i, total, `Deleting user ${i + 1} of ${total}...`);

            try {
                // Simulate delete operation (replace with actual API call)
                await this.deleteUser(userId);
                this.deletedUsers.push(userId);
                this.addToDeleteLog(`✅ Successfully deleted user ${userId}`, 'success');
            } catch (error) {
                this.errors.push({ userId, error: error.message });
                this.addToDeleteLog(`❌ Failed to delete user ${userId}: ${error.message}`, 'error');
            }

            // Update progress
                i + 1 === total ? 'Delete process completed' : `Deleting user ${i + 2} of ${total}...`);
        }
    }

    async deleteUser(userId) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
                
        // Simulate random success/failure for demo
        if (Math.random() < 0.1) { // 10% failure rate for demo
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
        
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const resetDeleteBtn = document.getElementById('reset-delete-btn');
        
if (cancelDeleteBtn) cancelDeleteBtn.style.display = 'none';
if (resetDeleteBtn) resetDeleteBtn.style.display = 'inline-block';
}

showResults() {
this.showSection('results-section');
        
const resultsSummary = document.getElementById('results-summary');
const errorDetails = document.getElementById('error-details');
        
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

const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const resetDeleteBtn = document.getElementById('reset-delete-btn');
        
if (cancelDeleteBtn) cancelDeleteBtn.style.display = 'none';
if (resetDeleteBtn) resetDeleteBtn.style.display = 'inline-block';
}

resetDelete() {
// Reset all state
this.selectedPopulation = '';
this.deleteInProgress = false;
this.deletedUsers = [];
this.errors = [];

// Reset form
const populationSelect = document.getElementById('population-select');
if (populationSelect) populationSelect.value = '';

// Hide all sections except the first one
this.hideSection('user-selection-section');
this.hideSection('delete-options-section');
this.hideSection('delete-progress-section');
this.hideSection('results-section');

// Reset buttons
const startDeleteBtn = document.getElementById('start-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const resetDeleteBtn = document.getElementById('reset-delete-btn');
const loadUsersBtn = document.getElementById('load-users-btn');

if (startDeleteBtn) {
    startDeleteBtn.style.display = 'inline-block';
    startDeleteBtn.disabled = true;
}
if (cancelDeleteBtn) cancelDeleteBtn.style.display = 'none';
if (resetDeleteBtn) resetDeleteBtn.style.display = 'none';
if (loadUsersBtn) loadUsersBtn.disabled = true;

// Reset checkboxes
const confirmDelete = document.getElementById('confirm-delete');
const backupConfirmation = document.getElementById('backup-confirmation');
if (confirmDelete) confirmDelete.checked = false;
if (backupConfirmation) backupConfirmation.checked = false;
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
// Check if page is loaded before trying to access DOM elements
const populationSelect = document.getElementById('population-select');
if (!populationSelect) {
    return; // Page not loaded yet, skip update
}
        
if (tokenStatus && tokenStatus.isValid) {
    this.loadPopulations();
}
}

// Called when settings change
onSettingsChange(settings) {
if (settings) {
    this.loadPopulations();
}
}
}
