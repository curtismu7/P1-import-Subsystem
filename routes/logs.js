import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const join = path.join;

// Ensure logs directory exists
const LOGS_DIR = join(process.cwd(), 'logs');
const CLIENT_LOGS_FILE = join(LOGS_DIR, 'client.log');

// In-memory storage for UI logs
const uiLogs = [];
const MAX_UI_LOGS = 1000; // Maximum number of UI logs to keep in memory

// Persistent operation history log file
const OPERATION_HISTORY_FILE = join(LOGS_DIR, 'operation-history.json');

// Helper to read operation history
async function readOperationHistory() {
    try {
        await ensureLogsDir();
        const data = await fs.readFile(OPERATION_HISTORY_FILE, 'utf8').catch(() => '[]');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading operation history:', error);
        return [];
    }
}

// Helper to write operation history
async function writeOperationHistory(history) {
    try {
        await ensureLogsDir();
        await fs.writeFile(OPERATION_HISTORY_FILE, JSON.stringify(history, null, 2));
    } catch (error) {
        console.error('Error writing operation history:', error);
    }
}

// Create logs directory if it doesn't exist
async function ensureLogsDir() {
    try {
        await fs.mkdir(LOGS_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating logs directory:', error);
    }
}

// [CLEANUP] Consolidated helper functions and removed duplicate logic

/**
 * @swagger
 * /api/logs/ui:
 *   post:
 *     summary: Create UI log entry
 *     description: |
 *       Creates a log entry for display in the UI. This endpoint is used by the frontend
 *       to log user actions, system events, and debugging information.
 *       
 *       ## Log Levels
 *       - **info**: General information and user actions
 *       - **warning**: Warnings and non-critical issues
 *       - **error**: Errors and critical issues
 *       - **debug**: Debugging information (development only)
 *       
 *       ## Data Structure
 *       Each log entry includes:
 *       - Unique log ID
 *       - Timestamp and log level
 *       - Message and additional data
 *       - Source information (frontend, server, etc.)
 *       - Client IP and user agent
 *       
 *       ## Storage
 *       Logs are stored in memory with a maximum of 1000 entries.
 *       Older entries are automatically removed when the limit is reached.
 *       
 *       ## Usage
 *       - Frontend logging for user actions
 *       - System event tracking
 *       - Debug information collection
 *       - Error reporting and monitoring
 *     tags: [Logs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Log message
 *                 example: "User import completed successfully"
 *               level:
 *                 type: string
 *                 enum: [info, warning, error, debug]
 *                 description: Log level
 *                 example: info
 *               data:
 *                 type: object
 *                 description: Additional log data
 *                 example: { userId: "123", action: "import" }
 *               source:
 *                 type: string
 *                 description: Source of the log
 *                 example: frontend
 *             required:
 *               - message
 *     responses:
 *       200:
 *         description: Log entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Log entry created"
 *                 id:
 *                   type: string
 *                   description: Unique log entry ID
 *                   example: "log-12345"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/ui', express.json(), (req, res) => {
    try {
        const { message, level = 'info', data = {}, source = 'server' } = req.body;
        
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Message is required' 
            });
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            id: uuidv4(),
            timestamp,
            level: level.toLowerCase(),
            message,
            data: {
                ...data,
                source,
                type: 'ui'
            },
            ip: req.ip,
            userAgent: req.get('user-agent')
        };

        // Add to in-memory logs
        uiLogs.push(logEntry);
        
        // Keep only the most recent logs
        if (uiLogs.length > MAX_UI_LOGS) {
            uiLogs.shift(); // Remove oldest log
        }

        res.json({ 
            success: true, 
            message: 'Log entry created',
            id: logEntry.id
        });

    } catch (error) {
        console.error('Error processing UI log entry:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process log entry',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @swagger
 * /api/logs/ui:
 *   get:
 *     summary: Get UI logs
 *     description: |
 *       Retrieves UI logs for display in the frontend. This endpoint returns
 *       the most recent log entries with optional filtering and limiting.
 *       
 *       ## Log Retrieval
 *       - Returns the most recent logs first
 *       - Supports limit parameter for pagination
 *       - Maximum limit of 1000 entries per request
 *       - Includes total count and filtered count
 *       
 *       ## Log Data
 *       Each log entry includes:
 *       - Unique log ID and timestamp
 *       - Log level and message
 *       - Additional data and metadata
 *       - Source information and client details
 *       
 *       ## Usage
 *       - Frontend log display
 *       - Debug information retrieval
 *       - System monitoring and troubleshooting
 *       - User activity tracking
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Maximum number of logs to return
 *         example: 100
 *     responses:
 *       200:
 *         description: UI logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogsResponse'
 *             example:
 *               success: true
 *               count: 50
 *               total: 1000
 *               logs: [
 *                 {
 *                   id: "log-12345",
 *                   timestamp: "2025-07-12T15:35:29.053Z",
 *                   level: "info",
 *                   message: "User import completed successfully",
 *                   data: {
 *                     userId: "123",
 *                     action: "import",
 *                     source: "frontend",
 *                     type: "ui"
 *                   },
 *                   ip: "127.0.0.1",
 *                   userAgent: "Mozilla/5.0..."
 *                 }
 *               ]
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/ui', (req, res) => {
    try {
        const { limit = 100 } = req.query;
        const limitNum = Math.min(parseInt(limit, 10) || 100, 1000);
        
        // Return the most recent logs
        const result = uiLogs.slice(-limitNum).reverse();
        
        res.json({
            success: true,
            count: result.length,
            total: uiLogs.length,
            logs: result
        });
        
    } catch (error) {
        console.error('Error retrieving UI logs:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to retrieve UI logs',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Clear UI logs (in-memory)
 * DELETE /api/logs/ui
 */
router.delete('/ui', (req, res) => {
    try {
        uiLogs.length = 0;
        res.json({ success: true, message: 'UI logs cleared' });
    } catch (error) {
        console.error('Error clearing UI logs:', error);
        res.status(500).json({ success: false, error: 'Failed to clear UI logs', details: error.message });
    }
});

/**
 * Post a warning to UI logs for display on screen
 * POST /api/logs/warning
 * Body: { message: string, details: object, source: string }
 */
router.post('/warning', express.json(), (req, res) => {
    try {
        const { message, details = {}, source = 'server' } = req.body;
        
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Warning message is required' 
            });
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            id: uuidv4(),
            timestamp,
            level: 'warn',
            message,
            data: {
                ...details,
                source,
                type: 'warning'
            },
            ip: req.ip,
            userAgent: req.get('user-agent')
        };

        // Add to in-memory logs
        uiLogs.push(logEntry);
        
        // Keep only the most recent logs
        if (uiLogs.length > MAX_UI_LOGS) {
            uiLogs.shift(); // Remove oldest log
        }

        // Also log to console for debugging
        console.warn(`[UI WARNING] ${source}: ${message}`, details);

        res.json({ 
            success: true, 
            message: 'Warning logged to UI',
            id: logEntry.id
        });

    } catch (error) {
        console.error('Error processing warning log entry:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process warning log entry',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Post an error to UI logs for display on screen
 * POST /api/logs/error
 * Body: { message: string, details: object, source: string }
 */
router.post('/error', express.json(), (req, res) => {
    try {
        const { message, details = {}, source = 'server' } = req.body;
        
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Error message is required' 
            });
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            id: uuidv4(),
            timestamp,
            level: 'error',
            message,
            data: {
                ...details,
                source,
                type: 'error'
            },
            ip: req.ip,
            userAgent: req.get('user-agent')
        };

        // Add to in-memory logs
        uiLogs.push(logEntry);
        
        // Keep only the most recent logs
        if (uiLogs.length > MAX_UI_LOGS) {
            uiLogs.shift(); // Remove oldest log
        }

        // Also log to console for debugging
        console.error(`[UI ERROR] ${source}: ${message}`, details);

        res.json({ 
            success: true, 
            message: 'Error logged to UI',
            id: logEntry.id
        });

    } catch (error) {
        console.error('Error processing error log entry:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process error log entry',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Post an info message to UI logs for display on screen
 * POST /api/logs/info
 * Body: { message: string, details: object, source: string }
 */
router.post('/info', express.json(), (req, res) => {
    try {
        const { message, details = {}, source = 'server' } = req.body;
        
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Info message is required' 
            });
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            id: uuidv4(),
            timestamp,
            level: 'info',
            message,
            data: {
                ...details,
                source,
                type: 'info'
            },
            ip: req.ip,
            userAgent: req.get('user-agent')
        };

        // Add to in-memory logs
        uiLogs.push(logEntry);
        
        // Keep only the most recent logs
        if (uiLogs.length > MAX_UI_LOGS) {
            uiLogs.shift(); // Remove oldest log
        }

        res.json({ 
            success: true, 
            message: 'Info logged to UI',
            id: logEntry.id
        });

    } catch (error) {
        console.error('Error processing info log entry:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process info log entry',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Get logs from disk
 * GET /api/logs/disk
 * Query params: 
 *   - limit: number of logs to return (default: 100)
 *   - level: filter by log level (e.g., 'error', 'warn', 'info')
 */
router.get('/disk', async (req, res) => {
    try {
        const { limit = 100, level } = req.query;
        const limitNum = Math.min(parseInt(limit, 10) || 100, 1000);
        
        try {
            const data = await fs.readFile(CLIENT_LOGS_FILE, 'utf8');
            let logs = data
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch (e) {
                        console.warn('Failed to parse log entry:', line);
                        return null;
                    }
                })
                .filter(log => log !== null);
            
            // Filter by level if specified
            if (level) {
                logs = logs.filter(log => log.level === level);
            }
            
            // Apply limit and reverse to get most recent first
            const result = logs.slice(-limitNum).reverse();
            
            res.json({
                success: true,
                count: result.length,
                total: logs.length,
                logs: result
            });
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Log file doesn't exist yet, return empty array
                return res.json({
                    success: true,
                    count: 0,
                    total: 0,
                    logs: []
                });
            }
            throw error;
        }
        
    } catch (error) {
        console.error('Error retrieving disk logs:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to retrieve disk logs',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Post a log entry to disk
 * POST /api/logs/disk
 * Body: { level: string, message: string, data: object }
 */
router.post('/disk', express.json(), async (req, res) => {
    try {
        const { level = 'info', message, data = {} } = req.body;
        
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Message is required' 
            });
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            id: uuidv4(),
            timestamp,
            level,
            message,
            data,
            ip: req.ip,
            userAgent: req.get('user-agent')
        };

        // Write to log file
        await fs.appendFile(
            CLIENT_LOGS_FILE, 
            JSON.stringify(logEntry) + '\n',
            'utf8'
        );

        res.json({ 
            success: true, 
            message: 'Disk log entry created',
            id: logEntry.id
        });

    } catch (error) {
        console.error('Error processing disk log entry:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process disk log entry',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Add a new operation log entry
 * POST /api/operations/history
 * Body: { operationType, total, success, skipped, errors, populationName, filename, timestamp, ... }
 */
router.post('/operations/history', express.json(), async (req, res) => {
    try {
        const entry = {
            id: uuidv4(),
            ...req.body,
            timestamp: req.body.timestamp || new Date().toISOString()
        };
        const history = await readOperationHistory();
        history.push(entry);
        // Keep only the most recent 1000 entries
        if (history.length > 1000) history.shift();
        await writeOperationHistory(history);
        res.json({ success: true, entry });
    } catch (error) {
        console.error('Error adding operation history entry:', error);
        res.status(500).json({ success: false, error: 'Failed to add operation history entry' });
    }
});

/**
 * Get full operation history
 * GET /api/operations/history?limit=100&sort=desc
 */
router.get('/operations/history', async (req, res) => {
    try {
        const { limit = 100, sort = 'desc' } = req.query;
        let history = await readOperationHistory();
        // Sort by timestamp
        history.sort((a, b) => (sort === 'desc' ? b.timestamp.localeCompare(a.timestamp) : a.timestamp.localeCompare(b.timestamp)));
        const limitNum = Math.min(parseInt(limit, 10) || 100, 1000);
        res.json({ success: true, count: Math.min(history.length, limitNum), total: history.length, history: history.slice(0, limitNum) });
    } catch (error) {
        console.error('Error retrieving operation history:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve operation history' });
    }
});

/**
 * Get logs summary and available endpoints
 * GET /api/logs
 * Returns a summary of available logs and endpoints
 */
router.get('/', (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Logs API endpoints available',
            endpoints: {
                'GET /api/logs': 'This endpoint - shows available log endpoints',
                'GET /api/logs/ui': 'Get UI logs (in-memory)',
                'POST /api/logs/ui': 'Post UI log entry',
                'DELETE /api/logs/ui': 'Clear UI logs',
                'GET /api/logs/disk': 'Get disk logs',
                'POST /api/logs/disk': 'Post disk log entry',
                'POST /api/logs/error': 'Post error log',
                'POST /api/logs/warning': 'Post warning log',
                'POST /api/logs/info': 'Post info log',
                'DELETE /api/logs': 'Clear all logs'
            },
            summary: {
                uiLogsCount: uiLogs.length,
                maxUiLogs: MAX_UI_LOGS,
                logsDirectory: LOGS_DIR
            }
        });
    } catch (error) {
        console.error('Error getting logs summary:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get logs summary',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Delete all logs (both UI and disk logs)
 * DELETE /api/logs
 */
router.delete('/', async (req, res) => {
    try {
        // Clear in-memory UI logs
        uiLogs.length = 0;
        
        // Clear disk logs by truncating the file
        try {
            await fs.writeFile(CLIENT_LOGS_FILE, '', 'utf8');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                // Only throw if it's not a "file not found" error
                throw error;
            }
            // File doesn't exist, which is fine for deletion
        }
        
        res.json({ 
            success: true, 
            message: 'All logs cleared successfully',
            cleared: {
                uiLogs: true,
                diskLogs: true
            }
        });
        
    } catch (error) {
        console.error('Error clearing logs:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to clear logs',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;
