/**
 * API URL Subsystem
 * 
 * Manages the display and updating of API URLs across the application.
 * Provides a consistent interface for showing API endpoints based on selected populations.
 */

class ApiUrlSubsystem {
    /**
     * Create a new ApiUrlSubsystem
     * 
     * @param {Object} logger - Logger instance for logging messages
     * @param {Object} eventBus - EventBus instance for publishing/subscribing to events
     * @param {Object} settingsSubsystem - SettingsSubsystem instance for accessing settings
     */
    constructor(logger, eventBus, settingsSubsystem) {
        this.logger = logger || console;
        this.eventBus = eventBus;
        this.settingsSubsystem = settingsSubsystem;
        this.initialized = false;
        
        // Configuration
        this.config = {
            dropdownIds: [
                'import-population-select',
                'export-population-select',
                'delete-population-select',
                'modify-population-select'
            ],
            displayIds: {
                'import-population-select': 'population-api-url',
                'export-population-select': 'export-population-api-url',
                'delete-population-select': 'delete-population-api-url',
                'modify-population-select': 'modify-population-api-url'
            },
            populationNameDisplayClass: 'population-name-display'
        };
        
        // Bind methods to preserve 'this' context
        this.init = this.init.bind(this);
        this.setupEventListeners = this.setupEventListeners.bind(this);
        this.setupPopulationSelectListeners = this.setupPopulationSelectListeners.bind(this);
        this.handlePopulationChange = this.handlePopulationChange.bind(this);
        this.updateApiUrlDisplay = this.updateApiUrlDisplay.bind(this);
        this.updatePopulationNameDisplay = this.updatePopulationNameDisplay.bind(this);
        this.getApiUrlForPopulation = this.getApiUrlForPopulation.bind(this);
    }
    
    /**
     * Initialize the API URL subsystem
     * 
     * @returns {Promise<void>}
     */
    async init() {
        if (this.initialized) {
            this.logger.warn('API URL Subsystem already initialized');
            return;
        }
        
        this.logger.info('Initializing API URL Subsystem');
        
        try {
            // Set up event listeners
            this.setupEventListeners();
            
            // Set up population select listeners
            this.setupPopulationSelectListeners();
            
            // Set up periodic check for population selects
            // This helps when the DOM is updated dynamically
            setInterval(this.setupPopulationSelectListeners, 2000);
            
            this.initialized = true;
            this.logger.info('API URL Subsystem initialized successfully');
            
            // Publish initialization event
            if (this.eventBus) {
                this.eventBus.publish('apiUrlSubsystem:initialized', {
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            this.logger.error('Failed to initialize API URL Subsystem', error);
            throw error;
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (!this.eventBus) {
            this.logger.warn('Event bus not available, skipping event listener setup');
            return;
        }
        
        // Listen for view changes
        this.eventBus.subscribe('view:changed', (data) => {
            this.logger.debug('View changed, updating API URL displays', data);
            setTimeout(this.setupPopulationSelectListeners, 500);
        });
        
        // Listen for population data loaded
        this.eventBus.subscribe('populations:loaded', (data) => {
            this.logger.debug('Populations loaded, updating API URL displays', data);
            this.setupPopulationSelectListeners();
        });
        
        this.logger.debug('API URL Subsystem event listeners set up');
    }
    
    /**
     * Set up population select listeners
     */
    setupPopulationSelectListeners() {
        this.config.dropdownIds.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            
            // Remove existing event listener to prevent duplicates
            select.removeEventListener('change', this.handlePopulationChange);
            
            // Add new event listener
            select.addEventListener('change', this.handlePopulationChange);
            
            // Initial update if a population is already selected
            if (select.value) {
                this.handlePopulationChange({ target: select });
            }
        });
    }
    
    /**
     * Handle population change event
     * 
     * @param {Event} event - Change event from population select
     */
    handlePopulationChange(event) {
        const select = event.target;
        const populationId = select.value;
        const populationName = select.options[select.selectedIndex]?.text || 'Unknown';
        const displayId = this.config.displayIds[select.id];
        
        this.logger.debug(`Population changed: ${select.id} -> ${populationId} (${populationName})`);
        
        // Update API URL display
        this.updateApiUrlDisplay(displayId, populationId, select.id);
        
        // Update population name display
        const populationNameDisplay = document.querySelector(`.${this.config.populationNameDisplayClass}`);
        if (populationNameDisplay) {
            this.updatePopulationNameDisplay(populationNameDisplay, populationName, populationId);
        }
        
        // Publish event
        if (this.eventBus) {
            this.eventBus.publish('apiUrl:updated', {
                selectId: select.id,
                populationId,
                populationName,
                displayId,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    /**
     * Update API URL display
     * 
     * @param {string} displayId - ID of the API URL display element
     * @param {string} populationId - ID of the selected population
     * @param {string} selectId - ID of the select element that triggered the update
     */
    updateApiUrlDisplay(displayId, populationId, selectId) {
        const apiUrlDisplay = document.getElementById(displayId);
        if (!apiUrlDisplay) return;
        
        if (populationId) {
            // Get API URL for the selected population
            const apiUrl = this.getApiUrlForPopulation(populationId, selectId);
            
            // Update the API URL display with improved styling
            apiUrlDisplay.innerHTML = `
                <div class="api-url-section">
                    <span class="api-url-label">API Endpoint:</span>
                    <div class="api-url-text">${apiUrl}</div>
                </div>
            `;
            apiUrlDisplay.classList.add('has-url');
            apiUrlDisplay.classList.remove('no-url');
            
            this.logger.debug(`Updated API URL display ${displayId}: ${apiUrl}`);
        } else {
            apiUrlDisplay.innerHTML = `
                <div class="api-url-section">
                    <span class="api-url-label">API Endpoint:</span>
                    <div class="api-url-text">Select a population to see the API URL</div>
                </div>
            `;
            apiUrlDisplay.classList.add('no-url');
            apiUrlDisplay.classList.remove('has-url');
            
            this.logger.debug(`Reset API URL display ${displayId}`);
        }
    }
    
    /**
     * Update population name display
     * 
     * @param {HTMLElement} display - Population name display element
     * @param {string} populationName - Name of the selected population
     * @param {string} populationId - ID of the selected population
     */
    updatePopulationNameDisplay(display, populationName, populationId) {
        if (populationId) {
            display.innerHTML = `
                <span class="population-name-text">Population: </span>
                <span class="population-name-value">${populationName}</span>
            `;
            this.logger.debug(`Updated population name display: ${populationName}`);
        } else {
            display.innerHTML = `
                <span class="population-name-text">Population: </span>
                <span class="population-name-value">Select a population</span>
            `;
            this.logger.debug('Reset population name display');
        }
    }
    
    /**
     * Get API URL for a population
     * 
     * @param {string} populationId - ID of the population
     * @param {string} selectId - ID of the select element
     * @returns {string} API URL for the population
     */
    getApiUrlForPopulation(populationId, selectId) {
        // Special case for export with ALL option
        if (selectId === 'export-population-select' && populationId === 'ALL') {
            return '/api/export/users';
        }
        
        // Standard case for population-specific endpoints
        return `/api/populations/${populationId}/users`;
    }
    
    /**
     * Manually update all API URL displays
     * 
     * @returns {void}
     */
    updateAllApiUrls() {
        this.logger.debug('Manually updating all API URL displays');
        this.setupPopulationSelectListeners();
    }
}

// Export the class
export { ApiUrlSubsystem };