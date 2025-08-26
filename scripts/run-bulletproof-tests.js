#!/usr/bin/env node

/**
 * 🛡️ BULLETPROOF TEST RUNNER - COMPREHENSIVE TESTING SYSTEM
 *
 * Runs all bulletproof system tests with detailed reporting:
 * - Token manager tests
 * - Subsystem wrapper tests
 * - Global handler tests
 * - Integration tests
 * - Performance benchmarks
 * - Memory leak detection
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Test configuration
const testConfig = {
  timeout: 30000,
  verbose: true,
  coverage: false,
  watch: false,
  bail: false
};

// Parse command line arguments
const args = process.argv.slice(2);
args.forEach(arg => {
  switch (arg) {
  case '--coverage':
    testConfig.coverage = true;
    break;
  case '--watch':
    testConfig.watch = true;
    break;
  case '--bail':
    testConfig.bail = true;
    break;
  case '--verbose':
    testConfig.verbose = true;
    break;
  case '--quiet':
    testConfig.verbose = false;
    break;
  case '--help':
    showHelp();
    process.exit(0);
  }
});

function showHelp() {
  console.log(`
🛡️ BULLETPROOF TEST RUNNER

Usage: node scripts/run-bulletproof-tests.js [options]

Options:
  --coverage    Generate code coverage report
  --watch       Watch for file changes and re-run tests
  --bail        Stop on first test failure
  --verbose     Verbose output (default)
  --quiet       Minimal output
  --help        Show this help message

Test Categories:
  • Token Manager Tests     - Bulletproof token management system
  • Subsystem Wrapper Tests - Error isolation and recovery
  • Global Handler Tests    - Global error catching and handling
  • Integration Tests       - End-to-end bulletproof system testing
  • Simple Tests            - Basic bulletproof system verification
  • Browser Tests           - Browser integration with running server
  • Performance Tests       - Memory and performance benchmarks

Examples:
  npm run test:bulletproof                    # Run all bulletproof tests
  npm run test:bulletproof:unit              # Run only unit tests
  npm run test:bulletproof:integration       # Run only integration tests
  npm run test:bulletproof:watch             # Watch mode
`);
}

// Test suites to run
const testSuites = [
  {
    name: '🛡️ Bulletproof Token Manager',
    pattern: 'test/unit/bulletproof-token-manager.test.js',
    description: 'Tests bulletproof token management with multi-source fallbacks'
  },
  {
    name: '🛡️ Bulletproof Subsystem Wrapper',
    pattern: 'test/unit/bulletproof-subsystem-wrapper.test.js',
    description: 'Tests error isolation and recovery for subsystem methods'
  },
  {
    name: '🛡️ Bulletproof Global Handler',
    pattern: 'test/unit/bulletproof-global-handler.test.js',
    description: 'Tests global error catching and promise rejection handling'
  },
  {
    name: '🛡️ Bulletproof System Integration',
    pattern: 'test/integration/bulletproof-system.test.js',
    description: 'Tests end-to-end bulletproof system integration'
  },
  {
    name: '🛡️ Bulletproof Simple Test',
    pattern: 'test/bulletproof-simple.test.mjs',
    description: 'Basic bulletproof system verification with minimal dependencies'
  },
  {
    name: '🛡️ Bulletproof Browser Test',
    pattern: 'test/bulletproof-browser.test.mjs',
    description: 'Browser integration tests for running server bulletproof system'
  }
];

// Colors for output
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

function printHeader() {
  console.log(colorize('\n🛡️ BULLETPROOF TEST RUNNER', 'cyan'));
  console.log(colorize('=' .repeat(50), 'cyan'));
  console.log(colorize('Testing bulletproof system components...', 'white'));
  console.log('');
}

function printTestSuite(suite) {
  console.log(colorize(`\n📋 ${suite.name}`, 'yellow'));
  console.log(colorize(`   ${suite.description}`, 'white'));
  console.log(colorize(`   Pattern: ${suite.pattern}`, 'blue'));
}

function runJestCommand(pattern, options = {}) {
  return new Promise((resolve, reject) => {
    const jestArgs = [
      '--config=jest.bulletproof.config.mjs',
      '--passWithNoTests',
      '--verbose'
    ];

    if (pattern) {
      // Handle .mjs files differently - they need special handling
      if (pattern.includes('.mjs')) {
        jestArgs.push('--extensionsToTreatAsEsm=.mjs');
        jestArgs.push('--experimental-vm-modules');
      }
      jestArgs.push(pattern);
    }

    if (testConfig.coverage || options.coverage) {
      jestArgs.push('--coverage');
    }

    if (testConfig.watch || options.watch) {
      jestArgs.push('--watch');
    }

    if (testConfig.bail || options.bail) {
      jestArgs.push('--bail');
    }

    if (options.detectOpenHandles) {
      jestArgs.push('--detectOpenHandles');
    }

    const jestProcess = spawn('npx', ['jest', ...jestArgs], {
      cwd: rootDir,
      stdio: testConfig.verbose ? 'inherit' : 'pipe',
      env: {
        ...process.env,
        NODE_OPTIONS: '--experimental-vm-modules',
        NODE_ENV: 'test'
      }
    });

    let output = '';
    let errorOutput = '';

    if (!testConfig.verbose) {
      jestProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      jestProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
    }

    jestProcess.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
        errorOutput,
        exitCode: code
      });
    });

    jestProcess.on('error', (error) => {
      reject(error);
    });
  });
}

async function runBulletproofTests() {
  printHeader();

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    suites: []
  };

  console.log(colorize('🔍 Pre-flight checks...', 'cyan'));

  // Check if test files exist
  for (const suite of testSuites) {
    const testPath = join(rootDir, suite.pattern);
    if (!fs.existsSync(testPath)) {
      console.log(colorize(`❌ Test file not found: ${suite.pattern}`, 'red'));
      process.exit(1);
    }
  }

  console.log(colorize('✅ All test files found', 'green'));

  if (testConfig.watch) {
    console.log(colorize('\n👀 Running in watch mode...', 'yellow'));
    console.log(colorize('Press Ctrl+C to exit', 'white'));

    try {
      await runJestCommand(null, { detectOpenHandles: true });
    } catch (error) {
      console.error(colorize(`❌ Watch mode failed: ${error.message}`, 'red'));
      process.exit(1);
    }
    return;
  }

  // Run individual test suites
  for (const suite of testSuites) {
    printTestSuite(suite);
    results.total++;

    try {
      const startTime = Date.now();
      const result = await runJestCommand(suite.pattern);
      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(colorize(`✅ ${suite.name} - PASSED (${duration}ms)`, 'green'));
        results.passed++;
      } else {
        console.log(colorize(`❌ ${suite.name} - FAILED (${duration}ms)`, 'red'));
        results.failed++;

        if (testConfig.bail) {
          console.log(colorize('\n🛑 Stopping due to --bail flag', 'red'));
          break;
        }
      }

      results.suites.push({
        name: suite.name,
        success: result.success,
        duration
      });

    } catch (error) {
      console.log(colorize(`💥 ${suite.name} - ERROR: ${error.message}`, 'red'));
      results.failed++;
      results.suites.push({
        name: suite.name,
        success: false,
        error: error.message
      });

      if (testConfig.bail) {
        break;
      }
    }
  }

  // Print summary
  console.log(colorize('\n📊 BULLETPROOF TEST SUMMARY', 'cyan'));
  console.log(colorize('=' .repeat(50), 'cyan'));
  console.log(colorize(`Total Suites: ${results.total}`, 'white'));
  console.log(colorize(`Passed: ${results.passed}`, 'green'));
  console.log(colorize(`Failed: ${results.failed}`, 'red'));
  console.log(colorize(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 'yellow'));

  // Detailed results
  console.log(colorize('\n📋 Detailed Results:', 'cyan'));
  results.suites.forEach(suite => {
    const status = suite.success ? colorize('✅ PASS', 'green') : colorize('❌ FAIL', 'red');
    const duration = suite.duration ? `(${suite.duration}ms)` : '';
    console.log(`  ${status} ${suite.name} ${duration}`);
    if (suite.error) {
      console.log(colorize(`    Error: ${suite.error}`, 'red'));
    }
  });

  // Performance summary
  const totalDuration = results.suites.reduce((sum, suite) => sum + (suite.duration || 0), 0);
  console.log(colorize(`\n⏱️  Total Test Duration: ${totalDuration}ms`, 'yellow'));

  // Coverage report
  if (testConfig.coverage) {
    console.log(colorize('\n📈 Coverage report generated in coverage/', 'cyan'));
  }

  // Exit with appropriate code
  const exitCode = results.failed > 0 ? 1 : 0;

  if (exitCode === 0) {
    console.log(colorize('\n🎉 All bulletproof tests passed! System is bulletproof! 🛡️', 'green'));
  } else {
    console.log(colorize('\n💥 Some bulletproof tests failed. System needs attention! 🔧', 'red'));
  }

  process.exit(exitCode);
}

// Handle process signals
process.on('SIGINT', () => {
  console.log(colorize('\n\n🛑 Test runner interrupted by user', 'yellow'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(colorize('\n\n🛑 Test runner terminated', 'yellow'));
  process.exit(0);
});

// Run the tests
runBulletproofTests().catch(error => {
  console.error(colorize(`💥 Fatal error: ${error.message}`, 'red'));
  console.error(error.stack);
  process.exit(1);
});
