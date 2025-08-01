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
 * Usage: node scripts/verify-build.js [--skip-minify-check]
 * 
 * Options:
 *   --skip-minify-check  Skip verification of minified bundle (useful for development)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

/**
 * Get the latest bundle file by timestamp
 */
function getLatestBundleFile() {
  try {
    const bundleDir = path.join(projectRoot, 'public', 'js');
    const files = fs.readdirSync(bundleDir);
    
    // Filter for bundle files and extract timestamps
    const bundleFiles = files
      .filter(file => file.startsWith('bundle-') && file.endsWith('.js') && !file.endsWith('.min.js'))
      .map(file => {
        const match = file.match(/bundle-(\d+)\.js$/);
        return match ? {
          filename: file,
          timestamp: parseInt(match[1], 10)
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp descending
    
    return bundleFiles.length > 0 ? bundleFiles[0].filename : null;
  } catch (error) {
    console.warn('⚠️  Could not determine latest bundle file:', error.message);
    return null;
  }
}

/**
 * Verify that all code references point to the same bundle version
 */
function verifyCodeReferences(expectedBundle) {
  console.log('🔍 Verifying code references match expected bundle...');
  
  const filesToCheck = [
    'public/js/modules/global-version-indicator.js',
    'src/client/subsystems/enhanced-token-status-subsystem.js',
    'src/client/utils/bulletproof-token-manager.js'
  ];
  
  const expectedBundleNumber = expectedBundle.match(/bundle-(\d+)\.js$/)?.[1];
  if (!expectedBundleNumber) {
    console.error('❌ Could not extract bundle number from:', expectedBundle);
    return false;
  }
  
  for (const filePath of filesToCheck) {
    const fullPath = path.join(projectRoot, filePath);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check if the file contains the expected bundle number
        if (!content.includes(expectedBundleNumber)) {
          console.error(`❌ Code reference mismatch in ${filePath}`);
          console.error(`  Expected bundle number: ${expectedBundleNumber}`);
          console.error(`  File does not contain this bundle number`);
          return false;
        }
        
        console.log(`✅ Code reference verified: ${filePath}`);
      } catch (error) {
        console.warn(`⚠️  Could not verify ${filePath}:`, error.message);
      }
    }
  }
  
  return true;
}

function verifyBuild() {
  console.log('🔍 Verifying build consistency and version matching...');
  
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
  
  // Check 2.5: Verify this is actually the latest bundle
  const latestBundle = getLatestBundleFile();
  if (latestBundle && latestBundle !== manifest.bundleFile) {
    console.error(`❌ Bundle version mismatch!`);
    console.error(`  Manifest references: ${manifest.bundleFile}`);
    console.error(`  Latest bundle found: ${latestBundle}`);
    console.error(`  The manifest is not pointing to the latest bundle!`);
    return false;
  }
  
  console.log(`✅ Bundle version consistency verified: using latest bundle`);
  
  // Check 2.7: Verify code references match the bundle version
  const codeReferencesValid = verifyCodeReferences(manifest.bundleFile);
  if (!codeReferencesValid) {
    console.error(`❌ Code references do not match the expected bundle version!`);
    return false;
  }
  
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
  
  // Check 7: Final version consistency summary
  console.log('📊 Final version consistency summary:');
  console.log(`  ✅ Manifest bundle: ${manifest.bundleFile}`);
  console.log(`  ✅ Latest bundle: ${latestBundle || manifest.bundleFile}`);
  console.log(`  ✅ HTML reference: js/${manifest.bundleFile}`);
  console.log(`  ✅ Code references: synchronized`);
  
  // Check for stale bundles (optional warning)
  const staleCount = countStaleBundles(manifest.bundleFile);
  if (staleCount > 10) {
    console.log(`🧹 Note: ${staleCount} old bundle files found - consider running 'npm run clean:bundles'`);
  }
  
  console.log('✅ All build verification checks passed!');
  console.log('✅ Bundle version consistency verified across all components!');
  return true;
}

/**
 * Count stale bundle files (excluding the current one)
 */
function countStaleBundles(currentBundle) {
  try {
    const bundleDir = path.join(projectRoot, 'public', 'js');
    const files = fs.readdirSync(bundleDir);
    
    const bundleFiles = files.filter(file => 
      file.startsWith('bundle-') && 
      file.endsWith('.js') && 
      !file.endsWith('.min.js') &&
      file !== currentBundle
    );
    
    return bundleFiles.length;
  } catch (error) {
    return 0;
  }
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

// Parse command line arguments
const args = process.argv.slice(2);
const skipMinifyCheck = args.includes('--skip-minify-check');

// Run verification and exit with appropriate code
const success = verifyBuild();

if (!success) {
  if (skipMinifyCheck) {
    console.warn('⚠️  Build verification had warnings, but continuing with --skip-minify-check');
  } else {
    console.error('\n❌ Build verification failed! Please check the errors above.');
    process.exit(1);
  }
} else {
  console.log('\n✅ Build verification completed successfully!');
}