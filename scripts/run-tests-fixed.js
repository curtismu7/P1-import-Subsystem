#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Configure paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../');

// Color helpers
const colors = {
  info: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  highlight: chalk.cyan
};

// Test configuration
const testConfig = {
  unit: {
    name: 'Unit Tests',
    pattern: '**/test/unit/**/*.test.js',
    ignorePatterns: ['/node_modules/'],
    coverage: true,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'error'
    }
  },
  integration: {
    name: 'Integration Tests',
    pattern: '**/test/integration/**/*.test.js',
    ignorePatterns: ['/node_modules/'],
    coverage: true,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'info'
    }
  },
  e2e: {
    name: 'End-to-End Tests',
    pattern: '**/test/e2e/**/*.test.js',
    ignorePatterns: ['/node_modules/'],
    coverage: false,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'debug'
    }
  }
};

// Build Jest command
function buildJestCommand(config) {
  const args = [
    '--config', 'jest.config.mjs',
    '--testMatch', `**/${config.pattern}`,
    '--testPathIgnorePatterns', config.ignorePatterns.join('|'),
    '--detectOpenHandles',
    '--forceExit',
    '--no-cache',
    '--no-watchman',
    '--passWithNoTests'
  ];

  if (config.coverage) {
    args.push(
      '--coverage',
      '--coverageDirectory', `./coverage/${config.name.toLowerCase().replace(/\s+/g, '-')}`,
      '--collectCoverageFrom', '"**/*.js"',
      '--coverageReporters', 'json-summary lcov text'
    );
  }

  return {
    command: 'npx',
    args: ['jest', ...args],
    options: {
      env: { 
        ...process.env, 
        NODE_ENV: 'test', 
        BABEL_ENV: 'test',
        ...config.env 
      },
      stdio: 'inherit',
      shell: false
    }
  };
}

// Run a test suite
async function runTestSuite(suiteName) {
  const config = testConfig[suiteName];
  if (!config) {
    console.error(colors.error(`❌ Unknown test suite: ${suiteName}`));
    process.exit(1);
  }

  console.log(colors.highlight(`\n=== ${config.name} ===`));
  console.log(colors.info(`Pattern: ${config.pattern}`));
  
  const { command, args, options } = buildJestCommand(config);
  console.log(colors.info(`Running: ${command} ${args.join(' ')}`));

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      ...options,
      cwd: rootDir,
      stdio: 'inherit'
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(colors.success(`\n✅ ${config.name} passed!`));
      } else {
        console.error(colors.error(`\n❌ ${config.name} failed with code ${code}`));
      }
      resolve(code === 0);
    });

    child.on('error', (error) => {
      console.error(colors.error(`\n❌ Failed to run ${config.name}:`), error);
      resolve(false);
    });
  });
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';
  
  try {
    let success = true;
    
    if (testType === 'all') {
      // Run all test suites
      for (const suite of Object.keys(testConfig)) {
        const result = await runTestSuite(suite);
        success = success && result;
      }
    } else if (testConfig[testType]) {
      // Run specific test suite
      success = await runTestSuite(testType);
    } else {
      console.error(colors.error(`❌ Unknown test type: ${testType}`));
      console.log(colors.info('\nAvailable test types:'));
      console.log(colors.info('  all - Run all test suites'));
      Object.keys(testConfig).forEach(type => {
        console.log(colors.info(`  ${type} - ${testConfig[type].name}`));
      });
      process.exit(1);
    }
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(colors.error('\n❌ Test runner failed:'), error);
    process.exit(1);
  }
}

// Run the main function
main();
