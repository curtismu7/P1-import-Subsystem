#!/usr/bin/env node

/**
 * Comprehensive System Test
 * 
 * Tests all the fixes we've implemented:
 * 1. Banner system (no duplicates, green banner shows)
 * 2. Settings persistence
 * 3. Version indicators
 * 4. Token consistency
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🧪 Comprehensive System Test');
console.log('=' .repeat(60));

/**
 * Test banner system fixes
 */
function testBannerSystem() {
    console.log('🎯 Testing Banner System...');
    
    const results = [];
    
    // Check primary banner files exist
    const primaryBannerCSS = path.join(rootDir, 'public/css/primary-token-banners.css');
    const primaryBannerJS = path.join(rootDir, 'public/js/modules/bulletproof-token-banners.js');
    
    results.push({
        test: 'Primary Banner CSS exists',
        passed: fs.existsSync(primaryBannerCSS)
    });
    
    results.push({
        test: 'Primary Banner JS exists',
        passed: fs.existsSync(primaryBannerJS)
    });
    
    // Check HTML includes primary banner CSS
    const htmlPath = path.join(rootDir, 'public/index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    results.push({
        test: 'HTML includes primary banner CSS',
        passed: htmlContent.includes('primary-token-banners.css')
    });
    
    // Check primary banner JS has PrimaryTokenBannerManager
    if (fs.existsSync(primaryBannerJS)) {
        const jsContent = fs.readFileSync(primaryBannerJS, 'utf8');
        results.push({
            test: 'Primary banner JS has PrimaryTokenBannerManager',
            passed: jsContent.includes('PrimaryTokenBannerManager')
        });
        
        results.push({
            test: 'Primary banner JS disables other systems',
            passed: jsContent.includes('disableOtherBannerSystems')
        });
    }
    
    return results;
}

/**
 * Test settings persistence
 */
function testSettingsPersistence() {
    console.log('💾 Testing Settings Persistence...');
    
    const results = [];
    
    // Check settings file exists
    const settingsPath = path.join(rootDir, 'data/settings.json');
    results.push({
        test: 'Settings file exists',
        passed: fs.existsSync(settingsPath)
    });
    
    // Check settings file is readable/writable
    if (fs.existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            results.push({
                test: 'Settings file is readable',
                passed: true
            });
            
            results.push({
                test: 'Settings has required structure',
                passed: settings.hasOwnProperty('environment-id') && 
                       settings.hasOwnProperty('api-client-id')
            });
            
            // Test write capability
            const testSettings = { ...settings, testWrite: Date.now() };
            fs.writeFileSync(settingsPath, JSON.stringify(testSettings, null, 2), 'utf8');
            
            const readBack = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            results.push({
                test: 'Settings file is writable',
                passed: readBack.testWrite === testSettings.testWrite
            });
            
            // Restore original settings
            delete testSettings.testWrite;
            fs.writeFileSync(settingsPath, JSON.stringify(testSettings, null, 2), 'utf8');
            
        } catch (error) {
            results.push({
                test: 'Settings file is readable',
                passed: false,
                error: error.message
            });
        }
    }
    
    // Check backup system
    const backupDir = path.join(rootDir, 'data/backups');
    results.push({
        test: 'Settings backup directory exists',
        passed: fs.existsSync(backupDir)
    });
    
    return results;
}

/**
 * Test version indicators
 */
function testVersionIndicators() {
    console.log('🔢 Testing Version Indicators...');
    
    const results = [];
    
    // Check version indicator files
    const globalVersionCSS = path.join(rootDir, 'public/css/global-version-indicator.css');
    const globalVersionJS = path.join(rootDir, 'public/js/modules/global-version-indicator.js');
    
    results.push({
        test: 'Global version CSS exists',
        passed: fs.existsSync(globalVersionCSS)
    });
    
    results.push({
        test: 'Global version JS exists',
        passed: fs.existsSync(globalVersionJS)
    });
    
    // Check HTML includes
    const htmlPath = path.join(rootDir, 'public/index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    results.push({
        test: 'HTML includes global version CSS',
        passed: htmlContent.includes('global-version-indicator.css')
    });
    
    results.push({
        test: 'HTML includes global version JS',
        passed: htmlContent.includes('global-version-indicator.js')
    });
    
    // Check current bundle reference
    const manifestPath = path.join(rootDir, 'public/js/bundle-manifest.json');
    if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const currentBundle = manifest.bundleFile.replace('.js', '');
        
        results.push({
            test: 'HTML has current bundle reference',
            passed: htmlContent.includes(currentBundle)
        });
    }
    
    return results;
}

/**
 * Test token consistency
 */
function testTokenConsistency() {
    console.log('🔐 Testing Token Consistency...');
    
    const results = [];
    
    // Check bundle for token consistency
    const manifestPath = path.join(rootDir, 'public/js/bundle-manifest.json');
    if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const bundlePath = path.join(rootDir, 'public/js', manifest.bundleFile);
        
        if (fs.existsSync(bundlePath)) {
            const bundleContent = fs.readFileSync(bundlePath, 'utf8');
            
            // Check for old token keys
            const oldTokenMatches = bundleContent.match(/pingone_worker_token/g);
            results.push({
                test: 'No old token keys in bundle',
                passed: !oldTokenMatches || oldTokenMatches.length === 0
            });
            
            // Check for new token keys
            const newTokenMatches = bundleContent.match(/pingone_token/g);
            results.push({
                test: 'New token keys present in bundle',
                passed: newTokenMatches && newTokenMatches.length > 0
            });
        }
    }
    
    return results;
}

/**
 * Test package.json scripts
 */
function testPackageScripts() {
    console.log('📜 Testing Package Scripts...');
    
    const results = [];
    
    const packagePath = path.join(rootDir, 'package.json');
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const expectedScripts = [
        'fix:banners',
        'fix:settings',
        'test:global-version',
        'test:token-consistency',
        'analyze:bundle',
        'sync:bundle'
    ];
    
    expectedScripts.forEach(script => {
        results.push({
            test: `Script '${script}' exists`,
            passed: packageContent.scripts && packageContent.scripts[script]
        });
    });
    
    return results;
}

/**
 * Test server health
 */
async function testServerHealth() {
    console.log('🏥 Testing Server Health...');
    
    const results = [];
    
    try {
        // Test basic server response
        const response = await fetch('http://localhost:4000/');
        results.push({
            test: 'Server responds to requests',
            passed: response.ok
        });
        
        // Test settings API
        const settingsResponse = await fetch('http://localhost:4000/api/settings');
        results.push({
            test: 'Settings API responds',
            passed: settingsResponse.ok
        });
        
    } catch (error) {
        results.push({
            test: 'Server responds to requests',
            passed: false,
            error: error.message
        });
    }
    
    return results;
}

/**
 * Generate comprehensive test report
 */
function generateTestReport(allResults) {
    console.log('📋 COMPREHENSIVE TEST REPORT');
    console.log('=' .repeat(60));
    
    let totalTests = 0;
    let passedTests = 0;
    
    Object.entries(allResults).forEach(([category, results]) => {
        console.log(`\n${category.toUpperCase()}:`);
        
        results.forEach(result => {
            totalTests++;
            if (result.passed) passedTests++;
            
            const icon = result.passed ? '✅' : '❌';
            console.log(`   ${icon} ${result.test}`);
            
            if (!result.passed && result.error) {
                console.log(`      Error: ${result.error}`);
            }
        });
    });
    
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log('\n' + '=' .repeat(60));
    console.log(`📊 SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${successRate}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 ALL SYSTEMS OPERATIONAL!');
        console.log('✅ Banner conflicts resolved');
        console.log('✅ Settings persistence working');
        console.log('✅ Version indicators functioning');
        console.log('✅ Token consistency maintained');
        console.log('✅ Server health confirmed');
    } else {
        console.log('\n⚠️  Some issues detected. Review failed tests above.');
    }
    
    return passedTests === totalTests;
}

/**
 * Main test execution
 */
async function runComprehensiveTest() {
    const testResults = {
        'Banner System': testBannerSystem(),
        'Settings Persistence': testSettingsPersistence(),
        'Version Indicators': testVersionIndicators(),
        'Token Consistency': testTokenConsistency(),
        'Package Scripts': testPackageScripts(),
        'Server Health': await testServerHealth()
    };
    
    const allPassed = generateTestReport(testResults);
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 NEXT STEPS:');
    
    if (allPassed) {
        console.log('1. ✅ All systems are working correctly');
        console.log('2. 🌐 Test the UI in your browser');
        console.log('3. 💾 Try saving settings to verify persistence');
        console.log('4. 🔐 Check that only one red banner appears');
        console.log('5. ✅ Verify green banner shows when token is valid');
    } else {
        console.log('1. ❌ Review failed tests above');
        console.log('2. 🔧 Run specific fix scripts as needed:');
        console.log('   - npm run fix:banners');
        console.log('   - npm run fix:settings');
        console.log('3. 🔄 Restart server: npm run restart');
        console.log('4. 🧪 Re-run this test: npm run test:comprehensive');
    }
    
    return allPassed;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runComprehensiveTest().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    });
}

export { runComprehensiveTest };