import axios from 'axios';

/**
 * A client for making requests to the local application API.
 * It handles prepending the base API path, setting headers,
 * and consistent error handling and logging.
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

        this.client = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        this.logger = logger;
        this.logger.info(`Local API Client initialized for base URL: ${baseURL}`);

        // Add a response interceptor for logging errors
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                this.logger.error('API request failed:', {
                    message: error.message,
                    url: error.config.url,
                    method: error.config.method,
                    response: error.response ? {
                        status: error.response.status,
                        data: error.response.data
                    } : 'No response received'
                });
                return Promise.reject(error);
            }
        );
    }

    /**
     * Makes a GET request.
     * @param {string} url The request URL path.
     * @param {object} [config] Axios request config.
     * @returns {Promise<any>} The response data.
     */
    async get(url, config = {}) {
        this.logger.debug(`Making GET request to: ${url}`);
        try {
            const response = await this.client.get(url, config);
            return response.data;
        } catch (error) {
            this.logger.error(`GET request to ${url} failed.`);
            throw error;
        }
    }

    /**
     * Makes a POST request.
     * @param {string} url The request URL path.
     * @param {object} [data] The request body data.
     * @param {object} [config] Axios request config.
     * @returns {Promise<any>} The response data.
     */
    async post(url, data = {}, config = {}) {
        this.logger.debug(`Making POST request to: ${url}`);
        try {
            const response = await this.client.post(url, data, config);
            return response.data;
        } catch (error) {
            this.logger.error(`POST request to ${url} failed.`);
            throw error;
        }
    }

    /**
     * Makes a PUT request.
     * @param {string} url The request URL path.
     * @param {object} [data] The request body data.
     * @param {object} [config] Axios request config.
     * @returns {Promise<any>} The response data.
     */
    async put(url, data = {}, config = {}) {
        this.logger.debug(`Making PUT request to: ${url}`);
        try {
            const response = await this.client.put(url, data, config);
            return response.data;
        } catch (error) {
            this.logger.error(`PUT request to ${url} failed.`);
            throw error;
        }
    }

    /**
     * Makes a DELETE request.
     * @param {string} url The request URL path.
     * @param {object} [config] Axios request config.
     * @returns {Promise<any>} The response data.
     */
    async delete(url, config = {}) {
        this.logger.debug(`Making DELETE request to: ${url}`);
        try {
            const response = await this.client.delete(url, config);
            return response.data;
        } catch (error) {
            this.logger.error(`DELETE request to ${url} failed.`);
            throw error;
        }
    }
}

export default LocalApiClient;
