/**
 * Debug Log API Endpoint
 * 
 * Handles debug log entries from the client-side and writes them to the debug.log file.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Debug log file path
const DEBUG_LOG_FILE = path.join(process.cwd(), 'logs', 'debug.log');

// Ensure logs directory exists
function ensureLogDirectory() {
    const logDir = path.dirname(DEBUG_LOG_FILE);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
}

// POST endpoint to receive debug log entries from client
router.post('/', express.json(), (req, res) => {
    try {
        const { entry } = req.body;
        
        if (!entry) {
            return res.status(400).json({ error: 'Log entry is required' });
        }
        
        // Ensure log directory exists
        ensureLogDirectory();
        
        // Write to debug log file
        fs.appendFileSync(DEBUG_LOG_FILE, entry);
        
        res.json({ success: true, message: 'Debug log entry written' });
        
    } catch (error) {
        console.error('Failed to write debug log entry:', error);
        res.status(500).json({ error: 'Failed to write debug log entry' });
    }
});

// GET endpoint to retrieve debug log entries
router.get('/', (req, res) => {
    try {
        const { lines = 100, filter } = req.query;
        
        if (!fs.existsSync(DEBUG_LOG_FILE)) {
            return res.json({ entries: [], message: 'Debug log file not found' });
        }
        
        // Read the log file
        const logContent = fs.readFileSync(DEBUG_LOG_FILE, 'utf8');
        const logLines = logContent.split('\n').filter(line => line.trim());
        
        // Apply filter if provided
        let filteredLines = logLines;
        if (filter) {
            filteredLines = logLines.filter(line => 
                line.toLowerCase().includes(filter.toLowerCase())
            );
        }
        
        // Get the last N lines
        const recentLines = filteredLines.slice(-parseInt(lines));
        
        res.json({ 
            entries: recentLines,
            total: filteredLines.length,
            showing: recentLines.length
        });
        
    } catch (error) {
        console.error('Failed to read debug log:', error);
        res.status(500).json({ error: 'Failed to read debug log' });
    }
});

// GET endpoint for file access (what the client is actually requesting)
router.get('/file', (req, res) => {
    try {
        const { lines = 100, filter } = req.query;
        
        if (!fs.existsSync(DEBUG_LOG_FILE)) {
            return res.json({ entries: [], message: 'Debug log file not found' });
        }
        
        // Read the log file
        const logContent = fs.readFileSync(DEBUG_LOG_FILE, 'utf8');
        const logLines = logContent.split('\n').filter(line => line.trim());
        
        // Apply filter if provided
        let filteredLines = logLines;
        if (filter) {
            filteredLines = logLines.filter(line => 
                line.toLowerCase().includes(filter.toLowerCase())
            );
        }
        
        // Get the last N lines
        const recentLines = filteredLines.slice(-parseInt(lines));
        
        res.json({ 
            entries: recentLines,
            total: filteredLines.length,
            showing: recentLines.length,
            file: DEBUG_LOG_FILE
        });
        
    } catch (error) {
        console.error('Failed to read debug log file:', error);
        res.status(500).json({ error: 'Failed to read debug log file' });
    }
});

// POST endpoint for file access (what the client is actually requesting)
router.post('/file', express.json(), (req, res) => {
    try {
        const { entry, content, filename, sessionId } = req.body;
        
        // Handle both old format (entry) and new format (content)
        const logContent = content || entry;
        
        if (!logContent) {
            return res.status(400).json({ error: 'Log content is required (entry or content field)' });
        }
        
        // Ensure log directory exists
        ensureLogDirectory();
        
        // Determine target file based on filename parameter or use default
        let targetFile = DEBUG_LOG_FILE;
        if (filename && filename !== 'debug.log') {
            targetFile = path.join(process.cwd(), 'logs', filename);
        }
        
        // Format log entry with timestamp and session info if provided
        let formattedEntry = logContent;
        if (sessionId) {
            const timestamp = new Date().toISOString();
            formattedEntry = `[${timestamp}] [${sessionId}] ${logContent}`;
        }
        
        // Ensure newline at end if not present
        if (!formattedEntry.endsWith('\n')) {
            formattedEntry += '\n';
        }
        
        // Write to debug log file
        fs.appendFileSync(targetFile, formattedEntry);
        
        res.json({ 
            success: true, 
            message: 'Debug log entry written to file',
            file: targetFile,
            sessionId: sessionId
        });
        
    } catch (error) {
        console.error('Failed to write debug log entry to file:', error);
        res.status(500).json({ error: 'Failed to write debug log entry to file' });
    }
});

// DELETE endpoint to clear debug log
router.delete('/', (req, res) => {
    try {
        if (fs.existsSync(DEBUG_LOG_FILE)) {
            fs.writeFileSync(DEBUG_LOG_FILE, '');
        }
        
        res.json({ success: true, message: 'Debug log cleared' });
        
    } catch (error) {
        console.error('Failed to clear debug log:', error);
        res.status(500).json({ error: 'Failed to clear debug log' });
    }
});

export default router;