/**
 * History Subsystem
 * Centralized history management system that replaces legacy HistoryManager
 * Provides operation history tracking, filtering, and event integration
 */

export class HistorySubsystem {
    constructor(eventBus, settingsSubsystem, loggingSubsystem) {
        this.eventBus = eventBus;
        this.settingsSubsystem = settingsSubsystem;
        this.loggingSubsystem = loggingSubsystem;
        
        // History storage
        this.history = [];
        this.maxHistorySize = 500;
        
        // History categories
        this.categories = {
            IMPORT: 'import',
            EXPORT: 'export',
            DELETE: 'delete',
            MODIFY: 'modify',
            SETTINGS: 'settings',
            AUTH: 'auth',
            SYSTEM: 'system'
        };
        
        // History status types
        this.statusTypes = {
            STARTED: 'started',
            IN_PROGRESS: 'in_progress',
            COMPLETED: 'completed',
            FAILED: 'failed',
            CANCELLED: 'cancelled',
            PARTIAL: 'partial'
        };
        
        // Current filter settings
        this.currentFilter = {
            category: null,
            status: null,
            dateRange: null,
            search: null
        };
        
        // Initialize subsystem
        this.init();
        
        if (this.loggingSubsystem) {
            this.loggingSubsystem.info('HistorySubsystem initialized successfully', {}, 'system');
        }
    }
    
    /**
     * Initialize the history subsystem
     */
    async init() {
        try {
            // Load history settings
            await this.loadSettings();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load existing history from storage
            await this.loadHistoryFromStorage();
            
            if (this.loggingSubsystem) {
                this.loggingSubsystem.info('HistorySubsystem initialization complete', {
                    historyCount: this.history.length
                }, 'system');
            }
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error('Failed to initialize HistorySubsystem', error, 'system');
            }
            throw error;
        }
    }
    
    /**
     * Load history settings from SettingsSubsystem
     */
    async loadSettings() {
        try {
            if (this.settingsSubsystem) {
                // Access the current settings from the SettingsSubsystem
                // The SettingsSubsystem stores settings in currentSettings property
                const settings = this.settingsSubsystem.currentSettings;
                
                // Set max history size from settings
                if (settings && settings.maxHistorySize) {
                    this.maxHistorySize = settings.maxHistorySize;
                }
            }
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.warn('Could not load history settings, using defaults', error, 'system');
            }
        }
    }
    
    /**
     * Set up event listeners for cross-subsystem communication
     */
    setupEventListeners() {
        if (this.eventBus) {
            // Listen for operation events to automatically track history
            this.eventBus.on('importStarted', (data) => {
                this.addHistoryEntry('import', 'Import operation started', 'started', data);
            });
            
            this.eventBus.on('importCompleted', (data) => {
                this.updateHistoryEntry(data.sessionId, 'completed', 'Import operation completed', data);
            });
            
            this.eventBus.on('importFailed', (data) => {
                this.updateHistoryEntry(data.sessionId, 'failed', 'Import operation failed', data);
            });
            
            this.eventBus.on('exportStarted', (data) => {
                this.addHistoryEntry('export', 'Export operation started', 'started', data);
            });
            
            this.eventBus.on('exportCompleted', (data) => {
                this.updateHistoryEntry(data.sessionId, 'completed', 'Export operation completed', data);
            });
            
            this.eventBus.on('exportFailed', (data) => {
                this.updateHistoryEntry(data.sessionId, 'failed', 'Export operation failed', data);
            });
            
            this.eventBus.on('deleteOperationStarted', (data) => {
                this.addHistoryEntry('delete', 'Delete operation started', 'started', data);
            });
            
            this.eventBus.on('deleteOperationCompleted', (data) => {
                this.updateHistoryEntry(data.sessionId, 'completed', 'Delete operation completed', data);
            });
            
            this.eventBus.on('deleteOperationFailed', (data) => {
                this.updateHistoryEntry(data.sessionId, 'failed', 'Delete operation failed', data);
            });
            
            this.eventBus.on('modifyOperationStarted', (data) => {
                this.addHistoryEntry('modify', 'Modify operation started', 'started', data);
            });
            
            this.eventBus.on('modifyOperationCompleted', (data) => {
                this.updateHistoryEntry(data.sessionId, 'completed', 'Modify operation completed', data);
            });
            
            this.eventBus.on('modifyOperationFailed', (data) => {
                this.updateHistoryEntry(data.sessionId, 'failed', 'Modify operation failed', data);
            });
            
            // Listen for history management events
            this.eventBus.on('clearHistory', () => {
                this.clearHistory();
            });
            
            this.eventBus.on('exportHistory', (data) => {
                this.exportHistory(data.options);
            });
            
            this.eventBus.on('filterHistory', (data) => {
                this.setFilter(data.filter);
            });
        }
    }
    
    /**
     * Add a new history entry
     */
    addHistoryEntry(category, description, status, data = {}) {
        const entry = {
            id: this.generateHistoryId(),
            timestamp: new Date().toISOString(),
            category,
            description,
            status,
            data: this.sanitizeHistoryData(data),
            sessionId: data.sessionId || this.generateSessionId(),
            duration: null,
            startTime: new Date().toISOString()
        };
        
        // Add to beginning of history array
        this.history.unshift(entry);
        
        // Maintain history size limit
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(0, this.maxHistorySize);
        }
        
        // Save to storage
        this.saveHistoryToStorage();
        
        // Log the history entry
        if (this.loggingSubsystem) {
            this.loggingSubsystem.info('History entry added', {
                category,
                description,
                status,
                sessionId: entry.sessionId
            }, 'system');
        }
        
        // Emit event for UI updates
        if (this.eventBus) {
            this.eventBus.emit('historyEntryAdded', entry);
        }
        
        return entry.id;
    }
    
    /**
     * Update an existing history entry
     */
    updateHistoryEntry(sessionId, status, description = null, data = {}) {
        const entry = this.history.find(h => h.sessionId === sessionId);
        
        if (entry) {
            entry.status = status;
            entry.timestamp = new Date().toISOString();
            
            if (description) {
                entry.description = description;
            }
            
            // Calculate duration if operation is complete
            if (['completed', 'failed', 'cancelled'].includes(status) && entry.startTime) {
                entry.duration = new Date() - new Date(entry.startTime);
            }
            
            // Merge additional data
            if (data && Object.keys(data).length > 0) {
                entry.data = { ...entry.data, ...this.sanitizeHistoryData(data) };
            }
            
            // Save to storage
            this.saveHistoryToStorage();
            
            // Log the update
            if (this.loggingSubsystem) {
                this.loggingSubsystem.info('History entry updated', {
                    sessionId,
                    status,
                    description,
                    duration: entry.duration
                }, 'system');
            }
            
            // Emit event for UI updates
            if (this.eventBus) {
                this.eventBus.emit('historyEntryUpdated', entry);
            }
            
            return true;
        }
        
        if (this.loggingSubsystem) {
            this.loggingSubsystem.warn('History entry not found for update', { sessionId }, 'system');
        }
        
        return false;
    }
    
    /**
     * Get filtered history entries
     */
    async getHistory(options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                category = null,
                status = null,
                search = null,
                startDate = null,
                endDate = null,
                sortBy = 'timestamp',
                sortOrder = 'desc'
            } = options;
            
            let filteredHistory = [...this.history];
            
            // Apply filters
            if (category) {
                filteredHistory = filteredHistory.filter(entry => entry.category === category);
            }
            
            if (status) {
                filteredHistory = filteredHistory.filter(entry => entry.status === status);
            }
            
            if (search) {
                const searchLower = search.toLowerCase();
                filteredHistory = filteredHistory.filter(entry =>
                    entry.description.toLowerCase().includes(searchLower) ||
                    JSON.stringify(entry.data).toLowerCase().includes(searchLower)
                );
            }
            
            if (startDate) {
                filteredHistory = filteredHistory.filter(entry =>
                    new Date(entry.timestamp) >= new Date(startDate)
                );
            }
            
            if (endDate) {
                filteredHistory = filteredHistory.filter(entry =>
                    new Date(entry.timestamp) <= new Date(endDate)
                );
            }
            
            // Apply sorting
            filteredHistory.sort((a, b) => {
                const aValue = a[sortBy];
                const bValue = b[sortBy];
                
                if (sortOrder === 'asc') {
                    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                } else {
                    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                }
            });
            
            // Apply pagination
            const paginatedHistory = filteredHistory.slice(offset, offset + limit);
            
            const result = {
                history: paginatedHistory,
                total: filteredHistory.length,
                hasMore: offset + limit < filteredHistory.length,
                stats: this.getHistoryStats(filteredHistory)
            };
            
            if (this.loggingSubsystem) {
                this.loggingSubsystem.debug('History retrieved', {
                    requested: limit,
                    returned: paginatedHistory.length,
                    total: result.total,
                    filters: { category, status, search }
                }, 'system');
            }
            
            return result;
            
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error('Failed to get history', error, 'system');
            }
            throw error;
        }
    }
    
    /**
     * Get history statistics
     */
    getHistoryStats(historyData = null) {
        const data = historyData || this.history;
        
        const stats = {
            total: data.length,
            categories: {},
            statuses: {},
            recentActivity: data.slice(0, 5),
            averageDuration: 0,
            totalDuration: 0
        };
        
        let durationCount = 0;
        let totalDuration = 0;
        
        data.forEach(entry => {
            // Count by category
            stats.categories[entry.category] = (stats.categories[entry.category] || 0) + 1;
            
            // Count by status
            stats.statuses[entry.status] = (stats.statuses[entry.status] || 0) + 1;
            
            // Calculate duration stats
            if (entry.duration) {
                totalDuration += entry.duration;
                durationCount++;
            }
        });
        
        if (durationCount > 0) {
            stats.averageDuration = totalDuration / durationCount;
            stats.totalDuration = totalDuration;
        }
        
        return stats;
    }
    
    /**
     * Set history filter
     */
    setFilter(filter) {
        this.currentFilter = { ...this.currentFilter, ...filter };
        
        if (this.loggingSubsystem) {
            this.loggingSubsystem.debug('History filter updated', this.currentFilter, 'system');
        }
        
        // Emit event for UI updates
        if (this.eventBus) {
            this.eventBus.emit('historyFilterChanged', this.currentFilter);
        }
    }
    
    /**
     * Clear all history
     */
    clearHistory() {
        const previousCount = this.history.length;
        this.history = [];
        
        // Clear from storage
        this.saveHistoryToStorage();
        
        if (this.loggingSubsystem) {
            this.loggingSubsystem.info('History cleared', { previousCount }, 'system');
        }
        
        // Emit event for UI updates
        if (this.eventBus) {
            this.eventBus.emit('historyCleared', { previousCount });
        }
    }
    
    /**
     * Export history to file
     */
    async exportHistory(options = {}) {
        try {
            const {
                format = 'json',
                filename = `history_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
                includeData = true
            } = options;
            
            const historyData = await this.getHistory({ limit: this.maxHistorySize });
            
            let content;
            let mimeType;
            let extension;
            
            // Prepare export data
            const exportData = historyData.history.map(entry => ({
                id: entry.id,
                timestamp: entry.timestamp,
                category: entry.category,
                description: entry.description,
                status: entry.status,
                duration: entry.duration,
                ...(includeData && { data: entry.data })
            }));
            
            switch (format.toLowerCase()) {
                case 'csv':
                    content = this.convertHistoryToCSV(exportData);
                    mimeType = 'text/csv';
                    extension = 'csv';
                    break;
                case 'txt':
                    content = this.convertHistoryToText(exportData);
                    mimeType = 'text/plain';
                    extension = 'txt';
                    break;
                case 'json':
                default:
                    content = JSON.stringify({
                        exportDate: new Date().toISOString(),
                        stats: historyData.stats,
                        history: exportData
                    }, null, 2);
                    mimeType = 'application/json';
                    extension = 'json';
                    break;
            }
            
            // Create and download file
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.${extension}`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            if (this.loggingSubsystem) {
                this.loggingSubsystem.info('History exported successfully', {
                    format,
                    filename: `${filename}.${extension}`,
                    entryCount: exportData.length
                }, 'system');
            }
            
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.error('Failed to export history', error, 'system');
            }
            throw error;
        }
    }
    
    /**
     * Convert history to CSV format
     */
    convertHistoryToCSV(history) {
        const headers = ['ID', 'Timestamp', 'Category', 'Description', 'Status', 'Duration'];
        const csvRows = [headers.join(',')];
        
        history.forEach(entry => {
            const row = [
                entry.id,
                entry.timestamp,
                entry.category,
                `"${entry.description.replace(/"/g, '""')}"`,
                entry.status,
                entry.duration || ''
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    /**
     * Convert history to text format
     */
    convertHistoryToText(history) {
        return history.map(entry => {
            const duration = entry.duration ? ` (${Math.round(entry.duration / 1000)}s)` : '';
            return `[${entry.timestamp}] ${entry.category.toUpperCase()} [${entry.status.toUpperCase()}] ${entry.description}${duration}`;
        }).join('\n');
    }
    
    /**
     * Load history from local storage
     */
    async loadHistoryFromStorage() {
        try {
            const stored = localStorage.getItem('pingone-import-history');
            if (stored) {
                const parsedHistory = JSON.parse(stored);
                if (Array.isArray(parsedHistory)) {
                    this.history = parsedHistory;
                    
                    if (this.loggingSubsystem) {
                        this.loggingSubsystem.info('History loaded from storage', {
                            entryCount: this.history.length
                        }, 'system');
                    }
                }
            }
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.warn('Failed to load history from storage', error, 'system');
            }
        }
    }
    
    /**
     * Save history to local storage
     */
    saveHistoryToStorage() {
        try {
            localStorage.setItem('pingone-import-history', JSON.stringify(this.history));
        } catch (error) {
            if (this.loggingSubsystem) {
                this.loggingSubsystem.warn('Failed to save history to storage', error, 'system');
            }
        }
    }
    
    /**
     * Sanitize history data to prevent circular references and sensitive data
     */
    sanitizeHistoryData(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        
        try {
            return JSON.parse(JSON.stringify(data, (key, value) => {
                // Remove sensitive fields
                const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey', 'clientSecret'];
                if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                    return '[REDACTED]';
                }
                
                // Handle circular references and complex objects
                if (typeof value === 'object' && value !== null) {
                    if (value.constructor && value.constructor.name === 'HTMLElement') {
                        return '[HTMLElement]';
                    }
                    if (value instanceof Error) {
                        return {
                            name: value.name,
                            message: value.message
                        };
                    }
                }
                
                return value;
            }));
        } catch (error) {
            return { error: 'Failed to sanitize history data', original: String(data) };
        }
    }
    
    /**
     * Generate unique history ID
     */
    generateHistoryId() {
        return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Generate session ID for operation tracking
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Get a specific history entry by ID
     */
    getHistoryEntry(id) {
        return this.history.find(entry => entry.id === id);
    }
    
    /**
     * Delete a specific history entry
     */
    deleteHistoryEntry(id) {
        const index = this.history.findIndex(entry => entry.id === id);
        if (index !== -1) {
            const deleted = this.history.splice(index, 1)[0];
            this.saveHistoryToStorage();
            
            if (this.loggingSubsystem) {
                this.loggingSubsystem.info('History entry deleted', { id, description: deleted.description }, 'system');
            }
            
            // Emit event for UI updates
            if (this.eventBus) {
                this.eventBus.emit('historyEntryDeleted', { id, entry: deleted });
            }
            
            return true;
        }
        
        return false;
    }
}

// Export for use in other modules
export default HistorySubsystem;
