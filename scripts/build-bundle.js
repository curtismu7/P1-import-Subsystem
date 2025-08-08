#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Build Bundle Script
 * Creates a bundle manifest for Import Maps migration compatibility
 */

async function createBundleManifest() {
    console.log('🔨 Building bundle manifest...');
    
    const manifestPath = path.join(projectRoot, 'public', 'js', 'bundle-manifest.json');
    const timestamp = Date.now();
    
    // Create a basic bundle manifest for Import Maps migration
    const manifest = {
        version: "7.0.1.0",
        timestamp: timestamp,
        bundleName: `bundle-${timestamp}.js`,
        modules: [
            "pages/home-page.js",
            "pages/import-page.js", 
            "pages/export-page.js",
            "pages/delete-page.js",
            "pages/modify-page.js",
            "pages/settings-page.js",
            "pages/token-manager-page.js",
            "services/population-loader.js",
            "utils/centralized-logger.js",
            "utils/safe-dom.js"
        ],
        importMaps: {
            enabled: true,
            fallbackBundle: true
        },
        buildInfo: {
            buildTime: new Date().toISOString(),
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development'
        }
    };
    
    // Ensure directory exists
    const manifestDir = path.dirname(manifestPath);
    if (!fs.existsSync(manifestDir)) {
        fs.mkdirSync(manifestDir, { recursive: true });
    }
    
    // Write manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log(`✅ Bundle manifest created: ${manifestPath}`);
    console.log(`📦 Bundle name: ${manifest.bundleName}`);
    console.log(`📋 Modules tracked: ${manifest.modules.length}`);
    
    return manifest;
}

async function main() {
    try {
        const manifest = await createBundleManifest();
        console.log('🎉 Bundle build completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Bundle build failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { createBundleManifest };
