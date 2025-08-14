// Performance Monitoring Middleware v7.3.0
// Tracks request/response times, API performance metrics, and identifies bottlenecks

const winston = require('winston');

class PerformanceMonitor {
    constructor(options = {}) {
        this.options = {
            enableLogging: options.enableLogging !== false,
            slowRequestThreshold: options.slowRequestThreshold || 1000, // 1 second
            enableMetrics: options.enableMetrics !== false,
            sampleRate: options.sampleRate || 1.0, // 100% sampling by default
            ...options
        };

        // Performance metrics storage
        this.metrics = {
            requests: new Map(), // Active requests
            completed: [], // Completed requests (last 1000)
            endpoints: new Map(), // Endpoint-specific metrics
            errors: [], // Error tracking
            slowRequests: [] // Slow request tracking
        };

        // Initialize logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: 'logs/performance.log',
                    maxsize: 10485760, // 10MB
                    maxFiles: 5
                })
            ]
        });

        console.log('🚀 Performance Monitor initialized');
    }

    // Express middleware
    middleware() {
        return (req, res, next) => {
            // Skip monitoring for certain routes if needed
            if (this.shouldSkipRequest(req)) {
                return next();
            }

            // Sample requests based on sample rate
            if (Math.random() > this.options.sampleRate) {
                return next();
            }

            const startTime = Date.now();
            const requestId = this.generateRequestId();
            
            // Store request start info
            const requestInfo = {
                id: requestId,
                method: req.method,
                url: req.url,
                path: req.path,
                userAgent: req.get('User-Agent'),
                ip: req.ip || req.connection.remoteAddress,
                startTime,
                timestamp: new Date().toISOString()
            };

            this.metrics.requests.set(requestId, requestInfo);

            // Override res.end to capture response metrics
            const originalEnd = res.end;
            res.end = (...args) => {
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // Complete request info
                const completedRequest = {
                    ...requestInfo,
                    endTime,
                    duration,
                    statusCode: res.statusCode,
                    contentLength: res.get('Content-Length') || 0
                };

                // Process completed request
                this.processCompletedRequest(completedRequest);

                // Remove from active requests
                this.metrics.requests.delete(requestId);

                // Call original end
                originalEnd.apply(res, args);
            };

            next();
        };
    }

    // Process completed request
    processCompletedRequest(request) {
        try {
            // Add to completed requests (keep last 1000)
            this.metrics.completed.push(request);
            if (this.metrics.completed.length > 1000) {
                this.metrics.completed.shift();
            }

            // Update endpoint metrics
            this.updateEndpointMetrics(request);

            // Check for slow requests
            if (request.duration > this.options.slowRequestThreshold) {
                this.handleSlowRequest(request);
            }

            // Check for errors
            if (request.statusCode >= 400) {
                this.handleErrorRequest(request);
            }

            // Log performance data
            if (this.options.enableLogging) {
                this.logRequest(request);
            }

        } catch (error) {
            console.error('❌ Error processing completed request:', error);
        }
    }

    // Update endpoint-specific metrics
    updateEndpointMetrics(request) {
        const endpoint = `${request.method} ${request.path}`;
        
        if (!this.metrics.endpoints.has(endpoint)) {
            this.metrics.endpoints.set(endpoint, {
                count: 0,
                totalDuration: 0,
                minDuration: Infinity,
                maxDuration: 0,
                avgDuration: 0,
                errors: 0,
                lastAccessed: null,
                statusCodes: new Map()
            });
        }

        const endpointMetrics = this.metrics.endpoints.get(endpoint);
        endpointMetrics.count++;
        endpointMetrics.totalDuration += request.duration;
        endpointMetrics.minDuration = Math.min(endpointMetrics.minDuration, request.duration);
        endpointMetrics.maxDuration = Math.max(endpointMetrics.maxDuration, request.duration);
        endpointMetrics.avgDuration = endpointMetrics.totalDuration / endpointMetrics.count;
        endpointMetrics.lastAccessed = request.timestamp;

        if (request.statusCode >= 400) {
            endpointMetrics.errors++;
        }

        // Track status codes
        const statusCode = request.statusCode.toString();
        endpointMetrics.statusCodes.set(statusCode, 
            (endpointMetrics.statusCodes.get(statusCode) || 0) + 1
        );
    }

    // Handle slow requests
    handleSlowRequest(request) {
        this.metrics.slowRequests.push({
            ...request,
            type: 'slow_request'
        });

        // Keep only last 100 slow requests
        if (this.metrics.slowRequests.length > 100) {
            this.metrics.slowRequests.shift();
        }

        console.warn(`🐌 Slow request detected: ${request.method} ${request.path} took ${request.duration}ms`);
    }

    // Handle error requests
    handleErrorRequest(request) {
        this.metrics.errors.push({
            ...request,
            type: 'error_request'
        });

        // Keep only last 100 errors
        if (this.metrics.errors.length > 100) {
            this.metrics.errors.shift();
        }
    }

    // Log request performance
    logRequest(request) {
        const logLevel = request.statusCode >= 400 ? 'warn' : 
                        request.duration > this.options.slowRequestThreshold ? 'warn' : 'info';

        this.logger.log(logLevel, 'Request completed', {
            method: request.method,
            path: request.path,
            statusCode: request.statusCode,
            duration: request.duration,
            contentLength: request.contentLength,
            userAgent: request.userAgent,
            ip: request.ip,
            timestamp: request.timestamp
        });
    }

    // Get performance metrics summary
    getMetrics() {
        const now = Date.now();
        const recentRequests = this.metrics.completed.filter(
            req => (now - new Date(req.timestamp).getTime()) < 300000 // Last 5 minutes
        );

        return {
            summary: {
                activeRequests: this.metrics.requests.size,
                totalCompleted: this.metrics.completed.length,
                recentRequests: recentRequests.length,
                slowRequests: this.metrics.slowRequests.length,
                errors: this.metrics.errors.length
            },
            performance: {
                avgResponseTime: recentRequests.length > 0 ? 
                    recentRequests.reduce((sum, req) => sum + req.duration, 0) / recentRequests.length : 0,
                minResponseTime: recentRequests.length > 0 ? 
                    Math.min(...recentRequests.map(req => req.duration)) : 0,
                maxResponseTime: recentRequests.length > 0 ? 
                    Math.max(...recentRequests.map(req => req.duration)) : 0
            },
            endpoints: Array.from(this.metrics.endpoints.entries()).map(([endpoint, metrics]) => ({
                endpoint,
                ...metrics,
                statusCodes: Object.fromEntries(metrics.statusCodes)
            })),
            recentSlowRequests: this.metrics.slowRequests.slice(-10),
            recentErrors: this.metrics.errors.slice(-10)
        };
    }

    // Get real-time performance data
    getRealTimeMetrics() {
        return {
            activeRequests: Array.from(this.metrics.requests.values()),
            timestamp: new Date().toISOString()
        };
    }

    // Helper methods
    shouldSkipRequest(req) {
        // Skip static assets, health checks, etc.
        const skipPaths = ['/favicon.ico', '/ping', '/health-check'];
        const skipExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'];
        
        return skipPaths.some(path => req.path === path) ||
               skipExtensions.some(ext => req.path.endsWith(ext));
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Reset metrics (for testing/maintenance)
    resetMetrics() {
        this.metrics.completed = [];
        this.metrics.endpoints.clear();
        this.metrics.errors = [];
        this.metrics.slowRequests = [];
        console.log('📊 Performance metrics reset');
    }
}

module.exports = { PerformanceMonitor };
