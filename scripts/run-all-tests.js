#!/usr/bin/env node
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_CATEGORIES = [
  {
    name: 'Unit Tests',
    command: 'npm run test:unit',
    description: 'Running unit tests for individual components',
    color: 'blue'
  },
  {
    name: 'Integration Tests',
    command: 'npm run test:integration',
    description: 'Running integration tests for component interactions',
    color: 'cyan'
  },
  {
    name: 'API Tests',
    command: 'npm run test:api',
    description: 'Running API endpoint tests',
    color: 'magenta'
  },
  {
    name: 'UI Tests',
    command: 'npm run test:ui',
    description: 'Running UI component tests',
    color: 'green'
  },
  {
    name: 'End-to-End Tests',
    command: 'npm run test:e2e',
    description: 'Running end-to-end tests',
    color: 'yellow'
  }
];

async function runTests() {
  console.log(chalk.bold('\n🚀 Starting Comprehensive Test Suite\n'));
  
  let allPassed = true;
  const results = [];
  
  for (const test of TEST_CATEGORIES) {
    const colorFn = chalk[test.color] || chalk.white;
    console.log(colorFn(`\n${'='.repeat(50)}`));
    console.log(colorFn.bold(`\n${test.name}`));
    console.log(colorFn(test.description));
    console.log(colorFn('='.repeat(50) + '\n'));
    
    try {
      execSync(test.command, { stdio: 'inherit' });
      results.push({ name: test.name, passed: true });
      console.log(chalk.green.bold(`\n✅ ${test.name} passed!\n`));
    } catch (error) {
      allPassed = false;
      results.push({ name: test.name, passed: false, error });
      console.error(chalk.red.bold(`\n❌ ${test.name} failed!\n`));
    }
  }
  
  // Print summary
  console.log(chalk.bold('\n📊 Test Suite Summary\n'));
  results.forEach(result => {
    const status = result.passed 
      ? chalk.green('✓ PASSED') 
      : chalk.red('✗ FAILED');
    console.log(`${status} - ${result.name}`);
  });
  
  if (!allPassed) {
    console.error(chalk.red.bold('\n❌ Some tests failed. See above for details.\n'));
    process.exit(1);
  }
  
  console.log(chalk.green.bold('\n✅ All tests passed successfully!\n'));
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
