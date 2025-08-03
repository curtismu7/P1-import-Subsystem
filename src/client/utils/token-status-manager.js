/**
 * Token Status Manager
 * 
 * Manages the display of token status in the UI and handles WebSocket updates
 * for real-time token status changes.
 */

export class TokenStatusManager {
    constructor(logger) {
        this.logger = logger || console;
        this.statusElement = null;
        this.countdownElement = null;
        this.initializeElements();
        this.setupEventListeners();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        try {
            this.statusElement = document.getElementById('token-status');
            this.countdownElement = document.querySelector('.token-countdown');
            this.logger.debug('Token status elements initialized');
        } catch (error) {
            this.logger.error('Failed to initialize token status elements', error);
        }
    }

    /**
     * Set up event listeners for token status updates
     */
    setupEventListeners() {
        // Listen for WebSocket token status updates
        if (window.io) {
            window.io.on('token_status', (data) => {
                this.handleTokenStatusUpdate(data);
            });
        }

        // Re-initialize elements if they're not found initially
        if (!this.statusElement || !this.countdownElement) {
            setTimeout(() => this.initializeElements(), 1000);
        }
    }

    /**
     * Handle token status updates from the server
     * @param {Object} data - Token status data
     */
    handleTokenStatusUpdate(data) {
        try {
            this.logger.debug('Received token status update', data);
            
            if (!this.statusElement) {
                this.initializeElements();
                if (!this.statusElement) return; // Still not found
            }

            switch (data.status) {
                case 'valid':
                    this.updateStatus('valid', 'Token is valid');
                    this.startCountdown(data.expiresIn);
                    break;
                    
                case 'retrying':
                    this.updateStatus('warning', 
                        `Retrying token acquisition (${data.attempt}/${data.maxAttempts})...`);
                    break;
                    
                case 'error':
                    this.updateStatus('error', 'Token acquisition failed');
                    this.stopCountdown();
                    break;
                    
                default:
                    this.updateStatus('unknown', 'Token status unknown');
            }
        } catch (error) {
            this.logger.error('Error handling token status update', error);
        }
    }

    /**
     * Update the token status display
     * @param {string} status - Status type (valid, warning, error, unknown)
     * @param {string} message - Status message
     */
    updateStatus(status, message) {
        if (!this.statusElement) return;
        
        // Remove all status classes
        this.statusElement.classList.remove(
            'token-valid', 
            'token-warning', 
            'token-error',
            'token-unknown'
        );
        
        // Add the appropriate status class
        this.statusElement.classList.add(`token-${status}`);
        
        // Update the status text
        const statusText = this.statusElement.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = message;
        }
    }

    /**
     * Start the token expiration countdown
     * @param {number} expiresIn - Time until token expires in seconds
     */
    startCountdown(expiresIn) {
        if (!this.countdownElement || !expiresIn) return;
        
        this.stopCountdown();
        
        const endTime = Date.now() + (expiresIn * 1000);
        
        // Update immediately
        this.updateCountdown(endTime);
        
        // Update every second
        this.countdownInterval = setInterval(() => {
            this.updateCountdown(endTime);
        }, 1000);
    }
    
    /**
     * Update the countdown display
     * @param {number} endTime - Timestamp when the token expires
     */
    updateCountdown(endTime) {
        if (!this.countdownElement) return;
        
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        
        if (remaining <= 0) {
            this.countdownElement.textContent = 'Expired';
            this.updateStatus('error', 'Token has expired');
            this.stopCountdown();
            return;
        }
        
        // Format as HH:MM:SS
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        this.countdownElement.textContent = 
            `${hours.toString().padStart(2, '0')}:` +
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Stop the countdown timer
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
}

// Export a singleton instance
export const tokenStatusManager = new TokenStatusManager(console);

// Auto-initialize if included directly in a script tag
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tokenStatusManager = tokenStatusManager;
    });
}
