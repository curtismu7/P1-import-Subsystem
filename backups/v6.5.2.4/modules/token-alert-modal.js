// Token Alert Modal - blocks interaction and guides user to settings if no valid token is available
class TokenAlertModal {
    constructor({ tokenStatus = '', expiry = '', operation = '' } = {}) {
        if (TokenAlertModal.hasShownThisSession()) return;
        TokenAlertModal.setShownThisSession();
        this.operation = operation;
        this.createModal(tokenStatus, expiry);
        this.showModal();
    }

    createModal(tokenStatus, expiry) {
        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'token-alert-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'token-alert-title');
        overlay.setAttribute('aria-describedby', 'token-alert-content');

        // Modal content with enhanced styling and action button
        overlay.innerHTML = `
            <div class="token-alert-modal" tabindex="-1">
                <div class="token-alert-header">
                    <h2 id="token-alert-title">
                        <span class="warning-icon" aria-hidden="true">⚠️</span>
                        <span>Authentication Required</span>
                    </h2>
                    <button type="button" class="token-alert-close" id="token-alert-close" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="token-alert-body">
                    <div id="token-alert-content" class="token-alert-content">
                        <div class="token-alert-icon">
                            <span aria-hidden="true">🔐</span>
                        </div>
                        <h3>No Valid Token Available</h3>
                        <p class="token-alert-message">
                            <strong>Authentication is required to continue.</strong>
                            ${this.operation ? `You need valid credentials to perform the "${this.operation}" operation.` : 'You need valid credentials to use this application.'}
                        </p>
                        ${tokenStatus || expiry ? `<div class="token-status-info">
                            <p><strong>Current Status:</strong> ${tokenStatus ? tokenStatus : 'No token available'}</p>
                            ${expiry ? `<p style="visibility: hidden;"><strong>Token Expired:</strong> ${expiry}</p>` : ''}
                        </div>` : ''}
                        <div class="token-alert-actions">
                            <button type="button" class="btn btn-primary btn-lg" id="token-alert-settings-btn">
                                <span class="btn-icon">⚙️</span>
                                Go to Settings
                            </button>
                            <p class="token-alert-help">
                                Add your PingOne credentials in the Settings page to generate a new token.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.modal = overlay.querySelector('.token-alert-modal');
        this.settingsBtn = overlay.querySelector('#token-alert-settings-btn');
        this.closeBtn = overlay.querySelector('#token-alert-close');
        this.bindEvents();
    }

    bindEvents() {
        // Settings button - navigate to settings
        this.settingsBtn.addEventListener('click', () => {
            this.hideModal();
            // Navigate to settings view within the SPA instead of redirecting
            if (window.app && window.app.showView) {
                window.app.showView('settings');
            } else {
                // Fallback: navigate to settings view by triggering the settings nav item
                const settingsNavItem = document.querySelector('[data-view="settings"]');
                if (settingsNavItem) {
                    settingsNavItem.click();
                } else {
                    // Final fallback: redirect to home page which will show settings
                    window.location.href = '/';
                }
            }
        });

        // Close button - allow manual dismissal
        this.closeBtn.addEventListener('click', () => {
            this.hideModal();
        });

        // Trap focus within modal
        this.overlay.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
        
        // Prevent closing by outside click (modal should be persistent)
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                e.preventDefault();
                // Don't close on outside click - keep modal visible
            }
        });

        // Prevent escape key from closing modal (should be persistent)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                // Don't close on escape - keep modal visible
            }
        });
    }

    handleKeyboardNavigation(e) {
        const focusable = this.modal.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
        if (e.key === 'Tab') {
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    }

    showModal() {
        document.body.classList.add('token-alert-open');
        this.overlay.classList.add('active');
        this.modal.focus();
        
        // Add styles to body to prevent scrolling
        document.body.style.overflow = 'hidden';
    }

    hideModal() {
        this.overlay.classList.remove('active');
        document.body.classList.remove('token-alert-open');
        document.body.style.overflow = '';
        
        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
        }, 300);
    }

    static hasShownThisSession() {
        return sessionStorage.getItem('tokenAlertModalShown') === 'true';
    }
    
    static setShownThisSession() {
        sessionStorage.setItem('tokenAlertModalShown', 'true');
    }
    
    static clearShownThisSession() {
        sessionStorage.removeItem('tokenAlertModalShown');
    }
}

// Export a function to show the modal
export function showTokenAlertModal({ tokenStatus = '', expiry = '', operation = '' } = {}) {
    new TokenAlertModal({ tokenStatus, expiry, operation });
}

// Export function to clear the session flag (useful for testing)
export function clearTokenAlertSession() {
    TokenAlertModal.clearShownThisSession();
} 