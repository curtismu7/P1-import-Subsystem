/**
 * History UI Module
 * Modern ES module for History page UI management using HistorySubsystem
 * Provides event-driven UI components and interactions for operation history
 */

export class HistoryUI {
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
        
        this.logger.debug('HistoryUI initialized');
    }

    /**
     * Initialize the History UI
     */
    async init() {
        try {
            this.logger.info('Initializing HistoryUI');
            
            // Cache DOM elements
            this.cacheElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup filter listeners
            this.setupFilterListeners();
            
            // Load initial history
            await this.loadHistory();
            
            this.logger.info('HistoryUI initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize HistoryUI:', error);
            throw error;
        }
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
            searchFilter: document.getElementById('search-filter'),
            totalOperations: document.getElementById('total-operations'),
            successfulOperations: document.getElementById('successful-operations'),
            failedOperations: document.getElementById('failed-operations'),
            successRate: document.getElementById('success-rate'),
            prevPageBtn: document.getElementById('prev-page'),
            nextPageBtn: document.getElementById('next-page'),
            paginationInfo: document.getElementById('pagination-info')
        };
    }

    /**
     * Setup event listeners for real-time updates
     */
    setupEventListeners() {
        if (this.eventBus) {
            // Listen for history updates from HistorySubsystem
            this.eventBus.on('history:updated', () => {
                this.logger.debug('History updated event received');
                this.loadHistory();
            });
            
            this.eventBus.on('history:entry:added', (data) => {
                this.logger.debug('History entry added:', data);
                this.loadHistory();
            });
            
            this.eventBus.on('history:entry:updated', (data) => {
                this.logger.debug('History entry updated:', data);
                this.loadHistory();
            });
            
            this.eventBus.on('history:entry:deleted', (data) => {
                this.logger.debug('History entry deleted:', data);
                this.loadHistory();
            });
            
            this.eventBus.on('history:cleared', () => {
                this.logger.debug('History cleared event received');
                this.currentHistory = [];
                this.filteredHistory = [];
                this.displayHistory();
            });
        }
    }

    /**
     * Setup filter change listeners
     */
    setupFilterListeners() {
        const filterElements = [
            'categoryFilter',
            'statusFilter', 
            'dateFromFilter',
            'dateToFilter',
            'searchFilter'
        ];

        filterElements.forEach(elementKey => {
            const element = this.elements[elementKey];
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
                if (element.type === 'text') {
                    element.addEventListener('input', () => this.debounceFilter());
                }
            }
        });
    }

    /**
     * Debounce filter for search input
     */
    debounceFilter() {
        clearTimeout(this.filterTimeout);
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
            
            // Get history from subsystem with statistics
            const historyData = await this.historySubsystem.getHistory({
                limit: 1000, // Load all for client-side filtering
                includeStats: true
            });
            
            this.currentHistory = historyData.history || [];
            
            // Update statistics if available
            if (historyData.stats) {
                this.updateStatistics(historyData.stats);
            }
            
            // Apply current filters
            this.applyFilters();
            
            this.logger.debug(`Loaded ${this.currentHistory.length} history entries`);
            
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
        // Get current filter values
        this.currentFilters = {
            category: this.elements.categoryFilter?.value || '',
            status: this.elements.statusFilter?.value || '',
            dateFrom: this.elements.dateFromFilter?.value || '',
            dateTo: this.elements.dateToFilter?.value || '',
            search: this.elements.searchFilter?.value || ''
        };

        // Filter history
        this.filteredHistory = this.currentHistory.filter(entry => {
            return this.matchesFilters(entry);
        });

        // Reset to first page
        this.currentPage = 1;
        
        // Display filtered results
        this.displayHistory();
        
        this.logger.debug(`Applied filters, ${this.filteredHistory.length} entries match`);
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
        
        // Date range filter
        if (this.currentFilters.dateFrom || this.currentFilters.dateTo) {
            const entryDate = new Date(entry.timestamp);
            
            if (this.currentFilters.dateFrom) {
                const fromDate = new Date(this.currentFilters.dateFrom);
                if (entryDate < fromDate) return false;
            }
            
            if (this.currentFilters.dateTo) {
                const toDate = new Date(this.currentFilters.dateTo);
                toDate.setHours(23, 59, 59, 999); // End of day
                if (entryDate > toDate) return false;
            }
        }
        
        // Search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            const searchableText = [
                entry.description,
                entry.category,
                entry.status,
                JSON.stringify(entry.data || {})
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

        // Update pagination
        this.updatePagination(totalPages);
        
        if (this.elements.pagination) {
            this.elements.pagination.style.display = totalPages > 1 ? 'flex' : 'none';
        }
    }

    /**
     * Create HTML for a history entry
     */
    createHistoryEntryHTML(entry) {
        const timestamp = new Date(entry.timestamp).toLocaleString();
        const statusClass = `status-${entry.status}`;
        const categoryIcon = this.getCategoryIcon(entry.category);
        
        return `
            <div class="history-entry" data-entry-id="${entry.id}">
                <div class="history-entry-header">
                    <div class="history-entry-info">
                        <div class="history-entry-title">
                            ${categoryIcon} ${entry.description}
                        </div>
                        <div class="history-entry-meta">
                            <span><i class="fas fa-clock"></i> ${timestamp}</span>
                            <span><i class="fas fa-tag"></i> ${entry.category}</span>
                            ${entry.data?.sessionId ? `<span><i class="fas fa-fingerprint"></i> ${entry.data.sessionId}</span>` : ''}
                        </div>
                    </div>
                    <div class="history-entry-status ${statusClass}">
                        ${entry.status}
                    </div>
                </div>
                ${this.createEntryDetails(entry)}
            </div>
        `;
    }

    /**
     * Create details section for history entry
     */
    createEntryDetails(entry) {
        if (!entry.data || Object.keys(entry.data).length === 0) {
            return '';
        }
        
        // Sanitize sensitive data for display
        const sanitizedData = this.sanitizeDataForDisplay(entry.data);
        
        return `
            <div class="history-entry-details">
                <strong>Details:</strong>
                <pre>${JSON.stringify(sanitizedData, null, 2)}</pre>
            </div>
        `;
    }

    /**
     * Sanitize data for display (remove sensitive fields)
     */
    sanitizeDataForDisplay(data) {
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
        const sanitized = { ...data };
        
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                } else if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                    obj[key] = '[REDACTED]';
                }
            }
        };
        
        sanitizeObject(sanitized);
        return sanitized;
    }

    /**
     * Get icon for category
     */
    getCategoryIcon(category) {
        const icons = {
            import: '📥',
            export: '📤',
            delete: '🗑️',
            modify: '✏️',
            settings: '⚙️',
            auth: '🔐',
            system: '🖥️'
        };
        return icons[category] || '📄';
    }

    /**
     * Update statistics display
     */
    updateStatistics(stats) {
        if (this.elements.totalOperations) {
            this.elements.totalOperations.textContent = stats.total || 0;
        }
        
        if (this.elements.successfulOperations) {
            this.elements.successfulOperations.textContent = stats.completed || 0;
        }
        
        if (this.elements.failedOperations) {
            this.elements.failedOperations.textContent = stats.failed || 0;
        }
        
        if (this.elements.successRate) {
            const successRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
            this.elements.successRate.textContent = `${successRate}%`;
        }
    }

    /**
     * Update pagination controls
     */
    updatePagination(totalPages) {
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.disabled = this.currentPage <= 1;
        }
        
        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.disabled = this.currentPage >= totalPages;
        }
        
        if (this.elements.paginationInfo) {
            this.elements.paginationInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        if (!this.elements.historyList) return;
        
        this.elements.historyList.innerHTML = `
            <div class="no-history">
                <div class="loading-spinner"></div>
                <h3>Loading History...</h3>
                <p>Fetching operation history from HistorySubsystem...</p>
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
            <div class="no-history">
                <i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i>
                <h3>${title}</h3>
                <p>${message}</p>
                <button class="btn-modern" onclick="window.historyUI?.loadHistory()">
                    <i class="fas fa-retry"></i> Retry
                </button>
            </div>
        `;
    }

    /**
     * Navigate to next page
     */
    nextPage() {
        if (this.currentPage < Math.ceil(this.filteredHistory.length / this.itemsPerPage)) {
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
            throw error;
        }
    }

    /**
     * Clear all history using HistorySubsystem
     */
    async clearHistory() {
        try {
            this.logger.info('Clearing all history');
            
            await this.historySubsystem.clearHistory();
            
            this.logger.info('History cleared successfully');
            
            // Reload history to reflect changes
            await this.loadHistory();
            
        } catch (error) {
            this.logger.error('Failed to clear history:', error);
            throw error;
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
            this.eventBus.off('history:updated');
            this.eventBus.off('history:entry:added');
            this.eventBus.off('history:entry:updated');
            this.eventBus.off('history:entry:deleted');
            this.eventBus.off('history:cleared');
        }
        
        this.logger.debug('HistoryUI destroyed');
    }
}

export default HistoryUI;
