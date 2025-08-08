/**
 * Stats Tracking Subsystem
 * Tracks comprehensive statistics for all operations (import, export, delete, modify)
 */

export class StatsTrackingSubsystem {
    constructor(logger) {
        this.logger = logger;
        this.stats = {
            operations: {
                import: [],
                export: [],
                delete: [],
                modify: []
            },
            summaries: {
                import: {
                    total: 0,
                    success: 0,
                    failed: 0,
                    warnings: 0,
                    totalTime: 0,
                    avgTime: 0
                },
                export: {
                    total: 0,
                    success: 0,
                    failed: 0,
                    warnings: 0,
                    totalTime: 0,
                    avgTime: 0,
                    totalRecords: 0
                },
                delete: {
                    total: 0,
                    success: 0,
                    failed: 0,
                    warnings: 0,
                    totalTime: 0,
                    avgTime: 0,
                    totalRecords: 0
                },
                modify: {
                    total: 0,
                    success: 0,
                    failed: 0,
                    warnings: 0,
                    totalTime: 0,
                    avgTime: 0,
                    totalRecords: 0
                }
            }
        };
        this.loadStats();
    }

    /**
     * Start tracking an operation
     */
    startOperation(type, details = {}) {
        const operationId = this.generateOperationId();
        const startTime = Date.now();
        
        const operation = {
            id: operationId,
            type: type,
            startTime: startTime,
            status: 'running',
            details: details,
            records: {
                total: 0,
                processed: 0,
                success: 0,
                failed: 0,
                warnings: 0
            },
            errors: [],
            warnings: [],
            duration: 0
        };

        this.stats.operations[type].push(operation);
        this.logger.info(`Started ${type} operation`, { operationId, details });
        
        return operationId;
    }

    /**
     * Update operation progress
     */
    updateOperationProgress(operationId, type, progress) {
        const operation = this.findOperation(operationId, type);
        if (!operation) return;

        Object.assign(operation.records, progress);
        this.logger.debug(`Updated ${type} operation progress`, { operationId, progress });
    }

    /**
     * Add error to operation
     */
    addOperationError(operationId, type, error) {
        const operation = this.findOperation(operationId, type);
        if (!operation) return;

        operation.errors.push({
            timestamp: Date.now(),
            message: error.message || error,
            details: error.details || error
        });

        this.logger.error(`Added error to ${type} operation`, { operationId, error });
    }

    /**
     * Add warning to operation
     */
    addOperationWarning(operationId, type, warning) {
        const operation = this.findOperation(operationId, type);
        if (!operation) return;

        operation.warnings.push({
            timestamp: Date.now(),
            message: warning.message || warning,
            details: warning.details || warning
        });

        this.logger.warn(`Added warning to ${type} operation`, { operationId, warning });
    }

    /**
     * Complete an operation
     */
    completeOperation(operationId, type, result) {
        const operation = this.findOperation(operationId, type);
        if (!operation) return;

        const endTime = Date.now();
        operation.endTime = endTime;
        operation.duration = endTime - operation.startTime;
        operation.status = result.success ? 'completed' : 'failed';
        operation.result = result;

        // Update summaries
        this.updateSummary(type, operation);

        this.logger.info(`Completed ${type} operation`, { 
            operationId, 
            status: operation.status, 
            duration: operation.duration,
            records: operation.records 
        });

        this.saveStats();
        return operation;
    }

    /**
     * Update operation summary statistics
     */
    updateSummary(type, operation) {
        const summary = this.stats.summaries[type];
        summary.total++;
        
        if (operation.status === 'completed') {
            summary.success++;
        } else {
            summary.failed++;
        }

        summary.warnings += operation.warnings.length;
        summary.totalTime += operation.duration;
        summary.avgTime = summary.totalTime / summary.total;
        summary.totalRecords += operation.records.total || 0;
    }

    /**
     * Get operation statistics
     */
    getOperationStats(type = null) {
        if (type) {
            return {
                operations: this.stats.operations[type],
                summary: this.stats.summaries[type]
            };
        }
        return this.stats;
    }

    /**
     * Get recent operations
     */
    getRecentOperations(type = null, limit = 10) {
        let operations = [];
        
        if (type) {
            operations = this.stats.operations[type];
        } else {
            operations = Object.values(this.stats.operations).flat();
        }

        return operations
            .sort((a, b) => b.startTime - a.startTime)
            .slice(0, limit);
    }

    /**
     * Find operation by ID
     */
    findOperation(operationId, type) {
        return this.stats.operations[type].find(op => op.id === operationId);
    }

    /**
     * Generate unique operation ID
     */
    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Load stats from localStorage
     */
    loadStats() {
        try {
            const saved = localStorage.getItem('pingone_stats');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.stats = { ...this.stats, ...parsed };
                this.logger.info('Loaded stats from localStorage');
            }
        } catch (error) {
            this.logger.error('Failed to load stats from localStorage', error);
        }
    }

    /**
     * Save stats to localStorage
     */
    saveStats() {
        try {
            localStorage.setItem('pingone_stats', JSON.stringify(this.stats));
            this.logger.debug('Saved stats to localStorage');
        } catch (error) {
            this.logger.error('Failed to save stats to localStorage', error);
        }
    }

    /**
     * Clear all stats
     */
    clearStats() {
        this.stats = {
            operations: {
                import: [],
                export: [],
                delete: [],
                modify: []
            },
            summaries: {
                import: { total: 0, success: 0, failed: 0, warnings: 0, totalTime: 0, avgTime: 0 },
                export: { total: 0, success: 0, failed: 0, warnings: 0, totalTime: 0, avgTime: 0, totalRecords: 0 },
                delete: { total: 0, success: 0, failed: 0, warnings: 0, totalTime: 0, avgTime: 0, totalRecords: 0 },
                modify: { total: 0, success: 0, failed: 0, warnings: 0, totalTime: 0, avgTime: 0, totalRecords: 0 }
            }
        };
        this.saveStats();
        this.logger.info('Cleared all stats');
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
     * Get operation type display name
     */
    getOperationTypeDisplay(type) {
        const displays = {
            import: 'Import Users',
            export: 'Export Users',
            delete: 'Delete Users',
            modify: 'Modify Users'
        };
        return displays[type] || type;
    }

    /**
     * Get operation status color
     */
    getOperationStatusColor(status) {
        const colors = {
            running: '#007bff',
            completed: '#28a745',
            failed: '#dc3545',
            cancelled: '#6c757d'
        };
        return colors[status] || '#6c757d';
    }
}
