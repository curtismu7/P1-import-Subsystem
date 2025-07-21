/**
 * File Handling Fix
 * 
 * This script fixes file handling issues in the import view.
 * It ensures that file uploads work correctly and displays appropriate messages.
 */
(function() {
  console.log('🔧 File Handling Fix: Initializing...');
  
  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', initializeFileHandlingFix);
  
  // Also try to initialize immediately if DOM is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initializeFileHandlingFix, 100);
  }
  
  /**
   * Initialize the file handling fix
   */
  function initializeFileHandlingFix() {
    console.log('🔧 File Handling Fix: Initialized');
    
    // Set up file input handler
    setupFileInputHandler();
    
    // Set up drag and drop handler
    setupDragAndDropHandler();
    
    // Set up start import button handler
    setupStartImportHandler();
    
    // Set up population select change listener
    setupPopulationSelectListener();
    
    // Set up periodic check for button state
    setInterval(updateStartImportButtonState, 1000);
  }
  
  /**
   * Set up file input handler
   */
  function setupFileInputHandler() {
    const fileInput = document.getElementById('csv-file');
    if (!fileInput) {
      console.warn('🔧 File Handling Fix: File input element not found');
      return;
    }
    
    // Remove existing event listeners
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    
    // Add new event listener
    newFileInput.addEventListener('change', handleFileSelection);
    
    console.log('🔧 File Handling Fix: File input handler set up');
  }
  
  /**
   * Set up drag and drop handler
   */
  function setupDragAndDropHandler() {
    const dropZone = document.getElementById('import-drop-zone');
    if (!dropZone) {
      console.warn('🔧 File Handling Fix: Drop zone element not found');
      return;
    }
    
    // Remove existing event listeners
    const newDropZone = dropZone.cloneNode(true);
    dropZone.parentNode.replaceChild(newDropZone, dropZone);
    
    // Add new event listeners
    newDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      newDropZone.classList.add('dragover');
    });
    
    newDropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      newDropZone.classList.remove('dragover');
    });
    
    newDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      newDropZone.classList.remove('dragover');
      handleFileDrop(e);
    });
    
    newDropZone.addEventListener('click', (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('csv-file');
      if (fileInput) {
        fileInput.click();
      }
    });
    
    console.log('🔧 File Handling Fix: Drag and drop handler set up');
  }
  
  /**
   * Set up start import button handler
   */
  function setupStartImportHandler() {
    const startImportButton = document.getElementById('start-import');
    if (!startImportButton) {
      console.warn('🔧 File Handling Fix: Start import button not found');
      return;
    }
    
    // Remove existing event listeners
    const newStartImportButton = startImportButton.cloneNode(true);
    startImportButton.parentNode.replaceChild(newStartImportButton, startImportButton);
    
    // Add new event listener
    newStartImportButton.addEventListener('click', handleStartImport);
    
    console.log('🔧 File Handling Fix: Start import button handler set up');
  }
  
  /**
   * Set up population select change listener
   */
  function setupPopulationSelectListener() {
    const populationSelect = document.getElementById('import-population-select');
    if (!populationSelect) {
      console.warn('🔧 File Handling Fix: Population select not found');
      return;
    }
    
    // Add change event listener
    populationSelect.addEventListener('change', () => {
      console.log('🔧 File Handling Fix: Population selection changed');
      updateStartImportButtonState();
    });
    
    console.log('🔧 File Handling Fix: Population select listener set up');
  }
  
  /**
   * Handle file selection from file input
   */
  function handleFileSelection(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('🔧 File Handling Fix: File selected', file.name);
    
    // Display file info
    displayFileInfo(file);
    
    // Update button state
    updateStartImportButtonState();
  }
  
  /**
   * Handle file drop
   */
  function handleFileDrop(e) {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    console.log('🔧 File Handling Fix: File dropped', file.name);
    
    // Set the file input value
    const fileInput = document.getElementById('csv-file');
    if (fileInput) {
      // Create a DataTransfer object to set the file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
    }
    
    // Display file info
    displayFileInfo(file);
    
    // Update button state
    updateStartImportButtonState();
  }
  
  /**
   * Display file information
   */
  function displayFileInfo(file) {
    const fileInfo = document.getElementById('file-info');
    if (!fileInfo) return;
    
    // Format file size
    const sizeInKB = Math.round(file.size / 1024);
    const sizeFormatted = sizeInKB < 1024 ? `${sizeInKB} KB` : `${(sizeInKB / 1024).toFixed(2)} MB`;
    
    // Display file info
    fileInfo.innerHTML = `
      <div class="file-info-content">
        <div class="file-info-icon">
          <i class="fas fa-file-csv"></i>
        </div>
        <div class="file-info-details">
          <div class="file-name">${file.name}</div>
          <div class="file-meta">
            <span class="file-size">${sizeFormatted}</span>
            <span class="file-type">${file.type || 'text/csv'}</span>
          </div>
        </div>
        <div class="file-actions">
          <button class="btn btn-sm btn-outline-danger remove-file" title="Remove file">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
    
    // Add remove file handler
    const removeButton = fileInfo.querySelector('.remove-file');
    if (removeButton) {
      removeButton.addEventListener('click', () => {
        // Clear file input
        const fileInput = document.getElementById('csv-file');
        if (fileInput) {
          fileInput.value = '';
        }
        
        // Clear file info
        fileInfo.innerHTML = '';
        
        // Update button state
        updateStartImportButtonState();
      });
    }
  }
  
  /**
   * Update start import button state
   */
  function updateStartImportButtonState() {
    const startImportButton = document.getElementById('start-import');
    if (!startImportButton) return;
    
    // Check if file is selected
    const fileInput = document.getElementById('csv-file');
    const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
    
    // Check if population is selected
    const populationSelect = document.getElementById('import-population-select');
    const hasPopulation = populationSelect && populationSelect.value && populationSelect.value !== '';
    
    // Enable button only if both file and population are selected
    startImportButton.disabled = !(hasFile && hasPopulation);
    
    console.log('🔧 File Handling Fix: Updated start import button state', { hasFile, hasPopulation });
    
    // Force enable the button if both conditions are met
    if (hasFile && hasPopulation && startImportButton.disabled) {
      console.log('🔧 File Handling Fix: Forcing button enable');
      startImportButton.disabled = false;
    }
  }
  
  /**
   * Handle start import button click
   */
  function handleStartImport() {
    console.log('🔧 File Handling Fix: Start import clicked');
    
    try {
      // Get file
      const fileInput = document.getElementById('csv-file');
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) {
        displayNotification('error', 'Please select a file to import');
        return;
      }
      
      // Get population
      const populationSelect = document.getElementById('import-population-select');
      const populationId = populationSelect && populationSelect.value;
      if (!populationId) {
        displayNotification('error', 'Please select a population');
        return;
      }
      
      // Get import options
      const skipDuplicates = document.getElementById('skip-duplicates')?.checked || false;
      const skipDuplicatesUsername = document.getElementById('skip-duplicates-username')?.checked || false;
      
      // Show progress UI
      const progressContainer = document.getElementById('progress-container');
      if (progressContainer) {
        progressContainer.style.display = 'block';
      } else {
        console.error('🔧 File Handling Fix: Progress container not found');
        displayNotification('warning', 'Progress display not available');
      }
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('populationId', populationId);
      formData.append('skipDuplicates', skipDuplicates);
      formData.append('skipDuplicatesUsername', skipDuplicatesUsername);
      
      // Send import request
      fetch('/api/import', {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Import failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('🔧 File Handling Fix: Import started successfully', data);
        
        // Update progress UI
        updateProgressUI({
          status: 'started',
          message: 'Import started successfully',
          total: data.total || 0
        });
        
        // Show success notification
        displayNotification('success', 'Import started successfully');
      })
      .catch(error => {
        console.error('🔧 File Handling Fix: Import failed', error);
        
        // Hide progress UI
        if (progressContainer) {
          progressContainer.style.display = 'none';
        }
        
        // Show error notification
        displayNotification('error', `Import failed: ${error.message}`);
      });
    } catch (error) {
      console.error('🔧 File Handling Fix: Unexpected error during import', error);
      displayNotification('error', `Unexpected error: ${error.message}`);
    }
  }
  
  /**
   * Update progress UI
   */
  function updateProgressUI(data) {
    const progressContainer = document.getElementById('progress-container');
    if (!progressContainer) {
      console.error('🔧 File Handling Fix: Progress container not found for updating');
      return;
    }
    
    // Update progress bar
    const progressBar = progressContainer.querySelector('.progress-bar-fill');
    if (progressBar) {
      const progress = data.processed ? (data.processed / data.total) * 100 : 0;
      progressBar.style.width = `${progress}%`;
    }
    
    // Update progress percentage
    const progressPercentage = progressContainer.querySelector('.progress-percentage');
    if (progressPercentage) {
      const progress = data.processed ? (data.processed / data.total) * 100 : 0;
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
      progressText.textContent = data.processed ? `${data.processed} of ${data.total} processed` : '';
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
  }
  
  /**
   * Display notification to user
   * Safe implementation that doesn't rely on global objects
   */
  function displayNotification(type, message) {
    console.log(`🔧 File Handling Fix: ${type.toUpperCase()} - ${message}`);
    
    // Create a notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">
          <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        </div>
        <div class="notification-message">${message}</div>
        <button class="notification-close" title="Dismiss">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    // Style the notification
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.maxWidth = '400px';
    notification.style.padding = '15px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.style.animation = 'fadeIn 0.3s ease-out';
    
    if (type === 'error') {
      notification.style.backgroundColor = '#f8d7da';
      notification.style.color = '#721c24';
      notification.style.borderLeft = '5px solid #dc3545';
    } else if (type === 'success') {
      notification.style.backgroundColor = '#d4edda';
      notification.style.color = '#155724';
      notification.style.borderLeft = '5px solid #28a745';
    } else if (type === 'warning') {
      notification.style.backgroundColor = '#fff3cd';
      notification.style.color = '#856404';
      notification.style.borderLeft = '5px solid #ffc107';
    } else {
      notification.style.backgroundColor = '#d1ecf1';
      notification.style.color = '#0c5460';
      notification.style.borderLeft = '5px solid #17a2b8';
    }
    
    // Style the notification content
    const content = notification.querySelector('.notification-content');
    content.style.display = 'flex';
    content.style.alignItems = 'center';
    
    // Style the icon
    const icon = notification.querySelector('.notification-icon');
    icon.style.marginRight = '10px';
    icon.style.fontSize = '1.5em';
    
    // Style the close button
    const closeButton = notification.querySelector('.notification-close');
    closeButton.style.marginLeft = 'auto';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '1em';
    closeButton.style.opacity = '0.7';
    closeButton.style.padding = '0';
    closeButton.style.color = 'inherit';
    
    // Add hover effect to close button
    closeButton.addEventListener('mouseover', () => {
      closeButton.style.opacity = '1';
    });
    closeButton.addEventListener('mouseout', () => {
      closeButton.style.opacity = '0.7';
    });
    
    // Add close button functionality
    closeButton.addEventListener('click', () => {
      document.body.removeChild(notification);
    });
    
    // Add to document
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds for success and info notifications
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        if (document.body.contains(notification)) {
          // Add fade out animation
          notification.style.animation = 'fadeOut 0.3s ease-in';
          notification.style.opacity = '0';
          
          // Remove after animation completes
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 300);
        }
      }, 5000);
    }
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Initial button state update
  setTimeout(updateStartImportButtonState, 500);
  setTimeout(updateStartImportButtonState, 1000);
  setTimeout(updateStartImportButtonState, 2000);
})();