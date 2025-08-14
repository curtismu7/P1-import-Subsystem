// Performance Monitoring API Routes v7.3.0
// Provides endpoints for accessing performance metrics and real-time monitoring data

const express = require('express');
const router = express.Router();

class PerformanceMonitorAPI {
    constructor(performanceMonitor) {
        this.performanceMonitor = performanceMonitor;
        this.setupRoutes();
    }

    setupRoutes() {
        // Get comprehensive performance metrics
        router.get('/metrics', (req, res) => {
            try {
                const metrics = this.performanceMonitor.getMetrics();
                res.json({
                    success: true,
                    data: metrics,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Error getting performance metrics:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve performance metrics',
                    details: error.message
                });
            }
        });

        // Get real-time performance data
        router.get('/realtime', (req, res) => {
            try {
                const realTimeMetrics = this.performanceMonitor.getRealTimeMetrics();
                res.json({
                    success: true,
                    data: realTimeMetrics,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Error getting real-time metrics:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve real-time metrics',
                    details: error.message
                });
            }
        });

        // Get endpoint-specific performance data
        router.get('/endpoints', (req, res) => {
            try {
                const metrics = this.performanceMonitor.getMetrics();
                const endpointData = metrics.endpoints.map(endpoint => ({
                    ...endpoint,
                    errorRate: endpoint.count > 0 ? (endpoint.errors / endpoint.count * 100).toFixed(2) : 0,
                    requestsPerMinute: this.calculateRequestsPerMinute(endpoint),
                    performanceGrade: this.getPerformanceGrade(endpoint.avgDuration)
                }));

                res.json({
                    success: true,
                    data: {
                        endpoints: endpointData,
                        summary: {
                            totalEndpoints: endpointData.length,
                            averageResponseTime: this.calculateOverallAverage(endpointData),
                            slowestEndpoint: this.findSlowestEndpoint(endpointData),
                            fastestEndpoint: this.findFastestEndpoint(endpointData)
                        }
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Error getting endpoint metrics:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve endpoint metrics',
                    details: error.message
                });
            }
        });

        // Get slow requests analysis
        router.get('/slow-requests', (req, res) => {
            try {
                const metrics = this.performanceMonitor.getMetrics();
                const slowRequests = metrics.recentSlowRequests.map(request => ({
                    ...request,
                    durationFormatted: this.formatDuration(request.duration),
                    timeAgo: this.getTimeAgo(request.timestamp)
                }));

                res.json({
                    success: true,
                    data: {
                        slowRequests,
                        summary: {
                            totalSlowRequests: metrics.slowRequests.length,
                            averageSlowDuration: this.calculateAverageSlowDuration(slowRequests),
                            slowestRequest: this.findSlowestRequest(slowRequests)
                        }
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Error getting slow requests:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve slow requests',
                    details: error.message
                });
            }
        });

        // Get error analysis
        router.get('/errors', (req, res) => {
            try {
                const metrics = this.performanceMonitor.getMetrics();
                const errorAnalysis = this.analyzeErrors(metrics.recentErrors);

                res.json({
                    success: true,
                    data: {
                        errors: metrics.recentErrors,
                        analysis: errorAnalysis
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Error getting error analysis:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to retrieve error analysis',
                    details: error.message
                });
            }
        });

        // Reset performance metrics (admin only)
        router.post('/reset', (req, res) => {
            try {
                this.performanceMonitor.resetMetrics();
                res.json({
                    success: true,
                    message: 'Performance metrics reset successfully',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Error resetting metrics:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to reset metrics',
                    details: error.message
                });
            }
        });

        // Get performance recommendations
        router.get('/recommendations', (req, res) => {
            try {
                const metrics = this.performanceMonitor.getMetrics();
                const recommendations = this.generateRecommendations(metrics);

                res.json({
                    success: true,
                    data: {
                        recommendations,
                        priority: this.prioritizeRecommendations(recommendations)
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Error generating recommendations:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to generate recommendations',
                    details: error.message
                });
            }
        });
    }

    // Helper methods for data analysis
    calculateRequestsPerMinute(endpoint) {
        if (!endpoint.lastAccessed) return 0;
        const lastAccessTime = new Date(endpoint.lastAccessed).getTime();
        const now = Date.now();
        const minutesAgo = (now - lastAccessTime) / (1000 * 60);
        return minutesAgo > 0 ? (endpoint.count / minutesAgo).toFixed(2) : 0;
    }

    getPerformanceGrade(avgDuration) {
        if (avgDuration < 100) return 'A';
        if (avgDuration < 300) return 'B';
        if (avgDuration < 500) return 'C';
        if (avgDuration < 1000) return 'D';
        return 'F';
    }

    calculateOverallAverage(endpoints) {
        if (endpoints.length === 0) return 0;
        const total = endpoints.reduce((sum, ep) => sum + ep.avgDuration, 0);
        return (total / endpoints.length).toFixed(2);
    }

    findSlowestEndpoint(endpoints) {
        return endpoints.reduce((slowest, current) => 
            current.avgDuration > (slowest?.avgDuration || 0) ? current : slowest, null);
    }

    findFastestEndpoint(endpoints) {
        return endpoints.reduce((fastest, current) => 
            current.avgDuration < (fastest?.avgDuration || Infinity) ? current : fastest, null);
    }

    calculateAverageSlowDuration(slowRequests) {
        if (slowRequests.length === 0) return 0;
        const total = slowRequests.reduce((sum, req) => sum + req.duration, 0);
        return (total / slowRequests.length).toFixed(2);
    }

    findSlowestRequest(slowRequests) {
        return slowRequests.reduce((slowest, current) => 
            current.duration > (slowest?.duration || 0) ? current : slowest, null);
    }

    analyzeErrors(errors) {
        const statusCodeCounts = {};
        const pathCounts = {};
        const methodCounts = {};

        errors.forEach(error => {
            statusCodeCounts[error.statusCode] = (statusCodeCounts[error.statusCode] || 0) + 1;
            pathCounts[error.path] = (pathCounts[error.path] || 0) + 1;
            methodCounts[error.method] = (methodCounts[error.method] || 0) + 1;
        });

        return {
            totalErrors: errors.length,
            statusCodeDistribution: statusCodeCounts,
            mostErrorPronePaths: Object.entries(pathCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5),
            methodDistribution: methodCounts
        };
    }

    generateRecommendations(metrics) {
        const recommendations = [];

        // Check for slow endpoints
        metrics.endpoints.forEach(endpoint => {
            if (endpoint.avgDuration > 1000) {
                recommendations.push({
                    type: 'performance',
                    severity: 'high',
                    title: `Slow Endpoint: ${endpoint.endpoint}`,
                    description: `Average response time is ${endpoint.avgDuration.toFixed(2)}ms`,
                    suggestion: 'Consider optimizing database queries, adding caching, or reviewing business logic'
                });
            }
        });

        // Check error rates
        metrics.endpoints.forEach(endpoint => {
            const errorRate = endpoint.count > 0 ? (endpoint.errors / endpoint.count * 100) : 0;
            if (errorRate > 5) {
                recommendations.push({
                    type: 'reliability',
                    severity: 'medium',
                    title: `High Error Rate: ${endpoint.endpoint}`,
                    description: `Error rate is ${errorRate.toFixed(2)}%`,
                    suggestion: 'Review error logs and implement better error handling'
                });
            }
        });

        // Check for memory or resource issues
        if (metrics.summary.slowRequests > 10) {
            recommendations.push({
                type: 'resource',
                severity: 'medium',
                title: 'Multiple Slow Requests Detected',
                description: `${metrics.summary.slowRequests} slow requests in recent history`,
                suggestion: 'Monitor server resources and consider scaling or optimization'
            });
        }

        return recommendations;
    }

    prioritizeRecommendations(recommendations) {
        const priority = { high: [], medium: [], low: [] };
        recommendations.forEach(rec => {
            priority[rec.severity].push(rec);
        });
        return priority;
    }

    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const time = new Date(timestamp).getTime();
        const diff = now - time;
        
        if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        return `${Math.floor(diff / 3600000)}h ago`;
    }

    getRouter() {
        return router;
    }
}

module.exports = { PerformanceMonitorAPI };
