/**
 * Settings Subsystem - Client
 * 
 * Provides a unified API for managing application settings on the client side.
 * Exports the SettingsClient class and a singleton instance for easy integration.
 * 
 * Usage:
 * ```javascript
 * // Using the singleton instance
 * import settingsClient from 'settings-subsystem/client';
 * 
 * // Get a setting
 * const theme = settingsClient.getSetting('theme', 'light');
 * 
 * // Set a setting
 * await settingsClient.setSetting('theme', 'dark');
 * 
 * // Listen for changes
 * const removeListener = settingsClient.onChange('theme', (newValue, oldValue) => {
 *   console.log(`Theme changed from ${oldValue} to ${newValue}`);
 * });
 * ```
 */

import SettingsClient from './settings-client.js';

// Create singleton instance
const settingsClient = new SettingsClient();

// Export class for custom instantiation
export { SettingsClient };

// Default export for simple usage
export default settingsClient;