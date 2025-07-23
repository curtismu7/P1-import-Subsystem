#!/usr/bin/env node

/**
 * Build Verification Script
 * 
 * This script verifies that the build process completed successfully and
 * all references are consistent. It checks:
 * 
 * 1. Bundle manifest exists
 * 2. Bundle file referenced in manifest exists
 * 3. HTML references the correct bundle
 * 4. Integrity hash is correct (if present)
 * 
 * Usage: node scripts/verify-build.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

function verifyBuild() {
  console.log('🔍 Verifying build consistency...');
  
  // Check 1: Verify manifest exists
  const manifestPath = path.join(projectRoot, 'public', 'js', 'bundle-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Bundle manifest not found!');
    return false;
  }
  
  // Check 2: Verify bundle file exists
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    console.error('❌ Failed to parse bundle manifest:', error.message);
    return false;
  }
  
  if (!manifest.bundleFile) {
    console.error('❌ Bundle filename not specified in manifest!');
    return false;
  }
  
  const bundlePath = path.join(projectRoot, 'public', 'js', manifest.bundleFile);
  if (!fs.existsSync(bundlePath)) {
    console.error(`❌ Bundle file not found: ${manifest.bundleFile}`);
    return false;
  }
  
  console.log(`✅ Bundle file verified: ${manifest.bundleFile}`);
  
  // Check 3: Verify HTML references the correct bundle
  const indexPath = path.join(projectRoot, 'public', 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ index.html not found!');
    return false;
  }
  
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (!indexContent.includes(`js/${manifest.bundleFile}`)) {
    console.error(`❌ HTML does not reference the correct bundle!`);
    console.error(`Expected: js/${manifest.bundleFile}`);
    return false;
  }
  
  console.log(`✅ HTML bundle reference verified`);
  
  // Check 4: Verify integrity hash (if present)
  if (manifest.integrity && !indexContent.includes(manifest.integrity)) {
    console.error(`❌ HTML does not include the correct integrity hash!`);
    console.error(`Expected: ${manifest.integrity}`);
    return false;
  } else if (manifest.integrity) {
    console.log(`✅ Integrity hash verified`);
  }
  
  // Check 5: Verify bundle size is reasonable
  try {
    const stats = fs.statSync(bundlePath);
    const bundleSize = stats.size;
    
    if (bundleSize < 1000) {
      console.error(`❌ Bundle file is suspiciously small (${bundleSize} bytes)!`);
      return false;
    }
    
    console.log(`✅ Bundle size verified: ${formatBytes(bundleSize)}`);
  } catch (error) {
    console.error(`❌ Failed to check bundle size:`, error.message);
    return false;
  }
  
  // Check 6: Verify bundle content (basic check)
  try {
    const bundleContent = fs.readFileSync(bundlePath, 'utf8');
    
    // Check for common expected content in the bundle
    const hasAppClass = bundleContent.includes('class App');
    const hasEventListeners = bundleContent.includes('addEventListener');
    
    if (!hasAppClass || !hasEventListeners) {
      console.error(`❌ Bundle content verification failed!`);
      console.error(`- Contains App class: ${hasAppClass}`);
      console.error(`- Contains event listeners: ${hasEventListeners}`);
      return false;
    }
    
    console.log(`✅ Bundle content basic verification passed`);
  } catch (error) {
    console.error(`❌ Failed to verify bundle content:`, error.message);
    return false;
  }
  
  console.log('✅ All build verification checks passed!');
  return true;
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run verification and exit with appropriate code
if (!verifyBuild()) {
  console.error('\n❌ Build verification failed! Please check the errors above.');
  process.exit(1);
} else {
  console.log('\n✅ Build verification completed successfully!');
}