import { Buffer } from 'buffer';

/**
 * PingOne Authentication Module
 * 
 * Provides a robust, reusable authentication service for PingOne API.
 * Implements token management, automatic refresh, and error handling.
 */
class PingOneAuth {
  /**
   * Create a new PingOneAuth instance
   * @param {Object} config - Configuration object
   * @param {string} config.environmentId - PingOne Environment ID
   * @param {string} config.clientId - PingOne Client ID
   * @param {string} config.clientSecret - PingOne Client Secret
   * @param {string} [config.region='NorthAmerica'] - PingOne region
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.autoRefresh=true] - Whether to automatically refresh tokens
   * @param {number} [options.refreshThreshold=300] - Seconds before expiry to refresh token
   */
  constructor({
    environmentId,
    clientId,
    clientSecret,
    region = 'NorthAmerica',
  }, {
    autoRefresh = true,
    refreshThreshold = 300, // 5 minutes
  } = {}) {
    if (!environmentId || !clientId || !clientSecret) {
      throw new Error('Missing required configuration: environmentId, clientId, and clientSecret are required');
    }

    this.environmentId = environmentId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.region = region;
    this.autoRefresh = autoRefresh;
    this.refreshThreshold = refreshThreshold;
    
    this.tokenData = null;
    this.tokenExpiry = null;
    this.refreshTimeout = null;

    // Bind methods
    this.getToken = this.getToken.bind(this);
    this.clearToken = this.clearToken.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
  }

  /**
   * Get the base URL for the PingOne API based on region
   * @private
   */
  getBaseUrl() {
    const domainMap = {
      'NorthAmerica': 'auth.pingone.com',
      'Europe': 'auth.eu.pingone.com',
      'Canada': 'auth.ca.pingone.com',
      'Asia': 'auth.apsoutheast.pingone.com',
      'Australia': 'auth.aus.pingone.com',
      'US': 'auth.pingone.com',
      'EU': 'auth.eu.pingone.com',
      'AP': 'auth.apsoutheast.pingone.com'
    };

    const domain = domainMap[this.region] || 'auth.pingone.com';
    return `https://${domain}/${this.environmentId}/as`;
  }

  /**
   * Create Basic Auth header
   * @private
   */
  createAuthHeader() {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Schedule token refresh
   * @private
   */
  scheduleRefresh(expiresIn) {
    if (!this.autoRefresh || !expiresIn || expiresIn <= 0) return;

    // Clear any existing timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }

    // Calculate refresh time (refreshThreshold seconds before expiry)
    const refreshIn = Math.max(1000, (expiresIn - this.refreshThreshold) * 1000);
    
    this.refreshTimeout = setTimeout(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // Schedule retry with exponential backoff
        this.scheduleRefresh(Math.min(expiresIn, 60)); // Retry in 1 minute or remaining time
      }
    }, refreshIn);
  }

  /**
   * Get an access token
   * @returns {Promise<string>} Access token
   */
  async getToken() {
    // Return existing token if valid
    if (this.tokenData && this.tokenExpiry > Date.now() / 1000) {
      return this.tokenData.access_token;
    }

    // Otherwise, get a new token
    return this.refreshToken();
  }

  /**
   * Refresh the access token
   * @returns {Promise<string>} New access token
   */
  async refreshToken() {
    try {
      const tokenUrl = `${this.getBaseUrl()}/token`;
      const authHeader = this.createAuthHeader();

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': authHeader,
          'Accept': 'application/json',
          'User-Agent': 'PingOne-Import-Tool/1.0',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to get token: ${response.status} ${response.statusText}` +
          (errorData.error ? ` - ${JSON.stringify(errorData)}` : '')
        );
      }

      const tokenData = await response.json();
      
      // Store token data
      this.tokenData = tokenData;
      this.tokenExpiry = Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600);
      
      // Schedule refresh if needed
      if (this.autoRefresh) {
        this.scheduleRefresh(tokenData.expires_in || 3600);
      }

      return tokenData.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.clearToken();
      throw error;
    }
  }

  /**
   * Clear the current token and any scheduled refreshes
   */
  clearToken() {
    this.tokenData = null;
    this.tokenExpiry = null;
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  /**
   * Make an authenticated request to the PingOne API
   * @param {string} method - HTTP method
   * @param {string} path - API path (e.g., '/populations')
   * @param {Object} [options] - Fetch options
   * @returns {Promise<Object>} Response data
   */
  async apiRequest(method, path, options = {}) {
    const token = await this.getToken();
    
    const apiUrl = `https://api.pingone.com/v1/environments/${this.environmentId}${path}`;
    
    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'PingOne-Import-Tool/1.0',
        ...(options.headers || {})
      },
      ...options
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}` +
        (errorData.error ? ` - ${JSON.stringify(errorData)}` : '')
      );
    }

    // For 204 No Content responses, return null
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }
}

export default PingOneAuth;
