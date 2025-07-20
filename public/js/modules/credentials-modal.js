/**
 * Credentials Modal Module
 * Shows current PingOne credentials and asks user if they want to use them or configure new ones
 */
class CredentialsModal {
    constructor() {
        this.isActive = false;
        this.focusableElements = [];
        this.firstFocusableElement = null;
        this.lastFocusableElement = null;
        this.previousActiveElement = null;
        this.credentials = null;
        
        this.init();
    }

    async init() {
        await this.loadCredentials();
        this.createModal();
        this.bindEvents();
        this.showModal();
    }

    async loadCredentials() {
        try {
            const response = await fetch('/api/settings');
            if (response.ok) {
                const data = await response.json();
                // The API returns data in data.data structure
                const settings = data.data || data.settings || {};
                this.credentials = {
                    environmentId: settings.environmentId || settings['environment-id'] || '',
                    clientId: settings.apiClientId || settings['api-client-id'] || '',
                    clientSecret: settings.apiSecret || settings['api-secret'] || '',
                    region: settings.region || 'NorthAmerica',
                    populationId: settings.populationId || settings['population-id'] || '',
                    rateLimit: settings.rateLimit || settings['rate-limit'] || 90
                };
                
                console.log('Credentials loaded from server:', {
                    hasEnvironmentId: !!this.credentials.environmentId,
                    hasClientId: !!this.credentials.clientId,
                    hasClientSecret: !!this.credentials.clientSecret,
                    region: this.credentials.region
                });
            } else {
                console.warn('Failed to load credentials from settings');
                this.credentials = null;
            }
        } catch (error) {
            console.error('Error loading credentials:', error);
            this.credentials = null;
        }
    }

    createModal() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'credentials-modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'credentials-title');
        overlay.setAttribute('aria-describedby', 'credentials-content');

        const hasCredentials = this.credentials && this.credentials.environmentId && this.credentials.clientId;
        
        // Create modal content
        overlay.innerHTML = `
            <div class="credentials-modal" tabindex="-1">
                <div class="credentials-modal-header">
                    <h2 id="credentials-title">
                        <span class="credentials-icon" aria-hidden="true">🔐</span>
                        <span>PingOne Credentials</span>
                    </h2>
                </div>
                
                <div class="credentials-modal-body">
                    <div id="credentials-content" class="credentials-content">
                        ${hasCredentials ? this.createCredentialsContent() : this.createNoCredentialsContent()}
                    </div>
                </div>
                
                <div class="credentials-modal-footer">
                    <div class="credentials-actions">
                        ${hasCredentials ? this.createCredentialsActions() : this.createNoCredentialsActions()}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.modal = overlay.querySelector('.credentials-modal');
        this.useCredentialsBtn = overlay.querySelector('#use-credentials-btn');
        this.configureBtn = overlay.querySelector('#configure-credentials-btn');
        this.skipBtn = overlay.querySelector('#skip-credentials-btn');
    }

    createCredentialsContent() {
        return `
            <h3>🔐 PingOne Credentials Found</h3>
            <p>The following PingOne credentials are available. Would you like to use them or configure new ones?</p>
            
            <div class="credentials-display">
                <div class="credential-item">
                    <label>Environment ID:</label>
                    <div class="credential-value">
                        <code class="credential-visible">${this.credentials.environmentId}</code>
                        <button class="btn btn-sm btn-outline-secondary copy-btn" data-value="${this.credentials.environmentId}" title="Copy Environment ID">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                
                <div class="credential-item">
                    <label>Client ID:</label>
                    <div class="credential-value">
                        <code class="credential-visible">${this.credentials.clientId}</code>
                        <button class="btn btn-sm btn-outline-secondary copy-btn" data-value="${this.credentials.clientId}" title="Copy Client ID">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                
                <div class="credential-item">
                    <label>Client Secret:</label>
                    <div class="credential-value">
                        <code class="credential-masked">••••••••••••••••••••</code>
                        <span class="credential-status">✅ Configured</span>
                    </div>
                </div>
                
                <div class="credential-item">
                    <label>Region:</label>
                    <div class="credential-value">
                        <code class="credential-visible">${this.credentials.region}</code>
                    </div>
                </div>
            </div>
            
            <div class="credentials-info">
                <h4>💡 What would you like to do?</h4>
                <ul>
                    <li><strong>Use These Credentials:</strong> Continue with the stored credentials</li>
                    <li><strong>Go to Settings:</strong> Configure new or different credentials</li>
                </ul>
            </div>
        `;
    }

    createNoCredentialsContent() {
        return `
            <h3>🔧 No Credentials Found</h3>
            <p>No PingOne credentials were found in your settings. You'll need to configure them to use this tool.</p>
            
            <div class="credentials-info">
                <h4>📋 Required Information:</h4>
                <ul>
                    <li><strong>Environment ID:</strong> Your PingOne environment identifier</li>
                    <li><strong>Client ID:</strong> Your PingOne API client identifier</li>
                    <li><strong>Client Secret:</strong> Your PingOne API client secret</li>
                    <li><strong>Region:</strong> Your PingOne environment region</li>
                </ul>
            </div>
            
            <div class="credentials-help">
                <h4>💡 How to Get Credentials:</h4>
                <ol>
                    <li>Log into your PingOne Admin Console</li>
                    <li>Navigate to Applications → Applications</li>
                    <li>Create a new application or use an existing one</li>
                    <li>Copy the Environment ID, Client ID, and Client Secret</li>
                    <li>Configure them in the Settings page</li>
                </ol>
            </div>
        `;
    }

    createCredentialsActions() {
        return `
            <button type="button" class="credentials-btn credentials-btn-primary" id="use-credentials-btn">
                <i class="fas fa-play"></i>
                Use These Credentials
            </button>
            <button type="button" class="credentials-btn credentials-btn-secondary" id="configure-credentials-btn">
                <i class="fas fa-cog"></i>
                Go to Settings
            </button>
            <button type="button" class="credentials-btn credentials-btn-outline" id="skip-credentials-btn">
                <i class="fas fa-times"></i>
                Skip for Now
            </button>
        `;
    }

    createNoCredentialsActions() {
        return `
            <button type="button" class="credentials-btn credentials-btn-primary" id="configure-credentials-btn">
                <i class="fas fa-cog"></i>
                Go to Settings
            </button>
            <button type="button" class="credentials-btn credentials-btn-secondary" id="skip-credentials-btn">
                <i class="fas fa-times"></i>
                Skip for Now
            </button>
        `;
    }

    maskCredential(value) {
        if (!value) return 'Not set';
        if (value.length <= 8) return value;
        return value.substring(0, 8) + '...' + value.substring(value.length - 4);
    }

    bindEvents() {
        // Use credentials button
        if (this.useCredentialsBtn) {
            this.useCredentialsBtn.addEventListener('click', async () => {
                await this.useCurrentCredentials();
            });
        }

        // Configure credentials button
        if (this.configureBtn) {
            this.configureBtn.addEventListener('click', () => {
                this.goToSettings();
            });
        }

        // Skip button
        if (this.skipBtn) {
            this.skipBtn.addEventListener('click', () => {
                this.skipCredentials();
            });
        }

        // Copy buttons
        this.modal.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.target.closest('.copy-btn').dataset.value;
                this.copyToClipboard(value, e.target.closest('.copy-btn'));
            });
        });

        // Keyboard events for accessibility
        this.overlay.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });

        // Prevent clicks outside modal from closing it
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                // Don't close on outside click - require explicit action
                this.logEvent('credentials_outside_click_prevented');
            }
        });

        // Escape key handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                e.preventDefault();
                this.skipCredentials();
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
        document.body.classList.add('credentials-modal-open');
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.add('credentials-modal-active');
        }

        // Show modal with animation
        this.overlay.classList.add('active');
        
        // Focus management
        this.modal.focus();
        this.setupFocusTrap();
        
        this.logEvent('credentials_modal_shown');
        
        // Announce to screen readers
        this.announceToScreenReader('Credentials configuration modal opened. Please review your PingOne credentials and choose an action.');
    }

    setupFocusTrap() {
        this.focusableElements = this.getFocusableElements();
        this.firstFocusableElement = this.focusableElements[0];
        this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1];
    }

    async useCurrentCredentials() {
        this.logEvent('credentials_used', { 
            hasCredentials: !!this.credentials,
            environmentId: this.credentials?.environmentId ? 'set' : 'not_set',
            clientId: this.credentials?.clientId ? 'set' : 'not_set'
        });
        
        // Show loading state on button
        const useButton = document.getElementById('use-credentials-btn');
        if (useButton) {
            useButton.disabled = true;
            useButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating Credentials...';
        }
        
        try {
            // Save credentials to settings and get token
            await this.saveCredentialsAndGetToken();
            
            // Mark modal as shown since credentials are now saved
            CredentialsModal.setCredentialsModalShown();
            
            this.hideModal();
            this.enableApplication();
            
            // Update token status to reflect that credentials are now being used
            this.updateTokenStatusAfterCredentialsUse();
            
            // Show success message
            this.showSuccessMessage('Credentials saved and token acquired successfully!');
            
        } catch (error) {
            // Restore button state on error
            const useButton = document.getElementById('use-credentials-btn');
            if (useButton) {
                useButton.disabled = false;
                useButton.innerHTML = '<i class="fas fa-play"></i> Use These Credentials';
            }
            console.error('Error using credentials:', error);
            
            // Show user-friendly error messages
            let userMessage = '';
            let userTitle = 'Credentials Error';
            
            if (error.message.includes('PingOne client not available')) {
                userTitle = 'Credentials Invalid';
                userMessage = 'The stored credentials appear to be invalid or incomplete. Please go to Settings to configure valid PingOne credentials.';
            } else if (error.message.includes('Missing required credentials')) {
                userTitle = 'Incomplete Credentials';
                userMessage = 'Some required credential fields are missing. Please go to Settings to complete your PingOne configuration.';
            } else if (error.message.includes('Failed to get token')) {
                userTitle = 'Authentication Failed';
                userMessage = 'Unable to authenticate with PingOne using these credentials. Please verify your credentials in Settings.';
            } else if (error.message.includes('Failed to save credentials')) {
                userTitle = 'Save Failed';
                userMessage = 'Unable to save credentials to the server. Please try again or go to Settings to configure manually.';
            } else {
                userTitle = 'Credentials Error';
                userMessage = 'There was a problem using these credentials. Please go to Settings to verify your PingOne configuration.';
            }
            
            // Show the user-friendly error in the modal
            this.showModalError(userTitle, userMessage);
        }
    }
    
    async saveCredentialsAndGetToken() {
        if (!this.credentials) {
            throw new Error('No credentials available to save');
        }
        
        // Convert credentials to settings format
        const settings = {
            environmentId: this.credentials.environmentId,
            apiClientId: this.credentials.clientId,
            apiSecret: this.credentials.clientSecret,
            populationId: this.credentials.populationId || '',
            region: this.credentials.region || 'NorthAmerica',
            rateLimit: this.credentials.rateLimit || 90
        };
        
        // Validate required fields before saving
        if (!settings.environmentId || !settings.apiClientId || !settings.apiSecret) {
            throw new Error('Missing required credentials: Environment ID, Client ID, and Client Secret are required');
        }
        
        // Save to server via API endpoint - this is the critical fix
        try {
            console.log('Saving credentials to server...', {
                hasEnvironmentId: !!settings.environmentId,
                hasApiClientId: !!settings.apiClientId,
                hasApiSecret: !!settings.apiSecret,
                region: settings.region
            });
            
            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Failed to save credentials to server: ${errorData.error || response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Credentials saved to server successfully:', result);
            
            // Verify the save was successful by reading back the settings
            const verifyResponse = await fetch('/api/settings');
            if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json();
                const savedSettings = verifyData.data || verifyData.settings || {};
                console.log('Verified credentials saved to server:', {
                    hasEnvironmentId: !!savedSettings.environmentId,
                    hasApiClientId: !!savedSettings.apiClientId,
                    hasApiSecret: !!savedSettings.apiSecret
                });
            }
        } catch (error) {
            console.error('Failed to save credentials to server:', error);
            throw new Error(`Failed to save credentials: ${error.message}`);
        }
        
        // Save to credentials manager if available
        if (window.credentialsManager) {
            try {
                window.credentialsManager.saveCredentials(settings);
                console.log('Credentials saved to credentials manager');
            } catch (error) {
                console.warn('Failed to save to credentials manager:', error);
            }
        }
        
        // Save to localStorage as backup
        try {
            localStorage.setItem('pingone_credentials', JSON.stringify(settings));
            console.log('Credentials saved to localStorage as backup');
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
        
        // Update settings form if on settings page
        if (window.app && window.app.populateSettingsForm) {
            try {
                window.app.populateSettingsForm(settings);
                console.log('Settings form updated with credentials');
            } catch (error) {
                console.warn('Failed to update settings form:', error);
            }
        }
        
        // Get a new token with the saved credentials
        if (window.app && window.app.pingOneClient) {
            try {
                // Update the PingOne client with new credentials
                window.app.pingOneClient.updateCredentials(settings);
                
                // Get a new token
                const token = await window.app.pingOneClient.getAccessToken();
                console.log('New token acquired with saved credentials');
                
                return token;
            } catch (error) {
                console.error('Failed to get token with saved credentials:', error);
                throw new Error(`Failed to get token: ${error.message}`);
            }
        } else {
            throw new Error('PingOne client not available');
        }
    }
    
    showError(title, message) {
        // Create and show an error notification
        const notification = document.createElement('div');
        notification.className = 'notification notification-error';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span><strong>${title}:</strong> ${message}</span>
        `;
        
        const notificationArea = document.getElementById('notification-area');
        if (notificationArea) {
            notificationArea.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 8000);
        }
    }
    
    showModalError(title, message) {
        // Show error directly in the modal
        const modal = document.querySelector('.credentials-modal');
        if (!modal) return;
        
        // Remove any existing error messages
        const existingError = modal.querySelector('.credentials-error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'credentials-error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle error-icon"></i>
                <div class="error-text">
                    <h4>${title}</h4>
                    <p>${message}</p>
                </div>
            </div>
            <div class="error-actions">
                <button type="button" class="btn btn-primary" onclick="this.closest('.credentials-modal-overlay').querySelector('#configure-credentials-btn').click()">
                    <i class="fas fa-cog"></i> Go to Settings
                </button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.credentials-error-message').remove()">
                    <i class="fas fa-times"></i> Dismiss
                </button>
            </div>
        `;
        
        // Insert error message after the modal body
        const modalBody = modal.querySelector('.credentials-modal-body');
        if (modalBody) {
            modalBody.insertAdjacentElement('afterend', errorDiv);
        }
        
        // Also call the regular showError for notifications
        this.showError(title, message);
    }
    
    updateTokenStatusAfterCredentialsUse() {
        try {
            // Access the global app instance to update token status
            if (window.app && typeof window.app.updateUniversalTokenStatus === 'function') {
                console.log('Credentials Modal: Updating token status after credentials use');
                window.app.updateUniversalTokenStatus();
                
                // Also trigger a token check to get fresh status
                if (window.app.pingOneClient && typeof window.app.pingOneClient.getCurrentTokenTimeRemaining === 'function') {
                    const tokenInfo = window.app.pingOneClient.getCurrentTokenTimeRemaining();
                    console.log('Credentials Modal: Current token info after credentials use:', tokenInfo);
                }
            } else {
                console.warn('Credentials Modal: App instance not available for token status update');
            }
        } catch (error) {
            console.error('Credentials Modal: Error updating token status:', error);
        }
    }

    goToSettings() {
        this.logEvent('credentials_configure_clicked');
        
        this.hideModal();
        this.enableApplication();
        
        // Navigate to settings
        setTimeout(() => {
            const settingsNav = document.querySelector('[data-view="settings"]');
            if (settingsNav) {
                settingsNav.click();
            }
        }, 100);
    }

    skipCredentials() {
        this.logEvent('credentials_skipped');
        
        this.hideModal();
        this.enableApplication();
        
        // Show info message
        this.showInfoMessage('You can configure credentials later in the Settings page.');
    }

    hideModal() {
        this.isActive = false;
        
        // Remove classes
        document.body.classList.remove('credentials-modal-open');
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.remove('credentials-modal-active');
        }

        // Hide modal with animation
        this.overlay.classList.remove('active');
        
        // Restore focus
        if (this.previousActiveElement) {
            this.previousActiveElement.focus();
        }
        
        // Clean up
        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
        }, 300);
        
        this.logEvent('credentials_modal_hidden');
    }

    enableApplication() {
        // Enable the application
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.remove('credentials-modal-active');
        }
        
        this.logEvent('application_enabled_after_credentials');
    }

    copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            // Show success feedback
            const originalIcon = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i>';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.innerHTML = originalIcon;
                button.classList.remove('copied');
            }, 2000);
            
            this.logEvent('credential_copied');
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            this.logEvent('credential_copy_failed', { error: err.message });
        });
    }

    showSuccessMessage(message) {
        // Create and show a success notification
        const notification = document.createElement('div');
        notification.className = 'notification notification-success';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        const notificationArea = document.getElementById('notification-area');
        if (notificationArea) {
            notificationArea.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    }

    showInfoMessage(message) {
        // Create and show an info notification
        const notification = document.createElement('div');
        notification.className = 'notification notification-info';
        notification.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        `;
        
        const notificationArea = document.getElementById('notification-area');
        if (notificationArea) {
            notificationArea.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    }

    announceToScreenReader(message) {
        // Create a temporary element for screen reader announcements
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        
        announcement.textContent = message;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    logEvent(eventName, data = {}) {
        const eventData = {
            event: eventName,
            timestamp: new Date().toISOString(),
            hasCredentials: !!this.credentials,
            environmentId: this.credentials?.environmentId ? 'set' : 'not_set',
            clientId: this.credentials?.clientId ? 'set' : 'not_set',
            ...data
        };
        
        console.log('Credentials Modal Event:', eventData);
        
        // You can also send this to your logging system
        // fetch('/api/logs', { method: 'POST', body: JSON.stringify(eventData) });
    }

    /**
     * Check if credentials are already properly saved and working
     * @returns {Promise<boolean>} True if credentials are saved and working
     */
    static async areCredentialsSaved() {
        try {
            const response = await fetch('/api/settings');
            if (!response.ok) {
                return false;
            }
            
            const data = await response.json();
            const settings = data.data || data.settings || {};
            
            // Check if we have all required credentials
            const hasRequiredCredentials = settings.environmentId && 
                                        settings.apiClientId && 
                                        settings.apiSecret;
            
            if (!hasRequiredCredentials) {
                return false;
            }
            
            // Try to get a token to verify credentials work
            if (window.app && window.app.pingOneClient) {
                try {
                    const token = await window.app.pingOneClient.getAccessToken();
                    return !!token;
                } catch (error) {
                    console.warn('Credentials exist but token acquisition failed:', error);
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error checking if credentials are saved:', error);
            return false;
        }
    }

    /**
     * Check if the credentials modal should be shown
     * @returns {Promise<boolean>} True if modal should be shown
     */
    static async shouldShowCredentialsModal() {
        // TEMPORARY: Force credentials modal to always show for debugging
        console.log('DEBUGGING: Forcing credentials modal to show');
        return true;
        
        // Original logic (commented out for debugging):
        // try {
        //     // Check if modal was already shown in this session
        //     const modalShown = sessionStorage.getItem('credentials_modal_shown');
        //     if (modalShown === 'true') {
        //         console.log('Credentials modal already shown in this session');
        //         return false;
        //     }
        //     
        //     // Always show modal on startup to ask user about stored credentials
        //     // This gives users the choice to use stored credentials or configure new ones
        //     console.log('Showing credentials modal on startup to ask about stored credentials');
        //     return true;
        //     
        // } catch (error) {
        //     console.error('Error checking if credentials modal should be shown:', error);
        //     return true; // Show modal on error to be safe
        // }
    }

    /**
     * Mark that the credentials modal has been shown
     */
    static setCredentialsModalShown() {
        sessionStorage.setItem('credentials_modal_shown', 'true');
        console.log('Credentials modal marked as shown for this session');
    }

    /**
     * Reset the credentials modal state (for testing or re-showing)
     */
    static resetCredentialsModal() {
        sessionStorage.removeItem('credentials_modal_shown');
        console.log('Credentials modal state reset');
    }

    // Static method to check if there's a valid token
    static hasValidToken() {
        try {
            const token = localStorage.getItem('pingone_worker_token');
            const expiry = localStorage.getItem('pingone_token_expiry');
            
            if (!token || !expiry) {
                return false;
            }
            
            const expiryTime = parseInt(expiry, 10);
            const now = Date.now();
            const timeRemaining = expiryTime - now;
            
            return timeRemaining > 0;
        } catch (error) {
            console.error('Error checking token validity:', error);
            return false;
        }
    }
}

// Initialize credentials modal when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Credentials Modal: DOMContentLoaded event fired');
    console.log('Disclaimer accepted:', DisclaimerModal.isDisclaimerAccepted());
    console.log('Credentials modal shown:', sessionStorage.getItem('credentials_modal_shown'));
    
    // Check if disclaimer is already accepted (user returning)
    if (DisclaimerModal.isDisclaimerAccepted()) {
        const shouldShow = await CredentialsModal.shouldShowCredentialsModal();
        console.log('Should show credentials modal:', shouldShow);
        
        if (shouldShow) {
            console.log('Credentials Modal: Showing modal for returning user');
            // Small delay to ensure disclaimer modal is fully closed
            setTimeout(() => {
                new CredentialsModal();
                CredentialsModal.setCredentialsModalShown();
            }, 1000);
        }
    }
});

// Listen for disclaimer completion events
document.addEventListener('disclaimerAccepted', async (event) => {
    console.log('Credentials Modal: Disclaimer accepted event received', event.detail);
    // Wait a bit longer for disclaimer modal to fully close
    setTimeout(async () => {
        console.log('Credentials Modal: Checking if should show after disclaimer');
        const shouldShow = await CredentialsModal.shouldShowCredentialsModal();
        console.log('Should show credentials modal:', shouldShow);
        
        if (shouldShow) {
            console.log('Credentials Modal: Creating modal after disclaimer acceptance');
            new CredentialsModal();
            CredentialsModal.setCredentialsModalShown();
        }
    }, 1500);
});

// Listen for token status changes
document.addEventListener('token-updated', async (event) => {
    console.log('Credentials Modal: Token updated event received', event.detail);
    // Check if we should show credentials modal when token changes
    setTimeout(async () => {
        const shouldShow = await CredentialsModal.shouldShowCredentialsModal();
        console.log('Should show credentials modal after token update:', shouldShow);
        
        if (shouldShow) {
            console.log('Credentials Modal: Creating modal after token update');
            new CredentialsModal();
            CredentialsModal.setCredentialsModalShown();
        }
    }, 1000);
});

// Periodic check for token status (every 5 minutes)
setInterval(async () => {
    if (DisclaimerModal.isDisclaimerAccepted()) {
        const shouldShow = await CredentialsModal.shouldShowCredentialsModal();
        if (shouldShow) {
            console.log('Credentials Modal: Periodic check - showing modal');
            new CredentialsModal();
            CredentialsModal.setCredentialsModalShown();
        }
    }
}, 5 * 60 * 1000); // 5 minutes

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CredentialsModal;
} 