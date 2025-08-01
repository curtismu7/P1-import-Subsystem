/**
 * Enhanced API URL Subsystem
 * 
 * An enhanced version of the API URL subsystem with additional features.
 * Extends the base ApiUrlSubsystem with more advanced functionality.
 */

import { ApiUrlSubsystem } from './api-url-subsystem.js';

class EnhancedApiUrlSubsystem extends ApiUrlSubsystem {
    /**
     * Create a new EnhancedApiUrlSubsystem
     * 
     * @param {Object} logger - Logger instance for logging messages
     * @param {Object} eventBus - EventBus instance for publishing/subscribing to events
     * @param {Object} settingsSubsystem - SettingsSubsystem instance for accessing settings
     */
    constructor(logger, eventBus, settingsSubsystem) {
        super(logger, eventBus, settingsSubsystem);
        
        // Additional configuration
        this.config.animationEnabled = true;
        this.config.copyToClipboardEnabled = true;
        this.config.tooltipsEnabled = true;
        
        // Bind additional methods
        this.addCopyToClipboardButton = this.addCopyToClipboardButton.bind(this);
        this.copyToClipboard = this.copyToClipboard.bind(this);
        this.addTooltip = this.addTooltip.bind(this);
        this.animateUpdate = this.animateUpdate.bind(this);
    }
    
    /**
     * Initialize the enhanced API URL subsystem
     * 
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
        
        this.logger.info('Initializing Enhanced API URL Subsystem features');
        
        try {
            // Add enhanced features
            if (this.config.copyToClipboardEnabled) {
                this.setupCopyToClipboardFeature();
            }
            
            if (this.config.tooltipsEnabled) {
                this.setupTooltips();
            }
            
            this.logger.info('Enhanced API URL Subsystem features initialized successfully');
            
            // Publish initialization event
            if (this.eventBus) {
                this.eventBus.publish('enhancedApiUrlSubsystem:initialized', {
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            this.logger.error('Failed to initialize Enhanced API URL Subsystem features', error);
        }
    }
    
    /**
     * Update API URL display with enhanced features
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
            
            // Update the API URL display with improved styling and copy button
            apiUrlDisplay.innerHTML = `
                <div class="api-url-section">
                    <span class="api-url-label">API Endpoint:</span>
                    <div class="api-url-content">
                        <div class="api-url-text">${apiUrl}</div>
                        ${this.config.copyToClipboardEnabled ? 
                            `<button class="copy-api-url-btn" title="Copy to clipboard">
                                <i class="fas fa-copy"></i>
                            </button>` : ''}
                    </div>
                </div>
            `;
            apiUrlDisplay.classList.add('has-url');
            apiUrlDisplay.classList.remove('no-url');
            
            // Add copy to clipboard functionality
            if (this.config.copyToClipboardEnabled) {
                this.addCopyToClipboardButton(apiUrlDisplay, apiUrl);
            }
            
            // Add tooltip
            if (this.config.tooltipsEnabled) {
                this.addTooltip(apiUrlDisplay, 'API endpoint for the selected population');
            }
            
            // Animate update
            if (this.config.animationEnabled) {
                this.animateUpdate(apiUrlDisplay);
            }
            
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
     * Update population name display with enhanced features
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
            
            // Add tooltip
            if (this.config.tooltipsEnabled) {
                this.addTooltip(display, `Population ID: ${populationId}`);
            }
            
            // Animate update
            if (this.config.animationEnabled) {
                this.animateUpdate(display);
            }
            
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
     * Set up copy to clipboard feature
     */
    setupCopyToClipboardFeature() {
        // Add event delegation for copy buttons
        document.addEventListener('click', (event) => {
            if (event.target.closest('.copy-api-url-btn')) {
                const button = event.target.closest('.copy-api-url-btn');
                const apiUrlText = button.closest('.api-url-content').querySelector('.api-url-text').textContent;
                this.copyToClipboard(apiUrlText, button);
            }
        });
        
        this.logger.debug('Copy to clipboard feature set up');
    }
    
    /**
     * Add copy to clipboard button functionality
     * 
     * @param {HTMLElement} container - Container element
     * @param {string} text - Text to copy
     */
    addCopyToClipboardButton(container, text) {
        const button = container.querySelector('.copy-api-url-btn');
        if (!button) return;
        
        button.addEventListener('click', (event) => {
            event.preventDefault();
            this.copyToClipboard(text, button);
        });
    }
    
    /**
     * Copy text to clipboard
     * 
     * @param {string} text - Text to copy
     * @param {HTMLElement} button - Button element that triggered the copy
     */
    copyToClipboard(text, button) {
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
                
                this.logger.debug('Copied to clipboard:', text);
                
                // Publish event
                if (this.eventBus) {
                    this.eventBus.publish('apiUrl:copied', {
                        text,
                        timestamp: new Date().toISOString()
                    });
                }
            })
            .catch(error => {
                this.logger.error('Failed to copy to clipboard', error);
                
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
     * Set up tooltips
     */
    setupTooltips() {
        // Add tooltip styles if not already added
        if (!document.getElementById('api-url-tooltip-styles')) {
            const style = document.createElement('style');
            style.id = 'api-url-tooltip-styles';
            style.textContent = `
                [data-tooltip] {
                    position: relative;
                    cursor: help;
                }
                
                [data-tooltip]::after {
                    content: attr(data-tooltip);
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 0.5rem;
                    background-color: #333;
                    color: white;
                    border-radius: 0.25rem;
                    font-size: 0.875rem;
                    white-space: nowrap;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.3s, visibility 0.3s;
                    z-index: 1000;
                }
                
                [data-tooltip]:hover::after {
                    opacity: 1;
                    visibility: visible;
                }
            `;
            document.head.appendChild(style);
        }
        
        this.logger.debug('Tooltips set up');
    }
    
    /**
     * Add tooltip to element
     * 
     * @param {HTMLElement} element - Element to add tooltip to
     * @param {string} text - Tooltip text
     */
    addTooltip(element, text) {
        element.setAttribute('data-tooltip', text);
    }
    
    /**
     * Animate element update
     * 
     * @param {HTMLElement} element - Element to animate
     */
    animateUpdate(element) {
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
}

// Export the class
export { EnhancedApiUrlSubsystem };