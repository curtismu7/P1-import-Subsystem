/**
 * Bulletproof Export API Routes
 * 
 * Enhanced version of the export API with circuit breaker pattern,
 * comprehensive validation, chunking for large exports, and robust error handling.
 * 
 * @version 6.5.2.4
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import CircuitBreakerRegistry from '../../server/circuit-breaker.js';
import { safeHandler, validateObject } from '../../server/defensive.js';
import { createWinstonLogger } from '../../server/winston-config.js';

const router = express.Router();

// Create specialized logger for export operations
const exportLogger = createWinstonLogger({
    service: 'export-api',
    env: process.env.NODE_ENV || 'development',
    enableFileLogging: process.env.NODE_ENV !== 'test'
});

// Get or create circuit breaker for export operations
const exportCircuitBreaker = CircuitBreakerRegistry.getOrCreate('export-api', {
    failureThreshold: 3,
    resetTimeout: 30000, // 30 seconds
    timeout: 60000, // 60 seconds
    fallbackFn: (req) => {
        return {
            success: false,
            error: 'Export service temporarily unavailable',
            status: 'service_unavailable',
            retryAfter: 30
        };
    }
});

// In-memory storage for export status (in production, use database)
let exportStatus = {
    isRunning: false,
    progress: 0,
    total: 0,
    processed: 0,
    errors: 0,
    warnings: 0,
    startTime: null,
    endTime: null,
    currentPopulation: null,
    sessionId: null,
    status: 'idle', // idle, running, completed, failed, cancelled
    outputFile: null,
    downloadUrl: null,
    chunks: {
        total: 0,
        processed: 0,
        size: 1000 // Default chunk size
    }
};

// Validation schema for export parameters
const exportSchema = {
    sessionId: { type: 'string', required: false },
    totalRecords: { type: 'number', min: 0, required: false },
    populationId: { type: 'string', required: true },
    populationName: { type: 'string', required: false },
    outputFileName: { type: 'string', required: false },
    format: { enum: ['csv', 'json', 'xlsx'], required: false },
    options: { type: 'object', required: false }
};

/**
 * GET /api/export/status
 * Get current export operation status
 */
router.get('/status', safeHandler(async (req, res) => {
    // Use circuit breaker to protect against cascading failures
    const response = await exportCircuitBreaker.execute(async () => {
        const response = {
            success: true,
            status: exportStatus.status,
            isRunning: exportStatus.isRunning,
            progress: {
                current: exportStatus.processed,
                total: exportStatus.total,
                percentage: exportStatus.total > 0 ? Math.round((exportStatus.processed / exportStatus.total) * 100) : 0,
                chunks: {
                    processed: exportStatus.chunks.processed,
                    total: exportStatus.chunks.total,
                    size: exportStatus.chunks.size
                }
            },
            statistics: {
                processed: exportStatus.processed,
                errors: exportStatus.errors,
                warnings: exportStatus.warnings
            },
            timing: {
                startTime: exportStatus.startTime,
                endTime: exportStatus.endTime,
                duration: exportStatus.startTime && exportStatus.endTime 
                    ? exportStatus.endTime - exportStatus.startTime 
                    : exportStatus.startTime 
                        ? Date.now() - exportStatus.startTime 
                        : null
            },
            currentPopulation: exportStatus.currentPopulation,
            sessionId: exportStatus.sessionId,
            outputFile: exportStatus.outputFile,
            downloadUrl: exportStatus.downloadUrl
        };

        return response;
    });

    res.json(response);
}));

/**
 * POST /api/export/start
 * Start a new export operation
 */
router.post('/start', [
    // Input validation using express-validator
    body('populationId').notEmpty().withMessage('Population ID is required'),
    body('totalRecords').optional().isInt({ min: 0 }).withMessage('Total records must be a positive integer'),
    body('format').optional().isIn(['csv', 'json', 'xlsx']).withMessage('Invalid format')
], safeHandler(async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    // Additional validation using schema
    const validation = validateObject(req.body, exportSchema);
    if (!validation.valid) {
        return res.status(400).json({
            success: false,
            errors: validation.errors
        });
    }

    // Check if export is already running
    if (exportStatus.isRunning) {
        return res.status(409).json({
            success: false,
            error: 'Export operation already running',
            sessionId: exportStatus.sessionId
        });
    }

    // Use circuit breaker to protect against cascading failures
    const response = await exportCircuitBreaker.execute(async () => {
        const { sessionId, totalRecords, populationId, populationName, outputFileName, format, options } = req.body;

        // Calculate optimal chunk size based on total records
        const chunkSize = calculateOptimalChunkSize(totalRecords);
        const totalChunks = Math.ceil(totalRecords / chunkSize);

        exportStatus = {
            isRunning: true,
            progress: 0,
            total: totalRecords || 0,
            processed: 0,
            errors: 0,
            warnings: 0,
            startTime: Date.now(),
            endTime: null,
            currentPopulation: populationName || populationId || null,
            sessionId: sessionId || `export_${Date.now()}`,
            status: 'running',
            outputFile: outputFileName || null,
            downloadUrl: null,
            format: format || 'csv',
            options: options || {},
            chunks: {
                total: totalChunks,
                processed: 0,
                size: chunkSize
            }
        };

        exportLogger.info('Export operation started', {
            sessionId: exportStatus.sessionId,
            populationId,
            totalRecords,
            format: exportStatus.format,
            chunkSize,
            totalChunks
        });

        return {
            success: true,
            message: 'Export operation started',
            sessionId: exportStatus.sessionId,
            status: exportStatus.status,
            chunks: {
                size: chunkSize,
                total: totalChunks
            }
        };
    });

    res.json(response);
}));

/**
 * POST /api/export/progress
 * Update export progress
 */
router.post('/progress', [
    body('processed').optional().isInt({ min: 0 }).withMessage('Processed count must be a positive integer'),
    body('errors').optional().isInt({ min: 0 }).withMessage('Error count must be a positive integer'),
    body('warnings').optional().isInt({ min: 0 }).withMessage('Warning count must be a positive integer'),
    body('chunkIndex').optional().isInt({ min: 0 }).withMessage('Chunk index must be a positive integer')
], safeHandler(async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    // Check if export is running
    if (!exportStatus.isRunning) {
        return res.status(400).json({
            success: false,
            error: 'No export operation running'
        });
    }

    // Use circuit breaker to protect against cascading failures
    const response = await exportCircuitBreaker.execute(async () => {
        const { processed, errors, warnings, currentPopulation, chunkIndex } = req.body;

        if (typeof processed === 'number') exportStatus.processed = processed;
        if (typeof errors === 'number') exportStatus.errors = errors;
        if (typeof warnings === 'number') exportStatus.warnings = warnings;
        if (currentPopulation) exportStatus.currentPopulation = currentPopulation;
        
        // Update chunk processing if provided
        if (typeof chunkIndex === 'number') {
            exportStatus.chunks.processed = chunkIndex + 1;
            
            // Log progress for large exports
            if (exportStatus.chunks.total > 10 && exportStatus.chunks.processed % 5 === 0) {
                exportLogger.info('Export progress update', {
                    sessionId: exportStatus.sessionId,
                    chunksProcessed: exportStatus.chunks.processed,
                    totalChunks: exportStatus.chunks.total,
                    percentComplete: Math.round((exportStatus.chunks.processed / exportStatus.chunks.total) * 100)
                });
            }
        }

        return {
            success: true,
            message: 'Progress updated',
            status: exportStatus.status,
            progress: {
                current: exportStatus.processed,
                total: exportStatus.total,
                percentage: exportStatus.total > 0 ? Math.round((exportStatus.processed / exportStatus.total) * 100) : 0,
                chunks: {
                    processed: exportStatus.chunks.processed,
                    total: exportStatus.chunks.total
                }
            }
        };
    });

    res.json(response);
}));

/**
 * POST /api/export/complete
 * Mark export operation as completed
 */
router.post('/complete', safeHandler(async (req, res) => {
    // Use circuit breaker to protect against cascading failures
    const response = await exportCircuitBreaker.execute(async () => {
        const { success: operationSuccess, finalStats, outputFile, downloadUrl } = req.body;

        exportStatus.isRunning = false;
        exportStatus.endTime = Date.now();
        exportStatus.status = operationSuccess ? 'completed' : 'failed';

        if (finalStats) {
            exportStatus.processed = finalStats.processed || exportStatus.processed;
            exportStatus.errors = finalStats.errors || exportStatus.errors;
            exportStatus.warnings = finalStats.warnings || exportStatus.warnings;
            
            if (finalStats.chunks) {
                exportStatus.chunks.processed = finalStats.chunks.processed || exportStatus.chunks.processed;
            }
        }

        if (outputFile) exportStatus.outputFile = outputFile;
        if (downloadUrl) exportStatus.downloadUrl = downloadUrl;

        const duration = exportStatus.endTime - exportStatus.startTime;
        
        exportLogger.info(`Export operation ${exportStatus.status}`, {
            sessionId: exportStatus.sessionId,
            duration: duration,
            processed: exportStatus.processed,
            errors: exportStatus.errors,
            warnings: exportStatus.warnings,
            outputFile: exportStatus.outputFile
        });

        return {
            success: true,
            message: `Export operation ${exportStatus.status}`,
            status: exportStatus.status,
            finalStats: {
                processed: exportStatus.processed,
                errors: exportStatus.errors,
                warnings: exportStatus.warnings,
                duration: duration,
                chunks: {
                    processed: exportStatus.chunks.processed,
                    total: exportStatus.chunks.total
                }
            },
            outputFile: exportStatus.outputFile,
            downloadUrl: exportStatus.downloadUrl
        };
    });

    res.json(response);
}));

/**
 * POST /api/export/cancel
 * Cancel running export operation
 */
router.post('/cancel', safeHandler(async (req, res) => {
    // Check if export is running
    if (!exportStatus.isRunning) {
        return res.status(400).json({
            success: false,
            error: 'No export operation running'
        });
    }

    // Use circuit breaker to protect against cascading failures
    const response = await exportCircuitBreaker.execute(async () => {
        exportStatus.isRunning = false;
        exportStatus.endTime = Date.now();
        exportStatus.status = 'cancelled';

        exportLogger.info('Export operation cancelled', {
            sessionId: exportStatus.sessionId,
            duration: exportStatus.endTime - exportStatus.startTime,
            processed: exportStatus.processed
        });

        return {
            success: true,
            message: 'Export operation cancelled',
            status: exportStatus.status
        };
    });

    res.json(response);
}));

/**
 * DELETE /api/export/reset
 * Reset export status
 */
router.delete('/reset', safeHandler(async (req, res) => {
    // Use circuit breaker to protect against cascading failures
    const response = await exportCircuitBreaker.execute(async () => {
        exportStatus = {
            isRunning: false,
            progress: 0,
            total: 0,
            processed: 0,
            errors: 0,
            warnings: 0,
            startTime: null,
            endTime: null,
            currentPopulation: null,
            sessionId: null,
            status: 'idle',
            outputFile: null,
            downloadUrl: null,
            chunks: {
                total: 0,
                processed: 0,
                size: 1000
            }
        };

        exportLogger.info('Export status reset');

        return {
            success: true,
            message: 'Export status reset',
            status: exportStatus.status
        };
    });

    res.json(response);
}));

/**
 * GET /api/export/health
 * Get health status of the export service
 */
router.get('/health', safeHandler(async (req, res) => {
    const circuitBreakerState = exportCircuitBreaker.getState();
    
    res.json({
        status: circuitBreakerState.state === 'CLOSED' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        circuitBreaker: {
            state: circuitBreakerState.state,
            failureCount: circuitBreakerState.failureCount,
            lastFailureTime: circuitBreakerState.lastFailureTime,
            totalCalls: circuitBreakerState.totalCalls,
            totalFailures: circuitBreakerState.totalFailures
        },
        exportService: {
            status: exportStatus.isRunning ? 'busy' : 'available',
            currentSession: exportStatus.sessionId,
            activeExport: exportStatus.isRunning ? {
                population: exportStatus.currentPopulation,
                progress: exportStatus.total > 0 ? Math.round((exportStatus.processed / exportStatus.total) * 100) : 0,
                startTime: exportStatus.startTime
            } : null
        }
    });
}));

/**
 * Calculate optimal chunk size based on total records
 * @param {number} totalRecords - Total number of records to export
 * @returns {number} - Optimal chunk size
 */
function calculateOptimalChunkSize(totalRecords) {
    if (!totalRecords || totalRecords <= 0) return 1000; // Default
    
    if (totalRecords < 1000) return 100;
    if (totalRecords < 10000) return 500;
    if (totalRecords < 50000) return 1000;
    if (totalRecords < 100000) return 2000;
    if (totalRecords < 500000) return 5000;
    
    return 10000; // For very large exports
}

export default router;
