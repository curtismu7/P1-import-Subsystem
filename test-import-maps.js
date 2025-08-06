#!/usr/bin/env node

/**
 * Import Maps Test Script
 * 
 * Tests the import maps setup and verifies all modules can be loaded
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

const BASE_URL = 'http://localhost:4000';

async function testImportMapsSetup() {
  console.log('🧪 Testing Import Maps Setup...');
  
  const tests = [];
  
  // Test 1: Check if import maps file exists and is valid
  try {
    const importMapsContent = await fs.readFile('public/import-maps.json', 'utf8');
    const importMaps = JSON.parse(importMapsContent);
    
    const hasImports = 'imports' in importMaps;
    const hasAppModule = 'app' in importMaps.imports;
    const hasStateModule = 'app-state' in importMaps.imports;
    
    tests.push({
      name: 'Import Maps Configuration',
      passed: hasImports && hasAppModule && hasStateModule,
      details: `Imports: ${hasImports}, App: ${hasAppModule}, State: ${hasStateModule}`
    });
  } catch (error) {
    tests.push({
      name: 'Import Maps Configuration',
      passed: false,
      details: `Error: ${error.message}`
    });
  }
  
  // Test 2: Check if main HTML file uses import maps
  try {
    const htmlContent = await fs.readFile('public/index.html', 'utf8');
    
    const hasImportMapScript = htmlContent.includes('type="importmap"');
    const hasModuleScript = htmlContent.includes('type="module"');
    const noBundleReferences = !htmlContent.includes('bundle-');
    
    tests.push({
      name: 'HTML Import Maps Integration',
      passed: hasImportMapScript && hasModuleScript && noBundleReferences,
      details: `ImportMap: ${hasImportMapScript}, Module: ${hasModuleScript}, No Bundles: ${noBundleReferences}`
    });
  } catch (error) {
    tests.push({
      name: 'HTML Import Maps Integration',
      passed: false,
      details: `Error: ${error.message}`
    });
  }
  
  // Test 3: Check if required JS modules exist
  const requiredModules = [
    'public/js/app.js',
    'public/js/state/app-state.js',
    'public/js/layout-manager.js',
    'public/js/version-manager.js'
  ];
  
  let allModulesExist = true;
  const missingModules = [];
  
  for (const module of requiredModules) {
    try {
      await fs.access(module);
    } catch (error) {
      allModulesExist = false;
      missingModules.push(module);
    }
  }
  
  tests.push({
    name: 'Required Modules Exist',
    passed: allModulesExist,
    details: missingModules.length > 0 ? `Missing: ${missingModules.join(', ')}` : 'All modules present'
  });
  
  // Test 4: Check if server supports import maps
  try {
    const response = await fetch(`${BASE_URL}/api/debug/modules`);
    const data = await response.json();
    
    const isImportMapsMode = data.moduleSystem === 'import-maps';
    
    tests.push({
      name: 'Server Import Maps Support',
      passed: isImportMapsMode,
      details: `Module system: ${data.moduleSystem}`
    });
  } catch (error) {
    tests.push({
      name: 'Server Import Maps Support',
      passed: false,
      details: `Server not accessible: ${error.message}`
    });
  }
  
  // Test 5: Check if bundle files are cleaned up
  try {
    const publicFiles = await fs.readdir('public');
    const bundleFiles = publicFiles.filter(file => file.startsWith('bundle-') && file.endsWith('.js'));
    
    tests.push({
      name: 'Bundle Files Cleanup',
      passed: bundleFiles.length === 0,
      details: bundleFiles.length > 0 ? `Found ${bundleFiles.length} bundle files` : 'No bundle files found'
    });
  } catch (error) {
    tests.push({
      name: 'Bundle Files Cleanup',
      passed: false,
      details: `Error: ${error.message}`
    });
  }
  
  // Print results
  console.log('\\n📊 Test Results:');
  console.log('='.repeat(50));
  
  let passedTests = 0;
  tests.forEach(test => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test.name} - ${test.details}`);
    if (test.passed) passedTests++;
  });
  
  const successRate = ((passedTests / tests.length) * 100).toFixed(1);
  
  console.log('\\n' + '='.repeat(50));
  console.log(`📈 Summary: ${passedTests}/${tests.length} tests passed (${successRate}%)`);
  
  if (passedTests === tests.length) {
    console.log('\\n🎉 Import Maps setup is complete and working!');
    console.log('\\n📋 Next steps:');
    console.log('1. Restart your server: npm start');
    console.log('2. Open http://localhost:4000 in your browser');
    console.log('3. Check browser console for any module loading errors');
  } else {
    console.log('\\n⚠️  Some issues need to be resolved before import maps will work properly.');
  }
  
  return passedTests === tests.length;
}

// Run tests
testImportMapsSetup()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });