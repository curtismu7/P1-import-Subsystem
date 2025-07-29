#!/usr/bin/env node

/**
 * Background Server Starter
 * 
 * Starts the PingOne Import Tool server in the background with proper
 * process management, logging, and monitoring capabilities.
 * 
 * Features:
 * - Detached background process
 * - PID file management
 * - Log file redirection
 * - Process monitoring
 * - Graceful shutdown handling
 * - Auto-restart on crash (optional)
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BackgroundServerManager {
    constructor(options = {}) {
        this.options = {
            pidFile: options.pidFile || path.join(process.cwd(), 'server.pid'),
            logFile: options.logFile || path.join(process.cwd(), 'logs', 'server-background.log'),
            errorFile: options.errorFile || path.join(process.cwd(), 'logs', 'server-error.log'),
            autoRestart: options.autoRestart || false,
            maxRestarts: options.maxRestarts || 5,
            restartDelay: options.restartDelay || 5000,
            port: options.port || process.env.PORT || 4000,
            ...options
        };
        
        this.restartCount = 0;
        this.isShuttingDown = false;
    }
    
    /**
     * Start the server in background
     */
    async start() {
        try {
            console.log('🚀 Starting PingOne Import Tool server in background...');
            
            // Check if server is already running
            const isRunning = await this.isServerRunning();
            if (isRunning) {
                console.log('⚠️ Server is already running');
                const pid = await this.getPid();
                console.log(`   PID: ${pid}`);
                console.log(`   Port: ${this.options.port}`);
                return;
            }
            
            // Ensure log directory exists
            await this.ensureLogDirectory();
            
            // Start the server process
            const serverProcess = await this.spawnServerProcess();
            
            // Save PID
            await this.savePid(serverProcess.pid);
            
            // Setup process monitoring
            this.setupProcessMonitoring(serverProcess);
            
            console.log('✅ Server started successfully in background');
            console.log(`   PID: ${serverProcess.pid}`);
            console.log(`   Port: ${this.options.port}`);
            console.log(`   Logs: ${this.options.logFile}`);
            console.log(`   Errors: ${this.options.errorFile}`);
            console.log(`   PID File: ${this.options.pidFile}`);
            
            // Setup graceful shutdown handlers
            this.setupShutdownHandlers();
            
        } catch (error) {
            console.error('❌ Failed to start server in background:', error.message);
            process.exit(1);
        }
    }
    
    /**
     * Stop the background server
     */
    async stop() {
        try {
            console.log('🛑 Stopping background server...');
            
            const pid = await this.getPid();
            if (!pid) {
                console.log('⚠️ No server PID found - server may not be running');
                return;
            }
            
            // Send SIGTERM for graceful shutdown
            console.log(`   Sending SIGTERM to process ${pid}...`);
            process.kill(pid, 'SIGTERM');
            
            // Wait for graceful shutdown
            await this.waitForProcessExit(pid, 10000);
            
            // Force kill if still running
            if (await this.isProcessRunning(pid)) {
                console.log('   Forcing shutdown with SIGKILL...');
                process.kill(pid, 'SIGKILL');
                await this.waitForProcessExit(pid, 5000);
            }
            
            // Clean up PID file
            await this.removePidFile();
            
            console.log('✅ Server stopped successfully');
            
        } catch (error) {
            console.error('❌ Failed to stop server:', error.message);
            process.exit(1);
        }
    }
    
    /**
     * Restart the background server
     */
    async restart() {
        console.log('🔄 Restarting background server...');
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        await this.start();
    }
    
    /**
     * Get server status
     */
    async status() {
        try {
            const pid = await this.getPid();
            const isRunning = await this.isServerRunning();
            
            console.log('📊 Server Status:');
            console.log(`   Running: ${isRunning ? '✅ Yes' : '❌ No'}`);
            console.log(`   PID: ${pid || 'N/A'}`);
            console.log(`   Port: ${this.options.port}`);
            console.log(`   PID File: ${this.options.pidFile}`);
            console.log(`   Log File: ${this.options.logFile}`);
            
            if (isRunning) {
                // Check if server is responding
                const isResponding = await this.checkServerHealth();
                console.log(`   Health: ${isResponding ? '✅ Healthy' : '⚠️ Not responding'}`);
            }
            
        } catch (error) {
            console.error('❌ Failed to get server status:', error.message);
        }
    }
    
    /**
     * Spawn the server process
     */
    async spawnServerProcess() {
        const serverScript = path.join(process.cwd(), 'server-simplified.js');
        
        // Open log files
        const logFile = await fs.open(this.options.logFile, 'a');
        const errorFile = await fs.open(this.options.errorFile, 'a');
        
        // Spawn detached process
        const serverProcess = spawn('node', [
            '--experimental-modules',
            '--experimental-json-modules',
            serverScript
        ], {
            detached: true,
            stdio: ['ignore', logFile.fd, errorFile.fd],
            env: {
                ...process.env,
                PORT: this.options.port,
                NODE_ENV: process.env.NODE_ENV || 'production'
            }
        });
        
        // Unref so parent can exit
        serverProcess.unref();
        
        return serverProcess;
    }
    
    /**
     * Setup process monitoring
     */
    setupProcessMonitoring(serverProcess) {
        serverProcess.on('error', (error) => {
            console.error('❌ Server process error:', error.message);
            this.handleProcessExit(1);
        });
        
        serverProcess.on('exit', (code, signal) => {
            console.log(`🔄 Server process exited with code ${code}, signal ${signal}`);
            this.handleProcessExit(code);
        });
    }
    
    /**
     * Handle process exit
     */
    async handleProcessExit(exitCode) {
        if (this.isShuttingDown) {
            return;
        }
        
        // Clean up PID file
        await this.removePidFile();
        
        // Auto-restart if enabled and not too many restarts
        if (this.options.autoRestart && this.restartCount < this.options.maxRestarts) {
            this.restartCount++;
            console.log(`🔄 Auto-restarting server (attempt ${this.restartCount}/${this.options.maxRestarts})...`);
            
            setTimeout(async () => {
                try {
                    await this.start();
                } catch (error) {
                    console.error('❌ Auto-restart failed:', error.message);
                }
            }, this.options.restartDelay);
        } else {
            console.log('❌ Server stopped and will not auto-restart');
        }
    }
    
    /**
     * Setup graceful shutdown handlers
     */
    setupShutdownHandlers() {
        const shutdown = async (signal) => {
            console.log(`\\n🛑 Received ${signal}, shutting down gracefully...`);
            this.isShuttingDown = true;
            await this.stop();
            process.exit(0);
        };
        
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGHUP', () => shutdown('SIGHUP'));
    }
    
    /**
     * Check if server is running
     */
    async isServerRunning() {
        try {
            const pid = await this.getPid();
            return pid ? await this.isProcessRunning(pid) : false;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Check if process is running
     */
    async isProcessRunning(pid) {
        try {
            process.kill(pid, 0); // Signal 0 checks if process exists
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get PID from file
     */
    async getPid() {
        try {
            const pidContent = await fs.readFile(this.options.pidFile, 'utf8');
            return parseInt(pidContent.trim(), 10);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Save PID to file
     */
    async savePid(pid) {
        await fs.writeFile(this.options.pidFile, pid.toString(), 'utf8');
    }
    
    /**
     * Remove PID file
     */
    async removePidFile() {
        try {
            await fs.unlink(this.options.pidFile);
        } catch (error) {
            // Ignore if file doesn't exist
        }
    }
    
    /**
     * Ensure log directory exists
     */
    async ensureLogDirectory() {
        const logDir = path.dirname(this.options.logFile);
        await fs.mkdir(logDir, { recursive: true });
    }
    
    /**
     * Wait for process to exit
     */
    async waitForProcessExit(pid, timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (!(await this.isProcessRunning(pid))) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return false;
    }
    
    /**
     * Check server health
     */
    async checkServerHealth() {
        try {
            const response = await fetch(`http://localhost:${this.options.port}/api/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2] || 'start';
    const manager = new BackgroundServerManager();
    
    switch (command) {
        case 'start':
            await manager.start();
            break;
        case 'stop':
            await manager.stop();
            break;
        case 'restart':
            await manager.restart();
            break;
        case 'status':
            await manager.status();
            break;
        default:
            console.log('Usage: node start-background.js [start|stop|restart|status]');
            process.exit(1);
    }
}

export default BackgroundServerManager;