/**
 * Settings Subsystem - Server
 * 
 * Provides a unified API for managing application settings on the server side.
 * Exports the SettingsService class and factory function for easy integration.
 * 
 * Usage:
 * ```javascript
 * // Using the factory function
 * import { createSettingsService } from 'settings-subsystem/server';
 * 
 * const settingsService = createSettingsService({
 *   logger,
 *   defaultSettings: {
 *     customSetting: 'value'
 *   }
 * });
 * 
 * // Get all settings
 * const settings = await settingsService.getSettings();
 * 
 * // Get a specific setting
 * const value = await settingsService.getSetting('customSetting');
 * 
 * // Set a setting
 * await settingsService.setSetting('customSetting', 'new value');
 * ```
 */

import SettingsService from './settings-service.js';

/**
 * Create a settings service with the provided configuration
 * @param {Object} options - Configuration options
 * @returns {SettingsService} Configured settings service
 */
function createSettingsService(options = {}) {
    return new SettingsService(options);
}

// Export factory function
export { createSettingsService };

// Export class for direct instantiation
export { SettingsService };

// Export default factory function
export default createSettingsService;