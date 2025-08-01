import { Router } from 'express';
import loggerUtil from '../../server/combined-logger.js';
const { writeClientLog } = loggerUtil;

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

// Export the router for use in other modules
export { router };
