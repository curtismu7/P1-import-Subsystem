/**
 * Token Management Subsystem - Token Provider
 * 
 * This module defines the TokenProvider interface and implementations.
 * TokenProviders are responsible for acquiring tokens from authentication sources.
 */

import { TokenError, convertTokenResponse } from './models.js';

/**
 * Interface for token providers
 * @interface
 */
export class TokenProvider {
  /**
   * Acquire a token from the authentication source
   * @param {Object} [credentials] - Optional credentials for authentication
   * @returns {Promise<import('./models.js').TokenResponse>} The token response
   * @throws {TokenError} If token acquisition fails
   */
  async acquireToken(credentials) {
    throw new Error('TokenProvider.acquireToken() must be implemented by subclass');
  }
}

/**
 * Options for PingOneTokenProvider
 * @typedef {Object} PingOneTokenProviderOptions
 * @property {string} clientId - PingOne client ID
 * @property {string} clientSecret - PingOne client secret
 * @property {string} environmentId - PingOne environment ID
 * @property {string} region - PingOne region
 * @property {string} [grantType='client_credentials'] - OAuth grant type
 * @property {string} [tokenEndpoint='/as/token'] - Token endpoint path
 */

/**
 * PingOne implementation of TokenProvider
 * @extends TokenProvider
 */
export class PingOneTokenProvider extends TokenProvider {
  /**
   * Create a PingOneTokenProvider
   * @param {Object} apiClient - API client for making requests
   * @param {PingOneTokenProviderOptions} options - Provider options
   * @param {Object} logger - Logger instance
   */
  constructor(apiClient, options, logger) {
    super();
    
    if (!apiClient) {
      throw new Error('API client is required for PingOneTokenProvider');
    }
    
    if (!options || !options.clientId || !options.clientSecret || !options.environmentId || !options.region) {
      throw new Error('Required options missing for PingOneTokenProvider');
    }
    
    this.apiClient = apiClient;
    this.options = {
      grantType: 'client_credentials',
      tokenEndpoint: '/as/token',
      ...options
    };
    this.logger = logger || console;
  }
  
  /**
   * Acquire a token from PingOne
   * @param {Object} [credentials] - Optional credentials for authentication
   * @returns {Promise<import('./models.js').TokenResponse>} The token response
   * @throws {TokenError} If token acquisition fails
   */
  async acquireToken(credentials) {
    try {
      this.logger.debug('Acquiring token from PingOne', { 
        clientId: this.options.clientId,
        environmentId: this.options.environmentId,
        region: this.options.region,
        grantType: this.options.grantType
      });
      
      // Prepare request body based on grant type
      const body = new URLSearchParams();
      body.append('grant_type', this.options.grantType);
      body.append('client_id', this.options.clientId);
      body.append('client_secret', this.options.clientSecret);
      
      // Add additional parameters based on grant type
      if (this.options.grantType === 'refresh_token' && credentials?.refreshToken) {
        body.append('refresh_token', credentials.refreshToken);
      } else if (this.options.grantType === 'password' && credentials) {
        if (credentials.username) body.append('username', credentials.username);
        if (credentials.password) body.append('password', credentials.password);
      }
      
      // Determine the base URL based on region
      const baseUrl = this.getBaseUrl();
      const url = `${baseUrl}${this.options.tokenEndpoint}`;
      
      // Make the request
      const response = await this.apiClient.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
      
      // Handle error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: 'unknown_error',
          error_description: `HTTP error ${response.status}`
        }));
        
        throw new TokenError(
          errorData.error || 'token_acquisition_failed',
          errorData.error_description || 'Failed to acquire token',
          response.status
        );
      }
      
      // Parse the response
      const tokenResponse = await response.json();
      
      this.logger.info('Token acquired successfully', { 
        tokenType: tokenResponse.token_type,
        expiresIn: tokenResponse.expires_in,
        hasRefreshToken: !!tokenResponse.refresh_token
      });
      
      return tokenResponse;
    } catch (error) {
      // Convert regular errors to TokenError
      if (!(error instanceof TokenError)) {
        this.logger.error('Token acquisition failed', { error });
        throw new TokenError(
          'token_acquisition_failed',
          `Failed to acquire token: ${error.message}`,
          error.status
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Get the base URL for PingOne API based on region
   * @returns {string} The base URL
   * @private
   */
  getBaseUrl() {
    const region = this.options.region.toLowerCase();
    
    // Map of regions to base URLs
    const regionMap = {
      'na': 'https://auth.pingone.com',
      'eu': 'https://auth.pingone.eu',
      'ap': 'https://auth.pingone.asia',
      'ca': 'https://auth.pingone.ca'
    };
    
    return regionMap[region] || regionMap.na;
  }
}

/**
 * Create a PingOneTokenProvider with the given options
 * @param {Object} apiClient - API client for making requests
 * @param {PingOneTokenProviderOptions} options - Provider options
 * @param {Object} logger - Logger instance
 * @returns {PingOneTokenProvider} The token provider
 */
export function createPingOneTokenProvider(apiClient, options, logger) {
  return new PingOneTokenProvider(apiClient, options, logger);
}