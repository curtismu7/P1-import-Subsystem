/**
 * Token Management Subsystem - Models
 * 
 * This module defines the data models used throughout the Token Management Subsystem.
 */

/**
 * Enum representing the possible states of a token
 * @enum {string}
 */
export const TokenStatus = {
  VALID: 'valid',
  EXPIRING_SOON: 'expiring_soon',
  EXPIRED: 'expired',
  REFRESHING: 'refreshing',
  ERROR: 'error',
  NONE: 'none'
};

/**
 * Class representing a token error
 */
export class TokenError extends Error {
  /**
   * Create a token error
   * @param {string} code - Error code
   * @param {string} message - Error message
   * @param {number} [status] - HTTP status code if applicable
   */
  constructor(code, message, status) {
    super(message);
    this.name = 'TokenError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Interface for token information
 * @typedef {Object} TokenInfo
 * @property {string} accessToken - The access token
 * @property {string} [refreshToken] - The refresh token (if available)
 * @property {string} tokenType - The token type (e.g., "Bearer")
 * @property {number} expiresIn - Token lifetime in seconds
 * @property {Date} expiresAt - Date when the token expires
 * @property {string} [scope] - Token scope (if available)
 * @property {string} [idToken] - ID token (if available)
 */

/**
 * Interface for token response from authentication server
 * @typedef {Object} TokenResponse
 * @property {string} access_token - The access token
 * @property {string} [refresh_token] - The refresh token (if available)
 * @property {string} token_type - The token type (e.g., "Bearer")
 * @property {number} expires_in - Token lifetime in seconds
 * @property {string} [scope] - Token scope (if available)
 * @property {string} [id_token] - ID token (if available)
 */

/**
 * Convert a TokenResponse to TokenInfo
 * @param {TokenResponse} response - The token response from the server
 * @returns {TokenInfo} The token information
 */
export function convertTokenResponse(response) {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    tokenType: response.token_type,
    expiresIn: response.expires_in,
    expiresAt: new Date(Date.now() + response.expires_in * 1000),
    scope: response.scope,
    idToken: response.id_token
  };
}

/**
 * Check if a token is expired
 * @param {TokenInfo} tokenInfo - The token information
 * @param {number} [bufferSeconds=0] - Buffer time in seconds
 * @returns {boolean} True if the token is expired
 */
export function isTokenExpired(tokenInfo, bufferSeconds = 0) {
  if (!tokenInfo || !tokenInfo.expiresAt) {
    return true;
  }
  
  const now = new Date();
  const expiresAt = new Date(tokenInfo.expiresAt);
  
  // Add buffer time
  expiresAt.setSeconds(expiresAt.getSeconds() - bufferSeconds);
  
  return now >= expiresAt;
}

/**
 * Check if a token is expiring soon
 * @param {TokenInfo} tokenInfo - The token information
 * @param {number} thresholdSeconds - Threshold in seconds
 * @returns {boolean} True if the token is expiring soon
 */
export function isTokenExpiringSoon(tokenInfo, thresholdSeconds) {
  if (!tokenInfo || !tokenInfo.expiresAt) {
    return false;
  }
  
  const now = new Date();
  const expiresAt = new Date(tokenInfo.expiresAt);
  const thresholdDate = new Date(now);
  
  thresholdDate.setSeconds(thresholdDate.getSeconds() + thresholdSeconds);
  
  return now < expiresAt && thresholdDate >= expiresAt;
}

/**
 * Get the remaining time for a token in seconds
 * @param {TokenInfo} tokenInfo - The token information
 * @returns {number} Remaining time in seconds, or 0 if expired
 */
export function getTokenRemainingTime(tokenInfo) {
  if (!tokenInfo || !tokenInfo.expiresAt) {
    return 0;
  }
  
  const now = Date.now();
  const expiresAt = new Date(tokenInfo.expiresAt).getTime();
  const remainingMs = expiresAt - now;
  
  return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * Format remaining time for display
 * @param {number} seconds - Remaining time in seconds
 * @returns {string} Formatted time string (e.g., "5m 30s")
 */
export function formatRemainingTime(seconds) {
  if (seconds <= 0) {
    return 'Expired';
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  return `${remainingSeconds}s`;
}