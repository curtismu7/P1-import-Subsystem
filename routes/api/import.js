/**
 * Import API Routes
 * 
 * Provides endpoints for import operations and status monitoring.
 * These endpoints support the ImportSubsystem and related UI components.
 */

import express from 'express';
const router = express.Router();

// In-memory storage for import status (in production, use database)
let importStatus = {
    isRunning: false,
    progress: 0,
    total: 0,
    processed: 0,
    errors: 0,
    warnings: 0,
    startTime: null,
    endTime: null,
    currentFile: null,
    sessionId: null,
    status: 'idle' // idle, running, completed, failed, cancelled
};

/**
 * GET /api/import/status
 * Get current import operation status
 */
router.get('/status', (req, res) => {
    try {
        const response = {
            success: true,
            status: importStatus.status,
            isRunning: importStatus.isRunning,
            progress: {
                current: importStatus.processed,
                total: importStatus.total,
                percentage: importStatus.total > 0 ? Math.round((importStatus.processed / importStatus.total) * 100) : 0
            },
            statistics: {
                processed: importStatus.processed,
                errors: importStatus.errors,
                warnings: importStatus.warnings
            },
            timing: {
                startTime: importStatus.startTime,
                endTime: importStatus.endTime,
                duration: importStatus.startTime && importStatus.endTime 
                    ? importStatus.endTime - importStatus.startTime 
                    : importStatus.startTime 
                        ? Date.now() - importStatus.startTime 
                        : null
            },
            currentFile: importStatus.currentFile,
            sessionId: importStatus.sessionId
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get import status',
            details: error.message
        });
    }
});

/**
 * POST /api/import/start
 * Start a new import operation
 */
router.post('/start', express.json(), (req, res) => {
    try {
        if (importStatus.isRunning) {
            return res.status(409).json({
                success: false,
                error: 'Import operation already running',
                sessionId: importStatus.sessionId
            });
        }

        const { sessionId, totalRecords, fileName } = req.body;

        importStatus = {
            isRunning: true,
            progress: 0,
            total: totalRecords || 0,
            processed: 0,
            errors: 0,
            warnings: 0,
            startTime: Date.now(),
            endTime: null,
            currentFile: fileName || null,
            sessionId: sessionId || `import_${Date.now()}`,
            status: 'running'
        };

        res.json({
            success: true,
            message: 'Import operation started',
            sessionId: importStatus.sessionId,
            status: importStatus.status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to start import operation',
            details: error.message
        });
    }
});

/**
 * POST /api/import/progress
 * Update import progress
 */
router.post('/progress', express.json(), (req, res) => {
    try {
        const { processed, errors, warnings, currentFile } = req.body;

        if (!importStatus.isRunning) {
            return res.status(400).json({
                success: false,
                error: 'No import operation running'
            });
        }

        if (typeof processed === 'number') importStatus.processed = processed;
        if (typeof errors === 'number') importStatus.errors = errors;
        if (typeof warnings === 'number') importStatus.warnings = warnings;
        if (currentFile) importStatus.currentFile = currentFile;

        res.json({
            success: true,
            message: 'Progress updated',
            status: importStatus.status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update import progress',
            details: error.message
        });
    }
});

/**
 * POST /api/import/complete
 * Mark import operation as completed
 */
router.post('/complete', express.json(), (req, res) => {
    try {
        const { success: operationSuccess, finalStats } = req.body;

        importStatus.isRunning = false;
        importStatus.endTime = Date.now();
        importStatus.status = operationSuccess ? 'completed' : 'failed';

        if (finalStats) {
            importStatus.processed = finalStats.processed || importStatus.processed;
            importStatus.errors = finalStats.errors || importStatus.errors;
            importStatus.warnings = finalStats.warnings || importStatus.warnings;
        }

        res.json({
            success: true,
            message: `Import operation ${importStatus.status}`,
            status: importStatus.status,
            finalStats: {
                processed: importStatus.processed,
                errors: importStatus.errors,
                warnings: importStatus.warnings,
                duration: importStatus.endTime - importStatus.startTime
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to complete import operation',
            details: error.message
        });
    }
});

/**
 * POST /api/import/cancel
 * Cancel running import operation
 */
router.post('/cancel', (req, res) => {
    try {
        if (!importStatus.isRunning) {
            return res.status(400).json({
                success: false,
                error: 'No import operation running'
            });
        }

        importStatus.isRunning = false;
        importStatus.endTime = Date.now();
        importStatus.status = 'cancelled';

        res.json({
            success: true,
            message: 'Import operation cancelled',
            status: importStatus.status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to cancel import operation',
            details: error.message
        });
    }
});

/**
 * DELETE /api/import/reset
 * Reset import status
 */
router.delete('/reset', (req, res) => {
    try {
        importStatus = {
            isRunning: false,
            progress: 0,
            total: 0,
            processed: 0,
            errors: 0,
            warnings: 0,
            startTime: null,
            endTime: null,
            currentFile: null,
            sessionId: null,
            status: 'idle'
        };

        res.json({
            success: true,
            message: 'Import status reset',
            status: importStatus.status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to reset import status',
            details: error.message
        });
    }
});

export default router;
