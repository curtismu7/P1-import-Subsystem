#!/usr/bin/env node

/**
 * Server Daemon Manager
 * 
 * Provides daemon-like functionality for the PingOne Import Tool server
 * with process management, monitoring, and automatic restart capabilities.
 * 
 * Features:
 * - Start/stop/restart daemon
 * - Process monitoring and health checks
 * - Automatic restart on failure
 * - Log rotation and management
 * - Status reporting
 * - Signal handling
 */

import { spawn, exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ServerDaemon {
    constructor(options = {}) {
        this.options = {
            name: 'pingone-import-server',
            pidFile: path.join(process.cwd(), 'daemon.pid'),
            logFile: path.join(process.cwd(), 'logs', 'daemon.log'),
            errorFile: path.join(process.cwd(), 'logs', 'daemon-error.log'),
            serverScript: path.join(process.cwd(), 'server.js'),
            port: process.env.PORT || 4000,
            autoRestart: true,
            maxRestarts: 10,
            restartDelay: 5000,
            healthCheckInterval: 30000,
            logRotationSize: 10 * 1024 * 1024, // 10MB
            maxLogFiles: 5,
            ...options
        };
        
        this.serverProcess = null;
        this.restartCount = 0;
        this.isRunning = false;
        this.healthCheckTimer = null;
        this.lastHealthCheck = null;
    }
    
    /**
     * Start the daemon
     */
    async start() {
        try {
            console.log(`🚀 Starting ${this.options.name} daemon...`);
            
            // Check if already running
            if (await this.isAlreadyRunning()) {
                console.log('⚠️ Daemon is already running');
                return;
            }
            
            // Ensure directories exist
            await this.ensureDirectories();
            
            // Start server process
            await this.startServerProcess();
            
            // Save daemon PID
            await this.saveDaemonPid();
            
            // Start monitoring
            this.startMonitoring();
            
            // Setup signal handlers
            this.setupSignalHandlers();
            
            console.log(`✅ Daemon started successfully`);
            console.log(`   Name: ${this.options.name}`);
            console.log(`   PID: ${process.pid}`);
            console.log(`   Server PID: ${this.serverProcess.pid}`);
            console.log(`   Port: ${this.options.port}`);
            console.log(`   Logs: ${this.options.logFile}`);
            
            // Keep daemon running
            this.keepAlive();
            
        } catch (error) {
            console.error('❌ Failed to start daemon:', error.message);
            process.exit(1);
        }
    }
    
    /**
     * Stop the daemon
     */
    async stop() {
        try {
            console.log('🛑 Stopping daemon...');
            
            this.isRunning = false;
            
            // Stop health monitoring
            if (this.healthCheckTimer) {
                clearInterval(this.healthCheckTimer);
            }
            
            // Stop server process
            if (this.serverProcess) {
                await this.stopServerProcess();
            }
            
            // Remove PID file
            await this.removePidFile();
            
            console.log('✅ Daemon stopped successfully');
            
        } catch (error) {
            console.error('❌ Failed to stop daemon:', error.message);
        }
    }
    
    /**
     * Restart the daemon
     */
    async restart() {
        console.log('🔄 Restarting daemon...');
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.start();
    }
    
    /**
     * Get daemon status
     */
    async status() {
        try {
            const daemonPid = await this.getDaemonPid();
            const isDaemonRunning = daemonPid ? await this.isProcessRunning(daemonPid) : false;
            
            console.log(`📊 Daemon Status:`);
            console.log(`   Name: ${this.options.name}`);
            console.log(`   Running: ${isDaemonRunning ? '✅ Yes' : '❌ No'}`);
            console.log(`   Daemon PID: ${daemonPid || 'N/A'}`);
            console.log(`   Server PID: ${this.serverProcess?.pid || 'N/A'}`);
            console.log(`   Port: ${this.options.port}`);
            console.log(`   Restart Count: ${this.restartCount}`);
            console.log(`   Last Health Check: ${this.lastHealthCheck || 'N/A'}`);
            
            if (isDaemonRunning) {
                const health = await this.checkServerHealth();
                console.log(`   Server Health: ${health ? '✅ Healthy' : '❌ Unhealthy'}`);
            }
            
        } catch (error) {
            console.error('❌ Failed to get status:', error.message);
        }
    }
    
    /**
     * Start server process
     */
    async startServerProcess() {
        console.log('   Starting server process...');
        
        // Rotate logs if needed
        await this.rotateLogs();
        
        // Open log files
        const logFile = await fs.open(this.options.logFile, 'a');
        const errorFile = await fs.open(this.options.errorFile, 'a');
        
        // Spawn server process
        this.serverProcess = spawn('node', [
            '--experimental-modules',
            '--experimental-json-modules',
            this.options.serverScript
        ], {
            detached: false, // Keep attached to daemon
            stdio: ['ignore', logFile.fd, errorFile.fd],
            env: {
                ...process.env,
                PORT: this.options.port,
                NODE_ENV: process.env.NODE_ENV || 'production',
                DAEMON_MODE: 'true'
            }
        });
        
        // Setup process event handlers
        this.serverProcess.on('error', (error) => {
            console.error('❌ Server process error:', error.message);
            this.handleServerExit(1);
        });
        
        this.serverProcess.on('exit', (code, signal) => {
            console.log(`🔄 Server process exited: code=${code}, signal=${signal}`);
            this.handleServerExit(code);
        });
        
        this.isRunning = true;
        
        // Wait a moment for server to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log(`   Server process started with PID: ${this.serverProcess.pid}`);
    }
    
    /**
     * Stop server process
     */
    async stopServerProcess() {
        if (!this.serverProcess) return;
        
        console.log('   Stopping server process...');
        
        // Send SIGTERM for graceful shutdown
        this.serverProcess.kill('SIGTERM');
        
        // Wait for graceful shutdown
        const exited = await this.waitForProcessExit(this.serverProcess.pid, 10000);
        
        if (!exited) {
            console.log('   Forcing server shutdown...');
            this.serverProcess.kill('SIGKILL');
            await this.waitForProcessExit(this.serverProcess.pid, 5000);
        }
        
        this.serverProcess = null;
    }
    
    /**
     * Handle server process exit
     */
    async handleServerExit(exitCode) {
        if (!this.isRunning) return;
        
        console.log(`⚠️ Server process exited with code: ${exitCode}`);
        
        // Auto-restart if enabled
        if (this.options.autoRestart && this.restartCount < this.options.maxRestarts) {
            this.restartCount++;
            console.log(`🔄 Auto-restarting server (${this.restartCount}/${this.options.maxRestarts})...`);
            
            setTimeout(async () => {
                try {
                    await this.startServerProcess();
                } catch (error) {
                    console.error('❌ Auto-restart failed:', error.message);
                }
            }, this.options.restartDelay);
        } else {
            console.log('❌ Max restarts reached or auto-restart disabled');
            this.isRunning = false;
        }
    }
    
    /**
     * Start monitoring
     */
    startMonitoring() {
        console.log('   Starting health monitoring...');
        
        this.healthCheckTimer = setInterval(async () => {
            try {
                const isHealthy = await this.checkServerHealth();
                this.lastHealthCheck = new Date().toISOString();
                
                if (!isHealthy && this.isRunning) {
                    console.log('⚠️ Health check failed - server may be unresponsive');
                    
                    // Restart if server is unresponsive
                    if (this.options.autoRestart) {
                        console.log('🔄 Restarting unresponsive server...');
                        await this.stopServerProcess();
                        await this.startServerProcess();
                    }
                }
            } catch (error) {
                console.error('❌ Health check error:', error.message);
            }
        }, this.options.healthCheckInterval);
    }
    
    /**
     * Check server health
     */
    async checkServerHealth() {
        try {
            const response = await fetch(`http://localhost:${this.options.port}/api/health`, {
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Setup signal handlers
     */
    setupSignalHandlers() {
        const gracefulShutdown = async (signal) => {
            console.log(`\\n🛑 Received ${signal}, shutting down gracefully...`);
            await this.stop();
            process.exit(0);
        };
        
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
        
        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            console.error('❌ Uncaught exception in daemon:', error);
            await this.stop();
            process.exit(1);
        });
        
        process.on('unhandledRejection', async (reason) => {
            console.error('❌ Unhandled rejection in daemon:', reason);
            await this.stop();
            process.exit(1);
        });
    }
    
    /**
     * Keep daemon alive
     */
    keepAlive() {
        // Keep the daemon process running
        const keepAliveInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(keepAliveInterval);
                process.exit(0);
            }
        }, 1000);
    }
    
    /**
     * Utility methods
     */
    async isAlreadyRunning() {
        const pid = await this.getDaemonPid();
        return pid ? await this.isProcessRunning(pid) : false;
    }
    
    async getDaemonPid() {
        try {
            const pidContent = await fs.readFile(this.options.pidFile, 'utf8');
            return parseInt(pidContent.trim(), 10);
        } catch (error) {
            return null;
        }
    }
    
    async saveDaemonPid() {
        await fs.writeFile(this.options.pidFile, process.pid.toString(), 'utf8');
    }
    
    async removePidFile() {
        try {
            await fs.unlink(this.options.pidFile);
        } catch (error) {
            // Ignore if file doesn't exist
        }
    }
    
    async isProcessRunning(pid) {
        try {
            process.kill(pid, 0);
            return true;
        } catch (error) {
            return false;
        }
    }
    
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
    
    async ensureDirectories() {
        const logDir = path.dirname(this.options.logFile);
        await fs.mkdir(logDir, { recursive: true });
    }
    
    async rotateLogs() {
        try {
            const stats = await fs.stat(this.options.logFile);
            if (stats.size > this.options.logRotationSize) {
                // Rotate log files
                for (let i = this.options.maxLogFiles - 1; i > 0; i--) {
                    const oldFile = `${this.options.logFile}.${i}`;
                    const newFile = `${this.options.logFile}.${i + 1}`;
                    
                    try {
                        await fs.rename(oldFile, newFile);
                    } catch (error) {
                        // Ignore if file doesn't exist
                    }
                }
                
                await fs.rename(this.options.logFile, `${this.options.logFile}.1`);
            }
        } catch (error) {
            // Ignore if log file doesn't exist yet
        }
    }
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2] || 'start';
    const daemon = new ServerDaemon();
    
    switch (command) {
        case 'start':
            await daemon.start();
            break;
        case 'stop':
            await daemon.stop();
            break;
        case 'restart':
            await daemon.restart();
            break;
        case 'status':
            await daemon.status();
            break;
        default:
            console.log('Usage: node daemon.js [start|stop|restart|status]');
            console.log('');
            console.log('Commands:');
            console.log('  start   - Start the daemon');
            console.log('  stop    - Stop the daemon');
            console.log('  restart - Restart the daemon');
            console.log('  status  - Show daemon status');
            process.exit(1);
    }
}

export default ServerDaemon;