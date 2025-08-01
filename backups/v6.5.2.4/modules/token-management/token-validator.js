/**
 * Token Management Subsystem - Token Validator
 * 
 * This module defines the TokenValidator interface and implementations.
 * TokenValidators are responsible for validating tokens and checking their expiration status.
 */

import { isTokenExpired, isTokenExpiringSoon } from './models.js';

/**
 * Interface for token validators
 * @interface
 */
export class TokenValidator {
  /**
   * Validate a token
   * @param {string} token - The token to validate
   * @returns {Promise<boolean>} True if the token is valid
   */
  async validateToken(token) {
    throw new Error('TokenValidator.validateToken() must be implemented by subclass');
  }
  
  /**
   * Check if a token is expired
   * @param {string} token - The token to check
   * @param {number} [bufferSeconds=0] - Buffer time in seconds
   * @returns {boolean} True if the token is expired
   */
  isTokenExpired(token, bufferSeconds = 0) {
    throw new Error('TokenValidator.isTokenExpired() must be implemented by subclass');
  }
  
  /**
   * Check if a token is expiring soon
   * @param {string} token - The token to check
   * @param {number} thresholdSeconds - Threshold in seconds
   * @returns {boolean} True if the token is expiring soon
   */
  isTokenExpiringSoon(token, thresholdSeconds) {
    throw new Error('TokenValidator.isTokenExpiringSoon() must be implemented by subclass');
  }
  
  /**
   * Get the expiration date of a token
   * @param {string} token - The token to check
   * @returns {Date|null} The expiration date, or null if not available
   */
  getTokenExpiration(token) {
    throw new Error('TokenValidator.getTokenExpiration() must be implemented by subclass');
  }
  
  /**
   * Get the claims from a token
   * @param {string} token - The token to parse
   * @returns {Object|null} The token claims, or null if parsing fails
   */
  getTokenClaims(token) {
    throw new Error('TokenValidator.getTokenClaims() must be implemented by subclass');
  }
}

/**
 * Options for JWTTokenValidator
 * @typedef {Object} JWTTokenValidatorOptions
 * @property {string} [issuer] - Expected token issuer
 * @property {string|string[]} [audience] - Expected token audience
 * @property {number} [clockTolerance=0] - Clock tolerance in seconds
 */

/**
 * JWT implementation of TokenValidator
 * @extends TokenValidator
 */
export class JWTTokenValidator extends TokenValidator {
  /**
   * Create a JWTTokenValidator
   * @param {JWTTokenValidatorOptions} [options] - Validator options
   * @param {Object} [logger] - Logger instance
   */
  constructor(options = {}, logger) {
    super();
    
    this.options = {
      clockTolerance: 0,
      ...options
    };
    
    this.logger = logger || console;
  }
  
  /**
   * Validate a JWT token
   * @param {string} token - The token to validate
   * @returns {Promise<boolean>} True if the token is valid
   */
  async validateToken(token) {
    try {
      if (!token) {
        this.logger.debug('Token validation failed: Token is empty');
        return false;
      }
      
      // Parse the token
      const claims = this.getTokenClaims(token);
      if (!claims) {
        this.logger.debug('Token validation failed: Could not parse token');
        return false;
      }
      
      // Check expiration
      if (this.isTokenExpired(token, -this.options.clockTolerance)) {
        this.logger.debug('Token validation failed: Token is expired');
        return false;
      }
      
      // Check issuer if specified
      if (this.options.issuer && claims.iss !== this.options.issuer) {
        this.logger.debug('Token validation failed: Invalid issuer', {
          expected: this.options.issuer,
          actual: claims.iss
        });
        return false;
      }
      
      // Check audience if specified
      if (this.options.audience) {
        const audiences = Array.isArray(this.options.audience) 
          ? this.options.audience 
          : [this.options.audience];
        
        const tokenAudience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
        
        const hasValidAudience = audiences.some(audience => 
          tokenAudience.includes(audience)
        );
        
        if (!hasValidAudience) {
          this.logger.debug('Token validation failed: Invalid audience', {
            expected: audiences,
            actual: tokenAudience
          });
          return false;
        }
      }
      
      this.logger.debug('Token validation successful');
      return true;
    } catch (error) {
      this.logger.error('Token validation error', { error });
      return false;
    }
  }
  
  /**
   * Check if a JWT token is expired
   * @param {string} token - The token to check
   * @param {number} [bufferSeconds=0] - Buffer time in seconds
   * @returns {boolean} True if the token is expired
   */
  isTokenExpired(token, bufferSeconds = 0) {
    try {
      const claims = this.getTokenClaims(token);
      if (!claims || !claims.exp) {
        return true;
      }
      
      const now = Math.floor(Date.now() / 1000);
      return claims.exp - bufferSeconds <= now;
    } catch (error) {
      this.logger.error('Error checking token expiration', { error });
      return true;
    }
  }
  
  /**
   * Check if a JWT token is expiring soon
   * @param {string} token - The token to check
   * @param {number} thresholdSeconds - Threshold in seconds
   * @returns {boolean} True if the token is expiring soon
   */
  isTokenExpiringSoon(token, thresholdSeconds) {
    try {
      const claims = this.getTokenClaims(token);
      if (!claims || !claims.exp) {
        return false;
      }
      
      const now = Math.floor(Date.now() / 1000);
      return !this.isTokenExpired(token) && claims.exp - now <= thresholdSeconds;
    } catch (error) {
      this.logger.error('Error checking if token is expiring soon', { error });
      return false;
    }
  }
  
  /**
   * Get the expiration date of a JWT token
   * @param {string} token - The token to check
   * @returns {Date|null} The expiration date, or null if not available
   */
  getTokenExpiration(token) {
    try {
      const claims = this.getTokenClaims(token);
      if (!claims || !claims.exp) {
        return null;
      }
      
      return new Date(claims.exp * 1000);
    } catch (error) {
      this.logger.error('Error getting token expiration', { error });
      return null;
    }
  }
  
  /**
   * Get the claims from a JWT token
   * @param {string} token - The token to parse
   * @returns {Object|null} The token claims, or null if parsing fails
   */
  getTokenClaims(token) {
    try {
      if (!token) {
        return null;
      }
      
      // Split the token into parts
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      // Decode the payload (second part)
      const payload = parts[1];
      const decoded = this.base64UrlDecode(payload);
      
      return JSON.parse(decoded);
    } catch (error) {
      this.logger.error('Error parsing token claims', { error });
      return null;
    }
  }
  
  /**
   * Decode a base64url encoded string
   * @param {string} input - The base64url encoded string
   * @returns {string} The decoded string
   * @private
   */
  base64UrlDecode(input) {
    // Replace non-url compatible chars with base64 standard chars
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode the base64 string
    const decoded = atob(base64);
    
    // Convert to UTF-8 string
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    
    return new TextDecoder().decode(bytes);
  }
}

/**
 * Create a JWTTokenValidator with the given options
 * @param {JWTTokenValidatorOptions} [options] - Validator options
 * @param {Object} [logger] - Logger instance
 * @returns {JWTTokenValidator} The token validator
 */
export function createJWTTokenValidator(options, logger) {
  return new JWTTokenValidator(options, logger);
}