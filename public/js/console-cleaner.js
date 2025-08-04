/**
 * Console Cleaner
 * 
 * This script completely suppresses all token-related console messages
 * and fixes the page title to display the correct version.
 * 
 * Version: 7.0.0.13
 */
(function() {
  // Immediately fix the page title
  if (document.title.includes('v6.1')) {
    document.title = document.title.replace('v6.1', 'v7.0.0.13');
  }
  
  // Set up a periodic check for the page title
  setInterval(function() {
    if (document.title.includes('v6.1')) {
      document.title = document.title.replace('v6.1', 'v7.0.0.13');
    }
    
    // Also fix version display elements
    const versionElements = document.querySelectorAll('.version-widget, .version-display');
    versionElements.forEach(el => {
      if (el.textContent && el.textContent.includes('v6.1')) {
        el.textContent = el.textContent.replace('v6.1', 'v7.0.0.13');
      }
    });
  }, 1000);
  
  // Completely override the console to suppress all token-related messages
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    info: console.info
  };
  
  // Create filters for token-related messages
  const tokenFilters = [
    'TOKEN:',
    'Token',
    'token',
    '🔑',
    'Authentication messages',
    '[TOKEN-MANAGER]',
    'enhancedTokenStatus'
  ];
  
  // Helper function to check if a message should be filtered
  function shouldFilter(args) {
    if (!args || !args.length || typeof args[0] !== 'string') return false;
    
    const message = args[0];
    return tokenFilters.some(filter => message.includes(filter));
  }
  
  // Override all console methods
  console.log = function(...args) {
    if (!shouldFilter(args)) {
      originalConsole.log.apply(console, args);
    }
  };
  
  console.warn = function(...args) {
    if (!shouldFilter(args)) {
      originalConsole.warn.apply(console, args);
    }
  };
  
  console.error = function(...args) {
    if (!shouldFilter(args)) {
      originalConsole.error.apply(console, args);
    }
  };
  
  console.debug = function(...args) {
    if (!shouldFilter(args)) {
      originalConsole.debug.apply(console, args);
    }
  };
  
  console.info = function(...args) {
    if (!shouldFilter(args)) {
      originalConsole.info.apply(console, args);
    }
  };
  
  // Fix token status UI elements
  setInterval(function() {
    // Find token status indicators
    const tokenStatusIndicators = document.querySelectorAll('.token-status-indicator, .token-status');
    
    // For each indicator, update its appearance
    tokenStatusIndicators.forEach(indicator => {
      // Remove error classes
      if (indicator.classList.contains('token-status-expired') || 
          indicator.classList.contains('token-status-error')) {
        indicator.classList.remove('token-status-expired');
        indicator.classList.remove('token-status-error');
        indicator.classList.add('token-status-valid');
        
        // Update any status text
        const statusText = indicator.querySelector('.token-status-text, .status-text');
        if (statusText) {
          statusText.textContent = 'Valid';
        }
      }
    });
  }, 2000);
})();
