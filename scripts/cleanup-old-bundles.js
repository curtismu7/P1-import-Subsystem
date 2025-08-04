/**
 * Cleanup Old Bundles Script
 * Version: 7.0.0.19
 * 
 * This script deletes old bundle files while keeping the latest one.
 * It helps keep the project clean and reduces disk space usage.
 */

import fs from 'fs';
import path from 'path';

const PUBLIC_JS_DIR = path.join(process.cwd(), 'public', 'js');
const BUNDLE_PREFIX = 'bundle-';
const BUNDLE_MANIFEST = path.join(PUBLIC_JS_DIR, 'bundle-manifest.json');

/**
 * Get the current active bundle from the manifest
 */
function getCurrentBundle() {
    try {
        const manifestContent = fs.readFileSync(BUNDLE_MANIFEST, 'utf8');
        const manifest = JSON.parse(manifestContent);
        return manifest.bundleFile;
    } catch (error) {
        console.error('❌ Error reading bundle manifest:', error.message);
        return null;
    }
}

/**
 * Find all bundle files in the public/js directory
 */
function findBundleFiles() {
    try {
        const files = fs.readdirSync(PUBLIC_JS_DIR);
        return files.filter(file => 
            file.startsWith(BUNDLE_PREFIX) && 
            file.endsWith('.js') && 
            !file.includes('.map')
        );
    } catch (error) {
        console.error('❌ Error reading directory:', error.message);
        return [];
    }
}

/**
 * Delete old bundle files
 */
function deleteOldBundles(currentBundle, allBundles) {
    console.log(`🔍 Current bundle: ${currentBundle}`);
    console.log(`🔍 Found ${allBundles.length} bundle files`);
    
    let deletedCount = 0;
    
    for (const bundle of allBundles) {
        if (bundle !== currentBundle) {
            try {
                fs.unlinkSync(path.join(PUBLIC_JS_DIR, bundle));
                console.log(`🗑️ Deleted old bundle: ${bundle}`);
                deletedCount++;
            } catch (error) {
                console.error(`❌ Error deleting ${bundle}:`, error.message);
            }
        }
    }
    
    return deletedCount;
}

// Main execution
console.log('🧹 Starting bundle cleanup...');

const currentBundle = getCurrentBundle();
if (!currentBundle) {
    console.error('❌ Could not determine current bundle. Aborting cleanup.');
    process.exit(1);
}

const allBundles = findBundleFiles();
const deletedCount = deleteOldBundles(currentBundle, allBundles);

console.log(`✅ Bundle cleanup complete. Deleted ${deletedCount} old bundle files.`);
console.log(`✅ Kept current bundle: ${currentBundle}`);
