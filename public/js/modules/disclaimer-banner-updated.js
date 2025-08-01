/**
 * Ping Identity Disclaimer Banner Module
 * 
 * Provides a dismissible disclaimer banner that matches Ping Identity's design
 * and automatically hides after user acknowledgment.
 */

class DisclaimerBanner {
  constructor() {
    this.storageKey = 'ping-disclaimer-dismissed';
    this.banner = null;
    this.isVisible = false;
    this.autoHideTimeout = null;
    this.init();
  }

  /**
   * Initialize the disclaimer banner
   */
  init() {
    // Check if banner should be shown
    if (this.shouldShowBanner()) {
      this.createBanner();
      this.showBanner();
    }
  }

  /**
   * Check if the banner should be displayed
   * @returns {boolean}
   */
  shouldShowBanner() {
    // Don't show on internal tools
    const currentPath = window.location.pathname;
    const internalTools = [
      '/api-tester.html',
      '/logs',
      '/test-',
      '/swagger/'
    ];

    // Check if current page is an internal tool
    const isInternalTool = internalTools.some(tool => currentPath.includes(tool));
    if (isInternalTool) {
      return false;
    }

    // Check if banner was previously dismissed
    const dismissed = this.getDismissalStatus();
    return !dismissed;
  }

  /**
   * Create the disclaimer banner HTML
   */
  createBanner() {
    // Create banner element
    this.banner = document.createElement('div');
    this.banner.className = 'ping-disclaimer-banner';
    this.banner.id = 'ping-disclaimer-banner';
    this.banner.setAttribute('role', 'alert');
    this.banner.setAttribute('aria-live', 'polite');

    // Banner content with enhanced styling and don't show again option
    this.banner.innerHTML = `
      <div class="ping-disclaimer-content">
        <div class="ping-disclaimer-text">
          <span class="ping-disclaimer-icon" aria-hidden="true">⚠️</span>
          <div class="ping-disclaimer-message">
            <strong>IMPORTANT DISCLAIMER:</strong> This tool is unsupported and provided as-is. 
            Ping Identity is not liable for any harm or data loss. 
            Please backup your PingOne account and test in non-production environments only.
          </div>
        </div>
        <div class="ping-disclaimer-actions">
          <label class="ping-disclaimer-checkbox">
            <input type="checkbox" id="ping-disclaimer-dont-show" />
            <span>Don't show again</span>
          </label>
          <button class="ping-disclaimer-dismiss" id="ping-disclaimer-dismiss" type="button">
            I Understand
          </button>
        </div>
      </div>
    `;
    
    // Add pulsing animation to make it more attention-grabbing
    this.banner.style.animation = 'ping-disclaimer-pulse 2s infinite';
    
    // Add custom CSS for enhanced visibility
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ping-disclaimer-pulse {
        0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
        100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
      }
      
      .ping-disclaimer-banner {
        background-color: #4caf50 !important;
        border-bottom: 3px solid #2e7d32 !important;
        padding: 12px 20px !important;
        font-size: 16px !important;
        z-index: 9999 !important;
      }
      
      .ping-disclaimer-message strong {
        font-size: 18px !important;
        color: #fff !important;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.2) !important;
      }
      
      .ping-disclaimer-actions {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      
      .ping-disclaimer-checkbox {
        display: flex;
        align-items: center;
        gap: 5px;
        color: white;
        font-size: 14px;
        cursor: pointer;
      }
      
      .ping-disclaimer-dismiss {
        background-color: #fff !important;
        color: #2e7d32 !important;
        font-weight: bold !important;
        padding: 8px 16px !important;
        border: 2px solid #2e7d32 !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        transition: all 0.3s !important;
      }
      
      .ping-disclaimer-dismiss:hover {
        background-color: #2e7d32 !important;
        color: #fff !important;
      }
      
      .ping-disclaimer-attention {
        animation: ping-disclaimer-attention 1s ease-in-out 3 !important;
      }
      
      @keyframes ping-disclaimer-attention {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
    `;
    document.head.appendChild(style);

    // Add banner to page
    document.body.appendChild(this.banner);

    // Add body class for spacing
    document.body.classList.add('has-disclaimer-banner');

    // Bind event listeners
    this.bindEvents();
  }

  /**
   * Bind event listeners for the banner
   */
  bindEvents() {
    const dismissButton = this.banner.querySelector('#ping-disclaimer-dismiss');
    const dontShowCheckbox = this.banner.querySelector('#ping-disclaimer-dont-show');
    
    if (dismissButton) {
      // Click to dismiss
      dismissButton.addEventListener('click', () => {
        // Check if "Don't show again" is checked
        const dontShowAgain = dontShowCheckbox && dontShowCheckbox.checked;
        this.dismissBanner(dontShowAgain);
      });

      // Keyboard support
      dismissButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Check if "Don't show again" is checked
          const dontShowAgain = dontShowCheckbox && dontShowCheckbox.checked;
          this.dismissBanner(dontShowAgain);
        }
      });
    }
    
    // Add keyboard support for checkbox
    if (dontShowCheckbox) {
      dontShowCheckbox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dontShowCheckbox.checked = !dontShowCheckbox.checked;
        }
      });
    }

    // Keep banner visible until user explicitly dismisses it
    // (Auto-hide timeout removed to fix issue with banner disappearing too quickly)
    
    // Add a subtle attention-grabbing effect after 5 seconds if not dismissed
    setTimeout(() => {
      if (this.banner && this.isVisible) {
        this.banner.classList.add('ping-disclaimer-attention');
      }
    }, 5000);
  }

  /**
   * Show the disclaimer banner with animation
   */
  showBanner() {
    if (!this.banner) return;

    // Trigger reflow for animation
    this.banner.offsetHeight;
    
    // Show banner
    this.banner.classList.add('show');
    this.isVisible = true;

    // Announce to screen readers
    this.announceToScreenReader();
  }

  /**
   * Dismiss the disclaimer banner
   * @param {boolean} dontShowAgain - Whether to permanently hide the banner
   */
  dismissBanner(dontShowAgain = false) {
    if (!this.banner || !this.isVisible) return;

    // Clear auto-hide timeout
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }

    // Hide banner with animation
    this.banner.classList.add('hide');
    this.isVisible = false;

    // Store dismissal in localStorage based on "Don't show again" option
    if (dontShowAgain) {
      // Permanent dismissal
      this.setDismissalStatus(true, 'permanent');
      console.log('Banner permanently dismissed');
    } else {
      // Temporary dismissal (will show again on next session)
      this.setDismissalStatus(true, 'session');
      console.log('Banner dismissed for this session');
    }

    // Remove banner after animation
    setTimeout(() => {
      this.removeBanner();
    }, 400);
  }

  /**
   * Remove the banner from DOM
   */
  removeBanner() {
    if (this.banner && this.banner.parentNode) {
      this.banner.parentNode.removeChild(this.banner);
      this.banner = null;

      // Remove body class
      document.body.classList.remove('has-disclaimer-banner');
    }
  }

  /**
   * Get dismissal status from localStorage or sessionStorage
   * @returns {boolean}
   */
  getDismissalStatus() {
    try {
      // Check permanent dismissal first (localStorage)
      const permanentDismissed = localStorage.getItem(this.storageKey);
      if (permanentDismissed === 'true') {
        return true;
      }
      
      // Then check session dismissal (sessionStorage)
      const sessionDismissed = sessionStorage.getItem(this.storageKey);
      return sessionDismissed === 'true';
    } catch (error) {
      console.warn('Could not access storage for disclaimer status:', error);
      return false;
    }
  }

  /**
   * Set dismissal status in localStorage or sessionStorage
   * @param {boolean} dismissed - Whether the banner is dismissed
   * @param {string} type - Type of dismissal: 'permanent' or 'session'
   */
  setDismissalStatus(dismissed, type = 'permanent') {
    try {
      if (type === 'permanent') {
        // Store in localStorage for permanent dismissal
        localStorage.setItem(this.storageKey, dismissed.toString());
      } else {
        // Store in sessionStorage for session-only dismissal
        sessionStorage.setItem(this.storageKey, dismissed.toString());
      }
    } catch (error) {
      console.warn('Could not save disclaimer status to storage:', error);
    }
  }

  /**
   * Announce banner to screen readers
   */
  announceToScreenReader() {
    const message = 'Important Disclaimer: This tool is unsupported and provided as-is. Ping Identity is not liable for any harm or data loss. Please backup your PingOne account and test in non-production environments only.';
    
    // Create temporary element for announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
  }

  /**
   * Reset dismissal status (for testing)
   */
  reset() {
    // Clear both localStorage and sessionStorage
    this.setDismissalStatus(false, 'permanent');
    this.setDismissalStatus(false, 'session');
    
    if (this.banner) {
      this.removeBanner();
    }
    this.init();
  }

  /**
   * Force show banner (for testing)
   */
  forceShow() {
    // Clear both localStorage and sessionStorage
    this.setDismissalStatus(false, 'permanent');
    this.setDismissalStatus(false, 'session');
    
    if (this.banner) {
      this.removeBanner();
    }
    this.init();
  }
}

// Export for use in other modules
export { DisclaimerBanner };
export default DisclaimerBanner;

// Browser global fallback for legacy compatibility
if (typeof window !== 'undefined') {
  window.DisclaimerBanner = DisclaimerBanner;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pingDisclaimerBanner = new DisclaimerBanner();
  });
} else {
  window.pingDisclaimerBanner = new DisclaimerBanner();
}
