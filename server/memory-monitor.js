/**
 * Memory Monitoring & Alerting System
 * 
 * Provides real-time memory usage monitoring with configurable alerts
 * and automatic memory optimization recommendations.
 * 
 * @author PingOne Import Tool Team
 * @version 7.0.2.3
 */

import { serverLogger } from './winston-config.js';

/**
 * Memory thresholds for different alert levels
 */
const MEMORY_THRESHOLDS = {
    WARNING: 80,    // 80% memory usage
    CRITICAL: 90,   // 90% memory usage
    EMERGENCY: 95   // 95% memory usage
};

/**
 * Memory monitoring configuration
 */
const MONITORING_CONFIG = {
    checkInterval: 30000,      // Check every 30 seconds
    alertCooldown: 300000,     // 5 minutes between similar alerts
    historySize: 100,          // Keep last 100 memory readings
    gcThreshold: 85            // Trigger GC suggestion at 85%
};

/**
 * Memory monitoring state
 */
let memoryHistory = [];
let lastAlerts = {
    warning: 0,
    critical: 0,
    emergency: 0
};
let monitoringInterval = null;

/**
 * Get current memory usage information
 * @returns {Object} Memory usage details
 */
function getCurrentMemoryUsage() {
    const usage = process.memoryUsage();
    const totalMemory = usage.rss + usage.external;
    const usedMemory = usage.heapUsed;
    const totalHeap = usage.heapTotal;
    
    // Calculate percentages
    const heapUsagePercent = Math.round((usedMemory / totalHeap) * 100);
    const rssUsagePercent = Math.round((usage.rss / (1024 * 1024 * 1024)) * 100); // Rough estimate
    
    return {
        timestamp: Date.now(),
        raw: usage,
        formatted: {
            rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(usage.external / 1024 / 1024)}MB`,
            arrayBuffers: `${Math.round(usage.arrayBuffers / 1024 / 1024)}MB`
        },
        percentages: {
            heap: heapUsagePercent,
            rss: rssUsagePercent
        },
        alertLevel: getAlertLevel(heapUsagePercent)
    };
}

/**
 * Determine alert level based on memory usage
 * @param {number} usagePercent - Memory usage percentage
 * @returns {string} Alert level
 */
function getAlertLevel(usagePercent) {
    if (usagePercent >= MEMORY_THRESHOLDS.EMERGENCY) return 'emergency';
    if (usagePercent >= MEMORY_THRESHOLDS.CRITICAL) return 'critical';
    if (usagePercent >= MEMORY_THRESHOLDS.WARNING) return 'warning';
    return 'normal';
}

/**
 * Check if alert cooldown has passed
 * @param {string} alertType - Type of alert
 * @returns {boolean} True if alert can be sent
 */
function canSendAlert(alertType) {
    const now = Date.now();
    const lastAlert = lastAlerts[alertType] || 0;
    return (now - lastAlert) >= MONITORING_CONFIG.alertCooldown;
}

/**
 * Send memory alert
 * @param {Object} memoryInfo - Current memory information
 * @param {string} alertLevel - Alert level
 */
function sendMemoryAlert(memoryInfo, alertLevel) {
    const now = Date.now();
    
    if (!canSendAlert(alertLevel)) {
        return; // Skip alert due to cooldown
    }
    
    lastAlerts[alertLevel] = now;
    
    const alertMessage = `🚨 MEMORY ALERT [${alertLevel.toUpperCase()}]: ${memoryInfo.percentages.heap}% heap usage`;
    const alertDetails = {
        level: alertLevel,
        timestamp: new Date().toISOString(),
        memory: memoryInfo.formatted,
        percentages: memoryInfo.percentages,
        threshold: MEMORY_THRESHOLDS[alertLevel.toUpperCase()],
        recommendations: getMemoryRecommendations(memoryInfo)
    };
    
    // Log to Winston
    if (alertLevel === 'emergency') {
        serverLogger.error(alertMessage, alertDetails);
    } else if (alertLevel === 'critical') {
        serverLogger.error(alertMessage, alertDetails);
    } else {
        serverLogger.warn(alertMessage, alertDetails);
    }
    
    // Write to stderr for immediate attention
    console.error(`\n${alertMessage}`);
    console.error('Memory Details:', JSON.stringify(alertDetails, null, 2));
    
    // Suggest garbage collection if appropriate
    if (memoryInfo.percentages.heap >= MONITORING_CONFIG.gcThreshold) {
        console.error('💡 Recommendation: Consider triggering garbage collection');
        
        // Optionally trigger GC if --expose-gc flag is used
        if (global.gc) {
            console.error('🧹 Triggering garbage collection...');
            global.gc();
            
            // Check memory after GC
            setTimeout(() => {
                const postGcMemory = getCurrentMemoryUsage();
                serverLogger.info('🧹 Post-GC Memory Usage:', {
                    before: memoryInfo.formatted,
                    after: postGcMemory.formatted,
                    improvement: `${memoryInfo.percentages.heap - postGcMemory.percentages.heap}%`
                });
            }, 1000);
        }
    }
}

/**
 * Get memory optimization recommendations
 * @param {Object} memoryInfo - Current memory information
 * @returns {Array} Array of recommendations
 */
function getMemoryRecommendations(memoryInfo) {
    const recommendations = [];
    
    if (memoryInfo.percentages.heap >= 90) {
        recommendations.push('Consider restarting the application');
        recommendations.push('Check for memory leaks in recent code changes');
        recommendations.push('Review large object allocations');
    } else if (memoryInfo.percentages.heap >= 80) {
        recommendations.push('Monitor memory usage closely');
        recommendations.push('Consider triggering garbage collection');
        recommendations.push('Review caching strategies');
    }
    
    if (memoryInfo.raw.external > 50 * 1024 * 1024) { // 50MB
        recommendations.push('High external memory usage detected');
        recommendations.push('Review buffer and stream usage');
    }
    
    if (memoryInfo.raw.arrayBuffers > 20 * 1024 * 1024) { // 20MB
        recommendations.push('High array buffer usage detected');
        recommendations.push('Review file processing operations');
    }
    
    return recommendations;
}

/**
 * Add memory reading to history
 * @param {Object} memoryInfo - Memory information
 */
function addToHistory(memoryInfo) {
    memoryHistory.push(memoryInfo);
    
    // Keep only the last N readings
    if (memoryHistory.length > MONITORING_CONFIG.historySize) {
        memoryHistory = memoryHistory.slice(-MONITORING_CONFIG.historySize);
    }
}

/**
 * Perform memory check
 */
function performMemoryCheck() {
    try {
        const memoryInfo = getCurrentMemoryUsage();
        
        // Add to history
        addToHistory(memoryInfo);
        
        // Check for alerts
        if (memoryInfo.alertLevel !== 'normal') {
            sendMemoryAlert(memoryInfo, memoryInfo.alertLevel);
        }
        
        // Log periodic status (every 10 checks = ~5 minutes)
        if (memoryHistory.length % 10 === 0) {
            serverLogger.debug('📊 Memory Status Check:', {
                current: memoryInfo.formatted,
                heap: `${memoryInfo.percentages.heap}%`,
                trend: getMemoryTrend()
            });
        }
        
    } catch (error) {
        serverLogger.error('Error during memory check:', error);
    }
}

/**
 * Get memory usage trend
 * @returns {string} Trend description
 */
function getMemoryTrend() {
    if (memoryHistory.length < 5) return 'insufficient_data';
    
    const recent = memoryHistory.slice(-5);
    const first = recent[0].percentages.heap;
    const last = recent[recent.length - 1].percentages.heap;
    const diff = last - first;
    
    if (diff > 5) return 'increasing';
    if (diff < -5) return 'decreasing';
    return 'stable';
}

/**
 * Start memory monitoring
 * @param {Object} options - Monitoring options
 */
export function startMemoryMonitoring(options = {}) {
    const config = { ...MONITORING_CONFIG, ...options };
    
    serverLogger.info('🔄 Starting memory monitoring', {
        interval: `${config.checkInterval / 1000}s`,
        thresholds: MEMORY_THRESHOLDS
    });
    
    // Initial check
    performMemoryCheck();
    
    // Start periodic monitoring
    monitoringInterval = setInterval(performMemoryCheck, config.checkInterval);
    
    // Return cleanup function
    return () => {
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
            serverLogger.info('🛑 Memory monitoring stopped');
        }
    };
}

/**
 * Stop memory monitoring
 */
export function stopMemoryMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        serverLogger.info('🛑 Memory monitoring stopped');
    }
}

/**
 * Get memory status report
 * @returns {Object} Memory status report
 */
export function getMemoryStatusReport() {
    const current = getCurrentMemoryUsage();
    const trend = getMemoryTrend();
    
    return {
        current,
        trend,
        history: memoryHistory.slice(-10), // Last 10 readings
        thresholds: MEMORY_THRESHOLDS,
        recommendations: getMemoryRecommendations(current),
        monitoring: {
            active: monitoringInterval !== null,
            historySize: memoryHistory.length,
            lastAlerts
        }
    };
}

/**
 * Force memory check (for manual testing)
 * @returns {Object} Memory check result
 */
export function forceMemoryCheck() {
    const memoryInfo = getCurrentMemoryUsage();
    
    serverLogger.info('🔍 Manual Memory Check:', {
        memory: memoryInfo.formatted,
        percentages: memoryInfo.percentages,
        alertLevel: memoryInfo.alertLevel
    });
    
    return memoryInfo;
}

export default {
    startMemoryMonitoring,
    stopMemoryMonitoring,
    getMemoryStatusReport,
    forceMemoryCheck,
    getCurrentMemoryUsage,
    MEMORY_THRESHOLDS
};
