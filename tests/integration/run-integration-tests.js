#!/usr/bin/env node

/**
 * @fileoverview Integration Test Runner
 * 
 * Runs the real API integration tests with proper environment validation,
 * Winston logging, and error handling.
 * 
 * Usage:
 *   node test/integration/run-integration-tests.js
 * 
 * Environment Variables:
 *   - PINGONE_TEST_CLIENT_ID: Test environment client ID
 *   - PINGONE_TEST_CLIENT_SECRET: Test environment client secret
 *   - PINGONE_TEST_ENVIRONMENT_ID: Test environment ID
 *   - PINGONE_TEST_REGION: Test region
 *   - API_BASE_URL: Base URL for API (default: http://localhost:4000)
 *   - NODE_ENV: Environment (must not be 'production')
 */

import { spawn } from 'child_process';
import { createWinstonLogger } from '../../server/winston-config.js';

// Create Winston logger for test runner
const logger = createWinstonLogger({
    service: 'pingone-import-test-runner',
    env: 'test',
    enableFileLogging: true
});

/**
 * Validate environment before running tests
 */
const validateEnvironment = () => {
    const errors = [];
    
    // Check for required environment variables
    const requiredVars = [
        'PINGONE_TEST_CLIENT_ID',
        'PINGONE_TEST_CLIENT_SECRET', 
        'PINGONE_TEST_ENVIRONMENT_ID'
    ];
    
    requiredVars.forEach(varName => {
        if (!process.env[varName]) {
            errors.push(`Missing required environment variable: ${varName}`);
        }
    });
    
    // Prevent production runs
    if (process.env.NODE_ENV === 'production') {
        errors.push('Integration tests cannot run in production environment');
    }
    
    // Validate API server is running
    if (!process.env.API_BASE_URL && !process.env.SKIP_SERVER_CHECK) {
        // This would need to be implemented with a health check
        logger.warn('Skipping API server health check (implement if needed)');
    }
    
    if (errors.length > 0) {
        logger.error('Environment validation failed', { errors });
        throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }
    
    logger.info('Environment validation passed', {
        apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
        pingOneRegion: process.env.PINGONE_TEST_REGION || 'NorthAmerica',
        nodeEnv: process.env.NODE_ENV || 'development'
    });
};

/**
 * Run Jest tests with proper configuration
 */
const runTests = () => {
    return new Promise((resolve, reject) => {
        logger.info('Starting integration tests');
        
        // Jest configuration for integration tests
        const jestArgs = [
            '--testPathPattern=test/integration/real-api-integration.test.js',
            '--verbose',
            '--detectOpenHandles',
            '--forceExit',
            '--testTimeout=60000', // 60 seconds per test
            '--maxWorkers=1' // Run tests sequentially for API rate limiting
        ];
        
        // Add environment variables to Jest process
        const env = {
            ...process.env,
            NODE_ENV: 'test',
            JEST_WORKER_ID: '1'
        };
        
        logger.debug('Running Jest with arguments', { jestArgs });
        
        const jestProcess = spawn('npx', ['jest', ...jestArgs], {
            stdio: 'pipe',
            env
        });
        
        // Log Jest output with Winston
        jestProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                logger.info('Jest Output', { output });
            }
        });
        
        jestProcess.stderr.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                logger.error('Jest Error', { output });
            }
        });
        
        jestProcess.on('close', (code) => {
            if (code === 0) {
                logger.info('Integration tests completed successfully', { exitCode: code });
                resolve(code);
            } else {
                logger.error('Integration tests failed', { exitCode: code });
                reject(new Error(`Tests failed with exit code ${code}`));
            }
        });
        
        jestProcess.on('error', (error) => {
            logger.error('Failed to start Jest process', { error: error.message });
            reject(error);
        });
    });
};

/**
 * Main execution function
 */
const main = async () => {
    try {
        logger.info('Starting integration test runner');
        
        // Validate environment
        validateEnvironment();
        
        // Run tests
        const exitCode = await runTests();
        
        logger.info('Test runner completed successfully', { exitCode });
        process.exit(exitCode);
        
    } catch (error) {
        logger.error('Test runner failed', { error: error.message });
        process.exit(1);
    }
};

// Handle process signals
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', { reason, promise });
    process.exit(1);
});

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
} 