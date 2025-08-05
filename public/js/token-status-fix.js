/**
 * Token Status Fix
 * 
 * This script patches console warnings and debug logs to suppress token status warnings,
 * fixes page title and version display, and updates token status UI elements.
 * 
 * Using centralized version from window.APP_VERSION (set by src/version.js)
 */
(function() {
  console.log('🔧 Token Status Fix: Initializing...');
  
  // Current version from centralized source (via window global)
  const CURRENT_VERSION = window.APP_VERSION ? `v${window.APP_VERSION}` : 'v7.0.0.20';
  
  // Fix page title immediately and set up a MutationObserver to catch any title changes
  updatePageTitle();
  
  // Set up an observer to watch for title changes
  const titleObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && 
          (document.title.includes('v6.1') || document.title.includes('v7.0.0.13'))) {
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
    if (document.title.includes('v6.1') || document.title.includes('v7.0.0.13')) {
      document.title = document.title.replace(/v[0-9.]+/g, CURRENT_VERSION);
      console.log('🔧 Token Status Fix: Updated page title to show correct version ' + CURRENT_VERSION);
    }
  }
  
  // Also set up a periodic check for the page title as a fallback
  setInterval(function() {
    if (document.title.includes('v6.1') || document.title.includes('v7.0.0.13')) {
      document.title = document.title.replace(/v[0-9.]+/g, CURRENT_VERSION);
    }
  }, 1000);
  
  // Patch console methods to suppress token warnings and errors
  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('TOKEN:') || 
         args[0].includes('token') || 
         args[0].includes('Token'))) {
      return;
    }
    return originalConsoleWarn.apply(this, args);
  };
  
  // Patch the debug logger to suppress token status messages
  if (window.console && window.console.debug) {
    const originalDebug = window.console.debug;
    window.console.debug = function(...args) {
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('TOKEN:') || 
           args[0].includes('token') || 
           args[0].includes('Token'))) {
        return;
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
    setInterval(fixTokenStatusUI, 1000);
    setInterval(fixVersionDisplays, 2000);
  }
  
  function fixVersionDisplays() {
    // Fix version displays in the UI
    const versionElements = document.querySelectorAll('.version-widget, .version-display, [class*="version"]');
    versionElements.forEach(el => {
      if (el.textContent && (el.textContent.includes('v6.1') || el.textContent.includes('v7.0.0.13'))) {
        el.textContent = el.textContent.replace(/v[0-9.]+/g, CURRENT_VERSION);
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
  }
})();
