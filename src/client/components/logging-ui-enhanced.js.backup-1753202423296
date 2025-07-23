/**
 * Enhanced Logging UI Component
 * Modern logging interface with bolder colors, improved arrow styling, and enhanced log type filters
 * Integrated with LoggingSubsystem for comprehensive log viewing and management
 */

export class EnhancedLoggingUIComponent {
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
        
        // Log type counts for filters
        this.logTypeCounts = {
            all: 0,
            error: 0,
            warn: 0,
            info: 0,
            debug: 0,
            trace: 0
        };
        
        // UI elements cache
        this.elements = {};
        this.filterTimeout = null;
        
        // Make available globally for onclick handlers
        window.enhancedLoggingUI = this;
        
        this.logger.debug('EnhancedLoggingUIComponent initialized');
    }

    /**
     * Initialize the Enhanced Logging UI Component
     */
    async init() {
        try {
            this.logger.info('Initializing EnhancedLoggingUIComponent');
            
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
            
            this.logger.info('EnhancedLoggingUIComponent initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize EnhancedLoggingUIComponent:', error);
            throw error;
        }
    }

    /**
     * Create the enhanced UI structure with log type filters
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
                    <h2><i class="fas fa-file-alt"></i> Enhanced System Logs</h2>
                    <p>Monitor and analyze system activity with enhanced filtering and visualization</p>
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

                <!-- Enhanced Log Type Filters -->
                <div class="log-type-filters">
                    <button class="log-type-filter active" data-type="all">All Logs <span class="log-count" id="count-all">0</span></button>
                    <button class="log-type-filter" data-type="error">Errors <span class="log-count" id="count-error">0</span></button>
                    <button class="log-type-filter" data-type="warn">Warnings <span class="log-count" id="count-warn">0</span></button>
                    <button class="log-type-filter" data-type="info">Info <span class="log-count" id="count-info">0</span></button>
                    <button class="log-type-filter" data-type="debug">Debug <span class="log-count" id="count-debug">0</span></button>
                    <button class="log-type-filter" data-type="trace">Trace <span class="log-count" id="count-trace">0</span></button>
                </div>

                <!-- Filter and Action Controls -->
                <div class="logging-controls">
                    <div class="filter-group">
                        <label for="log-category-filter">Category</label>
                        <select id="log-category-filter">
                            <option value="all">All</option>
                            <option value="general">General</option>
                            <option value="auth">Authentication</option>
                            <option value="api">API</option>
                            <option value="import">Import</option>
                            <option value="export">Export</option>
                            <option value="system">System</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="log-date-from">From</label>
                        <input type="date" id="log-date-from">
                    </div>
                    <div class="filter-group">
                        <label for="log-date-to">To</label>
                        <input type="date" id="log-date-to">
                    </div>
                    <div class="filter-group search-filter">
                        <label for="log-search-filter">Search</label>
                        <input type="text" id="log-search-filter" placeholder="Search logs...">
                    </div>
                    <div class="action-group">
                        <button id="clear-filters-btn" class="btn btn-secondary"><i class="fas fa-times"></i> Clear</button>
                        <button id="export-logs-btn" class="btn btn-primary"><i class="fas fa-download"></i> Export</button>
                        <button id="clear-logs-btn" class="btn btn-danger"><i class="fas fa-trash"></i> Clear Logs</button>
                        <button id="refresh-logs-btn" class="btn btn-primary"><i class="fas fa-sync"></i> Refresh</button>
                    </div>
                </div>

                <!-- Logging List -->
                <div id="logging-list-container" class="logging-list-container">
                    <!-- Loading state -->
                    <div id="logging-loading" class="loading-overlay" style="display: none;">
                        <div class="spinner"></div>
                        <p>Loading logs...</p>
                    </div>
                    <!-- No logs state -->
                    <div id="no-logs-message" class="no-logs-message" style="display: none;">
                        <i class="fas fa-info-circle"></i>
                        <p>No logs found. Try adjusting your filters.</p>
                    </div>
                    <!-- Error state -->
                    <div id="logging-error" class="error-message" style="display: none;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4 id="logging-error-title">Error</h4>
                        <p id="logging-error-message">An unexpected error occurred.</p>
                    </div>
                    <ul id="logging-list"></ul>
                </div>

                <!-- Pagination -->
                <div class="logging-pagination">
                    <button id="prev-page-btn" class="btn btn-secondary" disabled><i class="fas fa-arrow-left"></i> Previous</button>
                    <span id="page-info">Page 1 of 1</span>
                    <button id="next-page-btn" class="btn btn-secondary" disabled><i class="fas fa-arrow-right"></i> Next</button>
                </div>
            </div>
        `;
    }

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.elements.container = document.getElementById('logs-view');
        this.elements.loggingList = this.elements.container.querySelector('#logging-list');
        this.elements.loadingOverlay = this.elements.container.querySelector('#logging-loading');
        this.elements.noLogsMessage = this.elements.container.querySelector('#no-logs-message');
        this.elements.errorMessage = this.elements.container.querySelector('#logging-error');
        this.elements.errorTitle = this.elements.container.querySelector('#logging-error-title');
        this.elements.errorMessageText = this.elements.container.querySelector('#logging-error-message');
        
        // Stats
        this.elements.totalLogs = this.elements.container.querySelector('#total-logs');
        this.elements.errorLogs = this.elements.container.querySelector('#error-logs');
        this.elements.warningLogs = this.elements.container.querySelector('#warning-logs');
        this.elements.infoLogs = this.elements.container.querySelector('#info-logs');
        
        // Filters
        this.elements.categoryFilter = this.elements.container.querySelector('#log-category-filter');
        this.elements.dateFromFilter = this.elements.container.querySelector('#log-date-from');
        this.elements.dateToFilter = this.elements.container.querySelector('#log-date-to');
        this.elements.searchFilter = this.elements.container.querySelector('#log-search-filter');
        
        // Pagination
        this.elements.prevPageBtn = this.elements.container.querySelector('#prev-page-btn');
        this.elements.nextPageBtn = this.elements.container.querySelector('#next-page-btn');
        this.elements.pageInfo = this.elements.container.querySelector('#page-info');
    }

    /**
     * Setup event listeners for real-time updates
     */
    setupEventListeners() {
        // EventBus listeners
        this.eventBus.on('logEntryAdded', this.handleNewLogEntry.bind(this));
        this.eventBus.on('logsCleared', this.handleLogsCleared.bind(this));

        // Pagination listeners
        this.elements.prevPageBtn.addEventListener('click', () => this.previousPage());
        this.elements.nextPageBtn.addEventListener('click', () => this.nextPage());

        // Action listeners
        const clearFiltersBtn = this.elements.container.querySelector('#clear-filters-btn');
        clearFiltersBtn.addEventListener('click', () => this.clearFilters());

        const exportLogsBtn = this.elements.container.querySelector('#export-logs-btn');
        exportLogsBtn.addEventListener('click', () => this.exportLogs());

        const clearLogsBtn = this.elements.container.querySelector('#clear-logs-btn');
        clearLogsBtn.addEventListener('click', () => this.clearLogs());

        const refreshLogsBtn = this.elements.container.querySelector('#refresh-logs-btn');
        refreshLogsBtn.addEventListener('click', () => this.refresh());

        // Log type filter listeners
        const logTypeFilters = this.elements.container.querySelectorAll('.log-type-filter');
        logTypeFilters.forEach(button => {
            button.addEventListener('click', () => {
                this.filterByType(button.dataset.type);
            });
        });
    }

    /**
     * Setup filter change listeners
     */
    setupFilterListeners() {
        this.elements.categoryFilter.addEventListener('change', () => {
            this.currentFilters.category = this.elements.categoryFilter.value;
            this.applyFilters();
        });

        this.elements.dateFromFilter.addEventListener('change', () => {
            this.currentFilters.dateFrom = this.elements.dateFromFilter.value;
            this.applyFilters();
        });

        this.elements.dateToFilter.addEventListener('change', () => {
            this.currentFilters.dateTo = this.elements.dateToFilter.value;
            this.applyFilters();
        });

        this.elements.searchFilter.addEventListener('input', this.debounceFilter.bind(this));
    }

    /**
     * Debounce filter for search input
     */
    debounceFilter() {
        clearTimeout(this.filterTimeout);
        this.filterTimeout = setTimeout(() => {
            this.currentFilters.search = this.elements.searchFilter.value;
            this.applyFilters();
        }, 300);
    }

    /**
     * Filter logs by type (enhanced log type filters)
     */
    filterByType(type) {
        this.currentFilters.level = type;
        this.applyFilters();
        
        // Update active class on filter buttons
        const logTypeFilters = this.elements.container.querySelectorAll('.log-type-filter');
        logTypeFilters.forEach(button => {
            if (button.dataset.type === type) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    /**
     * Load logs from LoggingSubsystem
     */
    async loadLogs() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            this.logger.debug('Loading logs from subsystem');
            
            const logs = await this.loggingSubsystem.getLogs();
            this.currentLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            this.logger.debug(`Loaded ${this.currentLogs.length} logs`);

            // Update log type counts
            this.updateLogTypeCounts();

            // Apply filters and display
            this.applyFilters();
            
        } catch (error) {
            this.logger.error('Failed to load logs:', error);
            this.showError('Failed to load logs', error.message);
        } finally {
            this.isLoading = false;
            this.elements.loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Update log type counts for filter buttons
     */
    updateLogTypeCounts() {
        this.logTypeCounts = {
            all: this.currentLogs.length,
            error: this.currentLogs.filter(log => log.level === 'error').length,
            warn: this.currentLogs.filter(log => log.level === 'warn').length,
            info: this.currentLogs.filter(log => log.level === 'info').length,
            debug: this.currentLogs.filter(log => log.level === 'debug').length,
            trace: this.currentLogs.filter(log => log.level === 'trace').length
        };

        for (const type in this.logTypeCounts) {
            const countElement = this.elements.container.querySelector(`#count-${type}`);
            if (countElement) {
                countElement.textContent = this.logTypeCounts[type];
            }
        }
    }

    /**
     * Apply current filters to logs
     */
    applyFilters() {
        this.logger.debug('Applying filters', { filters: this.currentFilters });

        // Filter logs
        this.filteredLogs = this.currentLogs.filter(log => this.matchesFilters(log));
        
        // Reset to first page
        this.currentPage = 1;
        
        // Display filtered results
        this.displayLogs();
        
        // Update UI elements
        this.updateStatistics();
        this.updatePagination();
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
    }

    /**
     * Create HTML for a log entry with enhanced styling
     */
    createLogEntryHTML(log) {
        const levelIcon = this.getLevelIcon(log.level);
        const categoryIcon = this.getCategoryIcon(log.category);
        const formattedTimestamp = new Date(log.timestamp).toLocaleString();

        return `
            <li class="log-entry log-level-${log.level}" onclick="enhancedLoggingUI.toggleLogDetails(event)">
                <div class="log-header">
                    <span class="log-icon">${levelIcon}</span>
                    <span class="log-timestamp">${formattedTimestamp}</span>
                    <span class="log-category">${categoryIcon} ${this.escapeHtml(log.category)}</span>
                    <span class="log-message">${this.escapeHtml(log.message)}</span>
                    <span class="log-arrow"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div class="log-details" style="display: none;">
                    <h4>Details</h4>
                    <pre>${this.escapeHtml(JSON.stringify(log.data, null, 2))}</pre>
                </div>
            </li>
        `;
    }

    /**
     * Toggle log entry details with enhanced arrow animation
     */
    toggleLogDetails(event) {
        const logEntry = event.target.closest('.log-entry');
        if (!logEntry) return;

        const details = logEntry.querySelector('.log-details');
        const arrow = logEntry.querySelector('.log-arrow i');

        if (details.style.display === 'none') {
            details.style.display = 'block';
            arrow.classList.remove('fa-chevron-down');
            arrow.classList.add('fa-chevron-up');
        } else {
            details.style.display = 'none';
            arrow.classList.remove('fa-chevron-up');
            arrow.classList.add('fa-chevron-down');
        }
    }

    /**
     * Get icon for log level with enhanced colors
     */
    getLevelIcon(level) {
        switch (level) {
            case 'error': return '<i class="fas fa-times-circle log-icon-error"></i>';
            case 'warn': return '<i class="fas fa-exclamation-triangle log-icon-warn"></i>';
            case 'info': return '<i class="fas fa-info-circle log-icon-info"></i>';
            case 'debug': return '<i class="fas fa-bug log-icon-debug"></i>';
            case 'trace': return '<i class="fas fa-stream log-icon-trace"></i>';
            default: return '<i class="fas fa-question-circle"></i>';
        }
    }

    /**
     * Get icon for log category
     */
    getCategoryIcon(category) {
        switch (category) {
            case 'auth': return '<i class="fas fa-shield-alt"></i>';
            case 'api': return '<i class="fas fa-server"></i>';
            case 'import': return '<i class="fas fa-upload"></i>';
            case 'export': return '<i class="fas fa-download"></i>';
            case 'system': return '<i class="fas fa-cogs"></i>';
            default: return '<i class="fas fa-file-alt"></i>';
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Update statistics display
     */
    updateStatistics() {
        this.elements.totalLogs.textContent = this.currentLogs.length;
        this.elements.errorLogs.textContent = this.logTypeCounts.error;
        this.elements.warningLogs.textContent = this.logTypeCounts.warn;
        this.elements.infoLogs.textContent = this.logTypeCounts.info;
    }

    /**
     * Update pagination controls
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredLogs.length / this.itemsPerPage);
        this.elements.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        this.elements.prevPageBtn.disabled = this.currentPage === 1;
        this.elements.nextPageBtn.disabled = this.currentPage === totalPages;
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        this.elements.loadingOverlay.style.display = 'flex';
        this.elements.noLogsMessage.style.display = 'none';
        this.elements.errorMessage.style.display = 'none';
        this.elements.loggingList.innerHTML = '';
    }

    /**
     * Show no logs state
     */
    showNoLogs() {
        this.elements.loadingOverlay.style.display = 'none';
        this.elements.noLogsMessage.style.display = 'block';
        this.elements.errorMessage.style.display = 'none';
        this.elements.loggingList.innerHTML = '';
    }

    /**
     * Show error state
     */
    showError(title, message) {
        this.elements.loadingOverlay.style.display = 'none';
        this.elements.noLogsMessage.style.display = 'none';
        this.elements.errorMessage.style.display = 'block';
        this.elements.errorTitle.textContent = title;
        this.elements.errorMessageText.textContent = message;
        this.elements.loggingList.innerHTML = '';
    }

    /**
     * Navigate to next page
     */
    nextPage() {
        const totalPages = Math.ceil(this.filteredLogs.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.displayLogs();
        }
    }

    /**
     * Navigate to previous page
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayLogs();
        }
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        if (this.elements.categoryFilter) this.elements.categoryFilter.value = 'all';
        if (this.elements.dateFromFilter) this.elements.dateFromFilter.value = '';
        if (this.elements.dateToFilter) this.elements.dateToFilter.value = '';
        if (this.elements.searchFilter) this.elements.searchFilter.value = '';
        
        // Reset log type filter to 'all'
        this.filterByType('all');
        
        this.logger.debug('Filters cleared');
    }

    /**
     * Export logs using LoggingSubsystem
     */
    async exportLogs() {
        try {
            this.logger.info('Exporting logs');
            
            await this.loggingSubsystem.exportLogs({
                format: 'csv',
                filtered: true,
                filters: this.currentFilters
            });
            
            this.logger.info('Logs exported successfully');
            
        } catch (error) {
            this.logger.error('Failed to export logs:', error);
            alert('Failed to export logs: ' + error.message);
        }
    }

    /**
     * Clear all logs using LoggingSubsystem
     */
    async clearLogs() {
        if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
            return;
        }

        try {
            this.logger.info('Clearing all logs');
            
            await this.loggingSubsystem.clearLogs();
            
            this.logger.info('Logs cleared successfully');
            
            // Reload logs to reflect changes
            await this.loadLogs();
            
        } catch (error) {
            this.logger.error('Failed to clear logs:', error);
            alert('Failed to clear logs: ' + error.message);
        }
    }

    /**
     * Refresh logs data
     */
    async refresh() {
        this.logger.debug('Refreshing logs');
        await this.loadLogs();
    }

    /**
     * Handle new log entry from EventBus
     */
    handleNewLogEntry(logEntry) {
        this.currentLogs.unshift(logEntry);
        this.updateLogTypeCounts();
        this.applyFilters();
        this.updateStatistics();
    }

    /**
     * Handle logs cleared event from EventBus
     */
    handleLogsCleared() {
        this.currentLogs = [];
        this.filteredLogs = [];
        this.updateLogTypeCounts();
        this.displayLogs();
        this.updateStatistics();
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            if (this.isAutoRefresh && !this.isLoading) {
                this.loadLogs();
            }
        }, 5000); // Refresh every 5 seconds
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Destroy the UI and cleanup
     */
    destroy() {
        // Clear timeouts and intervals
        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
        }
        
        this.stopAutoRefresh();
        
        // Remove event listeners
        if (this.eventBus) {
            this.eventBus.off('logEntryAdded');
            this.eventBus.off('logsCleared');
        }
        
        // Clean up global reference
        if (window.enhancedLoggingUI === this) {
            delete window.enhancedLoggingUI;
        }
        
        this.logger.debug('EnhancedLoggingUIComponent destroyed');
    }
}

export default EnhancedLoggingUIComponent;
