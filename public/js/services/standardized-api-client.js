/**
 * Standardized API Client
 * 
 * Provides consistent frontend-to-backend communication with:
 * - Standardized request/response format
 * - Automatic error handling
 * - Request retry logic
 * - Loading state management
 * - Response caching
 */

import { appState, actions } from '../state/app-state.js';
import csrfManager from '../utils/csrf-utils.js';

/**
 * API Response wrapper for consistent handling
 */
class APIResponse {
  constructor(response, data) {
    this.response = response;
    this.data = data;
    this.success = data.success || false;
    this.message = data.message || '';
    this.error = data.error || null;
    this.meta = data.meta || {};
  }

  isSuccess() {
    return this.success && this.response.ok;
  }

  isError() {
    return !this.success || !this.response.ok;
  }

  getData() {
    return this.data.data || this.data;
  }

  getError() {
    if (this.error) {
      return {
        message: this.error.message || this.error,
        code: this.error.code || 'UNKNOWN_ERROR',
        details: this.error.details || {}
      };
    }
    
    if (!this.response.ok) {
      return {
        message: `HTTP ${this.response.status}: ${this.response.statusText}`,
        code: 'HTTP_ERROR',
        details: { status: this.response.status }
      };
    }

    return null;
  }

  getMeta() {
    return this.meta;
  }
}

/**
 * Request configuration with defaults
 */
class RequestConfig {
  constructor(options = {}) {
    this.method = options.method || 'GET';
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    this.body = options.body;
    this.timeout = options.timeout || 30000; // 30 seconds
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second
    this.cache = options.cache || false;
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes
    this.showLoading = options.showLoading !== false; // Default true
    this.showErrors = options.showErrors !== false; // Default true
    this.validateResponse = options.validateResponse !== false; // Default true
  }
}

/**
 * Standardized API Client
 */
export class StandardizedAPIClient {
  constructor() {
    this.baseURL = '';
    this.cache = new Map();
    this.requestId = 0;
    this.activeRequests = new Map();
    
    // Bind methods
    this.request = this.request.bind(this);
    this.get = this.get.bind(this);
    this.post = this.post.bind(this);
    this.put = this.put.bind(this);
    this.delete = this.delete.bind(this);
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${++this.requestId}_${Date.now()}`;
  }

  /**
   * Create cache key for request
   */
  createCacheKey(url, config) {
    return `${config.method}:${url}:${JSON.stringify(config.body || {})}`;
  }

  /**
   * Check cache for response
   */
  getCachedResponse(cacheKey) {
    if (!this.cache.has(cacheKey)) {
      return null;
    }

    const cached = this.cache.get(cacheKey);
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.response;
  }

  /**
   * Cache response
   */
  setCachedResponse(cacheKey, response, ttl) {
    this.cache.set(cacheKey, {
      response: response,
      timestamp: Date.now(),
      ttl: ttl
    });
  }

  /**
   * Sleep for retry delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate response format
   */
  validateResponseFormat(data) {
    // Check if response follows our standardized format
    if (typeof data === 'object' && data !== null) {
      // Standard format: { success, message, data?, error?, meta? }
      if ('success' in data && 'message' in data) {
        return true;
      }
      
      // Legacy format support
      if ('success' in data && ('data' in data || 'error' in data)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Normalize response to standard format
   */
  normalizeResponse(data, response) {
    // If already in standard format, return as-is
    if (this.validateResponseFormat(data)) {
      return data;
    }

    // Handle PingOne API responses (exception case)
    if (data && typeof data === 'object' && ('_embedded' in data || 'id' in data)) {
      return {
        success: response.ok,
        message: response.ok ? 'PingOne API response' : 'PingOne API error',
        data: data,
        meta: {
          source: 'pingone-api',
          timestamp: new Date().toISOString()
        }
      };
    }

    // Handle plain data responses
    return {
      success: response.ok,
      message: response.ok ? 'Request successful' : 'Request failed',
      data: response.ok ? data : null,
      error: response.ok ? null : { message: 'Unexpected response format', details: data },
      meta: {
        normalized: true,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Main request method
   */
  async request(url, options = {}) {
    const config = new RequestConfig(options);
    const requestId = this.generateRequestId();
    const cacheKey = config.cache ? this.createCacheKey(url, config) : null;

    // Check cache first
    if (cacheKey) {
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        console.log(`Cache hit for ${url}`);
        return cachedResponse;
      }
    }

    // Show loading state
    if (config.showLoading) {
      actions.setLoading(true);
      actions.addActiveRequest(requestId);
    }

    let lastError = null;
    
    for (let attempt = 1; attempt <= config.retries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        // Prepare fetch options
        const fetchOptions = {
          method: config.method,
          headers: config.headers,
          signal: controller.signal,
          credentials: 'include'
        };

        // Add body for non-GET requests
        if (config.body && config.method !== 'GET') {
          if (config.body instanceof FormData) {
            // Remove Content-Type header for FormData (browser sets it)
            delete fetchOptions.headers['Content-Type'];
            fetchOptions.body = config.body;
          } else if (typeof config.body === 'object') {
            fetchOptions.body = JSON.stringify(config.body);
          } else {
            fetchOptions.body = config.body;
          }
        }

        // Make request
        console.log(`API Request [${requestId}] ${config.method} ${url} (attempt ${attempt}/${config.retries})`);
        
        // Route through CSRF manager to ensure token header + cookies are sent
        const response = await csrfManager.fetchWithCSRF(url, fetchOptions);
        clearTimeout(timeoutId);

        // Parse response
        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        // Normalize response format
        const normalizedData = this.normalizeResponse(data, response);
        
        // Create API response wrapper
        const apiResponse = new APIResponse(response, normalizedData);

        // Log response
        console.log(`API Response [${requestId}] ${response.status}`, {
          success: apiResponse.isSuccess(),
          url,
          method: config.method,
          attempt
        });

        // Handle successful response
        if (apiResponse.isSuccess()) {
          // Cache successful response
          if (cacheKey && config.cache) {
            this.setCachedResponse(cacheKey, apiResponse, config.cacheTTL);
          }

          return apiResponse;
        }

        // Handle error response
        const error = apiResponse.getError();
        lastError = new Error(error.message);
        lastError.code = error.code;
        lastError.details = error.details;
        lastError.response = response;
        lastError.data = data;

        // Don't retry for client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          break;
        }

        // Wait before retry (except for last attempt)
        if (attempt < config.retries) {
          const delay = config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Retrying request [${requestId}] in ${delay}ms...`);
          await this.sleep(delay);
        }

      } catch (error) {
        lastError = error;
        
        console.warn(`API Request [${requestId}] failed (attempt ${attempt}/${config.retries}):`, error.message);

        // Don't retry for abort errors (timeout)
        if (error.name === 'AbortError') {
          lastError.message = 'Request timeout';
          lastError.code = 'TIMEOUT';
          break;
        }

        // Wait before retry (except for last attempt)
        if (attempt < config.retries) {
          const delay = config.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    console.error(`API Request [${requestId}] failed after ${config.retries} attempts:`, lastError);

    // Show error to user
    if (config.showErrors) {
      actions.addError(`Request failed: ${lastError.message}`);
    }

    // Create error response
    const errorResponse = new APIResponse(
      { ok: false, status: lastError.response?.status || 0, statusText: lastError.message },
      {
        success: false,
        message: lastError.message,
        error: {
          message: lastError.message,
          code: lastError.code || 'REQUEST_FAILED',
          details: lastError.details || {}
        },
        meta: {
          requestId,
          attempts: config.retries,
          timestamp: new Date().toISOString()
        }
      }
    );

    return errorResponse;

  } finally {
    // Hide loading state
    if (config.showLoading) {
      actions.removeActiveRequest(requestId);
      
      // Hide loading if no more active requests
      const state = appState.getState();
      if (state.activeRequests && state.activeRequests.length === 0) {
        actions.setLoading(false);
      }
    }
  }

  /**
   * GET request
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(url, data, options = {}) {
    return this.request(url, { 
      ...options, 
      method: 'POST', 
      body: data 
    });
  }

  /**
   * PUT request
   */
  async put(url, data, options = {}) {
    return this.request(url, { 
      ...options, 
      method: 'PUT', 
      body: data 
    });
  }

  /**
   * DELETE request
   */
  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile(url, file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional fields
    if (options.fields) {
      Object.entries(options.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return this.post(url, formData, {
      ...options,
      headers: {
        // Don't set Content-Type for FormData
        ...options.headers
      }
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('API cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
export const apiClient = new StandardizedAPIClient();

// Export for use in other modules
export default apiClient;