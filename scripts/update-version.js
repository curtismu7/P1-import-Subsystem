#!/usr/bin/env node

/**
 * Bulletproof Version Management Script
 * 
 * This script ensures consistent version updates across all files in the project.
 * It prevents version mismatches and provides a single source of truth for versioning.
 * 
 * Usage:
 *   node scripts/update-version.js <new-version>
 *   npm run version:update <new-version>
 * 
 * Example:
 *   node scripts/update-version.js 6.5.2.2
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateVersion(version) {
    const versionRegex = /^\d+\.\d+\.\d+(\.\d+)?$/;
    if (!versionRegex.test(version)) {
        throw new Error(`Invalid version format: ${version}. Expected format: x.y.z or x.y.z.w`);
    }
    return true;
}

function updatePackageJson(newVersion) {
    const packagePath = path.join(projectRoot, 'package.json');
    log(`📦 Updating package.json...`, 'blue');
    
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    const oldVersion = packageJson.version;
    
    packageJson.version = newVersion;
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    log(`   ✅ Updated version: ${oldVersion} → ${newVersion}`, 'green');
    
    return oldVersion;
}

function updateIndexHtml(newVersion, oldVersion) {
    const indexPath = path.join(projectRoot, 'public', 'index.html');
    log(`🌐 Updating index.html...`, 'blue');
    
    let content = fs.readFileSync(indexPath, 'utf8');
    let updateCount = 0;
    
    // Update title
    content = content.replace(
        /<title>PingOne (?:User )?Import Tool v[\d.]+<\/title>/g,
        `<title>PingOne Import Tool v${newVersion}</title>`
    );
    updateCount++;
    
    // Update footer copyright
    content = content.replace(
        /&copy; \d{4} PingOne Import Tool v[\d.]+/g,
        `&copy; ${new Date().getFullYear()} PingOne Import Tool v${newVersion}`
    );
    updateCount++;
    
    // Update version widget
    content = content.replace(
        /<div id="version-display" class="version-widget">v[\d.]+<\/div>/g,
        `<div id="version-display" class="version-widget">v${newVersion}</div>`
    );
    updateCount++;
    
    // Update any other version references
    content = content.replace(
        new RegExp(`v${oldVersion.replace(/\./g, '\\.')}`, 'g'),
        `v${newVersion}`
    );
    
    fs.writeFileSync(indexPath, content);
    log(`   ✅ Updated ${updateCount} version references`, 'green');
}

function updateAppJs(newVersion, oldVersion) {
    const appPath = path.join(projectRoot, 'src', 'client', 'app.js');
    log(`🚀 Updating app.js...`, 'blue');
    
    let content = fs.readFileSync(appPath, 'utf8');
    let updateCount = 0;
    
    // Update logger version
    content = content.replace(
        /version: '[\d.]+'/g,
        `version: '${newVersion}'`
    );
    updateCount++;
    
    // Update application version property
    content = content.replace(
        /this\.version = '[\d.]+'/g,
        `this.version = '${newVersion}'`
    );
    updateCount++;
    
    fs.writeFileSync(appPath, content);
    log(`   ✅ Updated ${updateCount} version references`, 'green');
}

function updateNavigationSubsystem(newVersion, oldVersion) {
    const navPath = path.join(projectRoot, 'src', 'client', 'subsystems', 'navigation-subsystem.js');
    log(`🧭 Updating navigation-subsystem.js...`, 'blue');
    
    let content = fs.readFileSync(navPath, 'utf8');
    
    // Update base title
    content = content.replace(
        /const baseTitle = 'PingOne (?:User )?Import Tool v[\d.]+'/g,
        `const baseTitle = 'PingOne Import Tool v${newVersion}'`
    );
    
    fs.writeFileSync(navPath, content);
    log(`   ✅ Updated base title version`, 'green');
}

function createVersionSummary(newVersion, oldVersion) {
    const summaryPath = path.join(projectRoot, 'VERSION_UPDATE_SUMMARY.md');
    const timestamp = new Date().toISOString();
    
    const summary = `# Version Update Summary

## Version Change
- **Previous Version**: ${oldVersion}
- **New Version**: ${newVersion}
- **Update Date**: ${timestamp}
- **Update Method**: Bulletproof Version Management Script

## Files Updated
1. ✅ package.json - Main version property
2. ✅ public/index.html - Title, footer, version widget
3. ✅ src/client/app.js - Logger version, application version property
4. ✅ src/client/subsystems/navigation-subsystem.js - Base title version

## Next Steps
1. Rebuild bundle: \`npm run build:bundle\`
2. Commit changes: \`git add . && git commit -m "🔖 Update version to ${newVersion}"\`
3. Create tag: \`git tag -a v${newVersion} -m "Release v${newVersion}"\`
4. Test application to verify version displays correctly

## Verification Checklist
- [ ] Package.json shows version ${newVersion}
- [ ] Browser title shows "PingOne Import Tool v${newVersion}"
- [ ] Footer shows "© ${new Date().getFullYear()} PingOne Import Tool v${newVersion}"
- [ ] Version widget shows "v${newVersion}"
- [ ] Console logs show version ${newVersion}
- [ ] Navigation titles include version ${newVersion}

---
Generated by Bulletproof Version Management Script
`;

    fs.writeFileSync(summaryPath, summary);
    log(`📋 Created version update summary: VERSION_UPDATE_SUMMARY.md`, 'cyan');
}

async function main() {
    try {
        const args = process.argv.slice(2);
        
        if (args.length === 0) {
            log('❌ Error: Version argument required', 'red');
            log('Usage: node scripts/update-version.js <new-version>', 'yellow');
            log('Example: node scripts/update-version.js 6.5.2.2', 'yellow');
            process.exit(1);
        }
        
        const newVersion = args[0];
        
        log('🔧 Starting Bulletproof Version Update...', 'bright');
        log(`🎯 Target Version: ${newVersion}`, 'magenta');
        
        // Validate version format
        validateVersion(newVersion);
        log('✅ Version format validated', 'green');
        
        // Update all files
        const oldVersion = updatePackageJson(newVersion);
        updateIndexHtml(newVersion, oldVersion);
        updateAppJs(newVersion, oldVersion);
        updateNavigationSubsystem(newVersion, oldVersion);
        
        // Create summary
        createVersionSummary(newVersion, oldVersion);
        
        log('', 'reset');
        log('🎉 Bulletproof Version Update Complete!', 'bright');
        log(`📈 Version updated: ${oldVersion} → ${newVersion}`, 'green');
        log('', 'reset');
        log('📋 Next Steps:', 'cyan');
        log('   1. npm run build:bundle', 'yellow');
        log(`   2. git add . && git commit -m "🔖 Update version to ${newVersion}"`, 'yellow');
        log(`   3. git tag -a v${newVersion} -m "Release v${newVersion}"`, 'yellow');
        log('   4. Test application in browser', 'yellow');
        
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        process.exit(1);
    }
}

main();
