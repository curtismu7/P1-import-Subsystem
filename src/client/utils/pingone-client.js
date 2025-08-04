
/**
 * @file A client for making requests to the PingOne API via the local server proxy.
 */

import { getTldForRegion } from './pingone-tld.js';

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
    /**
     * Tests the connection to the PingOne API, normalizing region value.
     * @param {Object} settings - Settings object containing region and credentials.
     * @returns {Promise<object>} The connection test result.
     */
    async testConnection(settings) {
        this.logger.debug('Testing PingOne API connection...');
        try {
            // Normalize region and get TLD
            const region = settings.region || 'NA';
            const tld = getTldForRegion(region);
            // Example endpoint construction
            const apiPath = '/v1/environments/{environmentId}/users';
            const apiUrl = `https://api.pingone.${tld}${apiPath}`;
            // Add constructed URLs to payload for template usage
            const payload = { ...settings, region, tld, apiUrl };
            const result = await this.localClient.post('/pingone/test-connection', payload);
            this.logger.info('Connection test completed.');
            return result;
        } catch (error) {
            this.logger.error('Connection test failed.', error);
            throw error;
        }
    }

    /**
     * Constructs PingOne API endpoints using region and TLD
     * @param {string} region
     * @returns {object} All service URLs
     */
    static getPingOneEndpoints(region) {
        const tld = getTldForRegion(region);
        return {
            api: `https://api.pingone.${tld}/v1`,
            auth: `https://auth.pingone.${tld}/v1`,
            orchestrate: `https://orchestrate-api.pingone.${tld}/v1`,
            scim: `https://scim-api.pingone.${tld}/v1`,
            tld
        };
    }
}

export default PingOneClient;
