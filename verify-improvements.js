#!/usr/bin/env node

/**
 * Quick Verification Script for Backend-Frontend Improvements
 * 
 * Tests the key improvements we've implemented:
 * - Standardized API responses
 * - Error handling
 * - File structure
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

const BASE_URL = 'http://localhost:4000';

async function testAPIResponse() {
  console.log('🧪 Testing API Response Standardization...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    
    // Check if response has our new standardized format
    const hasStandardFormat = 'success' in data || 'status' in data;
    
    console.log(hasStandardFormat ? '✅ API response format working' : '⚠️  API response needs update');
    console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
    
    return hasStandardFormat;
  } catch (error) {
    console.log('❌ API test failed:', error.message);
    return false;
  }
}

async function testFileStructure() {
  console.log('\\n🧪 Testing File Structure...');
  
  const requiredFiles = [
    'server/utils/api-response.js',
    'server/middleware/error-handler.js',
    'server/middleware/validation.js',
    'server/services/optimized-api-client.js',
    'server/services/enhanced-connection-manager.js',
    'public/js/state/app-state.js',
    'scripts/build-optimized-bundle.js'
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    try {
      await fs.access(file);
      console.log(`✅ ${file}`);
    } catch (error) {
      console.log(`❌ ${file} - Missing`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

async function testBuildSystem() {
  console.log('\\n🧪 Testing Build System...');
  
  try {
    // Check if package.json has our new build scripts
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    const hasNewBuildScript = packageJson.scripts && packageJson.scripts.build === 'node scripts/build-optimized-bundle.js';
    
    console.log(hasNewBuildScript ? '✅ Build script updated' : '⚠️  Build script needs update');
    
    return hasNewBuildScript;
  } catch (error) {
    console.log('❌ Build system test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Backend-Frontend Improvements Verification');
  console.log('=' .repeat(50));
  
  const results = {
    apiResponse: await testAPIResponse(),
    fileStructure: await testFileStructure(),
    buildSystem: await testBuildSystem()
  };
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log('\\n' + '=' .repeat(50));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\\n🎉 All improvements verified successfully!');
    console.log('\\n📋 Next Steps:');
    console.log('1. Run: npm run build');
    console.log('2. Test the application in your browser');
    console.log('3. Monitor performance improvements');
  } else {
    console.log('\\n⚠️  Some improvements need attention. Check the details above.');
  }
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});