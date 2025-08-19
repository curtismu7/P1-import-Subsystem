#!/usr/bin/env node

/**
 * Quick Restart Script
 * 
 * Simple one-liner to restart the server and clear caches
 * Usage: node scripts/quick-restart.js
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Quick Restart and Cache Bust...');

try {
    // Kill existing processes (handle gracefully if none found)
    console.log('🛑 Stopping server...');
    try {
        execSync("pkill -f 'node.*server'", { stdio: 'pipe' });
        console.log('✅ Server processes stopped');
    } catch (killError) {
        // pkill returns non-zero if no processes found - this is normal
        console.log('ℹ️  No running server processes found (this is normal)');
    }
    
    // Wait a moment for any processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if port 4000 is free
    try {
        const portCheck = execSync('lsof -ti:4000', { stdio: 'pipe' }).toString().trim();
        if (portCheck) {
            console.log(`🔴 Port 4000 still in use by PIDs: ${portCheck}`);
            console.log('🔄 Force killing remaining processes...');
            execSync(`kill -9 ${portCheck}`, { stdio: 'pipe' });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (e) {
        console.log('✅ Port 4000 is free');
    }
    
    // Update cache busting in HTML
    console.log('🔄 Updating cache busting...');
    const htmlFile = path.join(__dirname, '..', 'public', 'index.html');
    let content = await fs.readFile(htmlFile, 'utf8');
    const timestamp = Date.now();
    
    // Update CSS and JS cache busting
    content = content.replace(/v=\d+/g, `v=${timestamp}`);
    await fs.writeFile(htmlFile, content, 'utf8');
    
    console.log('✅ Cache busting updated');
    
    // Restart server
    console.log('🚀 Restarting server...');
    execSync('node --experimental-modules --experimental-json-modules server/server-fixed.js', {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit'
    });
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Try running: npm run restart:bust for more comprehensive cache busting');
    process.exit(1);
}
