/**
 * @fileoverview Test Environment Configuration for Real API Integration Tests
 * 
 * This file manages environment variables and configuration for integration tests
 * that make real API calls to PingOne. It includes security features and
 * environment validation to prevent accidental production runs.
 * 
 * Security Features:
 * - Environment variable validation
 * - Production environment guards
 * - Secure credential handling
 * - Test data isolation
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file if it exists
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Test environment configuration
 */
export const TEST_ENV_CONFIG = {
  // Environment validation
  NODE_ENV: process.env.NODE_ENV || 'test',
  
  // API Configuration
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000',
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT) || 30000,
  
  // PingOne Test Environment (REQUIRED)
  PINGONE_TEST_CLIENT_ID: process.env.PINGONE_TEST_CLIENT_ID,
  PINGONE_TEST_CLIENT_SECRET: process.env.PINGONE_TEST_CLIENT_SECRET,
  PINGONE_TEST_ENVIRONMENT_ID: process.env.PINGONE_TEST_ENVIRONMENT_ID,
  PINGONE_TEST_REGION: process.env.PINGONE_TEST_REGION || 'NorthAmerica',
  
  // Test Configuration
  TEST_TIMEOUT: parseInt(process.env.TEST_TIMEOUT) || 60000,
  TEST_RETRY_ATTEMPTS: parseInt(process.env.TEST_RETRY_ATTEMPTS) || 3,
  TEST_CLEANUP_DELAY: parseInt(process.env.TEST_CLEANUP_DELAY) || 5000,
  
  // Logging
  TEST_LOG_LEVEL: process.env.TEST_LOG_LEVEL || 'info',
  TEST_LOG_REQUESTS: process.env.TEST_LOG_REQUESTS !== 'false',
  TEST_LOG_RESPONSES: process.env.TEST_LOG_RESPONSES !== 'false',
  
  // Security
  TEST_ENVIRONMENT_GUARD: process.env.TEST_ENVIRONMENT_GUARD !== 'false',
  TEST_CLEANUP_ENABLED: process.env.TEST_CLEANUP_ENABLED !== 'false'
};

/**
 * Validate test environment configuration
 */
export const validateTestEnvironment = () => {
  const errors = [];
  const warnings = [];
  
  // Check for required environment variables
  if (!TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_ID) {
    errors.push('PINGONE_TEST_CLIENT_ID is required');
  }
  if (!TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_SECRET) {
    errors.push('PINGONE_TEST_CLIENT_SECRET is required');
  }
  if (!TEST_ENV_CONFIG.PINGONE_TEST_ENVIRONMENT_ID) {
    errors.push('PINGONE_TEST_ENVIRONMENT_ID is required');
  }
  
  // Validate region
  const validRegions = ['NorthAmerica', 'Europe', 'AsiaPacific'];
  if (!validRegions.includes(TEST_ENV_CONFIG.PINGONE_TEST_REGION)) {
    errors.push(`PINGONE_TEST_REGION must be one of: ${validRegions.join(', ')}`);
  }
  
  // Production environment guard
  if (TEST_ENV_CONFIG.TEST_ENVIRONMENT_GUARD && TEST_ENV_CONFIG.NODE_ENV === 'production') {
    errors.push('Integration tests cannot run in production environment');
  }
  
  // Warn about missing optional configurations
  if (!process.env.API_BASE_URL) {
    warnings.push('API_BASE_URL not set, using default: http://localhost:4000');
  }
  if (!process.env.TEST_TIMEOUT) {
    warnings.push('TEST_TIMEOUT not set, using default: 60000ms');
  }
  
  // Display warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Test environment warnings:');
    warnings.forEach(warning => console.warn(`   ${warning}`));
  }
  
  // Throw error if validation fails
  if (errors.length > 0) {
    throw new Error(`Test environment validation failed:\n${errors.join('\n')}`);
  }
  
  console.log('✅ Test environment validated successfully');
  console.log(`📍 API Base URL: ${TEST_ENV_CONFIG.API_BASE_URL}`);
  console.log(`🌍 PingOne Region: ${TEST_ENV_CONFIG.PINGONE_TEST_REGION}`);
  console.log(`🏢 Environment ID: ${TEST_ENV_CONFIG.PINGONE_TEST_ENVIRONMENT_ID}`);
  console.log(`⏱️  Test Timeout: ${TEST_ENV_CONFIG.TEST_TIMEOUT}ms`);
  console.log(`🔄 Retry Attempts: ${TEST_ENV_CONFIG.TEST_RETRY_ATTEMPTS}`);
};

/**
 * Get secure configuration for tests
 */
export const getSecureConfig = () => {
  // Mask sensitive data for logging
  const maskedConfig = {
    ...TEST_ENV_CONFIG,
    PINGONE_TEST_CLIENT_ID: TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_ID ? 
      `${TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_ID.substring(0, 8)}...` : 'NOT_SET',
    PINGONE_TEST_CLIENT_SECRET: TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_SECRET ? 
      '***MASKED***' : 'NOT_SET'
  };
  
  return maskedConfig;
};

/**
 * Create test-specific environment variables
 */
export const createTestEnvVars = () => {
  return {
    NODE_ENV: 'test',
    API_BASE_URL: TEST_ENV_CONFIG.API_BASE_URL,
    PINGONE_CLIENT_ID: TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_ID,
    PINGONE_CLIENT_SECRET: TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_SECRET,
    PINGONE_ENVIRONMENT_ID: TEST_ENV_CONFIG.PINGONE_TEST_ENVIRONMENT_ID,
    PINGONE_REGION: TEST_ENV_CONFIG.PINGONE_TEST_REGION
  };
};

/**
 * Check if tests should run
 */
export const shouldRunTests = () => {
  try {
    validateTestEnvironment();
    return true;
  } catch (error) {
    console.error('❌ Test environment validation failed:', error.message);
    return false;
  }
};

/**
 * Get test configuration summary
 */
export const getTestConfigSummary = () => {
  const config = getSecureConfig();
  
  return {
    environment: config.NODE_ENV,
    apiBaseUrl: config.API_BASE_URL,
    pingOneRegion: config.PINGONE_TEST_REGION,
    pingOneEnvironmentId: config.PINGONE_TEST_ENVIRONMENT_ID,
    pingOneClientId: config.PINGONE_TEST_CLIENT_ID,
    pingOneClientSecret: config.PINGONE_TEST_CLIENT_SECRET,
    timeout: config.TEST_TIMEOUT,
    retryAttempts: config.TEST_RETRY_ATTEMPTS,
    cleanupEnabled: config.TEST_CLEANUP_ENABLED,
    logRequests: config.TEST_LOG_REQUESTS,
    logResponses: config.TEST_LOG_RESPONSES
  };
};

// Export default configuration
export default TEST_ENV_CONFIG; 