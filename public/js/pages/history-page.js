/**
 * History Page Module
 * 
 * Handles the History page functionality including:
 * - Operation history viewing
 * - Activity timeline
 * - History filtering and search
 * - Export history data
 */

export class HistoryPage {
    constructor(app) {
        this.app = app;
        this.history = [];
        this.filteredHistory = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
    }

    async load() {
        console.log('📄 Loading History page...');
        
        const historyPage = document.getElementById('history-page');
        if (!historyPage) {
            console.error('❌ History page div not found');
            return;
        }

        historyPage.innerHTML = `
            <div class="page-header">
                <h1>Operation History</h1>
                <p>View and manage application operation history and activity logs</p>
            </div>

            <div class="history-container">
                <!-- History Controls -->
                <div class="card mb-3">
                    <div class="card-header">
                        <h3>History Controls</h3>
                    </div>
                    <div class="card-body" style="background:#f3f7fb; border:1px solid rgba(0,0,0,0.06); border-radius:12px;">
                        <div class="row" style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                            <div class="col-md-3" style="flex:0 1 300px; min-width:280px; max-width:340px;">
                                <div class="form-group">
                                    <label for="operation-filter">Filter by Operation:</label>
                                    <select id="operation-filter" class="form-control" style="height:36px; max-width:100%;" title="Filter by Operation">
                                        <option value="all">All Operations</option>
                                        <option value="import">Import Users</option>
                                        <option value="export">Export Users</option>
                                        <option value="modify">Modify Users</option>
                                        <option value="delete">Delete Users</option>
                                        <option value="token">Token Operations</option>
                                        <option value="settings">Settings Changes</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-3" style="flex:0 1 260px; min-width:240px; max-width:300px;">
                                <div class="form-group">
                                    <label for="status-filter">Filter by Status:</label>
                                    <select id="status-filter" class="form-control" style="height:36px; max-width:100%;" title="Filter by Status">
                                        <option value="all">All Status</option>
                                        <option value="success">Success</option>
                                        <option value="error">Error</option>
                                        <option value="warning">Warning</option>
                                        <option value="in-progress">In Progress</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-4" style="flex:1 1 420px; min-width:320px; max-width:600px;">
                                <div class="form-group">
                                    <label for="history-search">Search History:</label>
                                    <input type="text" id="history-search" class="form-control" placeholder="Search operations..." style="height:36px;" title="Type to filter by operation, status, description, details, user, or date">
                                </div>
                            </div>
                            <div class="col-md-2" style="flex:0 1 220px; min-width:200px; max-width:260px;">
                                <div class="form-group">
                                    <label for="date-range">Date Range:</label>
                                    <select id="date-range" class="form-control" style="height:36px; max-width:100%;" title="Filter by Date Range">
                                        <option value="all">All Time</option>
                                        <option value="today">Today</option>
                                        <option value="week">This Week</option>
                                        <option value="month">This Month</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        
                    </div>
                </div>

                <!-- History Actions -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h3>History Actions</h3>
                    </div>
                    <div class="card-body" style="display:flex;">
                        <div class="btn-toolbar" style="display:flex; align-items:center; justify-content:space-between; width:100%; background:#f3f4f6; border:2px solid #e5e7eb; border-radius:12px; padding:12px 16px;">
                            <div class="btn-row-left" style="display:flex; gap:12px; align-items:center;">
                                <button id="refresh-history-btn" class="btn btn-primary">
                                    <i class="fas fa-sync me-1"></i><span>Refresh History</span>
                                </button>
                                <button id="clear-history-btn" class="btn btn-danger">
                                    <i class="fas fa-trash me-1"></i><span>Clear History</span>
                                </button>
                            </div>
                            <div class="btn-row-right" style="display:flex; gap:12px; align-items:center;">
                                <button id="export-history-btn" class="btn btn-success">
                                    <i class="fas fa-download me-1"></i><span>Export History</span>
                                </button>
                                <span style="font-weight:600; color:#374151;">Formats:</span>
                                <a href="#" id="export-history-json" class="btn btn-link p-0" title="Structured JSON file (default)">JSON</a>
                                <a href="#" id="export-history-csv" class="btn btn-link p-0" title="Spreadsheet-friendly CSV (Excel/Sheets)">CSV</a>
                                <a href="#" id="export-history-ndjson" class="btn btn-link p-0" title="Newline-delimited JSON for Splunk/ELK/Logstash">NDJSON</a>
                                <a href="#" id="export-history-all" class="btn btn-link p-0" title="Download JSON, CSV, and NDJSON together">All</a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- History Statistics -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h3>History Statistics</h3>
                    </div>
                    <div class="card-body">
                        <div class="stats-section" style="background: #f6fafe; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 12px;">
                            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; align-items: stretch;">
                                <div class="stat-card" style="height: 100%; border:2px solid #1e88e5; border-radius:10px; padding:8px;">
                                    <div class="stat-number" id="total-operations">0</div>
                                    <div class="stat-label">Total Operations</div>
                                </div>
                                <div class="stat-card success" style="height: 100%; border:2px solid #28a745; border-radius:10px; padding:8px;">
                                    <div class="stat-number" id="successful-operations">0</div>
                                    <div class="stat-label">Successful</div>
                                </div>
                                <div class="stat-card error" style="height: 100%; border:2px solid #dc3545; border-radius:10px; padding:8px;">
                                    <div class="stat-number" id="failed-operations">0</div>
                                    <div class="stat-label">Failed</div>
                                </div>
                                <div class="stat-card info" style="height: 100%; border:2px solid #1e88e5; border-radius:10px; padding:8px;">
                                    <div class="stat-number" id="users-processed">0</div>
                                    <div class="stat-label">Users Processed</div>
                                </div>
                                <div class="stat-card warning" style="height: 100%; border:2px solid #f59e0b; border-radius:10px; padding:8px;">
                                    <div class="stat-number" id="operations-today">0</div>
                                    <div class="stat-label">Today</div>
                                </div>
                                <div class="stat-card" style="height: 100%; border:2px solid #1e88e5; border-radius:10px; padding:8px;">
                                    <div class="stat-number" id="avg-duration">0s</div>
                                    <div class="stat-label">Avg Duration</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- History Timeline -->
                <div class="card">
                    <div class="card-header">
                        <h3>Operation Timeline</h3>
                        <div class="float-right">
                            <span id="history-count-display">Showing 0 operations</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="section-divider" style="height: 2px; background: rgba(0,0,0,0.08); border-radius: 2px; margin: 6px 0 16px;"></div>
                        <div id="history-loading" class="text-center" style="display: none;">
                            <div class="spinner-border" role="status"></div>
                            <p>Loading operation history...</p>
                        </div>
                        
                        <div id="history-timeline" class="history-timeline">
                            <div id="no-history" class="text-center text-muted">
                                <i class="fas fa-history fa-3x mb-3"></i>
                                <p>No operation history available. Operations will appear here as you use the application.</p>
                            </div>
                            
                            <div id="history-list" class="history-list">
                                <!-- History entries will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.loadHistory();
    }

    setupEventListeners() {
        // Filter controls
        document.getElementById('operation-filter')?.addEventListener('change', () => {
            this.filterHistory();
        });

        document.getElementById('status-filter')?.addEventListener('change', () => {
            this.filterHistory();
        });

        document.getElementById('history-search')?.addEventListener('input', (e) => {
            this.searchTerm = (e.target.value || '').toString().toLowerCase();
            this.filterHistory();
        });

        document.getElementById('date-range')?.addEventListener('change', () => {
            this.filterHistory();
        });

        // Action buttons
        document.getElementById('refresh-history-btn')?.addEventListener('click', () => {
            this.loadHistory();
        });

        document.getElementById('export-history-btn')?.addEventListener('click', () => {
            // Default export JSON
            this.exportHistory();
        });

        document.getElementById('clear-history-btn')?.addEventListener('click', () => {
            this.clearHistory();
        });

        // Export format handlers
        document.getElementById('export-history-json')?.addEventListener('click', (e) => { e.preventDefault(); this.exportHistorySpecific('json'); });
        document.getElementById('export-history-csv')?.addEventListener('click', (e) => { e.preventDefault(); this.exportHistorySpecific('csv'); });
        document.getElementById('export-history-ndjson')?.addEventListener('click', (e) => { e.preventDefault(); this.exportHistorySpecific('ndjson'); });
        document.getElementById('export-history-all')?.addEventListener('click', (e) => { e.preventDefault(); this.exportHistorySpecific('all'); });
    }

    async loadHistory() {
        const historyLoading = document.getElementById('history-loading');
        const noHistory = document.getElementById('no-history');
        
        try {
            historyLoading.style.display = 'block';
            noHistory.style.display = 'none';

            // Try to load from server first
            try {
                const response = await fetch('/api/history');
                if (response.ok) {
                    const raw = await response.json();
                    // Accept multiple shapes: array or wrapped
                    const serverHistory = Array.isArray(raw)
                        ? raw
                        : (raw.history || raw.data?.history || raw.data?.message?.history || raw.message?.history || raw.items || []);
                    if (Array.isArray(serverHistory) && serverHistory.length) {
                        this.history = serverHistory;
                    } else {
                        throw new Error('Empty server history');
                    }
                } else {
                    throw new Error('Server history not available');
                }
            } catch (error) {
                // Fallback to local storage and generate sample data
                const storedHistory = localStorage.getItem('operation_history');
                if (storedHistory) {
                    this.history = JSON.parse(storedHistory);
                } else {
                    this.history = this.generateSampleHistory();
                    this.saveHistoryToLocal();
                }
            }
            
            historyLoading.style.display = 'none';
            this.filterHistory();
            this.updateStatistics();
        } catch (error) {
            console.error('❌ Error loading history:', error);
            historyLoading.style.display = 'none';
            this.history = this.generateSampleHistory();
            this.filterHistory();
            this.updateStatistics();
        }
    }

    generateSampleHistory() {
        const operations = ['import', 'export', 'modify', 'delete', 'token', 'settings'];
        const statuses = ['success', 'error', 'warning'];
        const descriptions = {
            import: 'Imported users from CSV file',
            export: 'Exported users to CSV file',
            modify: 'Modified user attributes',
            delete: 'Deleted users from population',
            token: 'Refreshed authentication token',
            settings: 'Updated application settings'
        };

        const history = [];
        const now = new Date();

        for (let i = 0; i < 30; i++) {
            const timestamp = new Date(now.getTime() - (i * 3600000)); // 1 hour intervals
            const operation = operations[Math.floor(Math.random() * operations.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const usersProcessed = operation === 'token' || operation === 'settings' ? 0 : 
                Math.floor(Math.random() * 100) + 1;
            const duration = Math.floor(Math.random() * 30000) + 1000; // 1-30 seconds
            
            history.push({
                id: i + 1,
                timestamp: timestamp.toISOString(),
                operation,
                status,
                description: descriptions[operation],
                usersProcessed,
                duration,
                details: `Operation completed with ${status} status`,
                user: 'System User'
            });
        }

        return history.reverse(); // Most recent first
    }

    filterHistory() {
        const operationFilter = document.getElementById('operation-filter')?.value || 'all';
        const statusFilter = document.getElementById('status-filter')?.value || 'all';
        const dateRange = document.getElementById('date-range')?.value || 'all';
        
        // Ensure history is an array
        if (!Array.isArray(this.history)) {
            this.history = [];
        }
        
        this.filteredHistory = this.history.filter(entry => {
            const matchesOperation = operationFilter === 'all' || entry.operation === operationFilter;
            const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
            const searchable = [
                entry.operation,
                entry.status,
                entry.description,
                entry.details,
                entry.user,
                new Date(entry.timestamp).toLocaleString(),
                this.formatDuration(entry.duration)
            ].filter(Boolean).join(' ').toLowerCase();
            const matchesSearch = !this.searchTerm || searchable.includes(this.searchTerm);
            const matchesDate = this.matchesDateRange(entry.timestamp, dateRange);
            
            return matchesOperation && matchesStatus && matchesSearch && matchesDate;
        });

        this.renderHistory();
    }

    matchesDateRange(timestamp, range) {
        if (range === 'all') return true;
        
        const entryDate = new Date(timestamp);
        const now = new Date();
        
        switch (range) {
            case 'today':
                return entryDate.toDateString() === now.toDateString();
            case 'week':
                const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                return entryDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                return entryDate >= monthAgo;
            default:
                return true;
        }
    }

    renderHistory() {
        const historyList = document.getElementById('history-list');
        const noHistory = document.getElementById('no-history');
        const historyCountDisplay = document.getElementById('history-count-display');

        if (this.filteredHistory.length === 0) {
            historyList.innerHTML = '';
            noHistory.style.display = 'block';
            historyCountDisplay.textContent = 'Showing 0 operations';
            return;
        }

        noHistory.style.display = 'none';
        historyCountDisplay.textContent = `Showing ${this.filteredHistory.length} operations`;

        historyList.innerHTML = this.filteredHistory.map((entry, idx) => `
            <div class="history-entry history-${entry.status}" data-entry-id="${entry.id}"
                 style="display:grid; grid-template-columns: 200px 120px 1fr auto; gap: 12px; align-items:center; padding:10px 12px; ${idx>0?'border-top:1px solid rgba(0,0,0,0.08);':''}">
                <div class="history-timestamp" style="color:#374151; font-weight:600;">${new Date(entry.timestamp).toLocaleString()}</div>
                <div class="history-status status-${entry.status}" style="text-transform:uppercase; font-weight:700;">${entry.status}</div>
                <div class="history-message"><span style="color:#6b7280; font-weight:600;">${this.getOperationTitle(entry.operation)}:</span> ${entry.description}</div>
                <div class="history-actions" style="justify-self:end;">
                    <button class="btn btn-sm btn-outline-secondary toggle-details-btn">
                        <i class="fas fa-chevron-down"></i> Details
                    </button>
                </div>
                <div class="history-details" style="grid-column: 1 / -1; color:#374151;">
                    ${entry.usersProcessed > 0 ? `<span class="detail-item me-3">Users: ${entry.usersProcessed}</span>` : ''}
                    <span class="detail-item me-3">Duration: ${this.formatDuration(entry.duration)}</span>
                    <span class="detail-item">User: ${entry.user}</span>
                </div>
                <div class="history-full-details" style="grid-column: 1 / -1; display: none; background:#f9fafb; border:1px solid rgba(0,0,0,0.06); border-radius:8px; padding:8px 10px;">
                    <p><strong>Full Details:</strong></p>
                    <p>${entry.details}</p>
                    <p><strong>Operation ID:</strong> ${entry.id}</p>
                    <p><strong>Timestamp:</strong> ${entry.timestamp}</p>
                </div>
            </div>
        `).join('');

        // Add event listeners for detail toggles
        const toggleButtons = historyList.querySelectorAll('.toggle-details-btn');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.toggleHistoryDetails(e.target.closest('.history-entry'));
            });
        });
    }

    getOperationIcon(operation) {
        const icons = {
            import: 'fa-upload',
            export: 'fa-download',
            modify: 'fa-edit',
            delete: 'fa-trash',
            token: 'fa-key',
            settings: 'fa-cog'
        };
        return icons[operation] || 'fa-circle';
    }

    getOperationTitle(operation) {
        const titles = {
            import: 'Import Users',
            export: 'Export Users',
            modify: 'Modify Users',
            delete: 'Delete Users',
            token: 'Token Operation',
            settings: 'Settings Change'
        };
        return titles[operation] || operation.charAt(0).toUpperCase() + operation.slice(1);
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        if (seconds < 60) {
            return `${seconds}s`;
        } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        }
    }

    toggleHistoryDetails(historyEntry) {
        const details = historyEntry.querySelector('.history-full-details');
        const toggleBtn = historyEntry.querySelector('.toggle-details-btn');
        const icon = toggleBtn.querySelector('i');

        if (details.style.display === 'none') {
            details.style.display = 'block';
            icon.className = 'fas fa-chevron-up';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Details';
        } else {
            details.style.display = 'none';
            icon.className = 'fas fa-chevron-down';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Details';
        }
    }

    updateStatistics() {
        const totalOperations = this.history.length;
        const successfulOperations = this.history.filter(entry => entry.status === 'success').length;
        const failedOperations = this.history.filter(entry => entry.status === 'error').length;
        const usersProcessed = this.history.reduce((sum, entry) => sum + entry.usersProcessed, 0);
        
        const today = new Date().toDateString();
        const operationsToday = this.history.filter(entry => 
            new Date(entry.timestamp).toDateString() === today
        ).length;
        
        const totalDuration = this.history.reduce((sum, entry) => sum + entry.duration, 0);
        const avgDuration = totalOperations > 0 ? Math.floor(totalDuration / totalOperations / 1000) : 0;

        document.getElementById('total-operations').textContent = totalOperations;
        document.getElementById('successful-operations').textContent = successfulOperations;
        document.getElementById('failed-operations').textContent = failedOperations;
        document.getElementById('users-processed').textContent = usersProcessed;
        document.getElementById('operations-today').textContent = operationsToday;
        document.getElementById('avg-duration').textContent = `${avgDuration}s`;
    }

    exportHistory() {
        const historyToExport = this.filteredHistory.length > 0 ? this.filteredHistory : this.history;
        
        if (historyToExport.length === 0) {
            if (this.app && this.app.showError) {
                this.app.showError('No history to export');
            }
            return;
        }

        const jsonBlob = new Blob([JSON.stringify(historyToExport, null, 2)], { type: 'application/json' });
        this.triggerDownload(jsonBlob, `operation-history-${new Date().toISOString().split('T')[0]}.json`);
    }

    exportHistorySpecific(format) {
        const historyToExport = this.filteredHistory.length > 0 ? this.filteredHistory : this.history;
        if (historyToExport.length === 0) { this.app?.showError?.('No history to export'); return; }
        const date = new Date().toISOString().split('T')[0];
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(historyToExport, null, 2)], { type: 'application/json' });
            this.triggerDownload(blob, `operation-history-${date}.json`);
        } else if (format === 'csv') {
            const csvContent = this.convertHistoryToCSV(historyToExport);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            this.triggerDownload(blob, `operation-history-${date}.csv`);
        } else if (format === 'ndjson') {
            const ndjson = historyToExport.map(h => JSON.stringify(h)).join('\n');
            const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
            this.triggerDownload(blob, `operation-history-${date}.ndjson`);
        } else if (format === 'all') {
            // Trigger sequentially; browser will download each file
            this.exportHistorySpecific('json');
            this.exportHistorySpecific('csv');
            this.exportHistorySpecific('ndjson');
        }
    }

    convertHistoryToCSV(history) {
        const headers = ['Timestamp', 'Operation', 'Status', 'Description', 'Users Processed', 'Duration (ms)', 'User'];
        const csvRows = [headers.join(',')];

        history.forEach(entry => {
            const row = [
                `"${new Date(entry.timestamp).toLocaleString()}"`,
                `"${entry.operation}"`,
                `"${entry.status}"`,
                `"${entry.description.replace(/"/g, '""')}"`,
                entry.usersProcessed,
                entry.duration,
                `"${entry.user}"`
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    triggerDownload(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    async clearHistory() {
        if (this.app && this.app.showWarning) {
            this.app.showWarning('Clearing operation history...');
        }

        try {
            // Try to clear server history
            const response = await fetch('/api/history', { method: 'DELETE' });
            if (!response.ok && response.status !== 404) {
                throw new Error('Failed to clear server history');
            }
        } catch (error) {
            console.warn('Could not clear server history:', error.message);
        }

        // Clear local history
        this.history = [];
        localStorage.removeItem('operation_history');
        
        this.filterHistory();
        this.updateStatistics();
        if (this.app && this.app.showSuccess) {
            this.app.showSuccess('Operation history cleared successfully');
        }
    }

    saveHistoryToLocal() {
        localStorage.setItem('operation_history', JSON.stringify(this.history));
    }

    addHistoryEntry(operation, status, description, usersProcessed = 0, duration = 0) {
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            operation,
            status,
            description,
            usersProcessed,
            duration,
            details: `Operation completed with ${status} status`,
            user: 'Current User'
        };

        this.history.unshift(entry);
        
        // Keep only last 100 entries
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }

        this.saveHistoryToLocal();
        this.filterHistory();
        this.updateStatistics();
    }

    // Called when token status changes
    onTokenStatusChange(tokenStatus) {
        // History page doesn't need to react to token changes
    }

    // Called when settings change
    onSettingsChange(settings) {
        // History page doesn't need to react to settings changes
    }
}
