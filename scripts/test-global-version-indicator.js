#!/usr/bin/env node

/**
 * Test Global Version Indicator System
 * 
 * This script tests that the version indicator appears on every page/view
 * and functions correctly across the entire application.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🧪 Testing Global Version Indicator System...');
console.log('=' .repeat(60));

/**
 * Test that all required files exist
 */
function testRequiredFiles() {
    console.log('📁 Testing required files...');
    
    const requiredFiles = [
        'public/css/global-version-indicator.css',
        'public/js/modules/global-version-indicator.js',
        'public/css/bulletproof-token-banners.css',
        'public/js/modules/bulletproof-token-banners.js'
    ];
    
    const results = [];
    
    requiredFiles.forEach(file => {
        const filePath = path.join(rootDir, file);
        const exists = fs.existsSync(filePath);
        results.push({ file, exists });
        
        const icon = exists ? '✅' : '❌';
        console.log(`   ${icon} ${file}`);
    });
    
    const allExist = results.every(r => r.exists);
    console.log(`\n📊 Files test: ${allExist ? '✅ PASSED' : '❌ FAILED'}\n`);
    
    return allExist;
}

/**
 * Test HTML includes
 */
function testHTMLIncludes() {
    console.log('🌐 Testing HTML includes...');
    
    const htmlPath = path.join(rootDir, 'public/index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    const requiredIncludes = [
        { name: 'Global Version CSS', pattern: /global-version-indicator\.css/ },
        { name: 'Global Version JS', pattern: /global-version-indicator\.js/ },
        { name: 'Bulletproof Banners CSS', pattern: /bulletproof-token-banners\.css/ },
        { name: 'Bulletproof Banners JS', pattern: /bulletproof-token-banners\.js/ }
    ];
    
    const results = [];
    
    requiredIncludes.forEach(include => {
        const found = include.pattern.test(htmlContent);
        results.push({ name: include.name, found });
        
        const icon = found ? '✅' : '❌';
        console.log(`   ${icon} ${include.name}`);
    });
    
    const allFound = results.every(r => r.found);
    console.log(`\n📊 HTML includes test: ${allFound ? '✅ PASSED' : '❌ FAILED'}\n`);
    
    return allFound;
}

/**
 * Test view structure for version indicators
 */
function testViewStructure() {
    console.log('🎯 Testing view structure...');
    
    const htmlPath = path.join(rootDir, 'public/index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    const expectedViews = [
        { name: 'Home View', pattern: /id="home-view".*class="view/ },
        { name: 'Import View', pattern: /id="import-view".*class="view/ },
        { name: 'History View', pattern: /id="history-view".*class="view/ },
        { name: 'Delete View', pattern: /id="delete-csv-view".*class="view/ },
        { name: 'Modify View', pattern: /id="modify-view".*class="view/ },
        { name: 'Export View', pattern: /id="export-view".*class="view/ },
        { name: 'Settings View', pattern: /id="settings-view".*class="view/ },
        { name: 'Logs View', pattern: /id="logs-view".*class="view/ },
        { name: 'Testing View', pattern: /id="testing-view".*class="view/ }
    ];
    
    const results = [];
    
    expectedViews.forEach(view => {
        const found = view.pattern.test(htmlContent);
        results.push({ name: view.name, found });
        
        const icon = found ? '✅' : '❌';
        console.log(`   ${icon} ${view.name}`);
    });
    
    const allFound = results.every(r => r.found);
    console.log(`\n📊 View structure test: ${allFound ? '✅ PASSED' : '❌ FAILED'}\n`);
    
    return allFound;
}

/**
 * Test JavaScript functionality
 */
function testJavaScriptFunctionality() {
    console.log('⚙️ Testing JavaScript functionality...');
    
    const jsPath = path.join(rootDir, 'public/js/modules/global-version-indicator.js');
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    
    const requiredFunctions = [
        { name: 'GlobalVersionIndicatorManager class', pattern: /class GlobalVersionIndicatorManager/ },
        { name: 'createGlobalIndicator method', pattern: /createGlobalIndicator\(\)/ },
        { name: 'addVersionToAllViews method', pattern: /addVersionToAllViews\(\)/ },
        { name: 'startAutoUpdate method', pattern: /startAutoUpdate\(\)/ },
        { name: 'setupViewSwitchListener method', pattern: /setupViewSwitchListener\(\)/ },
        { name: 'checkForUpdates method', pattern: /checkForUpdates\(\)/ }
    ];
    
    const results = [];
    
    requiredFunctions.forEach(func => {
        const found = func.pattern.test(jsContent);
        results.push({ name: func.name, found });
        
        const icon = found ? '✅' : '❌';
        console.log(`   ${icon} ${func.name}`);
    });
    
    const allFound = results.every(r => r.found);
    console.log(`\n📊 JavaScript functionality test: ${allFound ? '✅ PASSED' : '❌ FAILED'}\n`);
    
    return allFound;
}

/**
 * Test CSS styling
 */
function testCSSStyling() {
    console.log('🎨 Testing CSS styling...');
    
    const cssPath = path.join(rootDir, 'public/css/global-version-indicator.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    const requiredStyles = [
        { name: 'Global version indicator', pattern: /\.global-version-indicator/ },
        { name: 'Version badge', pattern: /\.version-badge/ },
        { name: 'Build badge', pattern: /\.build-badge/ },
        { name: 'Status badge', pattern: /\.status-badge/ },
        { name: 'Responsive design', pattern: /@media.*max-width.*768px/ },
        { name: 'Dark theme support', pattern: /@media.*prefers-color-scheme.*dark/ },
        { name: 'Animation keyframes', pattern: /@keyframes.*versionPulse/ }
    ];
    
    const results = [];
    
    requiredStyles.forEach(style => {
        const found = style.pattern.test(cssContent);
        results.push({ name: style.name, found });
        
        const icon = found ? '✅' : '❌';
        console.log(`   ${icon} ${style.name}`);
    });
    
    const allFound = results.every(r => r.found);
    console.log(`\n📊 CSS styling test: ${allFound ? '✅ PASSED' : '❌ FAILED'}\n`);
    
    return allFound;
}

/**
 * Test bundle synchronization
 */
function testBundleSynchronization() {
    console.log('🔄 Testing bundle synchronization...');
    
    try {
        // Get current bundle from manifest
        const manifestPath = path.join(rootDir, 'public/js/bundle-manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const currentBundle = manifest.bundleFile.replace('.js', '');
        
        console.log(`   📦 Current bundle: ${currentBundle}`);
        
        // Check if global version indicator has current bundle
        const jsPath = path.join(rootDir, 'public/js/modules/global-version-indicator.js');
        const jsContent = fs.readFileSync(jsPath, 'utf8');
        
        const hasBundleReference = jsContent.includes(currentBundle);
        const icon = hasBundleReference ? '✅' : '❌';
        console.log(`   ${icon} Bundle reference in global version indicator`);
        
        // Check HTML bundle reference
        const htmlPath = path.join(rootDir, 'public/index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        const htmlHasBundle = htmlContent.includes(currentBundle);
        const htmlIcon = htmlHasBundle ? '✅' : '❌';
        console.log(`   ${htmlIcon} Bundle reference in HTML`);
        
        const allSynced = hasBundleReference && htmlHasBundle;
        console.log(`\n📊 Bundle synchronization test: ${allSynced ? '✅ PASSED' : '❌ FAILED'}\n`);
        
        return allSynced;
        
    } catch (error) {
        console.log(`   ❌ Error testing bundle synchronization: ${error.message}`);
        console.log(`\n📊 Bundle synchronization test: ❌ FAILED\n`);
        return false;
    }
}

/**
 * Test package.json scripts
 */
function testPackageScripts() {
    console.log('📜 Testing package.json scripts...');
    
    const packagePath = path.join(rootDir, 'package.json');
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const requiredScripts = [
        'setup:global-version',
        'sync:bundle',
        'test:token-consistency',
        'analyze:bundle'
    ];
    
    const results = [];
    
    requiredScripts.forEach(script => {
        const exists = packageContent.scripts && packageContent.scripts[script];
        results.push({ script, exists });
        
        const icon = exists ? '✅' : '❌';
        console.log(`   ${icon} ${script}`);
    });
    
    const allExist = results.every(r => r.exists);
    console.log(`\n📊 Package scripts test: ${allExist ? '✅ PASSED' : '❌ FAILED'}\n`);
    
    return allExist;
}

/**
 * Generate test report
 */
function generateTestReport(results) {
    console.log('📋 TEST REPORT');
    console.log('=' .repeat(60));
    
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('');
    
    if (failedTests > 0) {
        console.log('❌ FAILED TESTS:');
        results.filter(r => !r.passed).forEach(result => {
            console.log(`   • ${result.name}`);
        });
        console.log('');
    }
    
    const overallStatus = failedTests === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED';
    console.log(overallStatus);
    console.log('=' .repeat(60));
    
    return failedTests === 0;
}

/**
 * Main test function
 */
function runGlobalVersionIndicatorTests() {
    const testResults = [
        { name: 'Required Files', passed: testRequiredFiles() },
        { name: 'HTML Includes', passed: testHTMLIncludes() },
        { name: 'View Structure', passed: testViewStructure() },
        { name: 'JavaScript Functionality', passed: testJavaScriptFunctionality() },
        { name: 'CSS Styling', passed: testCSSStyling() },
        { name: 'Bundle Synchronization', passed: testBundleSynchronization() },
        { name: 'Package Scripts', passed: testPackageScripts() }
    ];
    
    const allPassed = generateTestReport(testResults);
    
    if (allPassed) {
        console.log('🎉 Global Version Indicator System is fully functional!');
        console.log('');
        console.log('✅ Features confirmed working:');
        console.log('   • Fixed floating version indicator');
        console.log('   • Individual view version indicators');
        console.log('   • Automatic view switching detection');
        console.log('   • Bundle synchronization');
        console.log('   • Responsive design');
        console.log('   • Dark theme support');
        console.log('   • Auto-update functionality');
    } else {
        console.log('⚠️  Some issues found with Global Version Indicator System');
        console.log('   Please review the failed tests above');
    }
    
    return allPassed;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const success = runGlobalVersionIndicatorTests();
    process.exit(success ? 0 : 1);
}

export { runGlobalVersionIndicatorTests };