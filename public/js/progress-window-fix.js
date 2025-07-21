/**
 * Progress Window Fix
 * 
 * This script fixes the progress window display issue by setting up real-time progress updates.
 */
(function() {
  console.log('🔧 Progress Window Fix: Initializing...');
  
  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', initializeProgressWindowFix);
  
  // Also try to initialize immediately if DOM is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initializeProgressWindowFix, 100);
  }
  
  /**
   * Initialize the progress window fix
   */
  function initializeProgressWindowFix() {
    console.log('🔧 Progress Window Fix: Initialized');
    
    // Set up event listener for import API responses
    setupImportResponseListener();
    
    // Set up periodic progress polling
    setupProgressPolling();
  }
  
  /**
   * Set up event listener for import API responses
   */
  function setupImportResponseListener() {
    // Patch the fetch function to intercept responses from /api/import
    const originalFetch = window.fetch;
    
    window.fetch = async function(url, options) {
      // Call the original fetch
      const response = await originalFetch.apply(this, arguments);
      
      // Clone the response to avoid consuming it
      const responseClone = response.clone();
      
      // Check if this is a response from /api/import or /api/import/start
      if (typeof url === 'string' && 
          (url === '/api/import' || url === '/api/import/start') && 
          options && options.method === 'POST') {
        
        try {
          // Parse the response JSON
          const data = await responseClone.json();
          
          // If the response has a sessionId, start progress tracking
          if (data.success && data.sessionId) {
            console.log('🔧 Progress Window Fix: Import started with session ID', data.sessionId);
            
            // Show progress container
            const progressContainer = document.getElementById('progress-container');
            if (progressContainer) {
              progressContainer.style.display = 'block';
              
              // Update initial progress UI
              updateProgressUI({
                status: 'started',
                message: 'Import started successfully',
                total: data.total || 0,
                processed: 0,
                success: 0,
                failed: 0,
                skipped: 0
              });
              
              // Start polling for progress updates
              startProgressPolling(data.sessionId);
            }
          }
        } catch (error) {
          console.error('🔧 Progress Window Fix: Error parsing response', error);
        }
      }
      
      // Return the original response
      return response;
    };
  }
  
  /**
   * Set up periodic progress polling
   */
  function setupProgressPolling() {
    // Nothing to do here, polling is started when an import is initiated
  }
  
  /**
   * Start polling for progress updates
   */
  function startProgressPolling(sessionId) {
    console.log('🔧 Progress Window Fix: Starting progress polling for session', sessionId);
    
    // Store the session ID
    window.currentImportSessionId = sessionId;
    
    // Start polling
    pollProgress(sessionId);
  }
  
  /**
   * Poll for progress updates
   */
  function pollProgress(sessionId) {
    // Check if we should continue polling
    if (!window.currentImportSessionId || window.currentImportSessionId !== sessionId) {
      console.log('🔧 Progress Window Fix: Stopping progress polling for session', sessionId);
      return;
    }
    
    // Fetch progress update
    fetch(`/api/import/status`)
      .then(response => response.json())
      .then(data => {
        console.log('🔧 Progress Window Fix: Progress update', data);
        
        // Update progress UI
        updateProgressUI({
          status: data.status,
          message: getStatusMessage(data.status),
          total: data.progress?.total || 0,
          processed: data.progress?.current || 0,
          success: data.statistics?.processed - (data.statistics?.errors || 0) - (data.statistics?.warnings || 0) || 0,
          failed: data.statistics?.errors || 0,
          skipped: data.statistics?.warnings || 0,
          percentage: data.progress?.percentage || 0
        });
        
        // Check if import is complete
        if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
          console.log('🔧 Progress Window Fix: Import complete with status', data.status);
          
          // Clear session ID
          window.currentImportSessionId = null;
          
          // Show completion message
          const statusMessage = document.querySelector('.progress-container .status-message');
          if (statusMessage) {
            statusMessage.textContent = getStatusMessage(data.status);
          }
          
          // Add completion class to progress container
          const progressContainer = document.getElementById('progress-container');
          if (progressContainer) {
            progressContainer.classList.add('import-' + data.status);
          }
          
          // Show close button
          const closeButton = document.querySelector('.progress-container .close-progress-btn');
          if (closeButton) {
            closeButton.style.display = 'block';
          }
        } else {
          // Continue polling
          setTimeout(() => pollProgress(sessionId), 1000);
        }
      })
      .catch(error => {
        console.error('🔧 Progress Window Fix: Error polling progress', error);
        
        // Continue polling despite error
        setTimeout(() => pollProgress(sessionId), 2000);
      });
  }
  
  /**
   * Get status message based on status
   */
  function getStatusMessage(status) {
    switch (status) {
      case 'idle':
        return 'Waiting to start...';
      case 'running':
        return 'Import in progress...';
      case 'completed':
        return 'Import completed successfully';
      case 'failed':
        return 'Import failed';
      case 'cancelled':
        return 'Import cancelled';
      default:
        return 'Unknown status';
    }
  }
  
  /**
   * Update progress UI
   */
  function updateProgressUI(data) {
    const progressContainer = document.getElementById('progress-container');
    if (!progressContainer) {
      console.error('🔧 Progress Window Fix: Progress container not found for updating');
      return;
    }
    
    // Update progress bar
    const progressBar = progressContainer.querySelector('.progress-bar-fill');
    if (progressBar) {
      const progress = data.percentage !== undefined ? data.percentage : 
                      (data.total && data.processed ? (data.processed / data.total) * 100 : 0);
      progressBar.style.width = `${progress}%`;
    }
    
    // Update progress percentage
    const progressPercentage = progressContainer.querySelector('.progress-percentage');
    if (progressPercentage) {
      const progress = data.percentage !== undefined ? data.percentage : 
                      (data.total && data.processed ? (data.processed / data.total) * 100 : 0);
      progressPercentage.textContent = `${Math.round(progress)}%`;
    }
    
    // Update status message
    const statusMessage = progressContainer.querySelector('.status-message');
    if (statusMessage && data.message) {
      statusMessage.textContent = data.message;
    }
    
    // Update progress text
    const progressText = progressContainer.querySelector('.progress-text');
    if (progressText) {
      progressText.textContent = data.processed !== undefined && data.total !== undefined ? 
                               `${data.processed} of ${data.total} processed` : '';
    }
    
    // Update stats
    const totalStat = progressContainer.querySelector('.stat-value.total');
    if (totalStat) {
      totalStat.textContent = data.total || 0;
    }
    
    const processedStat = progressContainer.querySelector('.stat-value.processed');
    if (processedStat) {
      processedStat.textContent = data.processed || 0;
    }
    
    const successStat = progressContainer.querySelector('.stat-value.success');
    if (successStat) {
      successStat.textContent = data.success || 0;
    }
    
    const failedStat = progressContainer.querySelector('.stat-value.failed');
    if (failedStat) {
      failedStat.textContent = data.failed || 0;
    }
    
    const skippedStat = progressContainer.querySelector('.stat-value.skipped');
    if (skippedStat) {
      skippedStat.textContent = data.skipped || 0;
    }
    
    // Set up close button handler if not already set
    const closeButton = progressContainer.querySelector('.close-progress-btn');
    if (closeButton && !closeButton._hasClickHandler) {
      closeButton.addEventListener('click', () => {
        progressContainer.style.display = 'none';
      });
      closeButton._hasClickHandler = true;
    }
  }
  
  // Initialize immediately
  setTimeout(initializeProgressWindowFix, 0);
})();