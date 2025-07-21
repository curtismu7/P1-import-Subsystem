/**
 * PingOne Auth Subsystem Test Script
 * 
 * This script tests the PingOne Auth Subsystem by making direct API calls
 * to verify functionality.
 * 
 * Usage:
 *   node test-auth-subsystem.js
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:4000/api/v1/auth';
const TEST_CREDENTIALS = {
  environmentId: process.env.PINGONE_ENVIRONMENT_ID || 'your-environment-id',
  apiClientId: process.env.PINGONE_CLIENT_ID || 'your-client-id',
  apiSecret: process.env.PINGONE_CLIENT_SECRET || 'your-client-secret',
  region: process.env.PINGONE_REGION || 'NorthAmerica'
};

// Helper function for API calls
async function callApi(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`Making API call to: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${data.error || data.message || 'Unknown error'}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API call failed: ${error.message}`);
    throw error;
  }
}

// Test functions
async function testTokenStatus() {
  console.log('\n=== Testing Token Status ===');
  try {
    const result = await callApi('/status');
    console.log('Token status:', result);
    return result;
  } catch (error) {
    console.error('Token status test failed:', error.message);
    return null;
  }
}

async function testGetToken() {
  console.log('\n=== Testing Get Token ===');
  try {
    const result = await callApi('/token');
    console.log('Token result:', {
      success: result.success,
      hasToken: !!result.token,
      tokenInfo: result.tokenInfo
    });
    return result.token;
  } catch (error) {
    console.error('Get token test failed:', error.message);
    return null;
  }
}

async function testClearToken() {
  console.log('\n=== Testing Clear Token ===');
  try {
    const result = await callApi('/clear-token', { method: 'POST' });
    console.log('Clear token result:', result);
    return result;
  } catch (error) {
    console.error('Clear token test failed:', error.message);
    return null;
  }
}

async function testValidateCredentials() {
  console.log('\n=== Testing Validate Credentials ===');
  try {
    const result = await callApi('/validate-credentials', {
      method: 'POST',
      body: JSON.stringify(TEST_CREDENTIALS)
    });
    console.log('Validate credentials result:', result);
    return result;
  } catch (error) {
    console.error('Validate credentials test failed:', error.message);
    return null;
  }
}

async function testSaveCredentials() {
  console.log('\n=== Testing Save Credentials ===');
  try {
    const result = await callApi('/save-credentials', {
      method: 'POST',
      body: JSON.stringify(TEST_CREDENTIALS)
    });
    console.log('Save credentials result:', result);
    return result;
  } catch (error) {
    console.error('Save credentials test failed:', error.message);
    return null;
  }
}

async function testGetCredentials() {
  console.log('\n=== Testing Get Credentials ===');
  try {
    const result = await callApi('/credentials');
    console.log('Get credentials result:', result);
    return result;
  } catch (error) {
    console.error('Get credentials test failed:', error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('Starting PingOne Auth Subsystem Tests');
  console.log('====================================');
  
  try {
    // Test token status
    await testTokenStatus();
    
    // Test get token
    const token = await testGetToken();
    
    // Test clear token
    if (token) {
      await testClearToken();
      await testTokenStatus(); // Check status after clearing
    }
    
    // Test validate credentials
    await testValidateCredentials();
    
    // Test save credentials
    await testSaveCredentials();
    
    // Test get credentials
    await testGetCredentials();
    
    // Final token status check
    await testTokenStatus();
    
    console.log('\n====================================');
    console.log('All tests completed');
  } catch (error) {
    console.error('\nTest suite failed:', error.message);
  }
}

// Run the tests
runTests();