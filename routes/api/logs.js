/**
 * Client-side Logging API Endpoint
 * 
 * Handles log entries from the client-side logger and writes them to the appropriate log files.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Ensure logs directory exists
function ensureLogDirectory() {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
}

// POST endpoint to receive log entries from the client
router.post('/', express.json(), (req, res) => {
    try {
        const { level, message, data, sessionId } = req.body;

        if (!level || !message) {
            return res.status(400).json({ error: 'Log level and message are required' });
        }

        ensureLogDirectory();

        const logFile = path.join(process.cwd(), 'logs', 'client-side.log');
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${sessionId || 'unknown'}] [${level.toUpperCase()}] ${message} | Data: ${JSON.stringify(data || {})}\n`;

        fs.appendFileSync(logFile, logEntry);

        res.status(200).json({ success: true, message: 'Log entry written' });

    } catch (error) {
        console.error('Failed to write client-side log entry:', error);
        // Don't send a response that could trigger another log event, causing a loop
        res.status(500).json({ error: 'Failed to write log entry' });
    }
});

// POST endpoint alias for client logging (some client code uses /client path)
router.post('/client', express.json(), (req, res) => {
    try {
        const { level, message, data, sessionId } = req.body;

        if (!level || !message) {
            return res.status(400).json({ error: 'Log level and message are required' });
        }

        ensureLogDirectory();

        const logFile = path.join(process.cwd(), 'logs', 'client-side.log');
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${sessionId || 'unknown'}] [${level.toUpperCase()}] ${message} | Data: ${JSON.stringify(data || {})}
`;

        fs.appendFileSync(logFile, logEntry);

        res.status(200).json({ success: true, message: 'Log entry written' });

    } catch (error) {
        console.error('Failed to write client-side log entry:', error);
        res.status(500).json({ error: 'Failed to write log entry' });
    }
});

// POST endpoint for UI logging (some client code posts to /ui)
router.post('/ui', express.json(), (req, res) => {
    try {
        const { level, message, data, sessionId, source } = req.body;

        if (!level || !message) {
            return res.status(400).json({ error: 'Log level and message are required' });
        }

        ensureLogDirectory();

        const logFile = path.join(process.cwd(), 'logs', 'client-side.log');
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${sessionId || 'unknown'}] [${level.toUpperCase()}] ${message} | Data: ${JSON.stringify(data || {})}
`;

        fs.appendFileSync(logFile, logEntry);

        res.status(200).json({ success: true, message: 'Log entry written' });

    } catch (error) {
        console.error('Failed to write client-side log entry:', error);
        res.status(500).json({ error: 'Failed to write log entry' });
    }
});

// GET endpoint to retrieve client-side logs for UI display
router.get('/ui', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logFile = path.join(process.cwd(), 'logs', 'client-side.log');
        
        // Check if log file exists
        if (!fs.existsSync(logFile)) {
            return res.json({
                success: true,
                logs: [],
                message: 'No client-side logs found'
            });
        }
        
        // Read log file
        const logContent = fs.readFileSync(logFile, 'utf8');
        const logLines = logContent.trim().split('\n').filter(line => line.length > 0);
        
        // Get the last 'limit' number of lines
        const recentLogs = logLines.slice(-limit).map((line, index) => {
            // Parse log line format: [timestamp] [sessionId] [level] message | Data: {...}
            const match = line.match(/^\[(.+?)\] \[(.+?)\] \[(.+?)\] (.+?) \| Data: (.+)$/);
            if (match) {
                const [, timestamp, sessionId, level, message, dataStr] = match;
                let data = {};
                try {
                    data = JSON.parse(dataStr);
                } catch (e) {
                    data = { raw: dataStr };
                }
                
                return {
                    id: index,
                    timestamp,
                    sessionId,
                    level: level.toLowerCase(),
                    message,
                    data
                };
            } else {
                // Fallback for malformed lines
                return {
                    id: index,
                    timestamp: new Date().toISOString(),
                    sessionId: 'unknown',
                    level: 'info',
                    message: line,
                    data: {}
                };
            }
        });
        
        res.json({
            success: true,
            logs: recentLogs,
            count: recentLogs.length,
            total: logLines.length
        });
        
    } catch (error) {
        console.error('Failed to retrieve client-side logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve logs',
            details: error.message
        });
    }
});

export default router;
