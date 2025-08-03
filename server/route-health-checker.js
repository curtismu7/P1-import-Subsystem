/**
 * Route Health Checker
 * 
 * Provides comprehensive route registration validation and monitoring
 * to prevent route mounting issues and ensure all critical APIs are available.
 * 
 * @author PingOne Import Tool Team
 * @version 7.0.2.3
 */

import { serverLogger } from './winston-config.js';

/**
 * Critical routes that must be available for the application to function
 */
const CRITICAL_ROUTES = [
    '/api/health',
    '/api/logs',
    '/api/logs/ui',
    '/api/auth/status',
    '/api/auth/current-credentials',
    '/api/auth/refresh-token',
    '/api/settings',
    '/api/version',
    '/api/import',
    '/api/export',
    '/api/history',
    '/api/pingone',
    '/api/debug-log'
];

/**
 * Extract all registered routes from Express app
 * @param {Express} app - Express application instance
 * @returns {Array} Array of route information objects
 */
function extractRegisteredRoutes(app) {
    const routes = [];
    
    try {
        // Extract routes from the main router
        if (app._router && app._router.stack) {
            app._router.stack.forEach(layer => {
                if (layer.route) {
                    // Direct route
                    routes.push({
                        path: layer.route.path,
                        methods: Object.keys(layer.route.methods),
                        type: 'direct'
                    });
                } else if (layer.name === 'router' && layer.regexp) {
                    // Router middleware - extract base path from regexp
                    const basePath = extractBasePathFromRegexp(layer.regexp);
                    
                    // Extract sub-routes from the router
                    if (layer.handle && layer.handle.stack) {
                        layer.handle.stack.forEach(subLayer => {
                            if (subLayer.route) {
                                routes.push({
                                    path: basePath + subLayer.route.path,
                                    methods: Object.keys(subLayer.route.methods),
                                    type: 'router',
                                    basePath: basePath
                                });
                            }
                        });
                    }
                }
            });
        }
    } catch (error) {
        serverLogger.error('Error extracting routes:', error);
    }
    
    return routes;
}

/**
 * Extract base path from Express router regexp
 * @param {RegExp} regexp - Router regexp
 * @returns {string} Base path
 */
function extractBasePathFromRegexp(regexp) {
    const regexpStr = regexp.toString();
    
    // Common patterns for API routes
    if (regexpStr.includes('/api')) {
        if (regexpStr.includes('/api/auth')) return '/api/auth';
        if (regexpStr.includes('/api/logs')) return '/api/logs';
        if (regexpStr.includes('/api/settings')) return '/api/settings';
        if (regexpStr.includes('/api/import')) return '/api/import';
        if (regexpStr.includes('/api/export')) return '/api/export';
        if (regexpStr.includes('/api/history')) return '/api/history';
        if (regexpStr.includes('/api/pingone')) return '/api/pingone';
        if (regexpStr.includes('/api/debug-log')) return '/api/debug-log';
        if (regexpStr.includes('/api/version')) return '/api/version';
        if (regexpStr.includes('/api')) return '/api';
    }
    
    return '';
}

/**
 * Validate that all critical routes are registered
 * @param {Array} registeredRoutes - Array of registered route objects
 * @returns {Object} Validation results
 */
function validateCriticalRoutes(registeredRoutes) {
    const registeredPaths = registeredRoutes.map(route => route.path);
    const missingRoutes = [];
    const foundRoutes = [];
    
    CRITICAL_ROUTES.forEach(criticalRoute => {
        const isRegistered = registeredPaths.some(path => 
            path === criticalRoute || 
            path.startsWith(criticalRoute) ||
            criticalRoute.startsWith(path)
        );
        
        if (isRegistered) {
            foundRoutes.push(criticalRoute);
        } else {
            missingRoutes.push(criticalRoute);
        }
    });
    
    return {
        success: missingRoutes.length === 0,
        totalCritical: CRITICAL_ROUTES.length,
        foundCount: foundRoutes.length,
        missingCount: missingRoutes.length,
        foundRoutes,
        missingRoutes,
        allRegisteredRoutes: registeredPaths
    };
}

/**
 * Perform comprehensive route health check
 * @param {Express} app - Express application instance
 * @returns {Object} Health check results
 */
export function performRouteHealthCheck(app) {
    const startTime = Date.now();
    
    serverLogger.info('🔍 Starting Route Health Check...');
    
    try {
        // Extract all registered routes
        const registeredRoutes = extractRegisteredRoutes(app);
        
        // Validate critical routes
        const validation = validateCriticalRoutes(registeredRoutes);
        
        const duration = Date.now() - startTime;
        
        // Log results
        if (validation.success) {
            serverLogger.info('✅ Route Health Check PASSED', {
                duration: `${duration}ms`,
                totalRoutes: registeredRoutes.length,
                criticalRoutes: validation.foundCount,
                status: 'healthy'
            });
        } else {
            serverLogger.error('❌ Route Health Check FAILED', {
                duration: `${duration}ms`,
                totalRoutes: registeredRoutes.length,
                criticalFound: validation.foundCount,
                criticalMissing: validation.missingCount,
                missingRoutes: validation.missingRoutes,
                status: 'unhealthy'
            });
            
            // Write to stderr for immediate attention
            console.error('🚨 CRITICAL ROUTE HEALTH CHECK FAILURE:');
            console.error('Missing critical routes:', validation.missingRoutes);
        }
        
        // Log all registered routes for debugging
        serverLogger.debug('📋 All Registered Routes:', {
            routes: registeredRoutes.map(r => `${r.methods.join(',')} ${r.path}`),
            count: registeredRoutes.length
        });
        
        return {
            success: validation.success,
            duration,
            routes: registeredRoutes,
            validation,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        const duration = Date.now() - startTime;
        
        serverLogger.error('💥 Route Health Check ERROR:', {
            error: error.message,
            stack: error.stack,
            duration: `${duration}ms`,
            status: 'error'
        });
        
        console.error('🚨 ROUTE HEALTH CHECK SYSTEM ERROR:', error.message);
        
        return {
            success: false,
            error: error.message,
            duration,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Continuous route monitoring (for production)
 * @param {Express} app - Express application instance
 * @param {number} intervalMs - Check interval in milliseconds (default: 5 minutes)
 */
export function startRouteMonitoring(app, intervalMs = 5 * 60 * 1000) {
    serverLogger.info('🔄 Starting continuous route monitoring', {
        interval: `${intervalMs / 1000}s`
    });
    
    const monitoringInterval = setInterval(() => {
        const result = performRouteHealthCheck(app);
        
        if (!result.success) {
            serverLogger.error('🚨 Route monitoring detected issues:', result);
            
            // Could integrate with alerting system here
            // e.g., send to monitoring service, email, Slack, etc.
        }
    }, intervalMs);
    
    // Cleanup function
    return () => {
        clearInterval(monitoringInterval);
        serverLogger.info('🛑 Route monitoring stopped');
    };
}

/**
 * Generate route health report for debugging
 * @param {Express} app - Express application instance
 * @returns {string} Formatted report
 */
export function generateRouteHealthReport(app) {
    const result = performRouteHealthCheck(app);
    
    let report = '\n' + '='.repeat(60) + '\n';
    report += '📊 ROUTE HEALTH CHECK REPORT\n';
    report += '='.repeat(60) + '\n';
    report += `Timestamp: ${result.timestamp}\n`;
    report += `Duration: ${result.duration}ms\n`;
    report += `Status: ${result.success ? '✅ HEALTHY' : '❌ UNHEALTHY'}\n\n`;
    
    if (result.validation) {
        report += `Critical Routes: ${result.validation.foundCount}/${result.validation.totalCritical} found\n\n`;
        
        if (result.validation.foundRoutes.length > 0) {
            report += '✅ FOUND CRITICAL ROUTES:\n';
            result.validation.foundRoutes.forEach(route => {
                report += `  • ${route}\n`;
            });
            report += '\n';
        }
        
        if (result.validation.missingRoutes.length > 0) {
            report += '❌ MISSING CRITICAL ROUTES:\n';
            result.validation.missingRoutes.forEach(route => {
                report += `  • ${route}\n`;
            });
            report += '\n';
        }
    }
    
    if (result.routes) {
        report += `📋 ALL REGISTERED ROUTES (${result.routes.length}):\n`;
        result.routes.forEach(route => {
            report += `  ${route.methods.join(',').padEnd(8)} ${route.path}\n`;
        });
    }
    
    report += '='.repeat(60) + '\n';
    
    return report;
}

export default {
    performRouteHealthCheck,
    startRouteMonitoring,
    generateRouteHealthReport,
    CRITICAL_ROUTES
};
