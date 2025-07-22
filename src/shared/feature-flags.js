/**
 * Feature Flags Configuration
 * 
 * Centralized feature flag management for gradual subsystem rollout
 * and A/B testing capabilities.
 */

export const FEATURE_FLAGS = {
    // Logging and monitoring
    USE_CENTRALIZED_LOGGING: true,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_ERROR_TRACKING: true,
    
    // Subsystem rollout flags
    USE_NAVIGATION_SUBSYSTEM: false, // Disabled to avoid conflict with ViewManagementSubsystem
    USE_CONNECTION_MANAGER: true,
    USE_AUTH_MANAGEMENT: true,
    USE_VIEW_MANAGEMENT: true,
    USE_OPERATION_MANAGER: true,
    USE_IMPORT_SUBSYSTEM: true,
    USE_EXPORT_SUBSYSTEM: true,
    USE_REALTIME_SUBSYSTEM: true,
    USE_ADVANCED_REALTIME: true,
    USE_ANALYTICS_DASHBOARD: true, // CRITICAL: Enable analytics dashboard functionality
    
    // UI enhancements
    ENABLE_ADVANCED_PROGRESS_UI: true,
    ENABLE_DRAG_DROP_IMPROVEMENTS: true,
    ENABLE_KEYBOARD_SHORTCUTS: false,
    
    // API optimizations
    ENABLE_REQUEST_BATCHING: false,
    ENABLE_RESPONSE_CACHING: false,
    ENABLE_RETRY_LOGIC: true,
    
    // Development and debugging
    ENABLE_DEBUG_MODE: process.env.NODE_ENV === 'development',
    ENABLE_VERBOSE_LOGGING: process.env.NODE_ENV === 'development',
    SHOW_PERFORMANCE_METRICS: process.env.NODE_ENV === 'development'
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(featureName) {
    return FEATURE_FLAGS[featureName] === true;
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures() {
    return Object.entries(FEATURE_FLAGS)
        .filter(([_, enabled]) => enabled)
        .map(([feature, _]) => feature);
}

/**
 * Get feature flag status for debugging
 */
export function getFeatureFlagStatus() {
    return {
        total: Object.keys(FEATURE_FLAGS).length,
        enabled: getEnabledFeatures().length,
        flags: FEATURE_FLAGS,
        environment: process.env.NODE_ENV || 'development'
    };
}

/**
 * Runtime feature flag override (for testing)
 */
export function setFeatureFlag(featureName, enabled) {
    if (process.env.NODE_ENV === 'development') {
        FEATURE_FLAGS[featureName] = enabled;
        console.log(`Feature flag ${featureName} set to ${enabled}`);
    } else {
        console.warn('Feature flags can only be modified in development mode');
    }
}

export default FEATURE_FLAGS;