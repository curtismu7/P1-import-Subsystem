/**
 * Version Loader for Browser
 * 
 * This script loads the version information from the centralized source
 * and makes it available to all scripts via window.APP_VERSION.
 * It should be loaded before any other scripts that need version information.
 */

// Load version from server-side endpoint or use hardcoded fallback
(function() {
  console.log('🔄 Version Loader: Initializing...');
  
  // Set default version (fallback)
  window.APP_VERSION = '7.0.0.20';
  
  // Try to fetch version from server
  fetch('/api/version')
    .then(response => response.json())
    .then(data => {
      if (data && data.version) {
        window.APP_VERSION = data.version;
        console.log(`✅ Version Loader: Set version to ${window.APP_VERSION}`);
        
        // Update any version displays on the page
        updateVersionDisplays();
      }
    })
    .catch(error => {
      console.warn('⚠️ Version Loader: Could not fetch version from server, using default', error);
    });
  
  // Function to update version displays
  function updateVersionDisplays() {
    // Update document title
    if (document.title.includes('PingOne')) {
      document.title = document.title.replace(/v\d+\.\d+\.\d+(\.\d+)?/, `v${window.APP_VERSION}`);
    }
    
    // Update version display elements
    const versionElements = document.querySelectorAll('[data-version]');
    versionElements.forEach(el => {
      el.textContent = `v${window.APP_VERSION}`;
      el.setAttribute('data-version', window.APP_VERSION);
    });
    
    // Update footer version
    const footerVersion = document.querySelector('#version-display');
    if (footerVersion) {
      footerVersion.textContent = `v${window.APP_VERSION}`;
    }
  }
})();
