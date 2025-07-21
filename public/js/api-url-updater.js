/**
 * API URL Updater
 * 
 * Updates the API URL display when a population is selected
 */

(function() {
    console.log('🔗 API URL Updater: Script loaded');
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔗 API URL Updater: DOM content loaded');
        setupApiUrlUpdater();
    });
    
    // Also try to initialize immediately if DOM is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('🔗 API URL Updater: Document already ready, initializing now');
        setTimeout(setupApiUrlUpdater, 100);
    }
    
    /**
     * Set up API URL updater
     */
    function setupApiUrlUpdater() {
        console.log('🔗 API URL Updater: Setting up API URL updater');
        
        // Set up population select change listeners
        setupPopulationSelectListeners();
        
        // Listen for navigation to import view
        document.querySelectorAll('[data-view="import"]').forEach(element => {
            element.addEventListener('click', function() {
                console.log('🔗 API URL Updater: Navigation to import page detected');
                setTimeout(function() {
                    console.log('🔗 API URL Updater: Reinitializing after navigation');
                    setupPopulationSelectListeners();
                }, 500);
            });
        });
    }
    
    /**
     * Set up population select change listeners
     */
    function setupPopulationSelectListeners() {
        // Import population select
        const importPopulationSelect = document.getElementById('import-population-select');
        if (importPopulationSelect) {
            importPopulationSelect.removeEventListener('change', handleImportPopulationChange); // Remove existing to prevent duplicates
            importPopulationSelect.addEventListener('change', handleImportPopulationChange);
            console.log('🔗 API URL Updater: Added listener to import population select');
            
            // Initial update if a population is already selected
            if (importPopulationSelect.value) {
                handleImportPopulationChange({ target: importPopulationSelect });
            }
        } else {
            console.error('🔗 API URL Updater: import-population-select not found');
        }
        
        // Delete population select
        const deletePopulationSelect = document.getElementById('delete-population-select');
        if (deletePopulationSelect) {
            deletePopulationSelect.removeEventListener('change', handleDeletePopulationChange); // Remove existing to prevent duplicates
            deletePopulationSelect.addEventListener('change', handleDeletePopulationChange);
            console.log('🔗 API URL Updater: Added listener to delete population select');
            
            // Initial update if a population is already selected
            if (deletePopulationSelect.value) {
                handleDeletePopulationChange({ target: deletePopulationSelect });
            }
        }
        
        // Modify population select
        const modifyPopulationSelect = document.getElementById('modify-population-select');
        if (modifyPopulationSelect) {
            modifyPopulationSelect.removeEventListener('change', handleModifyPopulationChange); // Remove existing to prevent duplicates
            modifyPopulationSelect.addEventListener('change', handleModifyPopulationChange);
            console.log('🔗 API URL Updater: Added listener to modify population select');
            
            // Initial update if a population is already selected
            if (modifyPopulationSelect.value) {
                handleModifyPopulationChange({ target: modifyPopulationSelect });
            }
        }
    }
    
    /**
     * Handle import population change
     */
    function handleImportPopulationChange(event) {
        const populationId = event.target.value;
        const populationName = event.target.options[event.target.selectedIndex]?.text || 'Unknown';
        const apiUrlDisplay = document.getElementById('population-api-url');
        const populationNameDisplay = document.querySelector('.population-name-text');
        
        console.log(`🔗 API URL Updater: Import population changed to: ${populationId} (${populationName})`);
        
        if (apiUrlDisplay) {
            const apiUrlText = apiUrlDisplay.querySelector('.api-url-text');
            if (apiUrlText) {
                if (populationId) {
                    // Construct the API URL for the selected population
                    const apiUrl = `/api/populations/${populationId}/users`;
                    apiUrlText.textContent = apiUrl;
                    apiUrlDisplay.classList.add('has-url');
                    apiUrlDisplay.classList.remove('no-url');
                    console.log(`🔗 API URL Updater: Updated API URL display to: ${apiUrl}`);
                } else {
                    apiUrlText.textContent = 'Select a population to see the API URL';
                    apiUrlDisplay.classList.add('no-url');
                    apiUrlDisplay.classList.remove('has-url');
                    console.log('🔗 API URL Updater: Reset API URL display');
                }
            }
        }
        
        if (populationNameDisplay) {
            if (populationId) {
                populationNameDisplay.textContent = `Population: ${populationName}`;
                console.log(`🔗 API URL Updater: Updated population name display to: ${populationName}`);
            } else {
                populationNameDisplay.textContent = 'Population: Select a population';
                console.log('🔗 API URL Updater: Reset population name display');
            }
        }
    }
    
    /**
     * Handle delete population change
     */
    function handleDeletePopulationChange(event) {
        const populationId = event.target.value;
        const populationName = event.target.options[event.target.selectedIndex]?.text || 'Unknown';
        const apiUrlDisplay = document.getElementById('delete-population-api-url');
        
        console.log(`🔗 API URL Updater: Delete population changed to: ${populationId} (${populationName})`);
        
        if (apiUrlDisplay) {
            if (populationId) {
                // Construct the API URL for the selected population
                const apiUrl = `/api/populations/${populationId}/users`;
                apiUrlDisplay.textContent = apiUrl;
                console.log(`🔗 API URL Updater: Updated delete API URL display to: ${apiUrl}`);
            } else {
                apiUrlDisplay.textContent = '';
                console.log('🔗 API URL Updater: Reset delete API URL display');
            }
        }
    }
    
    /**
     * Handle modify population change
     */
    function handleModifyPopulationChange(event) {
        const populationId = event.target.value;
        const populationName = event.target.options[event.target.selectedIndex]?.text || 'Unknown';
        const apiUrlDisplay = document.getElementById('modify-population-api-url');
        
        console.log(`🔗 API URL Updater: Modify population changed to: ${populationId} (${populationName})`);
        
        if (apiUrlDisplay) {
            if (populationId) {
                // Construct the API URL for the selected population
                const apiUrl = `/api/populations/${populationId}/users`;
                apiUrlDisplay.textContent = apiUrl;
                console.log(`🔗 API URL Updater: Updated modify API URL display to: ${apiUrl}`);
            } else {
                apiUrlDisplay.textContent = '';
                console.log('🔗 API URL Updater: Reset modify API URL display');
            }
        }
    }
    
    console.log('🔗 API URL Updater: Script initialization complete');
})();