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

    // Banner content
    this.banner.innerHTML = `
      <div class="ping-disclaimer-content">
        <div class="ping-disclaimer-text">
          <span class="ping-disclaimer-icon" aria-hidden="true">⚠️</span>
          <div class="ping-disclaimer-message">
            <strong>DISCLAIMER:</strong> This tool is unsupported and provided as-is. 
            Ping Identity is not liable for any harm or data loss. 
            Please backup your PingOne account and test in non-production environments only.
          </div>
        </div>
        <button class="ping-disclaimer-dismiss" id="ping-disclaimer-dismiss" type="button">
          I Understand
        </button>
      </div>
    `;

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
    
    if (dismissButton) {
      // Click to dismiss
      dismissButton.addEventListener('click', () => {
        this.dismissBanner();
      });

      // Keyboard support
      dismissButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.dismissBanner();
        }
      });
    }

    // Auto-hide after 2 seconds if not dismissed
    this.autoHideTimeout = setTimeout(() => {
      if (this.isVisible) {
        this.dismissBanner();
      }
    }, 2000);
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
   */
  dismissBanner() {
    if (!this.banner || !this.isVisible) return;

    // Clear auto-hide timeout
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }

    // Hide banner with animation
    this.banner.classList.add('hide');
    this.isVisible = false;

    // Store dismissal in localStorage
    this.setDismissalStatus(true);

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
    }

    // Remove body class
    document.body.classList.remove('has-disclaimer-banner');
  }

  /**
   * Get dismissal status from localStorage
   * @returns {boolean}
   */
  getDismissalStatus() {
    try {
      const dismissed = localStorage.getItem(this.storageKey);
      return dismissed === 'true';
    } catch (error) {
      console.warn('Could not access localStorage for disclaimer status:', error);
      return false;
    }
  }

  /**
   * Set dismissal status in localStorage
   * @param {boolean} dismissed
   */
  setDismissalStatus(dismissed) {
    try {
      localStorage.setItem(this.storageKey, dismissed.toString());
    } catch (error) {
      console.warn('Could not save disclaimer status to localStorage:', error);
    }
  }

  /**
   * Announce banner to screen readers
   */
  announceToScreenReader() {
    const message = 'Disclaimer: This tool is unsupported and provided as-is. Ping Identity is not liable for any harm or data loss. Please backup your PingOne account and test in non-production environments only.';
    
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
    this.setDismissalStatus(false);
    if (this.banner) {
      this.removeBanner();
    }
    this.init();
  }

  /**
   * Force show banner (for testing)
   */
  forceShow() {
    this.setDismissalStatus(false);
    if (this.banner) {
      this.removeBanner();
    }
    this.init();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DisclaimerBanner;
} else {
  // Browser environment
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