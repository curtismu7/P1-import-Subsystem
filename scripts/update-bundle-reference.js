#!/usr/bin/env node

/**
 * Update Bundle Reference Script
 * 
 * This script automatically updates the bundle reference in index.html
 * after a new bundle is built, eliminating the need for complex dynamic loading.
 * 
 * Usage: node scripts/update-bundle-reference.js
 * 
 * Last created: 2025-07-22 - Replacing broken dynamic bundle loading system
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateBundleReference() {
    try {
        console.log('🔄 Updating bundle reference in index.html...');
        
        // Read the bundle manifest to get the latest bundle filename
        const manifestPath = path.join(__dirname, '..', 'public', 'js', 'bundle-manifest.json');
        const manifestData = await fs.promises.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestData);
        const bundleFile = manifest.bundleFile;
        
        if (!bundleFile) {
            throw new Error('Bundle filename not found in manifest');
        }
        
        console.log(`📦 Latest bundle: ${bundleFile}`);
        
        // Read the current index.html
        const indexPath = path.join(__dirname, '..', 'public', 'index.html');
        let indexContent = await fs.promises.readFile(indexPath, 'utf8');
        
        // Find and replace the bundle reference
        const bundleRegex = /<script src="js\/bundle-\d+\.js"><\/script>/;
        const newBundleTag = `<script src="js/${bundleFile}"></script>`;
        
        if (bundleRegex.test(indexContent)) {
            indexContent = indexContent.replace(bundleRegex, newBundleTag);
            console.log(`✅ Updated bundle reference to: ${bundleFile}`);
        } else {
            console.warn('⚠️  Could not find existing bundle reference to replace');
            console.log('Current bundle tag should be:', newBundleTag);
        }
        
        // Write the updated index.html
        await fs.promises.writeFile(indexPath, indexContent, 'utf8');
        console.log('✅ index.html updated successfully');
        
        // Verify the update
        const updatedContent = await fs.promises.readFile(indexPath, 'utf8');
        if (updatedContent.includes(`js/${bundleFile}`)) {
            console.log('✅ Bundle reference update verified');
        } else {
            console.error('❌ Bundle reference update failed verification');
        }
        
    } catch (error) {
        console.error('❌ Failed to update bundle reference:', error.message);
        process.exit(1);
    }
}

// Run the update
updateBundleReference();
