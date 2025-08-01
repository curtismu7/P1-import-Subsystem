/**
 * Export API Routes
 * 
 * Provides endpoints for export operations and status monitoring.
 * These endpoints support the ExportSubsystem and related UI components.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

const router = express.Router();

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
    downloadUrl: null
};

/**
 * GET /api/export/status
 * Get current export operation status
 */
router.get('/status', (req, res) => {
    try {
        const response = {
            success: true,
            status: exportStatus.status,
            isRunning: exportStatus.isRunning,
            progress: {
                current: exportStatus.processed,
                total: exportStatus.total,
                percentage: exportStatus.total > 0 ? Math.round((exportStatus.processed / exportStatus.total) * 100) : 0
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

        res.json(response);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get export status',
            details: error.message
        });
    }
});

/**
 * POST /api/export/start
 * Start a new export operation
 */
router.post('/start', express.json(), (req, res) => {
    try {
        if (exportStatus.isRunning) {
            return res.status(409).json({
                success: false,
                error: 'Export operation already running',
                sessionId: exportStatus.sessionId
            });
        }

        const { sessionId, totalRecords, populationId, populationName, outputFileName } = req.body;

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
            downloadUrl: null
        };

        res.json({
            success: true,
            message: 'Export operation started',
            sessionId: exportStatus.sessionId,
            status: exportStatus.status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to start export operation',
            details: error.message
        });
    }
});

/**
 * POST /api/export/progress
 * Update export progress
 */
router.post('/progress', express.json(), (req, res) => {
    try {
        const { processed, errors, warnings, currentPopulation } = req.body;

        if (!exportStatus.isRunning) {
            return res.status(400).json({
                success: false,
                error: 'No export operation running'
            });
        }

        if (typeof processed === 'number') exportStatus.processed = processed;
        if (typeof errors === 'number') exportStatus.errors = errors;
        if (typeof warnings === 'number') exportStatus.warnings = warnings;
        if (currentPopulation) exportStatus.currentPopulation = currentPopulation;

        res.json({
            success: true,
            message: 'Progress updated',
            status: exportStatus.status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update export progress',
            details: error.message
        });
    }
});

/**
 * POST /api/export/complete
 * Mark export operation as completed
 */
router.post('/complete', express.json(), (req, res) => {
    try {
        const { success: operationSuccess, finalStats, outputFile, downloadUrl } = req.body;

        exportStatus.isRunning = false;
        exportStatus.endTime = Date.now();
        exportStatus.status = operationSuccess ? 'completed' : 'failed';

        if (finalStats) {
            exportStatus.processed = finalStats.processed || exportStatus.processed;
            exportStatus.errors = finalStats.errors || exportStatus.errors;
            exportStatus.warnings = finalStats.warnings || exportStatus.warnings;
        }

        if (outputFile) exportStatus.outputFile = outputFile;
        if (downloadUrl) exportStatus.downloadUrl = downloadUrl;

        res.json({
            success: true,
            message: `Export operation ${exportStatus.status}`,
            status: exportStatus.status,
            finalStats: {
                processed: exportStatus.processed,
                errors: exportStatus.errors,
                warnings: exportStatus.warnings,
                duration: exportStatus.endTime - exportStatus.startTime
            },
            outputFile: exportStatus.outputFile,
            downloadUrl: exportStatus.downloadUrl
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to complete export operation',
            details: error.message
        });
    }
});

/**
 * POST /api/export/cancel
 * Cancel running export operation
 */
router.post('/cancel', (req, res) => {
    try {
        if (!exportStatus.isRunning) {
            return res.status(400).json({
                success: false,
                error: 'No export operation running'
            });
        }

        exportStatus.isRunning = false;
        exportStatus.endTime = Date.now();
        exportStatus.status = 'cancelled';

        res.json({
            success: true,
            message: 'Export operation cancelled',
            status: exportStatus.status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to cancel export operation',
            details: error.message
        });
    }
});

/**
 * DELETE /api/export/reset
 * Reset export status
 */
router.delete('/reset', (req, res) => {
    try {
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
            downloadUrl: null
        };

        res.json({
            success: true,
            message: 'Export status reset',
            status: exportStatus.status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to reset export status',
            details: error.message
        });
    }
});


/**
 * POST /api/export/users
 * Export users from specified population
 */
router.post('/users', async (req, res) => {
    try {
        const { populationId, format = 'csv', includeHeaders = true } = req.body;
        
        if (!populationId) {
            return res.status(400).json({
                success: false,
                error: 'Population ID is required'
            });
        }
        
        // Set export status to running
        exportStatus = {
            ...exportStatus,
            isRunning: true,
            progress: 0,
            total: 0,
            processed: 0,
            errors: 0,
            warnings: 0,
            startTime: new Date(),
            endTime: null,
            currentPopulation: populationId,
            sessionId: Date.now().toString(),
            status: 'running',
            outputFile: null,
            downloadUrl: null
        };
        
        // Start export process (simplified for now)
        setTimeout(async () => {
            try {
                // Simulate export process
                const users = await simulateUserExport(populationId);
                
                // Generate export file
                const exportData = format === 'csv' ? 
                    generateCSV(users, includeHeaders) : 
                    JSON.stringify(users, null, 2);
                
                // Save export file
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const filename = `export_${populationId}_${timestamp}.${format}`;
                const filePath = path.join(rootDir, 'temp', filename);
                
                // Ensure temp directory exists
                const tempDir = path.dirname(filePath);
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                
                fs.writeFileSync(filePath, exportData, 'utf8');
                
                // Update export status
                exportStatus = {
                    ...exportStatus,
                    isRunning: false,
                    progress: 100,
                    total: users.length,
                    processed: users.length,
                    endTime: new Date(),
                    status: 'completed',
                    outputFile: filename,
                    downloadUrl: `/api/export/download/${filename}`
                };
                
            } catch (error) {
                console.error('Export error:', error);
                exportStatus = {
                    ...exportStatus,
                    isRunning: false,
                    status: 'failed',
                    endTime: new Date()
                };
            }
        }, 1000);
        
        res.json({
            success: true,
            message: 'Export started successfully',
            sessionId: exportStatus.sessionId
        });
        
    } catch (error) {
        console.error('Export API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start export operation'
        });
    }
});

/**
 * GET /api/export/download/:filename
 * Download exported file
 */
router.get('/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(rootDir, 'temp', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'Export file not found'
            });
        }
        
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).json({
                    success: false,
                    error: 'Failed to download file'
                });
            }
        });
        
    } catch (error) {
        console.error('Download API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process download request'
        });
    }
});

/**
 * Simulate user export (replace with actual PingOne API call)
 */
async function simulateUserExport(populationId) {
    // This is a simulation - replace with actual PingOne API call
    const users = [];
    const userCount = populationId === 'ALL' ? 100 : 50;
    
    for (let i = 1; i <= userCount; i++) {
        users.push({
            id: `user_${i}`,
            username: `user${i}@example.com`,
            email: `user${i}@example.com`,
            firstName: `User`,
            lastName: `${i}`,
            population: populationId === 'ALL' ? `pop_${i % 5}` : populationId,
            status: 'ENABLED',
            createdAt: new Date().toISOString()
        });
    }
    
    return users;
}

/**
 * Generate CSV from user data
 */
function generateCSV(users, includeHeaders = true) {
    if (users.length === 0) return '';
    
    const headers = Object.keys(users[0]);
    let csv = '';
    
    if (includeHeaders) {
        csv += headers.join(',') + '\n';
    }
    
    users.forEach(user => {
        const row = headers.map(header => {
            const value = user[header] || '';
            // Escape commas and quotes in CSV
            return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                ? `"${value.replace(/"/g, '""')}"`
                : value;
        });
        csv += row.join(',') + '\n';
    });
    
    return csv;
}


export default router;
