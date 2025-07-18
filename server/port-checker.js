// File: server/port-checker.js
// Description: Utility for checking port availability and handling port conflicts
// 
// This module provides functions to:
// - Check if a port is available
// - Find an available port in a range
// - Kill processes using a specific port
// - Provide user-friendly error messages and solutions

import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';

const execAsync = promisify(exec);

/**
 * Check if a port is available by attempting to bind to it
 * @param {number} port - Port number to check
 * @param {string} host - Host to bind to (default: '127.0.0.1')
 * @returns {Promise<boolean>} - True if port is available, false otherwise
 */
export async function isPortAvailable(port, host = '127.0.0.1') {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.listen(port, host, () => {
            server.once('close', () => {
                resolve(true);
            });
            server.close();
        });
        
        server.on('error', () => {
            resolve(false);
        });
    });
}

/**
 * Find an available port starting from the given port
 * @param {number} startPort - Starting port number
 * @param {number} maxAttempts - Maximum number of ports to try (default: 10)
 * @returns {Promise<number>} - Available port number
 * @throws {Error} - If no available port found
 */
export async function findAvailablePort(startPort, maxAttempts = 10) {
    for (let port = startPort; port < startPort + maxAttempts; port++) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

/**
 * Get process information for a port (Unix/Linux/macOS)
 * @param {number} port - Port number
 * @returns {Promise<Array>} - Array of process information
 */
export async function getProcessesUsingPort(port) {
    try {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        if (!stdout.trim()) {
            return [];
        }
        
        const pids = stdout.trim().split('\n').filter(pid => pid);
        const processes = [];
        
        for (const pid of pids) {
            try {
                const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o pid,ppid,command --no-headers`);
                if (psOutput.trim()) {
                    const [pidInfo, ppid, ...commandParts] = psOutput.trim().split(/\s+/);
                    processes.push({
                        pid: parseInt(pidInfo),
                        ppid: parseInt(ppid),
                        command: commandParts.join(' ')
                    });
                }
            } catch (error) {
                // Process might have terminated
                processes.push({ pid: parseInt(pid), ppid: null, command: 'Unknown' });
            }
        }
        
        return processes;
    } catch (error) {
        return [];
    }
}

/**
 * Kill processes using a specific port
 * @param {number} port - Port number
 * @param {boolean} force - Force kill (default: false)
 * @returns {Promise<boolean>} - True if processes were killed, false otherwise
 */
export async function killProcessesUsingPort(port, force = false) {
    try {
        const processes = await getProcessesUsingPort(port);
        if (processes.length === 0) {
            return false;
        }
        
        const signal = force ? '-9' : '-15';
        const pids = processes.map(p => p.pid).join(' ');
        
        await execAsync(`kill ${signal} ${pids}`);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Generate user-friendly port conflict error message
 * @param {number} port - Port number
 * @param {Array} processes - Array of processes using the port
 * @returns {string} - Formatted error message
 */
export function generatePortConflictMessage(port, processes = []) {
    let message = `\n❌ Port ${port} is already in use!\n\n`;
    
    if (processes.length > 0) {
        message += `Processes using port ${port}:\n`;
        processes.forEach(process => {
            message += `  PID ${process.pid}: ${process.command}\n`;
        });
        message += '\n';
    }
    
    message += `Solutions:\n`;
    message += `  1. Kill the process: lsof -ti:${port} | xargs kill -9\n`;
    message += `  2. Use a different port: PORT=${port + 1} node server.js\n`;
    message += `  3. Wait a moment and try again\n`;
    message += `  4. Check if another instance is running\n\n`;
    
    return message;
}

/**
 * Attempt to resolve port conflict automatically
 * @param {number} port - Port number
 * @param {Object} options - Options for resolution
 * @returns {Promise<number>} - Available port number
 */
export async function resolvePortConflict(port, options = {}) {
    const {
        autoKill = false,
        findAlternative = true,
        maxAttempts = 10
    } = options;
    
    // Try to kill processes if autoKill is enabled
    if (autoKill) {
        const killed = await killProcessesUsingPort(port, true);
        if (killed) {
            // Wait a moment for processes to terminate
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if port is now available
            if (await isPortAvailable(port)) {
                return port;
            }
        }
    }
    
    // Find alternative port if enabled
    if (findAlternative) {
        try {
            return await findAvailablePort(port + 1, maxAttempts);
        } catch (error) {
            throw new Error(`Could not resolve port conflict for port ${port}`);
        }
    }
    
    throw new Error(`Port ${port} is not available`);
}

/**
 * Comprehensive port availability check with detailed reporting
 * @param {number} port - Port number to check
 * @returns {Promise<Object>} - Detailed port status information
 */
export async function checkPortStatus(port) {
    const isAvailable = await isPortAvailable(port);
    const processes = isAvailable ? [] : await getProcessesUsingPort(port);
    
    return {
        port,
        isAvailable,
        processes,
        message: isAvailable ? 
            `Port ${port} is available` : 
            generatePortConflictMessage(port, processes)
    };
}

/**
 * Wait for a port to become available
 * @param {number} port - Port number
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @param {number} interval - Check interval in milliseconds (default: 1000)
 * @returns {Promise<boolean>} - True if port became available, false if timeout
 */
export async function waitForPort(port, timeout = 30000, interval = 1000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        if (await isPortAvailable(port)) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return false;
} 