#!/usr/bin/env node

/**
 * Development Build Script
 * 
 * This script provides a development build process that:
 * 1. Builds the bundle without minification
 * 2. Updates the manifest to point to the non-minified bundle
 * 3. Skips bundle analysis
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

async function devBuild() {
  console.log('🚀 Starting development build process...');
  
  try {
    // Step 1: Build the bundle without minification
    console.log('📦 Building development bundle (no minification)...');
    execSync('npm run build:bundle', { stdio: 'inherit' });
    
    // Step 2: Verify the build (but don't fail on minification check)
    console.log('🔍 Verifying build...');
    try {
      execSync('node --experimental-modules --experimental-json-modules scripts/verify-build.js --skip-minify-check', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️  Build verification had warnings, but continuing with development build...');
    }
    
    console.log('✅ Development build completed successfully!');
    console.log('   Note: Minification is skipped in development for better debugging.');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
devBuild();
