/**
 * Delete Page Handler
 * 
 * Handles the functionality of the Delete Users page
 */

(function() {
    console.log('🗑️ Delete Page Handler: Script loaded');
    
    // Create global deleteManager for compatibility with existing code
    window.deleteManager = {
        loadPopulations: async function() {
            console.log('🗑️ Delete Page Handler: loadPopulations called');
            try {
                // This function is called by the view initializer
                setupDeletePage();
                return true;
            } catch (error) {
                console.error('🗑️ Delete Page Handler: Error in loadPopulations', error);
                return false;
            }
        }
    };
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🗑️ Delete Page Handler: DOM content loaded');
        setupDeletePage();
    });
    
    // Also try to initialize immediately if DOM is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('🗑️ Delete Page Handler: Document already ready, initializing now');
        setTimeout(setupDeletePage, 100);
    }
    
    /**
     * Set up the delete page functionality
     */
    function setupDeletePage() {
        console.log('🗑️ Delete Page Handler: Setting up delete page');
        
        // Set up delete method radio buttons
        setupDeleteTypeToggle();
        
        // Set up form validation
        setupFormValidation();
        
        // Listen for navigation to delete view
        document.querySelectorAll('[data-view="delete-csv"]').forEach(element => {
            element.addEventListener('click', function() {
                console.log('🗑️ Delete Page Handler: Navigation to delete page detected');
                setTimeout(function() {
                    console.log('🗑️ Delete Page Handler: Reinitializing after navigation');
                    setupDeleteTypeToggle();
                    setupFormValidation();
                }, 500);
            });
        });
    }
    
    /**
     * Set up delete type toggle
     */
    function setupDeleteTypeToggle() {
        const deleteTypeRadios = document.querySelectorAll('input[name="delete-type"]');
        
        if (!deleteTypeRadios || deleteTypeRadios.length === 0) {
            console.error('🗑️ Delete Page Handler: Delete type radio buttons not found');
            return;
        }
        
        console.log(`🗑️ Delete Page Handler: Found ${deleteTypeRadios.length} delete type radio buttons`);
        
        // Add event listeners to radio buttons
        deleteTypeRadios.forEach(radio => {
            radio.removeEventListener('change', handleDeleteTypeChange); // Remove existing to prevent duplicates
            radio.addEventListener('change', handleDeleteTypeChange);
            console.log(`🗑️ Delete Page Handler: Added listener to ${radio.value} radio button`);
        });
        
        // Initial state setup
        handleDeleteTypeChange();
    }
    
    /**
     * Handle delete type change
     */
    function handleDeleteTypeChange() {
        const selectedType = document.querySelector('input[name="delete-type"]:checked')?.value;
        const fileSection = document.getElementById('delete-file-section');
        const populationSection = document.getElementById('delete-population-section');
        const environmentSection = document.getElementById('delete-environment-section');
        const standardConfirmation = document.getElementById('standard-confirmation');
        const environmentConfirmation = document.getElementById('environment-confirmation');
        
        console.log(`🗑️ Delete Page Handler: Delete type changed to: ${selectedType}`);
        
        if (!fileSection) console.error('🗑️ Delete Page Handler: delete-file-section not found');
        if (!populationSection) console.error('🗑️ Delete Page Handler: delete-population-section not found');
        if (!environmentSection) console.error('🗑️ Delete Page Handler: delete-environment-section not found');
        
        if (!fileSection || !populationSection || !environmentSection) {
            console.error('🗑️ Delete Page Handler: One or more delete page sections not found');
            return;
        }
        
        // Hide all sections first
        fileSection.style.display = 'none';
        populationSection.style.display = 'none';
        environmentSection.style.display = 'none';
        
        if (standardConfirmation) standardConfirmation.style.display = 'none';
        if (environmentConfirmation) environmentConfirmation.style.display = 'none';
        
        // Show the selected section
        switch (selectedType) {
            case 'file':
                fileSection.style.display = 'block';
                if (standardConfirmation) standardConfirmation.style.display = 'block';
                console.log('🗑️ Delete Page Handler: Showing file section');
                break;
            case 'population':
                populationSection.style.display = 'block';
                if (standardConfirmation) standardConfirmation.style.display = 'block';
                console.log('🗑️ Delete Page Handler: Showing population section');
                break;
            case 'environment':
                environmentSection.style.display = 'block';
                if (environmentConfirmation) environmentConfirmation.style.display = 'block';
                console.log('🗑️ Delete Page Handler: Showing environment section');
                break;
            default:
                // Default to file section if no selection
                fileSection.style.display = 'block';
                if (standardConfirmation) standardConfirmation.style.display = 'block';
                console.log('🗑️ Delete Page Handler: Showing default file section');
        }
        
        // Update button state
        updateDeleteButtonState();
    }
    
    /**
     * Set up form validation
     */
    function setupFormValidation() {
        console.log('🗑️ Delete Page Handler: Setting up form validation');
        
        // File input change
        const fileInput = document.getElementById('delete-csv-file');
        if (fileInput) {
            fileInput.removeEventListener('change', updateDeleteButtonState); // Remove existing to prevent duplicates
            fileInput.addEventListener('change', updateDeleteButtonState);
            console.log('🗑️ Delete Page Handler: Added listener to file input');
        } else {
            console.error('🗑️ Delete Page Handler: delete-csv-file not found');
        }
        
        // Population select change
        const populationSelect = document.getElementById('delete-population-select');
        if (populationSelect) {
            populationSelect.removeEventListener('change', updateDeleteButtonState); // Remove existing to prevent duplicates
            populationSelect.addEventListener('change', updateDeleteButtonState);
            console.log('🗑️ Delete Page Handler: Added listener to population select');
        } else {
            console.error('🗑️ Delete Page Handler: delete-population-select not found');
        }
        
        // Confirmation checkbox change
        const confirmCheckbox = document.getElementById('confirm-delete');
        if (confirmCheckbox) {
            confirmCheckbox.removeEventListener('change', updateDeleteButtonState); // Remove existing to prevent duplicates
            confirmCheckbox.addEventListener('change', updateDeleteButtonState);
            console.log('🗑️ Delete Page Handler: Added listener to confirm checkbox');
        } else {
            console.error('🗑️ Delete Page Handler: confirm-delete not found');
        }
        
        // Environment confirmation checkbox change
        const environmentConfirmCheckbox = document.getElementById('confirm-environment-delete');
        if (environmentConfirmCheckbox) {
            environmentConfirmCheckbox.removeEventListener('change', updateDeleteButtonState); // Remove existing to prevent duplicates
            environmentConfirmCheckbox.addEventListener('change', updateDeleteButtonState);
            console.log('🗑️ Delete Page Handler: Added listener to environment confirm checkbox');
        } else {
            console.error('🗑️ Delete Page Handler: confirm-environment-delete not found');
        }
        
        // Environment delete text confirmation
        const environmentDeleteText = document.getElementById('environment-delete-text');
        if (environmentDeleteText) {
            environmentDeleteText.removeEventListener('input', updateDeleteButtonState); // Remove existing to prevent duplicates
            environmentDeleteText.addEventListener('input', updateDeleteButtonState);
            console.log('🗑️ Delete Page Handler: Added listener to environment delete text');
        } else {
            console.error('🗑️ Delete Page Handler: environment-delete-text not found');
        }
    }
    
    /**
     * Update delete button state
     */
    function updateDeleteButtonState() {
        const startDeleteButton = document.getElementById('start-delete');
        const selectedType = document.querySelector('input[name="delete-type"]:checked')?.value;
        const csvFile = document.getElementById('delete-csv-file');
        const populationSelect = document.getElementById('delete-population-select');
        const confirmCheckbox = document.getElementById('confirm-delete');
        const environmentConfirmCheckbox = document.getElementById('confirm-environment-delete');
        const environmentDeleteText = document.getElementById('environment-delete-text');
        
        if (!startDeleteButton) {
            console.error('🗑️ Delete Page Handler: start-delete button not found');
            return;
        }
        
        let isValid = false;
        
        // Validate based on selected delete type
        switch (selectedType) {
            case 'file':
                // File delete requires a file and confirmation
                isValid = csvFile && csvFile.files && csvFile.files.length > 0 && confirmCheckbox && confirmCheckbox.checked;
                break;
            case 'population':
                // Population delete requires a population selection and confirmation
                isValid = populationSelect && populationSelect.value && populationSelect.value !== '' && confirmCheckbox && confirmCheckbox.checked;
                break;
            case 'environment':
                // Environment delete requires special confirmation
                isValid = environmentConfirmCheckbox && environmentConfirmCheckbox.checked && 
                          environmentDeleteText && environmentDeleteText.value === 'DELETE ALL';
                break;
            default:
                isValid = false;
        }
        
        // Enable/disable button based on validation
        startDeleteButton.disabled = !isValid;
        
        console.log(`🗑️ Delete Page Handler: Delete button state updated: ${isValid ? 'enabled' : 'disabled'}`);
    }
    
    // Expose functions to global scope for event binding
    window.handleDeleteTypeChange = handleDeleteTypeChange;
    window.updateDeleteButtonState = updateDeleteButtonState;
    
    console.log('🗑️ Delete Page Handler: Script initialization complete');
})();