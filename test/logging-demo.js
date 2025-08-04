/**
 * Logging System Demo Test
 * 
 * This script demonstrates the enhanced logging capabilities with
 * color-coding, emojis, visual markers, and token status tracking.
 */

import { createWinstonLogger, apiLogHelpers, EMOJIS } from '../server/winston-config.js';

// Create a test logger instance
const testLogger = createWinstonLogger({
  service: 'logging-demo',
  enableFileLogging: false // Only console output for demonstration
});

// Function to simulate a token status
function getTestTokenStatus() {
  return {
    valid: true,
    expired: false,
    expiring: false,
    expiry: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    tokenId: 'test-token-123',
    timeUntilExpiry: '1 hour'
  };
}

// Function to simulate an expiring token
function getExpiringTokenStatus() {
  return {
    valid: true,
    expired: false,
    expiring: true,
    expiry: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
    tokenId: 'test-token-456',
    timeUntilExpiry: '5 minutes'
  };
}

// Function to simulate an expired token
function getExpiredTokenStatus() {
  return {
    valid: false,
    expired: true,
    expiring: false,
    expiry: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    tokenId: 'test-token-789',
    timeUntilExpiry: '-1 hour'
  };
}

async function runLoggingDemo() {
  console.log("\n\n===== ENHANCED LOGGING SYSTEM DEMONSTRATION =====\n");
  
  // Basic log level examples
  testLogger.info(`${EMOJIS.info} Testing INFO level logging`, { 
    testId: '001', 
    component: 'logging-demo' 
  });
  
  testLogger.warn(`${EMOJIS.warning} Testing WARNING level logging`, { 
    testId: '002', 
    component: 'logging-demo',
    potentialIssue: 'Resource usage high'
  });
  
  testLogger.error(`${EMOJIS.error} Testing ERROR level logging`, { 
    testId: '003', 
    component: 'logging-demo',
    error: new Error('Test error message')
  });
  
  testLogger.debug(`${EMOJIS.debug} Testing DEBUG level logging`, { 
    testId: '004', 
    component: 'logging-demo',
    debugData: { key: 'value', nested: { data: true } }
  });
  
  // Token status examples
  console.log("\n\n===== TOKEN STATUS LOGGING DEMONSTRATION =====\n");
  
  // Valid token
  const validStatus = getTestTokenStatus();
  apiLogHelpers.logTokenStatus('valid', {
    tokenExpiry: validStatus.expiry,
    tokenId: validStatus.tokenId,
    timeUntilExpiry: validStatus.timeUntilExpiry
  });
  
  // Expiring token
  const expiringStatus = getExpiringTokenStatus();
  apiLogHelpers.logTokenStatus('expiring', {
    tokenExpiry: expiringStatus.expiry,
    tokenId: expiringStatus.tokenId,
    timeUntilExpiry: expiringStatus.timeUntilExpiry
  });
  
  // Expired token
  const expiredStatus = getExpiredTokenStatus();
  apiLogHelpers.logTokenStatus('expired', {
    tokenExpiry: expiredStatus.expiry,
    tokenId: expiredStatus.tokenId,
    timeUntilExpiry: expiredStatus.timeUntilExpiry
  });
  
  // API request/response examples
  console.log("\n\n===== API LOGGING DEMONSTRATION =====\n");
  
  // Mock request object
  const mockReq = {
    method: 'GET',
    originalUrl: '/api/users',
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Jest Test Runner',
      'content-type': 'application/json'
    },
    get: (header) => mockReq.headers[header]
  };
  
  // Mock response object
  const mockRes = {
    statusCode: 200,
    statusMessage: 'OK',
    get: (header) => header === 'content-type' ? 'application/json' : null
  };
  
  // Log API request
  const requestId = apiLogHelpers.logApiRequest(mockReq);
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Log API response
  apiLogHelpers.logApiResponse(mockReq, mockRes, requestId, 50);
  
  // Now log an API error
  const errorMockReq = {
    method: 'POST',
    originalUrl: '/api/auth/token',
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Jest Test Runner',
      'content-type': 'application/json'
    },
    get: (header) => errorMockReq.headers[header]
  };
  
  const errorMockRes = {
    statusCode: 401,
    statusMessage: 'Unauthorized',
    get: (header) => header === 'content-type' ? 'application/json' : null
  };
  
  apiLogHelpers.logApiError(
    errorMockReq, 
    new Error('Invalid credentials'), 
    { context: 'auth', tokenStatus: 'invalid' }
  );
  
  console.log("\n\n===== END OF LOGGING DEMONSTRATION =====\n");
}

// Export the test function
export default runLoggingDemo;
