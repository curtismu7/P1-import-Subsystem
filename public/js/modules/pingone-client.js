/**
 * @fileoverview PingOne Client Class
 * 
 * Handles authentication and API communication with PingOne services.
 * Manages token acquisition, caching, and API requests with Winston logging.
 * 
 * Features:
 * - Token management with localStorage caching
 * - Automatic token refresh
 * - API request handling with retry logic
 * - User import and modification operations
 * - Winston logging integration
 */

import { createWinstonLogger } from './winston-logger.js';
import { UIManager } from './ui-manager.js';
const ui = window.app && window.app.uiManager;
function handleClientError(error) {
    let userMessage = 'An unexpected error occurred. Please try again.';
    if (error && error.message) {
        if (error.message.includes('Network')) {
            userMessage = 'Network error – check your connection.';
        } else if (error.message.includes('timeout')) {
            userMessage = 'Request timed out – try again.';
        } else if (error.message.includes('401')) {
            userMessage = 'Session expired – please log in again.';
        } else if (error.message.includes('404')) {
            userMessage = 'Resource not found.';
        }
    }
    if (ui) ui.showStatusBar(userMessage, 'error');
}

/**
 * PingOne Client Class
 * 
 * Manages PingOne API authentication and requests with Winston logging.
 */
class PingOneClient {
    constructor() {
        // Initialize Winston logger
        this.logger = createWinstonLogger({
            service: 'pingone-import-client',
            environment: process.env.NODE_ENV || 'development'
        });
        
        this.accessToken = null;
        this.tokenExpiry = null;
        this.baseUrl = '/api/pingone';
        
        this.initialize();
    }
    
    /**
     * Initialize the client
     */
    initialize() {
        try {
            this.loadTokenFromStorage();
            this.logger.info('PingOne client initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize PingOne client', { error: error.message });
        }
    }
    
    /**
     * Load token from localStorage
     */
    loadTokenFromStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                const storedToken = localStorage.getItem('pingone_worker_token');
                const storedExpiry = localStorage.getItem('pingone_token_expiry');
                
                if (storedToken && storedExpiry) {
                    const expiryTime = parseInt(storedExpiry, 10);
                    const now = Date.now();
                    
                    if (expiryTime > now) {
                        this.accessToken = storedToken;
                        this.tokenExpiry = expiryTime;
                        this.logger.info('Token loaded from storage', {
                            hasToken: !!this.accessToken,
                            expiryTime: new Date(this.tokenExpiry).toISOString()
                        });
                    } else {
                        this.logger.warn('Stored token has expired');
                        this.clearToken();
                    }
                } else {
                    this.logger.debug('No stored token found');
                }
            } else {
                this.logger.warn('localStorage is not available');
            }
        } catch (error) {
            this.logger.error('Error loading token from storage', { error: error.message });
        }
    }
    
    /**
     * Save token to localStorage
     */
    saveTokenToStorage(token, expiresIn) {
        try {
            if (typeof localStorage !== 'undefined') {
                const expiryTime = Date.now() + (expiresIn * 1000);
                
                localStorage.setItem('pingone_worker_token', token);
                localStorage.setItem('pingone_token_expiry', expiryTime.toString());
                
                this.accessToken = token;
                this.tokenExpiry = expiryTime;
                
                this.logger.info('Token saved to storage', {
                    tokenLength: token.length,
                    expiresIn,
                    expiryTime: new Date(expiryTime).toISOString()
                });
                
                return true;
            } else {
                this.logger.warn('localStorage is not available, cannot save token');
                return false;
            }
        } catch (error) {
            this.logger.error('Error saving token to storage', { error: error.message });
            return false;
        }
    }
    
    /**
     * Clear token from storage
     */
    clearToken() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('pingone_worker_token');
                localStorage.removeItem('pingone_token_expiry');
            }
            
            this.accessToken = null;
            this.tokenExpiry = null;
            
            this.logger.info('Token cleared from storage');
        } catch (error) {
            this.logger.error('Error clearing token from storage', { error: error.message });
        }
    }
    
    /**
     * Update credentials and clear existing token
     * @param {Object} credentials - New credentials object
     */
    updateCredentials(credentials) {
        try {
            this.logger.info('Updating PingOne client credentials');
            
            // Clear existing token since credentials are changing
            this.clearToken();
            
            // Store new credentials in localStorage
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('pingone_credentials', JSON.stringify(credentials));
                this.logger.info('Credentials updated in localStorage');
            }
            
            // Trigger a custom event to notify other components
            window.dispatchEvent(new CustomEvent('credentials-updated', { 
                detail: { credentials } 
            }));
            
            this.logger.info('Credentials updated successfully');
        } catch (error) {
            this.logger.error('Error updating credentials', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Get cached token (alias for getCurrentTokenTimeRemaining for compatibility)
     * Production-ready with comprehensive error handling and validation
     */
    getCachedToken() {
        try {
            // Validate token existence and format
            if (!this.accessToken || typeof this.accessToken !== 'string') {
                this.logger.debug('No valid cached token available');
                return null;
            }
            
            // Validate expiry timestamp
            if (!this.tokenExpiry || typeof this.tokenExpiry !== 'number') {
                this.logger.warn('Invalid token expiry timestamp');
                this.clearToken(); // Clean up invalid state
                return null;
            }
            
            const now = Date.now();
            const isExpired = this.tokenExpiry <= now;
            
            // Add buffer time (5 minutes) to prevent edge cases
            const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
            const isNearExpiry = (this.tokenExpiry - now) <= bufferTime;
            
            if (isExpired) {
                this.logger.debug('Cached token is expired');
                this.clearToken(); // Clean up expired token
                return null;
            }
            
            if (isNearExpiry) {
                this.logger.warn('Token is near expiry, consider refreshing');
            }
            
            // Validate token format (basic JWT structure check)
            if (!this.accessToken.includes('.') || this.accessToken.split('.').length !== 3) {
                this.logger.error('Invalid token format detected');
                this.clearToken(); // Clean up invalid token
                return null;
            }
            
            this.logger.debug('Returning valid cached token');
            return this.accessToken;
        } catch (error) {
            this.logger.error('Error getting cached token', { 
                error: error.message,
                stack: error.stack,
                tokenLength: this.accessToken ? this.accessToken.length : 0
            });
            // Don't expose token in logs for security
            return null;
        }
    }
    
    /**
     * Get current token time remaining
     */
    getCurrentTokenTimeRemaining() {
        try {
            if (!this.accessToken || !this.tokenExpiry) {
                return {
                    token: null,
                    timeRemaining: null,
                    isExpired: true
                };
            }
            
            const now = Date.now();
            const timeRemaining = Math.max(0, this.tokenExpiry - now);
            const isExpired = timeRemaining === 0;
            
            const timeRemainingFormatted = this.formatDuration(Math.floor(timeRemaining / 1000));
            
            // Only log debug message every 5 minutes (300000ms) to reduce noise
            const lastLogTime = this.lastTokenTimeLog || 0;
            const timeSinceLastLog = now - lastLogTime;
            
            if (timeSinceLastLog >= 300000) { // 5 minutes
                this.logger.debug('Token time remaining calculated', {
                    timeRemaining: timeRemainingFormatted,
                    isExpired
                });
                this.lastTokenTimeLog = now;
            }
            
            return {
                token: this.accessToken,
                timeRemaining: timeRemainingFormatted,
                isExpired
            };
        } catch (error) {
            this.logger.error('Error getting token time remaining', { error: error.message });
            return {
                token: null,
                timeRemaining: null,
                isExpired: true
            };
        }
    }
    
    /**
     * Format duration in human-readable format
     */
    formatDuration(seconds) {
        if (seconds <= 0) return 'Expired';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }
    
    /**
     * Get an access token using client credentials flow
     * @returns {Promise<string>} Access token
     */
    async getAccessToken() {
        try {
            this.logger.debug('getAccessToken called');
            
            // Check if we have a valid cached token
            const tokenInfo = this.getCurrentTokenTimeRemaining();
            if (tokenInfo.token && !tokenInfo.isExpired) {
                this.logger.debug('Using cached token', { 
                    tokenPreview: tokenInfo.token.substring(0, 8) + '...',
                    timeRemaining: tokenInfo.timeRemaining
                });
                return tokenInfo.token;
            }
            
            this.logger.debug('Fetching token from /api/pingone/get-token');
            
            // Fetch new token from server
            const response = await fetch('/api/pingone/get-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    // You can add additional parameters here if needed
                    // useOverrideCredentials: false
                })
            });
            
            this.logger.debug('Fetch response', { status: response.status, ok: response.ok });
            
            if (!response.ok) {
                const errorMsg = await response.text();
                this.logger.error('Fetch error', { status: response.status, error: errorMsg });
                throw new Error(`Failed to get token: ${response.status} ${errorMsg}`);
            }
            
            const data = await response.json();
            this.logger.debug('Data received from server', { 
                hasAccessToken: !!data.access_token,
                expiresIn: data.expires_in,
                success: data.success
            });
            
            if (!data.success) {
                this.logger.warn('Server returned error', { data });
                throw new Error(data.error || 'Failed to get token from server');
            }
            
            if (!data.access_token) {
                this.logger.warn('No access_token in server response', { data });
                throw new Error('No access token received from server');
            }
            
            // Save token to storage
            const tokenSaved = this.saveTokenToStorage(data.access_token, data.expires_in || 3600);
            
            if (tokenSaved) {
                this.logger.debug('Token saved to localStorage', {
                    tokenLength: data.access_token.length,
                    expiresIn: data.expires_in || 3600
                });
            } else {
                this.logger.warn('Failed to store token in localStorage');
            }
            
            return data.access_token;
            
        } catch (error) {
            this.logger.error('Error in getAccessToken', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Make authenticated API request with retry logic
     */
    async makeRequest(method, url, data = null, retryAttempts = 3) {
        try {
            const token = await this.getAccessToken();
            
            for (let attempt = 1; attempt <= retryAttempts; attempt++) {
                try {
                    this.logger.debug(`Making API request (attempt ${attempt})`, { 
                        method, 
                        url,
                        hasData: !!data
                    });
                    
                    const requestOptions = {
                        method,
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    };
                    
                    if (data) {
                        requestOptions.body = JSON.stringify(data);
                    }
                    
                    const response = await fetch(`${this.baseUrl}${url}`, requestOptions);
                    
                    this.logger.debug(`API request completed (attempt ${attempt})`, {
                        status: response.status,
                        ok: response.ok
                    });
                    
                    if (response.ok) {
                        const responseData = await response.json();
                        return responseData;
                    } else {
                        const errorText = await response.text();
                        this.logger.warn(`API request failed (attempt ${attempt})`, {
                            status: response.status,
                            error: errorText
                        });
                        
                        if (attempt === retryAttempts) {
                            throw new Error(`API request failed: ${response.status} ${errorText}`);
                        }
                    }
                } catch (error) {
                    this.logger.error(`API request error (attempt ${attempt})`, { error: error.message });
                    
                    if (attempt === retryAttempts) {
                        throw error;
                    }
                    
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        } catch (error) {
            this.logger.error('All API request attempts failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Import users from CSV data
     */
    async importUsers(csvData, options = {}) {
        try {
            this.logger.info('importUsers method called', { 
                userCount: csvData.length,
                options: Object.keys(options)
            });
            
            const {
                populationId = null,
                batchSize = 10,
                retryAttempts = 3,
                enableUsers = true,
                skipDuplicatesByEmail = false,
                skipDuplicatesByUsername = false
            } = options;
            
            this.logger.debug('Initial setup completed', { batchSize, retryAttempts, enableUsers, skipDuplicatesByEmail, skipDuplicatesByUsername });
            
            // Validate input
            if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
                throw new Error('Invalid CSV data: must be a non-empty array');
            }
            
            this.logger.debug('Input validation completed');
            
            // Handle population selection
            let fallbackPopulationId = populationId;
            
            if (!fallbackPopulationId) {
                const populationSelect = document.getElementById('import-population-select');
                if (populationSelect && populationSelect.value) {
                    fallbackPopulationId = populationSelect.value;
                    this.logger.debug('Using selected population from dropdown', { fallbackPopulationId });
                } else {
                    // Try to get from settings
                    const settings = JSON.parse(localStorage.getItem('pingone-import-settings') || '{}');
                    fallbackPopulationId = settings.populationId;
                    this.logger.debug('Using default population from settings', { fallbackPopulationId });
                }
            }
            
            // Prepare sets for duplicate detection
            const seenEmails = new Set();
            const seenUsernames = new Set();
            
            // Process users in batches
            const totalUsers = csvData.length;
            const results = {
                success: true,
                processed: 0,
                created: 0,
                skipped: 0,
                failed: 0,
                errors: []
            };
            
            this.logger.debug('Starting user processing loop...');
            
            for (let i = 0; i < totalUsers; i += batchSize) {
                const batch = csvData.slice(i, i + batchSize);
                this.logger.debug(`Processing batch ${Math.floor(i/batchSize) + 1}`, { 
                    users: `${i+1}-${Math.min(i+batchSize, totalUsers)}`,
                    batchSize: batch.length
                });
                
                for (const user of batch) {
                    try {
                        const userPopulationId = user.populationId || fallbackPopulationId;
                        
                        if (!userPopulationId) {
                            const error = `Missing population – user not processed. Username: ${user.email || user.username}`;
                            results.errors.push(error);
                            results.skipped++;
                            continue;
                        }
                        
                        // Duplicate detection
                        if (skipDuplicatesByEmail && user.email) {
                            if (seenEmails.has(user.email.toLowerCase())) {
                                this.logger.info(`Skipping duplicate user by email: ${user.email}`);
                                results.skipped++;
                                continue;
                            }
                            seenEmails.add(user.email.toLowerCase());
                        }
                        if (skipDuplicatesByUsername && user.username) {
                            if (seenUsernames.has(user.username.toLowerCase())) {
                                this.logger.info(`Skipping duplicate user by username: ${user.username}`);
                                results.skipped++;
                                continue;
                            }
                            seenUsernames.add(user.username.toLowerCase());
                        }
                        
                        // Create user
                        const userData = {
                            username: user.username || user.email,
                            email: user.email,
                            name: {
                                given: user.firstName || user.givenName || '',
                                family: user.lastName || user.familyName || ''
                            },
                            enabled: enableUsers,
                            population: {
                                id: userPopulationId
                            }
                        };
                        
                        // Add optional fields
                        if (user.phoneNumber) userData.phoneNumber = user.phoneNumber;
                        if (user.company) userData.company = user.company;
                        
                        const result = await this.createUser(userData, retryAttempts);
                        
                        if (result.success) {
                            results.created++;
                            // Disable user if requested
                            if (!enableUsers && result.userId) {
                                this.logger.debug(`Disabling user ${result.userId} after creation`);
                                try {
                                    await this.makeRequest('PATCH', `/environments/current/users/${result.userId}`, {
                                        enabled: false
                                    });
                                    this.logger.debug(`Successfully disabled user ${result.userId}`);
                                } catch (statusError) {
                                    this.logger.warn(`Failed to disable user ${result.userId}`, { error: statusError.message });
                                }
                            }
                        } else {
                            results.failed++;
                            results.errors.push(result.error);
                        }
                        
                        results.processed++;
                        
                    } catch (error) {
                        results.failed++;
                        results.errors.push(error.message);
                    }
                }
            }
            
            this.logger.info('Batch import summary', {
                total: totalUsers,
                processed: results.processed,
                created: results.created,
                skipped: results.skipped,
                failed: results.failed
            });
            
            return results;
            
        } catch (error) {
            this.logger.error('Import users failed', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Create a single user
     */
    async createUser(userData, retryAttempts = 3) {
        try {
            for (let attempt = 1; attempt <= retryAttempts; attempt++) {
                try {
                    this.logger.debug(`Making API request for user ${userData.email || userData.username} (attempt ${attempt}/${retryAttempts})`);
                    
                    const result = await this.makeRequest('POST', '/environments/current/users', userData);
                    
                    this.logger.debug(`API request completed for user ${userData.email || userData.username}`);
                    
                    if (result.id) {
                        const successMessage = `Successfully created user: ${userData.username || userData.email}`;
                        this.logger.info(successMessage, { userId: result.id, populationId: userData.population.id });
                        
                        return {
                            success: true,
                            userId: result.id,
                            user: result
                        };
                    } else {
                        this.logger.warn('Invalid response structure - no ID found', { result });
                        return {
                            success: false,
                            error: 'Invalid response structure'
                        };
                    }
                    
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        this.logger.debug(`User already exists: ${userData.email || userData.username}`);
                        return {
                            success: true,
                            userId: null,
                            user: null,
                            message: 'User already exists'
                        };
                    }
                    
                    this.logger.error(`API request failed for user ${userData.email || userData.username} (attempt ${attempt})`, { error: error.message });
                    
                    if (attempt === retryAttempts) {
                        return {
                            success: false,
                            error: error.message
                        };
                    }
                    
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        } catch (error) {
            this.logger.error('Create user failed', { error: error.message, userData });
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Create and export default instance
const pingOneClient = new PingOneClient();

// Export the class and instance
export { PingOneClient, pingOneClient };