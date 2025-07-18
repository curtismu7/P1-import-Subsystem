/**
 * Disclaimer Modal Module
 * Enforces user acknowledgment before allowing access to the application
 */
class DisclaimerModal {
    constructor() {
        this.isActive = false;
        this.focusableElements = [];
        this.firstFocusableElement = null;
        this.lastFocusableElement = null;
        this.previousActiveElement = null;
        
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
        this.showModal();
    }

    createModal() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'disclaimer-modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'disclaimer-title');
        overlay.setAttribute('aria-describedby', 'disclaimer-content');

        // Create modal content
        overlay.innerHTML = `
            <div class="disclaimer-modal" tabindex="-1">
                <div class="disclaimer-modal-header">
                    <h2 id="disclaimer-title">
                        <span class="warning-icon" aria-hidden="true">⚠️</span>
                        <span>Important Disclaimer</span>
                    </h2>
                </div>
                
                <div class="disclaimer-modal-body">
                    <div id="disclaimer-content" class="disclaimer-content">
                        <h3>🚨 UNSUPPORTED TOOL WARNING</h3>
                        <p>
                            <strong>This tool is NOT an official Ping Identity product</strong> and is provided 
                            <span class="highlight">without any warranty or support</span>. Use at your own risk.
                        </p>
                        
                        <h3>⚠️ CRITICAL DISCLAIMERS:</h3>
                        <ul>
                            <li><strong>No technical support</strong> is available from Ping Identity</li>
                            <li><strong>No updates or bug fixes</strong> are guaranteed</li>
                            <li><strong>No compatibility</strong> with future PingOne versions is assured</li>
                            <li><strong>No documentation or training</strong> is provided by Ping Identity</li>
                            <li>This tool may <strong>stop working at any time</strong> without notice</li>
                            <li>Use of this tool is <strong>not recommended for production environments</strong></li>
                            <li>You are <strong>responsible for testing and validating</strong> all operations</li>
                            <li><strong>Backup your PingOne account</strong> before using this tool</li>
                            <li><strong>Test in non-production environments</strong> only</li>
                        </ul>
                        
                        <p>
                            <strong>By continuing, you acknowledge that:</strong>
                        </p>
                        <ul>
                            <li>You understand this tool is unsupported and use it at your own risk</li>
                            <li>You have backed up your PingOne account data</li>
                            <li>You will test operations in non-production environments first</li>
                            <li>You accept full responsibility for any data loss or issues</li>
                        </ul>
                    </div>
                </div>
                
                <div class="disclaimer-modal-footer">
                    <div class="disclaimer-agreement">
                        <div class="disclaimer-checkbox">
                            <input type="checkbox" id="disclaimer-agreement-checkbox" required>
                            <label for="disclaimer-agreement-checkbox">
                                <span class="required-indicator">*</span>
                                I acknowledge and accept the above disclaimer. I understand this tool is unsupported and I use it at my own risk.
                            </label>
                        </div>
                    </div>
                    
                    <div class="disclaimer-actions">
                        <button type="button" class="disclaimer-btn disclaimer-btn-secondary" id="disclaimer-cancel">
                            Cancel
                        </button>
                        <button type="button" class="disclaimer-btn disclaimer-btn-primary" id="disclaimer-continue" disabled>
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.modal = overlay.querySelector('.disclaimer-modal');
        this.checkbox = overlay.querySelector('#disclaimer-agreement-checkbox');
        this.continueBtn = overlay.querySelector('#disclaimer-continue');
        this.cancelBtn = overlay.querySelector('#disclaimer-cancel');
    }

    bindEvents() {
        // Checkbox change event
        this.checkbox.addEventListener('change', (e) => {
            this.continueBtn.disabled = !e.target.checked;
            this.logEvent('disclaimer_checkbox_changed', { checked: e.target.checked });
        });

        // Continue button click
        this.continueBtn.addEventListener('click', () => {
            this.acceptDisclaimer();
        });

        // Cancel button click
        this.cancelBtn.addEventListener('click', () => {
            this.cancelDisclaimer();
        });

        // Keyboard events for accessibility
        this.overlay.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });

        // Prevent clicks outside modal from closing it
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                // Don't close on outside click - require explicit action
                this.logEvent('disclaimer_outside_click_prevented');
            }
        });

        // Escape key handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                e.preventDefault();
                this.cancelDisclaimer();
            }
        });
    }

    handleKeyboardNavigation(e) {
        if (!this.isActive) return;

        const focusableElements = this.getFocusableElements();
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Tab key navigation with focus trapping
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    }

    getFocusableElements() {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ];

        return Array.from(this.modal.querySelectorAll(focusableSelectors.join(', ')));
    }

    showModal() {
        this.isActive = true;
        this.previousActiveElement = document.activeElement;
        
        // Add classes to body and app container
        document.body.classList.add('disclaimer-modal-open');
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.add('disclaimer-modal-active');
        }

        // Show modal with animation
        this.overlay.classList.add('active');
        
        // Focus management
        this.modal.focus();
        this.setupFocusTrap();
        
        this.logEvent('disclaimer_modal_shown');
        
        // Announce to screen readers
        this.announceToScreenReader('Disclaimer modal opened. You must read and accept the disclaimer to continue.');
    }

    setupFocusTrap() {
        this.focusableElements = this.getFocusableElements();
        this.firstFocusableElement = this.focusableElements[0];
        this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1];
    }

    acceptDisclaimer() {
        if (!this.checkbox.checked) {
            this.logEvent('disclaimer_acceptance_attempted_without_checkbox');
            return;
        }

        this.logEvent('disclaimer_accepted');
        this.hideModal();
        
        // Enable application functionality
        this.enableApplication();
        
        // Call the app's enableToolAfterDisclaimer function to show startup screen
        if (typeof window.enableToolAfterDisclaimer === 'function') {
            console.log('[STARTUP] [DEBUG] Disclaimer accepted, calling enableToolAfterDisclaimer');
            window.enableToolAfterDisclaimer();
        } else {
            console.warn('[STARTUP] [DEBUG] enableToolAfterDisclaimer function not found');
        }
        
        // Dispatch custom event for other components to listen to
        document.dispatchEvent(new CustomEvent('disclaimerAccepted', {
            detail: { timestamp: new Date().toISOString() }
        }));
        
        // Announce to screen readers
        this.announceToScreenReader('Disclaimer accepted. Application is now enabled.');
    }

    cancelDisclaimer() {
        this.logEvent('disclaimer_cancelled');
        this.hideModal();
        
        // Show warning that application cannot be used without accepting
        this.showCancellationWarning();
    }

    hideModal() {
        this.isActive = false;
        
        // Remove classes
        document.body.classList.remove('disclaimer-modal-open');
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.remove('disclaimer-modal-active');
        }

        // Hide modal with animation
        this.overlay.classList.remove('active');
        
        // Restore focus
        if (this.previousActiveElement) {
            this.previousActiveElement.focus();
        }
        
        // Announce to screen readers
        this.announceToScreenReader('Disclaimer modal closed.');
    }

    enableApplication() {
        // Remove disabled state from all interactive elements
        const disabledElements = document.querySelectorAll('[disabled]');
        disabledElements.forEach(el => {
            if (el.classList.contains('disclaimer-disabled')) {
                el.disabled = false;
                el.classList.remove('disclaimer-disabled');
            }
        });

        // Enable navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.style.pointerEvents = 'auto';
            item.style.opacity = '1';
        });

        // Enable feature cards
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach(card => {
            card.style.pointerEvents = 'auto';
            card.style.opacity = '1';
        });

        // Store acceptance
        DisclaimerModal.setDisclaimerAccepted();
        this.logEvent('application_enabled_after_disclaimer');
    }

    showCancellationWarning() {
        // Create a temporary warning message
        const warning = document.createElement('div');
        warning.className = 'alert alert-warning alert-dismissible fade show';
        warning.style.position = 'fixed';
        warning.style.top = '20px';
        warning.style.left = '50%';
        warning.style.transform = 'translateX(-50%)';
        warning.style.zIndex = '10000';
        warning.style.maxWidth = '500px';
        warning.innerHTML = `
            <strong>⚠️ Disclaimer Required</strong>
            <br>You must accept the disclaimer to use this tool. The application will remain disabled until you acknowledge the terms.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        document.body.appendChild(warning);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (warning.parentNode) {
                warning.remove();
            }
        }, 10000);

        this.logEvent('disclaimer_cancellation_warning_shown');
    }

    announceToScreenReader(message) {
        // Create temporary element for screen reader announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            if (announcement.parentNode) {
                announcement.remove();
            }
        }, 1000);
    }

    logEvent(eventName, data = {}) {
        // Log to console for debugging
        console.log(`[DisclaimerModal] ${eventName}:`, data);
        
        // Send to server if logging is available and properly initialized
        try {
            // Check if logManager exists and has the log method
            if (window.logManager && typeof window.logManager.log === 'function') {
                window.logManager.log('info', `Disclaimer modal: ${eventName}`, {
                    source: 'disclaimer-modal',
                    type: 'ui',
                    ...data
                });
            } else if (window.logManager) {
                // logManager exists but doesn't have log method - initialize it
                if (typeof window.logManager.log !== 'function') {
                    window.logManager.log = function(level, message, data) {
                        const timestamp = new Date().toISOString();
                        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
                        if (data) {
                            console.log(logMessage, data);
                        } else {
                            console.log(logMessage);
                        }
                    };
                    // Now try logging again
                    window.logManager.log('info', `Disclaimer modal: ${eventName}`, {
                        source: 'disclaimer-modal',
                        type: 'ui',
                        ...data
                    });
                }
            } else {
                // logManager not available - create a basic one
                window.logManager = {
                    log: function(level, message, data) {
                        const timestamp = new Date().toISOString();
                        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
                        if (data) {
                            console.log(logMessage, data);
                        } else {
                            console.log(logMessage);
                        }
                    }
                };
                // Now try logging
                window.logManager.log('info', `Disclaimer modal: ${eventName}`, {
                    source: 'disclaimer-modal',
                    type: 'ui',
                    ...data
                });
            }
        } catch (error) {
            // Graceful fallback if logging fails
            console.warn('[DisclaimerModal] Logging failed:', error);
        }
    }

    // === CONFIGURATION ===
    // Set to true for session-only disclaimer (shows once per browser session)
    static DISCLAIMER_SESSION_ONLY = false; // set true for sessionStorage, false for localStorage
    // Set expiry in days (set to 0 for no expiry)
    static DISCLAIMER_EXPIRY_DAYS = 7; // e.g. 7 days, or 0 for no expiry

    // Static method to check if disclaimer was previously accepted (with expiry/session logic)
    static isDisclaimerAccepted() {
        if (DisclaimerModal.DISCLAIMER_SESSION_ONLY) {
            return sessionStorage.getItem('disclaimerAccepted') === 'true';
        }
        // Expiry logic
        const accepted = localStorage.getItem('disclaimerAccepted') === 'true';
        if (!accepted) return false;
        if (DisclaimerModal.DISCLAIMER_EXPIRY_DAYS > 0) {
            const acceptedAt = localStorage.getItem('disclaimerAcceptedAt');
            if (!acceptedAt) return false;
            const acceptedDate = new Date(acceptedAt);
            const now = new Date();
            const diffDays = (now - acceptedDate) / (1000 * 60 * 60 * 24);
            if (diffDays > DisclaimerModal.DISCLAIMER_EXPIRY_DAYS) {
                // Expired, reset
                DisclaimerModal.resetDisclaimerAcceptance();
                return false;
            }
        }
        return true;
    }

    // Static method to set acceptance (handles session/local/expiry)
    static setDisclaimerAccepted() {
        if (DisclaimerModal.DISCLAIMER_SESSION_ONLY) {
            sessionStorage.setItem('disclaimerAccepted', 'true');
        } else {
            localStorage.setItem('disclaimerAccepted', 'true');
            localStorage.setItem('disclaimerAcceptedAt', new Date().toISOString());
        }
    }

    // Static method to reset disclaimer acceptance
    static resetDisclaimerAcceptance() {
        if (DisclaimerModal.DISCLAIMER_SESSION_ONLY) {
            sessionStorage.removeItem('disclaimerAccepted');
        } else {
            localStorage.removeItem('disclaimerAccepted');
            localStorage.removeItem('disclaimerAcceptedAt');
        }
    }
}

// Initialize disclaimer modal when DOM is loaded and app is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for app to be fully initialized before showing disclaimer
    let disclaimerInitialized = false;
    const initializeDisclaimer = () => {
        if (disclaimerInitialized) return;
        
        // Ensure logManager is available before proceeding
        if (!window.logManager) {
            window.logManager = {
                log: function(level, message, data) {
                    const timestamp = new Date().toISOString();
                    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
                    if (data) {
                        console.log(logMessage, data);
                    } else {
                        console.log(logMessage);
                    }
                }
            };
        }
        
        // Only show disclaimer if not previously accepted (with expiry/session logic)
        if (!DisclaimerModal.isDisclaimerAccepted()) {
            new DisclaimerModal();
            disclaimerInitialized = true;
        } else {
            // If previously accepted, just enable the application (no modal)
            if (typeof window.enableToolAfterDisclaimer === 'function') {
                console.log('[STARTUP] [DEBUG] Disclaimer previously accepted, calling enableToolAfterDisclaimer');
                window.enableToolAfterDisclaimer();
            } else {
                console.warn('[STARTUP] [DEBUG] enableToolAfterDisclaimer function not found');
            }
            disclaimerInitialized = true;
        }
    };
    
    // Try to initialize immediately
    initializeDisclaimer();
    // Also try after a short delay to ensure app components are loaded
    setTimeout(initializeDisclaimer, 100);
    // Final attempt after longer delay to ensure logManager is available
    setTimeout(initializeDisclaimer, 1000);
    // Additional attempt after app initialization
    setTimeout(initializeDisclaimer, 2000);
});

// Export for global access
window.DisclaimerModal = DisclaimerModal; 