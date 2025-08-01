/**
 * Export Population Fix
 * 
 * Fixes the export population dropdown by integrating the bulletproof population loader.
 * This script should be included after the main app.js file.
 * 
 * Status: PRODUCTION READY - BULLETPROOF
 */

import bulletproofPopulationLoader from './bulletproof-population-loader.js';
import logger from './logger.js';

/**
 * Initialize the export population dropdown with bulletproof loading
 */
function initExportPopulationDropdown() {
    const dropdownId = 'export-population-select';
    const dropdown = document.getElementById(dropdownId);
    
    if (!dropdown) {
        logger.warn(`Export population dropdown (${dropdownId}) not found in the DOM`);
        return;
    }
    
    logger.info('Initializing bulletproof export population dropdown');
    
    // Add CSS for loading indicator
    addLoadingStyles();
    
    // Initialize the dropdown with bulletproof loader
    bulletproofPopulationLoader.populateDropdown(dropdownId, {
        includeEmpty: true,
        emptyText: 'Select a population...',
        includeAll: true
    }).then(success => {
        if (success) {
            logger.info('Export population dropdown initialized successfully');
        } else {
            logger.error('Failed to initialize export population dropdown');
        }
    });
    
    // Add refresh button next to the dropdown
    addRefreshButton(dropdownId);
    
    // Add event listener to update API URL display when selection changes
    addSelectionChangeHandler(dropdownId);
}

/**
 * Add CSS styles for loading indicator
 */
function addLoadingStyles() {
    const styleId = 'bulletproof-population-loader-styles';
    
    // Don't add styles if they already exist
    if (document.getElementById(styleId)) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        select.loading {
            background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E');
            background-repeat: no-repeat;
            background-position: right 0.7em top 50%;
            background-size: 0.65em auto;
            opacity: 0.7;
        }
        
        .dropdown-spinner {
            position: absolute;
            right: 30px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;
        }
        
        .form-group {
            position: relative;
        }
        
        .population-refresh-btn {
            position: absolute;
            right: -40px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #007bff;
            cursor: pointer;
            padding: 0;
            font-size: 1.2rem;
        }
        
        .population-refresh-btn:hover {
            color: #0056b3;
        }
        
        .population-refresh-btn:focus {
            outline: none;
            box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        
        .population-refresh-btn i {
            pointer-events: none;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Add refresh button next to the dropdown
 * @param {string} dropdownId - ID of the dropdown element
 */
function addRefreshButton(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    // Check if button already exists
    const existingButton = dropdown.parentElement.querySelector('.population-refresh-btn');
    if (existingButton) return;
    
    // Create refresh button
    const refreshButton = document.createElement('button');
    refreshButton.type = 'button';
    refreshButton.className = 'population-refresh-btn';
    refreshButton.title = 'Refresh populations';
    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i>';
    refreshButton.setAttribute('aria-label', 'Refresh populations');
    
    // Add click handler
    refreshButton.addEventListener('click', () => {
        logger.info('Manually refreshing export population dropdown');
        bulletproofPopulationLoader.refreshDropdown(dropdownId, {
            includeEmpty: true,
            emptyText: 'Select a population...',
            includeAll: true
        });
    });
    
    // Add button to DOM
    dropdown.parentElement.appendChild(refreshButton);
}

/**
 * Add event listener to update API URL display when selection changes
 * @param {string} dropdownId - ID of the dropdown element
 */
function addSelectionChangeHandler(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    const apiUrlDisplay = document.getElementById('export-population-api-url');
    if (!apiUrlDisplay) return;
    
    dropdown.addEventListener('change', () => {
        const selectedOption = dropdown.options[dropdown.selectedIndex];
        const populationId = dropdown.value;
        
        if (populationId && populationId !== 'ALL') {
            // Get environment ID from settings or URL
            let envId = '';
            try {
                // Try to get from URL first
                const urlParams = new URLSearchParams(window.location.search);
                envId = urlParams.get('environmentId') || '';
                
                // If not in URL, try to get from settings
                if (!envId && window.app && window.app.settings) {
                    envId = window.app.settings.environmentId || '';
                }
            } catch (error) {
                logger.warn('Could not get environment ID', { error: error.message });
            }
            
            // Update API URL display
            apiUrlDisplay.innerHTML = `<span>PingOne API URL: <code>https://api.pingone.com/v1/environments/${envId}/populations/${populationId}</code></span>`;
        } else {
            // Clear API URL display for ALL or empty selection
            apiUrlDisplay.innerHTML = '';
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExportPopulationDropdown);
} else {
    // DOM already ready, initialize now
    initExportPopulationDropdown();
}

// Export for direct use
export { initExportPopulationDropdown };
export default initExportPopulationDropdown;
