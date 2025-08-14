// Enhanced Health Dashboard API
// Version 7.3.0 - Phase 1 Improvements
//
// This enhanced health API provides comprehensive system monitoring with:
// - Real-time token status and expiry tracking
// - Memory usage trends and alerts
// - API response time monitoring
// - System performance metrics
// - Proactive health recommendations

import express from 'express';
import EnhancedTokenManager from '../services/enhanced-token-manager.js';
import EnhancedMemoryMonitor from '../services/enhanced-memory-monitor.js';

const router = express.Router();

// Global instances (will be initialized by the main server)
let tokenManager = null;
let memoryMonitor = null;
let healthMetrics = {
    startTime: Date.now(),
    requestCount: 0,
    errorCount: 0,
    apiResponseTimes: [],
    lastHealthCheck: null
};

/**
 * Initialize enhanced health monitoring
 */
export function initializeHealthMonitoring(logger) {
    try {
        // Initialize enhanced token manager
        tokenManager = new EnhancedTokenManager(logger);
        
        // Initialize enhanced memory monitor
        memoryMonitor = new EnhancedMemoryMonitor(logger);
        memoryMonitor.startMonitoring();
        
        // Set up event listeners
        setupEventListeners(logger);
        
        logger.info('Enhanced health monitoring initialized');
        return { tokenManager, memoryMonitor };
        
    } catch (error) {
        logger.error('Failed to initialize enhanced health monitoring:', error.message);
        throw error;
    }
}

/**
 * Set up event listeners for health monitoring
 */
function setupEventListeners(logger) {
    if (tokenManager) {
        tokenManager.onTokenEvent('statusChange', (event) => {
            logger.info('Token status changed:', event);
        });
        
        tokenManager.onTokenEvent('tokenRenewed', (event) => {
            logger.info('Token renewed:', event);
        });
    }
    
    if (memoryMonitor) {
        memoryMonitor.on('memoryAlert', (alert) => {
            logger.warn('Memory alert:', alert);
        });
        
        memoryMonitor.on('emergencyCleanup', (event) => {
            logger.error('Emergency memory cleanup triggered:', event);
        });
    }
}

/**
 * Middleware to track API response times
 */
export function responseTimeMiddleware(req, res, next) {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        
        // Track response time
        healthMetrics.apiResponseTimes.push({
            path: req.path,
            method: req.method,
            statusCode: res.statusCode,
            responseTime,
            timestamp: Date.now()
        });
        
        // Keep only last 100 response times
        if (healthMetrics.apiResponseTimes.length > 100) {
            healthMetrics.apiResponseTimes.shift();
        }
        
        // Track request counts
        healthMetrics.requestCount++;
        if (res.statusCode >= 400) {
            healthMetrics.errorCount++;
        }
    });
    
    next();
}

/**
 * GET /api/health/dashboard - Comprehensive health dashboard data
 */
router.get('/dashboard', async (req, res) => {
    try {
        const dashboardData = await getComprehensiveHealthData();
        res.json({
            success: true,
            data: dashboardData,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get health dashboard data',
            details: error.message
        });
    }
});

/**
 * GET /api/health/token - Token health status
 */
router.get('/token', (req, res) => {
    try {
        if (!tokenManager) {
            return res.status(503).json({
                success: false,
                error: 'Token manager not initialized'
            });
        }
        
        const tokenStatus = tokenManager.getTokenStatusForDashboard();
        res.json({
            success: true,
            data: tokenStatus,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get token status',
            details: error.message
        });
    }
});

/**
 * GET /api/health/memory - Memory status and trends
 */
router.get('/memory', (req, res) => {
    try {
        if (!memoryMonitor) {
            return res.status(503).json({
                success: false,
                error: 'Memory monitor not initialized'
            });
        }
        
        const memoryStatus = memoryMonitor.getMemoryStatusReport();
        res.json({
            success: true,
            data: memoryStatus,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get memory status',
            details: error.message
        });
    }
});

/**
 * GET /api/health/performance - System performance metrics
 */
router.get('/performance', (req, res) => {
    try {
        const performanceData = getPerformanceMetrics();
        res.json({
            success: true,
            data: performanceData,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get performance metrics',
            details: error.message
        });
    }
});

/**
 * POST /api/health/token/refresh - Force token refresh
 */
router.post('/token/refresh', async (req, res) => {
    try {
        if (!tokenManager) {
            return res.status(503).json({
                success: false,
                error: 'Token manager not initialized'
            });
        }
        
        const newToken = await tokenManager.forceRefresh();
        const tokenStatus = tokenManager.getTokenStatusForDashboard();
        
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                refreshed: true,
                status: tokenStatus
            },
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to refresh token',
            details: error.message
        });
    }
});

/**
 * POST /api/health/memory/gc - Force garbage collection
 */
router.post('/memory/gc', (req, res) => {
    try {
        if (!memoryMonitor) {
            return res.status(503).json({
                success: false,
                error: 'Memory monitor not initialized'
            });
        }
        
        const gcResult = memoryMonitor.forceGC();
        const memoryStatus = memoryMonitor.getMemoryStatusReport();
        
        res.json({
            success: true,
            message: 'Garbage collection attempted',
            data: {
                gc: gcResult,
                memory: memoryStatus.current
            },
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to force garbage collection',
            details: error.message
        });
    }
});

/**
 * GET /api/health/recommendations - Get health recommendations
 */
router.get('/recommendations', async (req, res) => {
    try {
        const recommendations = await getHealthRecommendations();
        res.json({
            success: true,
            data: recommendations,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get health recommendations',
            details: error.message
        });
    }
});

/**
 * Get comprehensive health dashboard data
 */
async function getComprehensiveHealthData() {
    const data = {
        system: {
            uptime: Math.floor((Date.now() - healthMetrics.startTime) / 1000),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            pid: process.pid
        },
        requests: {
            total: healthMetrics.requestCount,
            errors: healthMetrics.errorCount,
            errorRate: healthMetrics.requestCount > 0 ? 
                     Math.round((healthMetrics.errorCount / healthMetrics.requestCount) * 100) : 0
        },
        lastUpdate: Date.now()
    };
    
    // Add token status if available
    if (tokenManager) {
        data.token = tokenManager.getTokenStatusForDashboard();
    }
    
    // Add memory status if available
    if (memoryMonitor) {
        data.memory = memoryMonitor.getMemoryStatusReport();
    }
    
    // Add performance metrics
    data.performance = getPerformanceMetrics();
    
    // Add health recommendations
    data.recommendations = await getHealthRecommendations();
    
    return data;
}

/**
 * Get performance metrics
 */
function getPerformanceMetrics() {
    const recentResponses = healthMetrics.apiResponseTimes.slice(-20);
    
    let avgResponseTime = 0;
    let maxResponseTime = 0;
    let minResponseTime = Infinity;
    
    if (recentResponses.length > 0) {
        const times = recentResponses.map(r => r.responseTime);
        avgResponseTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        maxResponseTime = Math.max(...times);
        minResponseTime = Math.min(...times);
    }
    
    return {
        responseTime: {
            average: avgResponseTime,
            max: maxResponseTime,
            min: minResponseTime === Infinity ? 0 : minResponseTime,
            unit: 'ms'
        },
        requests: {
            recent: recentResponses.length,
            total: healthMetrics.requestCount,
            errors: healthMetrics.errorCount
        },
        cpu: process.cpuUsage(),
        loadAverage: process.platform !== 'win32' ? process.loadavg() : [0, 0, 0]
    };
}

/**
 * Get health recommendations based on current system state
 */
async function getHealthRecommendations() {
    const recommendations = [];
    
    try {
        // Token recommendations
        if (tokenManager) {
            const tokenStatus = tokenManager.getTokenStatusForDashboard();
            if (!tokenStatus.isValid) {
                recommendations.push({
                    type: 'token',
                    priority: 'high',
                    message: 'Token is expired or invalid - refresh required',
                    action: 'Refresh authentication token',
                    endpoint: '/api/health/token/refresh'
                });
            } else if (tokenStatus.timeToExpiry < 15 * 60 * 1000) { // 15 minutes
                recommendations.push({
                    type: 'token',
                    priority: 'medium',
                    message: 'Token expires soon - proactive renewal recommended',
                    action: 'Token will be automatically renewed',
                    timeToExpiry: Math.floor(tokenStatus.timeToExpiry / 1000) + 's'
                });
            }
        }
        
        // Memory recommendations
        if (memoryMonitor) {
            const memoryStatus = memoryMonitor.getMemoryStatusReport();
            if (memoryStatus.current.heapUsagePercent > 85) {
                recommendations.push({
                    type: 'memory',
                    priority: 'high',
                    message: `High memory usage: ${memoryStatus.current.heapUsagePercent}%`,
                    action: 'Consider running garbage collection',
                    endpoint: '/api/health/memory/gc'
                });
            }
            
            if (memoryStatus.trend.direction === 'increasing') {
                recommendations.push({
                    type: 'memory',
                    priority: 'medium',
                    message: 'Memory usage trending upward',
                    action: 'Monitor for potential memory leaks',
                    trend: memoryStatus.trend.value
                });
            }
        }
        
        // Performance recommendations
        const performance = getPerformanceMetrics();
        if (performance.responseTime.average > 1000) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: `Slow API responses: ${performance.responseTime.average}ms average`,
                action: 'Investigate performance bottlenecks'
            });
        }
        
        if (healthMetrics.errorCount > 0) {
            const errorRate = Math.round((healthMetrics.errorCount / healthMetrics.requestCount) * 100);
            if (errorRate > 5) {
                recommendations.push({
                    type: 'errors',
                    priority: 'high',
                    message: `High error rate: ${errorRate}%`,
                    action: 'Check logs for error patterns'
                });
            }
        }
        
    } catch (error) {
        recommendations.push({
            type: 'system',
            priority: 'low',
            message: 'Unable to generate some recommendations',
            action: 'Check system logs for details'
        });
    }
    
    return recommendations;
}

/**
 * Cleanup resources
 */
export function cleanup() {
    if (tokenManager) {
        tokenManager.destroy();
        tokenManager = null;
    }
    
    if (memoryMonitor) {
        memoryMonitor.destroy();
        memoryMonitor = null;
    }
}

export default router;
