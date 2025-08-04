#!/usr/bin/env node

/**
 * PingOne Import Tool - Hybrid Bundle Manager
 * Version: 7.0.0.9
 * 
 * This script manages the hybrid bundling approach during the phased migration
 * from Browserify to Import Maps. It can generate both bundle and import maps versions
 * and helps coordinate the transition between the two approaches.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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

// Configuration
const config = {
    // Bundle file name pattern (timestamp will be inserted)
    bundlePattern: 'bundle-{timestamp}.js',
    
    // Import maps file
    importMapsFile: 'public/import-maps.json',
    
    // Entry HTML files
    entryHtml: 'public/entry.html',
    bundleHtml: 'public/index.html',
    importMapsHtml: 'public/index-import-maps.html',
    
    // App loader script
    appLoaderScript: 'public/js/app-loader.js',
    
    // Browser compatibility utility
    browserCompatScript: 'public/js/browser-compatibility.js',
    
    // Modules to convert
    modulesToConvert: [
        'public/js/utils',
        'public/js/components',
        'public/js/subsystems',
        'public/js/api'
    ],
    
    // Version information
    versionFile: 'package.json'
};

/**
 * Log a message with color
 * @param {string} message - The message to log
 * @param {string} color - The color to use
 */
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Get the current version from package.json
 * @returns {string} The current version
 */
function getCurrentVersion() {
    const packagePath = path.join(projectRoot, config.versionFile);
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version;
}

/**
 * Generate a timestamp for the bundle name
 * @returns {string} The timestamp
 */
function generateTimestamp() {
    return Math.floor(Date.now() / 1000).toString();
}

/**
 * Build the Browserify bundle
 * @returns {string} The path to the generated bundle
 */
function buildBundle() {
    log('🔨 Building Browserify bundle...', 'blue');
    
    const timestamp = generateTimestamp();
    const bundleName = config.bundlePattern.replace('{timestamp}', timestamp);
    const bundlePath = path.join(projectRoot, 'public', bundleName);
    
    try {
        // Run the browserify command
        execSync(`browserify src/client/app.js -o public/${bundleName}`, {
            cwd: projectRoot,
            stdio: 'inherit'
        });
        
        // Update the index.html to reference the new bundle
        updateBundleReference(bundleName);
        
        log(`✅ Bundle built successfully: ${bundleName}`, 'green');
        return bundleName;
    } catch (error) {
        log(`❌ Bundle build failed: ${error.message}`, 'red');
        throw error;
    }
}

/**
 * Update the bundle reference in index.html
 * @param {string} bundleName - The name of the new bundle
 */
function updateBundleReference(bundleName) {
    const indexPath = path.join(projectRoot, config.bundleHtml);
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Replace the bundle reference
    content = content.replace(
        /<script src="bundle-\d+\.js"><\/script>/,
        `<script src="${bundleName}"></script>`
    );
    
    fs.writeFileSync(indexPath, content);
    log(`✅ Updated bundle reference in ${config.bundleHtml}`, 'green');
}

/**
 * Update the import maps configuration
 * @param {Object} updates - The updates to apply to the import maps
 */
function updateImportMaps(updates) {
    const importMapsPath = path.join(projectRoot, config.importMapsFile);
    let importMaps = {};
    
    // Load existing import maps if available
    if (fs.existsSync(importMapsPath)) {
        importMaps = JSON.parse(fs.readFileSync(importMapsPath, 'utf8'));
    } else {
        // Create a basic structure if the file doesn't exist
        importMaps = {
            imports: {}
        };
    }
    
    // Apply updates
    if (updates && updates.imports) {
        importMaps.imports = { ...importMaps.imports, ...updates.imports };
    }
    
    // Write the updated import maps
    fs.writeFileSync(importMapsPath, JSON.stringify(importMaps, null, 2));
    log(`✅ Updated import maps configuration`, 'green');
}

/**
 * Convert modules from CommonJS to ES modules
 * @param {string[]} modules - The modules to convert
 */
function convertModules(modules) {
    log('🔄 Converting modules to ES modules...', 'blue');
    
    for (const module of modules) {
        try {
            log(`   Converting ${module}...`, 'cyan');
            
            execSync(`node scripts/module-converter.js --source ${module}`, {
                cwd: projectRoot,
                stdio: 'inherit'
            });
            
            log(`   ✅ Converted ${module}`, 'green');
        } catch (error) {
            log(`   ❌ Failed to convert ${module}: ${error.message}`, 'red');
        }
    }
}

/**
 * Generate the hybrid deployment
 * This creates both bundle and import maps versions
 */
function generateHybridDeployment() {
    log('🚀 Generating hybrid deployment...', 'bright');
    
    // Build the bundle
    const bundleName = buildBundle();
    
    // Convert modules to ES modules
    convertModules(config.modulesToConvert);
    
    // Update import maps
    updateImportMaps({
        imports: {
            // Add any new mappings here
            '@/app': './js/app.js',
            '@/config': './js/config.js'
        }
    });
    
    // Verify app loader script exists
    verifyAppLoader();
    
    // Verify browser compatibility utility exists
    verifyBrowserCompatibility();
    
    // Verify entry HTML exists
    verifyEntryHtml();
    
    log('', 'reset');
    log('🎉 Hybrid deployment generated successfully!', 'bright');
    log(`📦 Bundle: ${bundleName}`, 'green');
    log(`🗺️ Import Maps: ${config.importMapsFile}`, 'green');
    log(`🚪 Entry Point: ${config.entryHtml}`, 'green');
    log('', 'reset');
    log('📋 Next Steps:', 'cyan');
    log('   1. Test the entry.html in different browsers', 'yellow');
    log('   2. Verify both bundle and import maps versions work', 'yellow');
    log('   3. Continue converting modules to ES modules', 'yellow');
}

/**
 * Verify that the app loader script exists
 */
function verifyAppLoader() {
    const appLoaderPath = path.join(projectRoot, config.appLoaderScript);
    
    if (!fs.existsSync(appLoaderPath)) {
        log(`❌ App loader script not found: ${config.appLoaderScript}`, 'red');
        log('   Please create the app loader script first', 'yellow');
        process.exit(1);
    }
    
    log(`✅ App loader script verified: ${config.appLoaderScript}`, 'green');
}

/**
 * Verify that the browser compatibility utility exists
 */
function verifyBrowserCompatibility() {
    const browserCompatPath = path.join(projectRoot, config.browserCompatScript);
    
    if (!fs.existsSync(browserCompatPath)) {
        log(`❌ Browser compatibility utility not found: ${config.browserCompatScript}`, 'red');
        log('   Please create the browser compatibility utility first', 'yellow');
        process.exit(1);
    }
    
    log(`✅ Browser compatibility utility verified: ${config.browserCompatScript}`, 'green');
}

/**
 * Verify that the entry HTML exists
 */
function verifyEntryHtml() {
    const entryHtmlPath = path.join(projectRoot, config.entryHtml);
    
    if (!fs.existsSync(entryHtmlPath)) {
        log(`❌ Entry HTML not found: ${config.entryHtml}`, 'red');
        log('   Please create the entry HTML first', 'yellow');
        process.exit(1);
    }
    
    log(`✅ Entry HTML verified: ${config.entryHtml}`, 'green');
}

/**
 * Generate a deployment summary
 */
function generateDeploymentSummary() {
    const summaryPath = path.join(projectRoot, 'HYBRID_DEPLOYMENT_SUMMARY.md');
    const version = getCurrentVersion();
    const timestamp = new Date().toISOString();
    
    const summary = `# Hybrid Deployment Summary

## Version Information
- **Version**: ${version}
- **Generated**: ${timestamp}
- **Generated By**: Hybrid Bundle Manager

## Deployment Files
1. ✅ Bundle HTML: \`${config.bundleHtml}\`
2. ✅ Import Maps HTML: \`${config.importMapsHtml}\`
3. ✅ Entry HTML: \`${config.entryHtml}\`
4. ✅ App Loader: \`${config.appLoaderScript}\`
5. ✅ Browser Compatibility: \`${config.browserCompatScript}\`
6. ✅ Import Maps: \`${config.importMapsFile}\`

## Browser Support
- ✅ Modern Browsers (Chrome 89+, Firefox 89+, Safari 16.4+, Edge 89+): Import Maps Version
- ✅ Legacy Browsers: Bundle Version

## Testing Instructions
1. Open \`${config.entryHtml}\` in different browsers
2. Verify that modern browsers load the Import Maps version
3. Verify that legacy browsers load the Bundle version
4. Check the console for any errors or warnings
5. Test all core functionality in both versions

## Performance Metrics
- Bundle Size: [Run \`ls -lh public/bundle-*.js\` to check]
- Import Maps Load Time: [Measure in browser DevTools]
- Bundle Load Time: [Measure in browser DevTools]

---
Generated by Hybrid Bundle Manager
`;

    fs.writeFileSync(summaryPath, summary);
    log(`📋 Created deployment summary: HYBRID_DEPLOYMENT_SUMMARY.md`, 'cyan');
}

/**
 * Main function
 */
async function main() {
    try {
        const args = process.argv.slice(2);
        const command = args[0] || 'help';
        
        switch (command) {
            case 'build':
                generateHybridDeployment();
                generateDeploymentSummary();
                break;
                
            case 'bundle':
                buildBundle();
                break;
                
            case 'convert':
                convertModules(config.modulesToConvert);
                break;
                
            case 'update-maps':
                updateImportMaps();
                break;
                
            case 'summary':
                generateDeploymentSummary();
                break;
                
            case 'help':
            default:
                log('🔧 Hybrid Bundle Manager - Help', 'bright');
                log('', 'reset');
                log('Commands:', 'cyan');
                log('  build       Generate a complete hybrid deployment', 'yellow');
                log('  bundle      Build only the Browserify bundle', 'yellow');
                log('  convert     Convert modules to ES modules', 'yellow');
                log('  update-maps Update the import maps configuration', 'yellow');
                log('  summary     Generate a deployment summary', 'yellow');
                log('  help        Show this help message', 'yellow');
                break;
        }
        
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        process.exit(1);
    }
}

main();
