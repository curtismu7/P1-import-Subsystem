/**
 * Population Dropdown Fix with Worker Token System
 * 
 * This script ensures that population dropdowns are properly populated across all views.
 * It includes fallback handling for when credentials are not available and implements
 * a worker token system for graceful degradation.
 */
(function() {
  console.log('🔧 Population Dropdown Fix: Initializing with worker token system...');
  
  // Configuration
  const DROPDOWN_IDS = [
    'import-population-select',
    'export-population-select',
    'delete-population-select',
    'modify-population-select'
  ];
  
  // Debug mode - set to false to reduce console logs
  const DEBUG = false;
  
  // Worker token system state
  let workerTokenStatus = {
    available: false,
    testing: false,
    lastCheck: null,
    retryCount: 0,
    maxRetries: 3
  };
  
  // Log function that only logs when debug is enabled
  function log(message, ...args) {
    if (DEBUG) {
      console.log(message, ...args);
    }
  }
  
  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', initializeDropdownFix);
  
  // Also try to initialize immediately if DOM is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initializeDropdownFix, 100);
  }
  
  /**
   * Test worker token availability on startup
   */
  async function testWorkerToken() {
    if (workerTokenStatus.testing) return workerTokenStatus.available;
    
    workerTokenStatus.testing = true;
    workerTokenStatus.lastCheck = Date.now();
    
    try {
      log('🔧 Testing worker token availability...');
      
      // Test if we can get a token without user credentials
      // CRITICAL: This MUST be a GET request to match server-side endpoint
      // Server endpoint: routes/pingone-proxy-fixed.js - router.get('/test-connection')
      // DO NOT change to POST without updating server-side endpoint
      // Last fixed: 2025-07-30 - Fixed 400 Bad Request by ensuring proper GET request
      const response = await fetch('/api/pingone/test-connection', {
        method: 'GET', // MUST be GET to match server endpoint
        headers: {
          'Accept': 'application/json',
          'X-Request-ID': 'popdd-' + Date.now() // Add request ID for debugging
        },
        credentials: 'same-origin' // Include cookies if needed for auth
      });
      
      const responseData = await response.text();
      log('🔧 Test connection response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseData
      });
      
      if (response.ok) {
        workerTokenStatus.available = true;
        log('🔧 Worker token available - API connection successful');
      } else if (response.status === 401) {
        workerTokenStatus.available = false;
        log('🔧 Worker token not available - credentials required');
      } else {
        workerTokenStatus.available = false;
        const errorInfo = `Status: ${response.status} ${response.statusText}`;
        
        // Parse response to check if it's a credentials issue
        let isCredentialsIssue = false;
        try {
          const errorData = JSON.parse(responseData);
          isCredentialsIssue = errorData.error && (
            errorData.error.includes('Authentication failed') ||
            errorData.error.includes('credentials') ||
            errorData.error.includes('Target URL is required')
          );
        } catch (e) {
          // Response is not JSON, check text content
          isCredentialsIssue = responseData.includes('Authentication failed') ||
                              responseData.includes('credentials') ||
                              responseData.includes('Target URL is required');
        }
        
        if (isCredentialsIssue) {
          log('🔧 Worker token not available - credentials not configured (expected)');
        } else {
          log(`🔧 Worker token test failed - ${errorInfo}`, responseData);
          
          // Only log detailed error info for unexpected errors
          console.warn('Worker token test failed:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseData
          });
        }
      }
    } catch (error) {
      workerTokenStatus.available = false;
      log('🔧 Worker token test error:', error.message);
    } finally {
      workerTokenStatus.testing = false;
    }
    
    return workerTokenStatus.available;
  }
  
  /**
   * Initialize the dropdown fix with worker token system
   */
  async function initializeDropdownFix() {
    console.log('🔧 Population Dropdown Fix: Initialized with worker token system');
    
    // Test worker token availability first
    await testWorkerToken();
    
    // Check dropdowns with fallback handling
    await checkDropdownsWithFallback();
    
    // Set up periodic checks - less frequent to reduce noise
    setInterval(async () => {
      await checkDropdownsWithFallback();
    }, 30000);
    
    // Listen for view changes
    document.addEventListener('view-changed', async () => {
      await checkDropdownsWithFallback();
    });
    
    // Listen for navigation events
    document.querySelectorAll('.nav-item, .feature-card').forEach(item => {
      item.addEventListener('click', () => {
        setTimeout(async () => {
          await checkDropdownsWithFallback();
        }, 500);
      });
    });
    
    // Listen for credential updates (when user saves settings)
    document.addEventListener('credentials-updated', async () => {
      console.log('🔧 Credentials updated - retesting worker token...');
      workerTokenStatus.available = false;
      workerTokenStatus.retryCount = 0;
      await testWorkerToken();
      await checkDropdownsWithFallback();
    });
  }
  
  /**
   * Check all population dropdowns with fallback handling
   */
  async function checkDropdownsWithFallback() {
    log('🔧 Population Dropdown Fix: Checking dropdowns with fallback handling...');
    
    // Re-test worker token if it's been a while
    const timeSinceLastCheck = Date.now() - (workerTokenStatus.lastCheck || 0);
    if (timeSinceLastCheck > 300000) { // 5 minutes
      await testWorkerToken();
    }
    
    DROPDOWN_IDS.forEach(async (id) => {
      const dropdown = document.getElementById(id);
      if (!dropdown) return;
      
      log(`🔧 Population Dropdown Fix: Checking ${id}...`);
      
      // Check if dropdown needs population data
      const needsData = dropdown.options.length <= 1 || 
                       dropdown.options[0].text.includes('Loading') || 
                       dropdown.options[0].text.includes('Error') ||
                       dropdown.options[0].text.includes('Configure credentials');
      
      if (needsData) {
        log(`🔧 Population Dropdown Fix: ${id} needs population data`);
        await loadPopulationsWithFallback(id);
      } else {
        log(`🔧 Population Dropdown Fix: ${id} already has ${dropdown.options.length} options`);
      }
    });
  }
  
  /**
   * Legacy function for backward compatibility
   */
  function checkDropdowns() {
    checkDropdownsWithFallback();
  }
  
  /**
   * Load populations with fallback handling
   */
  async function loadPopulationsWithFallback(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    try {
      log(`🔧 Population Dropdown Fix: Loading populations for ${dropdownId} with fallback...`);
      
      // Show loading state
      dropdown.innerHTML = '<option value="">Loading populations...</option>';
      
      // Check if worker token is available
      if (!workerTokenStatus.available && workerTokenStatus.retryCount < workerTokenStatus.maxRetries) {
        // Try to get worker token again
        await testWorkerToken();
        workerTokenStatus.retryCount++;
      }
      
      if (!workerTokenStatus.available) {
        // No credentials available - show fallback message
        showCredentialsFallback(dropdownId);
        return;
      }
      
      // Fetch populations from API
      const response = await fetch('/api/pingone/populations');
      
      if (response.status === 401) {
        // Unauthorized - credentials invalid or expired
        workerTokenStatus.available = false;
        showCredentialsFallback(dropdownId);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to load populations: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Extract populations from response
      let populations = [];
      if (data._embedded && data._embedded.populations) {
        populations = data._embedded.populations;
      } else if (Array.isArray(data.populations)) {
        populations = data.populations;
      } else if (Array.isArray(data)) {
        populations = data;
      }
      
      log(`🔧 Population Dropdown Fix: Loaded ${populations.length} populations`);
      
      // Reset retry count on success
      workerTokenStatus.retryCount = 0;
      
      // Populate the dropdown
      populateDropdown(dropdownId, populations);
      
    } catch (error) {
      console.error(`🔧 Population Dropdown Fix: Error loading populations for ${dropdownId}`, error);
      
      // Show error with retry option
      showErrorWithRetry(dropdownId, error.message);
    }
  }
  
  /**
   * Show credentials fallback message
   */
  function showCredentialsFallback(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    dropdown.innerHTML = `
      <option value="">Configure credentials in Settings to load populations</option>
      <option value="retry">🔄 Retry after configuring credentials</option>
    `;
    
    // Add click handler for retry option
    dropdown.addEventListener('change', async function(event) {
      if (event.target.value === 'retry') {
        event.target.value = ''; // Reset selection
        workerTokenStatus.available = false;
        workerTokenStatus.retryCount = 0;
        await loadPopulationsWithFallback(dropdownId);
      }
    });
    
    log(`🔧 Population Dropdown Fix: Showing credentials fallback for ${dropdownId}`);
  }
  
  /**
   * Show error with retry option
   */
  function showErrorWithRetry(dropdownId, errorMessage) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    dropdown.innerHTML = `
      <option value="">Error: ${errorMessage}</option>
      <option value="retry">🔄 Retry loading populations</option>
    `;
    
    // Add click handler for retry option
    dropdown.addEventListener('change', async function(event) {
      if (event.target.value === 'retry') {
        event.target.value = ''; // Reset selection
        await loadPopulationsWithFallback(dropdownId);
      }
    });
    
    log(`🔧 Population Dropdown Fix: Showing error with retry for ${dropdownId}`);
  }
  
  /**
   * Legacy function for backward compatibility
   */
  async function loadPopulationsForDropdown(dropdownId) {
    await loadPopulationsWithFallback(dropdownId);
  }
  
  /**
   * Populate a dropdown with populations
   */
  function populateDropdown(dropdownId, populations) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    // Clear existing options
    dropdown.innerHTML = '';
    
    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Select a population';
    dropdown.appendChild(emptyOption);
    
    // Add population options
    populations.forEach(population => {
      const option = document.createElement('option');
      option.value = population.id;
      option.textContent = population.name;
      option.dataset.populationId = population.id;
      option.dataset.populationName = population.name;
      dropdown.appendChild(option);
    });
    
    log(`🔧 Population Dropdown Fix: Successfully populated ${dropdownId}`);
    
    // Trigger change event to update any dependent UI
    const event = new Event('change');
    dropdown.dispatchEvent(event);
  }
})();