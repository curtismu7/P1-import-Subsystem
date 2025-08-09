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
                        <div class="controls-grid" style="display: grid; grid-template-columns: repeat(4, minmax(220px, 1fr)); gap: 16px; align-items: start;">
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
                            <div class="form-group">
                                <label for="log-search">Search Logs:</label>
                                <input type="text" id="log-search" class="form-control" placeholder="Search log messages...">
                            </div>
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
                            <div class="form-group" style="justify-self: start;">
                                <label>&nbsp;</label>
                                <div id="auto-refresh-box" style="display: inline-flex; align-items: center; gap: 10px; background: #f5f5f5; border: 3px solid #1e88e5; border-radius: 12px; padding: 6px 12px; height: 40px; box-sizing: border-box;">
                                    <input class="form-check-input" type="checkbox" id="auto-refresh">
                                    <label class="form-check-label" for="auto-refresh" style="margin: 0; font-weight: 600;">
                                        Auto Refresh
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="btn-toolbar" style="display:flex; gap: 16px; align-items: center; justify-content:center; background: #edf2f7; border: 2px solid rgba(0,0,0,0.12); border-radius: 12px; padding: 12px 16px; max-width: 100%; margin: 6px auto;">
                            <button id="refresh-logs-btn" class="btn btn-primary">
                                <i class="fas fa-sync me-1"></i><span>Refresh Logs</span>
                            </button>
                            <button id="clear-logs-btn" class="btn btn-primary">
                                <i class="fas fa-trash me-1"></i><span>Clear Logs</span>
                            </button>
                            <div class="dropdown" id="export-logs-group">
                                <button id="export-logs-btn" class="btn btn-success dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="fas fa-download me-1"></i><span>Export Logs</span>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li><a class="dropdown-item" href="#" id="export-logs-json" title="Structured JSON file (for backup/sharing)">Export JSON (structured)</a></li>
                                    <li><a class="dropdown-item" href="#" id="export-logs-csv" title="Spreadsheet-friendly CSV (Excel/Sheets)">Export CSV (spreadsheet)</a></li>
                                    <li><a class="dropdown-item" href="#" id="export-logs-ndjson" title="Newline-delimited JSON for Splunk/ELK/Logstash">Export NDJSON (Splunk/ELK)</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item" href="#" id="export-logs-all" title="Download JSON, CSV, and NDJSON together">Export All Formats</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section-divider" style="height: 2px; background: rgba(0,0,0,0.08); border-radius: 2px; margin: 16px 0 24px;"></div>

                <!-- Log Statistics -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h3>Log Statistics</h3>
                    </div>
                    <div class="card-body">
                        <div class="stats-section" style="background: var(--ping-gray-50, #f7f9fc); border: 1px solid rgba(0,0,0,0.05); border-radius: 12px; padding: 16px;">
                            <div class="stats-grid" style="display: flex; flex-wrap: wrap; gap: 16px; align-items: stretch;">
                                <div class="stat-card" style="height: 100%; flex: 1 1 180px; min-width: 180px; border: 2px solid #1e88e5; border-radius: 10px; padding: 10px;">
                                    <div class="stat-number" id="total-logs">0</div>
                                    <div class="stat-label">Total Logs</div>
                                </div>
                                <div class="stat-card error" style="height: 100%; flex: 1 1 180px; min-width: 180px; border: 2px solid #dc3545; border-radius: 10px; padding: 10px; background: #fff3cd;">
                                    <div class="stat-number" id="error-logs">0</div>
                                    <div class="stat-label">Errors</div>
                                </div>
                                <div class="stat-card warning" style="height: 100%; flex: 1 1 180px; min-width: 180px; border: 2px solid #1e88e5; border-radius: 10px; padding: 10px;">
                                    <div class="stat-number" id="warning-logs">0</div>
                                    <div class="stat-label">Warnings</div>
                                </div>
                                <div class="stat-card info" style="height: 100%; flex: 1 1 180px; min-width: 180px; border: 2px solid #1e88e5; border-radius: 10px; padding: 10px;">
                                    <div class="stat-number" id="info-logs">0</div>
                                    <div class="stat-label">Info</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section-divider" style="height: 2px; background: rgba(0,0,0,0.08); border-radius: 2px; margin: 16px 0 24px;"></div>

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
                            
                        <div id="logs-list" class="logs-list" style="border:1px solid rgba(0,0,0,0.1); border-radius:10px; overflow:hidden;">
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

        document.getElementById('export-logs-json')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.exportSpecific('json');
        });
        document.getElementById('export-logs-csv')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.exportSpecific('csv');
        });
        document.getElementById('export-logs-ndjson')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.exportSpecific('ndjson');
        });
        document.getElementById('export-logs-all')?.addEventListener('click', (e) => {
            e.preventDefault();
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

            // Load UI logs from server
            const response = await fetch('/api/logs/ui');
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

        logsList.innerHTML = this.filteredLogs.map((log, idx) => {
            const detailsStr = this.formatLogDetails(log);
            return `
            <div class="log-entry log-${log.level}" data-log-id="${log.id}"
                 style="display:grid; grid-template-columns: 200px 110px 1fr auto; gap: 12px; align-items:center; padding:10px 12px; ${idx>0?'border-top:1px solid rgba(0,0,0,0.08);':''}">
                <div class="log-timestamp" style="color:#374151; font-weight:600;">${new Date(log.timestamp).toLocaleString()}</div>
                <div class="log-level log-level-${log.level}" style="text-transform:uppercase; font-weight:700;">${log.level}</div>
                <div class="log-message"><span class="log-source" style="color:#6b7280; font-weight:600;">${log.source}:</span> ${log.message}</div>
                <div class="log-actions" style="justify-self:end;">
                    <button class="btn btn-sm btn-outline-secondary toggle-details-btn">
                        <i class="fas fa-chevron-down"></i> Details
                    </button>
                </div>
                <pre class="log-details" style="grid-column: 1 / -1; display: none; font-weight: 700; font-size: 0.95rem; margin-top: 6px; white-space: pre-wrap; background:#f9fafb; border:1px solid rgba(0,0,0,0.06); border-radius:8px; padding:8px 10px;">${detailsStr}</pre>
            </div>`;
        }).join('');

        // Add event listeners for detail toggles
        const toggleButtons = logsList.querySelectorAll('.toggle-details-btn');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.toggleLogDetails(e.target.closest('.log-entry'));
            });
        });
    }

    formatLogDetails(log) {
        // Show provided details or a simple placeholder
        if (typeof log?.details === 'string' && log.details.trim().length > 0) return log.details;
        if (log?.details && typeof log.details === 'object') {
            try { return JSON.stringify(log.details, null, 2); } catch {}
        }
        const idText = typeof log?.id !== 'undefined' ? ` ${log.id}` : '';
        return `Additional details for log entry${idText}`;
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
        // Replace browser confirm with in-app status bar prompt
        if (this.app && this.app.showInfo) {
            this.app.showInfo('Clearing all logs...');
        }

        try {
            const response = await fetch('/api/logs', { method: 'DELETE' });
            if (response.ok) {
                this.logs = [];
                this.filterLogs();
                this.updateStatistics();
                if (this.app && this.app.showSuccess) this.app.showSuccess('Logs cleared successfully');
            } else {
                throw new Error('Failed to clear logs');
            }
        } catch (error) {
            console.error('❌ Error clearing logs:', error);
            if (this.app && this.app.showError) this.app.showError('Error clearing logs. Please try again.');
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

        // Export JSON file
        const jsonBlob = new Blob([JSON.stringify(logsToExport, null, 2)], { type: 'application/json' });
        this.triggerDownload(jsonBlob, `logs-export-${new Date().toISOString().split('T')[0]}.json`);

        // Export CSV file for BI tools and spreadsheets
        const csvContent = this.convertLogsToCSV(logsToExport);
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        this.triggerDownload(csvBlob, `logs-export-${new Date().toISOString().split('T')[0]}.csv`);

        // Export NDJSON for ingestion tools (Splunk, ELK) – one JSON per line
        const ndjson = logsToExport.map(l => JSON.stringify(l)).join('\n');
        const ndjsonBlob = new Blob([ndjson], { type: 'application/x-ndjson' });
        this.triggerDownload(ndjsonBlob, `logs-export-${new Date().toISOString().split('T')[0]}.ndjson`);
    }

    exportSpecific(format) {
        const logsToExport = this.filteredLogs.length > 0 ? this.filteredLogs : this.logs;
        if (logsToExport.length === 0) {
            this.app?.showError?.('No logs to export');
            return;
        }
        const date = new Date().toISOString().split('T')[0];
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(logsToExport, null, 2)], { type: 'application/json' });
            this.triggerDownload(blob, `logs-export-${date}.json`);
        } else if (format === 'csv') {
            const csv = this.convertLogsToCSV(logsToExport);
            const blob = new Blob([csv], { type: 'text/csv' });
            this.triggerDownload(blob, `logs-export-${date}.csv`);
        } else if (format === 'ndjson') {
            const ndjson = logsToExport.map(l => JSON.stringify(l)).join('\n');
            const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
            this.triggerDownload(blob, `logs-export-${date}.ndjson`);
        }
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

    convertLogsToCSV(logs) {
        const headers = ['Timestamp', 'Level', 'Source', 'Message', 'Details'];
        const csvRows = [headers.join(',')];

        logs.forEach(log => {
            const row = [
                `"${new Date(log.timestamp).toLocaleString()}"`,
                `"${log.level}"`,
                `"${log.source}"`,
                `"${String(log.message || '').replace(/"/g, '""')}"`,
                `"${String(log.details || '').replace(/"/g, '""')}"`
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
