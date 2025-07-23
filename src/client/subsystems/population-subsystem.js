/**
 * @file Manages fetching and caching of PingOne populations.
 * This subsystem is responsible for populating UI elements like dropdowns
 * with the available user populations from the PingOne environment.
 */

class PopulationSubsystem {
    /**
     * @param {Logger} logger A logger instance.
     * @param {LocalApiClient} localClient An API client for making requests.
     * @param {EventBus} eventBus For listening to events like credential updates.
     */
    constructor(logger, localClient, eventBus) {
        if (!logger || !localClient || !eventBus) {
            throw new Error('PopulationSubsystem: logger, localClient, and eventBus are required.');
        }

        this.logger = logger.child({ subsystem: 'PopulationSubsystem' });
        this.localClient = localClient;
        this.eventBus = eventBus;
        this.populations = [];
        this.isInitialized = false;

        this.logger.info('PopulationSubsystem initialized.');
    }

    /**
     * Initializes the subsystem, fetches initial population data if possible.
     */
    async init() {
        this.logger.info('Initializing...');
        // Listen for events that might trigger a population refresh
        this.eventBus.on('credentials-updated', () => this.fetchPopulations(true));
        await this.fetchPopulations();
        this.isInitialized = true;
        this.logger.info('Successfully initialized.');
    }

    /**
     * Fetches populations from the server.
     * @param {boolean} forceRefresh Whether to force a refresh even if data exists.
     * @returns {Promise<Array>}
     */
    async fetchPopulations(forceRefresh = false) {
        if (this.populations.length > 0 && !forceRefresh) {
            this.logger.debug('Returning cached populations.');
            return this.populations;
        }

        this.logger.info('Fetching populations from the server...');
        try {
            const data = await this.localClient.get('/pingone/populations');
            this.populations = data.populations || [];
            this.logger.info(`Successfully fetched ${this.populations.length} populations.`);
            this.eventBus.emit('populations-updated', this.populations);
            return this.populations;
        } catch (error) {
            this.logger.error('Failed to fetch populations:', error);
            this.populations = []; // Clear cache on error
            this.eventBus.emit('populations-updated:error', error);
            return [];
        }
    }

    /**
     * Gets the currently cached populations.
     * @returns {Array}
     */
    getPopulations() {
        return this.populations;
    }

    /**
     * Gets a population by its ID.
     * @param {string} populationId The ID of the population.
     * @returns {object|undefined}
     */
    getPopulationById(populationId) {
        return this.populations.find(p => p.id === populationId);
    }
}

export default PopulationSubsystem;
