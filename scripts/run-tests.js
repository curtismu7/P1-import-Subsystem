#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Configure environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../');

// Colors for console output
const colors = {
  info: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  highlight: chalk.cyan,
  muted: chalk.gray
};

// Test configuration
const testConfig = {
  unit: {
    name: 'Unit Tests',
    description: 'Tests individual units of code in isolation',
    pattern: '**/test/unit/**/*.test.js',
    ignorePatterns: ['/node_modules/'],
    timeout: 120000, // 120 seconds
    retries: 1,
    parallel: false,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'info',
      TEST_TYPE: 'unit',
      TEST_DB_PATH: './test-db-unit.sqlite'
    },
    coverage: {
      collect: true,
      reportDir: 'coverage/unit',
      threshold: {
        statements: 80,
        branches: 70,
        functions: 75,
        lines: 80
      }
    }
  },
  integration: {
    name: 'Integration Tests',
    description: 'Tests integration between components',
    pattern: '**/test/integration/**/*.test.js',
    ignorePatterns: ['/node_modules/'],
    timeout: 180000, // 3 minutes
    retries: 1,
    parallel: false,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'info',
      TEST_TYPE: 'integration',
      TEST_DB_PATH: './test-db-integration.sqlite'
    },
    coverage: {
      collect: true,
      reportDir: 'coverage/integration'
    }
  }
};

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  
  return parts.join(' ');
}

/**
 * Run a single test suite
 */
async function runTestSuite(suiteName, config) {
  const startTime = Date.now();
  const outputDir = path.join(rootDir, 'test-results', suiteName);
  
  try {
    console.log(colors.info(`\n${'='.repeat(80)}`));
    console.log(colors.info.bold(`🚀  ${config.name.toUpperCase()}`));
    console.log(colors.info(`${'='.repeat(80)}`));
    console.log(colors.info(`📝 ${config.description}`));
    console.log(colors.info(`⏱  Timeout: ${config.timeout / 1000}s | 🔄 Retries: ${config.retries}`));
    console.log(colors.info(`📊 Coverage: ${config.coverage?.collect ? 'Enabled' : 'Disabled'}`));
    console.log(colors.info(`${'-'.repeat(80)}\n`));

    // Build Jest command
    const args = [
      '--config', 'jest.config.js',
      '--testMatch', `"${config.pattern}"`,
      '--testPathIgnorePatterns', ...config.ignorePatterns,
      '--testTimeout', config.timeout,
      '--runInBand', // Run tests serially
      '--detectOpenHandles',
      '--forceExit',
      '--no-cache',
      '--no-watchman',
      '--passWithNoTests',
    ];

    if (config.coverage?.collect) {
      args.push(
        '--coverage',
        '--coverageDirectory', path.join(config.coverage.reportDir),
        '--collectCoverageFrom', `"${config.pattern}"`,
        '--coverageReporters', 'json lcov text clover text-summary'
      );
    }

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(colors.info(`🚀 Running: npx jest ${args.join(' ')}`));
    
    return new Promise((resolve, reject) => {
      const child = spawn('npx', ['jest', ...args], {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          FORCE_COLOR: '1',
          ...config.env
        },
        cwd: rootDir
      });
      
      let stdoutData = '';
      let stderrData = '';
      
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          const str = data.toString();
          process.stdout.write(colors.info(str));
          stdoutData += str;
        });
      }
      
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          const str = data.toString();
          process.stderr.write(colors.warning(str));
          stderrData += str;
        });
      }
      
      child.on('error', (error) => {
        console.error(colors.error('Failed to start test process:'), error);
        resolve({
          success: false,
          error: error.message,
          output: `Failed to start test process: ${error.message}`,
          stdout: stdoutData,
          stderr: stderrData
        });
      });
      
      child.on('close', (code, signal) => {
        const duration = Date.now() - startTime;
        const passed = code === 0;
        
        try {
          const result = {
            success: passed,
            code,
            signal,
            duration,
            stdout: stdoutData,
            stderr: stderrData,
            output: passed ? 'Tests completed successfully' : `Tests failed with code ${code}`
          };
          
          // Save test results
          const resultFile = path.join(outputDir, 'test-results.json');
          fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
          
          // Log test results
          console.log(colors.info('\n' + '─'.repeat(80)));
          if (passed) {
            console.log(colors.success.bold(`✅  ${config.name} COMPLETED SUCCESSFULLY`));
          } else {
            console.log(colors.error.bold(`❌  ${config.name} FAILED`));
          }
          console.log(colors.info(`⏱  Duration: ${formatDuration(duration)}`));
          
          if (!passed) {
            console.log(colors.error('\nTest output:'));
            console.log(colors.error(stderrData || 'No error output'));
          }
          
          resolve(result);
        } catch (error) {
          console.error('Error processing test results:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(colors.error.bold(`\n❌  ${config.name} FAILED AFTER ${formatDuration(duration)}`));
    console.error(colors.error(error.stack || error.message));
    
    // Save error details
    const errorResult = {
      success: false,
      error: error.message,
      stack: error.stack,
      duration: `${formatDuration(duration)}`,
      timestamp: new Date().toISOString()
    };
    
    const errorFile = path.join(outputDir, 'error.json');
    fs.writeFileSync(errorFile, JSON.stringify(errorResult, null, 2));
    
    throw error;
  }
}

/**
 * Run all test suites
 */
async function runAllTests() {
  try {
    console.log(colors.highlight.bold('\n🚀 Starting Test Runner\n'));
    
    // Create test-results directory if it doesn't exist
    const resultsDir = path.join(rootDir, 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Run each test suite
    const results = [];
    let hasFailures = false;
    
    for (const [suiteName, config] of Object.entries(testConfig)) {
      try {
        const result = await runTestSuite(suiteName, config);
        results.push({ suiteName, ...result });
        
        if (!result.success) {
          hasFailures = true;
        }
      } catch (error) {
        console.error(colors.error(`Error running ${suiteName}:`), error);
        results.push({
          suiteName,
          success: false,
          error: error.message,
          stack: error.stack
        });
        hasFailures = true;
      }
    }
    
    // Print summary
    console.log(colors.highlight.bold('\n📊 Test Suite Summary\n'));
    
    results.forEach(({ suiteName, success, duration = 0 }) => {
      const status = success ? colors.success('PASS') : colors.error('FAIL');
      console.log(`${status} ${suiteName.padEnd(20)} ${formatDuration(duration).padStart(10)}`);
    });
    
    // Exit with appropriate code
    if (hasFailures) {
      console.error(colors.error.bold('\n❌ Some tests failed'));
      process.exit(1);
    } else {
      console.log(colors.success.bold('\n✅ All tests passed!'));
      process.exit(0);
    }
  } catch (error) {
    console.error(colors.error('Unhandled error in test runner:'), error);
    process.exit(1);
  }
}

// Run the tests
runAllTests();
