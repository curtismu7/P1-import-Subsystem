/**
 * @fileoverview Version Service - Centralized version management for the application
 * Handles version fetching, caching, and formatting across the application
 * @version 7.0.0.21
 */

import { APP_VERSION, getFormattedVersion, getVersionInfo } from '../../version.js';

/**
 * Default fallback version if API request fails
 * @type {string}
 */
const DEFAULT_VERSION = APP_VERSION || '7.0.0.21';

/**
 * Cache for version information to avoid repeated API calls
 * @type {Object}
 */
let versionCache = null;
let versionFetchPromise = null;

/**
 * VersionService class for centralized version management
 */
export class VersionService {
  /**
   * Get the application version
   * @async
   * @param {boolean} [forceRefresh=false] - Force refresh from API even if cached
   * @returns {Promise<string>} - The application version
   */
  static async getVersion(forceRefresh = false) {
    // Return cached version if available and not forcing refresh
    if (versionCache && !forceRefresh) {
      return versionCache.version;
    }
    
    // If already fetching, return the existing promise
    if (versionFetchPromise) {
      return versionFetchPromise;
    }
    
    // Create a new fetch promise
    versionFetchPromise = this._fetchVersionFromApi()
      .then(version => {
        versionCache = { 
          version,
          timestamp: Date.now() 
        };
        versionFetchPromise = null;
        return version;
      })
      .catch(error => {
        console.warn('Could not fetch version from API:', error);
        versionFetchPromise = null;
        return DEFAULT_VERSION;
      });
    
    return versionFetchPromise;
  }
  
  /**
   * Get formatted version string with prefix (e.g., "v7.0.0.21")
   * @async
   * @returns {Promise<string>} - Formatted version string
   */
  static async getFormattedVersion() {
    const version = await this.getVersion();
    return `v${version}`;
  }
  
  /**
   * Get detailed version information including build date and environment
   * @async
   * @returns {Promise<Object>} - Version information object
   */
  static async getVersionInfo() {
    const version = await this.getVersion();
    return {
      version,
      formattedVersion: `v${version}`,
      buildDate: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };
  }
  
  /**
   * Fetch version from API
   * @private
   * @async
   * @returns {Promise<string>} - Version string
   */
  static async _fetchVersionFromApi() {
    try {
      const response = await fetch('/api/version');
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      const data = await response.json();
      return data.version || DEFAULT_VERSION;
    } catch (error) {
      console.warn('Error fetching version:', error);
      return DEFAULT_VERSION;
    }
  }
  
  /**
   * Clear the version cache
   */
  static clearCache() {
    versionCache = null;
  }
}

export default VersionService;
