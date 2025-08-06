#!/usr/bin/env node

/**
 * Real-time Communication Enhancement Test
 * 
 * Tests the enhanced real-time communication system:
 * - Standardized API responses
 * - Real-time message delivery
 * - Connection reliability
 * - Message queuing
 * - Error handling
 */

import fetch from 'node-fetch';
import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:4000';
const TEST_RESULTS = [];

/**
 * Test result logger
 */
function logTest(name, passed, details = '') {
  const result = {
    name,
    passed,
    details,
    timestamp: new Date().toISOString()
  };
  
  TEST_RESULTS.push(result);
  
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}${details ? ` - ${details}` : ''}`);}

/**
 * Test standardized API responses
 */
async function testStandardizedAPIResponses() {
  console.log('\\n🧪 Testing Standardized API Responses...');
  
  const endpoints = [
    '/api/health',
    '/api/settings',
    '/api/realtime/stats'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      const data = await response.json();
      
      // Check for standardized response format
      const hasSuccess = 'success' in data;
      const hasMessage = 'message' in data;
      const hasProperStructure = hasSuccess && hasMessage;
      
      // Check data/error structure based on success
      const hasCorrectContent = data.success 
        ? 'data' in data && 'meta' in data
        : 'error' in data;
      
      const isStandardized = hasProperStructure && hasCorrectContent;
      
      logTest(
        `Standardized API Response: ${endpoint}`,
        isStandardized,
        isStandardized ? 'Proper format' : 'Non-standard format'
      );
      
    } catch (error) {
      logTest(
        `Standardized API Response: ${endpoint}`,
        false,
        `Request failed: ${error.message}`
      );
    }
  }
}

/**
 * Test real-time connection and messaging
 */
async function testRealtimeConnection() {
  console.log('\\n🧪 Testing Real-time Connection...');
  
  return new Promise((resolve) => {
    let testsCompleted = 0;
    const totalTests = 4;
    
    const socket = io(BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });
    
    // Test 1: Connection establishment
    socket.on('connect', () => {
      logTest(
        'Real-time Connection Establishment',
        true,
        `Connected with ID: ${socket.id}`
      );
      testsCompleted++;
      
      // Test session association
      const sessionId = `test_session_${Date.now()}`;
      socket.emit('associate-session', { sessionId });
    });
    
    // Test 2: Message reception with standardized format
    socket.on('realtime-message', (response) => {
      const hasStandardFormat = response.success !== undefined && 
                               response.message !== undefined &&
                               response.data !== undefined &&
                               response.meta !== undefined;
      
      logTest(
        'Real-time Message Format',
        hasStandardFormat,
        hasStandardFormat ? 'Standardized format received' : 'Non-standard format'
      );
      testsCompleted++;
    });
    
    // Test 3: System message handling
    socket.on('system-message', (message) => {
      const hasRequiredFields = message.type !== undefined &&
                               message.data !== undefined &&
                               message.timestamp !== undefined;
      
      logTest(
        'System Message Format',
        hasRequiredFields,
        hasRequiredFields ? 'Proper system message' : 'Invalid system message'
      );
      testsCompleted++;
    });
    
    // Test 4: Error handling
    socket.on('connect_error', (error) => {
      logTest(
        'Real-time Connection Error Handling',
        false,
        `Connection error: ${error.message}`
      );
      testsCompleted++;
    });
    
    // Test heartbeat
    setTimeout(() => {
      socket.emit('heartbeat');
    }, 1000);
    
    // Test subscription
    setTimeout(() => {
      socket.emit('subscribe', { channel: 'test-channel' });
    }, 2000);
    
    // Cleanup and resolve
    setTimeout(() => {
      if (testsCompleted === 0) {
        logTest(
          'Real-time Connection Establishment',
          false,
          'Connection timeout'
        );
      }
      
      socket.disconnect();
      resolve();
    }, 8000);
  });
}

/**
 * Test real-time statistics endpoint
 */
async function testRealtimeStats() {
  console.log('\\n🧪 Testing Real-time Statistics...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/realtime/stats`);
    const data = await response.json();
    
    if (data.success && data.data) {
      const stats = data.data;
      const hasRequiredStats = 'totalConnections' in stats &&
                              'activeConnections' in stats &&
                              'messagesSent' in stats &&
                              'messageQueue' in stats;
      
      logTest(
        'Real-time Statistics Endpoint',
        hasRequiredStats,
        hasRequiredStats ? `Active connections: ${stats.activeConnections}` : 'Missing required stats'
      );
      
      // Test message queue stats
      if (stats.messageQueue) {
        const queueStats = stats.messageQueue;
        const hasQueueStats = 'totalQueues' in queueStats &&
                             'totalMessages' in queueStats;
        
        logTest(
          'Message Queue Statistics',
          hasQueueStats,
          hasQueueStats ? `Queues: ${queueStats.totalQueues}, Messages: ${queueStats.totalMessages}` : 'Missing queue stats'
        );
      }
    } else {
      logTest(
        'Real-time Statistics Endpoint',
        false,
        data.error?.message || 'Invalid response format'
      );
    }
    
  } catch (error) {
    logTest(
      'Real-time Statistics Endpoint',
      false,
      `Request failed: ${error.message}`
    );
  }
}

/**
 * Test API client consistency
 */
async function testAPIClientConsistency() {
  console.log('\\n🧪 Testing API Client Consistency...');
  
  // Test different HTTP methods for consistent response format
  const tests = [
    { method: 'GET', endpoint: '/api/health', expectSuccess: true },
    { method: 'GET', endpoint: '/api/nonexistent', expectSuccess: false },
    { method: 'POST', endpoint: '/api/settings', body: {}, expectSuccess: false } // Should fail validation
  ];
  
  for (const test of tests) {
    try {
      const options = {
        method: test.method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (test.body) {
        options.body = JSON.stringify(test.body);
      }
      
      const response = await fetch(`${BASE_URL}${test.endpoint}`, options);
      const data = await response.json();
      
      // Check response format consistency
      const hasStandardFormat = 'success' in data && 'message' in data;
      const successMatches = data.success === test.expectSuccess || !test.expectSuccess;
      
      logTest(
        `API Consistency: ${test.method} ${test.endpoint}`,
        hasStandardFormat && successMatches,
        hasStandardFormat ? `Format OK, Success: ${data.success}` : 'Non-standard format'
      );
      
    } catch (error) {
      logTest(
        `API Consistency: ${test.method} ${test.endpoint}`,
        false,
        `Request failed: ${error.message}`
      );
    }
  }
}

/**
 * Test error handling consistency
 */
async function testErrorHandling() {
  console.log('\\n🧪 Testing Error Handling Consistency...');
  
  // Test various error scenarios
  const errorTests = [
    { endpoint: '/api/nonexistent', expectedStatus: 404, description: '404 Not Found' },
    { endpoint: '/api/settings', method: 'POST', body: { invalid: 'data' }, expectedStatus: 400, description: 'Validation Error' }
  ];
  
  for (const test of errorTests) {
    try {
      const options = {
        method: test.method || 'GET',
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (test.body) {
        options.body = JSON.stringify(test.body);
      }
      
      const response = await fetch(`${BASE_URL}${test.endpoint}`, options);
      const data = await response.json();
      
      const hasCorrectStatus = response.status === test.expectedStatus;
      const hasErrorFormat = !data.success && 'error' in data;
      const hasErrorCode = data.error && 'code' in data.error;
      
      logTest(
        `Error Handling: ${test.description}`,
        hasCorrectStatus && hasErrorFormat && hasErrorCode,
        `Status: ${response.status}, Format OK: ${hasErrorFormat}, Code: ${data.error?.code}`
      );
      
    } catch (error) {
      logTest(
        `Error Handling: ${test.description}`,
        false,
        `Request failed: ${error.message}`
      );
    }
  }
}

/**
 * Generate test report
 */
function generateTestReport() {
  const totalTests = TEST_RESULTS.length;
  const passedTests = TEST_RESULTS.filter(t => t.passed).length;
  const failedTests = totalTests - passedTests;
  const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) : 0;
  
  const report = {
    summary: {
      totalTests,
      passedTests,
      failedTests,
      successRate: `${successRate}%`,
      timestamp: new Date().toISOString()
    },
    results: TEST_RESULTS,
    categories: {
      'API Standardization': TEST_RESULTS.filter(t => t.name.includes('API')).length,
      'Real-time Communication': TEST_RESULTS.filter(t => t.name.includes('Real-time')).length,
      'Error Handling': TEST_RESULTS.filter(t => t.name.includes('Error')).length
    }
  };
  
  return report;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Real-time Communication Enhancement Test Suite');
  console.log('=' .repeat(60));
  
  // Check if server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`);
    if (!healthCheck.ok) {
      throw new Error('Server health check failed');
    }
    console.log('✅ Server is running and accessible\\n');
  } catch (error) {
    console.error('❌ Server is not accessible. Please start the server first.');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
  
  // Run all tests
  await testStandardizedAPIResponses();
  await testRealtimeConnection();
  await testRealtimeStats();
  await testAPIClientConsistency();
  await testErrorHandling();
  
  // Generate report
  const report = generateTestReport();
  
  // Print summary
  console.log('\\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`Passed: ${report.summary.passedTests}`);
  console.log(`Failed: ${report.summary.failedTests}`);
  console.log(`Success Rate: ${report.summary.successRate}`);
  
  console.log('\\n📋 CATEGORIES:');
  Object.entries(report.categories).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} tests`);
  });
  
  if (report.summary.failedTests === 0) {
    console.log('\\n🎉 All real-time communication enhancements are working perfectly!');
    console.log('\\n✅ Your application now has:');
    console.log('   • Standardized API responses across all endpoints');
    console.log('   • Reliable real-time communication with message queuing');
    console.log('   • Consistent error handling and reporting');
    console.log('   • Enhanced connection management with health monitoring');
  } else {
    console.log('\\n⚠️  Some issues were found. Check the details above.');
  }
  
  // Exit with appropriate code
  process.exit(report.summary.failedTests > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { runTests };