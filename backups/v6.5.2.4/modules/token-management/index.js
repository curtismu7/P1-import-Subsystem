/**
 * Token Management Subsystem
 * 
 * This module exports all components of the Token Management Subsystem.
 */

// Export models
export * from './models.js';

// Export token provider
export * from './token-provider.js';

// Export token validator
export * from './token-validator.js';

// Export token storage
export * from './token-storage.js';

// Export token service
export * from './token-service.js';

// Export token manager
export * from './token-manager.js';

// Export token status provider
export * from './token-status-provider.js';

// Import all components for convenience
import { TokenStatus, TokenError, convertTokenResponse } from './models.js';
import { TokenProvider, PingOneTokenProvider, createPingOneTokenProvider } from './token-provider.js';
import { TokenValidator, JWTTokenValidator, createJWTTokenValidator } from './token-validator.js';
import { TokenStorage, SecureTokenStorage, SimpleTokenStorage, createSecureTokenStorage, createSimpleTokenStorage } from './token-storage.js';
import { TokenService, createTokenService } from './token-service.js';
import { TokenManager, createTokenManager } from './token-manager.js';
import { TokenStatusProvider, createTokenStatusProvider } from './token-status-provider.js';

/**
 * Create a complete token management system with all components
 * @param {Object} apiClient - API client for making requests
 * @param {Object} encryptionService - Service for encrypting/decrypting data
 * @param {Object} uiManager - UI manager for notifications
 * @param {Object} logger - Logger instance
 * @param {Object} options - Options for all components
 * @returns {Object} The token management system
 */
export function createTokenManagementSystem(apiClient, encryptionService, uiManager, logger, options = {}) {
  // Create token provider
  const tokenProvider = createPingOneTokenProvider(
    apiClient,
    options.provider || {},
    logger
  );
  
  // Create token validator
  const tokenValidator = createJWTTokenValidator(
    options.validator || {},
    logger
  );
  
  // Create token storage
  const tokenStorage = encryptionService
    ? createSecureTokenStorage(encryptionService, options.storage || {}, logger)
    : createSimpleTokenStorage(options.storage || {}, logger);
  
  // Create token service
  const tokenService = createTokenService(
    tokenProvider,
    tokenValidator,
    tokenStorage,
    logger,
    options.service || {}
  );
  
  // Create token status provider if UI manager is available
  let tokenStatusProvider = null;
  if (uiManager) {
    tokenStatusProvider = createTokenStatusProvider(
      tokenService,
      uiManager,
      logger,
      options.statusProvider || {}
    );
  }
  
  // Create token manager
  const tokenManager = createTokenManager(
    tokenService,
    tokenStatusProvider,
    logger,
    options.manager || {}
  );
  
  return {
    tokenProvider,
    tokenValidator,
    tokenStorage,
    tokenService,
    tokenStatusProvider,
    tokenManager
  };
}