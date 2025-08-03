/**
 * A client for making requests to the local application API.
 * It handles prepending the base API path, setting headers,
 * and consistent error handling and logging.
 * 
 * Uses fetch API instead of axios for better compatibility.
 */
class LocalApiClient {
    /**
     * @param {string} baseURL The base URL for the API (e.g., '/api/v1').
     * @param {Logger} logger A logger instance for logging messages.
     */
    constructor(baseURL, logger) {
        if (!baseURL) {
            throw new Error('LocalApiClient: baseURL is required.');
        }
        if (!logger) {
            throw new Error('LocalApiClient: logger is required.');
        }

        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };

        this.logger = logger;
        this.logger.info(`Local API Client initialized for base URL: ${baseURL}`);
    }

    /**
     * Make a fetch request with error handling
     */
    async _makeRequest(url, options = {}) {
        const fullUrl = `${this.baseURL}${url}`;
        
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        try {
            const response = await fetch(fullUrl, config);
            
            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                error.response = {
                    status: response.status,
                    statusText: response.statusText,
                    data: await response.text()
                };
                throw error;
            }

            const data = await response.json();
            return data;
        } catch (error) {
            this.logger.error('API request failed:', {
                message: error.message,
                url: fullUrl,
                method: config.method || 'GET',
                response: error.response || 'No response received'
            });
            throw error;
        }
    }

    /**
     * Makes a GET request.
     * @param {string} url The request URL path.
     * @param {object} [config] Fetch request config.
     * @returns {Promise<any>} The response data.
     */
    async get(url, config = {}) {
        this.logger.debug(`Making GET request to: ${url}`);
        try {
            return await this._makeRequest(url, { method: 'GET', ...config });
        } catch (error) {
            this.logger.error(`GET request to ${url} failed.`);
            throw error;
        }
    }

    /**
     * Makes a POST request.
     * @param {string} url The request URL path.
     * @param {object} [data] The request body data.
     * @param {object} [config] Fetch request config.
     * @returns {Promise<any>} The response data.
     */
    async post(url, data = {}, config = {}) {
        this.logger.debug(`Making POST request to: ${url}`);
        try {
            return await this._makeRequest(url, {
                method: 'POST',
                body: JSON.stringify(data),
                ...config
            });
        } catch (error) {
            this.logger.error(`POST request to ${url} failed.`);
            throw error;
        }
    }

    /**
     * Makes a PUT request.
     * @param {string} url The request URL path.
     * @param {object} [data] The request body data.
     * @param {object} [config] Fetch request config.
     * @returns {Promise<any>} The response data.
     */
    async put(url, data = {}, config = {}) {
        this.logger.debug(`Making PUT request to: ${url}`);
        try {
            return await this._makeRequest(url, {
                method: 'PUT',
                body: JSON.stringify(data),
                ...config
            });
        } catch (error) {
            this.logger.error(`PUT request to ${url} failed.`);
            throw error;
        }
    }

    /**
     * Makes a DELETE request.
     * @param {string} url The request URL path.
     * @param {object} [config] Fetch request config.
     * @returns {Promise<any>} The response data.
     */
    async delete(url, config = {}) {
        this.logger.debug(`Making DELETE request to: ${url}`);
        try {
            return await this._makeRequest(url, { method: 'DELETE', ...config });
        } catch (error) {
            this.logger.error(`DELETE request to ${url} failed.`);
            throw error;
        }
    }
}

export default LocalApiClient;
