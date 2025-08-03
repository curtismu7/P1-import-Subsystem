/**
 * Feature Flags Configuration
 * 
 * Centralized feature flag management for gradual subsystem rollout
 * and A/B testing capabilities.
 */

// Core subsystem flags
const FEATURE_FLAGS = {
    // Core subsystems
    USE_NAVIGATION_SUBSYSTEM: true,
    USE_SETTINGS_SUBSYSTEM: true,
    USE_CONNECTION_MANAGER: true,
    USE_AUTH_MANAGEMENT: true,
    USE_VIEW_MANAGEMENT: true,
    USE_OPERATION_MANAGER: true,
    
    // Import/Export subsystems
    USE_IMPORT_SUBSYSTEM: true,
    USE_EXPORT_SUBSYSTEM: true,
    USE_REALTIME_SUBSYSTEM: true,
    USE_ADVANCED_REALTIME: true,
    
    // UI enhancements
    ENABLE_ADVANCED_PROGRESS_UI: true,
    ENABLE_DRAG_DROP_IMPROVEMENTS: true,
    ENABLE_KEYBOARD_SHORTCUTS: false,
    
    // Development and debugging
    ENABLE_DEBUG_MODE: false,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_ERROR_REPORTING: true,
    
    // Experimental features
    ENABLE_EXPERIMENTAL_FEATURES: false,
    ENABLE_BETA_UI: false
};

export default FEATURE_FLAGS;