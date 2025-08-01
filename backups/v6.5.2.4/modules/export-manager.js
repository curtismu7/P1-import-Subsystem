/**
 * Export Manager - Enhanced export functionality with population selection, credential overrides, token handling, and JWT decoding
 * Handles all export operations with comprehensive token management and user transparency
 */

class ExportManager {
    constructor() {
        this.exportToken = null;
        this.tokenExpiration = null;
        this.tokenTimer = null;
        this.overrideCredentials = false;
        this.populations = [];
        this.logger = console;
        
        // Only initialize if we're on a page with export functionality
        if (document.getElementById('export-population-select') || 
            document.getElementById('export-format') || 
            document.getElementById('start-export')) {
            try {
                this.initializeEventListeners();
                this.loadPopulations();
                this.loadStoredCredentials();
                this.startTokenTimer();
            } catch (error) {
                console.warn('ExportManager initialization warning:', error);
            }
        }
    }

    initializeEventListeners() {
        // Population selection
        const populationSelect = document.getElementById('export-population-select');
        if (populationSelect) {
            populationSelect.addEventListener('change', (e) => {
                this.validateExportButton();
                this.logPopulationSelection();
            });
        }

        // Credential override toggle
        const overrideCheckbox = document.getElementById('export-use-override-credentials');
        if (overrideCheckbox) {
            overrideCheckbox.addEventListener('change', (e) => {
                this.toggleCredentialsOverride(e.target.checked);
            });
        }

        // Generate export token
        const generateTokenBtn = document.getElementById('generate-export-token');
        if (generateTokenBtn) {
            generateTokenBtn.addEventListener('click', () => {
                this.generateExportToken();
            });
        }

        // View raw token
        const viewTokenBtn = document.getElementById('view-export-token');
        if (viewTokenBtn) {
            viewTokenBtn.addEventListener('click', () => {
                this.showJWTDecoder();
            });
        }

        // Refresh token
        const refreshTokenBtn = document.getElementById('refresh-export-token');
        if (refreshTokenBtn) {
            refreshTokenBtn.addEventListener('click', () => {
                this.refreshExportToken();
            });
        }

        // JWT panel close
        const closeJwtBtn = document.getElementById('close-jwt-panel');
        if (closeJwtBtn) {
            closeJwtBtn.addEventListener('click', () => {
                this.hideJWTDecoder();
            });
        }

        // Copy buttons
        this.setupCopyButtons();

        // Start export
        const startExportBtn = document.getElementById('start-export');
        if (startExportBtn) {
            startExportBtn.addEventListener('click', () => {
                this.startExport();
            });
        }

        // Secret visibility toggle
        const toggleSecretBtn = document.getElementById('toggle-export-secret-visibility');
        if (toggleSecretBtn) {
            toggleSecretBtn.addEventListener('click', () => {
                this.toggleSecretVisibility();
            });
        }
    }

    async loadPopulations() {
        try {
            // Check if population select element exists before making API call
            const populationSelect = document.getElementById('export-population-select');
            if (!populationSelect) {
                console.log('Export population select not found, skipping population load');
                return;
            }
            
            this.logPopulationLoadStart();
            const response = await fetch('/api/populations');
            if (response.ok) {
                const data = await response.json();
                // Handle the API response structure: { success: true, populations: [...], total: 123 }
                const populations = data.populations || data;
                if (Array.isArray(populations)) {
                    this.populations = populations;
                    this.populatePopulationSelect(populations);
                    this.logPopulationLoadSuccess(populations.length);
                } else {
                    console.error('Invalid populations data format:', populations);
                    this.logPopulationLoadError('Invalid populations data format');
                }
            } else {
                console.error('Failed to load populations');
                this.logPopulationLoadError('Failed to load populations');
            }
        } catch (error) {
            console.error('Error loading populations:', error);
            this.logPopulationLoadError(error.message);
        }
    }

    populatePopulationSelect(populations) {
        const select = document.getElementById('export-population-select');
        if (!select) return;

        // Keep the existing ALL option and add populations
        const allOption = select.querySelector('option[value="ALL"]');
        select.innerHTML = '<option value="">Select a population...</option>';
        
        if (allOption) {
            select.appendChild(allOption);
        }
        
        populations.forEach(population => {
            const option = document.createElement('option');
            option.value = population.id;
            option.textContent = population.name;
            select.appendChild(option);
        });
    }

    toggleCredentialsOverride(enabled) {
        this.overrideCredentials = enabled;
        const credentialsFields = document.getElementById('export-credentials-form');
        const tokenStatus = document.getElementById('export-token-status');
        
        if (enabled) {
            credentialsFields.style.display = 'block';
            this.loadStoredCredentials();
        } else {
            credentialsFields.style.display = 'none';
            tokenStatus.style.display = 'none';
            this.clearExportToken();
        }
        
        this.validateExportButton();
        this.logCredentialOverride(enabled);
    }

    loadStoredCredentials() {
        try {
            const stored = localStorage.getItem('exportCredentials');
            if (stored) {
                const credentials = JSON.parse(stored);
                document.getElementById('export-environment-id').value = credentials.environmentId || '';
                document.getElementById('export-api-client-id').value = credentials.apiClientId || '';
                document.getElementById('export-api-secret').value = credentials.apiSecret || '';
                document.getElementById('export-region').value = credentials.region || 'NA';
            }
        } catch (error) {
            console.error('Error loading stored credentials:', error);
        }
    }

    saveCredentials() {
        try {
            const credentials = {
                environmentId: document.getElementById('export-environment-id').value,
                apiClientId: document.getElementById('export-api-client-id').value,
                apiSecret: document.getElementById('export-api-secret').value,
                region: document.getElementById('export-region').value
            };
            localStorage.setItem('exportCredentials', JSON.stringify(credentials));
        } catch (error) {
            console.error('Error saving credentials:', error);
        }
    }

    async generateExportToken() {
        try {
            const credentials = this.getExportCredentials();
            if (!credentials) {
                this.showError('Please fill in all credential fields');
                return;
            }

            this.saveCredentials();
            
            const response = await fetch('/api/export-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            if (response.ok) {
                const result = await response.json();
                this.setExportToken(result.token, result.expiresAt);
                this.logTokenGeneration('success');
            } else {
                const error = await response.json();
                this.showError('Failed to generate token: ' + error.message);
                this.logTokenGeneration('error', error.message);
            }
        } catch (error) {
            this.showError('Error generating token: ' + error.message);
            this.logTokenGeneration('error', error.message);
        }
    }

    async refreshExportToken() {
        if (!this.overrideCredentials) {
            this.showError('Credential override must be enabled to refresh token');
            return;
        }
        await this.generateExportToken();
    }

    getExportCredentials() {
        const environmentId = document.getElementById('export-environment-id').value;
        const apiClientId = document.getElementById('export-api-client-id').value;
        const apiSecret = document.getElementById('export-api-secret').value;
        const region = document.getElementById('export-region').value;

        if (!environmentId || !apiClientId || !apiSecret) {
            return null;
        }

        return {
            environmentId,
            apiClientId,
            apiSecret,
            region
        };
    }

    setExportToken(token, expiresAt) {
        this.exportToken = token;
        this.tokenExpiration = new Date(expiresAt);
        
        // Store in localStorage
        localStorage.setItem('exportToken', token);
        localStorage.setItem('exportTokenExpires', expiresAt);
        
        // Show token status
        document.getElementById('export-token-status').style.display = 'block';
        
        // Update token metadata
        this.updateTokenMetadata();
        
        // Start timer
        this.startTokenTimer();
        
        this.validateExportButton();
        this.logTokenSet();
    }

    clearExportToken() {
        this.exportToken = null;
        this.tokenExpiration = null;
        
        // Clear from localStorage
        localStorage.removeItem('exportToken');
        localStorage.removeItem('exportTokenExpires');
        
        // Hide token status
        document.getElementById('export-token-status').style.display = 'none';
        
        // Stop timer
        if (this.tokenTimer) {
            clearInterval(this.tokenTimer);
            this.tokenTimer = null;
        }
        
        this.validateExportButton();
    }

    startTokenTimer() {
        if (this.tokenTimer) {
            clearInterval(this.tokenTimer);
        }
        
        this.tokenTimer = setInterval(() => {
            this.updateTokenTimer();
        }, 1000);
        
        this.updateTokenTimer();
    }

    updateTokenTimer() {
        if (!this.tokenExpiration) return;
        
        const now = new Date();
        const timeLeft = this.tokenExpiration.getTime() - now.getTime();
        
        if (timeLeft <= 0) {
            // Token expired
            this.clearExportToken();
            this.showError('Export token has expired. Please generate a new token.');
            return;
        }
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        const timerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('export-token-timer').textContent = timerText;
        
        // Update status indicator
        const indicator = document.getElementById('export-token-status-indicator');
        if (timeLeft < 300000) { // Less than 5 minutes
            indicator.className = 'token-status-indicator expired';
        } else if (timeLeft < 600000) { // Less than 10 minutes
            indicator.className = 'token-status-indicator warning';
        } else {
            indicator.className = 'token-status-indicator valid';
        }
    }

    updateTokenMetadata() {
        if (!this.exportToken) return;
        
        try {
            const decoded = this.decodeJWT(this.exportToken);
            
            document.getElementById('export-token-scopes').textContent = decoded.payload.scope || '--';
            document.getElementById('export-token-environment').textContent = decoded.payload.env || '--';
            document.getElementById('export-token-expires').textContent = new Date(decoded.payload.exp * 1000).toISOString();
        } catch (error) {
            console.error('Error updating token metadata:', error);
        }
    }

    decodeJWT(token) {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT format');
        }
        
        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1]));
        const signature = parts[2];
        
        return {
            header,
            payload,
            signature,
            raw: token
        };
    }

    showJWTDecoder() {
        if (!this.exportToken) {
            this.showError('No export token available');
            return;
        }
        
        try {
            const decoded = this.decodeJWT(this.exportToken);
            
            document.getElementById('export-jwt-raw').textContent = decoded.raw;
            document.getElementById('export-jwt-header').textContent = JSON.stringify(decoded.header, null, 2);
            document.getElementById('export-jwt-payload').textContent = JSON.stringify(decoded.payload, null, 2);
            document.getElementById('export-jwt-signature').textContent = decoded.signature;
            
            document.getElementById('export-jwt-panel').style.display = 'block';
            this.logJWTView();
        } catch (error) {
            this.showError('Error decoding JWT: ' + error.message);
        }
    }

    hideJWTDecoder() {
        document.getElementById('export-jwt-panel').style.display = 'none';
    }

    setupCopyButtons() {
        const copyButtons = [
            { id: 'copy-jwt-raw', target: 'export-jwt-raw' },
            { id: 'copy-jwt-header', target: 'export-jwt-header' },
            { id: 'copy-jwt-payload', target: 'export-jwt-payload' },
            { id: 'copy-jwt-signature', target: 'export-jwt-signature' }
        ];
        
        copyButtons.forEach(button => {
            const btn = document.getElementById(button.id);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.copyToClipboard(button.target);
                });
            }
        });
    }

    async copyToClipboard(elementId) {
        try {
            const element = document.getElementById(elementId);
            const text = element.textContent;
            await navigator.clipboard.writeText(text);
            this.showSuccess('Copied to clipboard');
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            this.showError('Failed to copy to clipboard');
        }
    }

    toggleSecretVisibility() {
        const secretInput = document.getElementById('export-api-secret');
        const toggleBtn = document.getElementById('toggle-export-secret-visibility');
        const icon = toggleBtn.querySelector('i');
        
        if (secretInput.type === 'password') {
            secretInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            secretInput.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    validateExportButton() {
        const startExportBtn = document.getElementById('start-export');
        const populationSelect = document.getElementById('export-population-select');
        
        if (!startExportBtn || !populationSelect) return;
        
        const hasPopulation = populationSelect.value;
        const hasToken = this.overrideCredentials ? this.exportToken : true;
        
        startExportBtn.disabled = !hasPopulation || !hasToken;
    }

    async startExport() {
        const populationSelect = document.getElementById('export-population-select');
        const selectedPopulation = populationSelect.value;
        
        if (!selectedPopulation) {
            this.showError('Please select a population');
            return;
        }
        
        if (this.overrideCredentials && !this.exportToken) {
            this.showError('Please generate an export token first');
            return;
        }
        
        try {
            const exportOptions = this.getExportOptions();
            this.logExportStart(exportOptions);
            
            // Show export status
            if (window.uiManager) {
                window.uiManager.showExportStatus();
            }
            
            // Send export request
            const response = await fetch('/api/export-users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(exportOptions)
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccess('Export completed successfully', result.message);
                this.logExportSuccess(result);
                this.showExportReminder();
            } else {
                const error = await response.json();
                this.showError('Export failed: ' + error.message);
                this.logExportError(error.message);
            }
        } catch (error) {
            this.showError('Export failed: ' + error.message);
            this.logExportError(error.message);
        }
    }

    getExportOptions() {
        const populationSelect = document.getElementById('export-population-select');
        const selectedPopulation = populationSelect.value;
        const selectedPopulationName = populationSelect.selectedOptions[0]?.text || '';
        
        return {
            populationId: selectedPopulation,
            populationName: selectedPopulationName,
            userStatusFilter: document.getElementById('export-population-filter').value,
            format: document.getElementById('export-format').value,
            includeDisabled: document.getElementById('export-include-disabled').checked,
            includeMetadata: document.getElementById('export-include-metadata').checked,
            useOverrideCredentials: this.overrideCredentials,
            exportToken: this.overrideCredentials ? this.exportToken : null
        };
    }

    showExportReminder() {
        if (this.overrideCredentials) {
            this.showInfo('Export completed', 'Remember to get a new token before using Import, Delete, or Modify operations.');
        }
    }

    // Logging methods
    logPopulationLoadStart() {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'Loading populations for export', {
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('Loading populations for export:', { timestamp: new Date().toISOString() });
        }
    }

    logPopulationLoadSuccess(count) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'Populations loaded successfully for export', {
                count: count,
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('Populations loaded successfully for export:', { count, timestamp: new Date().toISOString() });
        }
    }

    logPopulationLoadError(error) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('error', 'Failed to load populations for export', {
                error: error,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error('Failed to load populations for export:', error);
        }
    }

    logPopulationSelection() {
        const populationSelect = document.getElementById('export-population-select');
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'Population selected for export', {
                populationId: populationSelect.value,
                populationName: populationSelect.selectedOptions[0]?.text || '',
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('Population selected for export:', {
                populationId: populationSelect.value,
                populationName: populationSelect.selectedOptions[0]?.text || '',
                timestamp: new Date().toISOString()
            });
        }
    }

    logCredentialOverride(enabled) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'Export credential override toggled', {
                enabled: enabled,
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('Export credential override toggled:', { enabled, timestamp: new Date().toISOString() });
        }
    }

    logTokenGeneration(status, error = null) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log(status === 'success' ? 'info' : 'error', 'Export token generation', {
                status: status,
                error: error,
                timestamp: new Date().toISOString()
            });
        } else {
            console[status === 'success' ? 'info' : 'error']('Export token generation:', { status, error, timestamp: new Date().toISOString() });
        }
    }

    logTokenSet() {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'Export token set', {
                hasToken: !!this.exportToken,
                expiresAt: this.tokenExpiration?.toISOString(),
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('Export token set:', {
                hasToken: !!this.exportToken,
                expiresAt: this.tokenExpiration?.toISOString(),
                timestamp: new Date().toISOString()
            });
        }
    }

    logJWTView() {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'JWT token viewed', {
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('JWT token viewed:', { timestamp: new Date().toISOString() });
        }
    }

    logExportStart(options) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'Export operation started', {
                options: options,
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('Export operation started:', { options, timestamp: new Date().toISOString() });
        }
    }

    logExportSuccess(result) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('info', 'Export operation completed successfully', {
                result: result,
                timestamp: new Date().toISOString()
            });
        } else {
            console.info('Export operation completed successfully:', { result, timestamp: new Date().toISOString() });
        }
    }

    logExportError(error) {
        if (window.logManager && typeof window.logManager.log === 'function') {
            window.logManager.log('error', 'Export operation failed', {
                error: error,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error('Export operation failed:', { error, timestamp: new Date().toISOString() });
        }
    }

    showSuccess(title, message) {
        if (window.uiManager) {
            window.uiManager.showStatusMessage('success', title, message);
        } else {
            alert(`${title}: ${message}`);
        }
    }

    showError(message) {
        if (window.uiManager) {
            window.uiManager.showStatusMessage('error', 'Export Error', message);
        } else {
            alert('Error: ' + message);
        }
    }

    showInfo(title, message) {
        if (window.uiManager) {
            window.uiManager.showStatusMessage('info', title, message);
        } else {
            console.log(`${title}: ${message}`);
        }
    }
}

// Initialize export manager when DOM is loaded
// Only initialize if export UI elements exist
function hasExportUI() {
    return document.getElementById('export-population-select') ||
           document.getElementById('export-format') ||
           document.getElementById('start-export');
}
document.addEventListener('DOMContentLoaded', () => {
    if (hasExportUI()) {
        try {
            window.exportManager = new ExportManager();
        } catch (error) {
            console.error('Failed to initialize ExportManager:', error);
        }
    } else {
        window.exportManager = null;
    }
});

// Export for ES6 module system
export { ExportManager }; 