/**
 * @file A client for making requests to the PingOne API via the local server proxy.
 */

class PingOneClient {
    /**
     * @param {LocalApiClient} localClient An instance of the local API client.
     * @param {Logger} logger A logger instance.
     */
    constructor(localClient, logger) {
        if (!localClient || !logger) {
            throw new Error('PingOneClient: localClient and logger are required.');
        }
        this.localClient = localClient;
        this.logger = logger.child({ client: 'PingOneClient' });
        this.logger.info('PingOneClient initialized.');
    }

    /**
     * Fetches an access token from the server.
     * @returns {Promise<object>} The token data.
     */
    async getAccessToken() {
        this.logger.debug('Requesting new access token...');
        try {
            const tokenData = await this.localClient.get('/pingone/get-token');
            this.logger.info('Successfully retrieved access token.');
            return tokenData;
        } catch (error) {
            this.logger.error('Failed to get access token.', error);
            throw error;
        }
    }

    /**
     * Tests the connection to the PingOne API.
     * @returns {Promise<object>} The connection test result.
     */
    async testConnection() {
        this.logger.debug('Testing PingOne API connection...');
        try {
            const result = await this.localClient.get('/pingone/test-connection');
            this.logger.info('Connection test completed.');
            return result;
        } catch (error) {
            this.logger.error('Connection test failed.', error);
            throw error;
        }
    }
}

export default PingOneClient;
