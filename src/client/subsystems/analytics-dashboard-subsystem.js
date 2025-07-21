/**
 * Analytics Dashboard Subsystem
 * 
 * Provides comprehensive analytics and metrics collection including:
 * - Real-time system performance monitoring
 * - Operation analytics and insights
 * - User activity and collaboration metrics
 * - Historical trend analysis
 * - Resource usage tracking
 * - Performance benchmarking
 */

export class AnalyticsDashboardSubsystem {
    constructor(logger, eventBus, advancedRealtimeSubsystem, progressSubsystem, sessionSubsystem) {
        this.logger = logger;
        this.eventBus = eventBus;
        this.advancedRealtime = advancedRealtimeSubsystem;
        this.progressSubsystem = progressSubsystem;
        this.sessionSubsystem = sessionSubsystem;
        
        // Analytics data storage
        this.metrics = {
            system: {
                performance: [],
                resources: [],
                connections: [],
                errors: []
            },
            operations: {
                imports: [],
                exports: [],
                modifications: [],
                deletions: []
            },
            users: {
                sessions: [],
                activity: [],
                collaboration: []
            },
            realtime: {
                connections: [],
                messages: [],
                latency: []
            }
        };
        
        // Configuration
        this.config = {
            metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
            samplingInterval: 5000, // 5 seconds
            batchSize: 100,
            maxDataPoints: 1000,
            alertThresholds: {
                memoryUsage: 0.8,
                connectionLatency: 1000,
                errorRate: 0.05,
                operationFailureRate: 0.1
            }
        };
        
        // State management
        this.isCollecting = false;
        this.collectionInterval = null;
        this.alertsEnabled = true;
        this.dashboardSubscribers = new Set();
        
        this.logger.info('Analytics Dashboard Subsystem initialized');
    }
    
    /**
     * Initialize the analytics dashboard subsystem
     */
    async init() {
        try {
            // Set up EventBus listeners for analytics collection
            this.setupEventBusListeners();
            
            // Initialize metrics collection
            await this.initializeMetricsCollection();
            
            // Set up periodic data collection
            this.startDataCollection();
            
            // Initialize alert system
            this.initializeAlertSystem();
            
            this.logger.info('Analytics Dashboard Subsystem initialized successfully');
            this.eventBus.emit('subsystem:ready', { subsystem: 'analytics-dashboard' });
            
        } catch (error) {
            this.logger.error('Failed to initialize Analytics Dashboard Subsystem', error);
            this.eventBus.emit('subsystem:error', { subsystem: 'analytics-dashboard', error });
            throw error;
        }
    }
    
    /**
     * Set up EventBus listeners for analytics collection
     */
    setupEventBusListeners() {
        this.logger.debug('Setting up EventBus listeners for analytics collection');
        
        // Operation events
        this.eventBus.on('operation:started', (data) => this.recordOperationStart(data));
        this.eventBus.on('operation:completed', (data) => this.recordOperationComplete(data));
        this.eventBus.on('operation:failed', (data) => this.recordOperationFailure(data));
        this.eventBus.on('operation:progress', (data) => this.recordOperationProgress(data));
        
        // System events
        this.eventBus.on('app:global-error', (data) => this.recordSystemError(data));
        this.eventBus.on('app:page-loaded', (data) => this.recordSystemPerformance(data));
        this.eventBus.on('subsystem:error', (data) => this.recordSubsystemError(data));
        
        // User activity events
        this.eventBus.on('session:user-joined', (data) => this.recordUserActivity(data));
        this.eventBus.on('session:user-left', (data) => this.recordUserActivity(data));
        this.eventBus.on('collaboration:user-joined', (data) => this.recordCollaborationActivity(data));
        this.eventBus.on('collaboration:user-left', (data) => this.recordCollaborationActivity(data));
        
        // Real-time events
        this.eventBus.on('progress-stream:update', (data) => this.recordRealtimeActivity(data));
        this.eventBus.on('notification:sent', (data) => this.recordRealtimeActivity(data));
        
        this.logger.debug('EventBus listeners set up for analytics collection');
    }
    
    /**
     * Initialize metrics collection
     */
    async initializeMetricsCollection() {
        this.logger.debug('Initializing metrics collection');
        
        // Initialize baseline metrics
        await this.collectSystemMetrics();
        await this.collectOperationMetrics();
        await this.collectUserMetrics();
        await this.collectRealtimeMetrics();
        
        this.logger.debug('Metrics collection initialized');
    }

    /**
     * Collect system metrics
     */
    async collectSystemMetrics() {
        try {
            const systemMetrics = this.getSystemPerformanceMetrics();
            this.addMetric('system.performance', systemMetrics);
            
            const resourceMetrics = this.getResourceUsageMetrics();
            this.addMetric('system.resources', resourceMetrics);
            
            const connectionMetrics = this.getConnectionMetrics();
            this.addMetric('system.connections', connectionMetrics);
            
            this.logger.debug('System metrics collected');
        } catch (error) {
            this.logger.error('Failed to collect system metrics', error);
        }
    }

    /**
     * Collect operation metrics
     */
    async collectOperationMetrics() {
        try {
            // Get operation counts and performance from other subsystems
            const operationData = {
                timestamp: new Date(),
                totalOperations: this.metrics.operations.imports.length + 
                               this.metrics.operations.exports.length + 
                               this.metrics.operations.modifications.length + 
                               this.metrics.operations.deletions.length,
                successfulOperations: this.getSuccessfulOperationsCount(),
                failedOperations: this.getFailedOperationsCount(),
                averageResponseTime: this.getAverageResponseTime()
            };
            
            this.addMetric('operations.summary', operationData);
            this.logger.debug('Operation metrics collected');
        } catch (error) {
            this.logger.error('Failed to collect operation metrics', error);
        }
    }

    /**
     * Collect user metrics
     */
    async collectUserMetrics() {
        try {
            const userMetrics = {
                timestamp: new Date(),
                activeSessions: this.sessionSubsystem ? await this.sessionSubsystem.getActiveSessionCount() : 0,
                totalUsers: this.metrics.users.sessions.length,
                collaborativeUsers: this.metrics.users.collaboration.length,
                averageSessionDuration: this.getAverageSessionDuration()
            };
            
            this.addMetric('users.activity', userMetrics);
            this.logger.debug('User metrics collected');
        } catch (error) {
            this.logger.error('Failed to collect user metrics', error);
        }
    }

    /**
     * Collect realtime metrics
     */
    async collectRealtimeMetrics() {
        try {
            const realtimeMetrics = this.getRealtimeMetrics();
            this.addMetric('realtime.performance', realtimeMetrics);
            
            this.logger.debug('Realtime metrics collected');
        } catch (error) {
            this.logger.error('Failed to collect realtime metrics', error);
        }
    }

    /**
     * Helper methods for metrics calculation
     */
    getSuccessfulOperationsCount() {
        let count = 0;
        Object.keys(this.metrics.operations).forEach(type => {
            count += this.metrics.operations[type].filter(op => op.status === 'success').length;
        });
        return count;
    }

    getFailedOperationsCount() {
        let count = 0;
        Object.keys(this.metrics.operations).forEach(type => {
            count += this.metrics.operations[type].filter(op => op.status === 'failed').length;
        });
        return count;
    }

    getAverageResponseTime() {
        let totalTime = 0;
        let count = 0;
        
        Object.keys(this.metrics.operations).forEach(type => {
            this.metrics.operations[type].forEach(op => {
                if (op.responseTime) {
                    totalTime += op.responseTime;
                    count++;
                }
            });
        });
        
        return count > 0 ? totalTime / count : 0;
    }

    getAverageSessionDuration() {
        if (this.metrics.users.sessions.length === 0) return 0;
        
        let totalDuration = 0;
        let count = 0;
        
        this.metrics.users.sessions.forEach(session => {
            if (session.duration) {
                totalDuration += session.duration;
                count++;
            }
        });
        
        return count > 0 ? totalDuration / count : 0;
    }

    getRecentAverageLatency() {
        const recentMetrics = this.metrics.realtime.latency.slice(-10); // Last 10 measurements
        if (recentMetrics.length === 0) return null;
        
        const totalLatency = recentMetrics.reduce((sum, metric) => sum + metric.value, 0);
        return totalLatency / recentMetrics.length;
    }

    getRecentErrorRate() {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        const recentErrors = this.metrics.system.errors.filter(error => 
            new Date(error.timestamp) > oneHourAgo
        );
        
        const recentOperations = [];
        Object.keys(this.metrics.operations).forEach(type => {
            recentOperations.push(...this.metrics.operations[type].filter(op => 
                new Date(op.timestamp) > oneHourAgo
            ));
        });
        
        if (recentOperations.length === 0) return 0;
        return recentErrors.length / recentOperations.length;
    }
    
    /**
     * Start periodic data collection
     */
    startDataCollection() {
        if (this.isCollecting) return;
        
        this.isCollecting = true;
        this.collectionInterval = setInterval(async () => {
            try {
                await this.collectPeriodicMetrics();
                this.cleanupOldData();
                this.checkAlertThresholds();
                this.notifyDashboardSubscribers();
            } catch (error) {
                this.logger.error('Error during periodic data collection', error);
            }
        }, this.config.samplingInterval);
        
        this.logger.info('Started periodic data collection', { interval: this.config.samplingInterval });
    }
    
    /**
     * Stop data collection
     */
    stopDataCollection() {
        if (!this.isCollecting) return;
        
        this.isCollecting = false;
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }
        
        this.logger.info('Stopped periodic data collection');
    }
    
    /**
     * Collect periodic metrics
     */
    async collectPeriodicMetrics() {
        const timestamp = new Date();
        
        try {
            // System performance metrics
            const systemMetrics = await this.getSystemPerformanceMetrics();
            this.addMetric('system.performance', {
                timestamp,
                ...systemMetrics
            });
        } catch (error) {
            this.logger.debug('Failed to collect system performance metrics', error);
        }
        
        try {
            // Resource usage metrics
            const resourceMetrics = await this.getResourceUsageMetrics();
            this.addMetric('system.resources', {
                timestamp,
                ...resourceMetrics
            });
        } catch (error) {
            this.logger.debug('Failed to collect resource usage metrics', error);
        }
        
        try {
            // Connection metrics
            const connectionMetrics = await this.getConnectionMetrics();
            this.addMetric('system.connections', {
                timestamp,
                ...connectionMetrics
            });
        } catch (error) {
            this.logger.debug('Failed to collect connection metrics', error);
        }
        
        try {
            // Real-time metrics
            const realtimeMetrics = await this.getRealtimeMetrics();
            this.addMetric('realtime.connections', {
                timestamp,
                ...realtimeMetrics
            });
        } catch (error) {
            this.logger.debug('Failed to collect realtime metrics', error);
        }
    }
    
    /**
     * Get system performance metrics
     */
    async getSystemPerformanceMetrics() {
        const metrics = {
            timestamp: new Date(),
            memory: null,
            timing: null,
            connection: null
        };
        
        // Memory usage (if available)
        if (performance.memory) {
            metrics.memory = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                usage: performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize
            };
        }
        
        // Performance timing
        if (performance.timing) {
            const timing = performance.timing;
            metrics.timing = {
                loadTime: timing.loadEventEnd - timing.navigationStart,
                domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
                firstPaint: timing.responseStart - timing.navigationStart
            };
        }
        
        // Connection latency (if real-time connection exists)
        if (this.advancedRealtime) {
            try {
                metrics.connection = {
                    latency: await this.measureConnectionLatency(),
                    status: this.advancedRealtime.realtimeCommunication?.getConnectionStatus()
                };
            } catch (error) {
                this.logger.debug('Could not measure connection latency', error);
            }
        }
        
        return metrics;
    }
    
    /**
     * Get resource usage metrics
     */
    async getResourceUsageMetrics() {
        return {
            timestamp: new Date(),
            activeSubsystems: this.getActiveSubsystemCount(),
            eventListeners: this.getEventListenerCount(),
            domElements: document.querySelectorAll('*').length,
            localStorageUsage: this.getLocalStorageUsage(),
            sessionStorageUsage: this.getSessionStorageUsage()
        };
    }
    
    /**
     * Get connection metrics
     */
    async getConnectionMetrics() {
        const connectionStatus = this.advancedRealtime?.realtimeCommunication?.getConnectionStatus() || {};
        
        return {
            timestamp: new Date(),
            isConnected: connectionStatus.isConnected || false,
            connectionType: connectionStatus.connectionType || 'none',
            reconnectAttempts: connectionStatus.reconnectAttempts || 0,
            activeUsers: this.advancedRealtime?.activeUsers?.size || 0,
            collaborationRooms: this.advancedRealtime?.collaborationRooms?.size || 0
        };
    }
    
    /**
     * Get real-time metrics
     */
    async getRealtimeMetrics() {
        return {
            timestamp: new Date(),
            liveProgressStreams: this.advancedRealtime?.liveProgressStreams?.size || 0,
            notificationQueues: this.advancedRealtime?.notificationQueues?.size || 0,
            analyticsStreams: this.advancedRealtime?.analyticsStreams?.size || 0,
            messagesSent: this.getRealtimeMessageCount(),
            messagesReceived: this.getRealtimeMessageCount('received')
        };
    }
    
    /**
     * Record operation start
     */
    recordOperationStart(data) {
        this.addMetric(`operations.${data.type || 'unknown'}`, {
            timestamp: new Date(),
            event: 'started',
            operationId: data.operationId,
            type: data.type,
            userId: data.userId,
            metadata: data.metadata || {}
        });
        
        this.logger.debug('Recorded operation start', { type: data.type, operationId: data.operationId });
    }
    
    /**
     * Record operation completion
     */
    recordOperationComplete(data) {
        this.addMetric(`operations.${data.type || 'unknown'}`, {
            timestamp: new Date(),
            event: 'completed',
            operationId: data.operationId,
            type: data.type,
            duration: data.duration,
            recordsProcessed: data.recordsProcessed,
            success: true,
            metadata: data.metadata || {}
        });
        
        this.logger.debug('Recorded operation completion', { type: data.type, operationId: data.operationId });
    }
    
    /**
     * Record operation failure
     */
    recordOperationFailure(data) {
        this.addMetric(`operations.${data.type || 'unknown'}`, {
            timestamp: new Date(),
            event: 'failed',
            operationId: data.operationId,
            type: data.type,
            error: data.error,
            duration: data.duration,
            success: false,
            metadata: data.metadata || {}
        });
        
        this.logger.debug('Recorded operation failure', { type: data.type, operationId: data.operationId });
    }
    
    /**
     * Record system error
     */
    recordSystemError(data) {
        const errorMetric = {
            timestamp: new Date(),
            type: 'system-error',
            error: data.error || data.message || 'Unknown error',
            stack: data.stack,
            context: data.context || {},
            severity: data.severity || 'error'
        };
        
        this.addMetric('system.errors', errorMetric);
        this.logger.debug('System error recorded', errorMetric);
    }
    
    /**
     * Record subsystem error
     */
    recordSubsystemError(data) {
        const errorMetric = {
            timestamp: new Date(),
            type: 'subsystem-error',
            subsystem: data.subsystem || 'unknown',
            error: data.error?.message || data.error || 'Unknown subsystem error',
            stack: data.error?.stack,
            context: data.context || {},
            severity: 'error'
        };
        
        this.addMetric('system.errors', errorMetric);
        this.logger.debug('Subsystem error recorded', errorMetric);
    }
    
    /**
     * Record user activity
     */
    recordUserActivity(data) {
        this.addMetric('users.activity', {
            timestamp: new Date(),
            event: data.event || 'activity',
            userId: data.userId,
            sessionId: data.sessionId,
            metadata: data.metadata || {}
        });
        
        this.logger.debug('Recorded user activity', { event: data.event, userId: data.userId });
    }
    
    /**
     * Record collaboration activity
     */
    recordCollaborationActivity(data) {
        this.addMetric('users.collaboration', {
            timestamp: new Date(),
            event: data.event || 'collaboration',
            userId: data.userId || data.user?.id,
            roomId: data.roomId,
            userCount: data.totalUsers,
            metadata: data.metadata || {}
        });
        
        this.logger.debug('Recorded collaboration activity', { event: data.event, roomId: data.roomId });
    }
    
    /**
     * Record real-time activity
     */
    recordRealtimeActivity(data) {
        this.addMetric('realtime.messages', {
            timestamp: new Date(),
            type: data.type || 'message',
            operationId: data.operationId,
            recipients: data.recipients?.length || 0,
            metadata: data.metadata || {}
        });
        
        this.logger.debug('Recorded real-time activity', { type: data.type });
    }
    
    /**
     * Get analytics dashboard data
     */
    async getAnalyticsDashboardData(timeRange = '1h') {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - this.parseTimeRange(timeRange));
        
        try {
            const dashboardData = {
                timestamp: endTime,
                timeRange,
                summary: await this.getSummaryMetrics(startTime, endTime),
                systemMetrics: await this.getSystemMetricsData(startTime, endTime),
                operationMetrics: await this.getOperationMetricsData(startTime, endTime),
                userMetrics: await this.getUserMetricsData(startTime, endTime),
                realtimeMetrics: await this.getRealtimeMetricsData(startTime, endTime),
                alerts: this.getActiveAlerts(),
                trends: await this.getTrendAnalysis(startTime, endTime)
            };
            
            return dashboardData;
            
        } catch (error) {
            this.logger.error('Failed to get analytics dashboard data', error);
            throw error;
        }
    }
    
    /**
     * Get summary metrics
     */
    async getSummaryMetrics(startTime, endTime) {
        return {
            totalOperations: this.countMetricsInRange('operations', startTime, endTime),
            successfulOperations: this.countSuccessfulOperations(startTime, endTime),
            failedOperations: this.countFailedOperations(startTime, endTime),
            activeUsers: this.advancedRealtime?.activeUsers?.size || 0,
            systemErrors: this.countMetricsInRange('system.errors', startTime, endTime),
            averageLatency: this.getAverageLatency(startTime, endTime),
            memoryUsage: this.getCurrentMemoryUsage(),
            connectionStatus: this.advancedRealtime?.realtimeCommunication?.getConnectionStatus()
        };
    }
    
    /**
     * Get system metrics data for charts
     */
    async getSystemMetricsData(startTime, endTime) {
        const performanceData = this.getMetricsInRange('system.performance', startTime, endTime);
        const resourceData = this.getMetricsInRange('system.resources', startTime, endTime);
        const connectionData = this.getMetricsInRange('system.connections', startTime, endTime);
        
        return {
            performance: this.formatTimeSeriesData(performanceData, 'memory.usage'),
            resources: this.formatTimeSeriesData(resourceData, 'domElements'),
            connections: this.formatTimeSeriesData(connectionData, 'activeUsers'),
            errors: this.getMetricsInRange('system.errors', startTime, endTime)
        };
    }
    
    /**
     * Get operation metrics data for charts
     */
    async getOperationMetricsData(startTime, endTime) {
        const imports = this.getMetricsInRange('operations.imports', startTime, endTime);
        const exports = this.getMetricsInRange('operations.exports', startTime, endTime);
        const modifications = this.getMetricsInRange('operations.modifications', startTime, endTime);
        const deletions = this.getMetricsInRange('operations.deletions', startTime, endTime);
        
        return {
            imports: this.aggregateOperationMetrics(imports),
            exports: this.aggregateOperationMetrics(exports),
            modifications: this.aggregateOperationMetrics(modifications),
            deletions: this.aggregateOperationMetrics(deletions),
            timeline: this.createOperationTimeline(startTime, endTime)
        };
    }
    
    /**
     * Subscribe to dashboard updates
     */
    subscribeToDashboardUpdates(callback) {
        this.dashboardSubscribers.add(callback);
        return () => this.dashboardSubscribers.delete(callback);
    }
    
    /**
     * Notify dashboard subscribers
     */
    notifyDashboardSubscribers() {
        if (this.dashboardSubscribers.size > 0) {
            this.getAnalyticsDashboardData().then(data => {
                this.dashboardSubscribers.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        this.logger.error('Error notifying dashboard subscriber', error);
                    }
                });
            });
        }
    }
    
    // Utility Methods
    
    addMetric(category, data) {
        const [main, sub] = category.split('.');
        if (!this.metrics[main]) this.metrics[main] = {};
        if (!this.metrics[main][sub]) this.metrics[main][sub] = [];
        
        this.metrics[main][sub].push(data);
        
        // Maintain max data points
        if (this.metrics[main][sub].length > this.config.maxDataPoints) {
            this.metrics[main][sub].shift();
        }
    }
    
    getMetricsInRange(category, startTime, endTime) {
        const [main, sub] = category.split('.');
        const metrics = this.metrics[main]?.[sub] || [];
        
        return metrics.filter(metric => 
            metric.timestamp >= startTime && metric.timestamp <= endTime
        );
    }
    
    countMetricsInRange(category, startTime, endTime) {
        return this.getMetricsInRange(category, startTime, endTime).length;
    }
    
    parseTimeRange(timeRange) {
        const units = {
            'm': 60 * 1000,
            'h': 60 * 60 * 1000,
            'd': 24 * 60 * 60 * 1000
        };
        
        const match = timeRange.match(/^(\d+)([mhd])$/);
        if (!match) return 60 * 60 * 1000; // Default 1 hour
        
        const [, value, unit] = match;
        return parseInt(value) * units[unit];
    }
    
    cleanupOldData() {
        const cutoffTime = new Date(Date.now() - this.config.metricsRetention);
        
        Object.keys(this.metrics).forEach(main => {
            Object.keys(this.metrics[main]).forEach(sub => {
                this.metrics[main][sub] = this.metrics[main][sub].filter(
                    metric => metric.timestamp > cutoffTime
                );
            });
        });
    }
    
    async measureConnectionLatency() {
        try {
            if (!this.advancedRealtime?.realtimeCommunication?.isConnected) {
                return null;
            }
            
            if (!this.advancedRealtime.realtimeCommunication.socket) {
                return null;
            }
            
            const start = performance.now();
            return new Promise((resolve) => {
                try {
                    this.advancedRealtime.realtimeCommunication.socket.emit('ping', start, () => {
                        const latency = performance.now() - start;
                        resolve(latency);
                    });
                    
                    // Timeout after 3 seconds to prevent hanging
                    setTimeout(() => resolve(null), 3000);
                } catch (error) {
                    this.logger.debug('Error emitting ping for latency measurement', error);
                    resolve(null);
                }
            });
        } catch (error) {
            this.logger.debug('Error measuring connection latency', error);
            return null;
        }
    }
    
    getActiveSubsystemCount() {
        // This would typically come from the main app
        return Object.keys(window.app?.subsystems || {}).length;
    }
    
    getEventListenerCount() {
        // EventBus doesn't have listenerCount method, return estimated count
        try {
            if (this.eventBus && this.eventBus._events) {
                return Object.keys(this.eventBus._events).length;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }
    
    getRealtimeMessageCount(type = 'sent') {
        // Return message count from advanced realtime subsystem if available
        try {
            if (this.advancedRealtime && this.advancedRealtime.getMessageCount) {
                return this.advancedRealtime.getMessageCount(type);
            }
            // Fallback to estimated count
            return this.advancedRealtime?.messageCount || 0;
        } catch (error) {
            return 0;
        }
    }
    
    getLocalStorageUsage() {
        try {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                }
            }
            return total;
        } catch (error) {
            return 0;
        }
    }
    
    getSessionStorageUsage() {
        try {
            let total = 0;
            for (let key in sessionStorage) {
                if (sessionStorage.hasOwnProperty(key)) {
                    total += sessionStorage[key].length + key.length;
                }
            }
            return total;
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * Initialize alert system
     */
    initializeAlertSystem() {
        this.alerts = [];
        this.logger.debug('Alert system initialized');
    }
    
    /**
     * Check alert thresholds
     */
    checkAlertThresholds() {
        if (!this.alertsEnabled) return;
        
        // Memory usage alert
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize;
            if (memoryUsage > this.config.alertThresholds.memoryUsage) {
                this.createAlert('high-memory-usage', `Memory usage is ${(memoryUsage * 100).toFixed(1)}%`, 'warning');
            }
        }
        
        // Connection latency alert
        const recentLatency = this.getRecentAverageLatency();
        if (recentLatency && recentLatency > this.config.alertThresholds.connectionLatency) {
            this.createAlert('high-latency', `Connection latency is ${recentLatency.toFixed(0)}ms`, 'warning');
        }
        
        // Error rate alert
        const errorRate = this.getRecentErrorRate();
        if (errorRate > this.config.alertThresholds.errorRate) {
            this.createAlert('high-error-rate', `Error rate is ${(errorRate * 100).toFixed(1)}%`, 'error');
        }
    }
    
    createAlert(id, message, severity) {
        const alert = {
            id,
            message,
            severity,
            timestamp: new Date(),
            acknowledged: false
        };
        
        // Avoid duplicate alerts
        if (!this.alerts.find(a => a.id === id && !a.acknowledged)) {
            this.alerts.push(alert);
            this.eventBus.emit('analytics:alert-created', alert);
            this.logger.warn('Analytics alert created', alert);
        }
    }
    
    getActiveAlerts() {
        return this.alerts.filter(alert => !alert.acknowledged);
    }
    
    /**
     * Cleanup and disconnect
     */
    async disconnect() {
        this.logger.info('Disconnecting Analytics Dashboard Subsystem');
        
        this.stopDataCollection();
        this.dashboardSubscribers.clear();
        
        // Clear metrics data
        Object.keys(this.metrics).forEach(main => {
            Object.keys(this.metrics[main]).forEach(sub => {
                this.metrics[main][sub] = [];
            });
        });
        
        this.logger.info('Analytics Dashboard Subsystem disconnected');
    }
    
    /**
     * Get subsystem status
     */
    getStatus() {
        return {
            isInitialized: true,
            isCollecting: this.isCollecting,
            metricsCount: this.getTotalMetricsCount(),
            alertsCount: this.getActiveAlerts().length,
            subscribersCount: this.dashboardSubscribers.size,
            timestamp: new Date()
        };
    }
    
    getTotalMetricsCount() {
        let total = 0;
        Object.keys(this.metrics).forEach(main => {
            Object.keys(this.metrics[main]).forEach(sub => {
                total += this.metrics[main][sub].length;
            });
        });
        return total;
    }
}
