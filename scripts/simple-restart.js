#!/usr/bin/env node

/**
 * Simple Restart Script
 * 
 * A robust, simple script to restart the server with basic cache busting.
 * Handles errors gracefully and provides clear feedback.
 * 
 * Usage: node scripts/simple-restart.js
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Simple Server Restart...');

async function simpleRestart() {
    try {
        // Step 1: Try to stop any existing server processes
        console.log('🛑 Checking for existing server processes...');
        
        try {
            // Use a more specific pattern to avoid killing unrelated processes
            execSync("pkill -f 'node.*server-fixed.js'", { stdio: 'pipe' });
            console.log('✅ Stopped existing server process');
        } catch (e) {
            console.log('ℹ️  No existing server process found (this is normal)');
        }
        
        // Step 2: Wait a moment
        console.log('⏳ Waiting for processes to terminate...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 3: Check if port 4000 is free
        console.log('🔍 Checking if port 4000 is available...');
        try {
            const portCheck = execSync('lsof -ti:4000', { stdio: 'pipe' }).toString().trim();
            if (portCheck) {
                console.log(`🔴 Port 4000 is still in use by PID: ${portCheck}`);
                console.log('🔄 Force killing process...');
                execSync(`kill -9 ${portCheck}`, { stdio: 'pipe' });
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.log('✅ Port 4000 is now free');
            } else {
                console.log('✅ Port 4000 is available');
            }
        } catch (e) {
            console.log('✅ Port 4000 is available');
        }
        
        // Step 4: Update cache busting (simple approach)
        console.log('🔄 Updating cache busting...');
        try {
            const htmlFile = path.join(__dirname, '..', 'public', 'index.html');
            let content = await fs.readFile(htmlFile, 'utf8');
            const timestamp = Date.now();
            
            // Simple cache busting - just update version numbers
            content = content.replace(/v=\d+/g, `v=${timestamp}`);
            await fs.writeFile(htmlFile, content, 'utf8');
            
            console.log('✅ Cache busting updated');
        } catch (e) {
            console.log('⚠️  Could not update cache busting (continuing anyway)');
        }
        
        // Step 5: Start the server
        console.log('🚀 Starting server...');
        console.log('📁 Working directory:', path.resolve(__dirname, '..'));
        
        // Check if minimal server is requested
        const useMinimal = process.argv.includes('--minimal');
        const serverFile = useMinimal ? 'server/server-minimal.js' : 'server/server-fixed.js';
        const serverCommand = `node --experimental-modules --experimental-json-modules ${serverFile}`;
        
        if (useMinimal) {
            console.log('🔧 Using minimal server (avoids Winston logger issues)');
        }
        
        console.log('🔧 Command:', serverCommand);
        
        execSync(serverCommand, {
            cwd: path.resolve(__dirname, '..'),
            stdio: 'inherit'
        });
        
    } catch (error) {
        console.error('❌ Error during restart:', error.message);
        
        if (error.message.includes('ENOENT')) {
            console.log('💡 Tip: Make sure you\'re running this from the project root directory');
        } else if (error.message.includes('EACCES')) {
            console.log('💡 Tip: You might need sudo permissions to kill processes');
        } else if (error.message.includes('server-fixed.js')) {
            console.log('💡 Tip: Make sure server/server-fixed.js exists');
        }
        
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Check if you\'re in the correct directory');
        console.log('2. Verify server/server-fixed.js exists');
        console.log('3. Try: npm run restart:bust for comprehensive restart');
        console.log('4. Check server logs for more details');
        
        process.exit(1);
    }
}

// Run the restart
simpleRestart();
