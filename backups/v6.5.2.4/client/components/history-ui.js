/**
 * History UI Component
 * Modern history management interface integrated with HistorySubsystem
 * Provides comprehensive history viewing, filtering, and management capabilities
 */

export class HistoryUIComponent {
    constructor(historySubsystem, eventBus, logger) {
        this.historySubsystem = historySubsystem;
        this.eventBus = eventBus;
        this.logger = logger;
        
        // UI state
        this.currentHistory = [];
        this.filteredHistory = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.isLoading = false;
        
        // Filter state
        this.currentFilters = {
            category: '',
            status: '',
            dateFrom: '',
            dateTo: '',
            search: ''
        };
        
        // UI elements cache
        this.elements = {};
        this.filterTimeout = null;
        
        this.logger.debug('HistoryUIComponent initialized');
    }

    /**
     * Initialize the History UI Component
     */
    async init() {
        try {
            this.logger.info('Initializing HistoryUIComponent');
            
            // Create the UI container
            this.createUI();
            
            // Cache DOM elements
            this.cacheElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup filter listeners
            this.setupFilterListeners();
            
            // Load initial history
            await this.loadHistory();
            
            this.logger.info('HistoryUIComponent initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize HistoryUIComponent:', error);
            throw error;
        }
    }

    /**
     * Create the UI structure
     */
    createUI() {
        const container = document.getElementById('history-view');
        if (!container) {
            this.logger.error('History view container not found');
            return;
        }

        container.innerHTML = `
            <div class="history-container">
                <!-- Header -->
                <div class="history-header">
                    <h2><i class="fas fa-history"></i> Operation History</h2>
                    <p>Track and manage all operations</p>
                </div>

                <!-- Statistics Cards -->
                <div class="history-stats">
                    <div class="stat-card">
                        <div class="stat-value" id="total-operations">0</div>
                        <div class="stat-label">Total Operations</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="successful-operations">0</div>
                        <div class="stat-label">Successful</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="failed-operations">0</div>
                        <div class="stat-label">Failed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="success-rate">0%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                </div>

                <!-- Controls -->
                <div class="history-controls">
                    <div class="history-filters">
                        <div class="filter-group">
                            <label for="category-filter">Category</label>
                            <select id="category-filter">
                                <option value="">All Categories</option>
                                <option value="import">Import</option>
                                <option value="export">Export</option>
                                <option value="delete">Delete</option>
                                <option value="modify">Modify</option>
                                <option value="settings">Settings</option>
                                <option value="auth">Authentication</option>
                                <option value="system">System</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="status-filter">Status</label>
                            <select id="status-filter">
                                <option value="">All Status</option>
                                <option value="started">Started</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="partial">Partial</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="date-from">From Date</label>
                            <input type="date" id="date-from">
                        </div>
                        
                        <div class="filter-group">
                            <label for="date-to">To Date</label>
                            <input type="date" id="date-to">
                        </div>
                        
                        <div class="filter-group search-filter">
                            <label for="history-search-filter">Search</label>
                            <input type="search" id="history-search-filter" placeholder="Search by keyword...">
                        </div>
                    </div>
                    
                    <div class="history-actions">
                        <button class="btn-modern" id="refresh-btn">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                        <button class="btn-modern" id="export-btn">
                            <i class="fas fa-download"></i> Export
                        </button>
                        <button class="btn-modern" id="clear-filters-btn">
                            <i class="fas fa-filter"></i> Clear Filters
                        </button>
                        <button class="btn-modern btn-danger" id="clear-history-btn">
                            <i class="fas fa-trash"></i> Clear History
                        </button>
                    </div>
                </div>

                <!-- History List -->
                <div class="history-list" id="history-list">
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <p>Loading history...</p>
                    </div>
                </div>

                <!-- Pagination -->
                <div class="history-pagination" id="pagination" style="display: none;">
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
            historyList: document.getElementById('history-list'),
            pagination: document.getElementById('pagination'),
            categoryFilter: document.getElementById('category-filter'),
            statusFilter: document.getElementById('status-filter'),
            dateFromFilter: document.getElementById('date-from'),
            dateToFilter: document.getElementById('date-to'),
            searchFilter: document.getElementById('history-search-filter'),
            totalOperations: document.getElementById('total-operations'),
            successfulOperations: document.getElementById('successful-operations'),
            failedOperations: document.getElementById('failed-operations'),
            successRate: document.getElementById('success-rate'),
            prevPageBtn: document.getElementById('prev-page'),
            nextPageBtn: document.getElementById('next-page'),
            paginationInfo: document.getElementById('pagination-info'),
            refreshBtn: document.getElementById('refresh-btn'),
            exportBtn: document.getElementById('export-btn'),
            clearFiltersBtn: document.getElementById('clear-filters-btn'),
            clearHistoryBtn: document.getElementById('clear-history-btn')
        };
    }

    /**
     * Setup event listeners for real-time updates
     */
    setupEventListeners() {
        if (this.eventBus) {
            // Listen for history updates from HistorySubsystem
            this.eventBus.on('historyEntryAdded', () => {
                this.logger.debug('History entry added event received');
                this.loadHistory();
            });
            
            this.eventBus.on('historyEntryUpdated', () => {
                this.logger.debug('History entry updated event received');
                this.loadHistory();
            });
            
            this.eventBus.on('historyEntryDeleted', () => {
                this.logger.debug('History entry deleted event received');
                this.loadHistory();
            });
            
            this.eventBus.on('historyCleared', () => {
                this.logger.debug('History cleared event received');
                this.currentHistory = [];
                this.filteredHistory = [];
                this.displayHistory();
            });
        }

        // Button event listeners
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        if (this.elements.exportBtn) {
            this.elements.exportBtn.addEventListener('click', () => this.exportHistory());
        }
        
        if (this.elements.clearFiltersBtn) {
            this.elements.clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
        
        if (this.elements.clearHistoryBtn) {
            this.elements.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
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
            this.elements.categoryFilter,
            this.elements.statusFilter,
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
     * Load history from HistorySubsystem
     */
    async loadHistory() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showLoadingState();
            
            this.logger.debug('Loading history from HistorySubsystem');
            
            // Get history from subsystem
            const historyData = await this.historySubsystem.getHistory({
                limit: 1000, // Load more for client-side filtering
                sortBy: 'timestamp',
                sortOrder: 'desc'
            });
            
            this.currentHistory = historyData.history || [];
            
            // Apply current filters
            this.applyFilters();
            
            // Update statistics
            const stats = await this.historySubsystem.getHistoryStats(this.currentHistory);
            this.updateStatistics(stats);
            
            this.logger.debug('History loaded successfully', { count: this.currentHistory.length });
            
        } catch (error) {
            this.logger.error('Failed to load history:', error);
            this.showError('Failed to load history', error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Apply current filters to history
     */
    applyFilters() {
        // Update filter state
        this.currentFilters = {
            category: this.elements.categoryFilter?.value || '',
            status: this.elements.statusFilter?.value || '',
            dateFrom: this.elements.dateFromFilter?.value || '',
            dateTo: this.elements.dateToFilter?.value || '',
            search: this.elements.searchFilter?.value || ''
        };

        // Filter history
        this.filteredHistory = this.currentHistory.filter(entry => this.matchesFilters(entry));
        
        // Reset to first page
        this.currentPage = 1;
        
        // Display filtered results
        this.displayHistory();
        
        this.logger.debug('Filters applied', { 
            filters: this.currentFilters, 
            resultCount: this.filteredHistory.length 
        });
    }

    /**
     * Check if entry matches current filters
     */
    matchesFilters(entry) {
        // Category filter
        if (this.currentFilters.category && entry.category !== this.currentFilters.category) {
            return false;
        }

        // Status filter
        if (this.currentFilters.status && entry.status !== this.currentFilters.status) {
            return false;
        }

        // Date filters
        if (this.currentFilters.dateFrom) {
            const entryDate = new Date(entry.timestamp);
            const fromDate = new Date(this.currentFilters.dateFrom);
            if (entryDate < fromDate) {
                return false;
            }
        }

        if (this.currentFilters.dateTo) {
            const entryDate = new Date(entry.timestamp);
            const toDate = new Date(this.currentFilters.dateTo);
            toDate.setHours(23, 59, 59, 999); // End of day
            if (entryDate > toDate) {
                return false;
            }
        }

        // Search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            const searchableText = [
                entry.description,
                entry.category,
                entry.status,
                JSON.stringify(entry.data)
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Display history entries with pagination
     */
    displayHistory() {
        if (!this.elements.historyList) return;

        if (this.filteredHistory.length === 0) {
            this.showNoHistory();
            return;
        }

        // Calculate pagination
        const totalPages = Math.ceil(this.filteredHistory.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageHistory = this.filteredHistory.slice(startIndex, endIndex);

        // Generate HTML
        let html = '';
        pageHistory.forEach(entry => {
            html += this.createHistoryEntryHTML(entry);
        });

        this.elements.historyList.innerHTML = html;
        this.updatePagination(totalPages);
    }

    /**
     * Create HTML for a history entry
     */
    createHistoryEntryHTML(entry) {
        const timestamp = new Date(entry.timestamp).toLocaleString();
        const duration = entry.duration ? this.formatDuration(entry.duration) : 'N/A';
        
        return `
            <div class="history-entry" data-id="${entry.id}">
                <div class="history-entry-header">
                    <div class="history-entry-info">
                        <div class="history-entry-title">
                            ${this.getCategoryIcon(entry.category)} ${entry.description}
                        </div>
                        <div class="history-entry-meta">
                            <span><i class="fas fa-clock"></i> ${timestamp}</span>
                            <span><i class="fas fa-tag"></i> ${entry.category}</span>
                            <span class="status-badge status-${entry.status}">${entry.status}</span>
                            ${duration !== 'N/A' ? `<span><i class="fas fa-stopwatch"></i> ${duration}</span>` : ''}
                        </div>
                    </div>
                    <div class="history-entry-actions">
                        <button class="btn-small" onclick="this.closest('.history-entry').querySelector('.history-entry-details').style.display = this.closest('.history-entry').querySelector('.history-entry-details').style.display === 'none' ? 'block' : 'none'">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>
                <div class="history-entry-details" style="display: none;">
                    ${this.createEntryDetails(entry)}
                </div>
            </div>
        `;
    }

    /**
     * Create details section for history entry
     */
    createEntryDetails(entry) {
        const sanitizedData = this.sanitizeDataForDisplay(entry.data);
        
        return `
            <div class="entry-details-content">
                <div class="detail-section">
                    <h4>Session Information</h4>
                    <p><strong>Session ID:</strong> ${entry.sessionId}</p>
                    <p><strong>Start Time:</strong> ${new Date(entry.startTime).toLocaleString()}</p>
                </div>
                <div class="detail-section">
                    <h4>Operation Data</h4>
                    <pre class="data-display">${JSON.stringify(sanitizedData, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    /**
     * Sanitize data for display
     */
    sanitizeDataForDisplay(data) {
        if (!data || typeof data !== 'object') return data;
        
        const sanitized = { ...data };
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey', 'clientSecret'];
        
        const sanitizeObject = (obj) => {
            Object.keys(obj).forEach(key => {
                if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                    obj[key] = '[REDACTED]';
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
            });
        };
        
        sanitizeObject(sanitized);
        return sanitized;
    }

    /**
     * Get icon for category
     */
    getCategoryIcon(category) {
        const icons = {
            import: '<i class="fas fa-file-import"></i>',
            export: '<i class="fas fa-file-export"></i>',
            delete: '<i class="fas fa-trash"></i>',
            modify: '<i class="fas fa-edit"></i>',
            settings: '<i class="fas fa-cog"></i>',
            auth: '<i class="fas fa-lock"></i>',
            system: '<i class="fas fa-server"></i>'
        };
        return icons[category] || '<i class="fas fa-file"></i>';
    }

    /**
     * Format duration in milliseconds to readable format
     */
    formatDuration(duration) {
        if (duration < 1000) return `${duration}ms`;
        if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
        if (duration < 3600000) return `${(duration / 60000).toFixed(1)}m`;
        return `${(duration / 3600000).toFixed(1)}h`;
    }

    /**
     * Update statistics display
     */
    updateStatistics(stats) {
        if (this.elements.totalOperations) {
            this.elements.totalOperations.textContent = stats.total || 0;
        }
        if (this.elements.successfulOperations) {
            this.elements.successfulOperations.textContent = stats.successful || 0;
        }
        if (this.elements.failedOperations) {
            this.elements.failedOperations.textContent = stats.failed || 0;
        }
        if (this.elements.successRate) {
            this.elements.successRate.textContent = `${stats.successRate || 0}%`;
        }
    }

    /**
     * Update pagination controls
     */
    updatePagination(totalPages) {
        if (!this.elements.pagination) return;

        if (totalPages <= 1) {
            this.elements.pagination.style.display = 'none';
            return;
        }

        this.elements.pagination.style.display = 'flex';
        
        if (this.elements.paginationInfo) {
            this.elements.paginationInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        }
        
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.disabled = this.currentPage <= 1;
        }
        
        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.disabled = this.currentPage >= totalPages;
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        if (!this.elements.historyList) return;
        
        this.elements.historyList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading history...</p>
            </div>
        `;
    }

    /**
     * Show no history state
     */
    showNoHistory() {
        if (!this.elements.historyList) return;
        
        this.elements.historyList.innerHTML = `
            <div class="no-history">
                <i class="fas fa-history"></i>
                <h3>No History Found</h3>
                <p>No operations match your current filters.</p>
            </div>
        `;
        
        if (this.elements.pagination) {
            this.elements.pagination.style.display = 'none';
        }
    }

    /**
     * Show error state
     */
    showError(title, message) {
        if (!this.elements.historyList) return;
        
        this.elements.historyList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>${title}</h3>
                <p>${message}</p>
                <button class="btn-modern" onclick="this.closest('.history-container').dispatchEvent(new CustomEvent('retry'))">
                    <i class="fas fa-retry"></i> Retry
                </button>
            </div>
        `;
    }

    /**
     * Navigate to next page
     */
    nextPage() {
        const totalPages = Math.ceil(this.filteredHistory.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.displayHistory();
        }
    }

    /**
     * Navigate to previous page
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayHistory();
        }
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        if (this.elements.categoryFilter) this.elements.categoryFilter.value = '';
        if (this.elements.statusFilter) this.elements.statusFilter.value = '';
        if (this.elements.dateFromFilter) this.elements.dateFromFilter.value = '';
        if (this.elements.dateToFilter) this.elements.dateToFilter.value = '';
        if (this.elements.searchFilter) this.elements.searchFilter.value = '';
        
        this.applyFilters();
        this.logger.debug('Filters cleared');
    }

    /**
     * Export history using HistorySubsystem
     */
    async exportHistory() {
        try {
            this.logger.info('Exporting history');
            
            await this.historySubsystem.exportHistory({
                format: 'csv',
                filtered: true,
                filters: this.currentFilters
            });
            
            this.logger.info('History exported successfully');
            
        } catch (error) {
            this.logger.error('Failed to export history:', error);
            alert('Failed to export history: ' + error.message);
        }
    }

    /**
     * Clear all history using HistorySubsystem
     */
    async clearHistory() {
        if (!confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
            return;
        }

        try {
            this.logger.info('Clearing all history');
            
            await this.historySubsystem.clearHistory();
            
            this.logger.info('History cleared successfully');
            
            // Reload history to reflect changes
            await this.loadHistory();
            
        } catch (error) {
            this.logger.error('Failed to clear history:', error);
            alert('Failed to clear history: ' + error.message);
        }
    }

    /**
     * Refresh history data
     */
    async refresh() {
        this.logger.debug('Refreshing history');
        await this.loadHistory();
    }

    /**
     * Destroy the UI and cleanup
     */
    destroy() {
        // Clear timeouts
        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
        }
        
        // Remove event listeners
        if (this.eventBus) {
            this.eventBus.off('historyEntryAdded');
            this.eventBus.off('historyEntryUpdated');
            this.eventBus.off('historyEntryDeleted');
            this.eventBus.off('historyCleared');
        }
        
        this.logger.debug('HistoryUIComponent destroyed');
    }
}

export default HistoryUIComponent;
