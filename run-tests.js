import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment variables needed for testing
const requiredEnvVars = [
    'PINGONE_ENVIRONMENT_ID',
    'PINGONE_CLIENT_ID',
    'PINGONE_CLIENT_SECRET',
    'PINGONE_REGION',
    'TEST_POPULATION_ID',
    'TEST_USERNAME',
    'TEST_PASSWORD'
];

// Check for missing environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    console.error('\nPlease create a .env file with these variables and try again.');
    process.exit(1);
}

// Test files to run in order
const testFiles = [
    'test-import.js',
    'test-export.js',
    'test-modify.js',
    'test-delete.js'
];

const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
};

// Create test directory if it doesn't exist
const testDir = path.join(__dirname, 'test');
if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
}

// Function to run a single test file
function runTest(file) {
    return new Promise((resolve) => {
        const testPath = path.join(testDir, file);
        const testName = path.basename(file, '.js');
        
        console.log(`\n🚀 Running ${testName}...`);
        
        const startTime = Date.now();
        const testProcess = exec(
            `node ${testPath}`,
            { env: process.env },
            (error, stdout, stderr) => {
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                
                if (error) {
                    console.error(`❌ ${testName} failed after ${duration}s`);
                    console.error(stderr);
                    testResults.failed++;
                    testResults.details.push({
                        test: testName,
                        status: 'failed',
                        duration: `${duration}s`,
                        error: error.message
                    });
                } else {
                    console.log(`✅ ${testName} passed in ${duration}s`);
                    testResults.passed++;
                    testResults.details.push({
                        test: testName,
                        status: 'passed',
                        duration: `${duration}s`
                    });
                }
                
                testResults.total++;
                resolve();
            }
        );
        
        // Pipe output to console with test name prefix
        testProcess.stdout.on('data', (data) => {
            console.log(`[${testName}] ${data}`.trim());
        });
        
        testProcess.stderr.on('data', (data) => {
            console.error(`[${testName} ERROR] ${data}`.trim());
        });
    });
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting PingOne API Integration Tests');
    console.log('='.repeat(50));
    
    // Run tests sequentially
    for (const file of testFiles) {
        await runTest(file);
    }
    
    // Print summary
    console.log('\n📊 Test Results');
    console.log('='.repeat(50));
    console.log(`Total: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    
    // Print detailed results
    console.log('\n📋 Detailed Results');
    console.log('='.repeat(50));
    testResults.details.forEach(test => {
        const status = test.status === 'passed' ? '✅' : '❌';
        console.log(`${status} ${test.test.padEnd(20)} ${test.status.padEnd(7)} ${test.duration}`);
        if (test.error) {
            console.log(`   ${test.error}`);
        }
    });
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
runAllTests();
