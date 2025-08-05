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


"use strict";
var fs = require('fs');
var path = require('path');
var settings = {};
var credentialSource = 'env';
try {
  var settingsPath = path.resolve(__dirname, '../../../data/settings.json');
  if (fs.existsSync(settingsPath)) {
    var raw = fs.readFileSync(settingsPath, 'utf8');
    var parsed = JSON.parse(raw);
    // Debug: Log raw parsed object
    console.log('[🗝️ CREDENTIAL-MANAGER] Raw parsed settings:', JSON.stringify(parsed, null, 2));
    // Only use if all required credentials are present and non-empty strings
    if (
      typeof parsed.pingone_client_id === 'string' && parsed.pingone_client_id.trim() !== '' &&
      typeof parsed.pingone_client_secret === 'string' && parsed.pingone_client_secret.trim() !== '' &&
      typeof parsed.pingone_environment_id === 'string' && parsed.pingone_environment_id.trim() !== ''
    ) {
      settings = parsed;
      credentialSource = 'settings.json';
    } else {
      settings = {};
    }
  } else {
    settings = {};
  }
} catch (err) {
  console.error('Failed to load settings.json:', err);
  settings = {};
}

function logCredentialSource(source) {
  var msg = '[🗝️ CREDENTIAL-MANAGER] [' + new Date().toISOString() + '] [test-env] INFO: Credential source: ' + source;
  // Log to console and optionally to a file or test log
  console.log(msg);
}
/**
 * Test environment configuration
 */
var TEST_ENV_CONFIG = {
  // Environment validation
  NODE_ENV: process.env.NODE_ENV || 'test',
  
  // API Configuration
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000',
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT) || 30000,
  
  // PingOne Test Environment (REQUIRED)
  PINGONE_TEST_CLIENT_ID: settings.pingone_client_id || process.env.PINGONE_CLIENT_ID,
  PINGONE_TEST_CLIENT_SECRET: settings.pingone_client_secret || process.env.PINGONE_CLIENT_SECRET,
  PINGONE_TEST_ENVIRONMENT_ID: settings.pingone_environment_id || process.env.PINGONE_ENVIRONMENT_ID,
  PINGONE_TEST_REGION: settings.pingone_region || process.env.PINGONE_REGION || 'NorthAmerica',
  
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
function validateTestEnvironment() {
  // Log credential source in unified format
  logCredentialSource(credentialSource);
  var errors = [];
  var warnings = [];
  
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
  var validRegions = ['NorthAmerica', 'Europe', 'AsiaPacific'];
  var regionValid = validRegions.indexOf(TEST_ENV_CONFIG.PINGONE_TEST_REGION) !== -1;
  if (!regionValid) {
    errors.push('PINGONE_TEST_REGION must be one of: ' + validRegions.join(', '));
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
    warnings.forEach(function(warning) {
      console.warn('   ' + warning);
    });
  }
  
  // Throw error if validation fails
  if (errors.length > 0) {
    throw new Error('Test environment validation failed:\n' + errors.join('\n'));
  }
  
  console.log('✅ Test environment validated successfully');
  console.log('📍 API Base URL: ' + TEST_ENV_CONFIG.API_BASE_URL);
  console.log('🌍 PingOne Region: ' + TEST_ENV_CONFIG.PINGONE_TEST_REGION);
  console.log('🏢 Environment ID: ' + TEST_ENV_CONFIG.PINGONE_TEST_ENVIRONMENT_ID);
  console.log('⏱️  Test Timeout: ' + TEST_ENV_CONFIG.TEST_TIMEOUT + 'ms');
  console.log('🔄 Retry Attempts: ' + TEST_ENV_CONFIG.TEST_RETRY_ATTEMPTS);
};

/**
 * Get secure configuration for tests
 */
function getSecureConfig() {
  // Mask sensitive data for logging
  var maskedConfig = {};
  for (var key in TEST_ENV_CONFIG) {
    maskedConfig[key] = TEST_ENV_CONFIG[key];
  }
  maskedConfig.PINGONE_TEST_CLIENT_ID = TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_ID ?
    TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_ID.substring(0, 8) + '...' : 'NOT_SET';
  maskedConfig.PINGONE_TEST_CLIENT_SECRET = TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_SECRET ?
    '***MASKED***' : 'NOT_SET';
  return maskedConfig;
}

/**
 * Create test-specific environment variables
 */
function createTestEnvVars() {
  return {
    NODE_ENV: 'test',
    API_BASE_URL: TEST_ENV_CONFIG.API_BASE_URL,
    PINGONE_CLIENT_ID: TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_ID,
    PINGONE_CLIENT_SECRET: TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_SECRET,
    PINGONE_ENVIRONMENT_ID: TEST_ENV_CONFIG.PINGONE_TEST_ENVIRONMENT_ID,
    PINGONE_REGION: TEST_ENV_CONFIG.PINGONE_TEST_REGION
  };
}

/**
 * Check if tests should run
 */
function shouldRunTests() {
  try {
    validateTestEnvironment();
    return true;
  } catch (error) {
    console.error('❌ Test environment validation failed:', error.message);
    return false;
  }
}

/**
 * Get test configuration summary
 */
function getTestConfigSummary() {
  var config = getSecureConfig();
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
}

module.exports = {
  TEST_ENV_CONFIG: TEST_ENV_CONFIG,
  validateTestEnvironment: validateTestEnvironment,
  getSecureConfig: getSecureConfig,
  createTestEnvVars: createTestEnvVars,
  shouldRunTests: shouldRunTests,
  getTestConfigSummary: getTestConfigSummary
};