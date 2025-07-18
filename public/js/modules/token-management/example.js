/**
 * Token Management Subsystem - Example Usage
 * 
 * This file demonstrates how to use the Token Management Subsystem.
 */

import { 
  createPingOneTokenProvider,
  createJWTTokenValidator,
  createSimpleTokenStorage,
  createTokenService,
  createTokenManager,
  TokenStatus
} from './index.js';

/**
 * Example encryption service (simplified for demonstration)
 */
class SimpleEncryptionService {
  /**
   * Encrypt a string
   * @param {string} data - Data to encrypt
   * @returns {Promise<string>} Encrypted data
   */
  async encrypt(data) {
    // In a real implementation, this would use proper encryption
    return btoa(`encrypted:${data}`);
  }
  
  /**
   * Decrypt a string
   * @param {string} data - Data to decrypt
   * @returns {Promise<string>} Decrypted data
   */
  async decrypt(data) {
    // In a real implementation, this would use proper decryption
    const decoded = atob(data);
    return decoded.replace('encrypted:', '');
  }
}

/**
 * Example API client (simplified for demonstration)
 */
class SimpleApiClient {
  /**
   * Make a request
   * @param {string} url - URL to request
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response object
   */
  async request(url, options) {
    console.log(`Making request to ${url}`, options);
    
    // In a real implementation, this would make an actual HTTP request
    // For this example, we'll simulate a token response
    if (url.includes('/as/token')) {
      return {
        ok: true,
        json: async () => ({
          access_token: 'example_access_token',
          refresh_token: 'example_refresh_token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile'
        })
      };
    }
    
    return {
      ok: false,
      status: 404,
      text: async () => 'Not Found'
    };
  }
}

/**
 * Example logger (simplified for demonstration)
 */
class SimpleLogger {
  debug(message, data) {
    console.log(`[DEBUG] ${message}`, data);
  }
  
  info(message, data) {
    console.log(`[INFO] ${message}`, data);
  }
  
  warn(message, data) {
    console.warn(`[WARN] ${message}`, data);
  }
  
  error(message, data) {
    console.error(`[ERROR] ${message}`, data);
  }
}

/**
 * Example usage of the Token Management Subsystem
 */
async function exampleUsage() {
  // Create dependencies
  const apiClient = new SimpleApiClient();
  const encryptionService = new SimpleEncryptionService();
  const logger = new SimpleLogger();
  
  // Create token provider
  const tokenProvider = createPingOneTokenProvider(
    apiClient,
    {
      clientId: 'example_client_id',
      clientSecret: 'example_client_secret',
      environmentId: 'example_environment_id',
      region: 'na'
    },
    logger
  );
  
  // Create token validator
  const tokenValidator = createJWTTokenValidator({}, logger);
  
  // Create token storage
  const tokenStorage = createSimpleTokenStorage({}, logger);
  
  // Create token service
  const tokenService = createTokenService(
    tokenProvider,
    tokenValidator,
    tokenStorage,
    logger,
    {
      autoRefreshThreshold: 300, // 5 minutes
      refreshRetryLimit: 3
    }
  );
  
  // Create token manager
  const tokenManager = createTokenManager(
    tokenService,
    null, // No status provider yet
    logger,
    {
      autoInitialize: true,
      autoRefresh: true
    }
  );
  
  // Register for token status changes
  tokenManager.onTokenStatusChange(status => {
    console.log(`Token status changed to: ${status}`);
  });
  
  try {
    // Get a token
    console.log('Getting token...');
    const token = await tokenManager.getToken();
    console.log('Token acquired:', token);
    
    // Get token status
    const status = await tokenManager.getTokenStatus();
    console.log('Token status:', status);
    
    // Refresh token
    console.log('Refreshing token...');
    const refreshedToken = await tokenManager.refreshToken();
    console.log('Token refreshed:', refreshedToken);
    
    // Ensure valid token
    console.log('Ensuring valid token...');
    const validToken = await tokenManager.ensureValidToken();
    console.log('Valid token:', validToken);
    
    // Clear token
    console.log('Clearing token...');
    await tokenManager.clearToken();
    console.log('Token cleared');
    
    // Get token status after clearing
    const finalStatus = await tokenManager.getTokenStatus();
    console.log('Final token status:', finalStatus);
  } catch (error) {
    console.error('Error in example:', error);
  } finally {
    // Clean up
    tokenManager.dispose();
  }
}

// Run the example
exampleUsage().catch(error => {
  console.error('Unhandled error in example:', error);
});