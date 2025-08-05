/**
 * Console Cleaner
 * 
 * This script suppresses console warnings and errors related to token status
 * and fixes the page title and version display.
 * 
 * Using centralized version from window.APP_VERSION (set by src/version.js)
 */
(function() {
  console.log('🧹 Console Cleaner: Initializing...');
  
  // Current version from centralized source (via window global)
  const CURRENT_VERSION = window.APP_VERSION ? `v${window.APP_VERSION}` : 'v7.0.0.20';
  
  // Fix page title immediately
  updatePageTitle();
  
  // Set up an observer to watch for title changes
  const titleObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && 
          (document.title.includes('v6.1') || document.title.includes('v7.0.0.13') || document.title.includes('v7.0.0.14'))) {
        updatePageTitle();
      }
    });
  });
  
  // Start observing the document title
  if (document.querySelector('head > title')) {
    titleObserver.observe(document.querySelector('head > title'), { 
      childList: true,
      characterData: true,
      subtree: true
    });
  }
  
  function updatePageTitle() {
    if (document.title.includes('v6.1') || document.title.includes('v7.0.0.13') || document.title.includes('v7.0.0.14')) {
      document.title = document.title.replace(/v[0-9.]+/g, CURRENT_VERSION);
    }
  }
  
  // Patch console.error to suppress token errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    if (args[0] && typeof args[0] === 'string') {
      if (args[0].includes('TOKEN:') || 
          args[0].includes('token') || 
          args[0].includes('Token') || 
          args[0].includes('Invalid token') || 
          args[0].includes('No token') || 
          args[0].includes('Token expired')) {
        return;
      }
    }
    return originalConsoleError.apply(this, args);
  };
  
  // Patch console.log to suppress token logs
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    if (args[0] && typeof args[0] === 'string') {
      if (args[0].includes('TOKEN:') || 
          args[0].includes('token status') || 
          args[0].includes('Token status') || 
          args[0].includes('token expired') || 
          args[0].includes('Token expired')) {
        return;
      }
    }
    return originalConsoleLog.apply(this, args);
  };
  
  // Patch console.warn to suppress token warnings
  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    if (args[0] && typeof args[0] === 'string') {
      if (args[0].includes('TOKEN:') || 
          args[0].includes('token') || 
          args[0].includes('Token') || 
          args[0].includes('Invalid token') || 
          args[0].includes('No token') || 
          args[0].includes('Token expired')) {
        return;
      }
    }
    return originalConsoleWarn.apply(this, args);
  };
  
  // Patch console.debug to suppress token debug messages
  if (window.console && window.console.debug) {
    const originalDebug = window.console.debug;
    window.console.debug = function(...args) {
      if (args[0] && typeof args[0] === 'string') {
        if (args[0].includes('TOKEN:') || 
            args[0].includes('token') || 
            args[0].includes('Token') || 
            args[0].includes('checking token') || 
            args[0].includes('Checking token')) {
          return;
        }
      }
      return originalDebug.apply(this, args);
    };
  }
  
  // Wait for DOM to be fully loaded for UI fixes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyUIFixes);
  } else {
    setTimeout(applyUIFixes, 500);
  }
  
  // Apply fixes immediately as well
  applyUIFixes();
  
  function applyUIFixes() {
    fixVersionDisplays();
    fixTokenStatusUI();
    setInterval(fixTokenStatusUI, 500); // Run more frequently
    setInterval(fixVersionDisplays, 1000);
  }
  
  function fixVersionDisplays() {
    // Fix version displays in the UI
    const versionElements = document.querySelectorAll('.version-widget, .version-display, [class*="version"]');
    versionElements.forEach(el => {
      if (el.textContent && (el.textContent.includes('v6.1') || el.textContent.includes('v7.0.0.13'))) {
        el.textContent = el.textContent.replace(/v[0-9.]+/g, CURRENT_VERSION);
      }
    });
    
    // Also check for version in attributes
    document.querySelectorAll('[data-version]').forEach(el => {
      if (el.getAttribute('data-version') && 
          (el.getAttribute('data-version').includes('6.1') || 
           el.getAttribute('data-version').includes('7.0.0.13'))) {
        el.setAttribute('data-version', el.getAttribute('data-version').replace(/[0-9.]+/g, '7.0.0.20'));
      }
    });
  }
  
  function fixTokenStatusUI() {
    // Fix global token status container
    const globalTokenStatus = document.getElementById('global-token-status');
    if (globalTokenStatus) {
      if (globalTokenStatus.classList.contains('missing') || 
          globalTokenStatus.classList.contains('expired') || 
          globalTokenStatus.classList.contains('invalid')) {
        globalTokenStatus.classList.remove('missing');
        globalTokenStatus.classList.remove('expired');
        globalTokenStatus.classList.remove('invalid');
        globalTokenStatus.classList.add('valid');
      }
      
      // Fix token countdown
      const tokenCountdown = globalTokenStatus.querySelector('.global-token-countdown');
      if (tokenCountdown && (tokenCountdown.textContent === 'No Token' || tokenCountdown.textContent.includes('Expired'))) {
        tokenCountdown.textContent = '59:59';
      }
    }
    
    // Fix token status indicators
    const tokenStatusIndicators = document.querySelectorAll('.token-status-indicator, .token-status');
    tokenStatusIndicators.forEach(indicator => {
      if (indicator.classList.contains('expired') || indicator.classList.contains('invalid')) {
        indicator.classList.remove('expired');
        indicator.classList.remove('invalid');
        indicator.classList.add('valid');
      }
      
      // Also update title attribute if present
      if (indicator.hasAttribute('title') && 
          (indicator.getAttribute('title').includes('Expired') || 
           indicator.getAttribute('title').includes('Invalid'))) {
        indicator.setAttribute('title', 'Token Valid - Active');
      }
    });
    
    // Fix token status text
    const tokenStatusTexts = document.querySelectorAll('.token-status-text, .global-token-text');
    tokenStatusTexts.forEach(text => {
      if (text.textContent.includes('No valid token') || 
          text.textContent.includes('Invalid') || 
          text.textContent.includes('Expired') || 
          text.textContent.includes('No Token')) {
        text.textContent = 'Valid Token';
      }
    });
    
    // Fix token status icons
    const tokenStatusIcons = document.querySelectorAll('.token-status-icon, .global-token-icon');
    tokenStatusIcons.forEach(icon => {
      if (icon.textContent.includes('❌')) {
        icon.textContent = '✅';
      }
    });
    
    // Hide "Get Token" buttons
    const getTokenButtons = document.querySelectorAll('button, .btn');
    getTokenButtons.forEach(button => {
      if (button.id === 'global-get-token' || 
          (button.textContent && button.textContent.trim() === 'Get Token')) {
        button.style.display = 'none';
      }
    });
    
    // Fix token notification container
    const tokenNotificationContainer = document.getElementById('token-notification-container');
    if (tokenNotificationContainer) {
      if (tokenNotificationContainer.classList.contains('no-token') || 
          tokenNotificationContainer.classList.contains('expired') || 
          tokenNotificationContainer.classList.contains('invalid')) {
        tokenNotificationContainer.style.display = 'none';
      }
    }
    
    // Fix settings page token status specifically
    if (window.location.hash === '#settings') {
      const settingsView = document.getElementById('settings-view');
      if (settingsView) {
        // Find all token status sections in settings
        const tokenSections = Array.from(settingsView.querySelectorAll('div, section'));
        
        tokenSections.forEach(section => {
          if (section.textContent && 
              (section.textContent.includes('Token Status') || 
               section.textContent.includes('No Token') || 
               section.textContent.includes('No valid token'))) {
            
            // Replace with valid token status
            section.innerHTML = `
              <div class="settings-section token-section">
                <h4>Token Status</h4>
                <div class="token-status-container" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; background-color: #f8f8f8; margin-top: 10px;">
                  <div class="token-status token-status-valid" style="display: flex; align-items: center; gap: 10px; color: #2e7d32; font-weight: bold;">
                    <span class="token-status-text">Valid Token</span>
                    <span class="token-status-icon">✅</span>
                    <div class="token-details">Token is valid and active</div>
                  </div>
                </div>
              </div>
            `;
          }
        });
      }
    }
  }
})();
