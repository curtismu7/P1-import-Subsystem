/**
 * Token Management Subsystem - Token Storage
 * 
 * This module defines the TokenStorage interface and implementations.
 * TokenStorage is responsible for securely storing and retrieving tokens.
 */

/**
 * Interface for token storage
 * @interface
 */
export class TokenStorage {
  /**
   * Save a token and its information
   * @param {string} token - The token to save
   * @param {import('./models.js').TokenInfo} tokenInfo - The token information
   * @returns {Promise<void>}
   */
  async saveToken(token, tokenInfo) {
    throw new Error('TokenStorage.saveToken() must be implemented by subclass');
  }
  
  /**
   * Get the stored token
   * @returns {Promise<string|null>} The token, or null if not found
   */
  async getToken() {
    throw new Error('TokenStorage.getToken() must be implemented by subclass');
  }
  
  /**
   * Get the stored token information
   * @returns {Promise<import('./models.js').TokenInfo|null>} The token information, or null if not found
   */
  async getTokenInfo() {
    throw new Error('TokenStorage.getTokenInfo() must be implemented by subclass');
  }
  
  /**
   * Clear the stored token
   * @returns {Promise<void>}
   */
  async clearToken() {
    throw new Error('TokenStorage.clearToken() must be implemented by subclass');
  }
}

/**
 * Options for SecureTokenStorage
 * @typedef {Object} SecureTokenStorageOptions
 * @property {string} [tokenKey='auth_token'] - Key for storing the token
 * @property {string} [tokenInfoKey='auth_token_info'] - Key for storing the token information
 * @property {string} [storageType='localStorage'] - Storage type ('localStorage' or 'sessionStorage')
 * @property {boolean} [encrypt=true] - Whether to encrypt the token
 */

/**
 * Secure implementation of TokenStorage
 * @extends TokenStorage
 */
export class SecureTokenStorage extends TokenStorage {
  /**
   * Create a SecureTokenStorage
   * @param {Object} encryptionService - Service for encrypting/decrypting data
   * @param {SecureTokenStorageOptions} [options] - Storage options
   * @param {Object} [logger] - Logger instance
   */
  constructor(encryptionService, options = {}, logger) {
    super();
    
    if (!encryptionService) {
      throw new Error('Encryption service is required for SecureTokenStorage');
    }
    
    this.encryptionService = encryptionService;
    this.options = {
      tokenKey: 'auth_token',
      tokenInfoKey: 'auth_token_info',
      storageType: 'localStorage',
      encrypt: true,
      ...options
    };
    
    this.logger = logger || console;
    
    // Get the storage object
    this.storage = this.options.storageType === 'sessionStorage' 
      ? sessionStorage 
      : localStorage;
  }
  
  /**
   * Save a token and its information
   * @param {string} token - The token to save
   * @param {import('./models.js').TokenInfo} tokenInfo - The token information
   * @returns {Promise<void>}
   */
  async saveToken(token, tokenInfo) {
    try {
      this.logger.debug('Saving token', { 
        tokenType: tokenInfo.tokenType,
        expiresAt: tokenInfo.expiresAt,
        hasRefreshToken: !!tokenInfo.refreshToken
      });
      
      // Store the token
      let tokenToStore = token;
      if (this.options.encrypt) {
        tokenToStore = await this.encryptionService.encrypt(token);
      }
      
      this.storage.setItem(this.options.tokenKey, tokenToStore);
      
      // Store token info
      const tokenInfoToStore = {
        ...tokenInfo,
        // Convert Date to ISO string for storage
        expiresAt: tokenInfo.expiresAt instanceof Date 
          ? tokenInfo.expiresAt.toISOString() 
          : tokenInfo.expiresAt
      };
      
      // Remove the actual tokens from the stored info for security
      delete tokenInfoToStore.accessToken;
      delete tokenInfoToStore.refreshToken;
      
      this.storage.setItem(
        this.options.tokenInfoKey, 
        JSON.stringify(tokenInfoToStore)
      );
      
      this.logger.debug('Token saved successfully');
    } catch (error) {
      this.logger.error('Failed to save token', { error });
      throw new Error(`Failed to save token: ${error.message}`);
    }
  }
  
  /**
   * Get the stored token
   * @returns {Promise<string|null>} The token, or null if not found
   */
  async getToken() {
    try {
      const storedToken = this.storage.getItem(this.options.tokenKey);
      
      if (!storedToken) {
        this.logger.debug('No token found in storage');
        return null;
      }
      
      // Decrypt if necessary
      if (this.options.encrypt) {
        try {
          const decryptedToken = await this.encryptionService.decrypt(storedToken);
          this.logger.debug('Token retrieved and decrypted successfully');
          return decryptedToken;
        } catch (error) {
          this.logger.error('Failed to decrypt token', { error });
          return null;
        }
      }
      
      this.logger.debug('Token retrieved successfully');
      return storedToken;
    } catch (error) {
      this.logger.error('Failed to get token', { error });
      return null;
    }
  }
  
  /**
   * Get the stored token information
   * @returns {Promise<import('./models.js').TokenInfo|null>} The token information, or null if not found
   */
  async getTokenInfo() {
    try {
      const storedTokenInfo = this.storage.getItem(this.options.tokenInfoKey);
      
      if (!storedTokenInfo) {
        this.logger.debug('No token info found in storage');
        return null;
      }
      
      const tokenInfo = JSON.parse(storedTokenInfo);
      
      // Convert ISO string back to Date
      if (tokenInfo.expiresAt) {
        tokenInfo.expiresAt = new Date(tokenInfo.expiresAt);
      }
      
      this.logger.debug('Token info retrieved successfully', {
        tokenType: tokenInfo.tokenType,
        expiresAt: tokenInfo.expiresAt
      });
      
      return tokenInfo;
    } catch (error) {
      this.logger.error('Failed to get token info', { error });
      return null;
    }
  }
  
  /**
   * Clear the stored token
   * @returns {Promise<void>}
   */
  async clearToken() {
    try {
      this.logger.debug('Clearing token from storage');
      
      this.storage.removeItem(this.options.tokenKey);
      this.storage.removeItem(this.options.tokenInfoKey);
      
      this.logger.debug('Token cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear token', { error });
      throw new Error(`Failed to clear token: ${error.message}`);
    }
  }
}

/**
 * Simple implementation of TokenStorage that doesn't use encryption
 * @extends TokenStorage
 */
export class SimpleTokenStorage extends TokenStorage {
  /**
   * Create a SimpleTokenStorage
   * @param {Object} [options] - Storage options
   * @param {Object} [logger] - Logger instance
   */
  constructor(options = {}, logger) {
    super();
    
    this.options = {
      tokenKey: 'auth_token',
      tokenInfoKey: 'auth_token_info',
      storageType: 'localStorage',
      ...options
    };
    
    this.logger = logger || console;
    
    // Get the storage object
    this.storage = this.options.storageType === 'sessionStorage' 
      ? sessionStorage 
      : localStorage;
  }
  
  /**
   * Save a token and its information
   * @param {string} token - The token to save
   * @param {import('./models.js').TokenInfo} tokenInfo - The token information
   * @returns {Promise<void>}
   */
  async saveToken(token, tokenInfo) {
    try {
      this.logger.debug('Saving token', { 
        tokenType: tokenInfo.tokenType,
        expiresAt: tokenInfo.expiresAt,
        hasRefreshToken: !!tokenInfo.refreshToken
      });
      
      // Store the token
      this.storage.setItem(this.options.tokenKey, token);
      
      // Store token info
      const tokenInfoToStore = {
        ...tokenInfo,
        // Convert Date to ISO string for storage
        expiresAt: tokenInfo.expiresAt instanceof Date 
          ? tokenInfo.expiresAt.toISOString() 
          : tokenInfo.expiresAt
      };
      
      // Remove the actual tokens from the stored info for security
      delete tokenInfoToStore.accessToken;
      delete tokenInfoToStore.refreshToken;
      
      this.storage.setItem(
        this.options.tokenInfoKey, 
        JSON.stringify(tokenInfoToStore)
      );
      
      this.logger.debug('Token saved successfully');
    } catch (error) {
      this.logger.error('Failed to save token', { error });
      throw new Error(`Failed to save token: ${error.message}`);
    }
  }
  
  /**
   * Get the stored token
   * @returns {Promise<string|null>} The token, or null if not found
   */
  async getToken() {
    try {
      const storedToken = this.storage.getItem(this.options.tokenKey);
      
      if (!storedToken) {
        this.logger.debug('No token found in storage');
        return null;
      }
      
      this.logger.debug('Token retrieved successfully');
      return storedToken;
    } catch (error) {
      this.logger.error('Failed to get token', { error });
      return null;
    }
  }
  
  /**
   * Get the stored token information
   * @returns {Promise<import('./models.js').TokenInfo|null>} The token information, or null if not found
   */
  async getTokenInfo() {
    try {
      const storedTokenInfo = this.storage.getItem(this.options.tokenInfoKey);
      
      if (!storedTokenInfo) {
        this.logger.debug('No token info found in storage');
        return null;
      }
      
      const tokenInfo = JSON.parse(storedTokenInfo);
      
      // Convert ISO string back to Date
      if (tokenInfo.expiresAt) {
        tokenInfo.expiresAt = new Date(tokenInfo.expiresAt);
      }
      
      this.logger.debug('Token info retrieved successfully', {
        tokenType: tokenInfo.tokenType,
        expiresAt: tokenInfo.expiresAt
      });
      
      return tokenInfo;
    } catch (error) {
      this.logger.error('Failed to get token info', { error });
      return null;
    }
  }
  
  /**
   * Clear the stored token
   * @returns {Promise<void>}
   */
  async clearToken() {
    try {
      this.logger.debug('Clearing token from storage');
      
      this.storage.removeItem(this.options.tokenKey);
      this.storage.removeItem(this.options.tokenInfoKey);
      
      this.logger.debug('Token cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear token', { error });
      throw new Error(`Failed to clear token: ${error.message}`);
    }
  }
}

/**
 * Create a SecureTokenStorage with the given options
 * @param {Object} encryptionService - Service for encrypting/decrypting data
 * @param {SecureTokenStorageOptions} [options] - Storage options
 * @param {Object} [logger] - Logger instance
 * @returns {SecureTokenStorage} The token storage
 */
export function createSecureTokenStorage(encryptionService, options, logger) {
  return new SecureTokenStorage(encryptionService, options, logger);
}

/**
 * Create a SimpleTokenStorage with the given options
 * @param {Object} [options] - Storage options
 * @param {Object} [logger] - Logger instance
 * @returns {SimpleTokenStorage} The token storage
 */
export function createSimpleTokenStorage(options, logger) {
  return new SimpleTokenStorage(options, logger);
}