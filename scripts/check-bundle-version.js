#!/usr/bin/env node

/**
 * 🛡️ BULLETPROOF BUNDLE VERSION CHECKER
 * 
 * This script checks and compares bundle versions across the codebase:
 * - Current bundle version in manifest
 * - Latest bundle file in public/js directory
 * - Bundle versions referenced in source code
 * - Package.json version
 * - Provides recommendations for version synchronization
 * 
 * Usage: node scripts/check-bundle-version.js
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

async function checkBundleVersions() {
    try {
        logHeader('🛡️ BULLETPROOF BUNDLE VERSION CHECKER');
        
        // 1. Get package.json version
        logSection('📦 Package Version');
        const packagePath = path.join(rootDir, 'package.json');
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const packageVersion = packageData.version;
        log(`Package Version: ${packageVersion}`, 'green');
        
        // 2. Get current bundle from manifest
        logSection('📋 Bundle Manifest');
        const manifestPath = path.join(rootDir, 'public/js/bundle-manifest.json');
        let currentBundle = null;
        let currentBundleTimestamp = null;
        
        if (fs.existsSync(manifestPath)) {
            const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            currentBundle = manifestData.bundleFile;
            const match = currentBundle.match(/bundle-(\d+)\.js/);
            if (match) {
                currentBundleTimestamp = parseInt(match[1]);
                const date = new Date(currentBundleTimestamp * 1000);
                log(`Current Bundle: ${currentBundle}`, 'green');
                log(`Bundle Timestamp: ${currentBundleTimestamp}`, 'blue');
                log(`Bundle Date: ${date.toISOString()}`, 'blue');
            }
        } else {
            log('❌ Bundle manifest not found!', 'red');
        }
        
        // 3. Find all bundle files
        logSection('📁 Available Bundle Files');
        const bundleDir = path.join(rootDir, 'public/js');
        const files = fs.readdirSync(bundleDir);
        const bundleFiles = files
            .filter(file => file.match(/^bundle-\d+\.js$/))
            .map(file => {
                const match = file.match(/bundle-(\d+)\.js/);
                return {
                    filename: file,
                    timestamp: parseInt(match[1]),
                    date: new Date(parseInt(match[1]) * 1000),
                    size: fs.statSync(path.join(bundleDir, file)).size
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp);
        
        if (bundleFiles.length > 0) {
            log(`Total Bundle Files: ${bundleFiles.length}`, 'blue');
            log(`Latest Bundle: ${bundleFiles[0].filename}`, 'green');
            log(`Latest Date: ${bundleFiles[0].date.toISOString()}`, 'blue');
            log(`Latest Size: ${(bundleFiles[0].size / 1024 / 1024).toFixed(2)} MB`, 'blue');
            
            // Show top 5 most recent bundles
            log('\n📊 Most Recent Bundles:', 'yellow');
            bundleFiles.slice(0, 5).forEach((bundle, index) => {
                const status = bundle.filename === currentBundle ? ' ← CURRENT' : '';
                const color = bundle.filename === currentBundle ? 'green' : 'white';
                log(`  ${index + 1}. ${bundle.filename} (${bundle.date.toLocaleDateString()})${status}`, color);
            });
        } else {
            log('❌ No bundle files found!', 'red');
        }
        
        // 4. Check bundle references in source code
        logSection('🔍 Bundle References in Source Code');
        const sourceFiles = [
            'src/client/subsystems/enhanced-token-status-subsystem.js',
            'src/client/utils/bulletproof-token-manager.js',
            'public/js/modules/global-version-indicator.js'
        ];
        
        const bundleReferences = [];
        
        for (const filePath of sourceFiles) {
            const fullPath = path.join(rootDir, filePath);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const matches = content.match(/bundle-(\d+)/g);
                if (matches) {
                    matches.forEach(match => {
                        bundleReferences.push({
                            file: filePath,
                            bundle: match,
                            timestamp: parseInt(match.replace('bundle-', ''))
                        });
                    });
                }
            }
        }
        
        if (bundleReferences.length > 0) {
            bundleReferences.forEach(ref => {
                const date = new Date(ref.timestamp * 1000);
                const isCurrent = ref.bundle === currentBundle?.replace('.js', '');
                const color = isCurrent ? 'green' : 'yellow';
                const status = isCurrent ? ' ✅' : ' ⚠️';
                log(`  ${ref.file}: ${ref.bundle} (${date.toLocaleDateString()})${status}`, color);
            });
        } else {
            log('ℹ️  No bundle references found in source code', 'blue');
        }
        
        // 5. Version Analysis
        logSection('📊 Version Analysis');
        
        const latestBundle = bundleFiles[0];
        const isManifestCurrent = currentBundle === latestBundle?.filename;
        const hasOutdatedReferences = bundleReferences.some(ref => 
            ref.timestamp < currentBundleTimestamp
        );
        
        if (isManifestCurrent) {
            log('✅ Bundle manifest is up to date', 'green');
        } else {
            log('⚠️  Bundle manifest is outdated', 'yellow');
            if (latestBundle) {
                log(`   Latest: ${latestBundle.filename}`, 'blue');
                log(`   Current: ${currentBundle || 'none'}`, 'blue');
            }
        }
        
        if (hasOutdatedReferences) {
            log('⚠️  Some source files have outdated bundle references', 'yellow');
        } else {
            log('✅ All source file bundle references are current', 'green');
        }
        
        // 6. Recommendations
        logSection('💡 Recommendations');
        
        if (!isManifestCurrent && latestBundle) {
            log('🔧 Update bundle manifest:', 'yellow');
            log(`   echo '{"bundleFile": "${latestBundle.filename}"}' > public/js/bundle-manifest.json`, 'blue');
        }
        
        if (hasOutdatedReferences) {
            log('🔧 Update source file bundle references:', 'yellow');
            bundleReferences
                .filter(ref => ref.timestamp < currentBundleTimestamp)
                .forEach(ref => {
                    log(`   Update ${ref.file} from ${ref.bundle} to bundle-${currentBundleTimestamp}`, 'blue');
                });
        }
        
        if (bundleFiles.length > 10) {
            log('🧹 Consider cleaning up old bundle files:', 'yellow');
            log(`   Found ${bundleFiles.length} bundle files, consider keeping only the latest 5-10`, 'blue');
        }
        
        // 7. Summary
        logSection('📋 Summary');
        log(`Package Version: ${packageVersion}`, 'white');
        log(`Current Bundle: ${currentBundle || 'none'}`, 'white');
        log(`Latest Bundle: ${latestBundle?.filename || 'none'}`, 'white');
        log(`Total Bundles: ${bundleFiles.length}`, 'white');
        log(`Source References: ${bundleReferences.length}`, 'white');
        
        const overallStatus = isManifestCurrent && !hasOutdatedReferences ? 'GOOD' : 'NEEDS_ATTENTION';
        const statusColor = overallStatus === 'GOOD' ? 'green' : 'yellow';
        log(`Overall Status: ${overallStatus}`, statusColor);
        
        // 8. Quick Actions
        logSection('⚡ Quick Actions');
        log('To update bundle manifest to latest:', 'blue');
        log(`npm run update:bundle`, 'cyan');
        log('To sync all bundle references:', 'blue');
        log(`npm run sync:bundle`, 'cyan');
        log('To clean old bundles:', 'blue');
        log(`npm run clean:bundles`, 'cyan');
        
        return {
            packageVersion,
            currentBundle,
            latestBundle: latestBundle?.filename,
            totalBundles: bundleFiles.length,
            isUpToDate: isManifestCurrent && !hasOutdatedReferences,
            bundleFiles,
            bundleReferences
        };
        
    } catch (error) {
        log(`❌ Error checking bundle versions: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

// Run the checker
if (import.meta.url === `file://${process.argv[1]}`) {
    checkBundleVersions()
        .then(result => {
            if (!result.isUpToDate) {
                process.exit(1); // Exit with error code if updates needed
            }
        })
        .catch(error => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}

export default checkBundleVersions;