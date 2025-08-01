#!/usr/bin/env node

/**
 * Test Token Storage Consistency
 * 
 * This script verifies that all token management systems use the same storage keys
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔍 Testing Token Storage Consistency...');
console.log('=' .repeat(50));

// Check current bundle for token storage consistency
const manifestPath = path.join(rootDir, 'public/js/bundle-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const bundlePath = path.join(rootDir, 'public/js', manifest.bundleFile);

if (fs.existsSync(bundlePath)) {
    const bundleContent = fs.readFileSync(bundlePath, 'utf8');
    
    // Check for old token key
    const oldTokenMatches = bundleContent.match(/pingone_worker_token/g);
    const newTokenMatches = bundleContent.match(/pingone_token/g);
    
    console.log(`📦 Bundle: ${manifest.bundleFile}`);
    console.log(`❌ Old token key (pingone_worker_token): ${oldTokenMatches ? oldTokenMatches.length : 0} occurrences`);
    console.log(`✅ New token key (pingone_token): ${newTokenMatches ? newTokenMatches.length : 0} occurrences`);
    
    if (oldTokenMatches && oldTokenMatches.length > 0) {
        console.log('⚠️  WARNING: Old token keys still found in bundle!');
        process.exit(1);
    } else {
        console.log('✅ Token storage consistency verified!');
    }
} else {
    console.log('❌ Bundle file not found!');
    process.exit(1);
}

console.log('=' .repeat(50));
console.log('🎯 Token consistency test completed successfully!');