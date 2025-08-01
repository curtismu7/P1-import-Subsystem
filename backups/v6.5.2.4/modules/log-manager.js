// LogManager: Handles log page functionality including streaming, filtering, and real-time updates
// Provides comprehensive log management with filtering, real-time updates, and user-friendly display

class LogManager {
    constructor() {
        this.logsContainer = null;
        this.refreshButton = null;
        this.clearButton = null;
        this.currentLogs = [];
        this.isAutoRefresh = true;
        this.refreshInterval = null;
        this.filterLevel = 'all';
        this.filterText = '';
        
        this.initialize();
    }
    
    initialize() {
        this.setupElements();
        this.setupEventListeners();
        this.startAutoRefresh();
        this.loadLogs();
    }
    
    setupElements() {
        this.logsContainer = document.getElementById('logs-container');
        this.refreshButton = document.getElementById('refresh-logs');
        this.clearButton = document.getElementById('clear-logs');
        
        if (!this.logsContainer) {
            console.warn('Logs container not found');
            return;
        }
        
        if (!this.refreshButton) {
            console.warn('Refresh logs button not found');
        }
        
        if (!this.clearButton) {
            console.warn('Clear logs button not found');
        }
    }
    
    setupEventListeners() {
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => this.loadLogs());
        }
        
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => this.clearLogs());
        }
        
        // Add filter functionality
        this.addFilterControls();
        
        // Add search icon logic for the original search input
        const searchIcon = document.getElementById('logs-search-icon');
        const searchInput = document.getElementById('logs-search-input');
        if (searchIcon && searchInput) {
            searchIcon.addEventListener('click', () => {
                if (searchInput.style.display === 'none') {
                    searchInput.style.display = 'inline-block';
                    searchInput.focus();
                } else {
                    searchInput.value = '';
                    searchInput.style.display = 'none';
                    this.filterText = '';
                    this.applyFilters();
                }
            });
            searchInput.addEventListener('input', (e) => {
                this.filterText = e.target.value.toLowerCase();
                this.applyFilters();
            });
            // Hide input on Escape
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    searchInput.style.display = 'none';
                    this.filterText = '';
                    this.applyFilters();
                }
            });
        }
    }
    
    addFilterControls() {
        const logsHeader = document.querySelector('.logs-header');
        if (!logsHeader) return;
        
        // Create filter controls
        const filterContainer = document.createElement('div');
        filterContainer.className = 'logs-filters';
        filterContainer.innerHTML = `
            <div class="filter-group">
                <label for="log-level-filter">Level:</label>
                <select id="log-level-filter" class="form-control">
                    <option value="all">All Levels</option>
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                    <option value="success">Success</option>
                </select>
            </div>
            <div class="filter-group">
                <label>
                    <input type="checkbox" id="auto-refresh-toggle" checked>
                    Auto Refresh
                </label>
            </div>
        `;
        
        logsHeader.appendChild(filterContainer);
        
        // Add event listeners for filters
        const levelFilter = document.getElementById('log-level-filter');
        const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
        
        if (levelFilter) {
            levelFilter.addEventListener('change', (e) => {
                this.filterLevel = e.target.value;
                this.applyFilters();
            });
        }
        
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                this.isAutoRefresh = e.target.checked;
                if (this.isAutoRefresh) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }
    }
    
    async loadLogs() {
        try {
            // Load both logs and history
            const [logsResponse, historyResponse] = await Promise.allSettled([
                fetch('/api/logs/ui?limit=100'),
                fetch('/api/history?limit=50')
            ]);
            
            let logs = [];
            let history = [];
            
            // Process logs response
            if (logsResponse.status === 'fulfilled' && logsResponse.value.ok) {
                const logsData = await logsResponse.value.json();
                if (logsData.success && logsData.logs) {
                    logs = logsData.logs;
                }
            }
            
            // Process history response
            if (historyResponse.status === 'fulfilled' && historyResponse.value.ok) {
                const historyData = await historyResponse.value.json();
                if (historyData.success && historyData.history) {
                    history = historyData.history;
                }
            }
            
            // Combine logs and history
            this.currentLogs = [...logs, ...history.map(item => ({
                timestamp: item.timestamp,
                level: 'info',
                message: item.message,
                data: {
                    type: item.type,
                    fileName: item.fileName,
                    population: item.population,
                    success: item.success,
                    errors: item.errors,
                    skipped: item.skipped,
                    total: item.total
                },
                source: 'history'
            }))];
            
            this.displayLogs();
            this.scrollToBottom();
            
        } catch (error) {
            console.error('Failed to load logs and history:', error);
            this.displayError('Failed to load logs and history: ' + error.message);
        }
    }
    
    displayLogs() {
        if (!this.logsContainer) return;
        
        this.logsContainer.innerHTML = '';
        
        if (this.currentLogs.length === 0) {
            this.displayNoLogs();
            return;
        }
        
        const filteredLogs = this.getFilteredLogs();
        
        filteredLogs.forEach(log => {
            const logElement = this.createLogElement(log);
            this.logsContainer.appendChild(logElement);
        });
        
        // Update log count
        this.updateLogCount(filteredLogs.length, this.currentLogs.length);
    }
    
    getFilteredLogs() {
        return this.currentLogs.filter(log => {
            // Level filter
            if (this.filterLevel !== 'all' && log.level !== this.filterLevel) {
                return false;
            }
            
            // Text filter
            if (this.filterText) {
                const searchText = `${log.message} ${log.data ? JSON.stringify(log.data) : ''}`.toLowerCase();
                if (!searchText.includes(this.filterText)) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    applyFilters() {
        this.displayLogs();
    }
    
    createLogElement(log) {
        const logElement = document.createElement('div');
        logElement.className = `log-entry ${log.level}`;
        logElement.setAttribute('data-log-id', log.id);
        logElement.setAttribute('tabindex', '0');
        logElement.setAttribute('role', 'button');
        logElement.setAttribute('aria-expanded', 'false');
        logElement.setAttribute('aria-label', `Log entry: ${log.message}`);
        
        const timestamp = new Date(log.timestamp).toLocaleString();
        const levelClass = `log-level ${log.level}`;
        const isHistoryItem = log.source === 'history';
        
        // Create appropriate header based on item type
        let headerContent = '';
        if (isHistoryItem) {
            const operationType = log.data?.type || 'UNKNOWN';
            const successCount = log.data?.success || 0;
            const errorCount = log.data?.errors || 0;
            const skippedCount = log.data?.skipped || 0;
            
            headerContent = `
                <div class="log-info">
                    <span class="${levelClass}">${operationType.toUpperCase()}</span>
                    <span class="log-timestamp">${timestamp}</span>
                    <span class="operation-stats">
                        <span class="stat-success">✓ ${successCount}</span>
                        ${errorCount > 0 ? `<span class="stat-error">✗ ${errorCount}</span>` : ''}
                        ${skippedCount > 0 ? `<span class="stat-skipped">- ${skippedCount}</span>` : ''}
                    </span>
                </div>
            `;
        } else {
            headerContent = `
                <div class="log-info">
                    <span class="${levelClass}">${log.level.toUpperCase()}</span>
                    <span class="log-timestamp">${timestamp}</span>
                </div>
            `;
        }
        
        logElement.innerHTML = `
            <div class="log-header">
                ${headerContent}
                <span class="log-expand-icon" aria-hidden="true">▶</span>
            </div>
            <div class="log-message">${this.escapeHtml(log.message)}</div>
            ${log.data ? `
                <div class="log-details" role="region" aria-label="Log details">
                    <div class="log-details-content">
                        ${isHistoryItem ? `
                            <div class="log-detail-section">
                                <h5>Operation Details:</h5>
                                <div class="history-details">
                                    <div><strong>Type:</strong> ${log.data.type}</div>
                                    ${log.data.fileName ? `<div><strong>File:</strong> ${log.data.fileName}</div>` : ''}
                                    ${log.data.population ? `<div><strong>Population:</strong> ${log.data.population}</div>` : ''}
                                    <div><strong>Results:</strong> ${log.data.success} successful, ${log.data.errors} errors, ${log.data.skipped} skipped</div>
                                    <div><strong>Total:</strong> ${log.data.total} items</div>
                                </div>
                            </div>
                        ` : `
                            <div class="log-detail-section">
                                <h5>Data:</h5>
                                <pre class="log-detail-json">${JSON.stringify(log.data, null, 2)}</pre>
                            </div>
                        `}
                        ${log.ip ? `
                            <div class="log-detail-section">
                                <h5>IP:</h5>
                                <span>${log.ip}</span>
                            </div>
                        ` : ''}
                        ${log.userAgent ? `
                            <div class="log-detail-section">
                                <h5>User Agent:</h5>
                                <span>${log.userAgent}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        `;
        
        // Enhanced click handler for expand/collapse
        const handleToggle = (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            const isExpanded = logElement.classList.contains('expanded');
            const expandIcon = logElement.querySelector('.log-expand-icon');
            const details = logElement.querySelector('.log-details');
            
            if (isExpanded) {
                // Collapse
                logElement.classList.remove('expanded');
                logElement.setAttribute('aria-expanded', 'false');
                if (expandIcon) {
                    expandIcon.textContent = '▶';
                    expandIcon.setAttribute('aria-label', 'Expand log details');
                }
                if (details) {
                    details.style.display = 'none';
                }
            } else {
                // Expand
                logElement.classList.add('expanded');
                logElement.setAttribute('aria-expanded', 'true');
                if (expandIcon) {
                    expandIcon.textContent = '▼';
                    expandIcon.setAttribute('aria-label', 'Collapse log details');
                }
                if (details) {
                    details.style.display = 'block';
                    // Smooth scroll into view if needed
                    setTimeout(() => {
                        if (details.getBoundingClientRect().bottom > window.innerHeight) {
                            details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }, 100);
                }
            }
        };
        
        // Click handler
        logElement.addEventListener('click', handleToggle);
        
        // Keyboard accessibility
        logElement.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleToggle(event);
            }
        });
        
        // Focus management
        logElement.addEventListener('focus', () => {
            logElement.classList.add('focused');
        });
        
        logElement.addEventListener('blur', () => {
            logElement.classList.remove('focused');
        });
        
        return logElement;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    displayNoLogs() {
        if (!this.logsContainer) return;
        this.logsContainer.innerHTML = `
            <div class="no-logs-message">
                <i class="fas fa-info-circle"></i>
                <p>No logs found.</p>
                <small>Logs will appear here when operations are performed</small>
            </div>
        `;
    }
    
    displayError(message) {
        if (!this.logsContainer) return;
        
        this.logsContainer.innerHTML = `
            <div class="log-error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${this.escapeHtml(message)}</p>
                <button class="btn btn-secondary" onclick="window.logManager.loadLogs()">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
    
    updateLogCount(filtered, total) {
        const logsHeader = document.querySelector('.logs-header h1');
        if (logsHeader) {
            if (filtered === total) {
                logsHeader.textContent = `Logs (${total})`;
            } else {
                logsHeader.textContent = `Logs (${filtered}/${total})`;
            }
        }
    }
    
    scrollToBottom() {
        if (this.logsContainer) {
            this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
        }
    }
    
    async clearLogs() {
        if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch('/api/logs/ui', {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.currentLogs = [];
                this.displayLogs();
                console.log('Logs cleared successfully');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Failed to clear logs:', error);
            alert('Failed to clear logs: ' + error.message);
        }
    }
    
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            if (this.isAutoRefresh) {
                this.loadLogs();
            }
        }, 5000); // Refresh every 5 seconds
    }
    
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    
    destroy() {
        this.stopAutoRefresh();
    }
}

// Initialize log manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.logManager = new LogManager();
});

// At the end of the file, expose LogManager as a global for browser use
if (typeof window !== 'undefined') {
  window.LogManager = LogManager;
} 