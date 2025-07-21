/**
 * Token Logging Enhancement
 * 
 * This script enhances token logging throughout the application.
 * It logs token-related events to the console, UI log, and client log.
 */
(function() {
  console.log('🔑 Token Logging Enhancement: Initializing...');
  
  // Configuration
  const LOG_LEVELS = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    DEBUG: 'debug'
  };
  
  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', initializeTokenLogging);
  
  // Also try to initialize immediately if DOM is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initializeTokenLogging, 100);
  }
  
  /**
   * Initialize token logging
   */
  function initializeTokenLogging() {
    console.log('🔑 Token Logging Enhancement: Initialized');
    
    // Set up event listeners for token-related events
    setupTokenEventListeners();
    
    // Patch token-related functions
    patchTokenFunctions();
    
    // Set up periodic token status check
    setInterval(checkAndLogTokenStatus, 60000); // Check every minute
    
    // Initial token status check
    setTimeout(checkAndLogTokenStatus, 2000);
  }
  
  /**
   * Set up event listeners for token-related events
   */
  function setupTokenEventListeners() {
    // Listen for credential modal events
    document.addEventListener('credentials-modal-completed', (event) => {
      logTokenEvent(LOG_LEVELS.INFO, 'Credentials modal completed', {
        useExistingToken: event.detail?.useExistingToken || false,
        tokenAcquired: event.detail?.tokenAcquired || false
      });
    });
    
    // Listen for token refresh events
    document.addEventListener('token-refreshed', (event) => {
      logTokenEvent(LOG_LEVELS.INFO, 'Token refreshed', {
        expiresIn: event.detail?.expiresIn || 'unknown',
        tokenType: event.detail?.tokenType || 'Bearer'
      });
    });
    
    // Listen for token expiration events
    document.addEventListener('token-expired', (event) => {
      logTokenEvent(LOG_LEVELS.WARN, 'Token expired', {
        tokenId: event.detail?.tokenId || 'unknown'
      });
    });
    
    // Listen for token error events
    document.addEventListener('token-error', (event) => {
      logTokenEvent(LOG_LEVELS.ERROR, 'Token error', {
        error: event.detail?.error || 'Unknown error',
        code: event.detail?.code || 'UNKNOWN'
      });
    });
    
    console.log('🔑 Token Logging Enhancement: Event listeners set up');
  }
  
  /**
   * Patch token-related functions to add logging
   */
  function patchTokenFunctions() {
    // Wait for app to be initialized
    const waitForApp = setInterval(() => {
      if (window.app) {
        clearInterval(waitForApp);
        
        // Patch token manager if available
        if (window.app.tokenManager) {
          patchTokenManager(window.app.tokenManager);
        }
        
        // Patch auth management subsystem if available
        if (window.app.subsystems && window.app.subsystems.authManager) {
          patchAuthManager(window.app.subsystems.authManager);
        }
        
        // Patch global token manager if available
        if (window.app.subsystems && window.app.subsystems.globalTokenManager) {
          patchGlobalTokenManager(window.app.subsystems.globalTokenManager);
        }
        
        console.log('🔑 Token Logging Enhancement: Token functions patched');
      }
    }, 500);
  }
  
  /**
   * Patch token manager
   */
  function patchTokenManager(tokenManager) {
    if (!tokenManager) return;
    
    // Patch getAccessToken
    const originalGetAccessToken = tokenManager.getAccessToken;
    tokenManager.getAccessToken = async function(...args) {
      logTokenEvent(LOG_LEVELS.INFO, 'Getting access token', {
        source: 'TokenManager',
        args: args.length
      });
      
      try {
        const result = await originalGetAccessToken.apply(this, args);
        
        logTokenEvent(LOG_LEVELS.INFO, 'Access token obtained', {
          source: 'TokenManager',
          tokenType: result?.token_type || 'Bearer',
          expiresIn: result?.expires_in || 'unknown'
        });
        
        return result;
      } catch (error) {
        logTokenEvent(LOG_LEVELS.ERROR, 'Failed to get access token', {
          source: 'TokenManager',
          error: error.message
        });
        throw error;
      }
    };
    
    // Patch refreshToken
    if (tokenManager.refreshToken) {
      const originalRefreshToken = tokenManager.refreshToken;
      tokenManager.refreshToken = async function(...args) {
        logTokenEvent(LOG_LEVELS.INFO, 'Refreshing token', {
          source: 'TokenManager',
          args: args.length
        });
        
        try {
          const result = await originalRefreshToken.apply(this, args);
          
          logTokenEvent(LOG_LEVELS.INFO, 'Token refreshed', {
            source: 'TokenManager',
            tokenType: result?.token_type || 'Bearer',
            expiresIn: result?.expires_in || 'unknown'
          });
          
          return result;
        } catch (error) {
          logTokenEvent(LOG_LEVELS.ERROR, 'Failed to refresh token', {
            source: 'TokenManager',
            error: error.message
          });
          throw error;
        }
      };
    }
  }
  
  /**
   * Patch auth manager
   */
  function patchAuthManager(authManager) {
    if (!authManager) return;
    
    // Patch getToken
    if (authManager.getToken) {
      const originalGetToken = authManager.getToken;
      authManager.getToken = async function(...args) {
        logTokenEvent(LOG_LEVELS.INFO, 'Getting token', {
          source: 'AuthManager',
          args: args.length
        });
        
        try {
          const result = await originalGetToken.apply(this, args);
          
          logTokenEvent(LOG_LEVELS.INFO, 'Token obtained', {
            source: 'AuthManager',
            tokenType: result?.token_type || 'Bearer',
            expiresIn: result?.expires_in || 'unknown'
          });
          
          return result;
        } catch (error) {
          logTokenEvent(LOG_LEVELS.ERROR, 'Failed to get token', {
            source: 'AuthManager',
            error: error.message
          });
          throw error;
        }
      };
    }
    
    // Patch refreshToken
    if (authManager.refreshToken) {
      const originalRefreshToken = authManager.refreshToken;
      authManager.refreshToken = async function(...args) {
        logTokenEvent(LOG_LEVELS.INFO, 'Refreshing token', {
          source: 'AuthManager',
          args: args.length
        });
        
        try {
          const result = await originalRefreshToken.apply(this, args);
          
          logTokenEvent(LOG_LEVELS.INFO, 'Token refreshed', {
            source: 'AuthManager',
            tokenType: result?.token_type || 'Bearer',
            expiresIn: result?.expires_in || 'unknown'
          });
          
          return result;
        } catch (error) {
          logTokenEvent(LOG_LEVELS.ERROR, 'Failed to refresh token', {
            source: 'AuthManager',
            error: error.message
          });
          throw error;
        }
      };
    }
  }
  
  /**
   * Patch global token manager
   */
  function patchGlobalTokenManager(globalTokenManager) {
    if (!globalTokenManager) return;
    
    // Patch getToken
    if (globalTokenManager.getToken) {
      const originalGetToken = globalTokenManager.getToken;
      globalTokenManager.getToken = async function(...args) {
        logTokenEvent(LOG_LEVELS.INFO, 'Getting token', {
          source: 'GlobalTokenManager',
          args: args.length
        });
        
        try {
          const result = await originalGetToken.apply(this, args);
          
          logTokenEvent(LOG_LEVELS.INFO, 'Token obtained', {
            source: 'GlobalTokenManager',
            tokenType: result?.token_type || 'Bearer',
            expiresIn: result?.expires_in || 'unknown'
          });
          
          return result;
        } catch (error) {
          logTokenEvent(LOG_LEVELS.ERROR, 'Failed to get token', {
            source: 'GlobalTokenManager',
            error: error.message
          });
          throw error;
        }
      };
    }
    
    // Patch refreshToken
    if (globalTokenManager.refreshToken) {
      const originalRefreshToken = globalTokenManager.refreshToken;
      globalTokenManager.refreshToken = async function(...args) {
        logTokenEvent(LOG_LEVELS.INFO, 'Refreshing token', {
          source: 'GlobalTokenManager',
          args: args.length
        });
        
        try {
          const result = await originalRefreshToken.apply(this, args);
          
          logTokenEvent(LOG_LEVELS.INFO, 'Token refreshed', {
            source: 'GlobalTokenManager',
            tokenType: result?.token_type || 'Bearer',
            expiresIn: result?.expires_in || 'unknown'
          });
          
          return result;
        } catch (error) {
          logTokenEvent(LOG_LEVELS.ERROR, 'Failed to refresh token', {
            source: 'GlobalTokenManager',
            error: error.message
          });
          throw error;
        }
      };
    }
  }
  
  /**
   * Check and log token status
   */
  function checkAndLogTokenStatus() {
    try {
      // Try to get token status from global token manager
      if (window.app && window.app.subsystems && window.app.subsystems.globalTokenManager) {
        const tokenStatus = window.app.subsystems.globalTokenManager.getTokenStatus();
        if (tokenStatus) {
          const expiresIn = tokenStatus.expiresIn || 0;
          const expiresInMinutes = Math.round(expiresIn / 60);
          
          logTokenEvent(LOG_LEVELS.INFO, 'Token status check', {
            isValid: tokenStatus.isValid || false,
            expiresIn: expiresIn,
            expiresInMinutes: expiresInMinutes,
            expiresAt: tokenStatus.expiresAt || 'unknown'
          });
          
          // Update token status UI
          updateTokenStatusUI(tokenStatus);
          
          return;
        }
      }
      
      // Try to get token status from token manager
      if (window.app && window.app.tokenManager) {
        const tokenStatus = window.app.tokenManager.getTokenStatus();
        if (tokenStatus) {
          const expiresIn = tokenStatus.expiresIn || 0;
          const expiresInMinutes = Math.round(expiresIn / 60);
          
          logTokenEvent(LOG_LEVELS.INFO, 'Token status check', {
            isValid: tokenStatus.isValid || false,
            expiresIn: expiresIn,
            expiresInMinutes: expiresInMinutes,
            expiresAt: tokenStatus.expiresAt || 'unknown'
          });
          
          // Update token status UI
          updateTokenStatusUI(tokenStatus);
          
          return;
        }
      }
      
      // If we get here, we couldn't get token status
      logTokenEvent(LOG_LEVELS.WARN, 'Token status check failed', {
        reason: 'No token manager available'
      });
      
    } catch (error) {
      logTokenEvent(LOG_LEVELS.ERROR, 'Error checking token status', {
        error: error.message
      });
    }
  }
  
  /**
   * Update token status UI
   */
  function updateTokenStatusUI(tokenStatus) {
    // Update global token status indicator
    const globalTokenStatus = document.getElementById('global-token-status');
    if (globalTokenStatus) {
      const tokenIcon = globalTokenStatus.querySelector('.global-token-icon');
      const tokenText = globalTokenStatus.querySelector('.global-token-text');
      const tokenIndicator = document.getElementById('token-status-indicator');
      const tokenCountdown = globalTokenStatus.querySelector('.global-token-countdown');
      
      if (tokenStatus.isValid) {
        // Token is valid
        if (tokenIcon) tokenIcon.textContent = '✅';
        if (tokenText) tokenText.textContent = 'Token is valid';
        if (tokenIndicator) {
          tokenIndicator.className = 'token-status-indicator valid';
          tokenIndicator.title = 'Token is valid';
        }
        
        // Update countdown
        if (tokenCountdown) {
          const expiresInMinutes = Math.round(tokenStatus.expiresIn / 60);
          tokenCountdown.textContent = `${expiresInMinutes} min`;
        }
      } else {
        // Token is invalid
        if (tokenIcon) tokenIcon.textContent = '❌';
        if (tokenText) tokenText.textContent = 'Token is invalid';
        if (tokenIndicator) {
          tokenIndicator.className = 'token-status-indicator invalid';
          tokenIndicator.title = 'Token is invalid';
        }
        
        // Clear countdown
        if (tokenCountdown) {
          tokenCountdown.textContent = '';
        }
      }
    }
  }
  
  /**
   * Log token event to console, UI log, and client log
   */
  function logTokenEvent(level, message, data = {}) {
    // Create log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: `🔑 TOKEN: ${message}`,
      ...data
    };
    
    // Log to console
    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(logEntry.message, data);
        break;
      case LOG_LEVELS.WARN:
        console.warn(logEntry.message, data);
        break;
      case LOG_LEVELS.DEBUG:
        console.debug(logEntry.message, data);
        break;
      default:
        console.log(logEntry.message, data);
    }
    
    // Log to UI log if available
    try {
      if (window.app && window.app.logger) {
        window.app.logger[level](logEntry.message, data);
      }
    } catch (error) {
      console.error('Failed to log to UI logger:', error);
    }
    
    // Log to client log if available
    try {
      if (window.app && window.app.loggingSubsystem) {
        window.app.loggingSubsystem.log(level, logEntry.message, data);
      }
    } catch (error) {
      console.error('Failed to log to client logger:', error);
    }
    
    // Dispatch custom event for other components to listen to
    const event = new CustomEvent('token-log-event', {
      detail: logEntry
    });
    document.dispatchEvent(event);
  }
  
  // Patch credentials modal
  function patchCredentialsModal() {
    // Wait for credentials modal to be available
    const waitForCredentialsModal = setInterval(() => {
      if (window.CredentialsModal) {
        clearInterval(waitForCredentialsModal);
        
        // Patch useCredentials method
        const originalUseCredentials = window.CredentialsModal.prototype.useCredentials;
        if (originalUseCredentials) {
          window.CredentialsModal.prototype.useCredentials = function(...args) {
            // Check if we're reusing an existing token
            const reusingToken = this.hasToken;
            
            if (reusingToken) {
              // Log token reuse
              const tokenExpiresIn = this.tokenExpiresIn || 0;
              const expiresInMinutes = Math.round(tokenExpiresIn / 60);
              
              logTokenEvent(LOG_LEVELS.INFO, 'Reusing existing token', {
                source: 'CredentialsModal',
                expiresIn: tokenExpiresIn,
                expiresInMinutes: expiresInMinutes,
                expiresAt: this.tokenExpiresAt || 'unknown'
              });
            } else {
              // Log new token acquisition
              logTokenEvent(LOG_LEVELS.INFO, 'Using credentials to get new token', {
                source: 'CredentialsModal'
              });
            }
            
            // Call original method
            return originalUseCredentials.apply(this, args);
          };
        }
        
        console.log('🔑 Token Logging Enhancement: Credentials modal patched');
      }
    }, 500);
  }
  
  // Initialize credentials modal patching
  patchCredentialsModal();
  
  // Expose functions globally for debugging
  window.tokenLogging = {
    checkAndLogTokenStatus,
    logTokenEvent
  };
  
  console.log('🔑 Token Logging Enhancement: Setup complete');
})();