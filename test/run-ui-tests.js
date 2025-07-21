/**
 * Run UI Tests
 * 
 * This script runs all UI tests for the subsystems.
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  configFile: 'jest.ui.config.cjs',
  testDir: 'test/ui',
  testFiles: [
    'simple-subsystem-test.js',
    'api-client-subsystem.test.js',
    'error-logging-subsystem.test.js',
    'subsystems-comprehensive.test.js'
  ]
};

// Run a single test file
function runTest(testFile) {
  const testPath = path.join(config.testDir, testFile);
  console.log(`\n\n========== Running ${testPath} ==========\n`);
  
  try {
    execSync(`npx jest --config=${config.configFile} ${testPath}`, { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log(`\n✅ ${testPath} passed\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${testPath} failed\n`);
    return false;
  }
}

// Run all tests
function runAllTests() {
  console.log('\n===== RUNNING ALL UI SUBSYSTEM TESTS =====\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testFile of config.testFiles) {
    const success = runTest(testFile);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n===== TEST SUMMARY =====');
  console.log(`Total: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  return failed === 0;
}

// Execute
const success = runAllTests();
process.exit(success ? 0 : 1);