#!/usr/bin/env node

/**
 * Bulletproof Server Startup Script
 * 
 * This script ensures everything is synchronized and up-to-date before starting the server:
 * 1. Syncs bundle numbers across all files
 * 2. Verifies build consistency
 * 3. Tests bundle integrity with auto-fixing
 * 4. Starts the server with confidence
 * 5. Auto-restarts if bundle tests fail
 */

import { syncBundleNumbers, verifySynchronization } from './sync-bundle-numbers.js';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * Verify bundle integrity and auto-fix if needed
 */
async function verifyBundleWithAutoFix() {
    console.log('🔍 Step 3: Verifying bundle integrity...');
    
    try {
        // Run bundle verification
        execSync('npm run verify:build', { 
            cwd: rootDir, 
            stdio: 'pipe' 
        });
        console.log('✅ Bundle verification passed!');
        return true;
    } catch (error) {
        console.warn('⚠️  Bundle verification failed, attempting auto-fix...');
        console.log('Error details:', error.stdout?.toString() || error.message);
        
        try {
            // Attempt to fix by rebuilding the bundle
            console.log('🔧 Rebuilding bundle...');
            execSync('npm run build:bundle', { 
                cwd: rootDir, 
                stdio: 'inherit' 
            });
            
            // Verify the fix worked
            console.log('🔍 Re-verifying bundle after rebuild...');
            execSync('npm run verify:build', { 
                cwd: rootDir, 
                stdio: 'pipe' 
            });
            
            console.log('✅ Bundle auto-fix successful!');
            return true;
        } catch (fixError) {
            console.error('❌ Bundle auto-fix failed:', fixError.message);
            console.error('Manual intervention required.');
            return false;
        }
    }
}

/**
 * Run bulletproof startup sequence
 */
async function bulletproofStartup(retryCount = 0) {
    const maxRetries = 3;
    
    console.log('🚀 Starting Bulletproof Server Startup Sequence...');
    if (retryCount > 0) {
        console.log(`🔄 Retry attempt ${retryCount}/${maxRetries}`);
    }
    console.log('=' .repeat(60));
    
    // Step 1: Sync bundle numbers
    console.log('📦 Step 1: Synchronizing bundle numbers...');
    const syncSuccess = syncBundleNumbers();
    
    if (!syncSuccess) {
        console.error('❌ Bundle synchronization failed! Aborting startup.');
        process.exit(1);
    }
    
    // Step 2: Verify synchronization
    console.log('🔍 Step 2: Verifying synchronization...');
    const verifySuccess = verifySynchronization();
    
    if (!verifySuccess) {
        console.warn('⚠️  Synchronization verification failed, but continuing...');
    }
    
    // Step 3: Verify bundle integrity with auto-fix
    const bundleVerifySuccess = await verifyBundleWithAutoFix();
    
    if (!bundleVerifySuccess) {
        if (retryCount < maxRetries) {
            console.log(`🔄 Bundle verification failed, retrying startup (${retryCount + 1}/${maxRetries})...`);
            return bulletproofStartup(retryCount + 1);
        } else {
            console.error('❌ Bundle verification failed after maximum retries! Aborting startup.');
            process.exit(1);
        }
    }
    
    // Step 4: Start the server
    console.log('🎯 Step 4: Starting server...');
    console.log('=' .repeat(60));
    
    // Start the always-background script
    const serverProcess = spawn('node', [
        '--experimental-modules',
        '--experimental-json-modules',
        'scripts/always-background.js'
    ], {
        cwd: rootDir,
        stdio: 'inherit'
    });
    
    // Set up periodic bundle verification (every 5 minutes)
    const bundleCheckInterval = setInterval(async () => {
        console.log('🔍 Performing periodic bundle verification...');
        const bundleOk = await verifyBundleWithAutoFix();
        
        if (!bundleOk) {
            console.log('⚠️  Bundle verification failed during runtime, restarting server...');
            clearInterval(bundleCheckInterval);
            serverProcess.kill('SIGTERM');
            
            // Wait a moment for graceful shutdown, then restart
            setTimeout(() => {
                console.log('🔄 Restarting server after bundle fix...');
                bulletproofStartup(0); // Restart with fresh retry count
            }, 2000);
        }
    }, 5 * 60 * 1000); // 5 minutes
    
    serverProcess.on('error', (error) => {
        console.error('❌ Server startup failed:', error.message);
        clearInterval(bundleCheckInterval);
        process.exit(1);
    });
    
    serverProcess.on('exit', (code) => {
        clearInterval(bundleCheckInterval);
        if (code !== 0) {
            console.error(`❌ Server exited with code ${code}`);
            
            // Check if this was due to a bundle issue and attempt restart
            console.log('🔍 Checking if exit was due to bundle issues...');
            verifyBundleWithAutoFix().then(bundleOk => {
                if (!bundleOk) {
                    console.log('🔄 Bundle issues detected, attempting restart...');
                    setTimeout(() => bulletproofStartup(0), 1000);
                } else {
                    process.exit(code);
                }
            }).catch(() => {
                process.exit(code);
            });
        }
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('🛑 Shutting down server...');
        clearInterval(bundleCheckInterval);
        serverProcess.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
        console.log('🛑 Shutting down server...');
        clearInterval(bundleCheckInterval);
        serverProcess.kill('SIGTERM');
    });
    
    console.log('✅ Server started with automatic bundle verification!');
    console.log('🔍 Bundle verification runs every 5 minutes');
    console.log('🔧 Auto-fix and restart enabled for bundle failures');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    bulletproofStartup().catch(error => {
        console.error('❌ Bulletproof startup failed:', error.message);
        process.exit(1);
    });
}

export { bulletproofStartup };