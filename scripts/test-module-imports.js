#!/usr/bin/env node

/**
 * 🛡️ BULLETPROOF MODULE IMPORT TESTER
 * 
 * This script tests that all JavaScript modules can be imported without errors.
 * It simulates browser module loading to catch import/export issues.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// ANSI color codes for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'white') {
    console.log(colorize(message, color));
}

function logHeader(message) {
    console.log('\n' + '='.repeat(60));
    console.log(colorize(message, 'cyan'));
    console.log('='.repeat(60));
}

function logSection(message) {
    console.log('\n' + colorize(message, 'yellow'));
    console.log('-'.repeat(40));
}

async function testModuleImports() {
    try {
        logHeader('🛡️ BULLETPROOF MODULE IMPORT TESTER');
        
        // Test server response first
        logSection('🌐 Server Connectivity Test');
        try {
            const response = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:4000', { encoding: 'utf8' });
            if (response.trim() === '200') {
                log('✅ Server is responding correctly', 'green');
            } else {
                log(`❌ Server returned status: ${response.trim()}`, 'red');
                return;
            }
        } catch (error) {
            log('❌ Server is not accessible', 'red');
            log('   Make sure the server is running: npm start', 'blue');
            return;
        }
        
        // Test critical JavaScript modules
        logSection('📦 Critical Module Tests');
        const criticalModules = [
            'js/modules/logger.js',
            'js/modules/circuit-breaker.js',
            'js/modules/bulletproof-token-status.js',
            'js/modules/bulletproof-token-manager.js',
            'js/modules/token-integration.js',
            'src/client/utils/safe-logger.js'
        ];
        
        let passedTests = 0;
        let totalTests = criticalModules.length;
        
        for (const module of criticalModules) {
            try {
                const response = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/${module}`, { encoding: 'utf8' });
                if (response.trim() === '200') {
                    log(`✅ ${module}`, 'green');
                    passedTests++;
                } else {
                    log(`❌ ${module} - Status: ${response.trim()}`, 'red');
                }
            } catch (error) {
                log(`❌ ${module} - Error: ${error.message}`, 'red');
            }
        }
        
        // Test bundle file
        logSection('📦 Bundle File Test');
        try {
            const manifestPath = path.join(rootDir, 'public/js/bundle-manifest.json');
            if (fs.existsSync(manifestPath)) {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                const bundleFile = manifest.bundleFile;
                
                const response = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/js/${bundleFile}`, { encoding: 'utf8' });
                if (response.trim() === '200') {
                    log(`✅ Bundle file: ${bundleFile}`, 'green');
                    passedTests++;
                    totalTests++;
                } else {
                    log(`❌ Bundle file: ${bundleFile} - Status: ${response.trim()}`, 'red');
                    totalTests++;
                }
            } else {
                log('⚠️  Bundle manifest not found', 'yellow');
            }
        } catch (error) {
            log(`❌ Bundle test failed: ${error.message}`, 'red');
            totalTests++;
        }
        
        // Test static file serving
        logSection('📁 Static File Serving Test');
        const staticTests = [
            'css/styles-fixed.css',
            'js/app.js',
            'favicon.ico'
        ];
        
        for (const file of staticTests) {
            try {
                const response = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/${file}`, { encoding: 'utf8' });
                if (response.trim() === '200') {
                    log(`✅ ${file}`, 'green');
                    passedTests++;
                } else {
                    log(`❌ ${file} - Status: ${response.trim()}`, 'red');
                }
                totalTests++;
            } catch (error) {
                log(`❌ ${file} - Error: ${error.message}`, 'red');
                totalTests++;
            }
        }
        
        // Summary
        logSection('📊 Test Summary');
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);
        log(`Tests Passed: ${passedTests}/${totalTests}`, passedTests === totalTests ? 'green' : 'yellow');
        log(`Success Rate: ${successRate}%`, successRate === '100.0' ? 'green' : 'yellow');
        
        if (passedTests === totalTests) {
            log('🎉 All module import tests passed!', 'green');
            log('✅ JavaScript modules should load without errors', 'green');
        } else {
            log('⚠️  Some tests failed - check the issues above', 'yellow');
        }
        
        // Recommendations
        logSection('💡 Next Steps');
        if (passedTests === totalTests) {
            log('🌐 Open your browser to http://localhost:4000', 'blue');
            log('🔍 Check browser console for any remaining errors', 'blue');
            log('🧪 Test the green banner: simulateToken()', 'blue');
        } else {
            log('🔧 Fix the failing module tests above', 'yellow');
            log('🔄 Restart the server: npm run restart', 'blue');
            log('🧪 Run this test again: npm run test:modules', 'blue');
        }
        
        return {
            passed: passedTests,
            total: totalTests,
            successRate: parseFloat(successRate),
            allPassed: passedTests === totalTests
        };
        
    } catch (error) {
        log(`❌ Test failed: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testModuleImports()
        .then(result => {
            if (!result.allPassed) {
                process.exit(1); // Exit with error code if tests failed
            }
        })
        .catch(error => {
            console.error('Test script failed:', error);
            process.exit(1);
        });
}

export default testModuleImports;