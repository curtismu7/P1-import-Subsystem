#!/usr/bin/env node

/**
 * 🛡️ BULLETPROOF BUNDLE CLEANER
 * 
 * This script safely cleans up old bundle files while preserving:
 * - The current bundle (from manifest)
 * - The latest N bundles (configurable, default 5)
 * - Any bundles referenced in source code
 * 
 * Usage: node scripts/clean-old-bundles.js [--keep=N] [--dry-run] [--force]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// ANSI color codes for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'white') {
    console.log(colorize(message, color));
}

function logHeader(message) {
    console.log('\n' + '='.repeat(60));
    console.log(colorize(message, 'cyan'));
    console.log('='.repeat(60));
}

function logSection(message) {
    console.log('\n' + colorize(message, 'yellow'));
    console.log('-'.repeat(40));
}

// Parse command line arguments
const args = process.argv.slice(2);
const keepCount = parseInt(args.find(arg => arg.startsWith('--keep='))?.split('=')[1]) || 5;
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

async function cleanOldBundles() {
    try {
        logHeader('🛡️ BULLETPROOF BUNDLE CLEANER');
        
        if (dryRun) {
            log('🔍 DRY RUN MODE - No files will be deleted', 'yellow');
        }
        
        // 1. Get current bundle from manifest
        logSection('📋 Current Bundle Analysis');
        const manifestPath = path.join(rootDir, 'public/js/bundle-manifest.json');
        let currentBundle = null;
        
        if (fs.existsSync(manifestPath)) {
            const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            currentBundle = manifestData.bundleFile;
            log(`Current Bundle: ${currentBundle}`, 'green');
        } else {
            log('⚠️  No bundle manifest found', 'yellow');
        }
        
        // 2. Find all bundle files
        logSection('📁 Bundle File Discovery');
        const bundleDir = path.join(rootDir, 'public/js');
        const files = fs.readdirSync(bundleDir);
        const bundleFiles = files
            .filter(file => file.match(/^bundle-\d+\.js$/))
            .map(file => {
                const match = file.match(/bundle-(\d+)\.js/);
                const filePath = path.join(bundleDir, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    timestamp: parseInt(match[1]),
                    date: new Date(parseInt(match[1]) * 1000),
                    size: stats.size,
                    path: filePath
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp);
        
        log(`Total Bundle Files Found: ${bundleFiles.length}`, 'blue');
        
        if (bundleFiles.length === 0) {
            log('ℹ️  No bundle files to clean', 'blue');
            return;
        }
        
        // 3. Find bundle references in source code
        logSection('🔍 Source Code Bundle References');
        const sourceFiles = [
            'src/client/subsystems/enhanced-token-status-subsystem.js',
            'src/client/utils/bulletproof-token-manager.js',
            'public/js/modules/global-version-indicator.js',
            'public/index.html'
        ];
        
        const referencedBundles = new Set();
        
        for (const filePath of sourceFiles) {
            const fullPath = path.join(rootDir, filePath);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const matches = content.match(/bundle-(\d+)/g);
                if (matches) {
                    matches.forEach(match => {
                        referencedBundles.add(`${match}.js`);
                    });
                }
            }
        }
        
        if (referencedBundles.size > 0) {
            log(`Referenced Bundles Found: ${referencedBundles.size}`, 'blue');
            referencedBundles.forEach(bundle => {
                log(`  - ${bundle}`, 'cyan');
            });
        } else {
            log('ℹ️  No bundle references found in source code', 'blue');
        }
        
        // 4. Determine which bundles to keep
        logSection('🛡️ Bundle Preservation Analysis');
        const bundlesToKeep = new Set();
        
        // Keep current bundle
        if (currentBundle) {
            bundlesToKeep.add(currentBundle);
            log(`✅ Keeping current bundle: ${currentBundle}`, 'green');
        }
        
        // Keep latest N bundles
        const latestBundles = bundleFiles.slice(0, keepCount);
        latestBundles.forEach(bundle => {
            bundlesToKeep.add(bundle.filename);
        });
        log(`✅ Keeping latest ${keepCount} bundles`, 'green');
        
        // Keep referenced bundles
        referencedBundles.forEach(bundle => {
            bundlesToKeep.add(bundle);
        });
        if (referencedBundles.size > 0) {
            log(`✅ Keeping ${referencedBundles.size} referenced bundles`, 'green');
        }
        
        // 5. Identify bundles to delete
        logSection('🗑️  Bundle Deletion Analysis');
        const bundlesToDelete = bundleFiles.filter(bundle => 
            !bundlesToKeep.has(bundle.filename)
        );
        
        if (bundlesToDelete.length === 0) {
            log('ℹ️  No bundles need to be deleted', 'green');
            return;
        }
        
        log(`Bundles to Delete: ${bundlesToDelete.length}`, 'red');
        let totalSizeToFree = 0;
        
        bundlesToDelete.forEach(bundle => {
            totalSizeToFree += bundle.size;
            const sizeStr = (bundle.size / 1024 / 1024).toFixed(2);
            log(`  - ${bundle.filename} (${sizeStr} MB, ${bundle.date.toLocaleDateString()})`, 'red');
        });
        
        const totalSizeStr = (totalSizeToFree / 1024 / 1024).toFixed(2);
        log(`Total Space to Free: ${totalSizeStr} MB`, 'magenta');
        
        // 6. Confirmation (unless force mode)
        if (!force && !dryRun) {
            logSection('⚠️  Confirmation Required');
            log('This will permanently delete the above bundle files.', 'yellow');
            log('Use --dry-run to preview or --force to skip confirmation.', 'blue');
            
            // In a real implementation, you'd use readline for user input
            // For now, we'll require --force flag for actual deletion
            log('❌ Deletion cancelled. Use --force flag to proceed.', 'red');
            return;
        }
        
        // 7. Delete bundles
        logSection('🗑️  Bundle Deletion');
        let deletedCount = 0;
        let deletedSize = 0;
        
        for (const bundle of bundlesToDelete) {
            try {
                if (!dryRun) {
                    fs.unlinkSync(bundle.path);
                }
                deletedCount++;
                deletedSize += bundle.size;
                log(`${dryRun ? '[DRY RUN] Would delete' : 'Deleted'}: ${bundle.filename}`, 'green');
            } catch (error) {
                log(`❌ Failed to delete ${bundle.filename}: ${error.message}`, 'red');
            }
        }
        
        // 8. Summary
        logSection('📊 Cleanup Summary');
        log(`Bundles Processed: ${bundleFiles.length}`, 'white');
        log(`Bundles Kept: ${bundleFiles.length - deletedCount}`, 'green');
        log(`Bundles ${dryRun ? 'Would Be ' : ''}Deleted: ${deletedCount}`, 'red');
        log(`Space ${dryRun ? 'Would Be ' : ''}Freed: ${(deletedSize / 1024 / 1024).toFixed(2)} MB`, 'magenta');
        
        if (dryRun) {
            log('\n💡 To actually delete files, run without --dry-run flag', 'blue');
            log('💡 Add --force flag to skip confirmation', 'blue');
        } else if (deletedCount > 0) {
            log('\n✅ Bundle cleanup completed successfully!', 'green');
        }
        
        // 9. Recommendations
        if (bundleFiles.length > keepCount * 2) {
            logSection('💡 Recommendations');
            log('Consider running bundle cleanup more frequently', 'yellow');
            log(`Current: ${bundleFiles.length} bundles, Recommended: Keep ${keepCount}`, 'blue');
        }
        
    } catch (error) {
        log(`❌ Error during bundle cleanup: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

// Show usage if help requested
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🛡️ BULLETPROOF BUNDLE CLEANER

Usage: node scripts/clean-old-bundles.js [options]

Options:
  --keep=N      Keep the latest N bundles (default: 5)
  --dry-run     Preview what would be deleted without actually deleting
  --force       Skip confirmation prompt
  --help, -h    Show this help message

Examples:
  node scripts/clean-old-bundles.js --dry-run
  node scripts/clean-old-bundles.js --keep=10 --force
  node scripts/clean-old-bundles.js --dry-run --keep=3

Safety Features:
  - Always keeps the current bundle (from manifest)
  - Always keeps the latest N bundles
  - Always keeps bundles referenced in source code
  - Requires confirmation unless --force is used
  - Supports dry-run mode for safe preview
`);
    process.exit(0);
}

// Run the cleaner
if (import.meta.url === `file://${process.argv[1]}`) {
    cleanOldBundles()
        .then(() => {
            log('\n🎯 Bundle cleanup process completed', 'cyan');
        })
        .catch(error => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}

export default cleanOldBundles;