#!/usr/bin/env node

/**
 * Bulletproof Bundle Number Synchronization Script
 * 
 * This script ensures all source files use the current bundle number
 * from the bundle manifest. It runs automatically on server startup.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Files that contain bundle numbers that need to be synchronized
const FILES_TO_SYNC = [
    'public/js/modules/global-version-indicator.js',
    'src/client/subsystems/enhanced-token-status-subsystem.js',
    'src/client/utils/bulletproof-token-manager.js',
    'public/index.html'
];

/**
 * Get the current bundle name from the manifest
 */
function getCurrentBundle() {
    try {
        const manifestPath = path.join(rootDir, 'public/js/bundle-manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return manifest.bundleFile.replace('.js', '');
    } catch (error) {
        console.error('❌ Error reading bundle manifest:', error.message);
        return null;
    }
}

/**
 * Update bundle number in a file
 */
function updateBundleInFile(filePath, currentBundle) {
    try {
        const fullPath = path.join(rootDir, filePath);
        let content = fs.readFileSync(fullPath, 'utf8');
        let updated = false;

        // Pattern to match bundle numbers in various formats
        const patterns = [
            /const buildNumber = ['"`]bundle-\d+['"`];/g,
            /buildNumber = ['"`]bundle-\d+['"`]/g,
            /Build: bundle-\d+/g,
            /<span class="build-badge" id="build-badge">Build: bundle-\d+<\/span>/g,
            /this\.currentBuild = ['"`]bundle-\d+['"`];/g
        ];

        patterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    let replacement;
                    if (match.includes('const buildNumber')) {
                        replacement = `const buildNumber = '${currentBundle}';`;
                    } else if (match.includes('buildNumber =')) {
                        replacement = `buildNumber = '${currentBundle}'`;
                    } else if (match.includes('Build: bundle-')) {
                        replacement = `Build: ${currentBundle}`;
                    } else if (match.includes('<span class="build-badge"')) {
                        replacement = `<span class="build-badge" id="build-badge">Build: ${currentBundle}</span>`;
                    } else if (match.includes('this.currentBuild =')) {
                        replacement = `this.currentBuild = '${currentBundle}';`;
                    }
                    
                    if (replacement && match !== replacement) {
                        content = content.replace(match, replacement);
                        updated = true;
                    }
                });
            }
        });

        if (updated) {
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`✅ Updated bundle number in: ${filePath}`);
            return true;
        } else {
            console.log(`ℹ️  No bundle number found in: ${filePath}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error updating ${filePath}:`, error.message);
        return false;
    }
}

/**
 * Main synchronization function
 */
function syncBundleNumbers() {
    console.log('🔄 Starting bundle number synchronization...');
    
    const currentBundle = getCurrentBundle();
    if (!currentBundle) {
        console.error('❌ Could not determine current bundle. Aborting sync.');
        return false;
    }

    console.log(`📦 Current bundle: ${currentBundle}`);
    
    let totalUpdated = 0;
    
    FILES_TO_SYNC.forEach(filePath => {
        if (updateBundleInFile(filePath, currentBundle)) {
            totalUpdated++;
        }
    });

    if (totalUpdated > 0) {
        console.log(`✅ Bundle synchronization complete! Updated ${totalUpdated} files.`);
        return true;
    } else {
        console.log('ℹ️  All files already synchronized.');
        return true;
    }
}

/**
 * Verify synchronization
 */
function verifySynchronization() {
    const currentBundle = getCurrentBundle();
    if (!currentBundle) return false;

    let allSynced = true;
    
    FILES_TO_SYNC.forEach(filePath => {
        try {
            const fullPath = path.join(rootDir, filePath);
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Check if file contains the current bundle number
            if (!content.includes(currentBundle)) {
                console.log(`⚠️  ${filePath} may not be synchronized`);
                allSynced = false;
            }
        } catch (error) {
            console.error(`❌ Error verifying ${filePath}:`, error.message);
            allSynced = false;
        }
    });

    return allSynced;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const success = syncBundleNumbers();
    
    if (success) {
        console.log('🎯 Verifying synchronization...');
        const verified = verifySynchronization();
        
        if (verified) {
            console.log('✅ All files are synchronized with current bundle!');
            process.exit(0);
        } else {
            console.log('⚠️  Some files may not be fully synchronized. Check manually.');
            process.exit(1);
        }
    } else {
        console.error('❌ Bundle synchronization failed!');
        process.exit(1);
    }
}

export { syncBundleNumbers, verifySynchronization, getCurrentBundle };