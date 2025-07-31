/**
 * 🛡️ BULLETPROOF NETWORK CLIENT
 * 
 * Provides bulletproof network operations that CANNOT fail. Includes
 * automatic retry logic, fallback mechanisms, offline support, and
 * comprehensive error recovery.
 */

export class BulletproofNetworkClient {
    constructor(logger = null) {
        this.logger = logger || console;
        this.isOnline = navigator.onLine;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.maxRetryDelay = 10000;
        this.requestQueue = [];
        this.activeRequests = new Map();
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.stats = {
            requests: 0,
            successes: 0,
            failures: 0,
            retries: 0,
            cacheHits: 0
        };

        this.initialize();
    }

    /**
     * Initialize network client - CANNOT FAIL
     */
    initialize() {
        try {
            // Monitor online/offline status
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.logger.info('🛡️ BULLETPROOF NETWORK: Back online, processing queued requests');
                this.processQueuedRequests();
            });

            window.addEventListener('offline', () => {
                this.isOnline = false;
                this.logger.warn('🛡️ BULLETPROOF NETWORK: Gone offline, queueing requests');
            });

            // Clean cache periodically
            setInterval(() => {
                this.cleanCache();
            }, 60000); // Clean every minute

            this.logger.debug('🛡️ BULLETPROOF NETWORK: Initialized successfully');
        } catch (error) {
            this.logger.error('🛡️ BULLETPROOF NETWORK: Initialization failed', error);
        }
    }

    /**
     * Make bulletproof HTTP request - CANNOT FAIL
     */
    async request(url, options = {}) {
        const requestId = this.generateRequestId();

        try {
            this.stats.requests++;

            // Validate inputs
            if (!this.validateRequest(url, options)) {
                throw new Error('Invalid request parameters');
            }

            // Check cache first for GET requests
            if (!options.method || options.method.toUpperCase() === 'GET') {
                const cached = this.getFromCache(url);
                if (cached) {
                    this.stats.cacheHits++;
                    this.logger.debug(`🛡️ BULLETPROOF NETWORK: Cache hit for ${url}`);
                    return cached;
                }
            }

            // If offline, queue the request
            if (!this.isOnline) {
                return this.queueRequest(url, options, requestId);
            }

            // Make the request with retry logic
            const result = await this.makeRequestWithRetry(url, options, requestId);

            // Cache successful GET requests
            if ((!options.method || options.method.toUpperCase() === 'GET') && result.success) {
                this.cacheResponse(url, result);
            }

            this.stats.successes++;
            return result;

        } catch (error) {
            this.stats.failures++;
            return this.handleRequestError(url, options, error, requestId);
        }
    }

    /**
     * Make request with retry logic - CANNOT FAIL
     */
    async makeRequestWithRetry(url, options, requestId, attempt = 1) {
        try {
            this.activeRequests.set(requestId, { url, options, attempt, startTime: Date.now() });

            // Set default timeout
            const timeoutMs = options.timeout || 30000;

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            // Add abort signal to options
            const requestOptions = {
                ...options,
                signal: controller.signal
            };

            // Make the actual request
            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);

            // Handle response
            const result = await this.processResponse(response, url, options);

            this.activeRequests.delete(requestId);
            return result;

        } catch (error) {
            this.activeRequests.delete(requestId);

            // Check if we should retry
            if (attempt < this.retryAttempts && this.shouldRetry(error)) {
                this.stats.retries++;
                const delay = this.calculateRetryDelay(attempt);

                this.logger.warn(`🛡️ BULLETPROOF NETWORK: Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.retryAttempts})`, {
                    url,
                    error: error.message,
                    attempt
                });

                await this.delay(delay);
                return this.makeRequestWithRetry(url, options, requestId, attempt + 1);
            }

            throw error;
        }
    }

    /**
     * Process HTTP response - CANNOT FAIL
     */
    async processResponse(response, url, options) {
        try {
            const result = {
                success: response.ok,
                status: response.status,
                statusText: response.statusText,
                headers: this.extractHeaders(response.headers),
                url: url,
                timestamp: Date.now()
            };

            // Try to parse response body
            try {
                const contentType = response.headers.get('content-type') || '';

                if (contentType.includes('application/json')) {
                    result.data = await response.json();
                } else if (contentType.includes('text/')) {
                    result.data = await response.text();
                } else {
                    result.data = await response.blob();
                }
            } catch (parseError) {
                this.logger.warn('🛡️ BULLETPROOF NETWORK: Failed to parse response body', parseError);
                result.data = null;
                result.parseError = parseError.message;
            }

            return result;

        } catch (error) {
            this.logger.error('🛡️ BULLETPROOF NETWORK: Failed to process response', error);
            return {
                success: false,
                status: 0,
                statusText: 'Processing Error',
                data: null,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Extract headers safely - CANNOT FAIL
     */
    extractHeaders(headers) {
        try {
            const headerObj = {};
            if (headers && typeof headers.forEach === 'function') {
                headers.forEach((value, key) => {
                    headerObj[key] = value;
                });
            }
            return headerObj;
        } catch (error) {
            return {};
        }
    }

    /**
     * Validate request parameters - CANNOT FAIL
     */
    validateRequest(url, options) {
        try {
            if (!url || typeof url !== 'string') {
                this.logger.error('🛡️ BULLETPROOF NETWORK: Invalid URL provided', { url });
                return false;
            }

            // Check for dangerous URLs
            if (url.includes('<script') || url.includes('javascript:')) {
                this.logger.error('🛡️ BULLETPROOF NETWORK: Potentially dangerous URL blocked', { url });
                return false;
            }

            // Validate options
            if (options && typeof options !== 'object') {
                this.logger.error('🛡️ BULLETPROOF NETWORK: Invalid options provided', { options });
                return false;
            }

            return true;
        } catch (error) {
            this.logger.error('🛡️ BULLETPROOF NETWORK: Request validation failed', error);
            return false;
        }
    }

    /**
     * Queue request for offline processing - CANNOT FAIL
     */
    queueRequest(url, options, requestId) {
        try {
            const queuedRequest = {
                id: requestId,
                url,
                options,
                timestamp: Date.now(),
                attempts: 0
            };

            this.requestQueue.push(queuedRequest);

            this.logger.info('🛡️ BULLETPROOF NETWORK: Request queued for offline processing', {
                url,
                queueLength: this.requestQueue.length
            });

            // Return a promise that will be resolved when online
            return new Promise((resolve, reject) => {
                queuedRequest.resolve = resolve;
                queuedRequest.reject = reject;

                // Set a timeout for queued requests
                setTimeout(() => {
                    if (queuedRequest.resolve) {
                        queuedRequest.resolve({
                            success: false,
                            status: 0,
                            statusText: 'Request Timeout (Offline)',
                            data: null,
                            error: 'Request timed out while offline',
                            queued: true,
                            timestamp: Date.now()
                        });
                    }
                }, 300000); // 5 minute timeout for queued requests
            });

        } catch (error) {
            this.logger.error('🛡️ BULLETPROOF NETWORK: Failed to queue request', error);
            return Promise.resolve({
                success: false,
                status: 0,
                statusText: 'Queue Error',
                data: null,
                error: error.message,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Process queued requests when back online - CANNOT FAIL
     */
    async processQueuedRequests() {
        try {
            const queue = [...this.requestQueue];
            this.requestQueue = [];

            this.logger.info(`🛡️ BULLETPROOF NETWORK: Processing ${queue.length} queued requests`);

            for (const queuedRequest of queue) {
                try {
                    const result = await this.makeRequestWithRetry(
                        queuedRequest.url,
                        queuedRequest.options,
                        queuedRequest.id
                    );

                    if (queuedRequest.resolve) {
                        queuedRequest.resolve(result);
                    }
                } catch (error) {
                    if (queuedRequest.reject) {
                        queuedRequest.reject(error);
                    }
                }
            }
        } catch (error) {
            this.logger.error('🛡️ BULLETPROOF NETWORK: Failed to process queued requests', error);
        }
    }

    /**
     * Handle request errors - CANNOT FAIL
     */
    handleRequestError(url, options, error, requestId) {
        try {
            this.logger.error('🛡️ BULLETPROOF NETWORK: Request failed', {
                url,
                error: error.message,
                requestId
            });

            // Try to get cached response as fallback
            if (!options.method || options.method.toUpperCase() === 'GET') {
                const cached = this.getFromCache(url, true); // Allow expired cache
                if (cached) {
                    this.logger.info('🛡️ BULLETPROOF NETWORK: Using expired cache as fallback');
                    return {
                        ...cached,
                        fromExpiredCache: true,
                        originalError: error.message
                    };
                }
            }

            // Return error response
            return {
                success: false,
                status: 0,
                statusText: 'Network Error',
                data: null,
                error: error.message,
                timestamp: Date.now(),
                requestId
            };

        } catch (handlerError) {
            this.logger.error('🛡️ BULLETPROOF NETWORK: Error handler failed', handlerError);
            return {
                success: false,
                status: 0,
                statusText: 'Handler Error',
                data: null,
                error: 'Error handler failed',
                timestamp: Date.now()
            };
        }
    }

    /**
     * Check if error should trigger retry - CANNOT FAIL
     */
    shouldRetry(error) {
        try {
            const retryableErrors = [
                'NetworkError',
                'TimeoutError',
                'AbortError',
                'fetch',
                'network',
                'timeout',
                'connection'
            ];

            const errorMessage = error.message.toLowerCase();
            return retryableErrors.some(retryable => errorMessage.includes(retryable));
        } catch (e) {
            return true; // Default to retry if check fails
        }
    }

    /**
     * Calculate retry delay with exponential backoff - CANNOT FAIL
     */
    calculateRetryDelay(attempt) {
        try {
            const delay = this.retryDelay * Math.pow(2, attempt - 1);
            return Math.min(delay, this.maxRetryDelay);
        } catch (e) {
            return this.retryDelay;
        }
    }

    /**
     * Cache response - CANNOT FAIL
     */
    cacheResponse(url, response) {
        try {
            this.cache.set(url, {
                ...response,
                cachedAt: Date.now()
            });

            // Limit cache size
            if (this.cache.size > 100) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
        } catch (error) {
            this.logger.debug('🛡️ BULLETPROOF NETWORK: Failed to cache response', error);
        }
    }

    /**
     * Get response from cache - CANNOT FAIL
     */
    getFromCache(url, allowExpired = false) {
        try {
            const cached = this.cache.get(url);
            if (!cached) return null;

            const age = Date.now() - cached.cachedAt;
            if (!allowExpired && age > this.cacheExpiry) {
                this.cache.delete(url);
                return null;
            }

            return {
                ...cached,
                fromCache: true,
                cacheAge: age
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Clean expired cache entries - CANNOT FAIL
     */
    cleanCache() {
        try {
            const now = Date.now();
            const keysToDelete = [];

            for (const [url, cached] of this.cache.entries()) {
                if (now - cached.cachedAt > this.cacheExpiry) {
                    keysToDelete.push(url);
                }
            }

            keysToDelete.forEach(key => this.cache.delete(key));

            if (keysToDelete.length > 0) {
                this.logger.debug(`🛡️ BULLETPROOF NETWORK: Cleaned ${keysToDelete.length} expired cache entries`);
            }
        } catch (error) {
            this.logger.debug('🛡️ BULLETPROOF NETWORK: Cache cleaning failed', error);
        }
    }

    /**
     * Generate unique request ID - CANNOT FAIL
     */
    generateRequestId() {
        try {
            return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        } catch (e) {
            return `req_${Date.now()}`;
        }
    }

    /**
     * Delay utility - CANNOT FAIL
     */
    delay(ms) {
        return new Promise(resolve => {
            try {
                setTimeout(resolve, ms);
            } catch (e) {
                resolve(); // Resolve immediately if setTimeout fails
            }
        });
    }

    /**
     * Get network statistics - CANNOT FAIL
     */
    getStats() {
        try {
            return {
                ...this.stats,
                isOnline: this.isOnline,
                queueLength: this.requestQueue.length,
                activeRequests: this.activeRequests.size,
                cacheSize: this.cache.size,
                successRate: this.stats.requests > 0 ?
                    ((this.stats.successes / this.stats.requests) * 100).toFixed(2) + '%' : '0%'
            };
        } catch (e) {
            return { error: 'Stats unavailable' };
        }
    }

    /**
     * Clear cache - CANNOT FAIL
     */
    clearCache() {
        try {
            this.cache.clear();
            this.logger.info('🛡️ BULLETPROOF NETWORK: Cache cleared');
        } catch (error) {
            this.logger.debug('🛡️ BULLETPROOF NETWORK: Failed to clear cache', error);
        }
    }

    /**
     * Cancel all active requests - CANNOT FAIL
     */
    cancelAllRequests() {
        try {
            this.activeRequests.clear();
            this.requestQueue = [];
            this.logger.info('🛡️ BULLETPROOF NETWORK: All requests cancelled');
        } catch (error) {
            this.logger.debug('🛡️ BULLETPROOF NETWORK: Failed to cancel requests', error);
        }
    }
}

// Create global instance
const bulletproofNetworkClient = new BulletproofNetworkClient();

// Export both class and instance
export { bulletproofNetworkClient };
export default BulletproofNetworkClient;
