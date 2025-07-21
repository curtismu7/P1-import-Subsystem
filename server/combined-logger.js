/**
 * Combined Logger
 * 
 * Handles combining client and server logs into a unified combined.log file
 * and ensures proper separation of client.log and server.log files.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGS_DIR = path.join(__dirname, '../logs');
const CLIENT_LOGS_FILE = path.join(LOGS_DIR, 'client.log');
const SERVER_LOGS_FILE = path.join(LOGS_DIR, 'server.log');
const COMBINED_LOGS_FILE = path.join(LOGS_DIR, 'combined.log');

/**
 * Ensure logs directory exists
 */
async function ensureLogsDir() {
    try {
        await fs.mkdir(LOGS_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating logs directory:', error);
    }
}

/**
 * Write to client log file
 */
export async function writeClientLog(logEntry) {
    try {
        await ensureLogsDir();
        
        const clientEntry = {
            ...logEntry,
            source: 'client',
            timestamp: logEntry.timestamp || new Date().toISOString()
        };
        
        // Write to client.log
        await fs.appendFile(
            CLIENT_LOGS_FILE,
            JSON.stringify(clientEntry) + '\n',
            'utf8'
        );
        
        // Write to combined.log
        await fs.appendFile(
            COMBINED_LOGS_FILE,
            JSON.stringify(clientEntry) + '\n',
            'utf8'
        );
        
        return true;
    } catch (error) {
        console.error('Error writing client log:', error);
        return false;
    }
}

/**
 * Write to server log file
 */
export async function writeServerLog(logEntry) {
    try {
        await ensureLogsDir();
        
        const serverEntry = {
            ...logEntry,
            source: 'server',
            timestamp: logEntry.timestamp || new Date().toISOString()
        };
        
        // Write to server.log
        await fs.appendFile(
            SERVER_LOGS_FILE,
            JSON.stringify(serverEntry) + '\n',
            'utf8'
        );
        
        // Write to combined.log
        await fs.appendFile(
            COMBINED_LOGS_FILE,
            JSON.stringify(serverEntry) + '\n',
            'utf8'
        );
        
        return true;
    } catch (error) {
        console.error('Error writing server log:', error);
        return false;
    }
}

/**
 * Read logs from a specific file
 */
export async function readLogs(logFile, options = {}) {
    try {
        const { limit = 100, offset = 0 } = options;
        
        const filePath = path.join(LOGS_DIR, logFile);
        const data = await fs.readFile(filePath, 'utf8');
        
        const lines = data.trim().split('\n').filter(line => line.trim());
        const logs = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch (error) {
                return { message: line, timestamp: new Date().toISOString(), level: 'info' };
            }
        });
        
        // Apply pagination
        const startIndex = Math.max(0, logs.length - limit - offset);
        const endIndex = logs.length - offset;
        
        return logs.slice(startIndex, endIndex).reverse(); // Most recent first
    } catch (error) {
        if (error.code === 'ENOENT') {
            return []; // File doesn't exist yet
        }
        throw error;
    }
}

/**
 * Get combined logs
 */
export async function getCombinedLogs(options = {}) {
    return await readLogs('combined.log', options);
}

/**
 * Get client logs
 */
export async function getClientLogs(options = {}) {
    return await readLogs('client.log', options);
}

/**
 * Get server logs
 */
export async function getServerLogs(options = {}) {
    return await readLogs('server.log', options);
}

/**
 * Clear all log files
 */
export async function clearAllLogs() {
    try {
        await ensureLogsDir();
        
        const logFiles = [CLIENT_LOGS_FILE, SERVER_LOGS_FILE, COMBINED_LOGS_FILE];
        
        for (const file of logFiles) {
            try {
                await fs.writeFile(file, '', 'utf8');
            } catch (error) {
                // Ignore if file doesn't exist
                if (error.code !== 'ENOENT') {
                    console.error(`Error clearing ${file}:`, error);
                }
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error clearing logs:', error);
        return false;
    }
}

/**
 * Get log file stats
 */
export async function getLogStats() {
    try {
        await ensureLogsDir();
        
        const stats = {};
        const logFiles = ['client.log', 'server.log', 'combined.log'];
        
        for (const file of logFiles) {
            try {
                const filePath = path.join(LOGS_DIR, file);
                const stat = await fs.stat(filePath);
                const data = await fs.readFile(filePath, 'utf8');
                const lineCount = data.trim().split('\n').filter(line => line.trim()).length;
                
                stats[file] = {
                    size: stat.size,
                    modified: stat.mtime,
                    lines: lineCount
                };
            } catch (error) {
                if (error.code === 'ENOENT') {
                    stats[file] = {
                        size: 0,
                        modified: null,
                        lines: 0
                    };
                } else {
                    throw error;
                }
            }
        }
        
        return stats;
    } catch (error) {
        console.error('Error getting log stats:', error);
        return {};
    }
}

export default {
    writeClientLog,
    writeServerLog,
    readLogs,
    getCombinedLogs,
    getClientLogs,
    getServerLogs,
    clearAllLogs,
    getLogStats
};