/**
 * @fileoverview Setup Verification Test for Real API Integration Tests
 * 
 * This test verifies that the test environment is properly configured
 * and can make basic API calls to the PingOne Import Tool.
 * 
 * This test should be run before running the full integration test suite
 * to ensure the environment is ready.
 */

import axios from 'axios';
import { TEST_ENV_CONFIG, validateTestEnvironment, shouldRunTests } from './test-env.config.js';

// Test configuration
const TEST_CONFIG = {
  baseURL: TEST_ENV_CONFIG.API_BASE_URL,
  timeout: TEST_ENV_CONFIG.API_TIMEOUT
};

// Create API client
const createApiClient = () => {
  return axios.create({
    baseURL: TEST_CONFIG.baseURL,
    timeout: TEST_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'PingOne-Import-Setup-Test/1.0'
    }
  });
};

describe('Setup Verification Tests', () => {
  let api;
  
  beforeAll(() => {
    console.log('🔍 Running setup verification tests...');
    
    // Validate test environment
    if (!shouldRunTests()) {
      console.error('❌ Test environment validation failed. Please check your configuration.');
      process.exit(1);
    }
    
    api = createApiClient();
  });
  
  describe('Environment Configuration', () => {
    test('should have valid test environment configuration', () => {
      // This test validates the environment configuration
      expect(TEST_ENV_CONFIG.NODE_ENV).toBe('test');
      expect(TEST_ENV_CONFIG.API_BASE_URL).toBeDefined();
      expect(TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_ID).toBeDefined();
      expect(TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_SECRET).toBeDefined();
      expect(TEST_ENV_CONFIG.PINGONE_TEST_ENVIRONMENT_ID).toBeDefined();
      expect(TEST_ENV_CONFIG.PINGONE_TEST_REGION).toBeDefined();
      
      console.log('✅ Environment configuration is valid');
    });
    
    test('should not be running in production', () => {
      expect(TEST_ENV_CONFIG.NODE_ENV).not.toBe('production');
      console.log('✅ Not running in production environment');
    });
    
    test('should have valid PingOne region', () => {
      const validRegions = ['NorthAmerica', 'Europe', 'AsiaPacific'];
      expect(validRegions).toContain(TEST_ENV_CONFIG.PINGONE_TEST_REGION);
      console.log(`✅ PingOne region is valid: ${TEST_ENV_CONFIG.PINGONE_TEST_REGION}`);
    });
  });
  
  describe('API Server Connectivity', () => {
    test('should be able to connect to API server', async () => {
      try {
        const response = await api.get('/api/health');
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
        console.log('✅ API server is accessible');
      } catch (error) {
        console.error('❌ Cannot connect to API server:', error.message);
        console.error('   Please ensure the server is running with: npm start');
        throw error;
      }
    });
    
    test('should get valid health response structure', async () => {
      const response = await api.get('/api/health');
      
      // Validate response structure
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('server');
      expect(response.data).toHaveProperty('system');
      expect(response.data).toHaveProperty('checks');
      
      // Validate system information
      expect(response.data.system).toHaveProperty('node');
      expect(response.data.system).toHaveProperty('platform');
      expect(response.data.system).toHaveProperty('memory');
      
      console.log('✅ Health endpoint returns valid structure');
    });
  });
  
  describe('PingOne API Connectivity', () => {
    test('should be able to authenticate with PingOne API', async () => {
      try {
        // Test authentication by making a simple API call
        const response = await api.get(`/api/pingone/environments/${TEST_ENV_CONFIG.PINGONE_TEST_ENVIRONMENT_ID}/populations`);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('_embedded');
        expect(response.data._embedded).toHaveProperty('populations');
        console.log('✅ PingOne API authentication successful');
      } catch (error) {
        console.error('❌ PingOne API authentication failed:', error.message);
        console.error('   Please check your PingOne credentials and permissions');
        throw error;
      }
    });
    
    test('should have access to test environment', async () => {
      try {
        const response = await api.get(`/api/pingone/environments/${TEST_ENV_CONFIG.PINGONE_TEST_ENVIRONMENT_ID}`);
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id');
        expect(response.data.id).toBe(TEST_ENV_CONFIG.PINGONE_TEST_ENVIRONMENT_ID);
        console.log('✅ Test environment is accessible');
      } catch (error) {
        console.error('❌ Cannot access test environment:', error.message);
        console.error('   Please verify your environment ID and permissions');
        throw error;
      }
    });
  });
  
  describe('Basic API Endpoints', () => {
    test('should be able to retrieve settings', async () => {
      const response = await api.get('/api/settings');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('environmentId');
      expect(response.data).toHaveProperty('region');
      console.log('✅ Settings endpoint is accessible');
    });
    
    test('should be able to retrieve feature flags', async () => {
      const response = await api.get('/api/feature-flags');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success');
      expect(response.data).toHaveProperty('flags');
      console.log('✅ Feature flags endpoint is accessible');
    });
    
    test('should be able to retrieve logs', async () => {
      const response = await api.get('/api/logs');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('logs');
      expect(Array.isArray(response.data.logs)).toBe(true);
      console.log('✅ Logs endpoint is accessible');
    });
  });
  
  describe('Test Data Preparation', () => {
    test('should be able to create test population', async () => {
      const testPopulationName = `Setup Test Population ${Date.now()}`;
      
      try {
        const createResponse = await api.post(`/api/pingone/environments/${TEST_ENV_CONFIG.PINGONE_TEST_ENVIRONMENT_ID}/populations`, {
          name: testPopulationName,
          description: 'Temporary population for setup verification'
        });
        
        expect(createResponse.status).toBe(201);
        expect(createResponse.data).toHaveProperty('id');
        expect(createResponse.data.name).toBe(testPopulationName);
        
        // Clean up immediately
        await api.delete(`/api/pingone/environments/${TEST_ENV_CONFIG.PINGONE_TEST_ENVIRONMENT_ID}/populations/${createResponse.data.id}`);
        
        console.log('✅ Can create and delete test populations');
      } catch (error) {
        console.error('❌ Cannot create test population:', error.message);
        console.error('   Please check your PingOne API permissions');
        throw error;
      }
    });
  });
  
  describe('Configuration Summary', () => {
    test('should display configuration summary', () => {
      console.log('\n📋 Test Configuration Summary:');
      console.log('==============================');
      console.log(`Environment: ${TEST_ENV_CONFIG.NODE_ENV}`);
      console.log(`API Base URL: ${TEST_ENV_CONFIG.API_BASE_URL}`);
      console.log(`PingOne Region: ${TEST_ENV_CONFIG.PINGONE_TEST_REGION}`);
      console.log(`Environment ID: ${TEST_ENV_CONFIG.PINGONE_TEST_ENVIRONMENT_ID}`);
      console.log(`Client ID: ${TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_ID ? '***SET***' : 'NOT_SET'}`);
      console.log(`Client Secret: ${TEST_ENV_CONFIG.PINGONE_TEST_CLIENT_SECRET ? '***SET***' : 'NOT_SET'}`);
      console.log(`Test Timeout: ${TEST_ENV_CONFIG.TEST_TIMEOUT}ms`);
      console.log(`Retry Attempts: ${TEST_ENV_CONFIG.TEST_RETRY_ATTEMPTS}`);
      console.log('==============================\n');
      
      expect(true).toBe(true); // This test always passes, it just displays info
    });
  });
});

// Export for potential reuse
export { createApiClient, TEST_CONFIG }; 