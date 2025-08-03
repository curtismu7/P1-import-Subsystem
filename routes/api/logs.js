import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
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
 * @swagger
 * /api/logs:
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
        
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Error processing log from client', { error });
        res.status(500).json({ error: 'Failed to process log' });
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
        const logDir = path.join(__dirname, '../../logs');
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
        
        res.json({
            success: true,
            logs: limitedLogs,
            total: allLogs.length,
            limit: logLimit,
            filtered: !!level
        });
        
    } catch (error) {
        logger.error('Error retrieving logs for UI', { error: error.message });
        res.status(500).json({ 
            success: false,
            error: 'Failed to retrieve logs',
            message: error.message 
        });
    }
});

// Export the router for use in other modules
export default router;
