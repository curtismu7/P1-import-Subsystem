// PingOne User Management App v7.2.0
// 
// NOTIFICATION SYSTEM CONSOLIDATION:
// This app consolidates all notification methods through a single uiManager interface.
// All services should use this.uiManager.showNotification(), this.uiManager.showSuccess(), etc.
// This prevents the "method not found" errors that occurred when different parts of the code
// tried to call notification methods that didn't exist.

import { HomePage } from './pages/home-page.js?v=7.2.0';
import { SettingsPage } from './pages/settings-page.js?v=7.2.0-settings-hotfix-1';
import { ImportPage } from './pages/import-page.js?v=7.2.0';
import { ExportPage } from './pages/export-page.js?v=7.2.0-exp-shade-2';
import { DeletePage } from './pages/delete-page.js?v=7.2.0';
import { ModifyPage } from './pages/modify-page.js?v=7.2.0';
import { LogsPage } from './pages/logs-page.js?v=7.2.0';
import { TokenManagementPage } from './pages/token-management-page.js?v=7.2.0';
import { HistoryPage } from './pages/history-page.js?v=7.2.0';
import { HealthDashboardPage } from './pages/health-dashboard-page.js?v=7.3.0';
import { SwaggerPage } from './pages/swagger-page.js?v=7.2.0';

class PingOneApp {
    constructor() {
        this.version = '7.2.0';
        this.currentPage = 'home';
        this.settings = {};
        this.tokenStatus = { isValid: false, expiresAt: null, timeLeft: null };
        
        // File state persistence across pages
        this.fileState = {
            selectedFile: null,
            fileName: null,
            fileSize: null,
            fileType: null,
            lastModified: null
        };
        
        // Create a uiManager interface for services to use
        // This consolidates all notification methods and provides a consistent interface
        // that services can use, preventing "method not found" errors
        this.uiManager = {
            showNotification: (message, type = 'info') => this.showNotification(message, type),
            showSuccess: (message) => this.showSuccess(message),
            showError: (message, title = null) => this.showError(title ? `${title}: ${message}` : message),
            showWarning: (message) => this.showWarning(message),
            showInfo: (message) => this.showInfo(message),
            showStatusMessage: (message, type = 'info') => this.showStatusMessage(message, type),
            showStatusBar: (message, type = 'info') => this.showStatusMessage(message, type),
            showConfirmation: (message, onConfirm, onCancel) => {
                // Simple confirmation dialog - can be enhanced later
                if (confirm(message)) {
                    onConfirm && onConfirm();
                } else {
                    onCancel && onCancel();
                }
            },
            updateProgress: (current, total, message) => {
                // Progress update - can be enhanced later
                console.log(`Progress: ${current}/${total} - ${message}`);
            },
            hideProgress: () => {
                // Hide progress - can be enhanced later
                console.log('Progress hidden');
            },
            updateConnectionStatus: (status, message) => {
                // Connection status update - can be enhanced later
                this.showStatusMessage(message, status === 'error' ? 'error' : status === 'success' ? 'success' : 'info');
            },
            updateTokenStatus: (isValid, message) => {
                // Token status update - can be enhanced later
                this.showStatusMessage(message, isValid ? 'success' : 'error');
            },
            showSettingsActionStatus: (message, type = 'info', options = {}) => {
                // Settings action status - can be enhanced later
                this.showStatusMessage(message, type);
            }
        };

        // Status bar timing controls
        this._statusClearTimer = null;    // timer to revert to default
        this._statusHoldUntil = 0;        // minimum timestamp until which we shouldn't replace message
        this._statusReplaceTimer = null;  // timer to schedule a replace after hold
        this._hasActiveStatus = false;    // whether a status message is currently shown
        
        // Available uiManager methods:
        // - showNotification(message, type) - Main notification method
        // - showSuccess(message) - Success notifications
        // - showError(message, title) - Error notifications  
        // - showWarning(message) - Warning notifications
        // - showInfo(message) - Info notifications
        // - showStatusMessage(message, type) - Status bar messages
        // - showStatusBar(message, type) - Alias for showStatusMessage
        // - showConfirmation(message, onConfirm, onCancel) - Confirmation dialogs
        // - updateProgress(current, total, message) - Progress updates
        // - hideProgress() - Hide progress
        // - updateConnectionStatus(status, message) - Connection status
        // - updateTokenStatus(isValid, message) - Token status
        // - showSettingsActionStatus(message, type, options) - Settings actions
        
        // Initialize page modules
        this.pages = {
            home: new HomePage(this),
            settings: new SettingsPage(this),
            import: new ImportPage(this),
            export: new ExportPage(this),
            delete: new DeletePage(this),
            modify: new ModifyPage(this),
            logs: new LogsPage(this),
            'token-management': new TokenManagementPage(this),
            history: new HistoryPage(this),
            'health-dashboard': new HealthDashboardPage(this),
            swagger: new SwaggerPage(this)
        };
        
        console.log('🚀 PingOne User Management App v' + this.version + ' initializing...');
    }
    
    async init() {
        try {
            this.showLoading('Initializing application...');
            await this.loadSettings();
            await this.loadTokenStatus(); // Load current token status from server
            this.compareServerAndLocalCredentials();
            this.setupEventListeners();
            this.initializeUI(); // This will load the home page and update UI with current token status
            this.startTokenMonitoring();
            await this.checkInitialModals();
            console.log('✅ Application initialized successfully');
            this.updateServerStatus('Server Started');
            this.hideLoading();
            // Show a green check status message when the app has started
            this.showSuccess('Application started');
            // Ensure Home connection card reflects green status immediately
            const homePage = this.pages?.home;
            if (homePage && typeof homePage.refresh === 'function') {
                try { homePage.refresh(); } catch (_) {}
            }
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    // Compare server settings and local backup; if mismatch, prompt user to re-enter on Settings page
    compareServerAndLocalCredentials() {
        try {
            const local = this.getLocalCredentials();
            if (!local) return;
            const s = this.settings || {};
            const diff = [];
            const fields = ['pingone_environment_id','pingone_client_id','pingone_region'];
            for (const f of fields) {
                const sv = (s[f] || '').trim();
                const lv = (local[f] || '').trim();
                if (sv && lv && sv !== lv) diff.push(f);
            }
            // Don't compare client secret content directly; just detect presence mismatch
            const secretServer = !!(s.pingone_client_secret);
            const secretLocal = !!(local.pingone_client_secret);
            if (secretServer !== secretLocal) diff.push('pingone_client_secret');

            if (diff.length > 0) {
                this.showWarning('Credentials mismatch detected. Please review on Settings > Save correct values.');
                this.extendStatusDuration(2500);
                // Auto-navigate user to Settings page for review
                try {
                    this.showPage('settings');
                } catch (_) { /* ignore */ }
            }
        } catch (e) {
            console.warn('compareServerAndLocalCredentials failed:', e.message);
        }
    }
    
    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            const result = await response.json();
            
            // Extract actual settings from the API response
            if (result.success && result.data && result.data.data) {
                this.settings = result.data.data;
            } else if (result.success && result.data) {
                this.settings = result.data;
            } else if (result.success && result.message && typeof result.message === 'object') {
                this.settings = result.message;
            } else {
                // Fallback to the entire result if structure is different
                this.settings = result;
            }
            this._serverSettingsLoaded = true;
            // Normalize boolean flags from server which may arrive as strings ('false')
            this.settings.showDisclaimerModal = this.normalizeBoolean(
                this.settings.showDisclaimerModal,
                true
            );
            this.settings.showCredentialsModal = this.normalizeBoolean(
                this.settings.showCredentialsModal,
                true
            );
            
            console.log('🔧 [SETTINGS DEBUG] After normalization:');
            console.log('🔧 [SETTINGS DEBUG] showDisclaimerModal:', this.settings.showDisclaimerModal, typeof this.settings.showDisclaimerModal);
            console.log('🔧 [SETTINGS DEBUG] showCredentialsModal:', this.settings.showCredentialsModal, typeof this.settings.showCredentialsModal);
            
            // If injected settings.json exists, honor explicit false overrides for modals
            try {
                if (typeof window !== 'undefined' && window.settingsJson) {
                    const inj = window.settingsJson;
                    console.log('🔧 [SETTINGS DEBUG] Found window.settingsJson:', inj);
                    if (typeof inj.showDisclaimerModal === 'boolean') {
                        this.settings.showDisclaimerModal = inj.showDisclaimerModal;
                        console.log('🔧 [SETTINGS DEBUG] Override showDisclaimerModal to:', inj.showDisclaimerModal);
                    }
                    if (typeof inj.showCredentialsModal === 'boolean') {
                        this.settings.showCredentialsModal = inj.showCredentialsModal;
                        console.log('🔧 [SETTINGS DEBUG] Override showCredentialsModal to:', inj.showCredentialsModal);
                    }
                }
            } catch (error) {
                console.warn('🔧 [SETTINGS DEBUG] Error checking window.settingsJson:', error);
            }
            
            console.log('🔧 [SETTINGS DEBUG] Final settings after overrides:');
            console.log('🔧 [SETTINGS DEBUG] showDisclaimerModal:', this.settings.showDisclaimerModal, typeof this.settings.showDisclaimerModal);
            console.log('🔧 [SETTINGS DEBUG] showCredentialsModal:', this.settings.showCredentialsModal, typeof this.settings.showCredentialsModal);
            console.log('🔧 Settings loaded from server:', this.settings);
            this.updateVersionDisplay();
        } catch (error) {
            console.warn('⚠️ Could not load settings:', error.message);
            // Soft fallback: use injected window.settingsJson if available
            const injected = (typeof window !== 'undefined' && window.settingsJson) ? window.settingsJson : {};
            this.settings = {
                pingone_environment_id: injected.pingone_environment_id || '',
                pingone_client_id: injected.pingone_client_id || '',
                pingone_client_secret: injected.pingone_client_secret || '',
                pingone_region: injected.pingone_region || 'NorthAmerica',
                pingone_population_id: injected.pingone_population_id || '',
                populations: injected.populations || injected.populationCache || [],
                showDisclaimerModal: this.normalizeBoolean(injected.showDisclaimerModal, true),
                showCredentialsModal: this.normalizeBoolean(injected.showCredentialsModal, true),
                showSwaggerPage: injected.showSwaggerPage === true,
                rateLimit: injected.rateLimit || 100
            };
            this._serverSettingsLoaded = false;
            console.log('🔧 Using injected settingsJson fallback:', this.settings);
        }

        // Merge locally saved credentials ONLY if server settings were not loaded
        // This prevents local values from overwriting the server source of truth
            const localCreds = this.getLocalCredentials();
        if (!this._serverSettingsLoaded && localCreds) {
            this.settings = { ...this.settings, ...localCreds };
        }
    }

    // Normalize various representations to a boolean
    normalizeBoolean(value, defaultValue = true) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
            const v = value.trim().toLowerCase();
            if (['false','0','no','off','disabled'].includes(v)) return false;
            if (['true','1','yes','on','enabled'].includes(v)) return true;
        }
        return defaultValue;
    }
    
    async loadTokenStatus() {
        try {
            const response = await fetch('/api/token/status');
            const result = await response.json();
            
            if (result.success && result.data && result.data.data) {
                const tokenData = result.data.data;
                console.log('🔑 Token status loaded from server:', tokenData);
                
                // Update token status based on server response
                if (tokenData.hasToken && tokenData.isValid) {
                    this.tokenStatus.isValid = true;
                    this.tokenStatus.expiresAt = new Date(Date.now() + (tokenData.expiresIn * 1000));
                    this.tokenStatus.timeLeft = tokenData.expiresIn;
                    console.log('✅ Token is valid, expires in:', tokenData.expiresIn, 'seconds');
                } else {
                    this.tokenStatus.isValid = false;
                    this.tokenStatus.expiresAt = null;
                    this.tokenStatus.timeLeft = null;
                    console.log('❌ Token is invalid or expired');
                }
                
                this.updateTokenUI();
            } else {
                console.warn('⚠️ Invalid token status response:', result);
            }
        } catch (error) {
            console.warn('⚠️ Could not load token status:', error.message);
            // Keep default invalid status
            this.showInfo('Please enter credentials for your PingOne Environment');
        }
    }
    
    setupEventListeners() {
        document.addEventListener('click', this.handleNavigation.bind(this));
        this.setupModalEventListeners();
        window.addEventListener('resize', this.handleResize.bind(this));

        // Refresh token button in status bar
        const refreshBtn = document.getElementById('refresh-token-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Disable button during refresh
                refreshBtn.disabled = true;
                refreshBtn.style.opacity = '0.6';
                
                try {
                    this.showInfo('Refreshing PingOne token…');
                    
                    const resp = await fetch('/api/token/refresh', { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin'
                    });
                    
                    const data = await resp.json().catch(() => ({}));
                    
                    if (resp.ok && (data?.success === true || data?.access_token || data?.token)) {
                        // Server refresh succeeded; reload status from server to update UI consistently
                        await this.loadTokenStatus();
                        this.showSuccess('✅ Token refreshed successfully');
                        
                        // Update status message
                        const statusText = document.getElementById('status-text');
                        const statusIcon = document.getElementById('status-icon');
                        if (statusText) statusText.textContent = 'System Status - Ready';
                        if (statusIcon) statusIcon.className = 'icon-check-circle';
                        
                    } else {
                        throw new Error(data?.error || data?.message || `HTTP ${resp.status}: ${resp.statusText}`);
                    }
                } catch (err) {
                    console.error('Token refresh failed:', err);
                    this.showError(`❌ Failed to refresh token: ${err.message}`);
                    
                    // Update status message to show error
                    const statusText = document.getElementById('status-text');
                    const statusIcon = document.getElementById('status-icon');
                    if (statusText) statusText.textContent = 'Token Refresh Failed';
                    if (statusIcon) statusIcon.className = 'icon-x-circle';
                    
                } finally {
                    // Re-enable button
                    refreshBtn.disabled = false;
                    refreshBtn.style.opacity = '1';
                }
            });
        } else {
            console.warn('Refresh token button not found in DOM');
        }
    }
    
    setupModalEventListeners() {
        const disclaimerAccept = document.getElementById('disclaimer-accept');
        const disclaimerQuit = document.getElementById('disclaimer-quit');
        const disclaimerAgree = document.getElementById('disclaimer-agree');
        const credentialsSkip = document.getElementById('credentials-skip');
        const credentialsSettings = document.getElementById('credentials-settings');
        const credentialsSave = document.getElementById('credentials-save');
        const toggleSecret = document.getElementById('toggle-secret');
        const credRefreshBtn = document.getElementById('credentials-refresh-populations');
        const copyEnvBtn = document.getElementById('copy-env-id');
        
        if (disclaimerAccept) disclaimerAccept.addEventListener('click', this.handleDisclaimerAccept.bind(this));
        if (disclaimerQuit) disclaimerQuit.addEventListener('click', this.handleDisclaimerQuit.bind(this));
        // Enable Accept only when Terms checkbox is checked
        if (disclaimerAgree && disclaimerAccept) {
            disclaimerAccept.disabled = true;
            disclaimerAgree.addEventListener('change', (e) => {
                disclaimerAccept.disabled = !e.target.checked;
            });
        }
        if (credentialsSkip) credentialsSkip.addEventListener('click', this.handleCredentialsSkip.bind(this));
        if (credentialsSettings) credentialsSettings.addEventListener('click', this.handleCredentialsSettings.bind(this));
        if (credentialsSave) credentialsSave.addEventListener('click', this.handleCredentialsSave.bind(this));
        if (toggleSecret) toggleSecret.addEventListener('click', this.handleToggleSecret.bind(this));
        if (credRefreshBtn) credRefreshBtn.addEventListener('click', async () => {
            try {
                this.showWarning('Refreshing populations…');
                // Try cache-busting refresh from API first
                await fetch('/api/populations?refresh=1', { headers: { 'Cache-Control': 'no-store' } }).catch(() => {});
                await this.loadCredentialsPopulations();
                this.showSuccess('Populations refreshed');
            } catch (_) {}
        });

        // Copy Environment ID to clipboard
        if (copyEnvBtn) {
            copyEnvBtn.addEventListener('click', async () => {
                try {
                    const input = document.getElementById('cred-environment-id');
                    const value = input?.value?.trim();
                    if (!value) { this.showWarning('No Environment ID to copy'); return; }
                    await navigator.clipboard.writeText(value);
                    this.showSuccess('Environment ID copied to clipboard');
                } catch (err) {
                    this.showError('Failed to copy Environment ID');
                }
            });
        }

        // Copy Client ID in credentials modal
        const copyCredClientIdBtn = document.getElementById('copy-cred-client-id');
        if (copyCredClientIdBtn) {
            copyCredClientIdBtn.addEventListener('click', async () => {
                try {
                    const el = document.getElementById('cred-client-id');
                    const value = el?.value?.trim();
                    if (!value) { this.showWarning('No Client ID to copy'); return; }
                    await navigator.clipboard.writeText(value);
                    this.showSuccess('Client ID copied to clipboard');
                } catch (_) {
                    this.showError('Failed to copy Client ID');
                }
            });
        }

        // Copy Client Secret in credentials modal
        const copyCredClientSecretBtn = document.getElementById('copy-cred-client-secret');
        if (copyCredClientSecretBtn) {
            copyCredClientSecretBtn.addEventListener('click', async () => {
                try {
                    const el = document.getElementById('cred-client-secret');
                    const value = el?.value || '';
                    if (!value) { this.showWarning('No Client Secret to copy'); return; }
                    await navigator.clipboard.writeText(value);
                    this.showSuccess('Client Secret copied to clipboard');
                } catch (_) {
                    this.showError('Failed to copy Client Secret');
                }
            });
        }
    }
    
    initializeUI() {
        this.updateNavigation();
        this.initializeResponsiveNav();
        // Always scroll to top on initial UI render
        try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (_) { window.scrollTo(0,0); }
        // Restore page from URL hash or sessionStorage
        const hashPage = (window.location.hash || '').replace(/^#/, '');
        const storedPage = sessionStorage.getItem('currentPage');
        const initialPage = (hashPage && this.pages[hashPage]) ? hashPage : (storedPage && this.pages[storedPage] ? storedPage : this.currentPage);
        this.showPage(initialPage);
        
        // Show/hide Swagger based on settings
        const swaggerNav = document.getElementById('swagger-nav');
        const swaggerCard = document.getElementById('swagger-card');
        if (this.settings.showSwaggerPage) {
            if (swaggerNav) swaggerNav.style.display = 'block';
            if (swaggerCard) swaggerCard.style.display = 'block';
        }
    }
    
    async checkInitialModals() {
        console.log('🔍 [MODAL DEBUG] checkInitialModals called');
        console.log('🔍 [MODAL DEBUG] Current settings:', this.settings);
        console.log('🔍 [MODAL DEBUG] showDisclaimerModal:', this.settings.showDisclaimerModal);
        console.log('🔍 [MODAL DEBUG] showCredentialsModal:', this.settings.showCredentialsModal);
        
        // Token status is now loaded from server, no need to check localStorage
        
        if (this.settings.showDisclaimerModal) {
            console.log('🔍 [MODAL DEBUG] Showing disclaimer modal');
            this.showDisclaimerModal();
            return;
        } else {
            console.log('🔍 [MODAL DEBUG] Disclaimer modal disabled in settings');
        }
        
        if (this.shouldShowCredentialsModal()) {
            console.log('🔍 [MODAL DEBUG] Showing credentials modal');
            this.showCredentialsModal();
            return;
        } else {
            console.log('🔍 [MODAL DEBUG] Credentials modal disabled in settings');
        }
        
        console.log('🔍 [MODAL DEBUG] No modals to show, checking token status');
        await this.checkTokenStatus();
    }
    
    shouldShowCredentialsModal() {
        // Default to showing credentials modal unless explicitly disabled
        return this.settings.showCredentialsModal !== false;
    }
    
    // Modal handlers
    showDisclaimerModal() {
        console.log('🔍 [MODAL DEBUG] showDisclaimerModal called');
        const modal = document.getElementById('disclaimer-modal');
        if (modal) {
            console.log('🔍 [MODAL DEBUG] Disclaimer modal found, showing it');
            modal.classList.add('active');
            // Add body class to prevent background scrolling
            document.body.classList.add('disclaimer-modal-open');
            console.log('🔍 [MODAL DEBUG] Disclaimer modal shown with active class');
        } else {
            console.error('🔍 [MODAL DEBUG] Disclaimer modal not found in DOM');
        }
    }
    
    hideDisclaimerModal() {
        console.log('🔍 [MODAL DEBUG] hideDisclaimerModal called');
        const modal = document.getElementById('disclaimer-modal');
        if (modal) {
            modal.classList.remove('active');
            // Remove body class to restore background scrolling
            document.body.classList.remove('disclaimer-modal-open');
            console.log('🔍 [MODAL DEBUG] Disclaimer modal hidden');
        }
    }
    
    showCredentialsModal() {
        console.log('🔍 [MODAL DEBUG] showCredentialsModal called');
        const modal = document.getElementById('credentials-modal');
        if (modal) {
            console.log('🔍 [MODAL DEBUG] Credentials modal found, showing it');
            this.populateCredentialsForm();
            modal.classList.add('active');
            // Add body class to prevent background scrolling
            document.body.classList.add('credentials-modal-open');
            console.log('🔍 [MODAL DEBUG] Credentials modal shown with active class');
            // Prevent background page scrolling while modal is open
            try { document.body.style.overflow = 'hidden'; } catch (_) {}
            // If a valid token already exists, inform the user
            if (this.tokenStatus && this.tokenStatus.isValid) {
                // Inline banner inside the credentials modal (so it is visible above the overlay)
                const body = modal.querySelector('.modal-body');
                if (body) {
                    let banner = modal.querySelector('#credentials-token-banner');
                    if (!banner) {
                        banner = document.createElement('div');
                        banner.id = 'credentials-token-banner';
                        banner.setAttribute('role', 'status');
                        banner.style.margin = '0 0 12px 0';
                        banner.style.padding = '10px 12px';
                        banner.style.borderRadius = '8px';
                        banner.style.background = 'var(--ping-success-light, #E6F7ED)';
                        banner.style.border = '1px solid var(--ping-success, #00AA44)';
                        banner.style.color = 'var(--ping-gray-800, #2D2D2D)';
                        banner.style.fontWeight = '600';
                        // insert at top of body
                        body.insertBefore(banner, body.firstChild);
                    }
                    banner.textContent = 'Token Obtained. If this is the not the right PingOne environment, please enter credentials below.';
                    banner.style.display = 'block';
                }
                // Also show global status bar for consistency
                this.showSuccess('Token Obtained. If this is the not the right PingOne environment, please enter credentials below.');
            } else {
                // Hide banner if previously created
                const existing = modal.querySelector('#credentials-token-banner');
                if (existing) existing.style.display = 'none';
            }
            // Disable Population until token is obtained
            const credPop = document.getElementById('cred-population');
            if (credPop) {
                credPop.disabled = true;
                if (!credPop.options.length) {
                    const opt = document.createElement('option');
                    opt.value = '';
                    opt.textContent = 'Get new token';
                    credPop.appendChild(opt);
                } else if (credPop.options[0]) {
                    credPop.options[0].textContent = 'Get new token';
                    credPop.options[0].value = '';
                    credPop.selectedIndex = 0;
                }
            }
        }
    }
    
    hideCredentialsModal() {
        const modal = document.getElementById('credentials-modal');
        if (modal) {
            modal.classList.remove('active');
            // Remove body class to restore background scrolling
            document.body.classList.remove('credentials-modal-open');
        }
        try { document.body.style.overflow = ''; } catch (_) {}
    }
    
    populateCredentialsForm() {
        const fields = {
            'cred-environment-id': (this.settings.pingone_environment_id || (this.getLocalCredentials()?.pingone_environment_id)) || '',
            'cred-client-id': (this.settings.pingone_client_id || (this.getLocalCredentials()?.pingone_client_id)) || '',
            'cred-client-secret': (this.getLocalCredentials()?.pingone_client_secret || this.settings.pingone_client_secret) || '',
            'cred-region': this.settings.pingone_region || 'NorthAmerica'
        };
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && value !== undefined) element.value = value;
        });

        // Populate populations in credentials modal
        this.loadCredentialsPopulations().catch(err => {
            console.warn('⚠️ Could not load populations for credentials modal:', err.message);
        });

        // Try secure credentials endpoint to ensure fields are populated
        (async () => {
            try {
                const resp = await fetch('/api/settings/credentials');
                const result = await resp.json().catch(() => ({}));
                if (resp.ok && result && (result.data || result.environmentId)) {
                    const creds = result.data || result;
                    const map = {
                        'cred-environment-id': creds.environmentId,
                        'cred-client-id': creds.clientId,
                        'cred-client-secret': creds.clientSecret,
                        'cred-region': creds.region
                    };
                    Object.entries(map).forEach(([id, value]) => {
                        const el = document.getElementById(id);
                        if (el && value) el.value = value;
                    });
                }
            } catch (_) {
                // Fallback: read public backup if available
                try {
                    const resp = await fetch('/data/settings.json');
                    if (resp.ok) {
                        const json = await resp.json();
                        const map = {
                            'cred-environment-id': json.pingone_environment_id,
                            'cred-client-id': json.pingone_client_id,
                            'cred-client-secret': json.pingone_client_secret,
                            'cred-region': json.pingone_region
                        };
                        Object.entries(map).forEach(([id, value]) => {
                            const el = document.getElementById(id);
                            if (el && value) el.value = value;
                        });
                    }
                } catch (_) {}
            }
        })();
    }

    /**
     * Load populations into the credentials modal with sensible fallbacks
     */
    async loadCredentialsPopulations() {
        const select = document.getElementById('cred-population');
        if (!select) return;

        const setOptions = (populations = []) => {
            select.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select a population...';
            select.appendChild(placeholder);
            for (const p of populations) {
                if (!p) continue;
                const opt = document.createElement('option');
                opt.value = p.id || p.populationId || p.value || '';
                opt.textContent = p.name || p.label || p.text || 'Unnamed Population';
                select.appendChild(opt);
            }
            const selected = this.settings.pingone_population_id || '';
            if (selected) select.value = selected;
        };

        // Check if we have cached populations in settings
        if (this.settings && this.settings.populationCache && this.settings.populationCache.populations) {
            setOptions(this.settings.populationCache.populations);
            return;
        }

        // Try public settings first (sanitized)
        try {
            const resp = await fetch('/api/settings/public');
            if (resp.ok) {
                const data = await resp.json().catch(() => ({}));
                const pops = (data && (data.populations || (data.data && data.data.populations))) || [];
                if (Array.isArray(pops) && pops.length) {
                    setOptions(pops);
                    return;
                }
            }
        } catch (_) { /* ignore */ }

        // Fallback to direct populations endpoint
        try {
            const resp = await fetch('/api/populations');
            if (resp.ok) {
                const data = await resp.json().catch(() => ({}));
                // Support multiple response envelopes
                const pops = (
                    (data && (data.populations)) ||
                    (data && data.message && data.message.populations) ||
                    (data && data.data && data.data.populations) ||
                    (data && data.data && data.data.message && data.data.message.populations) ||
                    (data && data.items) ||
                    []
                );
                if (Array.isArray(pops) && pops.length) {
                    setOptions(pops);
                    return;
                }
            }
        } catch (_) { /* ignore */ }

        // Final fallback: server settings (may include cached list)
        try {
            const resp = await fetch('/api/settings');
            if (resp.ok) {
                const payload = await resp.json().catch(() => ({}));
                const settings = payload && ((payload.success && (payload.data && (payload.data.data || payload.data))) || payload);
                const pops = (
                    (settings && settings.populationCache && settings.populationCache.populations) ||
                    (settings && settings.data && settings.data.populationCache && settings.data.populationCache.populations) ||
                    []
                );
                setOptions(Array.isArray(pops) ? pops : []);
            }
        } catch (err) {
            console.warn('Population fallback failed:', err.message);
            setOptions([]);
        }
    }
    
    // Event handlers
    async handleDisclaimerAccept() {
        this.hideDisclaimerModal();
        this.settings.showDisclaimerModal = false;
        try {
            await this.saveSettings({ showDisclaimerModal: false });
        } catch (err) {
            // Non-blocking: show a friendly prompt instead of surfacing errors
            this.showInfo('Please enter credentials for your PingOne Environment');
        }
        if (this.shouldShowCredentialsModal()) {
            this.showCredentialsModal();
        } else {
            this.checkTokenStatus();
        }
    }
    
    handleDisclaimerQuit() {
        const confirmed = confirm('Are you sure you want to quit the application?');
        if (!confirmed) return;
        // Keep user on the disclaimer: reset and ensure it stays visible
        const checkbox = document.getElementById('disclaimer-agree');
        const acceptBtn = document.getElementById('disclaimer-accept');
        if (checkbox) checkbox.checked = false;
        if (acceptBtn) acceptBtn.disabled = true;
        this.showDisclaimerModal();
        this.showWarning('You must accept the disclaimer to continue');
    }
    
    handleCredentialsSkip() {
        this.hideCredentialsModal();
        this.showPage('home');
    }
    
    handleCredentialsSettings() {
        this.hideCredentialsModal();
        this.showPage('settings');
        // Proactively load populations on the settings page after navigation
        setTimeout(() => {
            const settingsPage = this.pages && this.pages['settings'];
            if (settingsPage && typeof settingsPage.loadPopulations === 'function') {
                settingsPage.loadPopulations();
            }
        }, 200);
    }
    
    async handleCredentialsSave() {
        const form = document.getElementById('credentials-form');
        if (!form) return;
        
        const formData = new FormData(form);
        const credentials = {
            pingone_environment_id: formData.get('environmentId'),
            pingone_client_id: formData.get('clientId'),
            pingone_client_secret: formData.get('clientSecret'),
            pingone_region: formData.get('region'),
            pingone_population_id: formData.get('populationId') || ''
        };
        
        if (!credentials.pingone_environment_id || !credentials.pingone_client_id || !credentials.pingone_client_secret) {
            this.showError('Please fill in all required fields');
            return;
        }
        
        try {
            this.showLoading('Saving credentials...');
            // Update in-memory settings and persist to server (settings.json)
            Object.assign(this.settings, credentials);
            try {
                await this.saveSettings(this.settings);
            } catch (persistErr) {
                // In environments where saving is blocked (e.g., read-only), continue gracefully
                this.showInfo('Saved locally. Please ensure server settings are configured.');
            }
            
            // Acquire new token from server using saved credentials
            const tokenResult = await this.getToken(credentials);
            if (tokenResult.success && tokenResult.token) {
                // Keep a local copy so the modal stays populated on reload
                this.setLocalCredentials(credentials);
                this.updateTokenStatus(tokenResult.token);
                this.showSuccess('Credentials saved and new token acquired');
                // Fetch populations now that we have a token, keep modal open so user can select
                try {
                    await fetch('/api/populations?refresh=1', { cache: 'no-store' }).catch(() => null);
                    await this.loadCredentialsPopulations();
                    const credPop = document.getElementById('cred-population');
                    if (credPop) credPop.disabled = false;
                } catch (_) {
                    // fallback: attempt to load without refresh
                    await this.loadCredentialsPopulations();
                    const credPop = document.getElementById('cred-population');
                    if (credPop) credPop.disabled = false;
                }
            } else {
                throw new Error(tokenResult.error || 'Failed to acquire token');
            }
        } catch (error) {
            this.showError('Failed to save credentials: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    // Local credentials helpers for resilience when server rejects settings
    getLocalCredentials() {
        try {
            const raw = localStorage.getItem('pingone_local_credentials');
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    setLocalCredentials(creds) {
        try {
            const safe = {
                pingone_environment_id: creds.pingone_environment_id || '',
                pingone_client_id: creds.pingone_client_id || '',
                pingone_client_secret: creds.pingone_client_secret || '',
                pingone_region: creds.pingone_region || 'NorthAmerica',
                pingone_population_id: creds.pingone_population_id || ''
            };
            localStorage.setItem('pingone_local_credentials', JSON.stringify(safe));
        } catch (_) {
            // ignore
        }
    }
    
    handleToggleSecret() {
        const secretInput = document.getElementById('cred-client-secret');
        const toggleIcon = document.querySelector('#toggle-secret i');
        if (secretInput && toggleIcon) {
            if (secretInput.type === 'password') {
                secretInput.type = 'text';
                toggleIcon.className = 'icon-eye-off';
            } else {
                secretInput.type = 'password';
                toggleIcon.className = 'icon-eye';
            }
        }
    }
    
    handleNavigation(event) {
        const navLink = event.target.closest('.nav-link');
        if (navLink) {
            event.preventDefault();
            const page = navLink.dataset.page;
            if (page) this.showPage(page);
            return;
        }
        
        const actionCard = event.target.closest('.action-card');
        if (actionCard) {
            event.preventDefault();
            // Check for both data-action and data-page attributes
            const action = actionCard.dataset.action || actionCard.dataset.page;
            if (action) this.showPage(action);
        }
    }
    
    handleResize() {
        this.updateResponsiveLayout();
    }
    
    // Page management
    showPage(pageName) {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.style.display = 'none');
        
        // Clear Import page transient state when navigating away so it resets on return
        if (this.currentPage === 'import' && pageName !== 'import') {
            this.setFileState(null);
        }

        const targetPage = document.getElementById(pageName + '-page');
        if (targetPage) {
            targetPage.style.display = 'block';
            this.currentPage = pageName;
            this.loadPageContent(pageName);
            
            // Enhanced scroll to top on each page show
            this.scrollToTop('smooth');
        }
        
        this.updateNavigation();
        window.location.hash = pageName;
        sessionStorage.setItem('currentPage', pageName);
    }
    
    async loadPageContent(pageName) {
        // Load specific page content using page modules
        console.log('📄 Loading page:', pageName);
        
        const page = this.pages[pageName];
        if (page && typeof page.load === 'function') {
            await page.load();
        } else {
            console.warn('⚠️ Page module not found for:', pageName);
        }
    }
    
    updateNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === this.currentPage) {
                link.classList.add('active');
            }
        });
    }
    
    initializeResponsiveNav() {
        const navToggle = document.getElementById('nav-toggle');
        const leftNav = document.getElementById('left-nav');
        if (navToggle && leftNav) {
            navToggle.addEventListener('click', () => {
                leftNav.classList.toggle('expanded');
            });
        }
    }
    
    updateResponsiveLayout() {
        const leftNav = document.getElementById('left-nav');
        if (window.innerWidth <= 768) {
            if (leftNav) leftNav.classList.add('mobile');
        } else {
            if (leftNav) leftNav.classList.remove('mobile', 'expanded');
        }
    }
    
    // Token management
    checkStoredToken() {
        try {
            const storedToken = localStorage.getItem('pingone_token');
            const storedExpires = localStorage.getItem('pingone_token_expires');
            
            if (storedToken && storedExpires) {
                const tokenData = JSON.parse(storedToken);
                const expiresAt = new Date(storedExpires);
                const now = new Date();
                
                if (expiresAt > now) {
                    // Token is still valid
                    const timeLeft = Math.floor((expiresAt - now) / 1000);
                    tokenData.expires_in = timeLeft;
                    this.updateTokenStatus(tokenData);
                    console.log('✅ Found valid token in localStorage');
                    return;
                }
            }
            
            // No valid token found
            this.updateTokenStatus(null);
        } catch (error) {
            console.warn('⚠️ Error checking stored token:', error.message);
            this.updateTokenStatus(null);
        }
    }
    
    async checkTokenStatus() {
        try {
            // Token status is now managed by server, no need to check localStorage
            console.log('🔍 checkTokenStatus called - using server-side token management');
            
            // Use the existing token status endpoint instead of validate
            // The token status is already loaded in loadTokenStatus(), no need to validate again
        } catch (error) {
            console.warn('⚠️ Could not check token status:', error.message);
            // Keep existing token status if server check fails
        }
    }
    
    async getToken(credentials) {
        try {
            const response = await fetch('/api/pingone/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            const result = await response.json();
            return { success: response.ok, token: result, error: result.error };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    updateTokenStatus(tokenData) {
        if (tokenData && tokenData.access_token) {
            this.tokenStatus.isValid = true;
            // Prefer absolute expiry if provided; else derive from expires_in
            const abs = tokenData.expires_at || tokenData.expiresAt;
            if (abs) {
                const n = typeof abs === 'string' && !/^[0-9]+$/.test(abs) ? Date.parse(abs) : Number(abs);
                const ms = Number.isFinite(n) ? (n < 1e12 ? n * 1000 : n) : Date.now() + (tokenData.expires_in * 1000);
                this.tokenStatus.expiresAt = new Date(ms);
                this.tokenStatus.timeLeft = Math.max(0, Math.floor((this.tokenStatus.expiresAt - new Date()) / 1000));
            } else {
                this.tokenStatus.expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
                this.tokenStatus.timeLeft = tokenData.expires_in;
            }
            localStorage.setItem('pingone_token', JSON.stringify(tokenData));
        } else {
            this.tokenStatus.isValid = false;
            this.tokenStatus.expiresAt = null;
            this.tokenStatus.timeLeft = null;
            localStorage.removeItem('pingone_token');
        }
        this.updateTokenUI();
    }
    
    updateTokenUI() {
        // Update header token indicator (top status bar)
        const headerTokenIndicator = document.getElementById('token-indicator');
        const headerTokenText = document.getElementById('token-text');
        const headerTokenTime = document.getElementById('token-time');
        
        if (headerTokenIndicator) {
            headerTokenIndicator.className = 'status-indicator ' + (this.tokenStatus.isValid ? 'valid' : 'invalid');
        }
        
        if (headerTokenText) {
            headerTokenText.textContent = this.tokenStatus.isValid ? 'Token: Valid' : 'Token: Invalid';
        }
        
        if (headerTokenTime) {
            headerTokenTime.textContent = this.tokenStatus.isValid ? this.formatTimeLeft(this.tokenStatus.timeLeft) : '';
        }
        
        // Update footer token indicator
        const footerTokenIndicator = document.getElementById('footer-token-indicator');
        const footerTokenText = document.getElementById('footer-token-text');
        const footerTokenTime = document.getElementById('footer-token-time');
        
        if (footerTokenIndicator) {
            footerTokenIndicator.className = 'token-indicator ' + (this.tokenStatus.isValid ? 'valid' : 'invalid');
        }
        
        if (footerTokenText) {
            footerTokenText.textContent = this.tokenStatus.isValid ? 'Token: Valid' : 'Token: Invalid';
        }
        
        if (footerTokenTime) {
            footerTokenTime.textContent = this.tokenStatus.isValid ? this.formatTimeLeft(this.tokenStatus.timeLeft) : '';
        }
        
        // Update home page token status card
        const homeTokenIndicator = document.querySelector('#home-page #token-indicator');
        const homeTokenStatus = document.getElementById('token-status');
        const homeTokenIcon = document.getElementById('token-icon');
        
        if (homeTokenIndicator) {
            homeTokenIndicator.className = 'status-indicator ' + (this.tokenStatus.isValid ? 'valid' : 'invalid');
        }
        
        if (homeTokenStatus) {
            homeTokenStatus.textContent = this.tokenStatus.isValid ? 
                `Valid (${this.formatTimeLeft(this.tokenStatus.timeLeft)})` : 'Invalid or Expired';
        }
        
        if (homeTokenIcon) {
            homeTokenIcon.className = this.tokenStatus.isValid ? 'icon-key' : 'icon-key-off';
        }
        
        console.log('🔄 Token UI updated:', {
            isValid: this.tokenStatus.isValid,
            timeLeft: this.tokenStatus.timeLeft,
            headerUpdated: !!headerTokenIndicator,
            footerUpdated: !!footerTokenIndicator,
            homeUpdated: !!homeTokenIndicator
        });
        
        // Notify pages of token status change
        Object.values(this.pages).forEach(page => {
            if (page && typeof page.onTokenStatusChange === 'function') {
                page.onTokenStatusChange(this.tokenStatus);
            }
        });
    }
    
    updateTokenUIOnly() {
        // Update header token indicator (top status bar)
        const headerTokenIndicator = document.getElementById('token-indicator');
        const headerTokenText = document.getElementById('token-text');
        const headerTokenTime = document.getElementById('token-time');
        
        if (headerTokenIndicator) {
            headerTokenIndicator.className = 'status-indicator ' + (this.tokenStatus.isValid ? 'valid' : 'invalid');
        }
        
        if (headerTokenText) {
            headerTokenText.textContent = this.tokenStatus.isValid ? 'Token: Valid' : 'Token: Invalid';
        }
        
        if (headerTokenTime) {
            headerTokenTime.textContent = this.tokenStatus.isValid ? this.formatTimeLeft(this.tokenStatus.timeLeft) : '';
        }
        
        // Update footer token indicator
        const footerTokenIndicator = document.getElementById('footer-token-indicator');
        const footerTokenText = document.getElementById('footer-token-text');
        const footerTokenTime = document.getElementById('footer-token-time');
        
        if (footerTokenIndicator) {
            footerTokenIndicator.className = 'token-indicator ' + (this.tokenStatus.isValid ? 'valid' : 'invalid');
        }
        
        if (footerTokenText) {
            footerTokenText.textContent = this.tokenStatus.isValid ? 'Token: Valid' : 'Token: Invalid';
        }
        
        if (footerTokenTime) {
            footerTokenTime.textContent = this.tokenStatus.isValid ? this.formatTimeLeft(this.tokenStatus.timeLeft) : '';
        }
        
        // Update home page token status card
        const homeTokenIndicator = document.querySelector('#home-page #token-indicator');
        const homeTokenStatus = document.getElementById('token-status');
        const homeTokenIcon = document.getElementById('token-icon');
        
        if (homeTokenIndicator) {
            homeTokenIndicator.className = 'status-indicator ' + (this.tokenStatus.isValid ? 'valid' : 'invalid');
        }
        
        if (homeTokenStatus) {
            homeTokenStatus.textContent = this.tokenStatus.isValid ? 
                `Valid (${this.formatTimeLeft(this.tokenStatus.timeLeft)})` : 'Invalid or Expired';
        }
        
        if (homeTokenIcon) {
            homeTokenIcon.className = this.tokenStatus.isValid ? 'icon-key' : 'icon-key-off';
        }
        
        // Note: This method does NOT notify pages of token status change
        // It only updates the UI elements for countdown display
    }
    
    updateServerStatus(statusText) {
        const serverStatusText = document.getElementById('footer-server-text');
        const serverStatusIndicator = document.getElementById('footer-server-indicator');
        
        if (serverStatusText) {
            serverStatusText.textContent = statusText;
        }
        
        if (serverStatusIndicator) {
            // Set indicator color based on status
            if (statusText === 'Server Started') {
                serverStatusIndicator.className = 'status-indicator status-valid';
                // Server status indicator set to green
            } else {
                serverStatusIndicator.className = 'status-indicator';
            }
        }
    }
    
    formatTimeLeft(seconds) {
        if (!seconds || seconds <= 0) return '';
        if (seconds < 300) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}m ${secs}s`;
        } else {
            const mins = Math.floor(seconds / 60);
            return `${mins}m`;
        }
    }
    
    startTokenMonitoring() {
        // Update token status every 30 seconds by fetching from server
        setInterval(async () => {
            await this.loadTokenStatus();
        }, 30000);
        
        // Update UI countdown every second when token is close to expiry
        setInterval(() => {
            if (this.tokenStatus.isValid && this.tokenStatus.expiresAt) {
                const timeLeft = Math.floor((this.tokenStatus.expiresAt - new Date()) / 1000);
                const previousValidity = this.tokenStatus.isValid;
                
                if (timeLeft <= 0) {
                    // Token expired, will be caught by server refresh
                    this.tokenStatus.isValid = false;
                    this.tokenStatus.expiresAt = null;
                    this.tokenStatus.timeLeft = null;
                    // Only update UI when validity changes
                    if (previousValidity !== this.tokenStatus.isValid) {
                        this.updateTokenUI();
                    } else {
                        this.updateTokenUIOnly(); // Update UI without notifying pages
                    }
                } else {
                    this.tokenStatus.timeLeft = timeLeft;
                    // Only update UI display, don't notify pages on countdown
                    this.updateTokenUIOnly();
                }
            }
        }, 1000);
    }
    
    updateVersionDisplay() {
        const versionElements = document.querySelectorAll('#version-info, #footer-version');
        versionElements.forEach(element => element.textContent = 'v' + this.version);
    }

  // Record an operation in History (falls back to localStorage if page not loaded)
  addHistoryEntry(operation, status, description, usersProcessed = 0, duration = 0) {
    try {
      const historyPage = this.pages && this.pages['history'];
      if (historyPage && typeof historyPage.addHistoryEntry === 'function') {
        // Only update immediately if the history page is currently visible in DOM
        const historyDom = document.getElementById('history-page');
        if (historyDom && historyDom.style.display !== 'none') {
          historyPage.addHistoryEntry(operation, status, description, usersProcessed, duration);
          return;
        }
      }

      // Fallback: persist to localStorage so History page can load it later
      const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        operation,
        status,
        description,
        usersProcessed,
        duration,
        details: `Operation ${operation} ${status}`,
        user: 'Current User'
      };
      const existing = JSON.parse(localStorage.getItem('operation_history') || '[]');
      existing.unshift(entry);
      if (existing.length > 100) existing.length = 100;
      localStorage.setItem('operation_history', JSON.stringify(existing));
    } catch (err) {
      console.warn('History entry failed:', err);
    }
  }
    
    async saveSettings(updated = null) {
        try {
            // Build a payload that only includes keys allowed by the server schema
            const source = updated && typeof updated === 'object' ? updated : this.settings || {};
            const allowedKeys = [
                // Standard preferred keys
                'pingone_environment_id',
                'pingone_client_id',
                'pingone_client_secret',
                'pingone_population_id',
                'pingone_region',
                // Legacy keys (server supports them for backward compatibility)
                'environmentId',
                'apiClientId',
                'apiSecret',
                'populationId',
                'region',
                'clientId',
                'clientSecret',
                // App preferences
                'rateLimit',
                'showDisclaimerModal',
                'showCredentialsModal',
                'showSwaggerPage',
                'autoRefreshToken'
            ];
            const payload = {};
            for (const key of allowedKeys) {
                if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
                    payload[key] = source[key];
                }
            }

            const resp = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                // Surface server-side validation details if present
                const messages = [];
                if (result && Array.isArray(result.errors)) {
                    for (const err of result.errors) {
                        if (err && (err.message || err.field)) {
                            messages.push(`${err.field ? err.field + ': ' : ''}${err.message || ''}`.trim());
                        }
                    }
                }
                const serverMsg = result && (result.error || result.message);
                const combined = messages.length ? messages.join('\n') : (serverMsg || 'Failed to save settings');
                throw new Error(combined);
            }

            // Update in-memory settings with any sanitized values returned by server
            if (result && result.success && result.data) {
                // Merge non-sensitive fields from server response back into app settings
                this.settings = { ...this.settings, ...result.data };
            }

            // Notify pages of settings change
            Object.values(this.pages).forEach(page => {
                if (page && typeof page.onSettingsChange === 'function') {
                    page.onSettingsChange(this.settings);
                }
            });
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showError(`Save failed: ${error.message}`);
            throw error; // rethrow so callers can react
        }
    }
    
    // Utility methods
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        if (overlay) overlay.style.display = 'flex';
        if (text) text.textContent = message;
    }
    
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.remove('active');
            // STARTUP BLUR FIX: Ensure blur effects are removed
            overlay.style.backdropFilter = 'none';
            overlay.style.webkitBackdropFilter = 'none';
        }
        
        // Also hide any modal loading overlays
        const modalOverlays = document.querySelectorAll('.modal-loading-overlay');
        modalOverlays.forEach(modalOverlay => {
            modalOverlay.style.display = 'none';
            modalOverlay.classList.remove('active');
            modalOverlay.style.backdropFilter = 'none';
            modalOverlay.style.webkitBackdropFilter = 'none';
        });
        
        // Only remove excessive blur from body/html when hiding loading
        document.body.style.filter = 'none';
        document.body.style.backdropFilter = 'none';
        document.body.style.webkitBackdropFilter = 'none';
        document.documentElement.style.filter = 'none';
        document.documentElement.style.backdropFilter = 'none';
        document.documentElement.style.webkitBackdropFilter = 'none';
        
        // Ensure any other loading states are cleared
        console.log('✅ Loading overlay hidden and excessive blur removed');
    }
    
    // CONSOLIDATED NOTIFICATION METHODS
    // These methods provide the core notification functionality that the uiManager interface uses
    showSuccess(message) { this.showStatusMessage(message, 'success'); }
    showError(message) { this.showStatusMessage(message, 'error'); }
    showWarning(message) { this.showStatusMessage(message, 'warning'); }
    showInfo(message) { this.showStatusMessage(message, 'info'); }

    /**
     * Show notification (alias for showStatusMessage for compatibility)
     * @param {string} message - Message to display
     * @param {string} type - Type of notification (success, error, warning, info)
     */
    showNotification(message, type = 'info') {
        this.showStatusMessage(message, type);
    }

    // File state management
    setFileState(file) {
        if (file) {
            this.fileState = {
                selectedFile: file,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                lastModified: file.lastModified
            };
            console.log('📁 File state updated:', this.fileState.fileName);
        } else {
            this.fileState = {
                selectedFile: null,
                fileName: null,
                fileSize: null,
                fileType: null,
                lastModified: null
            };
            console.log('📁 File state cleared');
        }
    }
    
    getFileState() {
        return this.fileState;
    }
    
    hasFileState() {
        return this.fileState.selectedFile !== null;
    }
    
    /**
     * Core status message display method
     * This is the foundation for all notification types in the consolidated system
     * @param {string} message - Message to display
     * @param {string} type - Type of message (success, error, warning, info)
     */
    showStatusMessage(message, type = 'info') {
        // Use the green status message bar at the top
        const statusBar = document.getElementById('status-message-bar');
        const statusText = document.getElementById('status-text');
        const statusIcon = document.getElementById('status-icon');
        const now = Date.now();

        // If a message is active and we are within a minimum hold window, delay non-error replacements
        if (this._hasActiveStatus && now < this._statusHoldUntil && type !== 'error') {
            const delay = Math.max(0, this._statusHoldUntil - now);
            if (this._statusReplaceTimer) clearTimeout(this._statusReplaceTimer);
            this._statusReplaceTimer = setTimeout(() => {
                this.showStatusMessage(message, type);
            }, delay);
            return;
        }

        if (statusBar && statusText) {
            statusText.textContent = message;
            
            // Update icon based on message type
            if (statusIcon) {
                switch (type) {
                    case 'success':
                        statusIcon.className = 'icon-check-circle';
                        break;
                    case 'error':
                        statusIcon.className = 'icon-x-circle';
                        break;
                    case 'warning':
                        statusIcon.className = 'icon-alert-triangle';
                        break;
                    default:
                        statusIcon.className = 'icon-info';
                }
            }
            
            // Show the status bar
            statusBar.style.display = 'flex';
            statusBar.className = `status-message-bar ${type}`;
            this._hasActiveStatus = true;

            // Clear any pending clear timer and schedule new default revert (4s)
            if (this._statusClearTimer) clearTimeout(this._statusClearTimer);
            this._statusClearTimer = setTimeout(() => {
                const currentTime = new Date().toLocaleTimeString();
                statusText.textContent = `System Status - ${currentTime}`;
                if (statusIcon) statusIcon.className = 'icon-check-circle';
                statusBar.className = 'status-message-bar';
                // Keep it visible but with default styling
                this._hasActiveStatus = false;
            }, 4000);
        }
    }

    // Ensure the current status message remains visible for at least ms milliseconds
    extendStatusDuration(ms = 2500) {
        const now = Date.now();
        this._statusHoldUntil = Math.max(this._statusHoldUntil || 0, now + ms);
        // No immediate UI change needed; showStatusMessage respects this during replacements
    }

    // Show a status bar message with an inline action button (e.g., Undo)
    showUndoable(message, type = 'info', actionText = 'Undo', onAction = () => {}, timeoutMs = 4000) {
        const statusBar = document.getElementById('status-message-bar');
        const statusText = document.getElementById('status-text');
        const statusIcon = document.getElementById('status-icon');
        const statusMessage = document.querySelector('#status-message-bar .status-message');
        if (!statusBar || !statusText || !statusMessage) return;

        statusText.textContent = message;
        if (statusIcon) {
            switch (type) {
                case 'success': statusIcon.className = 'icon-check-circle'; break;
                case 'error': statusIcon.className = 'icon-x-circle'; break;
                case 'warning': statusIcon.className = 'icon-alert-triangle'; break;
                default: statusIcon.className = 'icon-info';
            }
        }

        // Create/attach action button
        let actionBtn = document.getElementById('status-action-btn');
        if (!actionBtn) {
            actionBtn = document.createElement('button');
            actionBtn.id = 'status-action-btn';
            actionBtn.type = 'button';
            actionBtn.className = 'btn btn-link btn-sm';
            actionBtn.style.marginLeft = '12px';
            actionBtn.style.textDecoration = 'underline';
            actionBtn.style.color = 'white';
            statusMessage.appendChild(actionBtn);
        }
        actionBtn.textContent = actionText;

        // Show bar
        statusBar.style.display = 'flex';
        statusBar.className = `status-message-bar ${type}`;

        const cleanup = () => {
            if (actionBtn && actionBtn.parentElement) {
                actionBtn.remove();
            }
        };

        let cleared = false;
        actionBtn.onclick = () => {
            if (cleared) return;
            cleared = true;
            try { onAction(); } finally { cleanup(); }
        };

        setTimeout(() => {
            if (cleared) return;
            cleanup();
            const currentTime = new Date().toLocaleTimeString();
            statusText.textContent = `System Status - ${currentTime}`;
            statusBar.className = 'status-message-bar';
        }, timeoutMs);
    }

    /**
     * Initialize comprehensive scroll-to-top functionality
     * Ensures users always start at the top when navigating or refreshing pages
     */
    initializeScrollToTop() {
        // Enhanced scroll-to-top function with fallback
        const scrollToTop = (behavior = 'smooth') => {
            try {
                // Try smooth scrolling first
                window.scrollTo({ top: 0, behavior: behavior });
            } catch (error) {
                // Fallback to instant scroll if smooth scrolling fails
                window.scrollTo(0, 0);
            }
        };

        // Scroll to top on page load/refresh
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => scrollToTop('auto'));
        } else {
            scrollToTop('auto');
        }

        // Scroll to top on hash change (URL navigation)
        window.addEventListener('hashchange', () => {
            // Small delay to ensure page content is loaded
            setTimeout(() => scrollToTop('smooth'), 100);
        });

        // Scroll to top on popstate (browser back/forward)
        window.addEventListener('popstate', () => {
            setTimeout(() => scrollToTop('smooth'), 100);
        });

        // Scroll to top when window gains focus (returning from another tab)
        window.addEventListener('focus', () => {
            // Only scroll if we're not already at the top
            if (window.scrollY > 100) {
                scrollToTop('smooth');
            }
        });

        // Enhanced scroll-to-top for page navigation
        const originalShowPage = this.showPage.bind(this);
        this.showPage = (pageName) => {
            // Call the original method
            originalShowPage(pageName);
            
            // Ensure scroll to top happens after page content is loaded
            setTimeout(() => scrollToTop('smooth'), 50);
        };

        // Initialize scroll-to-top button functionality
        this.initializeScrollToTopButton();

        console.log('🎯 Scroll-to-top functionality initialized');
    }

    /**
     * Initialize scroll-to-top button functionality
     */
    initializeScrollToTopButton() {
        const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
        if (!scrollToTopBtn) return;

        // Show/hide button based on scroll position
        const toggleScrollButton = () => {
            if (window.scrollY > 300) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        };

        // Handle button click
        scrollToTopBtn.addEventListener('click', () => {
            this.scrollToTop('smooth');
        });

        // Listen for scroll events to show/hide button
        window.addEventListener('scroll', toggleScrollButton);

        // Initial check
        toggleScrollButton();

        console.log('🎯 Scroll-to-top button initialized');
    }

    /**
     * Scroll to top of the page with fallback support
     * @param {string} behavior - 'smooth', 'auto', or 'instant'
     */
    scrollToTop(behavior = 'smooth') {
        try {
            // Try smooth scrolling first
            window.scrollTo({ top: 0, behavior: behavior });
        } catch (error) {
            // Fallback to instant scroll if smooth scrolling fails
            window.scrollTo(0, 0);
        }
    }
}

    // Initialize application when DOM is loaded
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🌟 DOM loaded, starting PingOne User Management App...');
        
        // STARTUP BLUR FIX: Only hide loading overlays, preserve modal functionality
        const loadingOverlays = document.querySelectorAll('.loading-overlay');
        loadingOverlays.forEach(overlay => {
            overlay.style.display = 'none';
            overlay.classList.remove('active');
            // Only remove excessive blur, keep minimal backdrop
            overlay.style.backdropFilter = 'rgba(0, 0, 0, 0.3)';
            overlay.style.webkitBackdropFilter = 'rgba(0, 0, 0, 0.3)';
        });
        
        // Don't remove blur from modal overlays - they need it to work
        // Only remove excessive blur from body/html
        document.body.style.filter = 'none';
        document.body.style.backdropFilter = 'none';
        document.body.style.webkitBackdropFilter = 'none';
        document.documentElement.style.filter = 'none';
        document.documentElement.style.backdropFilter = 'none';
        document.documentElement.style.webkitBackdropFilter = 'none';
        
        // Add startup blur fix class to body
        document.body.classList.add('startup-blur-fix');
        
        // STARTUP BLUR FIX: Ensure all modals are hidden by default
        const allModals = document.querySelectorAll('.modal-overlay, .credentials-modal-overlay, .disclaimer-modal-overlay');
        allModals.forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
        
        // STARTUP BLUR FIX: Safety timeout to ensure loading overlays are hidden
        setTimeout(() => {
            const safetyLoadingOverlays = document.querySelectorAll('.loading-overlay');
            safetyLoadingOverlays.forEach(overlay => {
                overlay.style.display = 'none';
                overlay.classList.remove('active');
                overlay.style.backdropFilter = 'rgba(0, 0, 0, 0.3)';
                overlay.style.webkitBackdropFilter = 'rgba(0, 0, 0, 0.3)';
            });
            
            // Also ensure all modals are hidden
            const allModals = document.querySelectorAll('.modal-overlay, .credentials-modal-overlay, .disclaimer-modal-overlay');
            allModals.forEach(modal => {
                modal.classList.remove('active');
                modal.style.display = 'none';
            });
        }, 1000); // 1 second safety timeout
        
        try {
            window.pingOneApp = new PingOneApp();
            await window.pingOneApp.init();
            
            // Add comprehensive scroll-to-top functionality
            window.pingOneApp.initializeScrollToTop();
        } catch (error) {
            console.error('💥 Failed to start application:', error);
            
            // STARTUP BLUR FIX: Ensure loading overlays are hidden on error, preserve modal functionality
            const errorLoadingOverlays = document.querySelectorAll('.loading-overlay');
            errorLoadingOverlays.forEach(overlay => {
                overlay.style.display = 'none';
                overlay.classList.remove('active');
                overlay.style.backdropFilter = 'rgba(0, 0, 0, 0.3)';
                overlay.style.webkitBackdropFilter = 'rgba(0, 0, 0, 0.3)';
            });
            
            // Only remove excessive blur from body/html on error
            document.body.style.filter = 'none';
            document.body.style.backdropFilter = 'none';
            document.body.style.webkitBackdropFilter = 'none';
            document.documentElement.style.filter = 'none';
            document.documentElement.style.backdropFilter = 'none';
            document.documentElement.style.webkitBackdropFilter = 'none';
            
            document.body.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: var(--font-family); text-align: center; background: var(--ping-gray-50);">
                    <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: var(--shadow-lg); max-width: 500px;">
                        <h1 style="color: var(--ping-error); margin-bottom: 1rem;">Application Error</h1>
                        <p style="color: var(--ping-gray-700); margin-bottom: 1rem;">Failed to start the PingOne User Management application.</p>
                        <p style="color: var(--ping-gray-600); font-size: 0.875rem;">Error: ${error.message}</p>
                        <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--ping-blue-primary); color: white; border: none; border-radius: 6px; cursor: pointer;">Reload Application</button>
                    </div>
                </div>
            `;
        }
    });

export { PingOneApp };
