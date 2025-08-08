export class LoggingUIComponent {
    constructor(loggingSubsystem, eventBus, logger) {
        this.loggingSubsystem = loggingSubsystem;
        this.eventBus = eventBus;
        this.logger = logger;
        
        // UI state
        this.currentLogs = [];
        this.filteredLogs = [];
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.isLoading = false;
        this.isAutoRefresh = true;
        this.refreshInterval = null;
        
        // Filter state
        this.currentFilters = {
            level: 'all',
            category: 'all',
            dateFrom: '',
            dateTo: '',
            search: ''
        };
        
        // UI elements cache
        this.elements = {};
        this.filterTimeout = null;
        
        this.logger.debug('LoggingUIComponent initialized');
    }

    /**
     * Initialize the Logging UI Component
     */
    async init() {
        try {
            this.logger.info('Initializing LoggingUIComponent');
            
            // Create the UI container
            this.createUI();
            
            // Cache DOM elements
            this.cacheElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup filter listeners
            this.setupFilterListeners();
            
            // Load initial logs
            await this.loadLogs();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            this.logger.info('LoggingUIComponent initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize LoggingUIComponent:', error);
            throw error;
        }
    }

    /**
     * Create the UI structure
     */
    createUI() {
        const container = document.getElementById('logs-view');
        if (!container) {
            this.logger.error('Logs view container not found');
            return;
        }

        container.innerHTML = `
            <div class="logging-container">
                <!-- Header -->
                <div class="logging-header">
                    <h2><i class="fas fa-file-alt"></i> System Logs</h2>
                    <p>Monitor and analyze system activity</p>
                </div>

                <!-- Statistics Cards -->
                <div class="logging-stats">
                    <div class="stat-card">
                        <div class="stat-value" id="total-logs">0</div>
                        <div class="stat-label">Total Logs</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="error-logs">0</div>
                        <div class="stat-label">Errors</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="warning-logs">0</div>
                        <div class="stat-label">Warnings</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="info-logs">0</div>
                        <div class="stat-label">Info</div>
                    </div>
                </div>

                <!-- Controls -->
                <div class="logging-controls">
                    <div class="logging-filters">
                        <div class="filter-group">
                            <label for="level-filter">Level</label>
                            <select id="level-filter">
                                <option value="all">All Levels</option>
                                <option value="error">Error</option>
                                <option value="warn">Warning</option>
                                <option value="info">Info</option>
                                <option value="debug">Debug</option>
                                <option value="trace">Trace</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="category-filter">Category</label>
                            <select id="category-filter">
                                <option value="all">All Categories</option>
                                <option value="system">System</option>
                                <option value="auth">Authentication</option>
                                <option value="import">Import</option>
                                <option value="export">Export</option>
                                <option value="delete">Delete</option>
                                <option value="modify">Modify</option>
                                <option value="ui">UI</option>
                                <option value="api">API</option>
                                <option value="error">Error</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="date-from">From Date</label>
                            <input type="datetime-local" id="date-from">
                        </div>
                        
                        <div class="filter-group">
                            <label for="date-to">To Date</label>
                            <input type="datetime-local" id="date-to">
                        </div>
                        
                        <div class="filter-group">
                            <label for="search-filter">Search</label>
                            <input type="text" id="log-search-filter-legacy" placeholder="Search logs...">
                        </div>
                    </div>
                    
                    <div class="logging-actions">
                        <button class="btn-modern" id="refresh-btn">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                        <button class="btn-modern" id="export-btn">
                            <i class="fas fa-download"></i> Export
                        </button>
                        <button class="btn-modern" id="clear-filters-btn">
                            <i class="fas fa-filter"></i> Clear Filters
                        </button>
                        <label class="auto-refresh-toggle">
                            <input type="checkbox" id="auto-refresh-toggle" checked>
                            <span>Auto Refresh</span>
                        </label>
                        <button class="btn-modern btn-danger" id="clear-logs-btn">
                            <i class="fas fa-trash"></i> Clear Logs
                        </button>
                    </div>
                </div>

                <!-- Logs List -->
                <div class="logging-list" id="logging-list">
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <p>Loading logs...</p>
                    </div>
                </div>

                <!-- Pagination -->
                <div class="logging-pagination" id="pagination" style="display: none;">
                    <button id="prev-page" class="btn-modern" disabled>
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <span id="pagination-info">Page 1 of 1</span>
                    <button id="next-page" class="btn-modern" disabled>
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.elements = {
            loggingList: document.getElementById('logging-list'),
            pagination: document.getElementById('pagination'),
            levelFilter: document.getElementById('level-filter'),
            categoryFilter: document.getElementById('category-filter'),
            dateFromFilter: document.getElementById('date-from'),
            dateToFilter: document.getElementById('date-to'),
            searchFilter: document.getElementById('search-filter'),
            totalLogs: document.getElementById('total-logs'),
            errorLogs: document.getElementById('error-logs'),
            warningLogs: document.getElementById('warning-logs'),
            infoLogs: document.getElementById('info-logs'),
            prevPageBtn: document.getElementById('prev-page'),
            nextPageBtn: document.getElementById('next-page'),
            paginationInfo: document.getElementById('pagination-info'),
            refreshBtn: document.getElementById('refresh-btn'),
            exportBtn: document.getElementById('export-btn'),
            clearFiltersBtn: document.getElementById('clear-filters-btn'),
            autoRefreshToggle: document.getElementById('auto-refresh-toggle'),
            clearLogsBtn: document.getElementById('clear-logs-btn')
        };
    }

    /**
     * Setup event listeners for real-time updates
     */
    setupEventListeners() {
        if (this.eventBus) {
            // Listen for new log entries from LoggingSubsystem
            this.eventBus.on('logEntryAdded', () => {
                this.logger.debug('Log entry added event received');
                if (this.isAutoRefresh) {
                    this.loadLogs();
                }
            });
            
            this.eventBus.on('logsCleared', () => {
                this.logger.debug('Logs cleared event received');
                this.currentLogs = [];
                this.filteredLogs = [];
                this.displayLogs();
            });
        }

        // Button event listeners
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        if (this.elements.exportBtn) {
            this.elements.exportBtn.addEventListener('click', () => this.exportLogs());
        }
        
        if (this.elements.clearFiltersBtn) {
            this.elements.clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
        
        if (this.elements.clearLogsBtn) {
            this.elements.clearLogsBtn.addEventListener('click', () => this.clearLogs());
        }

        if (this.elements.autoRefreshToggle) {
            this.elements.autoRefreshToggle.addEventListener('change', (e) => {
                this.isAutoRefresh = e.target.checked;
                if (this.isAutoRefresh) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }

        // Pagination event listeners
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.addEventListener('click', () => this.previousPage());
        }
        
        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.addEventListener('click', () => this.nextPage());
        }
    }

    /**
     * Setup filter change listeners
     */
    setupFilterListeners() {
        const filterElements = [
            this.elements.levelFilter,
            this.elements.categoryFilter,
            this.elements.dateFromFilter,
            this.elements.dateToFilter
        ];

        filterElements.forEach(element => {
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });

        // Search filter with debounce
        if (this.elements.searchFilter) {
            this.elements.searchFilter.addEventListener('input', () => this.debounceFilter());
        }
    }

    /**
     * Debounce filter for search input
     */
    debounceFilter() {
        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
        }
        this.filterTimeout = setTimeout(() => this.applyFilters(), 300);
    }

    /**
     * Load logs from LoggingSubsystem
     */
    async loadLogs() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showLoadingState();
            
            this.logger.debug('Loading logs from LoggingSubsystem');
            
            // Get logs from subsystem
            const logsData = await this.loggingSubsystem.loadLogs({
                limit: 1000, // Load more for client-side filtering
                includeData: true
            });
            
            this.currentLogs = logsData.logs || [];
            
            // Apply current filters
            this.applyFilters();
            
            // Update statistics
            this.updateStatistics();
            
            this.logger.debug('Logs loaded successfully', { count: this.currentLogs.length });
            
        } catch (error) {
            this.logger.error('Failed to load logs:', error);
            this.showError('Failed to load logs', error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Apply current filters to logs
     */
    applyFilters() {
        // Update filter state
        this.currentFilters = {
            level: this.elements.levelFilter?.value || 'all',
            category: this.elements.categoryFilter?.value || 'all',
            dateFrom: this.elements.dateFromFilter?.value || '',
            dateTo: this.elements.dateToFilter?.value || '',
            search: this.elements.searchFilter?.value || ''
        };

        // Filter logs
        this.filteredLogs = this.currentLogs.filter(log => this.matchesFilters(log));
        
        // Reset to first page
        this.currentPage = 1;
        
        // Display filtered results
        this.displayLogs();
        
        this.logger.debug('Filters applied', { 
            filters: this.currentFilters, 
            resultCount: this.filteredLogs.length 
        });
    }

    /**
     * Check if log entry matches current filters
     */
    matchesFilters(log) {
        // Level filter
        if (this.currentFilters.level !== 'all' && log.level !== this.currentFilters.level) {
            return false;
        }

        // Category filter
        if (this.currentFilters.category !== 'all' && log.category !== this.currentFilters.category) {
            return false;
        }

        // Date filters
        if (this.currentFilters.dateFrom) {
            const logDate = new Date(log.timestamp);
            const fromDate = new Date(this.currentFilters.dateFrom);
            if (logDate < fromDate) {
                return false;
            }
        }

        if (this.currentFilters.dateTo) {
            const logDate = new Date(log.timestamp);
            const toDate = new Date(this.currentFilters.dateTo);
            if (logDate > toDate) {
                return false;
            }
        }

        // Search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            const searchableText = [
                log.message,
                log.category,
                log.level,
                JSON.stringify(log.data)
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Display logs with pagination
     */
    displayLogs() {
        if (!this.elements.loggingList) return;

        if (this.filteredLogs.length === 0) {
            this.showNoLogs();
            return;
        }

        // Calculate pagination
        const totalPages = Math.ceil(this.filteredLogs.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageLogs = this.filteredLogs.slice(startIndex, endIndex);

        // Generate HTML
        let html = '';
        pageLogs.forEach(log => {
            html += this.createLogEntryHTML(log);
        });

        this.elements.loggingList.innerHTML = html;
        this.updatePagination(totalPages);
    }

    /**
     * Create HTML for a log entry
     */
    createLogEntryHTML(log) {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const levelClass = `log-level-${log.level}`;
        const hasData = log.data && Object.keys(log.data).length > 0;
        const emoji = this.getLevelEmoji(log.level);
        const categoryIcon = this.getCategoryIcon(log.category);
        
        // Extract operation stats if available
        const operationStats = this.extractOperationStats(log);
        
        return `
            <div class="log-entry ${levelClass}" data-level="${log.level}" data-category="${log.category}">
                <!-- Log Entry Header -->
                <div class="log-entry-header">
                    <div class="log-entry-meta">
                        <div class="log-level-badge">
                            <span class="log-level-emoji">${emoji}</span>
                            <span class="log-level-text">${log.level.toUpperCase()}</span>
                        </div>
                        <div class="log-category">
                            <span class="category-icon">${categoryIcon}</span>
                            <span class="category-text">${log.category}</span>
                        </div>
                        <div class="log-timestamp">
                            <i class="fas fa-clock"></i>
                            <span>${timestamp}</span>
                        </div>
                    </div>
                    ${hasData ? `
                        <div class="log-entry-actions">
                            <button class="log-details-toggle" onclick="window.loggingUI.toggleLogDetails(event)" title="Toggle details">
                                <i class="fas fa-chevron-down"></i>
                                <span>Details</span>
                            </button>
                        </div>
                    ` : ''}
                </div>

                <!-- Log Message -->
                <div class="log-entry-message">
                    ${this.escapeHtml(log.message)}
                </div>

                <!-- Operation Stats (if available) -->
                ${operationStats ? `
                    <div class="log-operation-stats">
                        <div class="stats-grid">
                            ${operationStats.totalRecords ? `
                                <div class="stat-item">
                                    <span class="stat-label">Records:</span>
                                    <span class="stat-value">${operationStats.totalRecords}</span>
                                </div>
                            ` : ''}
                            ${operationStats.success !== undefined ? `
                                <div class="stat-item success">
                                    <span class="stat-label">Success:</span>
                                    <span class="stat-value">${operationStats.success}</span>
                                </div>
                            ` : ''}
                            ${operationStats.failed !== undefined ? `
                                <div class="stat-item error">
                                    <span class="stat-label">Failed:</span>
                                    <span class="stat-value">${operationStats.failed}</span>
                                </div>
                            ` : ''}
                            ${operationStats.duration ? `
                                <div class="stat-item">
                                    <span class="stat-label">Duration:</span>
                                    <span class="stat-value">${this.formatDuration(operationStats.duration)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <!-- Log Details (expandable) -->
                ${hasData ? `
                    <div class="log-entry-details" style="display: none;">
                        <div class="details-header">
                            <h4><i class="fas fa-info-circle"></i> Additional Details</h4>
                        </div>
                        <div class="details-content">
                            ${this.formatLogData(log.data)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Extract operation statistics from log data
     */
    extractOperationStats(log) {
        if (!log.data) return null;
        
        const stats = {};
        
        // Look for common operation stats in the data
        if (log.data.totalRecords !== undefined) stats.totalRecords = log.data.totalRecords;
        if (log.data.success !== undefined) stats.success = log.data.success;
        if (log.data.failed !== undefined) stats.failed = log.data.failed;
        if (log.data.duration !== undefined) stats.duration = log.data.duration;
        if (log.data.operationId) stats.operationId = log.data.operationId;
        
        // If we have operation stats, return them
        return Object.keys(stats).length > 0 ? stats : null;
    }

    /**
     * Format log data for display
     */
    formatLogData(data) {
        if (!data) return '';
        
        let html = '';
        
        // Handle different types of data
        if (typeof data === 'object') {
            // Check if it's an operation result
            if (data.operationId) {
                html += this.formatOperationData(data);
            } else {
                html += `<pre class="data-display">${JSON.stringify(data, null, 2)}</pre>`;
            }
        } else {
            html += `<div class="data-text">${this.escapeHtml(String(data))}</div>`;
        }
        
        return html;
    }

    /**
     * Format operation data for display
     */
    formatOperationData(data) {
        let html = '<div class="operation-data">';
        
        if (data.operationId) {
            html += `<div class="data-item"><strong>Operation ID:</strong> ${data.operationId}</div>`;
        }
        
        if (data.records) {
            html += '<div class="data-section"><h5>Records</h5>';
            html += `<div class="data-item"><strong>Total:</strong> ${data.records.total || 0}</div>`;
            html += `<div class="data-item"><strong>Processed:</strong> ${data.records.processed || 0}</div>`;
            html += `<div class="data-item"><strong>Success:</strong> ${data.records.success || 0}</div>`;
            html += `<div class="data-item"><strong>Failed:</strong> ${data.records.failed || 0}</div>`;
            html += '</div>';
        }
        
        if (data.errors && data.errors.length > 0) {
            html += '<div class="data-section"><h5>Errors</h5>';
            data.errors.forEach(error => {
                html += `<div class="error-item">${this.escapeHtml(error.message || error)}</div>`;
            });
            html += '</div>';
        }
        
        if (data.warnings && data.warnings.length > 0) {
            html += '<div class="data-section"><h5>Warnings</h5>';
            data.warnings.forEach(warning => {
                html += `<div class="warning-item">${this.escapeHtml(warning.message || warning)}</div>`;
            });
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Format duration for display
     */
    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(1);
        return `${minutes}m ${seconds}s`;
    }

    /**
     * Toggle log entry details
     */
    toggleLogDetails(event) {
        event.preventDefault();
        const button = event.target.closest('.log-details-toggle');
        const logEntry = button.closest('.log-entry');
        const details = logEntry.querySelector('.log-entry-details');
        const icon = button.querySelector('i');
        
        if (details.style.display === 'none') {
            details.style.display = 'block';
            button.classList.add('expanded');
            icon.style.transform = 'rotate(180deg)';
        } else {
            details.style.display = 'none';
            button.classList.remove('expanded');
            icon.style.transform = 'rotate(0deg)';
        }
    }

    /**
     * Get icon for log level
     */
    getLevelEmoji(level) {
        // Winston emoji mapping
        const emojis = {
            error: '❌',
            warn: '⚠️',
            info: 'ℹ️',
            debug: '🐛',
            trace: '🔍'
        };
        return emojis[level] || '📄';
    }

    /**
     * Get icon for log category
     */
    getCategoryIcon(category) {
        const icons = {
            system: '<i class="fas fa-cogs"></i>',
            auth: '<i class="fas fa-lock"></i>',
            api: '<i class="fas fa-exchange-alt"></i>',
            ui: '<i class="fas fa-desktop"></i>',
            database: '<i class="fas fa-database"></i>',
            network: '<i class="fas fa-network-wired"></i>'
        };
        return icons[category] || '<i class="fas fa-tag"></i>';
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
        
// All code after escapeHtml should be inside the class body. Remove stray code and ensure class closure and export.
 */

export class LoggingUIComponent {
    constructor(loggingSubsystem, eventBus, logger) {
        this.loggingSubsystem = loggingSubsystem;
        this.eventBus = eventBus;
        this.logger = logger;
        this.currentLogs = [];
        this.filteredLogs = [];
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.isLoading = false;
        this.isAutoRefresh = true;
        this.refreshInterval = null;
        this.currentFilters = {
            level: 'all',
            category: 'all',
            dateFrom: '',
            dateTo: '',
            search: ''
        };
        this.elements = {};
        this.filterTimeout = null;
        this.logger?.debug?.('LoggingUIComponent initialized');
    }

    async init() {
        try {
            this.logger.info('Initializing LoggingUIComponent');
            this.createUI();
            this.cacheElements();
            this.setupEventListeners();
            this.setupFilterListeners();
            await this.loadLogs();
            this.startAutoRefresh();
            this.logger.info('LoggingUIComponent initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize LoggingUIComponent:', error);
            throw error;
        }
    }

    createUI() {
        const container = document.getElementById('logs-view');
        if (!container) {
            this.logger.error('Logs view container not found');
            return;
        }
        container.innerHTML = `
            <div class="logging-container">
                <div class="logging-header">
                    <h2><i class="fas fa-file-alt"></i> System Logs</h2>
                    <p>Monitor and analyze system activity</p>
                </div>
                <div class="logging-stats">
                    <div class="stat-card"><div class="stat-value" id="total-logs">0</div><div class="stat-label">Total Logs</div></div>
                    <div class="stat-card"><div class="stat-value" id="error-logs">0</div><div class="stat-label">Errors</div></div>
                    <div class="stat-card"><div class="stat-value" id="warning-logs">0</div><div class="stat-label">Warnings</div></div>
                    <div class="stat-card"><div class="stat-value" id="info-logs">0</div><div class="stat-label">Info</div></div>
                </div>
                <div class="logging-controls">
                    <div class="logging-filters">
                        <div class="filter-group"><label for="level-filter">Level</label><select id="level-filter"><option value="all">All Levels</option><option value="error">Error</option><option value="warn">Warning</option><option value="info">Info</option><option value="debug">Debug</option><option value="trace">Trace</option></select></div>
                        <div class="filter-group"><label for="category-filter">Category</label><select id="category-filter"><option value="all">All Categories</option><option value="system">System</option><option value="auth">Authentication</option><option value="import">Import</option><option value="export">Export</option><option value="delete">Delete</option><option value="modify">Modify</option><option value="ui">UI</option><option value="api">API</option><option value="error">Error</option></select></div>
                        <div class="filter-group"><label for="date-from">From Date</label><input type="datetime-local" id="date-from"></div>
                        <div class="filter-group"><label for="date-to">To Date</label><input type="datetime-local" id="date-to"></div>
                        <div class="filter-group"><label for="search-filter">Search</label><input type="text" id="search-filter" placeholder="Search logs..."></div>
                    </div>
                    <div class="logging-actions">
                        <button class="btn-modern" id="refresh-btn"><i class="fas fa-sync-alt"></i> Refresh</button>
                        <button class="btn-modern" id="export-btn"><i class="fas fa-download"></i> Export</button>
                        <button class="btn-modern" id="clear-filters-btn"><i class="fas fa-filter"></i> Clear Filters</button>
                        <label class="auto-refresh-toggle"><input type="checkbox" id="auto-refresh-toggle" checked><span>Auto Refresh</span></label>
                        <button class="btn-modern btn-danger" id="clear-logs-btn"><i class="fas fa-trash"></i> Clear Logs</button>
                    </div>
                </div>
                <div class="logging-list" id="logging-list"><div class="loading-state"><div class="loading-spinner"></div><p>Loading logs...</p></div></div>
                <div class="logging-pagination" id="pagination" style="display: none;"><button id="prev-page" class="btn-modern" disabled><i class="fas fa-chevron-left"></i> Previous</button><span id="pagination-info">Page 1 of 1</span><button id="next-page" class="btn-modern" disabled>Next <i class="fas fa-chevron-right"></i></button></div>
            </div>
        `;
    }

    cacheElements() {
        this.elements = {
            loggingList: document.getElementById('logging-list'),
            pagination: document.getElementById('pagination'),
            levelFilter: document.getElementById('level-filter'),
            categoryFilter: document.getElementById('category-filter'),
            dateFromFilter: document.getElementById('date-from'),
            dateToFilter: document.getElementById('date-to'),
            searchFilter: document.getElementById('search-filter'),
            totalLogs: document.getElementById('total-logs'),
            errorLogs: document.getElementById('error-logs'),
            warningLogs: document.getElementById('warning-logs'),
            infoLogs: document.getElementById('info-logs'),
            prevPageBtn: document.getElementById('prev-page'),
            nextPageBtn: document.getElementById('next-page'),
            paginationInfo: document.getElementById('pagination-info'),
            refreshBtn: document.getElementById('refresh-btn'),
            exportBtn: document.getElementById('export-btn'),
            clearFiltersBtn: document.getElementById('clear-filters-btn'),
            autoRefreshToggle: document.getElementById('auto-refresh-toggle'),
            clearLogsBtn: document.getElementById('clear-logs-btn')
        };
    }

    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on('logEntryAdded', () => {
                this.logger.debug('Log entry added event received');
                if (this.isAutoRefresh) {
                    this.loadLogs();
                }
            });
            this.eventBus.on('logsCleared', () => {
                this.logger.debug('Logs cleared event received');
                this.currentLogs = [];
                this.filteredLogs = [];
                this.displayLogs();
            });
        }
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.refresh());
        }
        if (this.elements.exportBtn) {
            this.elements.exportBtn.addEventListener('click', () => this.exportLogs());
        }
        if (this.elements.clearFiltersBtn) {
            this.elements.clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
        if (this.elements.clearLogsBtn) {
            this.elements.clearLogsBtn.addEventListener('click', () => this.clearLogs());
        }
        if (this.elements.autoRefreshToggle) {
            this.elements.autoRefreshToggle.addEventListener('change', (e) => {
                this.isAutoRefresh = e.target.checked;
                if (this.isAutoRefresh) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.addEventListener('click', () => this.previousPage());
        }
        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.addEventListener('click', () => this.nextPage());
        }
    }

    setupFilterListeners() {
        const filterElements = [
            this.elements.levelFilter,
            this.elements.categoryFilter,
            this.elements.dateFromFilter,
            this.elements.dateToFilter
        ];
        filterElements.forEach(element => {
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });
        if (this.elements.searchFilter) {
            this.elements.searchFilter.addEventListener('input', () => this.debounceFilter());
        }
    }

    debounceFilter() {
        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
        }
        this.filterTimeout = setTimeout(() => this.applyFilters(), 300);
    }

    async loadLogs() {
        if (this.isLoading) return;
        try {
            this.isLoading = true;
            this.showLoadingState();
            this.logger.debug('Loading logs from LoggingSubsystem');
            const logsData = await this.loggingSubsystem.loadLogs({ limit: 1000, includeData: true });
            this.currentLogs = logsData.logs || [];
            this.applyFilters();
            this.updateStatistics();
            this.logger.debug('Logs loaded successfully', { count: this.currentLogs.length });
        } catch (error) {
            this.logger.error('Failed to load logs:', error);
            this.showError('Failed to load logs', error.message);
        } finally {
            this.isLoading = false;
        }
    }

    applyFilters() {
        this.currentFilters = {
            level: this.elements.levelFilter?.value || 'all',
            category: this.elements.categoryFilter?.value || 'all',
            dateFrom: this.elements.dateFromFilter?.value || '',
            dateTo: this.elements.dateToFilter?.value || '',
            search: this.elements.searchFilter?.value || ''
        };
        this.filteredLogs = this.currentLogs.filter(log => this.matchesFilters(log));
        this.currentPage = 1;
        this.displayLogs();
        this.logger.debug('Filters applied', { filters: this.currentFilters, resultCount: this.filteredLogs.length });
    }

    matchesFilters(log) {
        if (this.currentFilters.level !== 'all' && log.level !== this.currentFilters.level) return false;
        if (this.currentFilters.category !== 'all' && log.category !== this.currentFilters.category) return false;
        if (this.currentFilters.dateFrom) {
            const logDate = new Date(log.timestamp);
            const fromDate = new Date(this.currentFilters.dateFrom);
            if (logDate < fromDate) return false;
        }
        if (this.currentFilters.dateTo) {
            const logDate = new Date(log.timestamp);
            const toDate = new Date(this.currentFilters.dateTo);
            if (logDate > toDate) return false;
        }
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            const searchableText = [log.message, log.category, log.level, JSON.stringify(log.data)].join(' ').toLowerCase();
            if (!searchableText.includes(searchTerm)) return false;
        }
        return true;
    }

    displayLogs() {
        if (!this.elements.loggingList) return;
        if (this.filteredLogs.length === 0) {
            this.showNoLogs();
            return;
        }
        const totalPages = Math.ceil(this.filteredLogs.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageLogs = this.filteredLogs.slice(startIndex, endIndex);
        let html = '';
        pageLogs.forEach(log => { html += this.createLogEntryHTML(log); });
        this.elements.loggingList.innerHTML = html;
        this.updatePagination(totalPages);
    }

    createLogEntryHTML(log) {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const levelClass = `log-level-${log.level}`;
        const hasData = log.data && Object.keys(log.data).length > 0;
        const emoji = this.getLevelEmoji(log.level);
        const categoryIcon = this.getCategoryIcon(log.category);
        
        // Extract operation stats if available
        const operationStats = this.extractOperationStats(log);
        
        return `
            <div class="log-entry ${levelClass}" data-level="${log.level}" data-category="${log.category}">
                <!-- Log Entry Header -->
                <div class="log-entry-header">
                    <div class="log-entry-meta">
                        <div class="log-level-badge">
                            <span class="log-level-emoji">${emoji}</span>
                            <span class="log-level-text">${log.level.toUpperCase()}</span>
                        </div>
                        <div class="log-category">
                            <span class="category-icon">${categoryIcon}</span>
                            <span class="category-text">${log.category}</span>
                        </div>
                        <div class="log-timestamp">
                            <i class="fas fa-clock"></i>
                            <span>${timestamp}</span>
                        </div>
                    </div>
                    ${hasData ? `
                        <div class="log-entry-actions">
                            <button class="log-details-toggle" onclick="window.loggingUI.toggleLogDetails(event)" title="Toggle details">
                                <i class="fas fa-chevron-down"></i>
                                <span>Details</span>
                            </button>
                        </div>
                    ` : ''}
                </div>

                <!-- Log Message -->
                <div class="log-entry-message">
                    ${this.escapeHtml(log.message)}
                </div>

                <!-- Operation Stats (if available) -->
                ${operationStats ? `
                    <div class="log-operation-stats">
                        <div class="stats-grid">
                            ${operationStats.totalRecords ? `
                                <div class="stat-item">
                                    <span class="stat-label">Records:</span>
                                    <span class="stat-value">${operationStats.totalRecords}</span>
                                </div>
                            ` : ''}
                            ${operationStats.success !== undefined ? `
                                <div class="stat-item success">
                                    <span class="stat-label">Success:</span>
                                    <span class="stat-value">${operationStats.success}</span>
                                </div>
                            ` : ''}
                            ${operationStats.failed !== undefined ? `
                                <div class="stat-item error">
                                    <span class="stat-label">Failed:</span>
                                    <span class="stat-value">${operationStats.failed}</span>
                                </div>
                            ` : ''}
                            ${operationStats.duration ? `
                                <div class="stat-item">
                                    <span class="stat-label">Duration:</span>
                                    <span class="stat-value">${this.formatDuration(operationStats.duration)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <!-- Log Details (expandable) -->
                ${hasData ? `
                    <div class="log-entry-details" style="display: none;">
                        <div class="details-header">
                            <h4><i class="fas fa-info-circle"></i> Additional Details</h4>
                        </div>
                        <div class="details-content">
                            ${this.formatLogData(log.data)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getLevelEmoji(level) {
        const emojis = {
            error: '❌',
            warn: '⚠️',
            info: 'ℹ️',
            debug: '🐛',
            trace: '🔍'
        };
        return emojis[level] || '📄';
    }

    getCategoryIcon(category) {
        const icons = {
            system: '<i class="fas fa-server"></i>',
            auth: '<i class="fas fa-lock"></i>',
            import: '<i class="fas fa-file-import"></i>',
            export: '<i class="fas fa-file-export"></i>',
            delete: '<i class="fas fa-trash"></i>',
            modify: '<i class="fas fa-edit"></i>',
            ui: '<i class="fas fa-desktop"></i>',
            api: '<i class="fas fa-plug"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>'
        };
        return icons[category] || '<i class="fas fa-tag"></i>';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStatistics() {
        const stats = { total: this.currentLogs.length, error: 0, warn: 0, info: 0 };
        this.currentLogs.forEach(log => {
            if (log.level === 'error') stats.error++;
            else if (log.level === 'warn') stats.warn++;
            else if (log.level === 'info') stats.info++;
        });
        if (this.elements.totalLogs) this.elements.totalLogs.textContent = stats.total;
        if (this.elements.errorLogs) this.elements.errorLogs.textContent = stats.error;
        if (this.elements.warningLogs) this.elements.warningLogs.textContent = stats.warn;
        if (this.elements.infoLogs) this.elements.infoLogs.textContent = stats.info;
    }

    updatePagination(totalPages) {
        if (!this.elements.pagination) return;
        this.elements.pagination.style.display = totalPages > 1 ? 'flex' : 'none';
        if (this.elements.paginationInfo) this.elements.paginationInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        if (this.elements.prevPageBtn) this.elements.prevPageBtn.disabled = this.currentPage === 1;
        if (this.elements.nextPageBtn) this.elements.nextPageBtn.disabled = this.currentPage === totalPages;
    }

    showLoadingState() {
        if (this.elements.loggingList) {
            this.elements.loggingList.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Loading logs...</p></div>`;
        }
    }

    showNoLogs() {
        if (this.elements.loggingList) {
            this.elements.loggingList.innerHTML = `<div class="no-logs"><i class="fas fa-file-alt"></i><h3>No Logs Found</h3><p>No logs match your current filters.</p></div>`;
        }
    }

    showError(title, message) {
        if (this.elements.loggingList) {
            this.elements.loggingList.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-circle"></i><h3>${title}</h3><p>${message}</p></div>`;
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredLogs.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.displayLogs();
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayLogs();
        }
    }

    clearFilters() {
        if (this.elements.levelFilter) this.elements.levelFilter.value = 'all';
        if (this.elements.categoryFilter) this.elements.categoryFilter.value = 'all';
        if (this.elements.dateFromFilter) this.elements.dateFromFilter.value = '';
        if (this.elements.dateToFilter) this.elements.dateToFilter.value = '';
        if (this.elements.searchFilter) this.elements.searchFilter.value = '';
        this.applyFilters();
    }

    async exportLogs() {
        // Example: export logs as JSON
        const dataStr = JSON.stringify(this.filteredLogs, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'logs.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async clearLogs() {
        if (this.loggingSubsystem) {
            await this.loggingSubsystem.clearLogs();
            this.currentLogs = [];
            this.filteredLogs = [];
            this.displayLogs();
        }
    }

    async refresh() {
        this.logger.debug('Refreshing logs');
        await this.loadLogs();
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.refreshInterval = setInterval(() => {
            if (this.isAutoRefresh && !this.isLoading) {
                this.loadLogs();
            }
        }, 5000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    destroy() {
        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
        }
        this.stopAutoRefresh();
        if (this.eventBus) {
            this.eventBus.off('logEntryAdded');
            this.eventBus.off('logsCleared');
        }
        this.logger.debug('LoggingUIComponent destroyed');
    }
}

export default LoggingUIComponent;
