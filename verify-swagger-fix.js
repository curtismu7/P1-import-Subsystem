#!/usr/bin/env node

/**
 * Swagger Fix Verification Script
 *
 * This script verifies that all Swagger UI fixes are working correctly
 * by testing the API endpoints and checking the responses.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000';

async function testEndpoint(name, url, options = {}, expectJson = true) {
  console.log(`🔄 Testing ${name}...`);

  try {
    const response = await fetch(`${BASE_URL}${url}`, options);

    if (response.ok) {
      if (expectJson) {
        const data = await response.json();
        if (data.success !== false) {
          console.log(`✅ ${name}: SUCCESS`);
          return { success: true, data };
        } else {
          console.log(`❌ ${name}: FAILED - ${data.error || 'Unknown error'}`);
          return { success: false, error: data.error };
        }
      } else {
        // For non-JSON responses (HTML, JS files), just check if they load
        const text = await response.text();
        if (text.length > 0) {
          console.log(`✅ ${name}: SUCCESS (${text.length} bytes)`);
          return { success: true };
        } else {
          console.log(`❌ ${name}: FAILED - Empty response`);
          return { success: false, error: 'Empty response' };
        }
      }
    } else {
      console.log(`❌ ${name}: FAILED - HTTP ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function verifySwaggerFix() {
  console.log('🚀 Verifying Swagger UI Fix...\n');

  const tests = [
    {
      name: 'Token Endpoint (POST /api/pingone/get-token)',
      url: '/api/pingone/get-token',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      expectJson: true
    },
    {
      name: 'Populations Endpoint (GET /api/populations)',
      url: '/api/populations',
      expectJson: true
    },
    {
      name: 'Settings Endpoint (GET /api/settings)',
      url: '/api/settings',
      expectJson: true
    },
    {
      name: 'Health Check (GET /api/health)',
      url: '/api/health',
      expectJson: true
    },
    {
      name: 'Swagger HTML (GET /swagger/index.html)',
      url: '/swagger/index.html',
      expectJson: false
    },
    {
      name: 'Swagger Initializer (GET /swagger/swagger-initializer.js)',
      url: '/swagger/swagger-initializer.js',
      expectJson: false
    },
    {
      name: 'Swagger UI Bundle (GET /swagger/swagger-ui-bundle.js)',
      url: '/swagger/swagger-ui-bundle.js',
      expectJson: false
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url, test.options, test.expectJson);
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
    console.log(''); // Empty line for readability
  }

  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Swagger UI fix is working correctly.');
    console.log('🔗 Access Swagger UI at: http://localhost:4000/swagger/index.html');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the server logs for more details.');
  }

  return failed === 0;
}

// Run verification
verifySwaggerFix()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });

export { verifySwaggerFix };
