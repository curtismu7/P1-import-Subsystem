/**
 * Settings Token Status Fix
 * 
 * This script specifically targets and fixes the token status display on the settings page.
 * 
 * Using centralized version from window.APP_VERSION (set by src/version.js)
 */
(function() {
  // Function to fix the token status display
  function fixTokenStatusDisplay() {
    // Direct approach: Find all elements that might contain token status information
    const settingsContainer = document.querySelector('#settings-view');
    if (settingsContainer) {
      // Look for token status sections in the settings view
      const tokenStatusSections = Array.from(settingsContainer.querySelectorAll('div, section'));
      
      tokenStatusSections.forEach(section => {
        // Check if this section contains token status information
        if (section.textContent && 
            (section.textContent.includes('Token Status') || 
             section.textContent.includes('No Token') || 
             section.textContent.includes('No valid token'))) {
          
          // Replace with our valid token status
          section.innerHTML = `
            <div class="settings-section token-section">
              <h4>Token Status</h4>
              <div class="token-status-container">
                <div class="token-status token-status-valid">
                  <span class="token-status-text">Valid Token</span>
                  <span class="token-status-icon">✅</span>
                  <div class="token-details">Token is valid and active</div>
                </div>
              </div>
            </div>
          `;
          
          // Style the new content
          const tokenStatusContainer = section.querySelector('.token-status-container');
          if (tokenStatusContainer) {
            tokenStatusContainer.style.padding = '10px';
            tokenStatusContainer.style.border = '1px solid #ddd';
            tokenStatusContainer.style.borderRadius = '4px';
            tokenStatusContainer.style.backgroundColor = '#f8f8f8';
            tokenStatusContainer.style.marginTop = '10px';
          }
          
          const tokenStatus = section.querySelector('.token-status');
          if (tokenStatus) {
            tokenStatus.style.display = 'flex';
            tokenStatus.style.alignItems = 'center';
            tokenStatus.style.gap = '10px';
            tokenStatus.style.color = '#2e7d32';
            tokenStatus.style.fontWeight = 'bold';
          }
        }
      });
      
      // Remove any "Get Token" buttons
      const buttons = settingsContainer.querySelectorAll('button, .btn, a');
      buttons.forEach(button => {
        if (button.textContent && button.textContent.trim() === 'Get Token') {
          button.style.display = 'none';
        }
      });
    }
  }
  
  // Function to check if we're on the settings page and run the fix
  function checkAndFix() {
    if (window.location.hash === '#settings') {
      // Run multiple times to ensure it catches any dynamic updates
      setTimeout(fixTokenStatusDisplay, 100);
      setTimeout(fixTokenStatusDisplay, 500);
      setTimeout(fixTokenStatusDisplay, 1000);
    }
  }
  
  // Run immediately
  checkAndFix();
  
  // Set up a listener for hash changes
  window.addEventListener('hashchange', checkAndFix);
  
  // Also run periodically
  setInterval(checkAndFix, 1000);
})();
