/**
 * Fallback UI Module
 * 
 * Provides fallback UI modes for when real-time features are unavailable.
 * 
 * @version 6.5.2.4
 */

/**
 * FallbackUI class for managing degraded UI states
 */
export class FallbackUI {
    /**
     * Initialize the fallback UI
     */
    constructor() {
        this.isRealTimeAvailable = true;
        this.pollingEnabled = false;
        this.pollingInterval = null;
        this.pollingDelay = 5000; // 5 seconds
        this.maxPollingDelay = 30000; // 30 seconds
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 5;
        this.statusIndicator = null;
        this.fallbackModeActive = false;
        
        // Initialize status indicator
        this._createStatusIndicator();
        
        console.log('Fallback UI module initialized');
    }
    
    /**
     * Create the status indicator element
     * @private
     */
    _createStatusIndicator() {
        // Check if indicator already exists
        if (document.getElementById('realtime-status-indicator')) {
            this.statusIndicator = document.getElementById('realtime-status-indicator');
            return;
        }
        
        // Create status indicator
        this.statusIndicator = document.createElement('div');
        this.statusIndicator.id = 'realtime-status-indicator';
        this.statusIndicator.className = 'status-indicator';
        this.statusIndicator.innerHTML = `
            <span class="status-icon connected">●</span>
            <span class="status-text">Connected</span>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .status-indicator {
                position: fixed;
                bottom: 10px;
                right: 10px;
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 9999;
                display: flex;
                align-items: center;
                transition: all 0.3s ease;
            }
            .status-icon {
                margin-right: 5px;
                font-size: 14px;
            }
            .status-icon.connected {
                color: #4CAF50;
            }
            .status-icon.connecting {
                color: #FFC107;
                animation: blink 1s infinite;
            }
            .status-icon.disconnected {
                color: #F44336;
            }
            .status-indicator.expanded {
                padding: 10px;
                width: 250px;
            }
            .status-details {
                display: none;
                margin-top: 5px;
                font-size: 11px;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                padding-top: 5px;
            }
            .status-indicator.expanded .status-details {
                display: block;
            }
            .status-actions {
                margin-top: 5px;
            }
            .status-action-btn {
                background-color: #2196F3;
                border: none;
                color: white;
                padding: 2px 5px;
                font-size: 10px;
                cursor: pointer;
                border-radius: 2px;
                margin-right: 5px;
            }
            @keyframes blink {
                0% { opacity: 0.4; }
                50% { opacity: 1; }
                100% { opacity: 0.4; }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(this.statusIndicator);
        
        // Add click handler to expand/collapse
        this.statusIndicator.addEventListener('click', () => {
            this.statusIndicator.classList.toggle('expanded');
            
            // Update details if expanded
            if (this.statusIndicator.classList.contains('expanded')) {
                this._updateStatusDetails();
            }
        });
    }
    
    /**
     * Update the status indicator details
     * @private
     */
    _updateStatusDetails() {
        // Remove existing details
        const existingDetails = this.statusIndicator.querySelector('.status-details');
        if (existingDetails) {
            existingDetails.remove();
        }
        
        // Create details element
        const details = document.createElement('div');
        details.className = 'status-details';
        
        // Add connection details
        details.innerHTML = `
            <div>Mode: ${this.fallbackModeActive ? 'Fallback (Polling)' : 'Real-time'}</div>
            <div>Status: ${this.isRealTimeAvailable ? 'Available' : 'Unavailable'}</div>
            <div>Polling: ${this.pollingEnabled ? 'Enabled' : 'Disabled'}</div>
            <div>Polling Interval: ${this.pollingDelay / 1000}s</div>
            <div>Connection Attempts: ${this.connectionAttempts}</div>
            <div class="status-actions">
                <button class="status-action-btn" id="retry-connection-btn">Retry Connection</button>
                <button class="status-action-btn" id="toggle-polling-btn">
                    ${this.pollingEnabled ? 'Disable' : 'Enable'} Polling
                </button>
            </div>
        `;
        
        this.statusIndicator.appendChild(details);
        
        // Add event listeners to buttons
        document.getElementById('retry-connection-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.retryConnection();
        });
        
        document.getElementById('toggle-polling-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePolling();
        });
    }
    
    /**
     * Update the status indicator
     * 
     * @param {string} status - Connection status (connected, connecting, disconnected)
     * @param {string} message - Status message
     */
    updateStatus(status, message = '') {
        if (!this.statusIndicator) return;
        
        const icon = this.statusIndicator.querySelector('.status-icon');
        const text = this.statusIndicator.querySelector('.status-text');
        
        // Update icon and text
        if (icon) {
            icon.className = `status-icon ${status}`;
        }
        
        if (text) {
            text.textContent = message || status.charAt(0).toUpperCase() + status.slice(1);
        }
        
        // Update details if expanded
        if (this.statusIndicator.classList.contains('expanded')) {
            this._updateStatusDetails();
        }
    }
    
    /**
     * Handle real-time connection failure
     */
    handleConnectionFailure() {
        this.isRealTimeAvailable = false;
        this.connectionAttempts++;
        
        console.warn(`Real-time connection failure (attempt ${this.connectionAttempts})`);
        
        // Update status
        this.updateStatus('disconnected', 'Disconnected');
        
        // Show notification to user
        this._showNotification(
            'Real-time Connection Lost',
            'Switching to fallback mode. Some features may be limited.',
            'warning'
        );
        
        // Enable fallback mode
        this.enableFallbackMode();
        
        // Attempt to reconnect if under max attempts
        if (this.connectionAttempts < this.maxConnectionAttempts) {
            const delay = Math.min(
                2000 * Math.pow(1.5, this.connectionAttempts - 1),
                30000
            );
            
            console.log(`Attempting to reconnect in ${delay / 1000} seconds...`);
            
            setTimeout(() => {
                this.retryConnection();
            }, delay);
        }
    }
    
    /**
     * Handle real-time connection success
     */
    handleConnectionSuccess() {
        this.isRealTimeAvailable = true;
        this.connectionAttempts = 0;
        
        console.log('Real-time connection established');
        
        // Update status
        this.updateStatus('connected', 'Connected');
        
        // Disable fallback mode if active
        if (this.fallbackModeActive) {
            this.disableFallbackMode();
            
            // Show notification to user
            this._showNotification(
                'Real-time Connection Restored',
                'Returning to real-time mode with all features available.',
                'success'
            );
        }
    }
    
    /**
     * Enable fallback mode
     */
    enableFallbackMode() {
        if (this.fallbackModeActive) return;
        
        this.fallbackModeActive = true;
        
        console.log('Enabling fallback mode');
        
        // Add fallback mode class to body
        document.body.classList.add('fallback-mode');
        
        // Enable polling for updates
        this.enablePolling();
        
        // Disable real-time dependent UI elements
        this._updateUIForFallbackMode(true);
        
        // Dispatch event for other modules
        window.dispatchEvent(new CustomEvent('fallbackmode:enabled'));
    }
    
    /**
     * Disable fallback mode
     */
    disableFallbackMode() {
        if (!this.fallbackModeActive) return;
        
        this.fallbackModeActive = false;
        
        console.log('Disabling fallback mode');
        
        // Remove fallback mode class from body
        document.body.classList.remove('fallback-mode');
        
        // Disable polling
        this.disablePolling();
        
        // Re-enable real-time dependent UI elements
        this._updateUIForFallbackMode(false);
        
        // Dispatch event for other modules
        window.dispatchEvent(new CustomEvent('fallbackmode:disabled'));
    }
    
    /**
     * Enable polling for updates
     */
    enablePolling() {
        if (this.pollingEnabled) return;
        
        this.pollingEnabled = true;
        
        console.log(`Enabling polling with ${this.pollingDelay / 1000}s interval`);
        
        // Start polling
        this.pollingInterval = setInterval(() => {
            this._pollForUpdates();
        }, this.pollingDelay);
        
        // Dispatch event for other modules
        window.dispatchEvent(new CustomEvent('polling:enabled', {
            detail: { interval: this.pollingDelay }
        }));
    }
    
    /**
     * Disable polling for updates
     */
    disablePolling() {
        if (!this.pollingEnabled) return;
        
        this.pollingEnabled = false;
        
        console.log('Disabling polling');
        
        // Stop polling
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        // Dispatch event for other modules
        window.dispatchEvent(new CustomEvent('polling:disabled'));
    }
    
    /**
     * Toggle polling on/off
     */
    togglePolling() {
        if (this.pollingEnabled) {
            this.disablePolling();
        } else {
            this.enablePolling();
        }
        
        // Update details if expanded
        if (this.statusIndicator.classList.contains('expanded')) {
            this._updateStatusDetails();
        }
    }
    
    /**
     * Poll for updates
     * @private
     */
    _pollForUpdates() {
        console.log('Polling for updates...');
        
        // Dispatch event for other modules to handle polling
        window.dispatchEvent(new CustomEvent('polling:update'));
        
        // Example: Poll for import status
        if (window.importManager) {
            window.importManager.checkStatus();
        }
        
        // Example: Poll for export status
        if (window.exportManager) {
            window.exportManager.checkStatus();
        }
    }
    
    /**
     * Update UI elements for fallback mode
     * 
     * @param {boolean} enableFallback - Whether to enable or disable fallback mode
     * @private
     */
    _updateUIForFallbackMode(enableFallback) {
        // Find real-time dependent elements
        const realtimeDependentElements = document.querySelectorAll('.realtime-dependent');
        
        // Update each element
        realtimeDependentElements.forEach(element => {
            if (enableFallback) {
                element.setAttribute('disabled', 'disabled');
                element.classList.add('disabled-in-fallback');
                
                // Add tooltip explaining why it's disabled
                element.setAttribute('title', 'This feature requires real-time connection');
            } else {
                element.removeAttribute('disabled');
                element.classList.remove('disabled-in-fallback');
                element.removeAttribute('title');
            }
        });
        
        // Show/hide fallback UI elements
        const fallbackElements = document.querySelectorAll('.fallback-only');
        fallbackElements.forEach(element => {
            element.style.display = enableFallback ? 'block' : 'none';
        });
        
        // Show/hide real-time UI elements
        const realtimeElements = document.querySelectorAll('.realtime-only');
        realtimeElements.forEach(element => {
            element.style.display = enableFallback ? 'none' : 'block';
        });
    }
    
    /**
     * Show a notification to the user
     * 
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type (info, success, warning, error)
     * @private
     */
    _showNotification(title, message, type = 'info') {
        // Check if notification system exists
        if (window.notificationSystem) {
            window.notificationSystem.show(title, message, type);
            return;
        }
        
        // Create a simple notification if notification system doesn't exist
        const notification = document.createElement('div');
        notification.className = `simple-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .simple-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: white;
                border-left: 4px solid #2196F3;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                padding: 15px;
                z-index: 10000;
                min-width: 300px;
                max-width: 400px;
                animation: slide-in 0.3s ease, fade-out 0.5s ease 4.5s forwards;
            }
            .simple-notification.success {
                border-left-color: #4CAF50;
            }
            .simple-notification.warning {
                border-left-color: #FFC107;
            }
            .simple-notification.error {
                border-left-color: #F44336;
            }
            .notification-title {
                font-weight: bold;
                margin-bottom: 5px;
            }
            .notification-message {
                font-size: 14px;
            }
            @keyframes slide-in {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fade-out {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    /**
     * Retry real-time connection
     */
    retryConnection() {
        console.log('Retrying real-time connection...');
        
        // Update status
        this.updateStatus('connecting', 'Connecting...');
        
        // Dispatch event for other modules
        window.dispatchEvent(new CustomEvent('connection:retry'));
        
        // Example: Retry Socket.IO connection
        if (window.socketManager) {
            window.socketManager.reconnect();
        }
    }
    
    /**
     * Check if real-time features are available
     * 
     * @returns {boolean} - Whether real-time features are available
     */
    isRealTimeFeatureAvailable() {
        return this.isRealTimeAvailable && !this.fallbackModeActive;
    }
}

// Create singleton instance
const fallbackUI = new FallbackUI();

// Export singleton
export default fallbackUI;
