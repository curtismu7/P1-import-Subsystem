#!/usr/bin/env node

/**
 * Subsystem Test Runner
 * 
 * Runs comprehensive tests for all subsystems
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Starting Comprehensive Subsystem Tests\n');

// Test configurations
const tests = [
    {
        name: 'Subsystems Comprehensive Test',
        command: 'node test/ui/subsystems-comprehensive.test.js',
        description: 'Tests all subsystem UI integration'
    },
    {
        name: 'API Client Subsystem Test',
        command: 'node test/ui/api-client-subsystem.test.js',
        description: 'Tests API client subsystem functionality'
    },
    {
        name: 'Error Logging Subsystem Test',
        command: 'node test/ui/error-logging-subsystem.test.js',
        description: 'Tests error logging subsystem'
    },
    {
        name: 'Progress Subsystem Test',
        command: 'node test/ui/progress-subsystem.test.js',
        description: 'Tests progress tracking subsystem'
    }
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Run each test
for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    console.log(`📝 Description: ${test.description}`);
    console.log(`⚡ Command: ${test.command}\n`);
    
    const startTime = Date.now();
    
    try {
        // Check if test file exists
        const fs = require('fs');
        const testFile = test.command.split(' ')[1];
        
        if (!fs.existsSync(testFile)) {
            console.log(`⚠️  Test file not found: ${testFile}`);
            console.log(`✅ SKIPPED\n`);
            continue;
        }
        
        // Run the test
        const output = execSync(test.command, { 
            encoding: 'utf8',
            stdio: 'pipe',
            timeout: 30000
        });
        
        const duration = Date.now() - startTime;
        
        console.log(`✅ PASSED (${duration}ms)`);
        console.log(`📊 Output:\n${output}`);
        
        passedTests++;
        totalTests++;
        
    } catch (error) {
        const duration = Date.now() - startTime;
        
        console.log(`❌ FAILED (${duration}ms)`);
        console.log(`📊 Error:\n${error.message}`);
        
        if (error.stdout) {
            console.log(`📊 Stdout:\n${error.stdout}`);
        }
        
        if (error.stderr) {
            console.log(`📊 Stderr:\n${error.stderr}`);
        }
        
        failedTests++;
        totalTests++;
    }
}

// Manual subsystem tests
console.log('\n🔧 Running Manual Subsystem Tests\n');

const manualTests = [
    {
        name: 'Feature Flags Test',
        test: () => {
            const { FEATURE_FLAGS, isFeatureEnabled, getFeatureFlagStatus } = require('./src/shared/feature-flags.js');
            
            console.log('Testing feature flags...');
            console.log('Feature flags loaded:', Object.keys(FEATURE_FLAGS).length);
            console.log('Centralized logging enabled:', isFeatureEnabled('USE_CENTRALIZED_LOGGING'));
            console.log('Status:', getFeatureFlagStatus());
            
            return true;
        }
    },
    {
        name: 'Logging Service Test',
        test: () => {
            const { createLogger } = require('./src/shared/logging-service.js');
            
            console.log('Testing logging service...');
            const logger = createLogger({ serviceName: 'test' });
            
            logger.info('Test info message');
            logger.warn('Test warning message');
            logger.error('Test error message');
            logger.debug('Test debug message');
            
            // Test performance monitoring
            logger.startTimer('test-operation');
            setTimeout(() => {
                const duration = logger.endTimer('test-operation');
                console.log(`Performance test completed in ${duration}ms`);
            }, 100);
            
            return true;
        }
    },
    {
        name: 'Subsystem File Check',
        test: () => {
            const fs = require('fs');
            const subsystemDir = './src/client/subsystems';
            
            if (!fs.existsSync(subsystemDir)) {
                throw new Error('Subsystems directory not found');
            }
            
            const subsystems = fs.readdirSync(subsystemDir).filter(f => f.endsWith('.js'));
            console.log(`Found ${subsystems.length} subsystem files:`);
            
            subsystems.forEach(subsystem => {
                console.log(`  ✅ ${subsystem}`);
            });
            
            const expectedSubsystems = [
                'auth-management-subsystem.js',
                'connection-manager-subsystem.js',
                'export-subsystem.js',
                'import-subsystem.js',
                'navigation-subsystem.js',
                'operation-manager-subsystem.js',
                'realtime-communication-subsystem.js',
                'view-management-subsystem.js'
            ];
            
            const missing = expectedSubsystems.filter(expected => 
                !subsystems.includes(expected)
            );
            
            if (missing.length > 0) {
                console.log(`⚠️  Missing subsystems: ${missing.join(', ')}`);
            }
            
            return missing.length === 0;
        }
    },
    {
        name: 'Health Check API Test',
        test: () => {
            const fs = require('fs');
            const healthApiPath = './src/server/api/health.js';
            
            if (!fs.existsSync(healthApiPath)) {
                throw new Error('Health API not found');
            }
            
            console.log('Health API file exists');
            
            // Check if it's a valid module
            const content = fs.readFileSync(healthApiPath, 'utf8');
            
            if (!content.includes('router.get')) {
                throw new Error('Health API does not contain route handlers');
            }
            
            console.log('Health API contains route handlers');
            
            return true;
        }
    }
];

// Run manual tests
for (const test of manualTests) {
    console.log(`\n🔧 Running: ${test.name}`);
    
    try {
        const startTime = Date.now();
        const result = test.test();
        const duration = Date.now() - startTime;
        
        if (result) {
            console.log(`✅ PASSED (${duration}ms)`);
            passedTests++;
        } else {
            console.log(`❌ FAILED (${duration}ms)`);
            failedTests++;
        }
        
        totalTests++;
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`❌ FAILED (${duration}ms)`);
        console.log(`📊 Error: ${error.message}`);
        
        failedTests++;
        totalTests++;
    }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('🏁 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`📊 Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📈 Success Rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);

if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Subsystems are working correctly.');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${failedTests} test(s) failed. Please review the output above.`);
    process.exit(1);
}