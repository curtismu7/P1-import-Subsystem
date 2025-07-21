/**
 * Progress Window Fix
 * 
 * This script fixes the progress window display issue by integrating with the enhanced progress subsystem
 * and setting up real-time progress updates using WebSockets or SSE.
 */
(function() {
  console.log('🔧 Progress Window Fix: Initializing...');
  
  // Configuration
  const USE_WEBSOCKET = true; // Use WebSocket for real-time updates if available
  const USE_SSE = true; // Use Server-Sent Events as fallback
  const POLLING_INTERVAL = 1000; // Polling interval in ms (fallback)
  
  // State
  let currentSessionId = null;
  let socket = null;
  let eventSource = null;
  let pollingInterval = null;
  
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
    
    // Apply enhanced progress styles to the progress container
    applyEnhancedProgressStyles();
    
    // Set up event listener for import API responses
    setupImportResponseListener();
    
    // Set up WebSocket connection if available
    if (USE_WEBSOCKET) {
      setupWebSocketConnection();
    }
    
    // Set up close button handler
    setupCloseButtonHandler();
    
    // Set up cancel button handler
    setupCancelButtonHandler();
  }
  
  /**
   * Apply enhanced progress styles to the progress container
   */
  function applyEnhancedProgressStyles() {
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
      // Add enhanced-progress class
      progressContainer.classList.add('enhanced-progress');
      
      // Make sure the progress container has the correct structure
      if (!progressContainer.querySelector('.progress-section')) {
        // If the container doesn't have the enhanced structure, rebuild it
        const originalContent = progressContainer.innerHTML;
        progressContainer.innerHTML = `
          <div class="progress-section">
            <div class="progress-header">
              <h3><i class="fas fa-cog fa-spin"></i> Import Progress</h3>
              <button class="close-progress-btn" type="button" aria-label="Close progress">
                <i class="fas fa-times"></i>
              </button>
            </div>
            
            <div class="progress-content">
              <div class="progress-bar-container">
                <div class="progress-bar">
                  <div class="progress-bar-fill"></div>
                </div>
                <div class="progress-percentage">0%</div>
              </div>
              
              <div class="progress-status">
                <div class="status-message">Preparing import...</div>
                <div class="progress-text"></div>
                <div class="status-details"></div>
              </div>
              
              <div class="progress-stats">
                <div class="stat-item">
                  <span class="stat-label">Total:</span>
                  <span class="stat-value total">0</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Processed:</span>
                  <span class="stat-value processed">0</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Success:</span>
                  <span class="stat-value success">0</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Failed:</span>
                  <span class="stat-value failed">0</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Skipped:</span>
                  <span class="stat-value skipped">0</span>
                </div>
              </div>
              
              <div class="progress-timing">
                <div class="time-elapsed">
                  <i class="fas fa-clock"></i>
                  <span>Elapsed: <span class="elapsed-value">00:00</span></span>
                </div>
                <div class="time-remaining">
                  <i class="fas fa-hourglass-half"></i>
                  <span>ETA: <span class="eta-value">Calculating...</span></span>
                </div>
              </div>
              
              <div class="progress-actions">
                <button class="btn btn-secondary cancel-import-btn" type="button">
                  <i class="fas fa-stop"></i> Cancel Import
                </button>
              </div>
            </div>
          </div>
        `;
      }
      
      console.log('🔧 Progress Window Fix: Enhanced progress styles applied');
    } else {
      console.warn('🔧 Progress Window Fix: Progress container not found');
    }
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
            
            // Store the session ID
            currentSessionId = data.sessionId;
            
            // Show progress container
            showProgressContainer();
            
            // Update initial progress UI
            updateProgressUI({
              status: 'running',
              message: 'Import started successfully',
              total: data.total || 0,
              processed: 0,
              success: 0,
              failed: 0,
              skipped: 0,
              startTime: Date.now()
            });
            
            // Start real-time updates
            startRealTimeUpdates(data.sessionId);
          }
        } catch (error) {
          console.error('🔧 Progress Window Fix: Error parsing response', error);
        }
      }
      
      // Return the original response
      return response;
    };
    
    console.log('🔧 Progress Window Fix: Import API response listener set up');
  }
  
  /**
   * Set up WebSocket connection
   */
  function setupWebSocketConnection() {
    try {
      // Check if Socket.IO is available
      if (window.io) {
        // Connect to Socket.IO server
        socket = window.io();
        
        // Set up event listeners
        socket.on('connect', () => {
          console.log('🔧 Progress Window Fix: WebSocket connected');
        });
        
        socket.on('disconnect', () => {
          console.log('🔧 Progress Window Fix: WebSocket disconnected');
          
          // Fall back to polling if WebSocket disconnects
          if (currentSessionId && !eventSource) {
            startPolling(currentSessionId);
          }
        });
        
        socket.on('progress', (data) => {
          console.log('🔧 Progress Window Fix: WebSocket progress update', data);
          handleProgressUpdate(data);
        });
        
        socket.on('import-complete', (data) => {
          console.log('🔧 Progress Window Fix: WebSocket import complete', data);
          handleImportComplete(data);
        });
        
        socket.on('import-error', (data) => {
          console.log('🔧 Progress Window Fix: WebSocket import error', data);
          handleImportError(data);
        });
        
        console.log('🔧 Progress Window Fix: WebSocket connection set up');
      } else {
        console.log('🔧 Progress Window Fix: Socket.IO not available, falling back to SSE or polling');
      }
    } catch (error) {
      console.error('🔧 Progress Window Fix: Error setting up WebSocket connection', error);
    }
  }
  
  /**
   * Start real-time updates
   */
  function startRealTimeUpdates(sessionId) {
    // Clean up any existing connections
    cleanupConnections();
    
    // Store the session ID
    currentSessionId = sessionId;
    
    // Try WebSocket first
    if (socket && socket.connected) {
      console.log('🔧 Progress Window Fix: Using WebSocket for real-time updates');
      socket.emit('register-session', sessionId);
      return;
    }
    
    // Try SSE next
    if (USE_SSE && typeof EventSource !== 'undefined') {
      console.log('🔧 Progress Window Fix: Using SSE for real-time updates');
      startSSE(sessionId);
      return;
    }
    
    // Fall back to polling
    console.log('🔧 Progress Window Fix: Using polling for updates');
    startPolling(sessionId);
  }
  
  /**
   * Start Server-Sent Events (SSE) connection
   */
  function startSSE(sessionId) {
    try {
      // Create EventSource
      eventSource = new EventSource(`/api/import/progress/${sessionId}`);
      
      // Set up event listeners
      eventSource.addEventListener('open', () => {
        console.log('🔧 Progress Window Fix: SSE connection opened');
      });
      
      eventSource.addEventListener('error', (error) => {
        console.error('🔧 Progress Window Fix: SSE connection error', error);
        
        // Close the connection
        eventSource.close();
        eventSource = null;
        
        // Fall back to polling
        startPolling(sessionId);
      });
      
      eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🔧 Progress Window Fix: SSE progress update', data);
          handleProgressUpdate(data);
        } catch (error) {
          console.error('🔧 Progress Window Fix: Error parsing SSE message', error);
        }
      });
      
      eventSource.addEventListener('complete', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🔧 Progress Window Fix: SSE import complete', data);
          handleImportComplete(data);
        } catch (error) {
          console.error('🔧 Progress Window Fix: Error parsing SSE complete message', error);
        }
      });
      
      eventSource.addEventListener('error', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🔧 Progress Window Fix: SSE import error', data);
          handleImportError(data);
        } catch (error) {
          console.error('🔧 Progress Window Fix: Error parsing SSE error message', error);
        }
      });
    } catch (error) {
      console.error('🔧 Progress Window Fix: Error setting up SSE connection', error);
      
      // Fall back to polling
      startPolling(sessionId);
    }
  }
  
  /**
   * Start polling for progress updates
   */
  function startPolling(sessionId) {
    // Clear any existing polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    // Set up polling interval
    pollingInterval = setInterval(() => {
      pollProgress(sessionId);
    }, POLLING_INTERVAL);
    
    // Start first poll immediately
    pollProgress(sessionId);
  }
  
  /**
   * Poll for progress updates
   */
  function pollProgress(sessionId) {
    // Check if we should continue polling
    if (!currentSessionId || currentSessionId !== sessionId) {
      console.log('🔧 Progress Window Fix: Stopping progress polling for session', sessionId);
      clearInterval(pollingInterval);
      return;
    }
    
    // Fetch progress update
    fetch(`/api/import/status`)
      .then(response => response.json())
      .then(data => {
        console.log('🔧 Progress Window Fix: Polling progress update', data);
        
        // Handle progress update
        handleProgressUpdate({
          status: data.status,
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
          
          // Handle import complete
          handleImportComplete({
            status: data.status,
            success: data.status === 'completed',
            stats: {
              processed: data.progress?.current || 0,
              total: data.progress?.total || 0,
              success: data.statistics?.processed - (data.statistics?.errors || 0) - (data.statistics?.warnings || 0) || 0,
              failed: data.statistics?.errors || 0,
              skipped: data.statistics?.warnings || 0
            }
          });
        }
      })
      .catch(error => {
        console.error('🔧 Progress Window Fix: Error polling progress', error);
      });
  }
  
  /**
   * Handle progress update
   */
  function handleProgressUpdate(data) {
    // Update progress UI
    updateProgressUI({
      status: data.status || 'running',
      message: getStatusMessage(data.status || 'running'),
      total: data.total || 0,
      processed: data.processed || 0,
      success: data.success || 0,
      failed: data.failed || 0,
      skipped: data.skipped || 0,
      percentage: data.percentage || calculatePercentage(data.processed, data.total)
    });
  }
  
  /**
   * Handle import complete
   */
  function handleImportComplete(data) {
    // Clear session ID
    currentSessionId = null;
    
    // Clean up connections
    cleanupConnections();
    
    // Update progress UI with completion state
    updateProgressUI({
      status: data.status || (data.success ? 'completed' : 'failed'),
      message: getStatusMessage(data.status || (data.success ? 'completed' : 'failed')),
      total: data.stats?.total || 0,
      processed: data.stats?.processed || 0,
      success: data.stats?.success || 0,
      failed: data.stats?.failed || 0,
      skipped: data.stats?.skipped || 0,
      percentage: 100
    });
    
    // Add completion class to progress container
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
      progressContainer.classList.add('import-' + (data.success ? 'completed' : 'failed'));
    }
    
    // Auto-hide after delay for successful imports
    if (data.success && data.stats?.failed === 0) {
      setTimeout(() => {
        hideProgressContainer();
      }, 5000);
    }
  }
  
  /**
   * Handle import error
   */
  function handleImportError(data) {
    // Update progress UI with error state
    updateProgressUI({
      status: 'failed',
      message: data.error || 'Import failed',
      statusDetails: data.details || 'An error occurred during import'
    });
    
    // Add error class to progress container
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
      progressContainer.classList.add('import-failed');
    }
  }
  
  /**
   * Clean up connections
   */
  function cleanupConnections() {
    // Clear polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    
    // Close SSE connection
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    
    // Unregister from WebSocket
    if (socket && socket.connected && currentSessionId) {
      socket.emit('unregister-session', currentSessionId);
    }
  }
  
  /**
   * Set up close button handler
   */
  function setupCloseButtonHandler() {
    const progressContainer = document.getElementById('progress-container');
    if (!progressContainer) return;
    
    const closeButton = progressContainer.querySelector('.close-progress-btn');
    if (closeButton && !closeButton._hasClickHandler) {
      closeButton.addEventListener('click', () => {
        hideProgressContainer();
      });
      closeButton._hasClickHandler = true;
      
      console.log('🔧 Progress Window Fix: Close button handler set up');
    }
  }
  
  /**
   * Set up cancel button handler
   */
  function setupCancelButtonHandler() {
    const progressContainer = document.getElementById('progress-container');
    if (!progressContainer) return;
    
    const cancelButton = progressContainer.querySelector('.cancel-import-btn');
    if (cancelButton && !cancelButton._hasClickHandler) {
      cancelButton.addEventListener('click', () => {
        cancelImport();
      });
      cancelButton._hasClickHandler = true;
      
      console.log('🔧 Progress Window Fix: Cancel button handler set up');
    }
  }
  
  /**
   * Cancel import
   */
  function cancelImport() {
    if (!currentSessionId) return;
    
    console.log('🔧 Progress Window Fix: Cancelling import', currentSessionId);
    
    // Update UI to show cancelling state
    updateProgressUI({
      status: 'cancelling',
      message: 'Cancelling import...',
      statusDetails: 'Please wait while the operation is cancelled'
    });
    
    // Send cancel request
    fetch('/api/import/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId: currentSessionId })
    })
    .then(response => response.json())
    .then(data => {
      console.log('🔧 Progress Window Fix: Import cancelled', data);
      
      // Handle cancel response
      handleImportComplete({
        status: 'cancelled',
        success: false,
        stats: {
          processed: data.processed || 0,
          total: data.total || 0,
          success: data.success || 0,
          failed: data.failed || 0,
          skipped: data.skipped || 0
        }
      });
    })
    .catch(error => {
      console.error('🔧 Progress Window Fix: Error cancelling import', error);
      
      // Update UI to show error
      updateProgressUI({
        status: 'failed',
        message: 'Failed to cancel import',
        statusDetails: error.message || 'An error occurred while cancelling the import'
      });
    });
  }
  
  /**
   * Show progress container
   */
  function showProgressContainer() {
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
      progressContainer.style.display = 'block';
      progressContainer.classList.add('active');
      
      console.log('🔧 Progress Window Fix: Progress container shown');
    }
  }
  
  /**
   * Hide progress container
   */
  function hideProgressContainer() {
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
      progressContainer.style.display = 'none';
      progressContainer.classList.remove('active');
      
      console.log('🔧 Progress Window Fix: Progress container hidden');
    }
    
    // Clean up connections
    cleanupConnections();
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
      case 'cancelling':
        return 'Cancelling import...';
      default:
        return 'Unknown status';
    }
  }
  
  /**
   * Calculate percentage
   */
  function calculatePercentage(processed, total) {
    if (!processed || !total) return 0;
    return Math.round((processed / total) * 100);
  }
  
  /**
   * Format time in seconds to human readable format
   */
  function formatTime(seconds) {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
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
    
    // Update status details
    const statusDetails = progressContainer.querySelector('.status-details');
    if (statusDetails && data.statusDetails) {
      statusDetails.textContent = data.statusDetails;
    }
    
    // Update stats
    const totalStat = progressContainer.querySelector('.stat-value.total');
    if (totalStat && data.total !== undefined) {
      totalStat.textContent = data.total;
    }
    
    const processedStat = progressContainer.querySelector('.stat-value.processed');
    if (processedStat && data.processed !== undefined) {
      processedStat.textContent = data.processed;
    }
    
    const successStat = progressContainer.querySelector('.stat-value.success');
    if (successStat && data.success !== undefined) {
      successStat.textContent = data.success;
    }
    
    const failedStat = progressContainer.querySelector('.stat-value.failed');
    if (failedStat && data.failed !== undefined) {
      failedStat.textContent = data.failed;
    }
    
    const skippedStat = progressContainer.querySelector('.stat-value.skipped');
    if (skippedStat && data.skipped !== undefined) {
      skippedStat.textContent = data.skipped;
    }
    
    // Update timing
    if (data.startTime) {
      // Store start time for elapsed time calculation
      progressContainer._startTime = data.startTime;
    }
    
    // Update elapsed time
    const elapsedValue = progressContainer.querySelector('.elapsed-value');
    if (elapsedValue && progressContainer._startTime) {
      const elapsed = (Date.now() - progressContainer._startTime) / 1000;
      elapsedValue.textContent = formatTime(elapsed);
    }
    
    // Update ETA
    const etaValue = progressContainer.querySelector('.eta-value');
    if (etaValue && data.processed && data.total && progressContainer._startTime) {
      const elapsed = (Date.now() - progressContainer._startTime) / 1000;
      const rate = data.processed / elapsed; // items per second
      const remaining = data.total - data.processed;
      const eta = rate > 0 ? remaining / rate : 0;
      
      etaValue.textContent = eta > 0 ? formatTime(eta) : 'Calculating...';
    }
  }
  
  // Initialize immediately
  setTimeout(initializeProgressWindowFix, 0);
})();