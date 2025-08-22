// Cache Bust: v1755620848265
// PingOne User Management App v7.3.0

import { HomePage } from './pages/home-page.js';
import { SettingsPage } from './pages/settings-page.js';
import { ImportPage } from './pages/import-page.js';
import { ExportPage } from './pages/export-page.js';
import { DeletePage } from './pages/delete-page.js';
import { ModifyPage } from './pages/modify-page.js';
import { LogsPage } from './pages/logs-page.js';
import { TokenManagementPage } from './pages/token-management-page.js';
import { HistoryPage } from './pages/history-page.js';
import { SwaggerPage } from './pages/swagger-page.js';
import csrfManager from 'csrf-utils';

class PingOneApp {
    constructor() {
        this.version = '...';
        this.currentPage = 'home';
        this.settings = {};
        this.tokenStatus = { isValid: false, expiresAt: null, timeLeft: null, isRefreshing: false };
        
        // File state persistence across pages
        this.fileState = {
            selectedFile: null,
            fileName: null,
            fileSize: null,
            fileType: null,
            lastModified: null
        };
        
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
            swagger: new SwaggerPage(this)
        };
        
        console.log('🚀 PingOne User Management App initializing...');
    }
    
    async init() {
        try {
            console.log('🚀 App initialization started...');
            this.showLoading('Initializing application...');
            
            console.log('🛡️ Initializing CSRF protection...');
            await this.initializeCSRF();
            
            console.log('🔧 Loading settings...');
            await this.loadSettings();

            console.log('🔎 Loading version from server...');
            await this.loadVersion();
            
            console.log('🔑 Loading token status...');
            await this.loadTokenStatus(); // Load current token status from server
            // If token is not valid at startup, try a one-time auto-refresh to improve UX
            try {
                if (!this.tokenStatus.isValid) {
                    await this.attemptAutoRefresh('startup');
                }
            } catch (autoErr) {
                console.warn('Auto-refresh on startup failed:', autoErr?.message || autoErr);
            }
            
            // Show a concise startup status message (Token + Populations)
            try {
                await this.updateStartupStatusMessage();
            } catch (e) {
                console.warn('Startup status message failed:', e?.message || e);
            }
            
            console.log('🎯 Setting up event listeners...');
            this.setupEventListeners();
            
            console.log('🎨 Initializing UI...');
            this.initializeUI(); // This will load the home page and update UI with current token status
            
            console.log('🔧 Fixing dropdown heights...');
            this.fixDropdownHeights();
            
            console.log('⏰ Starting token monitoring...');
            this.startTokenMonitoring();
            
            // Add a small delay to ensure everything is properly loaded
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log('🔍 Checking initial modals...');
            await this.checkInitialModals();
            
            console.log('✅ Application initialized successfully');
            // Signal to realtime-client that app/CSRF are ready
            try { window.APP_READY = true; } catch (_) {}
            this.updateServerStatus('Server Started');
            // Set default status bar with server started timestamp
            this.setDefaultStatusBar();
            
            // Ensure screen interaction is enabled if no modals are visible
            if (!this.isModalVisible()) {
                this.setScreenInteraction(true);
                this.ensureInteractionIntegrity();
            }
            
            // Test status update after a short delay
            setTimeout(() => {
                this.testStatusUpdate();
            }, 500);
            
            this.hideLoading();
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    async loadVersion() {
        try {
            const resp = await fetch('/api/version');
            const payload = await resp.json().catch(() => ({}));
            // Standard shape: { success, message, data: { version } }
            const resolved = (payload && payload.data && payload.data.version)
                || payload.version /* legacy */
                || payload.APP_VERSION /* legacy */;
            if (resp.ok && resolved) {
                this.version = resolved;
            }
        } catch (_) {
            // keep placeholder or previously set version
        } finally {
            this.updateVersionDisplay();
        }
    }

    /**
     * Initialize CSRF protection for the application
     */
    async initializeCSRF() {
        try {
            // Get initial CSRF token
            await csrfManager.getToken();
            console.log('✅ CSRF protection initialized successfully');
            
            // Set up periodic token refresh (every 12 hours)
            setInterval(async () => {
                try {
                    await csrfManager.refreshToken();
                } catch (error) {
                    console.warn('CSRF token refresh failed:', error);
                }
            }, 12 * 60 * 60 * 1000); // 12 hours
            
        } catch (error) {
            console.error('❌ Failed to initialize CSRF protection:', error);
            // Don't block app initialization for CSRF failures
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
            // Ensure credentials modal flag defaults to true unless explicitly disabled
            if (typeof this.settings.showCredentialsModal === 'undefined') {
                this.settings.showCredentialsModal = true;
            }
            
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
                showDisclaimerModal: injected.showDisclaimerModal !== false,
                showCredentialsModal: true,
                showSwaggerPage: injected.showSwaggerPage === true,
                rateLimit: injected.rateLimit || 100
            };
            console.log('🔧 Using injected settingsJson fallback:', this.settings);
        }

        // Merge any locally saved credentials as a last resort so fields aren't blank
        const localCreds = this.getLocalCredentials();
        if (localCreds) {
            this.settings = { ...this.settings, ...localCreds };
        }
    }
    
    async loadTokenStatus() {
        console.log('🔄 loadTokenStatus() called - starting token status check...');
        try {
            console.log('📡 Fetching token status from /api/token/status...');
            const response = await fetch('/api/token/status');
            console.log('📡 Response received:', response.status, response.statusText);
            
            const result = await response.json();
            console.log('📡 Raw response data:', result);
            
            if (result.success && (result.data || result.message)) {
                // Support multiple response envelopes
                // Standard: { success, data: { hasToken, isValid, expiresIn } }
                // Nested:   { success, data: { message, data: { hasToken, isValid, expiresIn } } }
                const wrapped = result.data || {};
                const tokenData = (wrapped && (wrapped.data || wrapped)) || {};
                console.log('🔑 Token status loaded from server:', tokenData);
                this.applyTokenStatusFromServer(tokenData);
                
                console.log('🔄 Calling updateTokenUI()...');
                this.updateTokenUI();
            } else {
                console.warn('⚠️ Invalid token status response:', result);
            }
        } catch (error) {
            console.error('❌ Error in loadTokenStatus:', error);
            console.warn('⚠️ Could not load token status:', error.message);
            // Keep default invalid status
            this.showInfo('Please enter credentials for your PingOne Environment');
        }
    }

    /**
     * Attempt a one-time token refresh via backend when token is invalid.
     * Handles friendly error codes and opens credentials modal on settings issues.
     */
    async attemptAutoRefresh(reason = 'unknown') {
        try {
            console.log(`🔄 attemptAutoRefresh invoked (reason=${reason})`);
            // Mark UI as refreshing
            this.tokenStatus.isRefreshing = true;
            this.updateTokenUI();
            // Ensure we have a CSRF token, try refresh if missing
            try {
                if (!window.csrfManager?.token) {
                    await csrfManager.refreshToken();
                }
            } catch (e) {
                console.warn('CSRF token not available before refresh:', e?.message || e);
            }

            const csrfToken = (window.csrfManager && window.csrfManager.token) || null;
            const resp = await fetch('/api/token/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
                }
            });
            const payload = await resp.json().catch(() => ({}));
            console.log('🔁 Refresh response:', resp.status, payload);

            if (resp.ok && payload && payload.success) {
                // Support multiple response envelopes
                // Standard: { success, data: { hasToken, isValid, expiresIn } }
                // Nested:   { success, data: { message, data: { hasToken, isValid, expiresIn } } }
                const wrapped = payload.data || {};
                const data = (wrapped && (wrapped.data || wrapped)) || (payload.message || {});
                this.applyTokenStatusFromServer(data);
                this.updateTokenUI();
                if (this.tokenStatus.isValid) {
                    this.showSuccess('Token refreshed successfully');
                }
                return true;
            }

            // Handle friendly error mapping from backend
            const code = payload && (payload.code || payload.errorCode);
            const details = payload && (payload.details || payload.data || {});
            const message = payload && (payload.message || payload.error || 'Token refresh failed');
            this.showFriendlyTokenError(code, details, message);

            // If settings incomplete, prompt user immediately
            if (code === 'SETTINGS_INCOMPLETE') {
                // Ensure modal opens with populated fields
                this.showCredentialsModal();
            }
            return false;
        } catch (e) {
            console.warn('Auto-refresh error:', e?.message || e);
            this.showWarning('Network issue while refreshing token. Please check your connection.');
            return false;
        } finally {
            // Clear refreshing flag and update UI regardless of outcome
            this.tokenStatus.isRefreshing = false;
            this.updateTokenUI();
        }
    }

    /**
     * Apply standardized token status object from server (status or refresh endpoints)
     * Expected shape: { hasToken, isValid, expiresIn }
     */
    applyTokenStatusFromServer(tokenData = {}) {
        try {
            if (tokenData && tokenData.hasToken && tokenData.isValid) {
                const expiresIn = Number(tokenData.expiresIn || tokenData.expires_in || 0);
                this.tokenStatus.isValid = true;
                this.tokenStatus.expiresAt = new Date(Date.now() + (expiresIn * 1000));
                this.tokenStatus.timeLeft = expiresIn;
                this.tokenStatus.isRefreshing = false;
                console.log('✅ Token is valid, expires in:', expiresIn, 'seconds');
            } else {
                this.tokenStatus.isValid = false;
                this.tokenStatus.expiresAt = null;
                this.tokenStatus.timeLeft = null;
                this.tokenStatus.isRefreshing = false;
                console.log('❌ Token is invalid or expired');
            }
        } catch (e) {
            console.warn('applyTokenStatusFromServer failed:', e?.message || e);
        }
    }

    /**
     * Display friendly token error messages mapped by backend codes
     */
    showFriendlyTokenError(code, details = {}, fallbackMessage = 'Token error') {
        const missing = Array.isArray(details.missing) ? details.missing : [];
        const missingList = missing.length ? `Missing: ${missing.join(', ')}` : '';
        switch (code) {
            case 'SETTINGS_INCOMPLETE':
                this.showWarning(`Settings incomplete. ${missingList} Please open Credentials and complete all fields.`);
                break;
            case 'INVALID_CREDENTIALS':
                this.showError('Invalid PingOne credentials. Please verify Client ID and Secret.');
                break;
            case 'FORBIDDEN_ACCESS':
                this.showError('Access forbidden for these credentials. Check environment and permissions.');
                break;
            case 'RATE_LIMIT':
                this.showWarning('Rate limited by PingOne. Please wait and try again shortly.');
                break;
            case 'TIMEOUT':
                this.showWarning('PingOne request timed out. Please try again.');
                break;
            case 'NETWORK_ERROR':
                this.showWarning('Network error reaching PingOne. Check your connection.');
                break;
            default:
                if (fallbackMessage) {
                    this.showWarning(fallbackMessage);
                } else {
                    this.showWarning('Token refresh failed. Please check credentials.');
                }
        }
    }
    
    setupEventListeners() {
        document.addEventListener('click', this.handleNavigation.bind(this));
        this.setupModalEventListeners();
        window.addEventListener('resize', this.handleResize.bind(this));

        // Header manual token refresh button
        const headerRefreshBtn = document.getElementById('header-token-refresh-btn');
        const headerRefreshIcon = document.getElementById('header-token-refresh-icon');
        if (headerRefreshBtn) {
            headerRefreshBtn.addEventListener('click', async () => {
                if (this.tokenStatus.isRefreshing) return;
                try {
                    headerRefreshBtn.disabled = true;
                    headerRefreshBtn.classList.remove('success');
                    if (headerRefreshIcon) headerRefreshIcon.classList.add('spinning');
                    await this.attemptAutoRefresh('manual-header');
                } finally {
                    if (headerRefreshIcon) headerRefreshIcon.classList.remove('spinning');
                    headerRefreshBtn.disabled = false;
                }
                // Recompute header token status and set button color
                await this.updateTokenUI();
                if (this.headerToken?.isValid || this.tokenStatus?.isValid) {
                    headerRefreshBtn.classList.add('success');
                } else {
                    headerRefreshBtn.classList.remove('success');
                }
            });
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
    }
    
    initializeUI() {
        this.updateNavigation();
        this.initializeResponsiveNav();
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
        // Token status is now loaded from server, no need to check localStorage
        
        // Add a small delay to ensure smooth startup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (this.settings.showDisclaimerModal) {
            this.showDisclaimerModal();
            return;
        }
        
        // Only show credentials modal if we don't have a valid token
        if (this.shouldShowCredentialsModal() && !this.tokenStatus.isValid) {
            this.showCredentialsModal();
            return;
        }
        
        // If we have a valid token, don't show any modals
        if (this.tokenStatus.isValid) {
            console.log('✅ Valid token found, skipping modal display');
            return;
        }
        
        // Only check token status if we don't have a valid token
        await this.checkTokenStatus();
    }
    
    shouldShowCredentialsModal() {
        // 1) If we already have a valid token, do not show the modal
        if (this.tokenStatus && this.tokenStatus.isValid) {
            return false;
        }

        // 2) Respect explicit flags
        if (this.settings.showCredentialsModal === false) return false; // explicitly hidden
        if (this.settings.showCredentialsModal === true) return true;   // explicitly forced visible

        // 3) Show only if required credentials are missing
        const hasEnv = !!this.settings.pingone_environment_id;
        const hasClientId = !!this.settings.pingone_client_id;
        const hasSecret = !!this.settings.pingone_client_secret;
        const missingCreds = !(hasEnv && hasClientId && hasSecret);

        // If credentials are missing and no valid token, show modal
        if (missingCreds) return true;

        // 4) Otherwise, do not show; the server-side warm-up will acquire/validate the token
        return false;
    }
    
    // Modal handlers
    showDisclaimerModal() {
        const modal = document.getElementById('disclaimer-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.setScreenInteraction(false);
        }
    }
    
    hideDisclaimerModal() {
        const modal = document.getElementById('disclaimer-modal');
        if (modal) {
            modal.style.display = 'none';
            // Only re-enable if no other modal is visible
            if (!this.isModalVisible()) {
                this.setScreenInteraction(true);
                this.ensureInteractionIntegrity();
            }
        }
    }
    
    showCredentialsModal() {
        // Don't show if we already have a valid token
        if (this.tokenStatus && this.tokenStatus.isValid) {
            console.log('✅ Valid token exists, skipping credentials modal');
            return;
        }
        
        const modal = document.getElementById('credentials-modal');
        if (modal) {
            this.populateCredentialsForm();
            modal.style.display = 'flex';
            // Prevent background page scrolling while modal is open
            try { document.body.style.overflow = 'hidden'; } catch (_) {}
            // Disable screen interaction
            this.setScreenInteraction(false);
            
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
        }
    }
    
    hideCredentialsModal() {
        const modal = document.getElementById('credentials-modal');
        if (modal) {
            modal.style.display = 'none';
            try { document.body.style.overflow = ''; } catch (_) {}
            // Only re-enable if no other modal is visible
            if (!this.isModalVisible()) {
                this.setScreenInteraction(true);
                this.ensureInteractionIntegrity();
            }
        }
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
     * Load populations into the credentials modal dropdown with sensible fallbacks
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

        // Prefer standardized settings endpoint for populations cache
        try {
            const resp = await fetch('/api/settings');
            if (resp.ok) {
                const payload = await resp.json().catch(() => ({}));
                const data = payload && (payload.success ? (payload.data || {}) : payload);
                const pops = (data && (data.populations || (data.data && data.data.populations) || (data.populationCache && data.populationCache.populations))) || [];
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
                    (settings && settings.populations) ||
                    (settings && settings.populationCache && settings.populationCache.populations) ||
                    (settings && settings.data && settings.data.populations) ||
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
                this.hideCredentialsModal();
                this.showSuccess('Credentials saved and new token acquired');
                this.showPage('home');
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
        // Show screen transition indicator
        this.showScreenTransition(pageName);
        
        // Lifecycle: notify current page we are hiding
        try {
            const current = this.pages && this.pages[this.currentPage];
            if (current && typeof current.onHide === 'function') {
                current.onHide();
            }
        } catch (_) { /* non-blocking */ }

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
            // Lifecycle: notify new page we are shown (after a tick to allow load to render DOM)
            setTimeout(() => {
                try {
                    const next = this.pages && this.pages[this.currentPage];
                    if (next && typeof next.onShow === 'function') {
                        next.onShow();
                    }
                } catch (_) { /* non-blocking */ }
            }, 0);
            
            // Fix dropdown heights after page content is loaded
            setTimeout(() => this.fixDropdownHeights(), 100);
        }
        
        this.updateNavigation();
        window.location.hash = pageName;
        sessionStorage.setItem('currentPage', pageName);
        
        // Hide transition indicator after page loads
        setTimeout(() => this.hideScreenTransition(), 500);

        // Safety: if no modal is actually visible, clear any lingering modal side-effects
        setTimeout(() => {
            if (!this.isModalVisible()) {
                this.ensureInteractionIntegrity();
            }
        }, 0);
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
            this.tokenStatus.expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
            this.tokenStatus.timeLeft = tokenData.expires_in;
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
        console.log('🔄 updateTokenUI() called with tokenStatus:', this.tokenStatus);
        
        // Check if DOM is ready
        if (document.readyState === 'loading') {
            console.log('⏳ DOM not ready yet, deferring token UI update');
            document.addEventListener('DOMContentLoaded', () => this.updateTokenUI());
            return;
        }
        
        // Update header token indicator (top status bar)
        const headerTokenIndicator = document.getElementById('token-indicator');
        const headerTokenText = document.getElementById('token-text');
        const headerTokenTime = document.getElementById('token-time');
        const headerRefreshBtn = document.getElementById('header-token-refresh-btn');
        const headerRefreshIcon = document.getElementById('header-token-refresh-icon');
        
        console.log('🔍 Header elements found:', {
            indicator: !!headerTokenIndicator,
            text: !!headerTokenText,
            time: !!headerTokenTime
        });
        
        // Debug: Check if elements exist
        if (!headerTokenIndicator) console.warn('⚠️ Header token indicator not found');
        if (!headerTokenText) console.warn('⚠️ Header token text not found');
        if (!headerTokenTime) console.warn('⚠️ Header token time not found');
        
        // If elements not found, retry after a short delay
        if (!headerTokenIndicator || !headerTokenText || !headerTokenTime) {
            console.log('🔄 Retrying token UI update in 100ms...');
            setTimeout(() => this.updateTokenUI(), 100);
            return;
        }
        
        const state = this.tokenStatus.isRefreshing ? 'refreshing' : (this.tokenStatus.isValid ? 'valid' : 'invalid');
        if (headerTokenIndicator) {
            const newClass = 'status-indicator ' + state;
            console.log('🎨 Setting header indicator class to:', newClass);
            headerTokenIndicator.className = newClass;
        }
        
        if (headerTokenText) {
            const newText = this.tokenStatus.isRefreshing ? 'Token: Refreshing' : (this.tokenStatus.isValid ? 'Token: Valid' : 'Token: Invalid');
            console.log('📝 Setting header text to:', newText);
            headerTokenText.textContent = newText;
        }
        
        if (headerTokenTime) {
            const showTime = (this.tokenStatus.isValid || this.tokenStatus.isRefreshing) && this.tokenStatus.timeLeft != null;
            const newTime = showTime ? this.formatTimeLeft(this.tokenStatus.timeLeft) : '';
            console.log('⏰ Setting header time to:', newTime);
            headerTokenTime.textContent = newTime;
        }

        // Header refresh button state
        if (headerRefreshBtn) headerRefreshBtn.disabled = !!this.tokenStatus.isRefreshing;
        if (headerRefreshIcon) {
            if (this.tokenStatus.isRefreshing) headerRefreshIcon.classList.add('spinning');
            else headerRefreshIcon.classList.remove('spinning');
        }
        
        // Update footer token indicator
        const footerTokenIndicator = document.getElementById('footer-token-indicator');
        const footerTokenText = document.getElementById('footer-token-text');
        const footerTokenTime = document.getElementById('footer-token-time');
        
        if (footerTokenIndicator) {
            footerTokenIndicator.className = 'token-indicator ' + state;
        }
        
        if (footerTokenText) {
            footerTokenText.textContent = this.tokenStatus.isRefreshing ? 'Token: Refreshing' : (this.tokenStatus.isValid ? 'Token: Valid' : 'Token: Invalid');
        }
        
        if (footerTokenTime) {
            footerTokenTime.textContent = (this.tokenStatus.isValid || this.tokenStatus.isRefreshing) && this.tokenStatus.timeLeft != null
                ? this.formatTimeLeft(this.tokenStatus.timeLeft)
                : '';
        }
        
        // Update home page token status card
        const homeTokenIndicator = document.querySelector('#home-page #token-indicator');
        const homeTokenStatus = document.getElementById('token-status');
        const homeTokenIcon = document.getElementById('token-icon');
        
        if (homeTokenIndicator) {
            homeTokenIndicator.className = 'status-indicator ' + state;
        }
        
        if (homeTokenStatus) {
            if (this.tokenStatus.isRefreshing) {
                homeTokenStatus.textContent = `Refreshing${this.tokenStatus.timeLeft != null ? ` (${this.formatTimeLeft(this.tokenStatus.timeLeft)})` : ''}`;
            } else if (this.tokenStatus.isValid) {
                homeTokenStatus.textContent = `Valid${this.tokenStatus.timeLeft != null ? ` (${this.formatTimeLeft(this.tokenStatus.timeLeft)})` : ''}`;
            } else {
                homeTokenStatus.textContent = 'Invalid or Expired';
            }
        }
        
        if (homeTokenIcon) {
            homeTokenIcon.className = this.tokenStatus.isRefreshing ? 'icon-sync' : (this.tokenStatus.isValid ? 'icon-key' : 'icon-key-off');
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

    // Update only the visual token-related UI without notifying pages
    updateTokenUIOnly() {
        // Header elements
        const headerTokenIndicator = document.getElementById('token-indicator');
        const headerTokenText = document.getElementById('token-text');
        const headerTokenTime = document.getElementById('token-time');
        const headerRefreshBtn = document.getElementById('header-token-refresh-btn');
        const headerRefreshIcon = document.getElementById('header-token-refresh-icon');

        const state = this.tokenStatus.isRefreshing ? 'refreshing' : (this.tokenStatus.isValid ? 'valid' : 'invalid');
        if (headerTokenIndicator) headerTokenIndicator.className = 'status-indicator ' + state;
        if (headerTokenText) headerTokenText.textContent = this.tokenStatus.isRefreshing ? 'Token: Refreshing' : (this.tokenStatus.isValid ? 'Token: Valid' : 'Token: Invalid');
        if (headerTokenTime) headerTokenTime.textContent = (this.tokenStatus.isValid || this.tokenStatus.isRefreshing) && this.tokenStatus.timeLeft != null ? this.formatTimeLeft(this.tokenStatus.timeLeft) : '';
        if (headerRefreshBtn) headerRefreshBtn.disabled = !!this.tokenStatus.isRefreshing;
        if (headerRefreshIcon) {
            if (this.tokenStatus.isRefreshing) headerRefreshIcon.classList.add('spinning');
            else headerRefreshIcon.classList.remove('spinning');
        }

        // Footer elements
        const footerTokenIndicator = document.getElementById('footer-token-indicator');
        const footerTokenText = document.getElementById('footer-token-text');
        const footerTokenTime = document.getElementById('footer-token-time');
        if (footerTokenIndicator) footerTokenIndicator.className = 'token-indicator ' + state;
        if (footerTokenText) footerTokenText.textContent = this.tokenStatus.isRefreshing ? 'Token: Refreshing' : (this.tokenStatus.isValid ? 'Token: Valid' : 'Token: Invalid');
        if (footerTokenTime) footerTokenTime.textContent = (this.tokenStatus.isValid || this.tokenStatus.isRefreshing) && this.tokenStatus.timeLeft != null ? this.formatTimeLeft(this.tokenStatus.timeLeft) : '';

        // Home card elements
        const homeTokenIndicator = document.querySelector('#home-page #token-indicator');
        const homeTokenStatus = document.getElementById('token-status');
        const homeTokenIcon = document.getElementById('token-icon');
        if (homeTokenIndicator) homeTokenIndicator.className = 'status-indicator ' + state;
        if (homeTokenStatus) {
            if (this.tokenStatus.isRefreshing) {
                homeTokenStatus.textContent = `Refreshing${this.tokenStatus.timeLeft != null ? ` (${this.formatTimeLeft(this.tokenStatus.timeLeft)})` : ''}`;
            } else if (this.tokenStatus.isValid) {
                homeTokenStatus.textContent = `Valid${this.tokenStatus.timeLeft != null ? ` (${this.formatTimeLeft(this.tokenStatus.timeLeft)})` : ''}`;
            } else {
                homeTokenStatus.textContent = 'Invalid or Expired';
            }
        }
        if (homeTokenIcon) homeTokenIcon.className = this.tokenStatus.isRefreshing ? 'icon-sync' : (this.tokenStatus.isValid ? 'icon-key' : 'icon-key-off');
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

    // Safely update footer server status text and indicator
    updateServerStatus(statusText = 'Server Started') {
        // Defer until DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.updateServerStatus(statusText));
            return;
        }

        const serverStatusText = document.getElementById('footer-server-text');
        const serverStatusIndicator = document.getElementById('footer-server-indicator');

        // Retry briefly if elements not yet in DOM
        if (!serverStatusText || !serverStatusIndicator) {
            setTimeout(() => this.updateServerStatus(statusText), 100);
            return;
        }

        // Update text
        serverStatusText.textContent = statusText || 'Server Started';

        // Update indicator coloring
        if (statusText === 'Server Started') {
            serverStatusIndicator.className = 'status-indicator valid';
        } else {
            serverStatusIndicator.className = 'status-indicator';
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
    
    // Test function to manually update status elements
    testStatusUpdate() {
        console.log('🧪 Testing status update...');
        
        // Test server status
        const serverText = document.getElementById('footer-server-text');
        if (serverText) {
            serverText.textContent = 'Test: Server Status Updated';
            console.log('✅ Server status updated');
        } else {
            console.log('❌ Server status element not found');
        }
        
        // Test token status
        const tokenText = document.getElementById('footer-token-text');
        if (tokenText) {
            tokenText.textContent = 'Test: Token Status Updated';
            console.log('✅ Token status updated');
        } else {
            console.log('❌ Token status element not found');
        }
    }

  // Record an operation in History (falls back to localStorage if page not loaded)
  addHistoryEntry(operation, status, description, usersProcessed = 0, duration = 0) {
    try {
      const historyPage = this.pages && this.pages['history'];
      if (historyPage && typeof historyPage.addHistoryEntry === 'function') {
        historyPage.addHistoryEntry(operation, status, description, usersProcessed, duration);
        return;
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

            // Use CSRF-aware client if available
            const doPost = async () => fetch('/api/settings', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...(window.csrfManager?.token ? { 'X-CSRF-Token': window.csrfManager.token } : {}) },
                body: JSON.stringify(payload)
            });
            let resp = await doPost();
            if (!resp.ok && (resp.status === 400 || resp.status === 403)) {
                // Attempt CSRF refresh and one retry
                try { if (window.csrfManager) { window.csrfManager.clearToken(); await window.csrfManager.refreshToken(); } } catch (_) {}
                resp = await doPost();
            }

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

    /**
     * Fetch a quick populations availability snapshot.
     * Prefers cache-status for speed; falls back to fetching populations list.
     */
    async getPopulationsSnapshot() {
        try {
            // Try cache status first (fast, lightweight)
            const cs = await fetch('/api/populations/cache-status');
            if (cs.ok) {
                const data = await cs.json();
                const payload = (data && data.success && data.data) ? data.data : data;
                return {
                    ok: true,
                    count: Number(payload?.count || payload?.size || 0),
                    source: 'cache'
                };
            }
        } catch (_) { /* ignore and try fallback */ }

        try {
            // Fallback: fetch populations
            const res = await fetch('/api/populations');
            if (res.ok) {
                const json = await res.json();
                const arr = (json && json.success && json.data && json.data.populations) ? json.data.populations : (json?.populations || []);
                return { ok: true, count: Array.isArray(arr) ? arr.length : 0, source: 'api' };
            }
        } catch (e) {
            console.warn('Populations snapshot failed:', e?.message || e);
        }

        return { ok: false, count: 0, source: 'none' };
    }

    /**
     * Build and display the startup status message combining token and populations state.
     */
    async updateStartupStatusMessage() {
        // Token part
        const tokenValid = !!(this.tokenStatus && this.tokenStatus.isValid);
        const tokenPart = tokenValid
            ? `Token: Valid${this.tokenStatus.timeLeft ? ` (${this.formatTimeLeft(this.tokenStatus.timeLeft)})` : ''}`
            : 'Token: Missing or Expired';

        // Populations part
        const pop = await this.getPopulationsSnapshot();
        const popPart = pop.ok
            ? `Populations: ${pop.count} loaded`
            : 'Populations: Not available';

        const message = `${tokenPart} • ${popPart}`;
        const type = tokenValid && pop.ok ? 'success' : (tokenValid || pop.ok ? 'warning' : 'error');

        this.showStatusMessage(message, type);
    }

    /**
     * Return true if any app modal is currently visible
     */
    isModalVisible() {
        try {
            // Check known modals first
            const ids = ['credentials-modal', 'disclaimer-modal'];
            for (const id of ids) {
                const el = document.getElementById(id);
                if (el && (el.style.display === 'flex' || el.style.display === 'block')) {
                    return true;
                }
            }
            // Generic fallback: any element with class 'modal' that is visible
            const modals = document.querySelectorAll('.modal');
            for (const m of modals) {
                const style = window.getComputedStyle ? window.getComputedStyle(m) : m.style;
                if (style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    return true;
                }
            }
        } catch (_) {}
        return false;
    }

    /**
     * Globally enable/disable screen interaction (used while modals are open)
     */
    setScreenInteraction(enabled) {
        try {
            if (enabled) {
                document.body.style.pointerEvents = '';
                document.body.style.userSelect = '';
            } else {
                document.body.style.pointerEvents = 'none';
                document.body.style.userSelect = 'none';
            }
        } catch (_) {}
    }

    /**
     * Ensure there are no lingering interaction blockers if no modal is visible
     */
    ensureInteractionIntegrity() {
        try {
            if (!this.isModalVisible()) {
                // Re-enable interaction and scrolling
                this.setScreenInteraction(true);
                try { document.body.style.overflow = ''; } catch (_) {}

                // Remove any stale overlays from previous modals
                const leftovers = document.querySelectorAll('.modal-backdrop, .modal-overlay');
                leftovers.forEach(el => {
                    try { el.remove(); } catch (_) {}
                });
            }
        } catch (_) {}
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        if (overlay) overlay.style.display = 'flex';
        if (text) text.textContent = message;
    }
    
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }
    
    showSuccess(message) { this.showStatusMessage(message, 'success'); }
    showError(message) { this.showStatusMessage(message, 'error'); }
    showWarning(message) { this.showStatusMessage(message, 'warning'); }
    showInfo(message) { this.showStatusMessage(message, 'info'); }
    // Optional floating toast
    showToast(message, type = 'info', timeoutMs = 3000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            try { container.removeChild(toast); } catch (_) {}
        }, timeoutMs);
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
    
    showStatusMessage(message, type = 'info') {
        // Use the green status message bar at the top
        const statusBar = document.getElementById('status-message-bar');
        const statusText = document.getElementById('status-text');
        const statusIcon = document.getElementById('status-icon');
        
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
            
            // Show the status bar with stronger color per type
            statusBar.style.display = 'flex';
            statusBar.className = `status-message-bar ${type}`;
            // Additionally, show a floating toast for emphasis
            this.showToast(message, type, 3000);
            
            // Auto-clear after 4 seconds and return to default system status
            setTimeout(() => {
                statusText.textContent = this.formatServerStartedNow();
                if (statusIcon) statusIcon.className = 'icon-check-circle';
                statusBar.className = 'status-message-bar';
                // Keep it visible but with default styling
            }, 4000);
        }
    }

    // Helper: default status bar message and formatting
    formatServerStartedNow() {
        try {
            const now = new Date();
            const date = now.toLocaleDateString();
            const time = now.toLocaleTimeString();
            return `Server started at: ${date} ${time}`;
        } catch (_) {
            return 'Server started at: --/--/---- --:--:--';
        }
    };

    setDefaultStatusBar() {
        const statusBar = document.getElementById('status-message-bar');
        const statusText = document.getElementById('status-text');
        const statusIcon = document.getElementById('status-icon');
        if (statusText) statusText.textContent = this.formatServerStartedNow();
        if (statusIcon) statusIcon.className = 'icon-check-circle';
        if (statusBar) statusBar.className = 'status-message-bar';
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
            if (statusIcon) statusIcon.className = 'icon-check-circle';
            statusBar.className = 'status-message-bar';
        }, timeoutMs);
    }

    /**
     * Automatically detect and fix dropdown heights for long text options
     */
    fixDropdownHeights() {
        const selects = document.querySelectorAll('select.form-control');
        selects.forEach(select => {
            let hasLongText = false;
            const options = select.querySelectorAll('option');
            
            options.forEach(option => {
                if (option.textContent.length > 30) {
                    hasLongText = true;
                }
            });
            
            if (hasLongText) {
                select.setAttribute('data-long-text', 'true');
            }
        });
    }
    
    /**
     * Show screen transition indicator
     */
    showScreenTransition(pageName) {
        // Flash the green status bar
        this.showStatusMessage(`Navigating to ${pageName}...`, 'success');

        // Show spinner overlay
        const spinner = document.createElement('div');
        spinner.id = 'screen-transition-spinner';
        spinner.innerHTML = `
            <div class="spinner-overlay">
                <div class="spinner-content">
                    <div class="spinner"></div>
                    <div class="spinner-text">Loading ${pageName}...</div>
                </div>
            </div>
        `;
        document.body.appendChild(spinner);
        
        // Animate in
        setTimeout(() => {
            spinner.style.opacity = '1';
        }, 10);
    }
    /**
     * Hide screen transition indicator
     */
    hideScreenTransition() {
        const spinner = document.getElementById('screen-transition-spinner');
        if (spinner) {
            spinner.style.opacity = '0';
            setTimeout(() => {
                if (spinner.parentElement) {
                    spinner.parentElement.removeChild(spinner);
                }
            }, 300);
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌟 DOM loaded, starting PingOne User Management App...');
    try {
        window.pingOneApp = new PingOneApp();
        await window.pingOneApp.init();
    } catch (error) {
        console.error('💥 Failed to start application:', error);
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
