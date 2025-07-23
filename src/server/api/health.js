/**
 * Health Check API Endpoint
 * 
 * Provides comprehensive health status for monitoring and debugging
 */

import express from 'express';
import { createLogger } from '../../shared/logging-service.js';
import { getFeatureFlagStatus } from '../../shared/feature-flags.js';
import os from 'os';

const router = express.Router();
const logger = createLogger({ serviceName: 'health-check' });

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Get application health status
 *     description: Returns comprehensive health information including subsystem status, feature flags, and performance metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 environment:
 *                   type: string
 *                 subsystems:
 *                   type: object
 *                 featureFlags:
 *                   type: object
 *                 performance:
 *                   type: object
 */
router.get('/', async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Basic health checks
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.APP_VERSION || '6.3.0',
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid
        };
        
        // Subsystem health checks
        health.subsystems = await checkSubsystemHealth();
        
        // Feature flag status
        health.featureFlags = getFeatureFlagStatus();
        
        // Performance metrics
        health.performance = {
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            responseTime: Date.now() - startTime
        };
        
        // Database connectivity (if applicable)
        health.database = await checkDatabaseHealth();
        
        // External service connectivity
        health.externalServices = await checkExternalServices();
        
        // Determine overall health status
        health.status = determineOverallHealth(health);
        
        // Log health check
        logger.debug('Health check completed', {
            status: health.status,
            responseTime: health.performance.responseTime,
            subsystemCount: Object.keys(health.subsystems).length
        });
        
        res.json(health);
        
    } catch (error) {
        logger.error('Health check failed', {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Check subsystem health
 */
async function checkSubsystemHealth() {
    const subsystems = {};
    
    try {
        // Check logging system
        subsystems.logging = {
            status: 'healthy',
            lastCheck: new Date().toISOString()
        };
        
        // Check file system access
        subsystems.filesystem = await checkFileSystemHealth();
        
        // Check API endpoints
        subsystems.api = await checkAPIHealth();
        
        return subsystems;
        
    } catch (error) {
        logger.error('Subsystem health check failed', { error: error.message });
        return {
            error: 'Subsystem health check failed',
            details: error.message
        };
    }
}

/**
 * Check file system health
 */
async function checkFileSystemHealth() {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        // Check logs directory
        const logsDir = path.join(process.cwd(), 'logs');
        await fs.access(logsDir);
        
        // Check data directory
        const dataDir = path.join(process.cwd(), 'data');
        await fs.access(dataDir);
        
        return {
            status: 'healthy',
            directories: ['logs', 'data'],
            lastCheck: new Date().toISOString()
        };
        
    } catch (error) {
        return {
            status: 'degraded',
            error: error.message,
            lastCheck: new Date().toISOString()
        };
    }
}

/**
 * Check API health
 */
async function checkAPIHealth() {
    try {
        // This would check internal API endpoints
        return {
            status: 'healthy',
            endpoints: ['logs', 'settings', 'health'],
            lastCheck: new Date().toISOString()
        };
        
    } catch (error) {
        return {
            status: 'degraded',
            error: error.message,
            lastCheck: new Date().toISOString()
        };
    }
}

/**
 * Check database health (if applicable)
 */
async function checkDatabaseHealth() {
    try {
        // For now, we don't have a database, so return N/A
        return {
            status: 'n/a',
            message: 'No database configured',
            lastCheck: new Date().toISOString()
        };
        
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            lastCheck: new Date().toISOString()
        };
    }
}

/**
 * Check external services
 */
async function checkExternalServices() {
    const services = {};
    
    try {
        // PingOne API connectivity would be checked here
        services.pingone = {
            status: 'unknown',
            message: 'Requires authentication to test',
            lastCheck: new Date().toISOString()
        };
        
        return services;
        
    } catch (error) {
        return {
            error: 'External service check failed',
            details: error.message
        };
    }
}

/**
 * Determine overall health status
 */
function determineOverallHealth(health) {
    // Check for any unhealthy subsystems
    const subsystemStatuses = Object.values(health.subsystems)
        .map(subsystem => subsystem.status)
        .filter(status => status);
    
    if (subsystemStatuses.includes('unhealthy')) {
        return 'unhealthy';
    }
    
    if (subsystemStatuses.includes('degraded')) {
        return 'degraded';
    }
    
    return 'healthy';
}

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Get detailed health information
 *     description: Returns comprehensive health information with detailed subsystem diagnostics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health status retrieved successfully
 */
router.get('/detailed', async (req, res) => {
    try {
        const health = await getDetailedHealthStatus();
        res.json(health);
        
    } catch (error) {
        logger.error('Detailed health check failed', { error: error.message });
        res.status(500).json({
            status: 'error',
            message: 'Detailed health check failed',
            error: error.message
        });
    }
});

/**
 * Get detailed health status
 */
async function getDetailedHealthStatus() {
    return {
        timestamp: new Date().toISOString(),
        server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            platform: process.platform,
            nodeVersion: process.version,
            pid: process.pid
        },
        application: {
            version: '6.3.0',
            environment: process.env.NODE_ENV || 'development',
            featureFlags: getFeatureFlagStatus()
        },
        subsystems: await checkSubsystemHealth(),
        logs: await getLogStatus(),
        performance: await getPerformanceMetrics()
    };
}

/**
 * Get log status
 */
async function getLogStatus() {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const logsDir = path.join(process.cwd(), 'logs');
        const logFiles = ['client.log', 'server.log', 'combined.log'];
        
        const status = {};
        
        for (const logFile of logFiles) {
            try {
                const filePath = path.join(logsDir, logFile);
                const stats = await fs.stat(filePath);
                status[logFile] = {
                    exists: true,
                    size: stats.size,
                    modified: stats.mtime
                };
            } catch (error) {
                status[logFile] = {
                    exists: false,
                    error: error.message
                };
            }
        }
        
        return status;
        
    } catch (error) {
        return {
            error: 'Failed to check log status',
            details: error.message
        };
    }
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics() {
    return {
        memory: {
            ...process.memoryUsage(),
            percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
        },
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        loadAverage: process.platform !== 'win32' ? os.loadavg() : 'N/A (Windows)'
    };
}

export default router;