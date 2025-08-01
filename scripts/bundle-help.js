#!/usr/bin/env node

/**
 * 🛡️ BULLETPROOF BUNDLE MANAGEMENT HELP
 * 
 * This script shows all available bundle management commands and their usage.
 */

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

logHeader('🛡️ BULLETPROOF BUNDLE MANAGEMENT COMMANDS');

logSection('📊 Bundle Analysis & Checking');
log('npm run check:bundle', 'green');
log('  Check bundle versions across codebase and compare with latest', 'white');
log('  Shows: current bundle, latest bundle, source references, recommendations', 'blue');
log('');
log('npm run check:bundle-version', 'green');
log('  Alias for check:bundle', 'white');

logSection('🔄 Bundle Updates & Synchronization');
log('npm run update:bundle', 'green');
log('  Update bundle manifest to point to the latest bundle file', 'white');
log('');
log('npm run sync:bundle', 'green');
log('  Synchronize bundle numbers across all source files', 'white');
log('');
log('npm run build:bundle', 'green');
log('  Build a new bundle with timestamp and update manifest', 'white');

logSection('🧹 Bundle Cleanup');
log('npm run clean:bundles -- --dry-run', 'green');
log('  Preview which bundle files would be deleted (safe preview)', 'white');
log('');
log('npm run clean:bundles -- --dry-run --keep=10', 'green');
log('  Preview cleanup keeping the latest 10 bundles', 'white');
log('');
log('npm run clean:bundles -- --force --keep=5', 'green');
log('  Actually delete old bundles, keeping latest 5 (no confirmation)', 'white');

logSection('🔍 Bundle Analysis');
log('npm run analyze:bundle', 'green');
log('  Analyze bundle optimization and performance', 'white');

logSection('⚡ Quick Workflow Examples');
log('# Check current bundle status', 'yellow');
log('npm run check:bundle', 'cyan');
log('');
log('# Clean up old bundles (preview first)', 'yellow');
log('npm run clean:bundles -- --dry-run', 'cyan');
log('npm run clean:bundles -- --force --keep=5', 'cyan');
log('');
log('# Build new bundle and sync everything', 'yellow');
log('npm run build:bundle', 'cyan');
log('npm run check:bundle', 'cyan');
log('');
log('# Update manifest to latest bundle', 'yellow');
log('npm run update:bundle', 'cyan');
log('npm run sync:bundle', 'cyan');

logSection('🛡️ Safety Features');
log('✅ Bundle cleaner never deletes:', 'green');
log('  - Current bundle (from manifest)', 'blue');
log('  - Latest N bundles (configurable)', 'blue');
log('  - Bundles referenced in source code', 'blue');
log('');
log('✅ All commands support dry-run mode for safe preview', 'green');
log('✅ Comprehensive analysis before any destructive operations', 'green');
log('✅ Color-coded output for easy understanding', 'green');

logSection('📋 Bundle File Locations');
log('Bundle Files:', 'yellow');
log('  public/js/bundle-*.js', 'blue');
log('');
log('Bundle Manifest:', 'yellow');
log('  public/js/bundle-manifest.json', 'blue');
log('');
log('Source References:', 'yellow');
log('  src/client/subsystems/enhanced-token-status-subsystem.js', 'blue');
log('  src/client/utils/bulletproof-token-manager.js', 'blue');
log('  public/js/modules/global-version-indicator.js', 'blue');

logSection('🎯 Recommended Maintenance');
log('1. Check bundle status regularly:', 'yellow');
log('   npm run check:bundle', 'cyan');
log('');
log('2. Clean old bundles weekly:', 'yellow');
log('   npm run clean:bundles -- --dry-run', 'cyan');
log('   npm run clean:bundles -- --force --keep=5', 'cyan');
log('');
log('3. After building new bundles:', 'yellow');
log('   npm run check:bundle', 'cyan');
log('   npm run sync:bundle', 'cyan');

log('\n' + colorize('🛡️ All bundle management commands are bulletproof and safe!', 'green'));