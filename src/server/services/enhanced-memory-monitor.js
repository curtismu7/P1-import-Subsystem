// Enhanced Memory Monitor with Proactive Alerts and Optimization
// Version 7.3.0 - Phase 1 Improvements
//
// This enhanced memory monitor provides:
// - Proactive memory usage alerts at 75%, 85%, 90%
// - Memory leak detection and prevention
// - Garbage collection optimization
// - Real-time memory trend analysis
// - Automatic memory cleanup recommendations

import EventEmitter from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';

/**
 * Enhanced Memory Monitor Class
 * 
 * Provides comprehensive memory monitoring with proactive alerts,
 * trend analysis, and optimization recommendations.
 */
class EnhancedMemoryMonitor extends EventEmitter {
    constructor(logger) {
        super();
        
        this.logger = logger || {
            debug: console.debug.bind(console),
            info: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console)
        };
        
        // Memory monitoring configuration
        this.monitoringInterval = 30000; // 30 seconds
        this.alertThresholds = {
            warning: 0.75,    // 75% heap usage
            critical: 0.85,   // 85% heap usage
            emergency: 0.90   // 90% heap usage
        };
        
        // Memory tracking
        this.memoryHistory = [];
        this.maxHistoryLength = 100; // Keep last 100 readings
        this.alertCooldown = 5 * 60 * 1000; // 5 minutes between same-level alerts
        this.lastAlerts = {};
        
        // Performance tracking
        this.gcObserver = null;
        this.gcStats = {
            count: 0,
            totalDuration: 0,
            lastGC: null,
            types: {}
        };
        
        // Monitoring state
        this.isMonitoring = false;
        this.monitoringTimer = null;
        
        this.logger.info('Enhanced Memory Monitor initialized');
    }

    /**
     * Start memory monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) {
            this.logger.warn('Memory monitoring already active');
            return;
        }
        
        this.isMonitoring = true;
        
        // Start periodic memory checks
        this.monitoringTimer = setInterval(() => {
            this.performMemoryCheck();
        }, this.monitoringInterval);
        
        // Set up garbage collection monitoring
        this.setupGCMonitoring();
        
        // Perform initial check
        this.performMemoryCheck();
        
        this.logger.info('Enhanced memory monitoring started', {
            interval: this.monitoringInterval / 1000 + 's',
            thresholds: this.alertThresholds
        });
    }

    /**
     * Stop memory monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }
        
        if (this.gcObserver) {
            this.gcObserver.disconnect();
            this.gcObserver = null;
        }
        
        this.logger.info('Memory monitoring stopped');
    }

    /**
     * Set up garbage collection monitoring
     */
    setupGCMonitoring() {
        try {
            this.gcObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.entryType === 'gc') {
                        this.recordGCEvent(entry);
                    }
                });
            });
            
            this.gcObserver.observe({ entryTypes: ['gc'] });
            this.logger.debug('GC monitoring enabled');
            
        } catch (error) {
            this.logger.warn('GC monitoring not available:', error.message);
        }
    }

    /**
     * Record garbage collection event
     */
    recordGCEvent(entry) {
        this.gcStats.count++;
        this.gcStats.totalDuration += entry.duration;
        this.gcStats.lastGC = Date.now();
        
        const gcType = entry.detail?.kind || 'unknown';
        this.gcStats.types[gcType] = (this.gcStats.types[gcType] || 0) + 1;
        
        // Log significant GC events
        if (entry.duration > 100) { // More than 100ms
            this.logger.warn('Long GC pause detected', {
                duration: Math.round(entry.duration) + 'ms',
                type: gcType,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Perform comprehensive memory check
     */
    performMemoryCheck() {
        const memoryUsage = process.memoryUsage();
        const timestamp = Date.now();
        
        // Calculate heap usage percentage
        const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
        const heapUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
        
        // Create memory snapshot
        const snapshot = {
            timestamp,
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            heapUsagePercent,
            heapUsedMB,
            heapTotalMB,
            rss: memoryUsage.rss,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers || 0
        };
        
        // Add to history
        this.memoryHistory.push(snapshot);
        if (this.memoryHistory.length > this.maxHistoryLength) {
            this.memoryHistory.shift();
        }
        
        // Check for alerts
        this.checkMemoryAlerts(snapshot);
        
        // Emit memory update event
        this.emit('memoryUpdate', snapshot);
        
        return snapshot;
    }

    /**
     * Check memory usage against alert thresholds
     */
    checkMemoryAlerts(snapshot) {
        const { heapUsagePercent, heapUsedMB, timestamp } = snapshot;
        
        let alertLevel = null;
        let alertMessage = null;
        
        if (heapUsagePercent >= this.alertThresholds.emergency) {
            alertLevel = 'emergency';
            alertMessage = `EMERGENCY: Memory usage at ${Math.round(heapUsagePercent * 100)}% (${heapUsedMB}MB)`;
        } else if (heapUsagePercent >= this.alertThresholds.critical) {
            alertLevel = 'critical';
            alertMessage = `CRITICAL: Memory usage at ${Math.round(heapUsagePercent * 100)}% (${heapUsedMB}MB)`;
        } else if (heapUsagePercent >= this.alertThresholds.warning) {
            alertLevel = 'warning';
            alertMessage = `WARNING: Memory usage at ${Math.round(heapUsagePercent * 100)}% (${heapUsedMB}MB)`;
        }
        
        if (alertLevel && this.shouldSendAlert(alertLevel, timestamp)) {
            this.sendMemoryAlert(alertLevel, alertMessage, snapshot);
        }
    }

    /**
     * Check if alert should be sent (respects cooldown)
     */
    shouldSendAlert(level, timestamp) {
        const lastAlert = this.lastAlerts[level];
        if (!lastAlert) return true;
        
        return (timestamp - lastAlert) > this.alertCooldown;
    }

    /**
     * Send memory alert
     */
    sendMemoryAlert(level, message, snapshot) {
        this.lastAlerts[level] = snapshot.timestamp;
        
        const logMethod = level === 'emergency' ? 'error' : 
                         level === 'critical' ? 'error' : 'warn';
        
        this.logger[logMethod](message, {
            level,
            heapUsagePercent: Math.round(snapshot.heapUsagePercent * 100) + '%',
            heapUsedMB: snapshot.heapUsedMB,
            heapTotalMB: snapshot.heapTotalMB,
            rss: Math.round(snapshot.rss / 1024 / 1024) + 'MB',
            recommendations: this.getMemoryRecommendations(snapshot)
        });
        
        // Emit alert event
        this.emit('memoryAlert', {
            level,
            message,
            snapshot,
            recommendations: this.getMemoryRecommendations(snapshot),
            timestamp: snapshot.timestamp
        });
        
        // Trigger automatic cleanup for emergency situations
        if (level === 'emergency') {
            this.triggerEmergencyCleanup();
        }
    }

    /**
     * Get memory optimization recommendations
     */
    getMemoryRecommendations(snapshot) {
        const recommendations = [];
        
        if (snapshot.heapUsagePercent > 0.85) {
            recommendations.push('Force garbage collection');
            recommendations.push('Clear application caches');
            recommendations.push('Close idle connections');
        }
        
        if (snapshot.heapUsagePercent > 0.90) {
            recommendations.push('URGENT: Restart application');
            recommendations.push('Investigate memory leaks');
            recommendations.push('Reduce concurrent operations');
        }
        
        if (this.detectMemoryLeak()) {
            recommendations.push('Potential memory leak detected');
            recommendations.push('Review recent code changes');
        }
        
        return recommendations;
    }

    /**
     * Detect potential memory leaks
     */
    detectMemoryLeak() {
        if (this.memoryHistory.length < 10) return false;
        
        const recent = this.memoryHistory.slice(-10);
        const trend = this.calculateMemoryTrend(recent);
        
        // Consider it a leak if memory consistently increases over 10 readings
        return trend > 0.05; // 5% increase trend
    }

    /**
     * Calculate memory usage trend
     */
    calculateMemoryTrend(readings) {
        if (readings.length < 2) return 0;
        
        const first = readings[0].heapUsagePercent;
        const last = readings[readings.length - 1].heapUsagePercent;
        
        return (last - first) / readings.length;
    }

    /**
     * Trigger emergency memory cleanup
     */
    triggerEmergencyCleanup() {
        this.logger.error('Triggering emergency memory cleanup');
        
        try {
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                this.logger.info('Forced garbage collection completed');
            }
            
            // Emit cleanup event for application-specific cleanup
            this.emit('emergencyCleanup', {
                timestamp: Date.now(),
                memoryBefore: process.memoryUsage()
            });
            
            // Check memory after cleanup
            setTimeout(() => {
                const afterCleanup = this.performMemoryCheck();
                this.logger.info('Memory status after emergency cleanup', {
                    heapUsagePercent: Math.round(afterCleanup.heapUsagePercent * 100) + '%',
                    heapUsedMB: afterCleanup.heapUsedMB
                });
            }, 1000);
            
        } catch (error) {
            this.logger.error('Emergency cleanup failed:', error.message);
        }
    }

    /**
     * Get comprehensive memory status report
     */
    getMemoryStatusReport() {
        const current = this.performMemoryCheck();
        const trend = this.memoryHistory.length > 1 ? 
                     this.calculateMemoryTrend(this.memoryHistory.slice(-10)) : 0;
        
        return {
            current: {
                heapUsedMB: current.heapUsedMB,
                heapTotalMB: current.heapTotalMB,
                heapUsagePercent: Math.round(current.heapUsagePercent * 100),
                rss: Math.round(current.rss / 1024 / 1024),
                external: Math.round(current.external / 1024 / 1024),
                arrayBuffers: Math.round(current.arrayBuffers / 1024 / 1024)
            },
            status: this.getMemoryStatus(current.heapUsagePercent),
            trend: {
                direction: trend > 0.01 ? 'increasing' : trend < -0.01 ? 'decreasing' : 'stable',
                value: Math.round(trend * 100) + '%'
            },
            alerts: {
                thresholds: this.alertThresholds,
                lastAlerts: this.lastAlerts,
                cooldown: this.alertCooldown / 1000 + 's'
            },
            gc: {
                ...this.gcStats,
                averageDuration: this.gcStats.count > 0 ? 
                               Math.round(this.gcStats.totalDuration / this.gcStats.count) + 'ms' : 'N/A',
                lastGC: this.gcStats.lastGC ? 
                       Math.round((Date.now() - this.gcStats.lastGC) / 1000) + 's ago' : 'Never'
            },
            monitoring: {
                active: this.isMonitoring,
                interval: this.monitoringInterval / 1000 + 's',
                historyLength: this.memoryHistory.length
            },
            recommendations: this.getMemoryRecommendations(current)
        };
    }

    /**
     * Get memory status description
     */
    getMemoryStatus(heapUsagePercent) {
        if (heapUsagePercent >= this.alertThresholds.emergency) {
            return { level: 'emergency', text: 'Critical - Immediate Action Required', color: 'red' };
        } else if (heapUsagePercent >= this.alertThresholds.critical) {
            return { level: 'critical', text: 'High - Monitor Closely', color: 'orange' };
        } else if (heapUsagePercent >= this.alertThresholds.warning) {
            return { level: 'warning', text: 'Elevated - Watch Trends', color: 'yellow' };
        } else {
            return { level: 'normal', text: 'Normal - Healthy', color: 'green' };
        }
    }

    /**
     * Force garbage collection (if available)
     */
    forceGC() {
        if (global.gc) {
            const before = process.memoryUsage();
            global.gc();
            const after = process.memoryUsage();
            
            const freed = before.heapUsed - after.heapUsed;
            this.logger.info('Manual garbage collection completed', {
                freedMB: Math.round(freed / 1024 / 1024),
                beforeMB: Math.round(before.heapUsed / 1024 / 1024),
                afterMB: Math.round(after.heapUsed / 1024 / 1024)
            });
            
            return { success: true, freedMB: Math.round(freed / 1024 / 1024) };
        } else {
            this.logger.warn('Garbage collection not available (run with --expose-gc)');
            return { success: false, reason: 'GC not exposed' };
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopMonitoring();
        this.removeAllListeners();
        this.memoryHistory = [];
        this.logger.info('Enhanced Memory Monitor destroyed');
    }
}

export default EnhancedMemoryMonitor;
