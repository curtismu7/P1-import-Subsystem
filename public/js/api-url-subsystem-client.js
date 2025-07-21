/**
 * API URL Subsystem Client
 * 
 * Client-side initialization for the API URL subsystem.
 * This script creates a simplified version of the subsystem for client-side use.
 */

(function() {
    console.log('🔗 API URL Subsystem: Initializing client-side implementation');
    
    // Simple event bus implementation
    const eventBus = {
        events: {},
        subscribe: function(event, callback) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(callback);
        },
        publish: function(event, data) {
            if (!this.events[event]) return;
            this.events[event].forEach(callback => callback(data));
        }
    };
    
    // Simple logger implementation
    const logger = {
        debug: (message, ...args) => console.log(`🔗 API URL Subsystem: ${message}`, ...args),
        info: (message, ...args) => console.log(`🔗 API URL Subsystem: ${message}`, ...args),
        warn: (message, ...args) => console.warn(`🔗 API URL Subsystem: ${message}`, ...args),
        error: (message, ...args) => console.error(`🔗 API URL Subsystem: ${message}`, ...args)
    };
    
    // Configuration
    const config = {
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
        populationNameDisplayClass: 'population-name-display',
        animationEnabled: true,
        copyToClipboardEnabled: true,
        // Track if listeners are already set up to prevent duplicates
        listenersInitialized: false,
        // Track the last check time to prevent too frequent checks
        lastCheckTime: 0,
        // Minimum time between checks in milliseconds
        checkInterval: 1000
    };
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);
    
    // Also try to initialize immediately if DOM is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 100);
    }
    
    /**
     * Initialize the API URL subsystem
     */
    function init() {
        logger.info('Initializing');
        
        try {
            // Set up event listeners
            setupEventListeners();
            
            // Set up population select listeners
            setupPopulationSelectListeners();
            
            // Set up copy to clipboard functionality
            if (config.copyToClipboardEnabled) {
                setupCopyToClipboardFeature();
            }
            
            // Set up periodic check for population selects
            // This helps when the DOM is updated dynamically
            setInterval(() => {
                // Only check if enough time has passed since the last check
                const now = Date.now();
                if (now - config.lastCheckTime >= config.checkInterval) {
                    config.lastCheckTime = now;
                    setupPopulationSelectListeners();
                }
            }, 5000);
            
            logger.info('Initialized successfully');
            
            // Publish initialization event
            eventBus.publish('apiUrlSubsystem:initialized', {
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to initialize', error);
        }
    }
    
    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Only set up event listeners once
        if (config.listenersInitialized) {
            return;
        }
        
        // Listen for navigation events
        document.querySelectorAll('[data-view]').forEach(element => {
            element.addEventListener('click', () => {
                const view = element.getAttribute('data-view');
                logger.debug(`Navigation to ${view} detected`);
                setTimeout(() => {
                    config.lastCheckTime = Date.now();
                    setupPopulationSelectListeners();
                }, 500);
            });
        });
        
        logger.debug('Event listeners set up');
        config.listenersInitialized = true;
    }
    
    /**
     * Set up population select listeners
     */
    function setupPopulationSelectListeners() {
        config.dropdownIds.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            
            // Check if this select already has our event listener
            if (select.getAttribute('data-api-url-listener') === 'true') {
                return;
            }
            
            // Add new event listener
            select.addEventListener('change', handlePopulationChange);
            
            // Mark this select as having our listener
            select.setAttribute('data-api-url-listener', 'true');
            
            // Initial update if a population is already selected
            if (select.value) {
                handlePopulationChange({ target: select });
            }
            
            logger.debug(`Added listener to ${id}`);
        });
    }
    
    /**
     * Handle population change event
     * 
     * @param {Event} event - Change event from population select
     */
    function handlePopulationChange(event) {
        const select = event.target;
        const populationId = select.value;
        const populationName = select.options[select.selectedIndex]?.text || 'Unknown';
        const displayId = config.displayIds[select.id];
        
        logger.debug(`Population changed: ${select.id} -> ${populationId} (${populationName})`);
        
        // Update API URL display
        updateApiUrlDisplay(displayId, populationId, select.id);
        
        // Find the closest population name display
        let populationNameDisplay;
        const apiUrlDisplay = document.getElementById(displayId);
        if (apiUrlDisplay) {
            // Look for population name display as a sibling or child of parent
            const parent = apiUrlDisplay.parentNode;
            populationNameDisplay = parent.querySelector(`.${config.populationNameDisplayClass}`);
            
            // If not found, look for it in the next sibling
            if (!populationNameDisplay && parent.nextElementSibling) {
                populationNameDisplay = parent.nextElementSibling.querySelector(`.${config.populationNameDisplayClass}`);
            }
        }
        
        // Update population name display if found
        if (populationNameDisplay) {
            updatePopulationNameDisplay(populationNameDisplay, populationName, populationId);
        }
        
        // Publish event
        eventBus.publish('apiUrl:updated', {
            selectId: select.id,
            populationId,
            populationName,
            displayId,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Update API URL display
     * 
     * @param {string} displayId - ID of the API URL display element
     * @param {string} populationId - ID of the selected population
     * @param {string} selectId - ID of the select element that triggered the update
     */
    function updateApiUrlDisplay(displayId, populationId, selectId) {
        const apiUrlDisplay = document.getElementById(displayId);
        if (!apiUrlDisplay) return;
        
        if (populationId) {
            // Get API URL for the selected population
            const apiUrl = getApiUrlForPopulation(populationId, selectId);
            
            // Update the API URL display with improved styling and copy button
            apiUrlDisplay.innerHTML = `
                <div class="api-url-section">
                    <span class="api-url-label">API Endpoint:</span>
                    <div class="api-url-content">
                        <div class="api-url-text">${apiUrl}</div>
                        ${config.copyToClipboardEnabled ? 
                            `<button class="copy-api-url-btn" title="Copy to clipboard">
                                <i class="fas fa-copy"></i>
                            </button>` : ''}
                    </div>
                </div>
            `;
            apiUrlDisplay.classList.add('has-url');
            apiUrlDisplay.classList.remove('no-url');
            
            // Add copy to clipboard functionality
            if (config.copyToClipboardEnabled) {
                addCopyToClipboardButton(apiUrlDisplay, apiUrl);
            }
            
            // Animate update
            if (config.animationEnabled) {
                animateUpdate(apiUrlDisplay);
            }
            
            logger.debug(`Updated API URL display ${displayId}: ${apiUrl}`);
        } else {
            apiUrlDisplay.innerHTML = `
                <div class="api-url-section">
                    <span class="api-url-label">API Endpoint:</span>
                    <div class="api-url-text">Select a population to see the API URL</div>
                </div>
            `;
            apiUrlDisplay.classList.add('no-url');
            apiUrlDisplay.classList.remove('has-url');
            
            logger.debug(`Reset API URL display ${displayId}`);
        }
    }
    
    /**
     * Update population name display
     * 
     * @param {HTMLElement} display - Population name display element
     * @param {string} populationName - Name of the selected population
     * @param {string} populationId - ID of the selected population
     */
    function updatePopulationNameDisplay(display, populationName, populationId) {
        if (populationId) {
            display.innerHTML = `
                <span class="population-name-text">Population: </span>
                <span class="population-name-value">${populationName}</span>
            `;
            
            // Animate update
            if (config.animationEnabled) {
                animateUpdate(display);
            }
            
            logger.debug(`Updated population name display: ${populationName}`);
        } else {
            display.innerHTML = `
                <span class="population-name-text">Population: </span>
                <span class="population-name-value">Select a population</span>
            `;
            logger.debug('Reset population name display');
        }
    }
    
    /**
     * Get API URL for a population
     * 
     * @param {string} populationId - ID of the population
     * @param {string} selectId - ID of the select element
     * @returns {string} API URL for the population
     */
    function getApiUrlForPopulation(populationId, selectId) {
        // Special case for export with ALL option
        if (selectId === 'export-population-select' && populationId === 'ALL') {
            return '/api/export/users';
        }
        
        // Standard case for population-specific endpoints
        return `/api/populations/${populationId}/users`;
    }
    
    /**
     * Set up copy to clipboard feature
     */
    function setupCopyToClipboardFeature() {
        // Add event delegation for copy buttons
        document.addEventListener('click', (event) => {
            if (event.target.closest('.copy-api-url-btn')) {
                const button = event.target.closest('.copy-api-url-btn');
                const apiUrlText = button.closest('.api-url-content').querySelector('.api-url-text').textContent;
                copyToClipboard(apiUrlText, button);
            }
        });
        
        // Add copy button styles if not already added
        if (!document.getElementById('api-url-copy-styles')) {
            const style = document.createElement('style');
            style.id = 'api-url-copy-styles';
            style.textContent = `
                .api-url-content {
                    display: flex;
                    align-items: center;
                }
                
                .copy-api-url-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.25rem 0.5rem;
                    margin-left: 0.5rem;
                    color: #6c757d;
                    transition: color 0.3s;
                }
                
                .copy-api-url-btn:hover {
                    color: #0056b3;
                }
                
                .copy-api-url-btn.copied {
                    color: #28a745;
                }
                
                .copy-api-url-btn.copy-error {
                    color: #dc3545;
                }
            `;
            document.head.appendChild(style);
        }
        
        logger.debug('Copy to clipboard feature set up');
    }
    
    /**
     * Add copy to clipboard button functionality
     * 
     * @param {HTMLElement} container - Container element
     * @param {string} text - Text to copy
     */
    function addCopyToClipboardButton(container, text) {
        const button = container.querySelector('.copy-api-url-btn');
        if (!button) return;
        
        button.addEventListener('click', (event) => {
            event.preventDefault();
            copyToClipboard(text, button);
        });
    }
    
    /**
     * Copy text to clipboard
     * 
     * @param {string} text - Text to copy
     * @param {HTMLElement} button - Button element that triggered the copy
     */
    function copyToClipboard(text, button) {
        navigator.clipboard.writeText(text)
            .then(() => {
                // Show success feedback
                const originalHTML = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i>';
                button.classList.add('copied');
                
                // Reset button after 2 seconds
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.classList.remove('copied');
                }, 2000);
                
                logger.debug('Copied to clipboard:', text);
                
                // Publish event
                eventBus.publish('apiUrl:copied', {
                    text,
                    timestamp: new Date().toISOString()
                });
            })
            .catch(error => {
                logger.error('Failed to copy to clipboard', error);
                
                // Show error feedback
                const originalHTML = button.innerHTML;
                button.innerHTML = '<i class="fas fa-times"></i>';
                button.classList.add('copy-error');
                
                // Reset button after 2 seconds
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.classList.remove('copy-error');
                }, 2000);
            });
    }
    
    /**
     * Animate element update
     * 
     * @param {HTMLElement} element - Element to animate
     */
    function animateUpdate(element) {
        // Remove existing animation classes
        element.classList.remove('api-url-updated', 'population-name-updated');
        
        // Force reflow to restart animation
        void element.offsetWidth;
        
        // Add animation class based on element type
        if (element.classList.contains('api-url-display')) {
            element.classList.add('api-url-updated');
        } else if (element.classList.contains('population-name-display')) {
            element.classList.add('population-name-updated');
        }
    }
    
    // Expose public API
    window.apiUrlSubsystem = {
        updateAllApiUrls: setupPopulationSelectListeners,
        getApiUrlForPopulation: getApiUrlForPopulation
    };
})();