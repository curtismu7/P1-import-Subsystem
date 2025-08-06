/**
 * History API Routes
 * 
 * Provides endpoints for retrieving operation history and activity logs.
 * These endpoints support the HistorySubsystem and related UI components.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// In-memory storage for operation history (in production, use database)
let operationHistory = [
    {
        id: 1,
        type: 'import',
        status: 'completed',
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        populationId: 'test-pop-1',
        populationName: 'Test Population 1',
        recordsProcessed: 150,
        recordsSuccessful: 148,
        recordsErrors: 2,
        duration: 45000, // 45 seconds
        filename: 'users-import-2025-07-23.csv'
    },
    {
        id: 2,
        type: 'export',
        status: 'completed',
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        populationId: 'test-pop-2',
        populationName: 'Test Population 2',
        recordsProcessed: 75,
        recordsSuccessful: 75,
        recordsErrors: 0,
        duration: 12000, // 12 seconds
        filename: 'users-export-2025-07-23.csv'
    },
    {
        id: 3,
        type: 'modify',
        status: 'failed',
        timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        populationId: 'test-pop-1',
        populationName: 'Test Population 1',
        recordsProcessed: 25,
        recordsSuccessful: 0,
        recordsErrors: 25,
        duration: 5000, // 5 seconds
        error: 'Authentication token expired'
    }
];

/**
 * GET /api/history
 * Get operation history with optional filtering and pagination
 */
router.get('/', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const type = req.query.type; // filter by operation type
        const status = req.query.status; // filter by status
        
        let filteredHistory = [...operationHistory];
        
        // Apply filters
        if (type) {
            filteredHistory = filteredHistory.filter(op => op.type === type);
        }
        
        if (status) {
            filteredHistory = filteredHistory.filter(op => op.status === status);
        }
        
        // Sort by timestamp (most recent first)
        filteredHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Apply pagination
        const total = filteredHistory.length;
        const paginatedHistory = filteredHistory.slice(offset, offset + limit);
        
        res.success('History retrieved successfully', {
            history: paginatedHistory,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            },
            filters: {
                type,
                status
            }
        });
        
    } catch (error) {
        res.error('Failed to retrieve operation history', {
            code: 'HISTORY_RETRIEVAL_ERROR',
            details: error.message
        }, 500);
    }
});

/**
 * GET /api/history/:id
 * Get detailed information about a specific operation
 */
router.get('/:id', (req, res) => {
    try {
        const operationId = parseInt(req.params.id);
        const operation = operationHistory.find(op => op.id === operationId);
        
        if (!operation) {
            return res.status(404).json({
                success: false,
                error: 'Operation not found'
            });
        }
        
        res.success('Operation details retrieved successfully', { operation });
        
    } catch (error) {
        res.error('Failed to retrieve operation details', {
            code: 'HISTORY_DETAIL_ERROR',
            details: error.message
        }, 500);
    }
});

/**
 * POST /api/history
 * Add a new operation to the history
 */
router.post('/', express.json(), (req, res) => {
    try {
        const {
            type,
            status,
            populationId,
            populationName,
            recordsProcessed,
            recordsSuccessful,
            recordsErrors,
            duration,
            filename,
            error
        } = req.body;
        
        // Validate required fields
        if (!type || !status) {
            return res.error('Missing required fields', { code: 'VALIDATION_ERROR' }, 400);
        }
        
        const newOperation = {
            id: Math.max(...operationHistory.map(op => op.id), 0) + 1,
            type,
            status,
            timestamp: new Date().toISOString(),
            populationId,
            populationName,
            recordsProcessed: recordsProcessed || 0,
            recordsSuccessful: recordsSuccessful || 0,
            recordsErrors: recordsErrors || 0,
            duration: duration || 0,
            filename,
            error
        };
        
        operationHistory.push(newOperation);
        
        res.success('Operation added to history', { operation: newOperation }, 201);
        
    } catch (error) {
        res.error('Failed to add operation to history', {
            code: 'HISTORY_ADD_ERROR',
            details: error.message
        }, 500);
    }
});

/**
 * DELETE /api/history/:id
 * Remove an operation from the history
 */
router.delete('/:id', (req, res) => {
    try {
        const operationId = parseInt(req.params.id);
        const index = operationHistory.findIndex(op => op.id === operationId);
        
        if (index === -1) {
            return res.error('Operation not found', { code: 'NOT_FOUND' }, 404);
        }
        
        const removedOperation = operationHistory.splice(index, 1)[0];
        
        res.success('Operation removed from history', { id: operationId, operation: removedOperation });
        
    } catch (error) {
        res.error('Failed to remove operation from history', {
            code: 'HISTORY_DELETE_ERROR',
            details: error.message
        }, 500);
    }
});

/**
 * DELETE /api/history
 * Clear all history (with optional filters)
 */
router.delete('/', (req, res) => {
    try {
        const type = req.query.type;
        const status = req.query.status;
        
        let removedCount = 0;
        
        if (type || status) {
            // Remove filtered operations
            const originalLength = operationHistory.length;
            operationHistory = operationHistory.filter(op => {
                const shouldRemove = (!type || op.type === type) && (!status || op.status === status);
                if (shouldRemove) removedCount++;
                return !shouldRemove;
            });
        } else {
            // Remove all operations
            removedCount = operationHistory.length;
            operationHistory = [];
        }
        
        res.json({
            success: true,
            message: `Removed ${removedCount} operations from history`,
            removedCount
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to clear history',
            details: error.message
        });
    }
});

export default router;
