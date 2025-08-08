/**
 * Logs Page Module
 * 
 * Handles the Logs page functionality including:
 * - Application log viewing
 * - Log filtering and search
 * - Real-time log updates
 * - Log export functionality
 */

export class LogsPage {
    constructor(app) {
        this.app = app;
        this.logs = [];
        this.filteredLogs = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.autoRefresh = false;
        this.refreshInterval = null;
    }

    async load() {
        console.log('📄 Loading Logs page...');
        
        const logsPage = document.getElementById('logs-page');
        if (!logsPage) {
            console.error('❌ Logs page div not found');
            return;
        }

        logsPage.innerHTML = `
            <div class="page-header">
                <h1>Application Logs</h1>
                <p>View and manage application logs and system events</p>
            </div>

            <div class="logs-container">
                <!-- Log Controls -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h3>Log Controls</h3>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3">
                                <div class="form-group">
                                    <label for="log-level-filter">Filter by Level:</label>
                                    <select id="log-level-filter" class="form-control">
                                        <option value="all">All Levels</option>
                                        <option value="error">Error</option>
                                        <option value="warn">Warning</option>
                                        <option value="info">Info</option>
                                        <option value="debug">Debug</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="form-group">
                                    <label for="log-search">Search Logs:</label>
                                    <input type="text" id="log-search" class="form-control" placeholder="Search log messages...">
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="form-group">
                                    <label for="log-source">Log Source:</label>
                                    <select id="log-source" class="form-control">
                                        <option value="all">All Sources</option>
                                        <option value="application">Application</option>
                                        <option value="access">Access</option>
                                        <option value="error">Error</option>
                                        <option value="performance">Performance</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="form-group">
                                    <label>&nbsp;</label>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="auto-refresh">
                                        <label class="form-check-label" for="auto-refresh">
                                            Auto Refresh
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="btn-toolbar">
                            <button id="refresh-logs-btn" class="btn btn-primary mr-2">
                                <i class="fas fa-sync"></i> Refresh Logs
                            </button>
                            <button id="clear-logs-btn" class="btn btn-warning mr-2">
                                <i class="fas fa-trash"></i> Clear Logs
                            </button>
                            <button id="export-logs-btn" class="btn btn-success mr-2">
                                <i class="fas fa-download"></i> Export Logs
                            </button>
                            <button id="download-logs-btn" class="btn btn-info">
                                <i class="fas fa-file-download"></i> Download Log Files
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Log Statistics -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h3>Log Statistics</h3>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3">
                                <div class="stat-card">
                                    <div class="stat-number" id="total-logs">0</div>
                                    <div class="stat-label">Total Logs</div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="stat-card error">
                                    <div class="stat-number" id="error-logs">0</div>
                                    <div class="stat-label">Errors</div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="stat-card warning">
                                    <div class="stat-number" id="warning-logs">0</div>
                                    <div class="stat-label">Warnings</div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="stat-card info">
                                    <div class="stat-number" id="info-logs">0</div>
                                    <div class="stat-label">Info</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Log Viewer -->
                <div class="card">
                    <div class="card-header">
                        <h3>Log Entries</h3>
                        <div class="float-right">
                            <span id="log-count-display">Showing 0 logs</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div id="logs-loading" class="text-center" style="display: none;">
                            <div class="spinner-border" role="status"></div>
                            <p>Loading logs...</p>
                        </div>
                        
                        <div id="logs-viewer" class="logs-viewer">
                            <div id="no-logs" class="text-center text-muted">
                                <i class="fas fa-file-alt fa-3x mb-3"></i>
                                <p>No logs to display. Click "Refresh Logs" to load recent entries.</p>
                            </div>
                            
                            <div id="logs-list" class="logs-list">
                                <!-- Log entries will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.loadLogs();
    }

    setupEventListeners() {
        // Filter controls
        document.getElementById('log-level-filter')?.addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.filterLogs();
        });

        document.getElementById('log-search')?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterLogs();
        });

        document.getElementById('log-source')?.addEventListener('change', () => {
            this.filterLogs();
        });

        // Auto refresh
        document.getElementById('auto-refresh')?.addEventListener('change', (e) => {
            this.toggleAutoRefresh(e.target.checked);
        });

        // Action buttons
        document.getElementById('refresh-logs-btn')?.addEventListener('click', () => {
            this.loadLogs();
        });

        document.getElementById('clear-logs-btn')?.addEventListener('click', () => {
            this.clearLogs();
        });

        document.getElementById('export-logs-btn')?.addEventListener('click', () => {
            this.exportLogs();
        });

        document.getElementById('download-logs-btn')?.addEventListener('click', () => {
            this.downloadLogFiles();
        });
    }

    async loadLogs() {
        const logsLoading = document.getElementById('logs-loading');
        const noLogs = document.getElementById('no-logs');
        
        try {
            logsLoading.style.display = 'block';
            noLogs.style.display = 'none';

            // Simulate loading logs (replace with actual API call)
            const response = await fetch('/api/logs');
            if (response.ok) {
                const responseData = await response.json();
                // Handle different response formats
                if (Array.isArray(responseData)) {
                    this.logs = responseData;
                } else if (responseData && responseData.data && Array.isArray(responseData.data)) {
                    this.logs = responseData.data;
                } else if (responseData && responseData.logs && Array.isArray(responseData.logs)) {
                    this.logs = responseData.logs;
                } else {
                    console.warn('⚠️ Unexpected logs response format:', responseData);
                    this.logs = this.generateSampleLogs();
                }
            } else {
                // Generate sample logs for demo
                this.logs = this.generateSampleLogs();
            }
            
            // Ensure this.logs is always an array
            if (!Array.isArray(this.logs)) {
                console.warn('⚠️ this.logs is not an array, resetting to empty array');
                this.logs = [];
            }
            
            logsLoading.style.display = 'none';
            this.filterLogs();
            this.updateStatistics();
        } catch (error) {
            console.error('❌ Error loading logs:', error);
            logsLoading.style.display = 'none';
            
            // Generate sample logs for demo
            this.logs = this.generateSampleLogs();
            this.filterLogs();
            this.updateStatistics();
        }
    }

    generateSampleLogs() {
        const levels = ['info', 'warn', 'error', 'debug'];
        const sources = ['application', 'access', 'error', 'performance'];
        const messages = [
            'User authentication successful',
            'Database connection established',
            'API request processed',
            'File upload completed',
            'Cache cleared successfully',
            'Configuration updated',
            'Token validation failed',
            'Network timeout occurred',
            'Invalid request format',
            'Service unavailable',
            'Memory usage high',
            'Disk space low'
        ];

        const logs = [];
        const now = new Date();

        for (let i = 0; i < 50; i++) {
            const timestamp = new Date(now.getTime() - (i * 60000)); // 1 minute intervals
            const level = levels[Math.floor(Math.random() * levels.length)];
            const source = sources[Math.floor(Math.random() * sources.length)];
            const message = messages[Math.floor(Math.random() * messages.length)];
            
            logs.push({
                id: i + 1,
                timestamp: timestamp.toISOString(),
                level,
                source,
                message,
                details: `Additional details for log entry ${i + 1}`
            });
        }

        return logs.reverse(); // Most recent first
    }

    filterLogs() {
        // Ensure this.logs is an array before filtering
        if (!Array.isArray(this.logs)) {
            console.warn('⚠️ this.logs is not an array in filterLogs, resetting to empty array');
            this.logs = [];
        }
        
        const levelFilter = document.getElementById('log-level-filter')?.value || 'all';
        const sourceFilter = document.getElementById('log-source')?.value || 'all';
        
        this.filteredLogs = this.logs.filter(log => {
            const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
            const matchesSource = sourceFilter === 'all' || log.source === sourceFilter;
            const matchesSearch = !this.searchTerm || 
                log.message.toLowerCase().includes(this.searchTerm) ||
                log.details.toLowerCase().includes(this.searchTerm);
            
            return matchesLevel && matchesSource && matchesSearch;
        });

        this.renderLogs();
    }

    renderLogs() {
        const logsList = document.getElementById('logs-list');
        const noLogs = document.getElementById('no-logs');
        const logCountDisplay = document.getElementById('log-count-display');

        if (this.filteredLogs.length === 0) {
            logsList.innerHTML = '';
            noLogs.style.display = 'block';
            logCountDisplay.textContent = 'Showing 0 logs';
            return;
        }

        noLogs.style.display = 'none';
        logCountDisplay.textContent = `Showing ${this.filteredLogs.length} logs`;

        logsList.innerHTML = this.filteredLogs.map(log => `
            <div class="log-entry log-${log.level}" data-log-id="${log.id}">
                <div class="log-header">
                    <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
                    <span class="log-level log-level-${log.level}">${log.level.toUpperCase()}</span>
                    <span class="log-source">${log.source}</span>
                </div>
                <div class="log-message">${log.message}</div>
                <div class="log-details" style="display: none;">${log.details}</div>
                <div class="log-actions">
                    <button class="btn btn-sm btn-outline-secondary toggle-details-btn">
                        <i class="fas fa-chevron-down"></i> Details
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners for detail toggles
        const toggleButtons = logsList.querySelectorAll('.toggle-details-btn');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.toggleLogDetails(e.target.closest('.log-entry'));
            });
        });
    }

    toggleLogDetails(logEntry) {
        const details = logEntry.querySelector('.log-details');
        const toggleBtn = logEntry.querySelector('.toggle-details-btn');
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
        // Ensure this.logs is an array before using array methods
        if (!Array.isArray(this.logs)) {
            console.warn('⚠️ this.logs is not an array in updateStatistics, resetting to empty array');
            this.logs = [];
        }
        
        const totalLogs = this.logs.length;
        const errorLogs = this.logs.filter(log => log.level === 'error').length;
        const warningLogs = this.logs.filter(log => log.level === 'warn').length;
        const infoLogs = this.logs.filter(log => log.level === 'info').length;

        document.getElementById('total-logs').textContent = totalLogs;
        document.getElementById('error-logs').textContent = errorLogs;
        document.getElementById('warning-logs').textContent = warningLogs;
        document.getElementById('info-logs').textContent = infoLogs;
    }

    toggleAutoRefresh(enabled) {
        this.autoRefresh = enabled;
        
        if (enabled) {
            this.refreshInterval = setInterval(() => {
                this.loadLogs();
            }, 30000); // Refresh every 30 seconds
        } else {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
        }
    }

    async clearLogs() {
        const confirmed = confirm('Are you sure you want to clear all logs? This action cannot be undone.');
        if (!confirmed) return;

        try {
            const response = await fetch('/api/logs', { method: 'DELETE' });
            if (response.ok) {
                this.logs = [];
                this.filterLogs();
                this.updateStatistics();
                if (this.app && this.app.showSuccess) {
                    this.app.showSuccess('Logs cleared successfully');
                }
            } else {
                throw new Error('Failed to clear logs');
            }
        } catch (error) {
            console.error('❌ Error clearing logs:', error);
            if (this.app && this.app.showError) {
                this.app.showError('Error clearing logs. Please try again.');
            }
        }
    }

    exportLogs() {
        const logsToExport = this.filteredLogs.length > 0 ? this.filteredLogs : this.logs;
        
        if (logsToExport.length === 0) {
            if (this.app && this.app.showError) {
                this.app.showError('No logs to export');
            }
            return;
        }

        const csvContent = this.convertLogsToCSV(logsToExport);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    convertLogsToCSV(logs) {
        const headers = ['Timestamp', 'Level', 'Source', 'Message', 'Details'];
        const csvRows = [headers.join(',')];

        logs.forEach(log => {
            const row = [
                `"${new Date(log.timestamp).toLocaleString()}"`,
                `"${log.level}"`,
                `"${log.source}"`,
                `"${log.message.replace(/"/g, '""')}"`,
                `"${log.details.replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    async downloadLogFiles() {
        try {
            const response = await fetch('/api/logs/files');
            if (response.ok) {
                const files = await response.json();
                
                if (files.length === 0) {
                    if (this.app && this.app.showError) {
                        this.app.showError('No log files available for download');
                    }
                    return;
                }

                // Create a simple file list for download
                const fileList = files.map(file => 
                    `<li><a href="/api/logs/download/${file.name}" target="_blank">${file.name} (${file.size})</a></li>`
                ).join('');

                const popup = window.open('', '_blank', 'width=600,height=400');
                popup.document.write(`
                    <html>
                        <head><title>Download Log Files</title></head>
                        <body>
                            <h2>Available Log Files</h2>
                            <ul>${fileList}</ul>
                            <p><small>Click on a file name to download it.</small></p>
                        </body>
                    </html>
                `);
            } else {
                throw new Error('Failed to fetch log files');
            }
        } catch (error) {
            console.error('❌ Error downloading log files:', error);
            if (this.app && this.app.showError) {
                this.app.showError('Error accessing log files. Please try again.');
            }
        }
    }

    // Called when token status changes
    onTokenStatusChange(tokenStatus) {
        // Logs page doesn't require token validation
    }

    // Called when settings change
    onSettingsChange(settings) {
        // Logs page doesn't require settings
    }

    // Cleanup when page is unloaded
    unload() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}
