/**
 * Configuration Constants for PingOne Import Tool
 * Centralizes hardcoded values: timeouts, URLs, selectors, messages
 */

// API Configuration
export const API_CONFIG = {
    ENDPOINTS: {
        SETTINGS: '/api/settings',
        IMPORT: '/api/import',
        EXPORT: '/api/export',
        POPULATIONS: '/api/populations',
        TEST_CONNECTION: '/api/pingone/test-connection',
        LOGS: '/api/logs'
    },
    
    TIMEOUTS: {
        DEFAULT: 10000,
        LONG_OPERATION: 30000,
        FILE_UPLOAD: 60000,
        CONNECTION_TEST: 5000
    },
    
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAYS: [1000, 2000, 5000]
    }
};

// UI Configuration
export const UI_CONFIG = {
    SELECTORS: {
        APP_CONTAINER: '.app-container',
        NAV_ITEMS: '[data-view]',
        SETTINGS_FORM: '#settings-form',
        PROGRESS_BAR: '.progress-bar',
        STATUS_INDICATOR: '.status-indicator',
        MODAL_BACKDROP: '.modal-backdrop'
    },
    
    CLASSES: {
        HIDDEN: 'hidden',
        ACTIVE: 'active',
        LOADING: 'loading',
        ERROR: 'error',
        SUCCESS: 'success'
    }
};

// Messages
export const MESSAGES = {
    SUCCESS: {
        SETTINGS_SAVED: 'Settings saved successfully',
        FILE_UPLOADED: 'File uploaded successfully',
        CONNECTION_SUCCESS: 'Connection test successful'
    },
    
    ERROR: {
        NETWORK_ERROR: 'Network connection error',
        FILE_TOO_LARGE: 'File size exceeds 10MB limit',
        SETTINGS_SAVE_FAILED: 'Failed to save settings',
        CONNECTION_FAILED: 'Connection test failed'
    }
};

// Business Config
export const BUSINESS_CONFIG = {
    FILE_UPLOAD: {
        MAX_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_TYPES: ['.csv', '.txt']
    },
    
    IMPORT: {
        BATCH_SIZE: 100,
        MAX_CONCURRENT: 5
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
    window.UI_CONFIG = UI_CONFIG;
    window.MESSAGES = MESSAGES;
    window.BUSINESS_CONFIG = BUSINESS_CONFIG;
}
