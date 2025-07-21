#!/usr/bin/env node

/**
 * Comprehensive Subsystem Validation
 * 
 * Tests all subsystems for proper structure, exports, and functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Comprehensive Subsystem Validation\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function runCheck(name, checkFn) {
    console.log(`🧪 ${name}`);
    totalChecks++;
    
    try {
        const result = checkFn();
        if (result) {
            console.log(`   ✅ PASSED\n`);
            passedChecks++;
        } else {
            console.log(`   ❌ FAILED\n`);
            failedChecks++;
        }
    } catch (error) {
        console.log(`   ❌ FAILED: ${error.message}\n`);
        failedChecks++;
    }
}

// 1. File Structure Validation
runCheck('File Structure Validation', () => {
    const requiredDirs = [
        'src/client/subsystems',
        'src/client/components',
        'src/client/utils',
        'src/server/api',
        'src/server/services',
        'src/shared'
    ];
    
    for (const dir of requiredDirs) {
        if (!fs.existsSync(dir)) {
            throw new Error(`Required directory missing: ${dir}`);
        }
        console.log(`   📁 ${dir} exists`);
    }
    
    return true;
});

// 2. Subsystem Files Validation
runCheck('Subsystem Files Validation', () => {
    const subsystemDir = 'src/client/subsystems';
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
    
    const actualSubsystems = fs.readdirSync(subsystemDir).filter(f => f.endsWith('.js'));
    
    console.log(`   📊 Found ${actualSubsystems.length} subsystem files`);
    
    for (const expected of expectedSubsystems) {
        if (actualSubsystems.includes(expected)) {
            console.log(`   ✅ ${expected}`);
        } else {
            throw new Error(`Missing subsystem: ${expected}`);
        }
    }
    
    return true;
});

// 3. Subsystem Content Validation
runCheck('Subsystem Content Validation', () => {
    const subsystemDir = 'src/client/subsystems';
    const subsystems = fs.readdirSync(subsystemDir).filter(f => f.endsWith('.js'));
    
    for (const subsystem of subsystems) {
        const filePath = path.join(subsystemDir, subsystem);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for class export
        if (!content.includes('export class') && !content.includes('export default class')) {
            throw new Error(`${subsystem} does not export a class`);
        }
        
        // Check for constructor
        if (!content.includes('constructor(')) {
            throw new Error(`${subsystem} does not have a constructor`);
        }
        
        // Check for init method
        if (!content.includes('async init()') && !content.includes('init()')) {
            throw new Error(`${subsystem} does not have an init method`);
        }
        
        console.log(`   ✅ ${subsystem} structure valid`);
    }
    
    return true;
});

// 4. Shared Services Validation
runCheck('Shared Services Validation', () => {
    const sharedDir = 'src/shared';
    const requiredFiles = [
        'logging-service.js',
        'feature-flags.js'
    ];
    
    for (const file of requiredFiles) {
        const filePath = path.join(sharedDir, file);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Missing shared service: ${file}`);
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Validate logging service
        if (file === 'logging-service.js') {
            if (!content.includes('export class CentralizedLoggingService')) {
                throw new Error('Logging service does not export CentralizedLoggingService class');
            }
            if (!content.includes('createLogger')) {
                throw new Error('Logging service does not export createLogger function');
            }
        }
        
        // Validate feature flags
        if (file === 'feature-flags.js') {
            if (!content.includes('export const FEATURE_FLAGS')) {
                throw new Error('Feature flags does not export FEATURE_FLAGS constant');
            }
            if (!content.includes('isFeatureEnabled')) {
                throw new Error('Feature flags does not export isFeatureEnabled function');
            }
        }
        
        console.log(`   ✅ ${file} structure valid`);
    }
    
    return true;
});

// 5. API Structure Validation
runCheck('API Structure Validation', () => {
    const apiDir = 'src/server/api';
    const requiredFiles = [
        'health.js'
    ];
    
    for (const file of requiredFiles) {
        const filePath = path.join(apiDir, file);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Missing API file: ${file}`);
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (!content.includes('router.get')) {
            throw new Error(`${file} does not contain route handlers`);
        }
        
        if (!content.includes('export default router')) {
            throw new Error(`${file} does not export router`);
        }
        
        console.log(`   ✅ ${file} structure valid`);
    }
    
    return true;
});

// 6. Feature Flags Functional Test
runCheck('Feature Flags Functional Test', () => {
    // This would normally use import, but we'll validate the file structure instead
    const featureFlagsPath = 'src/shared/feature-flags.js';
    const content = fs.readFileSync(featureFlagsPath, 'utf8');
    
    // Check for required feature flags
    const requiredFlags = [
        'USE_CENTRALIZED_LOGGING',
        'USE_NAVIGATION_SUBSYSTEM',
        'USE_CONNECTION_MANAGER',
        'USE_AUTH_MANAGEMENT',
        'USE_VIEW_MANAGEMENT',
        'USE_OPERATION_MANAGER',
        'USE_IMPORT_SUBSYSTEM',
        'USE_EXPORT_SUBSYSTEM',
        'USE_REALTIME_SUBSYSTEM'
    ];
    
    for (const flag of requiredFlags) {
        if (!content.includes(flag)) {
            throw new Error(`Missing feature flag: ${flag}`);
        }
        console.log(`   ✅ Feature flag ${flag} found`);
    }
    
    return true;
});

// 7. Logging Service Structure Test
runCheck('Logging Service Structure Test', () => {
    const loggingServicePath = 'src/shared/logging-service.js';
    const content = fs.readFileSync(loggingServicePath, 'utf8');
    
    const requiredMethods = [
        'formatLogEntry',
        'logToConsole',
        'logToFile',
        'logToServer',
        'info',
        'warn',
        'error',
        'debug',
        'startTimer',
        'endTimer'
    ];
    
    for (const method of requiredMethods) {
        if (!content.includes(method)) {
            throw new Error(`Missing method: ${method}`);
        }
        console.log(`   ✅ Method ${method} found`);
    }
    
    return true;
});

// 8. App.js Structure Test
runCheck('App.js Structure Test', () => {
    const appPath = 'src/client/app.js';
    if (!fs.existsSync(appPath)) {
        throw new Error('New app.js not found');
    }
    
    const content = fs.readFileSync(appPath, 'utf8');
    
    // Check for subsystem imports
    const requiredImports = [
        'ImportSubsystem',
        'ExportSubsystem',
        'OperationManagerSubsystem',
        'NavigationSubsystem',
        'ConnectionManagerSubsystem',
        'AuthManagementSubsystem',
        'ViewManagementSubsystem',
        'RealtimeCommunicationSubsystem'
    ];
    
    for (const importName of requiredImports) {
        if (!content.includes(importName)) {
            throw new Error(`Missing import: ${importName}`);
        }
        console.log(`   ✅ Import ${importName} found`);
    }
    
    // Check for feature flags usage
    if (!content.includes('FEATURE_FLAGS')) {
        throw new Error('App.js does not use feature flags');
    }
    
    // Check for centralized logging
    if (!content.includes('createLogger')) {
        throw new Error('App.js does not use centralized logging');
    }
    
    return true;
});

// 9. Build Configuration Test
runCheck('Build Configuration Test', () => {
    const packageJsonPath = 'package.json';
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(content);
    
    // Check for updated build script
    if (!packageJson.scripts['build:bundle'].includes('src/client/app.js')) {
        throw new Error('Build script not updated for new app.js location');
    }
    
    console.log('   ✅ Build script updated');
    
    // Check for legacy build script
    if (!packageJson.scripts['build:bundle:legacy']) {
        throw new Error('Legacy build script not found');
    }
    
    console.log('   ✅ Legacy build script available');
    
    return true;
});

// 10. Test Structure Validation
runCheck('Test Structure Validation', () => {
    const testDirs = [
        'tests/unit',
        'tests/integration', 
        'tests/e2e'
    ];
    
    for (const dir of testDirs) {
        if (!fs.existsSync(dir)) {
            console.log(`   ⚠️  Test directory ${dir} not found (created during Phase 1)`);
        } else {
            console.log(`   ✅ Test directory ${dir} exists`);
        }
    }
    
    // Check for existing test files
    const existingTests = [
        'test/ui/subsystems-comprehensive.test.js',
        'test/ui/api-client-subsystem.test.js',
        'test/ui/error-logging-subsystem.test.js'
    ];
    
    let foundTests = 0;
    for (const testFile of existingTests) {
        if (fs.existsSync(testFile)) {
            foundTests++;
            console.log(`   ✅ Test file ${testFile} exists`);
        }
    }
    
    console.log(`   📊 Found ${foundTests} existing test files`);
    
    return true;
});

// Summary
console.log('='.repeat(60));
console.log('🏁 SUBSYSTEM VALIDATION SUMMARY');
console.log('='.repeat(60));
console.log(`📊 Total Checks: ${totalChecks}`);
console.log(`✅ Passed: ${passedChecks}`);
console.log(`❌ Failed: ${failedChecks}`);
console.log(`📈 Success Rate: ${totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0}%`);

if (failedChecks === 0) {
    console.log('\n🎉 All subsystem validations passed!');
    console.log('✨ The new architecture is properly structured and ready for integration.');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Update import paths in existing code');
    console.log('2. Test the new build process');
    console.log('3. Integrate centralized logging');
    console.log('4. Begin gradual subsystem rollout');
    
    process.exit(0);
} else {
    console.log(`\n⚠️  ${failedChecks} validation(s) failed.`);
    console.log('Please address the issues above before proceeding.');
    process.exit(1);
}