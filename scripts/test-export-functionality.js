#!/usr/bin/env node

/**
 * Test Export Functionality
 * 
 * This script tests the export system to identify and fix issues with:
 * 1. Population dropdown not working
 * 2. Export functionality not functioning
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🧪 Testing Export Functionality...');
console.log('=' .repeat(60));

/**
 * Test export API endpoints
 */
async function testExportAPI() {
    console.log('🌐 Testing Export API Endpoints...');
    
    const results = [];
    
    try {
        // Test populations API
        console.log('   Testing /api/populations...');
        const populationsResponse = await fetch('http://localhost:4000/api/populations');
        
        results.push({
            test: 'Populations API responds',
            passed: populationsResponse.ok,
            status: populationsResponse.status
        });
        
        if (populationsResponse.ok) {
            const populationsData = await populationsResponse.json();
            results.push({
                test: 'Populations API returns data',
                passed: populationsData.success && Array.isArray(populationsData.populations),
                data: populationsData
            });
            
            console.log(`   Found ${populationsData.populations?.length || 0} populations`);
        }
        
        // Test export API
        console.log('   Testing /api/export/users...');
        const exportResponse = await fetch('http://localhost:4000/api/export/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                populationId: 'ALL',
                format: 'csv',
                includeHeaders: true
            })
        });
        
        results.push({
            test: 'Export API responds',
            passed: exportResponse.status !== 404,
            status: exportResponse.status
        });
        
    } catch (error) {
        results.push({
            test: 'Export API connection',
            passed: false,
            error: error.message
        });
    }
    
    return results;
}

/**
 * Test export HTML elements
 */
function testExportHTML() {
    console.log('📄 Testing Export HTML Elements...');
    
    const results = [];
    
    try {
        const htmlPath = path.join(rootDir, 'public/index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Test for export view
        results.push({
            test: 'Export view exists',
            passed: htmlContent.includes('id="export-view"')
        });
        
        // Test for population dropdown
        results.push({
            test: 'Population dropdown exists',
            passed: htmlContent.includes('id="export-population-select"')
        });
        
        // Test for export button
        results.push({
            test: 'Export button exists',
            passed: htmlContent.includes('id="export-btn"') || htmlContent.includes('export-btn')
        });
        
        // Test for format selection
        results.push({
            test: 'Format selection exists',
            passed: htmlContent.includes('export-format')
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
 * Test export subsystem files
 */
function testExportSubsystemFiles() {
    console.log('📁 Testing Export Subsystem Files...');
    
    const results = [];
    
    const exportFiles = [
        'src/client/subsystems/export-subsystem.js',
        'src/client/subsystems/bulletproof-export-subsystem.js'
    ];
    
    exportFiles.forEach(filePath => {
        const fullPath = path.join(rootDir, filePath);
        const exists = fs.existsSync(fullPath);
        
        results.push({
            test: `${path.basename(filePath)} exists`,
            passed: exists
        });
        
        if (exists) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                
                results.push({
                    test: `${path.basename(filePath)} has loadPopulations method`,
                    passed: content.includes('loadPopulations')
                });
                
                results.push({
                    test: `${path.basename(filePath)} has populateDropdown method`,
                    passed: content.includes('populateDropdown')
                });
                
            } catch (error) {
                results.push({
                    test: `${path.basename(filePath)} readable`,
                    passed: false,
                    error: error.message
                });
            }
        }
    });
    
    return results;
}

/**
 * Test export routes
 */
function testExportRoutes() {
    console.log('🛣️ Testing Export Routes...');
    
    const results = [];
    
    try {
        const routesDir = path.join(rootDir, 'routes');
        const routeFiles = fs.readdirSync(routesDir).filter(file => 
            file.includes('export') || file.includes('population')
        );
        
        results.push({
            test: 'Export route files exist',
            passed: routeFiles.length > 0,
            files: routeFiles
        });
        
        // Check for populations route
        const populationsRoutePath = path.join(routesDir, 'populations.js');
        if (fs.existsSync(populationsRoutePath)) {
            const content = fs.readFileSync(populationsRoutePath, 'utf8');
            
            results.push({
                test: 'Populations route has GET endpoint',
                passed: content.includes('router.get') && content.includes('/api/populations')
            });
        }
        
        // Check for export route
        const exportRoutePath = path.join(routesDir, 'export.js');
        if (fs.existsSync(exportRoutePath)) {
            const content = fs.readFileSync(exportRoutePath, 'utf8');
            
            results.push({
                test: 'Export route has POST endpoint',
                passed: content.includes('router.post') && content.includes('/users')
            });
        }
        
    } catch (error) {
        results.push({
            test: 'Routes directory accessible',
            passed: false,
            error: error.message
        });
    }
    
    return results;
}

/**
 * Analyze export system configuration
 */
function analyzeExportConfiguration() {
    console.log('⚙️ Analyzing Export Configuration...');
    
    const results = [];
    
    try {
        // Check app.js for export subsystem registration
        const appPath = path.join(rootDir, 'src/client/app.js');
        const appContent = fs.readFileSync(appPath, 'utf8');
        
        results.push({
            test: 'Export subsystem registered in app.js',
            passed: appContent.includes('ExportSubsystem') && appContent.includes('export')
        });
        
        // Check for feature flags
        results.push({
            test: 'Export feature flag exists',
            passed: appContent.includes('USE_EXPORT_SUBSYSTEM')
        });
        
        // Check bundle for export functionality
        const manifestPath = path.join(rootDir, 'public/js/bundle-manifest.json');
        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const bundlePath = path.join(rootDir, 'public/js', manifest.bundleFile);
            
            if (fs.existsSync(bundlePath)) {
                const bundleContent = fs.readFileSync(bundlePath, 'utf8');
                
                results.push({
                    test: 'Export functionality in bundle',
                    passed: bundleContent.includes('ExportSubsystem') || bundleContent.includes('export-population-select')
                });
            }
        }
        
    } catch (error) {
        results.push({
            test: 'Configuration analysis',
            passed: false,
            error: error.message
        });
    }
    
    return results;
}

/**
 * Generate export test report
 */
function generateExportTestReport(allResults) {
    console.log('📋 EXPORT FUNCTIONALITY TEST REPORT');
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
            
            if (result.data && result.test.includes('Populations API returns data')) {
                console.log(`      Populations found: ${result.data.populations?.length || 0}`);
            }
            
            if (result.files) {
                console.log(`      Files: ${result.files.join(', ')}`);
            }
        });
    });
    
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log('\n' + '=' .repeat(60));
    console.log(`📊 EXPORT TEST SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${successRate}%`);
    
    if (failedTests.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        failedTests.forEach(test => {
            console.log(`   • ${test.category}: ${test.test}`);
            if (test.error) {
                console.log(`     Error: ${test.error}`);
            }
        });
    }
    
    console.log('\n🔧 RECOMMENDED FIXES:');
    
    if (failedTests.some(t => t.test.includes('Populations API'))) {
        console.log('   1. Check populations API endpoint and route');
        console.log('   2. Verify database connection for populations');
    }
    
    if (failedTests.some(t => t.test.includes('Export API'))) {
        console.log('   3. Check export API endpoint and route');
        console.log('   4. Verify export functionality implementation');
    }
    
    if (failedTests.some(t => t.test.includes('loadPopulations'))) {
        console.log('   5. Fix population loading in export subsystem');
        console.log('   6. Ensure proper subsystem initialization');
    }
    
    return passedTests === totalTests;
}

/**
 * Main test execution
 */
async function runExportFunctionalityTest() {
    const testResults = {
        'Export API': await testExportAPI(),
        'Export HTML': testExportHTML(),
        'Export Subsystem Files': testExportSubsystemFiles(),
        'Export Routes': testExportRoutes(),
        'Export Configuration': analyzeExportConfiguration()
    };
    
    const allPassed = generateExportTestReport(testResults);
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 NEXT STEPS:');
    
    if (allPassed) {
        console.log('✅ All export tests passed - functionality should be working');
        console.log('🌐 Test the export dropdown in your browser');
    } else {
        console.log('❌ Some export tests failed - fixes needed');
        console.log('🔧 Review failed tests and apply recommended fixes');
        console.log('🔄 Run this test again after fixes: npm run test:export');
    }
    
    return allPassed;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runExportFunctionalityTest().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Export test execution failed:', error.message);
        process.exit(1);
    });
}

export { runExportFunctionalityTest };