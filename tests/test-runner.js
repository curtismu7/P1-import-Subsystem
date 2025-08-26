#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function runTests() {
  console.log('🚀 Starting test suite...\n');

  try {
    // 1. Run backend tests
    console.log('🔧 Running backend tests...');
    await execAsync('NODE_ENV=test jest test/api/ --verbose');
    console.log('✅ Backend tests passed!\n');

    // 2. Run frontend tests
    console.log('🎨 Running frontend tests...');
    await execAsync('NODE_ENV=test jest test/frontend/ --verbose');
    console.log('✅ Frontend tests passed!\n');

    console.log('🎉 All tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.stderr || error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();
