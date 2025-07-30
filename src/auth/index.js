import PingOneAuth from './pingone-auth.js';

// Singleton instance
let authInstance = null;

/**
 * Initialize the authentication module
 * @param {Object} config - Configuration object
 * @param {string} config.environmentId - PingOne Environment ID
 * @param {string} config.clientId - PingOne Client ID
 * @param {string} config.clientSecret - PingOne Client Secret
 * @param {string} [config.region='NorthAmerica'] - PingOne region
 * @param {Object} [options] - Additional options
 * @returns {PingOneAuth} Initialized auth instance
 */
export function initAuth(config, options) {
  if (!authInstance) {
    authInstance = new PingOneAuth(config, options);
  }
  return authInstance;
}

/**
 * Get the current auth instance
 * @returns {PingOneAuth} Current auth instance
 * @throws {Error} If auth is not initialized
 */
export function getAuth() {
  if (!authInstance) {
    throw new Error('Auth module not initialized. Call initAuth() first.');
  }
  return authInstance;
}

/**
 * Clear the current auth instance
 */
export function clearAuth() {
  if (authInstance) {
    authInstance.clearToken();
    authInstance = null;
  }
}

export { PingOneAuth };
