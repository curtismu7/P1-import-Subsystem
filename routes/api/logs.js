import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import loggerUtil from '../../server/combined-logger.js';
const { writeClientLog } = loggerUtil;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const logger = {
  info: (message, meta) => writeClientLog({ level: 'info', message, ...meta }),
  error: (message, meta) => writeClientLog({ level: 'error', message, ...meta }),
  debug: (message, meta) => writeClientLog({ level: 'debug', message, ...meta }),
  warn: (message, meta) => writeClientLog({ level: 'warn', message, ...meta })
};

/**
 * Get application logs
 */
router.get('/', async (req, res) => {
    try {
        const { level, limit = 50, offset = 0 } = req.query;
        
        // Read log files from logs directory (Winston writes under server/logs)
        const logsDir = path.join(__dirname, '../..', 'server', 'logs');
        const logFiles = ['application.log', 'combined.log', 'error.log'];
        
        let allLogs = [];
        
        for (const logFile of logFiles) {
            try {
                const logPath = path.join(logsDir, logFile);
                const logContent = await fs.readFile(logPath, 'utf8');
                const lines = logContent.split('\n').filter(line => line.trim());
                
                // Parse log lines (assuming JSON format)
                const parsedLogs = lines.map(line => {
                    try {
                        const logEntry = JSON.parse(line);
                        return {
                            timestamp: logEntry.timestamp,
                            level: logEntry.level,
                            message: logEntry.message,
                            meta: logEntry.meta || {},
                            source: logFile
                        };
                    } catch (e) {
                        // Handle non-JSON log lines
                        return {
                            timestamp: new Date().toISOString(),
                            level: 'info',
                            message: line,
                            meta: {},
                            source: logFile
                        };
                    }
                }).filter(log => !level || log.level === level);
                
                allLogs = allLogs.concat(parsedLogs);
            } catch (fileError) {
                // Log file might not exist, continue with other files
                continue;
            }
        }
        
        // Sort by timestamp (newest first)
        allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Apply pagination
        const paginatedLogs = allLogs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        
        res.success('Logs retrieved successfully', {
            logs: paginatedLogs,
            pagination: {
                total: allLogs.length,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < allLogs.length
            }
        });
        
    } catch (error) {
        logger.error('Failed to retrieve logs', { error: error.message });
        res.error('Failed to retrieve logs', {
            code: 'LOG_RETRIEVAL_ERROR',
            details: error.message
        }, 500);
    }
});

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Retrieve application logs
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [error, warn, info, debug]
 *         description: Filter logs by level
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of logs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of logs to skip
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 timestamp:
 *                   type: string
 *   post:
 *     summary: Log a message from the client
 *     tags: [Logs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               level:
 *                 type: string
 *                 enum: [error, warn, info, debug]
 *               message:
 *                 type: string
 *               meta:
 *                 type: object
 *     responses:
 *       200:
 *         description: Log received successfully
 */
router.post('/', (req, res) => {
    try {
        const { level = 'info', message, meta = {} } = req.body;
        const logMessage = `[CLIENT] ${message}`;
        
        switch (level) {
            case 'error':
                logger.error(logMessage, meta);
                break;
            case 'warn':
                logger.warn(logMessage, meta);
                break;
            case 'info':
                logger.info(logMessage, meta);
                break;
            case 'debug':
                logger.debug(logMessage, meta);
                break;
            default:
                logger.info(logMessage, meta);
        }
        
        res.success('Log received successfully', null);
    } catch (error) {
        logger.error('Error processing log from client', { error });
        res.error('Failed to process log', { code: 'CLIENT_LOG_ERROR', details: error.message }, 500);
    }
});

/**
 * @swagger
 * /api/logs/ui:
 *   get:
 *     summary: Retrieve logs for UI display
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of log entries to return
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [error, warn, info, debug]
 *         description: Filter logs by level
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       timestamp:
 *                         type: string
 *                       level:
 *                         type: string
 *                       message:
 *                         type: string
 *                       meta:
 *                         type: object
 *       500:
 *         description: Failed to retrieve logs
 */
router.get('/ui', async (req, res) => {
    try {
        const { limit = 100, level } = req.query;
        const logLimit = Math.min(parseInt(limit) || 100, 1000); // Cap at 1000
        
        // Define log file paths
        const logDir = path.join(__dirname, '../..', 'server', 'logs');
        const logFiles = [
            path.join(logDir, 'combined.log'),
            path.join(logDir, 'application.log'),
            path.join(logDir, 'error.log')
        ];
        
        let allLogs = [];
        
        // Read logs from each file
        for (const logFile of logFiles) {
            try {
                const exists = await fs.access(logFile).then(() => true).catch(() => false);
                if (!exists) continue;
                
                const content = await fs.readFile(logFile, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());
                
                // Parse log lines (assuming JSON format)
                for (const line of lines) {
                    try {
                        const logEntry = JSON.parse(line);
                        
                        // Filter by level if specified
                        if (level && logEntry.level !== level) {
                            continue;
                        }
                        
                        allLogs.push({
                            timestamp: logEntry.timestamp || new Date().toISOString(),
                            level: logEntry.level || 'info',
                            message: logEntry.message || '',
                            meta: logEntry.meta || {},
                            source: path.basename(logFile)
                        });
                    } catch (parseError) {
                        // If not JSON, treat as plain text log
                        if (line.includes('[') && (line.includes('ERROR') || line.includes('WARN') || line.includes('INFO'))) {
                            const timestamp = new Date().toISOString();
                            const logLevel = line.includes('ERROR') ? 'error' : 
                                           line.includes('WARN') ? 'warn' : 'info';
                            
                            if (!level || logLevel === level) {
                                allLogs.push({
                                    timestamp,
                                    level: logLevel,
                                    message: line,
                                    meta: {},
                                    source: path.basename(logFile)
                                });
                            }
                        }
                    }
                }
            } catch (fileError) {
                logger.warn(`Could not read log file ${logFile}`, { error: fileError.message });
            }
        }
        
        // Sort by timestamp (newest first) and limit
        allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const limitedLogs = allLogs.slice(0, logLimit);
        
        res.success('Logs retrieved successfully', {
            logs: limitedLogs,
            total: allLogs.length,
            limit: logLimit,
            filtered: !!level
        });
        
    } catch (error) {
        logger.error('Error retrieving logs for UI', { error: error.message });
        res.error('Failed to retrieve logs', {
            code: 'LOG_RETRIEVAL_ERROR',
            details: error.message
        }, 500);
    }
});

/**
 * Purge logs older than N days (default 1 day)
 * DELETE /api/logs/purge?days=1
 */
router.delete('/purge', async (req, res) => {
    try {
        const days = Math.max(1, parseInt(req.query.days || '1', 10));
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        const logsDir = path.join(__dirname, '../..', 'server', 'logs');
        const entries = await fs.readdir(logsDir).catch(() => []);
        let purged = 0;
        for (const name of entries) {
            const full = path.join(logsDir, name);
            try {
                const stat = await fs.stat(full);
                if (stat.isFile() && stat.mtimeMs < cutoff) {
                    await fs.unlink(full);
                    purged++;
                }
            } catch (_) { /* ignore */ }
        }
        return res.success('Old logs purged', { purged, days });
    } catch (err) {
        return res.error('Failed to purge logs', { code: 'LOG_PURGE_ERROR', details: err.message }, 500);
    }
});

/**
 * Download a zipped bundle of recent logs
 * GET /api/logs/bundle
 */
router.get('/bundle', async (req, res) => {
    try {
        const logsDir = path.join(__dirname, '../..', 'server', 'logs');
        const files = await fs.readdir(logsDir).catch(() => []);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="logs-${new Date().toISOString().slice(0,10)}.zip"`);

        // Lazy import archiver to avoid ESM interop issues
        const mod = await import('archiver');
        const arch = mod.default('zip', { zlib: { level: 9 } });
        arch.on('error', () => { try { res.end(); } catch (_) {} });
        arch.pipe(res);
        for (const name of files) {
            const full = path.join(logsDir, name);
            try {
                const stat = await fs.stat(full);
                if (stat.isFile()) arch.file(full, { name });
            } catch (_) { /* ignore */ }
        }
        await arch.finalize();
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Export the router for use in other modules
export default router;
