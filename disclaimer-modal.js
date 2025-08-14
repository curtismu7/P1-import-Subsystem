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
                        <i class="mdi mdi-alert-circle" aria-hidden="true"></i>
                        <span>Important Disclaimer</span>
                    </h2>
                    <p class="disclaimer-subtitle">Please review and acknowledge before continuing</p>
                </div>

                <div class="disclaimer-modal-body">
                    <section class="disclaimer-panel warning">
                        <div class="panel-icon"><i class="mdi mdi-shield-alert"></i></div>
                        <div class="panel-content">
                            <h3>Ping Library Terms of Service</h3>
                            <p class="updated">Last Updated: October 25, 2024</p>
                            <p class="lead">This sample code is provided “AS IS” and without warranty of any kind. Use in non‑production environments only.</p>
                            <div class="tos-box">
                                <p class="muted">The code provided hereunder shall be deemed "Sample Code." This Sample Code is to be used exclusively in connection with Ping Identity's software or services.</p>
                                <p class="muted">
                                    THE CODE HEREUNDER IS PROVIDED “AS IS” AND WITHOUT WARRANTY OF ANY KIND. SUCH CODE IS EXPRESSLY EXCLUDED FROM PING IDENTITY'S INDEMNITY OR SUPPORT OBLIGATIONS, IF ANY, PURSUANT TO THE RELEVANT GOVERNING AGREEMENT. PING IDENTITY AND ITS LICENSORS EXPRESSLY DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED OR STATUTORY, INCLUDING, WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND ANY WARRANTY OF NON-INFRINGEMENT. PING IDENTITY SHALL NOT HAVE ANY LIABILITY ARISING OUT OF OR RELATING TO ANY USE, IMPLEMENTATION OR CONFIGURATION OF THE SAMPLE CODE.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section class="disclaimer-ack">
                        <label class="switch-row">
                            <input type="checkbox" id="disclaimer-agreement-checkbox" required>
                            <span class="switch-label"><strong>Terms of Service (Required)</strong></span>
                        </label>
                        <p class="ack-note">By selecting Accept, you agree to these terms and our Cookies/Privacy policies.</p>
                    </section>
                </div>

                <div class="disclaimer-modal-footer">
                    <button type="button" class="disclaimer-btn disclaimer-btn-secondary" id="disclaimer-cancel">Quit</button>
                    <button type="button" class="disclaimer-btn disclaimer-btn-primary" id="disclaimer-continue" disabled>Accept</button>
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
        // Soften background styling
        this.applySoftTheme();
        
        // Focus management
        this.modal.focus();
        this.setupFocusTrap();
        
        this.logEvent('disclaimer_modal_shown');
        
        // Announce to screen readers
        this.announceToScreenReader('Disclaimer modal opened. You must read and accept the disclaimer to continue.');
    }

    applySoftTheme() {
        try {
            const root = document.documentElement;
            const modal = this.modal;
            if (!modal) return;
            modal.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
            modal.style.border = '1px solid rgba(0,0,0,0.08)';
            const panels = modal.querySelectorAll('.disclaimer-panel');
            panels.forEach(p => {
                p.style.background = '#f7f9fc';
                p.style.border = '1px solid rgba(0,0,0,0.06)';
            });
        } catch {}
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
        // TEMPORARY: Force disclaimer to always show for debugging
        return false;
        
        // Original logic (commented out for debugging):
        // if (DisclaimerModal.DISCLAIMER_SESSION_ONLY) {
        //     return sessionStorage.getItem('disclaimerAccepted') === 'true';
        // }
        // // Expiry logic
        // const accepted = localStorage.getItem('disclaimerAccepted') === 'true';
        // if (!accepted) return false;
        // if (DisclaimerModal.DISCLAIMER_EXPIRY_DAYS > 0) {
        //     const acceptedAt = localStorage.getItem('disclaimerAcceptedAt');
        //     if (!acceptedAt) return false;
        //     const acceptedDate = new Date(acceptedAt);
        //     const now = new Date();
        //     const diffDays = (now - acceptedDate) / (1000 * 60 * 60 * 24);
        //     if (diffDays > DisclaimerModal.DISCLAIMER_EXPIRY_DAYS) {
        //         // Expired, reset
        //         DisclaimerModal.resetDisclaimerAcceptance();
        //         return false;
        //     }
        // }
        // return true;
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

// Initialize disclaimer modal immediately (DOM is already loaded when import maps execute)
(function() {
    console.log('[DISCLAIMER DEBUG] Modal initialization starting immediately');
    
    // Wait for app to be fully initialized before showing disclaimer
    let disclaimerInitialized = false;
    const initializeDisclaimer = () => {
        console.log('[DISCLAIMER DEBUG] initializeDisclaimer called, disclaimerInitialized:', disclaimerInitialized);
        if (disclaimerInitialized) return;
        
        // Ensure logManager is available before proceeding
        if (!window.logManager) {
            console.log('[DISCLAIMER DEBUG] Creating logManager');
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
        
        // Check disclaimer acceptance status
        const isAccepted = DisclaimerModal.isDisclaimerAccepted();
        console.log('[DISCLAIMER DEBUG] isDisclaimerAccepted():', isAccepted);
        
        // Only show disclaimer if not previously accepted (with expiry/session logic)
        if (!isAccepted) {
            console.log('[DISCLAIMER DEBUG] Creating new DisclaimerModal');
            new DisclaimerModal();
            disclaimerInitialized = true;
        } else {
            console.log('[DISCLAIMER DEBUG] Disclaimer previously accepted, not showing modal');
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
})();

// Export for global access
window.DisclaimerModal = DisclaimerModal; 