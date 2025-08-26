/**
 * Startup Token Test Module
 *
 * Tests PingOne token acquisition at server startup to validate credentials
 * and provide early feedback on authentication issues.
 *
 * @author PingOne Import Tool Team
 * @version 1.0.0
 */

import { loadCredentials, getAuthDomain } from './pingone-connection-tester.js';

/**
 * Test token acquisition at startup
 * @param {object} logger - Logger instance
 * @returns {Promise<object>} Test result with success status and details
 */
export async function testStartupToken(logger = console) {
  const testId = 'STARTUP-' + Date.now();

  try {
    logger.info(`[${testId}] 🚀 Testing PingOne token acquisition at startup...`);

    // Create a mock request object for credential loading
    const mockReq = {
      settings: null // Will fallback to settings file
    };

    // Load credentials using the same logic as the connection tester
    const credentials = await loadCredentials(mockReq, testId);

    if (!credentials) {
      logger.error(`[${testId}] ❌ No credentials found - check settings file`);
      return {
        success: false,
        error: 'No credentials found',
        details: 'Could not load credentials from any source'
      };
    }

    logger.info(`[${testId}] ✅ Credentials loaded successfully`, {
      environmentId: credentials.environmentId,
      hasClientId: !!credentials.apiClientId,
      hasSecret: !!credentials.apiSecret,
      region: credentials.region
    });

    // Test token acquisition
    const authDomain = getAuthDomain(credentials.region);
    const tokenUrl = `https://${authDomain}/${credentials.environmentId}/as/token`;

    logger.info(`[${testId}] 🔑 Requesting token from: ${tokenUrl}`);

    // Prepare Basic Authentication header
    const authCredentials = `${credentials.apiClientId}:${credentials.apiSecret}`;
    const encodedCredentials = Buffer.from(authCredentials).toString('base64');

    const tokenData = new URLSearchParams({
      grant_type: 'client_credentials'
    });

    logger.info(`[${testId}] 🔐 Using Basic Authentication with client ID: ${credentials.apiClientId}`);

    const startTime = Date.now();
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encodedCredentials}`
      },
      body: tokenData
    });
    const responseTime = Date.now() - startTime;

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error(`[${testId}] ❌ Token request failed`, {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        responseTime: `${responseTime}ms`,
        error: errorText,
        tokenUrl
      });

      return {
        success: false,
        error: 'Token request failed',
        details: {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          responseTime,
          tokenUrl,
          errorText
        }
      };
    }

    const tokenResult = await tokenResponse.json();

    if (!tokenResult.access_token) {
      logger.error(`[${testId}] ❌ No access token in response`, tokenResult);
      return {
        success: false,
        error: 'No access token received',
        details: tokenResult
      };
    }

    logger.info(`[${testId}] ✅ Token acquired successfully!`, {
      responseTime: `${responseTime}ms`,
      tokenType: tokenResult.token_type,
      expiresIn: tokenResult.expires_in,
      scope: tokenResult.scope,
      tokenLength: tokenResult.access_token.length
    });

    return {
      success: true,
      message: 'Token acquired successfully',
      details: {
        responseTime,
        tokenType: tokenResult.token_type,
        expiresIn: tokenResult.expires_in,
        scope: tokenResult.scope,
        environmentId: credentials.environmentId,
        region: credentials.region
      }
    };

  } catch (error) {
    logger.error(`[${testId}] ❌ Startup token test failed:`, error);
    return {
      success: false,
      error: 'Startup token test failed',
      details: {
        message: error.message,
        stack: error.stack
      }
    };
  }
}

/**
 * Run startup token test and log results
 * @param {object} logger - Logger instance
 */
export async function runStartupTokenTest(logger = console) {
  logger.info('🔄 Running PingOne startup token test...');

  const result = await testStartupToken(logger);

  if (result.success) {
    logger.info('🎉 Startup token test PASSED - PingOne authentication working!');
    logger.info('✅ Ready for PingOne API operations');
  } else {
    logger.error('❌ Startup token test FAILED - Check your PingOne credentials');
    logger.error('🔧 Please verify your settings in data/settings.json');
    logger.error('📋 Error details:', result.details);
  }

  return result;
}
