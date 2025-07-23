#!/usr/bin/env node

/**
 * Unified Build Script
 * 
 * This script provides a unified build process that handles all steps:
 * 1. Build the bundle
 * 2. Minify the bundle
 * 3. Analyze the bundle
 * 4. Verify HTML references
 * 
 * Usage: node scripts/unified-build.js [--production] [--skip-minify] [--skip-analyze]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

async function unifiedBuild() {
  console.log('🚀 Starting unified build process...');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const isProduction = args.includes('--production');
  const skipMinify = args.includes('--skip-minify');
  const skipAnalyze = args.includes('--skip-analyze');
  
  try {
    // Step 1: Build the bundle
    console.log('📦 Building bundle...');
    if (isProduction) {
      execSync('npm run build:production:quick', { stdio: 'inherit' });
    } else {
      execSync('npm run build:bundle', { stdio: 'inherit' });
    }
    
    // Step 2: Minify the bundle (if not skipped and not production)
    if (!skipMinify && !isProduction) {
      console.log('🔧 Minifying bundle...');
      execSync('npm run minify:bundle', { stdio: 'inherit' });
    }
    
    // Step 3: Analyze the bundle (if not skipped)
    if (!skipAnalyze) {
      console.log('🔍 Analyzing bundle...');
      execSync('npm run analyze:bundle', { stdio: 'inherit' });
    }
    
    // Step 4: Verify build
    console.log('✅ Verifying build...');
    execSync('npm run verify:build', { stdio: 'inherit' });
    
    console.log('✨ Unified build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
unifiedBuild();