/**
 * @file Manages the operation history for the application.
 */

class HistorySubsystem {
    /**
     * @param {Logger} logger A logger instance.
     * @param {LocalApiClient} localClient An API client for making requests.
     * @param {UIManager} uiManager The UI manager for updating the view.
     * @param {EventBus} eventBus For listening to application-wide events.
     */
    constructor(logger, localClient, uiManager, eventBus) {
        if (!logger || !localClient || !uiManager || !eventBus) {
            throw new Error('HistorySubsystem: logger, localClient, uiManager, and eventBus are required.');
        }

        this.logger = logger.child({ subsystem: 'HistorySubsystem' });
        this.localClient = localClient;
        this.uiManager = uiManager;
        this.eventBus = eventBus;
        this.history = [];

        this.logger.info('HistorySubsystem initialized.');
    }

    /**
     * Initializes the subsystem.
     */
    async init() {
        this.logger.info('Initializing...');
        this.eventBus.on('operation-completed', () => this.fetchHistory(true));
        await this.fetchHistory();
        this.logger.info('Successfully initialized.');
    }

    /**
     * Fetches operation history from the server.
     * @param {boolean} forceRefresh Whether to force a refresh.
     * @returns {Promise<Array>}
     */
    async fetchHistory(forceRefresh = false) {
        if (this.history.length > 0 && !forceRefresh) {
            return this.history;
        }

        this.logger.info('Fetching operation history...');
        try {
            const data = await this.localClient.get('/history');
            this.history = data.history || [];
            this.logger.info(`Successfully fetched ${this.history.length} history records.`);
            this.renderHistory();
            return this.history;
        } catch (error) {
            this.logger.error('Failed to fetch history:', error);
            this.uiManager.showError('Could not load operation history.');
            return [];
        }
    }

    /**
     * Renders the history data into the UI.
     */
    renderHistory() {
        this.logger.debug('Rendering history view...');
        const historyView = document.getElementById('history-view');
        if (!historyView) {
            this.logger.warn('History view element not found.');
            return;
        }

        // This is a placeholder for the actual rendering logic.
        // A more robust implementation would use the UIManager to create and update elements.
        historyView.innerHTML = `<pre>${JSON.stringify(this.history, null, 2)}</pre>`;
        this.logger.debug('History view rendered.');
    }
}

export default HistorySubsystem;
