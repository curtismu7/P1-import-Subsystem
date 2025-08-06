/**
 * Optimized API Client with Caching and Retry Logic
 * 
 * Provides enhanced API communication with:
 * - Request/response caching
 * - Connection pooling
 * - Retry logic with exponential backoff
 * - Request deduplication
 * - Rate limiting compliance
 */

import fetch from 'node-fetch';
import { Agent } from 'https';

/**
 * Rate Limiter Class
 * Implements token bucket algorithm for rate limiting
 */
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // Check if we can make a request
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.acquire(); // Retry after waiting
      }
    }
    
    // Add current request
    this.requests.push(now);
  }

  release() {
    // Token bucket implementation doesn't need explicit release
  }
}

/**
 * Request Cache Class
 * Implements LRU cache with TTL support
 */
class RequestCache {
  constructor(maxSize = 1000, defaultTTL = 300000) { // 5 minutes default
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  generateKey(method, url, options = {}) {
    const keyData = {
      method: method.toUpperCase(),
      url,
      headers: options.headers || {},
      body: options.body
    };
    return JSON.stringify(keyData);
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.data;
  }

  set(key, data, ttl = this.defaultTTL) {
    // Remove oldest entries if at max size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

/**
 * Request Deduplicator Class
 * Prevents duplicate concurrent requests
 */
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  async deduplicate(key, requestFn) {
    // If request is already pending, wait for it
    if (this.pendingRequests.has(key)) {
      return await this.pendingRequests.get(key);
    }
    
    // Create new request promise
    const requestPromise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });
    
    this.pendingRequests.set(key, requestPromise);
    return await requestPromise;
  }
}

/**
 * Optimized API Client Class
 */
export class OptimizedAPIClient {
  constructor(config = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      maxRetryDelay: config.maxRetryDelay || 10000,
      rateLimit: config.rateLimit || 100,
      rateLimitWindow: config.rateLimitWindow || 60000,
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 300000,
      cacheSize: config.cacheSize || 1000,
      deduplicationEnabled: config.deduplicationEnabled !== false,
      ...config
    };

    // Initialize components
    this.rateLimiter = new RateLimiter(this.config.rateLimit, this.config.rateLimitWindow);
    this.cache = new RequestCache(this.config.cacheSize, this.config.cacheTTL);
    this.deduplicator = new RequestDeduplicator();
    
    // Connection pooling agent
    this.agent = new Agent({
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: this.config.timeout,
      freeSocketTimeout: 30000
    });

    // Statistics
    this.stats = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      retries: 0,
      errors: 0,
      deduplicatedRequests: 0
    };
  }

  /**
   * Make HTTP request with all optimizations
   */
  async request(method, endpoint, options = {}) {
    const url = this.buildURL(endpoint);
    const requestOptions = this.buildRequestOptions(method, options);
    
    // Generate cache key
    const cacheKey = this.cache.generateKey(method, url, requestOptions);
    
    // Check cache first (for GET requests)
    if (method.toUpperCase() === 'GET' && this.config.cacheEnabled && options.cache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
      this.stats.cacheMisses++;
    }

    // Deduplicate concurrent requests
    if (this.config.deduplicationEnabled && method.toUpperCase() === 'GET') {
      return await this.deduplicator.deduplicate(cacheKey, () => 
        this.executeRequest(method, url, requestOptions, cacheKey, options)
      );
    }

    return await this.executeRequest(method, url, requestOptions, cacheKey, options);
  }

  /**
   * Execute the actual HTTP request with retry logic
   */
  async executeRequest(method, url, requestOptions, cacheKey, options) {
    let lastError;
    let delay = this.config.retryDelay;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        // Rate limiting
        await this.rateLimiter.acquire();
        
        // Make request
        this.stats.requests++;
        const response = await this.makeRequest(url, requestOptions);
        
        // Parse response
        const result = await this.parseResponse(response);
        
        // Cache successful GET responses
        if (method.toUpperCase() === 'GET' && 
            this.config.cacheEnabled && 
            options.cache !== false && 
            response.ok) {
          const ttl = options.cacheTTL || this.config.cacheTTL;
          this.cache.set(cacheKey, result, ttl);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        this.stats.errors++;
        
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === this.config.retries) {
          break;
        }
        
        // Wait before retry with exponential backoff
        this.stats.retries++;
        await this.sleep(delay);
        delay = Math.min(delay * 2, this.config.maxRetryDelay);
        
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.config.retries})`, {
          url,
          error: error.message,
          status: error.status
        });
      }
    }
    
    throw lastError;
  }

  /**
   * Make the actual HTTP request
   */
  async makeRequest(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        agent: this.agent,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${this.config.timeout}ms`);
        timeoutError.status = 408;
        throw timeoutError;
      }
      
      throw error;
    }
  }

  /**
   * Parse response based on content type
   */
  async parseResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } else {
          errorMessage = await response.text() || errorMessage;
        }
      } catch (parseError) {
        // Use default error message if parsing fails
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.response = response;
      throw error;
    }
    
    // Parse successful response
    if (contentType.includes('application/json')) {
      return await response.json();
    } else if (contentType.includes('text/')) {
      return await response.text();
    } else {
      return await response.buffer();
    }
  }

  /**
   * Build full URL
   */
  buildURL(endpoint) {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    
    const baseURL = this.config.baseURL.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseURL}${path}`;
  }

  /**
   * Build request options
   */
  buildRequestOptions(method, options) {
    const requestOptions = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OptimizedAPIClient/1.0',
        ...this.config.headers,
        ...options.headers
      }
    };

    if (options.body) {
      if (typeof options.body === 'object' && !Buffer.isBuffer(options.body)) {
        requestOptions.body = JSON.stringify(options.body);
      } else {
        requestOptions.body = options.body;
      }
    }

    return requestOptions;
  }

  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convenience methods
   */
  async get(endpoint, options = {}) {
    return this.request('GET', endpoint, options);
  }

  async post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, { ...options, body: data });
  }

  async put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, { ...options, body: data });
  }

  async delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, options);
  }

  async patch(endpoint, data, options = {}) {
    return this.request('PATCH', endpoint, { ...options, body: data });
  }

  /**
   * Cache management
   */
  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size(),
      hits: this.stats.cacheHits,
      misses: this.stats.cacheMisses,
      hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0
    };
  }

  /**
   * Get client statistics
   */
  getStats() {
    return {
      ...this.stats,
      cache: this.getCacheStats(),
      pendingRequests: this.deduplicator.pendingRequests.size
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      retries: 0,
      errors: 0,
      deduplicatedRequests: 0
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.agent.destroy();
    this.cache.clear();
    this.deduplicator.pendingRequests.clear();
  }
}

/**
 * Create PingOne API client with optimized settings
 */
export function createPingOneAPIClient(config = {}) {
  return new OptimizedAPIClient({
    baseURL: config.baseURL || 'https://api.pingone.com',
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    maxRetryDelay: 10000,
    rateLimit: 90, // PingOne rate limit
    rateLimitWindow: 60000,
    cacheEnabled: true,
    cacheTTL: 300000, // 5 minutes
    headers: {
      'Authorization': config.token ? `Bearer ${config.token}` : undefined,
      'Content-Type': 'application/json'
    },
    ...config
  });
}

export default OptimizedAPIClient;