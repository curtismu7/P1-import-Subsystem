/**
 * Bulletproof Delete API Routes
 * 
 * Enhanced version of the delete API with circuit breaker pattern,
 * comprehensive validation, chunking for large deletions, and robust error handling.
 * 
 * @version 6.5.2.4
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import fetch from 'node-fetch';
import CircuitBreakerRegistry from '../../server/circuit-breaker.js';
import { safeHandler, validateObject, safeGet, retry } from '../../server/defensive.js';
import { createWinstonLogger } from '../../server/winston-config.js';

const router = express.Router();

// Create specialized logger for delete operations
const deleteLogger = createWinstonLogger({
    service: 'delete-api',
    env: process.env.NODE_ENV || 'development',
    enableFileLogging: process.env.NODE_ENV !== 'test'
});

// Configure file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `delete-${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Get or create circuit breaker for delete operations
const deleteCircuitBreaker = CircuitBreakerRegistry.getOrCreate('delete-api', {
    failureThreshold: 3,
    resetTimeout: 30000, // 30 seconds
    timeout: 60000, // 60 seconds
    fallbackFn: (req) => {
        return {
            success: false,
            error: 'Delete service temporarily unavailable',
            status: 'service_unavailable',
            retryAfter: 30
        };
    }
});

// In-memory storage for delete status (in production, use database)
let deleteStatus = {
    isRunning: false,
    progress: 0,
    total: 0,
    processed: 0,
    deleted: 0,
    errors: 0,
    warnings: 0,
    startTime: null,
    endTime: null,
    currentPopulation: null,
    sessionId: null,
    status: 'idle', // idle, running, completed, failed, cancelled
    chunks: {
        total: 0,
        processed: 0,
        size: 100 // Default chunk size
    }
};

// Validation schema for delete parameters
const deleteSchema = {
    sessionId: { type: 'string', required: false },
    populationId: { type: 'string', required: true },
    populationName: { type: 'string', required: false },
    deleteAll: { type: 'boolean', required: false },
    options: { type: 'object', required: false }
};

/**
 * GET /api/delete/status
 * Get current delete operation status
 */
router.get('/status', safeHandler(async (req, res) => {
    // Use circuit breaker to protect against cascading failures
    const response = await deleteCircuitBreaker.execute(async () => {
        const response = {
            success: true,
            status: deleteStatus.status,
            isRunning: deleteStatus.isRunning,
            progress: {
                current: deleteStatus.processed,
                total: deleteStatus.total,
                percentage: deleteStatus.total > 0 ? Math.round((deleteStatus.processed / deleteStatus.total) * 100) : 0,
                chunks: {
                    processed: deleteStatus.chunks.processed,
                    total: deleteStatus.chunks.total,
                    size: deleteStatus.chunks.size
                }
            },
            statistics: {
                processed: deleteStatus.processed,
                deleted: deleteStatus.deleted,
                errors: deleteStatus.errors,
                warnings: deleteStatus.warnings
            },
            timing: {
                startTime: deleteStatus.startTime,
                endTime: deleteStatus.endTime,
                duration: deleteStatus.startTime && deleteStatus.endTime 
                    ? deleteStatus.endTime - deleteStatus.startTime 
                    : deleteStatus.startTime 
                        ? Date.now() - deleteStatus.startTime 
                        : null
            },
            currentPopulation: deleteStatus.currentPopulation,
            sessionId: deleteStatus.sessionId
        };

        return response;
    });

    res.json(response);
}));

/**
 * POST /api/delete/users
 * Delete users in bulk with comprehensive error handling and circuit breaker
 */
router.post('/users', [
    // Input validation using express-validator
    body('populationId').notEmpty().withMessage('Population ID is required'),
    body('deleteAll').optional().isBoolean().withMessage('deleteAll must be a boolean'),
    upload.single('file')
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
    const validation = validateObject(req.body, deleteSchema);
    if (!validation.valid) {
        return res.status(400).json({
            success: false,
            errors: validation.errors
        });
    }

    // Check if delete is already running
    if (deleteStatus.isRunning) {
        return res.status(409).json({
            success: false,
            error: 'Delete operation already running',
            sessionId: deleteStatus.sessionId
        });
    }

    // Use circuit breaker to protect against cascading failures
    const response = await deleteCircuitBreaker.execute(async () => {
        const { populationId, populationName, deleteAll } = req.body;
        const sessionId = `delete_${Date.now()}`;
        
        // Initialize delete status
        deleteStatus = {
            isRunning: true,
            progress: 0,
            total: 0,
            processed: 0,
            deleted: 0,
            errors: 0,
            warnings: 0,
            startTime: Date.now(),
            endTime: null,
            currentPopulation: populationName || populationId,
            sessionId: sessionId,
            status: 'running',
            chunks: {
                total: 0,
                processed: 0,
                size: 100 // Default chunk size
            }
        };

        // Process delete request
        try {
            let usersToDelete = [];
            
            // If deleteAll is true, fetch all users from the population
            if (deleteAll) {
                deleteLogger.info('Fetching all users from population for deletion', {
                    populationId,
                    sessionId
                });
                
                // Start a background process to handle the deletion
                processPopulationDeletion(populationId, sessionId);
                
                return {
                    success: true,
                    message: 'Delete operation started',
                    sessionId,
                    status: deleteStatus.status
                };
            }
            
            // Otherwise, process the uploaded CSV file
            if (!req.file) {
                return {
                    success: false,
                    error: 'CSV file is required when deleteAll is not specified'
                };
            }
            
            deleteLogger.info('Processing CSV file for user deletion', {
                file: req.file.originalname,
                size: req.file.size,
                populationId,
                sessionId
            });
            
            // Start a background process to handle the CSV parsing and deletion
            processFileDeletion(req.file.path, populationId, sessionId);
            
            return {
                success: true,
                message: 'Delete operation started',
                sessionId,
                status: deleteStatus.status,
                fileName: req.file.originalname,
                fileSize: req.file.size
            };
        } catch (error) {
            deleteLogger.error('Failed to start delete operation', {
                error: error.message,
                stack: error.stack,
                populationId,
                sessionId
            });
            
            deleteStatus = {
                isRunning: false,
                progress: 0,
                total: 0,
                processed: 0,
                deleted: 0,
                errors: 1,
                warnings: 0,
                startTime: null,
                endTime: null,
                currentPopulation: null,
                sessionId: null,
                status: 'idle',
                chunks: {
                    total: 0,
                    processed: 0,
                    size: 100
                }
            };
            
            return {
                success: false,
                error: 'Failed to start delete operation',
                details: error.message
            };
        }
    });

    res.json(response);
}));

/**
 * POST /api/delete/progress
 * Update delete progress
 */
router.post('/progress', [
    body('processed').optional().isInt({ min: 0 }).withMessage('Processed count must be a positive integer'),
    body('deleted').optional().isInt({ min: 0 }).withMessage('Deleted count must be a positive integer'),
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

    // Check if delete is running
    if (!deleteStatus.isRunning) {
        return res.status(400).json({
            success: false,
            error: 'No delete operation running'
        });
    }

    // Use circuit breaker to protect against cascading failures
    const response = await deleteCircuitBreaker.execute(async () => {
        const { processed, deleted, errors, warnings, chunkIndex } = req.body;

        if (typeof processed === 'number') deleteStatus.processed = processed;
        if (typeof deleted === 'number') deleteStatus.deleted = deleted;
        if (typeof errors === 'number') deleteStatus.errors = errors;
        if (typeof warnings === 'number') deleteStatus.warnings = warnings;
        
        // Update chunk processing if provided
        if (typeof chunkIndex === 'number') {
            deleteStatus.chunks.processed = chunkIndex + 1;
            
            // Log progress for large deletions
            if (deleteStatus.chunks.total > 10 && deleteStatus.chunks.processed % 5 === 0) {
                deleteLogger.info('Delete progress update', {
                    sessionId: deleteStatus.sessionId,
                    chunksProcessed: deleteStatus.chunks.processed,
                    totalChunks: deleteStatus.chunks.total,
                    percentComplete: Math.round((deleteStatus.chunks.processed / deleteStatus.chunks.total) * 100)
                });
            }
        }

        return {
            success: true,
            message: 'Progress updated',
            status: deleteStatus.status,
            progress: {
                current: deleteStatus.processed,
                total: deleteStatus.total,
                percentage: deleteStatus.total > 0 ? Math.round((deleteStatus.processed / deleteStatus.total) * 100) : 0,
                chunks: {
                    processed: deleteStatus.chunks.processed,
                    total: deleteStatus.chunks.total
                }
            }
        };
    });

    res.json(response);
}));

/**
 * POST /api/delete/complete
 * Mark delete operation as completed
 */
router.post('/complete', safeHandler(async (req, res) => {
    // Use circuit breaker to protect against cascading failures
    const response = await deleteCircuitBreaker.execute(async () => {
        const { success: operationSuccess, finalStats } = req.body;

        deleteStatus.isRunning = false;
        deleteStatus.endTime = Date.now();
        deleteStatus.status = operationSuccess ? 'completed' : 'failed';

        if (finalStats) {
            deleteStatus.processed = finalStats.processed || deleteStatus.processed;
            deleteStatus.deleted = finalStats.deleted || deleteStatus.deleted;
            deleteStatus.errors = finalStats.errors || deleteStatus.errors;
            deleteStatus.warnings = finalStats.warnings || deleteStatus.warnings;
            
            if (finalStats.chunks) {
                deleteStatus.chunks.processed = finalStats.chunks.processed || deleteStatus.chunks.processed;
            }
        }

        const duration = deleteStatus.endTime - deleteStatus.startTime;
        
        deleteLogger.info(`Delete operation ${deleteStatus.status}`, {
            sessionId: deleteStatus.sessionId,
            duration: duration,
            processed: deleteStatus.processed,
            deleted: deleteStatus.deleted,
            errors: deleteStatus.errors,
            warnings: deleteStatus.warnings
        });

        return {
            success: true,
            message: `Delete operation ${deleteStatus.status}`,
            status: deleteStatus.status,
            finalStats: {
                processed: deleteStatus.processed,
                deleted: deleteStatus.deleted,
                errors: deleteStatus.errors,
                warnings: deleteStatus.warnings,
                duration: duration,
                chunks: {
                    processed: deleteStatus.chunks.processed,
                    total: deleteStatus.chunks.total
                }
            }
        };
    });

    res.json(response);
}));

/**
 * POST /api/delete/cancel
 * Cancel running delete operation
 */
router.post('/cancel', safeHandler(async (req, res) => {
    // Check if delete is running
    if (!deleteStatus.isRunning) {
        return res.status(400).json({
            success: false,
            error: 'No delete operation running'
        });
    }

    // Use circuit breaker to protect against cascading failures
    const response = await deleteCircuitBreaker.execute(async () => {
        deleteStatus.isRunning = false;
        deleteStatus.endTime = Date.now();
        deleteStatus.status = 'cancelled';

        deleteLogger.info('Delete operation cancelled', {
            sessionId: deleteStatus.sessionId,
            duration: deleteStatus.endTime - deleteStatus.startTime,
            processed: deleteStatus.processed,
            deleted: deleteStatus.deleted
        });

        return {
            success: true,
            message: 'Delete operation cancelled',
            status: deleteStatus.status
        };
    });

    res.json(response);
}));

/**
 * DELETE /api/delete/reset
 * Reset delete status
 */
router.delete('/reset', safeHandler(async (req, res) => {
    // Use circuit breaker to protect against cascading failures
    const response = await deleteCircuitBreaker.execute(async () => {
        deleteStatus = {
            isRunning: false,
            progress: 0,
            total: 0,
            processed: 0,
            deleted: 0,
            errors: 0,
            warnings: 0,
            startTime: null,
            endTime: null,
            currentPopulation: null,
            sessionId: null,
            status: 'idle',
            chunks: {
                total: 0,
                processed: 0,
                size: 100
            }
        };

        deleteLogger.info('Delete status reset');

        return {
            success: true,
            message: 'Delete status reset',
            status: deleteStatus.status
        };
    });

    res.json(response);
}));

/**
 * GET /api/delete/health
 * Get health status of the delete service
 */
router.get('/health', safeHandler(async (req, res) => {
    const circuitBreakerState = deleteCircuitBreaker.getState();
    
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
        deleteService: {
            status: deleteStatus.isRunning ? 'busy' : 'available',
            currentSession: deleteStatus.sessionId,
            activeDelete: deleteStatus.isRunning ? {
                population: deleteStatus.currentPopulation,
                progress: deleteStatus.total > 0 ? Math.round((deleteStatus.processed / deleteStatus.total) * 100) : 0,
                startTime: deleteStatus.startTime
            } : null
        }
    });
}));

/**
 * Process population deletion in background
 */
async function processPopulationDeletion(populationId, sessionId) {
    try {
        // Fetch all users from the population
        const users = await fetchPopulationUsers(populationId);
        
        // Update total count
        deleteStatus.total = users.length;
        deleteStatus.chunks.total = Math.ceil(users.length / deleteStatus.chunks.size);
        
        deleteLogger.info('Starting population deletion', {
            populationId,
            sessionId,
            totalUsers: users.length,
            totalChunks: deleteStatus.chunks.total
        });
        
        // Process users in chunks
        await processUserDeletionInChunks(users, populationId, sessionId);
        
    } catch (error) {
        deleteLogger.error('Failed to process population deletion', {
            error: error.message,
            stack: error.stack,
            populationId,
            sessionId
        });
        
        // Mark operation as failed
        deleteStatus.isRunning = false;
        deleteStatus.endTime = Date.now();
        deleteStatus.status = 'failed';
        deleteStatus.errors++;
    }
}

/**
 * Process file deletion in background
 */
async function processFileDeletion(filePath, populationId, sessionId) {
    try {
        // Parse CSV file
        const users = await parseCSVFile(filePath);
        
        // Update total count
        deleteStatus.total = users.length;
        deleteStatus.chunks.total = Math.ceil(users.length / deleteStatus.chunks.size);
        
        deleteLogger.info('Starting file-based deletion', {
            populationId,
            sessionId,
            totalUsers: users.length,
            totalChunks: deleteStatus.chunks.total
        });
        
        // Process users in chunks
        await processUserDeletionInChunks(users, populationId, sessionId);
        
        // Clean up temp file
        fs.unlink(filePath, (err) => {
            if (err) {
                deleteLogger.warn('Failed to delete temporary file', {
                    file: filePath,
                    error: err.message
                });
            }
        });
        
    } catch (error) {
        deleteLogger.error('Failed to process file deletion', {
            error: error.message,
            stack: error.stack,
            file: filePath,
            populationId,
            sessionId
        });
        
        // Mark operation as failed
        deleteStatus.isRunning = false;
        deleteStatus.endTime = Date.now();
        deleteStatus.status = 'failed';
        deleteStatus.errors++;
    }
}

/**
 * Process user deletion in chunks
 */
async function processUserDeletionInChunks(users, populationId, sessionId) {
    const chunkSize = deleteStatus.chunks.size;
    const totalChunks = Math.ceil(users.length / chunkSize);
    
    deleteLogger.info('Processing user deletion in chunks', {
        totalUsers: users.length,
        chunkSize,
        totalChunks,
        sessionId
    });
    
    let deleted = 0;
    let errors = 0;
    
    for (let i = 0; i < totalChunks; i++) {
        // Check if operation was cancelled
        if (!deleteStatus.isRunning) {
            deleteLogger.info('Delete operation was cancelled, stopping chunk processing', {
                sessionId,
                currentChunk: i,
                totalChunks
            });
            break;
        }
        
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, users.length);
        const chunk = users.slice(start, end);
        
        deleteLogger.info('Processing chunk', {
            chunkIndex: i,
            chunkSize: chunk.length,
            start,
            end,
            sessionId
        });
        
        // Process each user in the chunk
        const results = await Promise.allSettled(
            chunk.map(user => deleteUser(user, populationId))
        );
        
        // Update progress
        const chunkDeleted = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const chunkErrors = results.filter(r => r.status === 'rejected').length;
        
        deleted += chunkDeleted;
        errors += chunkErrors;
        
        deleteStatus.processed += chunk.length;
        deleteStatus.deleted = deleted;
        deleteStatus.errors = errors;
        deleteStatus.chunks.processed = i + 1;
        
        deleteLogger.info('Chunk processed', {
            chunkIndex: i,
            processed: chunk.length,
            deleted: chunkDeleted,
            errors: chunkErrors,
            totalProcessed: deleteStatus.processed,
            totalDeleted: deleteStatus.deleted,
            totalErrors: deleteStatus.errors,
            sessionId
        });
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Mark operation as completed
    deleteStatus.isRunning = false;
    deleteStatus.endTime = Date.now();
    deleteStatus.status = 'completed';
    
    deleteLogger.info('Delete operation completed', {
        sessionId,
        totalProcessed: deleteStatus.processed,
        totalDeleted: deleteStatus.deleted,
        totalErrors: deleteStatus.errors,
        duration: deleteStatus.endTime - deleteStatus.startTime
    });
}

/**
 * Delete a single user with retry logic
 */
async function deleteUser(user, populationId) {
    // Function to delete user with API
    const deleteUserFn = async () => {
        let userId = user.id;
        
        // If no ID provided, look up by username or email
        if (!userId) {
            if (user.username) {
                userId = await lookupUserByUsername(user.username, populationId);
            } else if (user.email) {
                userId = await lookupUserByEmail(user.email, populationId);
            }
            
            // If still no ID, user doesn't exist
            if (!userId) {
                return false;
            }
        }
        
        // Delete user
        const response = await fetch(
            `${process.env.PINGONE_API_URL}/environments/${process.env.PINGONE_ENV_ID}/users/${userId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${process.env.PINGONE_TOKEN}`
                }
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to delete user: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        return true;
    };
    
    // Use retry with exponential backoff for resilience
    return retry(deleteUserFn, {
        maxRetries: 3,
        initialDelay: 1000,
        shouldRetry: (error) => {
            // Retry on network errors or 429 (rate limit) or 5xx errors
            const errorMessage = error.message || '';
            return errorMessage.includes('network') || 
                   errorMessage.includes('429') || 
                   errorMessage.includes('5');
        }
    });
}

/**
 * Fetch all users from a population
 */
async function fetchPopulationUsers(populationId) {
    const users = [];
    let nextUrl = `${process.env.PINGONE_API_URL}/environments/${process.env.PINGONE_ENV_ID}/populations/${populationId}/users?limit=100`;
    
    while (nextUrl) {
        const response = await fetch(nextUrl, {
            headers: {
                'Authorization': `Bearer ${process.env.PINGONE_TOKEN}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch users: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data._embedded && data._embedded.users) {
            users.push(...data._embedded.users);
        }
        
        // Check for next page
        nextUrl = null;
        if (data._links && data._links.next) {
            nextUrl = data._links.next.href;
        }
    }
    
    return users;
}

/**
 * Look up user by username
 */
async function lookupUserByUsername(username, populationId) {
    const response = await fetch(
        `${process.env.PINGONE_API_URL}/environments/${process.env.PINGONE_ENV_ID}/users?filter=username%20eq%20"${encodeURIComponent(username)}"&populationId=${populationId}`,
        {
            headers: {
                'Authorization': `Bearer ${process.env.PINGONE_TOKEN}`
            }
        }
    );
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to lookup user by username: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data._embedded && data._embedded.users && data._embedded.users.length > 0) {
        return data._embedded.users[0].id;
    }
    
    return null;
}

/**
 * Look up user by email
 */
async function lookupUserByEmail(email, populationId) {
    const response = await fetch(
        `${process.env.PINGONE_API_URL}/environments/${process.env.PINGONE_ENV_ID}/users?filter=email%20eq%20"${encodeURIComponent(email)}"&populationId=${populationId}`,
        {
            headers: {
                'Authorization': `Bearer ${process.env.PINGONE_TOKEN}`
            }
        }
    );
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to lookup user by email: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data._embedded && data._embedded.users && data._embedded.users.length > 0) {
        return data._embedded.users[0].id;
    }
    
    return null;
}

/**
 * Parse CSV file
 */
async function parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
        const users = [];
        
        fs.createReadStream(filePath)
            .pipe(parse({
                columns: true,
                skip_empty_lines: true,
                trim: true
            }))
            .on('data', (row) => {
                users.push(row);
            })
            .on('error', (error) => {
                reject(error);
            })
            .on('end', () => {
                resolve(users);
            });
    });
}

export default router;
