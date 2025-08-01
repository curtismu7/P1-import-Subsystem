#!/usr/bin/env node

/**
 * Test Green Banner Functionality
 * 
 * This script tests the bulletproof token banner system to ensure
 * the green banner shows when a token is valid.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🧪 Testing Green Banner Functionality...');
console.log('=' .repeat(60));

/**
 * Test bulletproof system files
 */
function testBulletproofSystemFiles() {
    console.log('📁 Testing bulletproof system files...');
    
    const results = [];
    
    const requiredFiles = [
        'public/js/modules/bulletproof-token-banner-system.js',
        'public/css/bulletproof-token-banner-system.css',
        'public/css/app-footer.css'
    ];
    
    requiredFiles.forEach(filePath => {
        const fullPath = path.join(rootDir, filePath);
        const exists = fs.existsSync(fullPath);
        
        results.push({
            test: `${path.basename(filePath)} exists`,
            passed: exists
        });
        
        if (exists && filePath.includes('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            results.push({
                test: `${path.basename(filePath)} has BulletproofTokenBannerSystem class`,
                passed: content.includes('BulletproofTokenBannerSystem')
            });
            
            results.push({
                test: `${path.basename(filePath)} has green banner logic`,
                passed: content.includes('updateGreenBanner') && content.includes('TOKEN ACTIVE')
            });
            
            results.push({
                test: `${path.basename(filePath)} has testing methods`,
                passed: content.includes('simulateToken') && content.includes('checkTokenNow')
            });
        }
    });
    
    return results;
}

/**
 * Test HTML integration
 */
function testHTMLIntegration() {
    console.log('📄 Testing HTML integration...');
    
    const results = [];
    
    try {
        const htmlPath = path.join(rootDir, 'public/index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        results.push({
            test: 'Bulletproof CSS included',
            passed: htmlContent.includes('bulletproof-token-banner-system.css')
        });
        
        results.push({
            test: 'Bulletproof JS included',
            passed: htmlContent.includes('bulletproof-token-banner-system.js')
        });
        
        results.push({
            test: 'Footer CSS included',
            passed: htmlContent.includes('app-footer.css')
        });
        
        results.push({
            test: 'Version indicator moved from home',
            passed: htmlContent.includes('Version indicator moved to footer')
        });
        
    } catch (error) {
        results.push({
            test: 'HTML file readable',
            passed: false,
            error: error.message
        });
    }
    
    return results;
}

/**
 * Generate test report
 */
function generateTestReport(allResults) {
    console.log('📋 GREEN BANNER TEST REPORT');
    console.log('=' .repeat(60));
    
    let totalTests = 0;
    let passedTests = 0;
    const failedTests = [];
    
    Object.entries(allResults).forEach(([category, results]) => {
        console.log(`\n${category.toUpperCase()}:`);
        
        results.forEach(result => {
            totalTests++;
            if (result.passed) passedTests++;
            else failedTests.push({ category, ...result });
            
            const icon = result.passed ? '✅' : '❌';
            console.log(`   ${icon} ${result.test}`);
            
            if (!result.passed && result.error) {
                console.log(`      Error: ${result.error}`);
            }
        });
    });
    
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log('\n' + '=' .repeat(60));
    console.log(`📊 TEST SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${successRate}%`);
    
    console.log('\n🧪 TESTING INSTRUCTIONS:');
    console.log('1. Open your browser and go to http://localhost:4000');
    console.log('2. Open browser console (F12)');
    console.log('3. Run: simulateToken()');
    console.log('4. You should see a GREEN BANNER appear with:');
    console.log('   • ✅ TOKEN ACTIVE');
    console.log('   • Time Left: 59:59');
    console.log('   • Build: bundle-1754042411');
    console.log('   • v6.5.2.4');
    console.log('   • Last change description');
    console.log('5. The banner should be GREEN with "Valid & Active" status');
    console.log('');
    console.log('🔧 TROUBLESHOOTING:');
    console.log('• If no green banner: Check browser console for errors');
    console.log('• If simulateToken() not found: Bulletproof system not loaded');
    console.log('• If banner is red: Token simulation failed');
    console.log('');
    console.log('🎯 ADDITIONAL TESTS:');
    console.log('• Run: checkTokenNow() - to manually trigger token check');
    console.log('• Check footer: Version indicator should be at bottom of all pages');
    
    return passedTests === totalTests;
}

/**
 * Main test execution
 */
async function runGreenBannerTest() {
    const testResults = {
        'Bulletproof System Files': testBulletproofSystemFiles(),
        'HTML Integration': testHTMLIntegration()
    };
    
    const allPassed = generateTestReport(testResults);
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 SUMMARY:');
    
    if (allPassed) {
        console.log('✅ All tests passed - Green banner system ready for testing');
        console.log('🌐 Follow the testing instructions above');
    } else {
        console.log('❌ Some tests failed - system may not work correctly');
        console.log('🔧 Fix failed tests before testing green banner');
    }
    
    return allPassed;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runGreenBannerTest().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Green banner test failed:', error.message);
        process.exit(1);
    });
}

export { runGreenBannerTest };