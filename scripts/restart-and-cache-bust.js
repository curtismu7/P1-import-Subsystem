#!/usr/bin/env node

/**
 * Restart and Cache Bust Script
 * 
 * This script ensures the server restarts and all caches are busted
 * so you always see the current deployment of code and UI.
 * 
 * Features:
 * - Force server restart with proper cleanup
 * - Bust browser cache with timestamp updates
 * - Clear server-side caches
 * - Update import map cache busting
 * - Clear localStorage and sessionStorage
 * - Force browser refresh
 */

import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RestartAndCacheBust {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.timestamp = Date.now();
        this.cacheBustValue = `v${this.timestamp}`;
    }

    /**
     * Main execution method
     */
    async execute() {
        console.log('🚀 Starting Restart and Cache Bust Process...');
        console.log(`⏰ Timestamp: ${new Date(this.timestamp).toISOString()}`);
        console.log(`🔢 Cache Bust Value: ${this.cacheBustValue}`);
        
        try {
            // Step 1: Stop any running server processes
            await this.stopServer();
            
            // Step 2: Clear server-side caches
            await this.clearServerCaches();
            
            // Step 3: Update cache busting in files
            await this.updateCacheBusting();
            
            // Step 4: Restart the server
            await this.restartServer();
            
            // Step 5: Generate browser refresh script
            await this.generateBrowserScript();
            
            console.log('✅ Restart and Cache Bust completed successfully!');
            console.log('🌐 Server should be running with fresh code');
            console.log('📱 Run the browser script to clear client-side caches');
            
        } catch (error) {
            console.error('❌ Error during restart and cache bust:', error.message);
            process.exit(1);
        }
    }

    /**
     * Stop any running server processes
     */
    async stopServer() {
        console.log('🛑 Stopping server processes...');
        
        try {
            // Kill any Node.js processes running the server
            const killCommands = [
                "pkill -f 'node.*server.js'",
                "pkill -f 'node.*server-fixed.js'",
                "pkill -f 'nodemon.*server.js'",
                "pkill -f 'nodemon.*server-fixed.js'"
            ];
            
            let processesKilled = 0;
            for (const command of killCommands) {
                try {
                    execSync(command, { stdio: 'pipe' });
                    console.log(`✅ Killed processes with: ${command}`);
                    processesKilled++;
                } catch (e) {
                    // pkill returns non-zero if no processes found - this is normal
                    console.log(`ℹ️  No processes found for: ${command}`);
                }
            }
            
            if (processesKilled === 0) {
                console.log('ℹ️  No running server processes were found (this is normal)');
            }
            
            // Wait a moment for processes to fully terminate
            await this.sleep(2000);
            
            // Check if port 4000 is still in use
            try {
                const portCheck = execSync('lsof -ti:4000', { stdio: 'pipe' }).toString().trim();
                if (portCheck) {
                    console.log(`🔴 Port 4000 still in use by PIDs: ${portCheck}`);
                    console.log('🔄 Force killing remaining processes...');
                    execSync(`kill -9 ${portCheck}`, { stdio: 'pipe' });
                    await this.sleep(1000);
                }
            } catch (e) {
                console.log('✅ Port 4000 is free');
            }
            
        } catch (error) {
            console.warn('⚠️  Warning during server stop:', error.message);
        }
    }

    /**
     * Clear server-side caches
     */
    async clearServerCaches() {
        console.log('🧹 Clearing server-side caches...');
        
        try {
            // Clear Node.js module cache
            if (global.gc) {
                global.gc();
                console.log('✅ Garbage collection triggered');
            }
            
            // Clear any temporary files
            const tempDirs = [
                path.join(this.projectRoot, 'temp'),
                path.join(this.projectRoot, '.cache'),
                path.join(this.projectRoot, 'node_modules/.cache')
            ];
            
            for (const tempDir of tempDirs) {
                try {
                    await fs.rm(tempDir, { recursive: true, force: true });
                    console.log(`✅ Cleared: ${tempDir}`);
                } catch (e) {
                    // Directory doesn't exist
                }
            }
            
            // Clear logs directory (keep structure)
            const logsDir = path.join(this.projectRoot, 'logs');
            try {
                const logFiles = await fs.readdir(logsDir);
                for (const file of logFiles) {
                    if (file.endsWith('.log') || file.endsWith('.json')) {
                        await fs.unlink(path.join(logsDir, file));
                        console.log(`✅ Cleared log: ${file}`);
                    }
                }
            } catch (e) {
                // Logs directory doesn't exist
            }
            
        } catch (error) {
            console.warn('⚠️  Warning during cache clearing:', error.message);
        }
    }

    /**
     * Update cache busting in files
     */
    async updateCacheBusting() {
        console.log('🔄 Updating cache busting values...');
        
        try {
            // Update main HTML file
            await this.updateHTMLCacheBusting();
            
            // Update CSS files
            await this.updateCSSCacheBusting();
            
            // Update JavaScript files
            await this.updateJSCacheBusting();
            
            // Update import maps
            await this.updateImportMapCacheBusting();
            
        } catch (error) {
            console.error('❌ Error updating cache busting:', error.message);
            throw error;
        }
    }

    /**
     * Update HTML cache busting
     */
    async updateHTMLCacheBusting() {
        const htmlFile = path.join(this.projectRoot, 'public', 'index.html');
        
        try {
            let content = await fs.readFile(htmlFile, 'utf8');
            
            // Update CSS cache busting
            content = content.replace(
                /href="\/css\/main\.css\?v=\d+"/g,
                `href="/css/main.css?v=${this.cacheBustValue}"`
            );
            
            content = content.replace(
                /href="\/css\/pingone-ui-custom\.css\?v=\d+"/g,
                `href="/css/pingone-ui-custom.css?v=${this.cacheBustValue}"`
            );
            
            // Update JavaScript cache busting
            content = content.replace(
                /src="\/js\/app\.js\?v=\d+"/g,
                `src="/js/app.js?v=${this.cacheBustValue}"`
            );
            
            await fs.writeFile(htmlFile, content, 'utf8');
            console.log('✅ Updated HTML cache busting');
            
        } catch (error) {
            console.warn('⚠️  Could not update HTML cache busting:', error.message);
        }
    }

    /**
     * Update CSS cache busting
     */
    async updateCSSCacheBusting() {
        const cssDir = path.join(this.projectRoot, 'public', 'css');
        
        try {
            const files = await fs.readdir(cssDir);
            
            for (const file of files) {
                if (file.endsWith('.css')) {
                    const filePath = path.join(cssDir, file);
                    let content = await fs.readFile(filePath, 'utf8');
                    
                    // Add cache busting comment
                    const cacheBustComment = `/* Cache Bust: ${this.cacheBustValue} */\n`;
                    
                    if (!content.includes('Cache Bust:')) {
                        content = cacheBustComment + content;
                        await fs.writeFile(filePath, content, 'utf8');
                        console.log(`✅ Added cache bust to: ${file}`);
                    }
                }
            }
            
        } catch (error) {
            console.warn('⚠️  Could not update CSS cache busting:', error.message);
        }
    }

    /**
     * Update JavaScript cache busting
     */
    async updateJSCacheBusting() {
        const jsDir = path.join(this.projectRoot, 'public', 'js');
        
        try {
            const files = await fs.readdir(jsDir);
            
            for (const file of files) {
                if (file.endsWith('.js')) {
                    const filePath = path.join(jsDir, file);
                    let content = await fs.readFile(filePath, 'utf8');
                    
                    // Add cache busting comment
                    const cacheBustComment = `// Cache Bust: ${this.cacheBustValue}\n`;
                    
                    if (!content.includes('Cache Bust:')) {
                        content = cacheBustComment + content;
                        await fs.writeFile(filePath, content, 'utf8');
                        console.log(`✅ Added cache bust to: ${file}`);
                    }
                }
            }
            
        } catch (error) {
            console.warn('⚠️  Could not update JavaScript cache busting:', error.message);
        }
    }

    /**
     * Update import map cache busting
     */
    async updateImportMapCacheBusting() {
        const htmlFile = path.join(this.projectRoot, 'public', 'index.html');
        
        try {
            let content = await fs.readFile(htmlFile, 'utf8');
            
            // Update import map with cache busting
            content = content.replace(
                /"imports":\s*{([^}]+)}/g,
                (match, imports) => {
                    // Add cache busting to all import paths
                    const updatedImports = imports.replace(
                        /"([^"]+)":\s*"([^"]+)"/g,
                        (_, key, value) => {
                            if (value.startsWith('./') || value.startsWith('/')) {
                                return `"${key}": "${value}?v=${this.cacheBustValue}"`;
                            }
                            return `"${key}": "${value}"`;
                        }
                    );
                    return `"imports": {${updatedImports}}`;
                }
            );
            
            await fs.writeFile(htmlFile, content, 'utf8');
            console.log('✅ Updated import map cache busting');
            
        } catch (error) {
            console.warn('⚠️  Could not update import map cache busting:', error.message);
        }
    }

    /**
     * Restart the server
     */
    async restartServer() {
        console.log('🚀 Restarting server...');
        
        try {
            // Start full server in background via npm start (as requested)
            const serverProcess = spawn('npm', ['start', '--silent'], {
                cwd: this.projectRoot,
                stdio: 'pipe',
                detached: true
            });
            
            // Wait for server to start
            await this.waitForServer();
            
            console.log('✅ Server restarted successfully');
            
        } catch (error) {
            console.error('❌ Failed to restart server:', error.message);
            throw error;
        }
    }

    /**
     * Wait for server to be ready
     */
    async waitForServer() {
        console.log('⏳ Waiting for server to be ready...');
        
        const maxAttempts = 30;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const response = await fetch('http://localhost:4000/api/health');
                if (response.ok) {
                    console.log('✅ Server is responding to health check');
                    return;
                }
            } catch (e) {
                // Server not ready yet
            }
            
            attempts++;
            await this.sleep(1000);
        }
        
        throw new Error('Server failed to start within 30 seconds');
    }

    /**
     * Generate browser script for client-side cache busting
     */
    async generateBrowserScript() {
        const scriptContent = `// Browser Cache Bust Script - Generated: ${new Date().toISOString()}
// Run this in your browser console to clear all client-side caches

console.log('🧹 Starting browser cache bust...');

// Clear localStorage
try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.includes('cache') || key.includes('settings') || key.includes('token')) {
            localStorage.removeItem(key);
            console.log('🗑️  Cleared localStorage:', key);
        }
    });
} catch (e) {
    console.warn('⚠️  Could not clear localStorage:', e.message);
}

// Clear sessionStorage
try {
    sessionStorage.clear();
    console.log('🗑️  Cleared sessionStorage');
} catch (e) {
    console.warn('⚠️  Could not clear sessionStorage:', e.message);
}

// Clear IndexedDB (if available)
if ('indexedDB' in window) {
    try {
        indexedDB.databases().then(databases => {
            databases.forEach(db => {
                indexedDB.deleteDatabase(db.name);
                console.log('🗑️  Cleared IndexedDB:', db.name);
            });
        });
    } catch (e) {
        console.warn('⚠️  Could not clear IndexedDB:', e.message);
    }
}

// Clear fetch cache (if available)
if ('caches' in window) {
    try {
        caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
                caches.delete(cacheName);
                console.log('🗑️  Cleared cache:', cacheName);
            });
        });
    } catch (e) {
        console.warn('⚠️  Could not clear caches:', e.message);
    }
}

// Force reload with cache busting
const timestamp = Date.now();
const currentUrl = new URL(window.location.href);
currentUrl.searchParams.set('cb', timestamp);
currentUrl.searchParams.set('v', timestamp);

console.log('🔄 Reloading page with cache busting...');
console.log('📱 New URL:', currentUrl.toString());

// Small delay to ensure console messages are visible
setTimeout(() => {
    window.location.href = currentUrl.toString();
}, 1000);

console.log('✅ Browser cache bust completed!');
`;

        const scriptPath = path.join(this.projectRoot, 'browser-cache-bust.js');
        await fs.writeFile(scriptPath, scriptContent, 'utf8');
        
        console.log('📱 Browser script generated: browser-cache-bust.js');
        console.log(`📄 File path: ${scriptPath}`);
        console.log('💡 Copy and paste the contents into your browser console');
        // Provide a compact one-liner for convenience
        const oneLiner = "(function(){try{Object.keys(localStorage).forEach(k=>{if(/cache|settings|token/i.test(k))localStorage.removeItem(k)});sessionStorage.clear()}catch(e){}if('caches'in window){caches.keys().then(ns=>ns.forEach(n=>caches.delete(n)))}var u=new URL(location.href);var t=Date.now();u.searchParams.set('cb',t);u.searchParams.set('v',t);location.href=u.toString();})();";
        console.log('🧪 Quick console one-liner (copy/paste into browser devtools):');
        console.log(oneLiner);
    }

    /**
     * Utility: Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Execute the script
const script = new RestartAndCacheBust();
script.execute().catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
});
